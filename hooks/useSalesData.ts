import { useState, useEffect, useCallback, useRef } from 'react';
import { SalesRecord } from '../types';
import { db, ensureAuth } from '../services/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';
import { generateMockData } from '../services/mockData';

const SALES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useSalesData = (startDate: string, endDate: string) => {
  const [allData, setAllData] = useState<SalesRecord[]>(() => {
    const saved = localStorage.getItem('sales_records');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = useCallback(async (force = false) => {
    // Basic cache check
    const now = Date.now();
    const lastFetch = Number(localStorage.getItem('ts_sales') || 0);
    
    if (!force && now - lastFetch < SALES_CACHE_TTL && allData.length > 0) {
        return; // Use cache
    }

    if (!db) {
        if (allData.length === 0) setAllData(generateMockData());
        setIsOnline(false);
        return;
    }

    setIsLoading(true);
    try {
        const authResult = await ensureAuth();
        if (!authResult.success) {
            setIsOnline(false);
            if (allData.length === 0) setAllData(generateMockData());
            setIsLoading(false);
            return;
        }

        setIsOnline(true);
        console.log("☁️ Hook: Fetching Sales Records...");
        
        // Fetch only range to save bandwidth
        const q = query(
            collection(db, "sales_records"), 
            where("reportDate", ">=", startDate),
            where("reportDate", "<=", endDate)
        );
        
        const snapshot = await getDocs(q);
        const remoteSales = snapshot.docs.map(doc => doc.data() as SalesRecord);

        setAllData(prevData => {
            // Merge Strategy: Keep local data outside range, replace data inside range
            const keptRecords = prevData.filter(r => r.reportDate < startDate || r.reportDate > endDate);
            const merged = [...keptRecords, ...remoteSales];
            localStorage.setItem('sales_records', JSON.stringify(merged));
            return merged;
        });
        
        localStorage.setItem('ts_sales', now.toString());
        setLastUpdated(new Date());

    } catch (error) {
        console.error("Sales Fetch Error", error);
        setIsOnline(false);
    } finally {
        setIsLoading(false);
    }
  }, [startDate, endDate]); // Re-create if dates change

  // Initial Fetch
  useEffect(() => {
      fetchData();
  }, [fetchData]);

  const sanitize = (obj: any) => JSON.parse(JSON.stringify(obj));

  const saveRecord = async (record: SalesRecord) => {
      setAllData(prev => { 
        const idx = prev.findIndex(r => r.id === record.id); 
        let updated; 
        if (idx !== -1) { updated = [...prev]; updated[idx] = record; } 
        else { updated = [record, ...prev]; } 
        localStorage.setItem('sales_records', JSON.stringify(updated)); 
        return updated; 
      });
      setLastUpdated(new Date());
      
      if (db && isOnline) {
          try {
              await setDoc(doc(db, "sales_records", record.id), sanitize(record));
          } catch (e) { console.warn("Save offline"); }
      }
  };

  const deleteRecord = async (id: string) => {
      if (id.startsWith('virt-')) return;
      setAllData(prev => {
          const updated = prev.filter(r => r.id !== id);
          localStorage.setItem('sales_records', JSON.stringify(updated));
          return updated;
      });
      if (db && isOnline) {
          try { await deleteDoc(doc(db, "sales_records", id)); } catch(e) {}
      }
  };

  const bulkDeleteRecords = async (ids: string[]) => {
      if (ids.length === 0) return;
      
      // 1. Update State & LocalStorage
      setAllData(prev => {
          const updated = prev.filter(r => !ids.includes(r.id));
          localStorage.setItem('sales_records', JSON.stringify(updated));
          return updated;
      });
      setLastUpdated(new Date());

      // 2. Update Firebase
      if (db && isOnline) {
          try {
              // Firebase batches are limited to 500 ops
              const chunkSize = 400; 
              for (let i = 0; i < ids.length; i += chunkSize) {
                  const chunk = ids.slice(i, i + chunkSize);
                  const batch = writeBatch(db);
                  chunk.forEach(id => {
                      if (!id.startsWith('virt-')) {
                          batch.delete(doc(db, "sales_records", id));
                      }
                  });
                  await batch.commit();
                  console.log(`Deleted batch ${i/chunkSize + 1}`);
              }
          } catch (e) {
              console.error("Bulk delete failed", e);
          }
      }
  };

  const importData = async (records: SalesRecord[]) => {
    if (records.length === 0) return;

    // 1. Merge locally (Upsert: Update if exists, Insert if new)
    setAllData(prev => {
        const recordMap = new Map(prev.map(r => [r.id, r]));
        records.forEach(r => recordMap.set(r.id, r));
        const merged = Array.from(recordMap.values());
        
        // Sort by date desc (optional but good for display)
        merged.sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
        
        localStorage.setItem('sales_records', JSON.stringify(merged));
        return merged;
    });
    setLastUpdated(new Date());

    // 2. Batch Update Firebase
    if (db && isOnline) {
        try {
            const chunkSize = 400; 
            for (let i = 0; i < records.length; i += chunkSize) {
                const chunk = records.slice(i, i + chunkSize);
                const batch = writeBatch(db);
                chunk.forEach(record => {
                    if (!record.id.startsWith('virt-')) {
                        batch.set(doc(db!, "sales_records", record.id), sanitize(record));
                    }
                });
                await batch.commit();
                console.log(`Imported batch ${i/chunkSize + 1}`);
            }
        } catch (e) {
            console.error("Import to Firebase failed", e);
            alert("Lỗi khi đồng bộ lên Server. Dữ liệu đã được lưu offline.");
        }
    }
  };

  return {
      allData,
      isLoading,
      isOnline,
      lastUpdated,
      refresh: () => fetchData(true),
      saveRecord,
      deleteRecord,
      bulkDeleteRecords,
      importData
  };
};