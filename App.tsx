import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SalesRecord, DashboardStats, User, ViewMode, AppScreen } from './types';
import { generateMockData, MOCK_USERS } from './services/mockData';
import { authService } from './services/authService';
import { SalesTable } from './components/SalesTable';
import { StatsCard } from './components/StatsCard';
import { EntryForm } from './components/EntryForm';
import { Login } from './components/Login';
import { DashboardCharts } from './components/DashboardCharts';
import { DSADetail } from './components/DSADetail';
import { UserManagement } from './components/UserManagement';
import { LoanCalculator } from './components/LoanCalculator'; 
import { KnowledgeBase } from './components/KnowledgeBase';

// Firebase Imports
import { db, ensureAuth } from './services/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';

import { 
  Users, 
  DollarSign, 
  FileText, 
  Plus, 
  Loader2,
  Calendar,
  LogOut,
  UserCircle,
  Download,
  BarChart2,
  Table as TableIcon,
  Settings,
  CreditCard,
  Percent,
  Briefcase,
  Megaphone,
  RefreshCw,
  Filter,
  Trophy,
  BellRing,
  AlertTriangle,
  CloudLightning,
  WifiOff,
  ShieldAlert,
  Calculator, 
  BookOpen, 
  Camera,
  UserMinus, 
  FileCheck 
} from 'lucide-react';

const MOTIVATIONAL_QUOTES = [
  "🎯 Thành công không phải là đích đến, mà là một hành trình của sự kiên trì!",
  "🚀 Mỗi ngày cố gắng thêm 1% tốt hơn ngày hôm qua.",
  "💪 Đừng mong đích đến sẽ thay đổi nếu bạn không thay đổi con đường.",
  "🔥 Khó khăn hôm nay là sức mạnh của ngày mai. Keep pushing!",
  "💎 Áp lực tạo nên kim cương. Hãy tỏa sáng theo cách của bạn!",
  "🌟 Thái độ quyết định trình độ. Hãy làm việc bằng cả trái tim!",
  "💰 Doanh số cao là phần thưởng cho những nỗ lực không mệt mỏi.",
  "🏆 Người chiến thắng không bao giờ bỏ cuộc, người bỏ cuộc không bao giờ chiến thắng."
];

const App: React.FC = () => {
  // Check localStorage for saved session on initial load
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isOnline, setIsOnline] = useState(false); 
  const [firebaseError, setFirebaseError] = useState<string | null>(null); 
  const [permissionError, setPermissionError] = useState(false); 

  // Initialize Users from LocalStorage (Cache first)
  const [users, setUsers] = useState<User[]>(() => {
    const savedUsers = localStorage.getItem('app_users');
    return savedUsers ? JSON.parse(savedUsers) : MOCK_USERS;
  });

  // Initialize Sales Data from LocalStorage (Cache first)
  const [allData, setAllData] = useState<SalesRecord[]>(() => {
    const savedData = localStorage.getItem('sales_records');
    return savedData ? JSON.parse(savedData) : [];
  });

  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SalesRecord | null>(null);
  
  // Navigation State
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('dashboard');
  const [selectedDSA, setSelectedDSA] = useState<string | null>(null);
  
  // View/Filter State with LocalStorage Persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('viewMode') as ViewMode) || 'chart';
  });

  const [startDate, setStartDate] = useState<string>(() => {
    return localStorage.getItem('startDate') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  });

  const [endDate, setEndDate] = useState<string>(() => {
    return localStorage.getItem('endDate') || new Date().toISOString().split('T')[0];
  });

  const [statusFilter, setStatusFilter] = useState<string>(() => {
    return localStorage.getItem('statusFilter') || 'all';
  });

  // NEW FILTERS: SM and DSS
  const [smFilter, setSmFilter] = useState<string>(() => {
    return localStorage.getItem('smFilter') || 'all';
  });
  const [dssFilter, setDssFilter] = useState<string>(() => {
    return localStorage.getItem('dssFilter') || 'all';
  });

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const dataRef = useRef(allData);

  // Avatar Upload Ref
  const headerAvatarRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Random Quote State
  const randomQuote = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    return MOTIVATIONAL_QUOTES[randomIndex];
  }, []);

  // Update ref when state changes
  useEffect(() => {
    dataRef.current = allData;
  }, [allData]);

  // --- FIREBASE SYNC LOGIC ---

  // Helper: Sanitize data for Firestore (Recursively remove undefined values)
  const sanitizeForFirestore = (obj: any): any => {
      if (obj === null || obj === undefined) return null;
      if (typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);

      const newObj: any = {};
      Object.keys(obj).forEach(key => {
          if (obj[key] !== undefined) {
              newObj[key] = sanitizeForFirestore(obj[key]);
          }
      });
      return newObj;
  };
  
  // 1. Initial Load from Firebase
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      
      // If no DB initialized, definitely offline
      if (!db) {
        if (allData.length === 0) setAllData(generateMockData());
        setIsLoadingData(false);
        return;
      }

      try {
        // IMPORTANT: Must wait for Auth before trying to fetch
        const authResult = await ensureAuth();
        
        if (!authResult.success) {
           console.warn("⚠️ Firebase Auth failed:", authResult.error);
           setIsOnline(false);
           setFirebaseError(authResult.error || 'unknown_error');
           if (allData.length === 0) setAllData(generateMockData());
           setIsLoadingData(false);
           return;
        }

        setIsOnline(true);
        setFirebaseError(null);
        
        // --- USERS SYNC ---
        const usersSnapshot = await getDocs(collection(db, "users"));
        if (!usersSnapshot.empty) {
            const remoteUsers = usersSnapshot.docs.map(doc => doc.data() as User);
            setUsers(remoteUsers);
            localStorage.setItem('app_users', JSON.stringify(remoteUsers)); 
        } else {
            // FIREBASE EMPTY: Upload Local Users or Mock Users
            const usersToSeed = users.length > 0 ? users : MOCK_USERS;
            
            const batch = writeBatch(db);
            usersToSeed.forEach(u => {
                batch.set(doc(db, "users", u.id), sanitizeForFirestore(u));
            });
            await batch.commit();
        }

        // --- SALES SYNC (OPTIMIZED FOR PERFORMANCE) ---
        // Instead of fetching EVERYTHING, we fetch data from the last 60 days to reduce read costs
        // and improve speed for 100-200 concurrent users.
        const today = new Date();
        const sixtyDaysAgo = new Date(today.setDate(today.getDate() - 60)).toISOString().split('T')[0];
        
        const q = query(
            collection(db, "sales_records"), 
            where("reportDate", ">=", sixtyDaysAgo)
        );

        const salesSnapshot = await getDocs(q);
        
        if (!salesSnapshot.empty) {
            const remoteSales = salesSnapshot.docs.map(doc => doc.data() as SalesRecord);
            setAllData(remoteSales);
            localStorage.setItem('sales_records', JSON.stringify(remoteSales));
        } else {
             // If remote is empty but local has data (and it's first run/offline), use local or mock
             if (allData.length === 0) {
                 // Check if we really have no data or just filtered out old data
                 // For safety on first run, stick to Mock if nothing exists
                 // Note: We don't auto-seed mock data to Firebase here to prevent accidental junk data
                 const mock = generateMockData();
                 setAllData(mock);
             }
        }

      } catch (error: any) {
        console.error("Error fetching data from Firebase:", error);
        
        if (error.code === 'permission-denied' || (error.message && error.message.includes('Missing or insufficient permissions'))) {
            setPermissionError(true);
        }

        // Fallback
        if (allData.length === 0) setAllData(generateMockData());
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, []); 

  // Persist state changes to localStorage (Settings only)
  useEffect(() => { localStorage.setItem('viewMode', viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem('startDate', startDate); }, [startDate]);
  useEffect(() => { localStorage.setItem('endDate', endDate); }, [endDate]);
  useEffect(() => { localStorage.setItem('statusFilter', statusFilter); }, [statusFilter]);
  useEffect(() => { localStorage.setItem('smFilter', smFilter); }, [smFilter]);
  useEffect(() => { localStorage.setItem('dssFilter', dssFilter); }, [dssFilter]);

  // --- SYNC LOGIC: AUTO-UPDATE SALES RECORDS WHEN USERS CHANGE ---
  useEffect(() => {
    if (users.length === 0) return;

    setAllData(currentData => {
        const newData = [...currentData];
        let hasChanges = false;
        const today = new Date().toISOString().split('T')[0];

        // Helper to find hierarchy names
        const getHierarchy = (user: User) => {
            let dss = '';
            let smName = '';
            if (user.parentId) {
                const parent = users.find(u => u.id === user.parentId);
                if (parent) {
                    if (parent.role === 'DSS') {
                        dss = parent.name;
                        const sm = users.find(u => u.id === parent.parentId);
                        if (sm) smName = sm.name;
                    } else if (parent.role === 'SM') {
                        smName = parent.name;
                    }
                }
            }
            return { dss, smName };
        };

        const dsaUsers = users.filter(u => u.role === 'DSA' && u.dsaCode);
        
        dsaUsers.forEach(user => {
            if (!user.dsaCode) return;

            const existingRecordIndex = newData.findIndex(r => r.dsaCode === user.dsaCode && r.reportDate === today);
            const { dss, smName } = getHierarchy(user);

            if (existingRecordIndex === -1) {
                const newRecord: SalesRecord = {
                    id: `auto-${user.id}-${today.replace(/-/g, '')}`,
                    dsaCode: user.dsaCode,
                    name: user.name,
                    dss: dss,
                    smName: smName,
                    reportDate: today,
                    status: 'Chưa báo cáo',
                    approvalStatus: 'Approved',
                    directApp: 0, directLoan: 0, directAppCRC: 0, directLoanCRC: 0,
                    directAppFEOL: 0, directLoanFEOL: 0, directVolumeFEOL: 0,
                    directVolume: 0, directBanca: 0, directRol: '0.0%',
                    onlineApp: 0, onlineVolume: 0,
                    ctv: 0, newCtv: 0, flyers: 0, dlk: 0, newDlk: 0,
                    callsMonth: 0, adSpend: 0, refs: 0
                };
                newData.push(newRecord);
                
                if (db && isOnline) {
                    setDoc(doc(db, "sales_records", newRecord.id), sanitizeForFirestore(newRecord)).catch(e => console.error("Auto-create sync skipped (offline)"));
                }
                hasChanges = true;
            } else {
                const rec = newData[existingRecordIndex];
                if (rec.dss !== dss || rec.smName !== smName || rec.name !== user.name) {
                    const updatedRec = {
                        ...rec,
                        name: user.name,
                        dss: dss,
                        smName: smName
                    };
                    newData[existingRecordIndex] = updatedRec;
                    if (db && isOnline) {
                        setDoc(doc(db, "sales_records", rec.id), sanitizeForFirestore(updatedRec)).catch(e => console.error("Auto-update sync skipped (offline)"));
                    }
                    hasChanges = true;
                }
            }
        });

        return hasChanges ? newData : currentData;
    });
  }, [users, isOnline]);

  // Compute Available Options for SM and DSS based on Current User and selections
  const { smOptions, dssOptions } = useMemo(() => {
    if (!currentUser) return { smOptions: [], dssOptions: [] };

    let availableSMs: User[] = [];
    let availableDSSs: User[] = [];

    if (currentUser.role === 'ADMIN') {
        availableSMs = users.filter(u => u.role === 'SM');
        availableDSSs = users.filter(u => u.role === 'DSS');
    } else if (currentUser.role === 'RSM') {
        availableSMs = users.filter(u => u.role === 'SM' && u.parentId === currentUser.id);
        const smIds = availableSMs.map(sm => sm.id);
        availableDSSs = users.filter(u => u.role === 'DSS' && smIds.includes(u.parentId || ''));
    } else if (currentUser.role === 'SM') {
        availableSMs = [currentUser];
        availableDSSs = users.filter(u => u.role === 'DSS' && u.parentId === currentUser.id);
    } else if (currentUser.role === 'DSS') {
        availableDSSs = [currentUser];
    }

    if (smFilter !== 'all') {
        const selectedSmUser = users.find(u => u.name === smFilter && u.role === 'SM');
        if (selectedSmUser) {
            availableDSSs = availableDSSs.filter(u => u.parentId === selectedSmUser.id);
        }
    }

    return { 
        smOptions: availableSMs.sort((a,b) => a.name.localeCompare(b.name)), 
        dssOptions: availableDSSs.sort((a,b) => a.name.localeCompare(b.name)) 
    };
  }, [users, currentUser, smFilter]);

  // Filter data (Used for Table)
  const filteredData = useMemo(() => {
    if (!currentUser) return [];
    
    const visibleDSAIds = authService.getVisibleDSAIds(currentUser, users);
    let data = allData.filter(record => visibleDSAIds.includes(record.dsaCode));

    data = data.filter(record => 
      record.reportDate >= startDate && record.reportDate <= endDate
    );

    if (statusFilter !== 'all') {
      data = data.filter(record => record.status === statusFilter);
    }
    if (smFilter !== 'all') {
        data = data.filter(record => record.smName === smFilter);
    }
    if (dssFilter !== 'all') {
        data = data.filter(record => record.dss === dssFilter);
    }

    return data;
  }, [allData, currentUser, startDate, endDate, statusFilter, smFilter, dssFilter, users]);

  // Global Data for Charts/Rankings (Filtered by Date AND Hierarchy, ignoring Status)
  const dateFilteredGlobalData = useMemo(() => {
    if (!currentUser) return [];
    
    const visibleDSAIds = authService.getVisibleDSAIds(currentUser, users);
    let data = allData.filter(record => visibleDSAIds.includes(record.dsaCode));

    data = data.filter(record => 
        record.reportDate >= startDate && record.reportDate <= endDate
    );

    if (smFilter !== 'all') {
        data = data.filter(record => record.smName === smFilter);
    }
    if (dssFilter !== 'all') {
        data = data.filter(record => record.dss === dssFilter);
    }

    return data;
  }, [allData, currentUser, startDate, endDate, smFilter, dssFilter, users]);

  const stats: DashboardStats = useMemo(() => {
    return filteredData.reduce(
      (acc, curr) => ({
        totalRecords: acc.totalRecords + 1,
        reportedCount: curr.status === 'Đã báo cáo' ? acc.reportedCount + 1 : acc.reportedCount,
        totalVolume: acc.totalVolume + curr.directVolume + (curr.directVolumeFEOL || 0),
        totalApps: acc.totalApps + curr.directApp,
        totalLoanCRC: acc.totalLoanCRC + (curr.directLoanCRC || 0), 
        totalBanca: acc.totalBanca + curr.directBanca,
      }),
      { totalRecords: 0, reportedCount: 0, totalVolume: 0, totalApps: 0, totalLoanCRC: 0, totalBanca: 0 }
    );
  }, [filteredData]);

  // --- MANAGER ALERTS LOGIC (NEW) ---
  const pendingRecords = useMemo(() => {
    if (currentUser?.role === 'DSA') return [];
    if (!currentUser) return [];
    const visibleDSAIds = authService.getVisibleDSAIds(currentUser, users);
    return allData.filter(r => visibleDSAIds.includes(r.dsaCode) && r.approvalStatus === 'Pending');
  }, [allData, currentUser, users]);

  const unreportedInfo = useMemo(() => {
    if (!currentUser || currentUser.role === 'DSA') return null;

    const today = new Date().toISOString().split('T')[0];
    const visibleDSAIds = authService.getVisibleDSAIds(currentUser, users);
    const managedDSAs = users.filter(u => u.role === 'DSA' && visibleDSAIds.includes(u.dsaCode || ''));

    const reportedCodes = new Set(
        allData
        .filter(r => r.reportDate === today && r.status === 'Đã báo cáo')
        .map(r => r.dsaCode)
    );

    const missing = managedDSAs.filter(u => !reportedCodes.has(u.dsaCode || ''));
    return {
        count: missing.length,
        names: missing.map(u => u.name)
    };
  }, [users, allData, currentUser]);

  const dsaInfo = useMemo(() => {
    if (currentUser?.role !== 'DSA') return null;
    
    const today = new Date().toISOString().split('T')[0];
    const isReportedToday = allData.some(r => 
        r.dsaCode === currentUser.dsaCode && 
        r.reportDate === today && 
        r.status === 'Đã báo cáo'
    );

    const allDSAs = users.filter(u => u.role === 'DSA');
    const volumeMap = new Map<string, number>();
    allDSAs.forEach(u => u.dsaCode && volumeMap.set(u.dsaCode, 0)); 

    dateFilteredGlobalData.forEach(r => {
        if (volumeMap.has(r.dsaCode)) {
            volumeMap.set(r.dsaCode, volumeMap.get(r.dsaCode)! + r.directVolume + (r.directVolumeFEOL || 0));
        }
    });

    const sortedDSAs = Array.from(volumeMap.entries()).sort((a, b) => b[1] - a[1]);
    const myIndex = sortedDSAs.findIndex(item => item[0] === currentUser.dsaCode);
    const myRank = myIndex !== -1 ? myIndex + 1 : sortedDSAs.length;
    const totalDSAs = sortedDSAs.length;

    return {
        isReportedToday,
        rank: myRank,
        totalDSAs
    };
  }, [currentUser, allData, dateFilteredGlobalData, users]);

  // --- HANDLERS (UPDATED FOR FIREBASE) ---

  const handleSaveRecord = async (record: SalesRecord) => {
    // 1. Update UI immediately (Optimistic Update)
    setAllData(prev => {
      const existsIndex = prev.findIndex(r => r.id === record.id);
      let updated;
      if (existsIndex !== -1) {
        updated = [...prev];
        updated[existsIndex] = record;
      } else {
        updated = [record, ...prev];
      }
      localStorage.setItem('sales_records', JSON.stringify(updated));
      return updated;
    });
    setLastUpdated(new Date());
    setEditingRecord(null); 
    setShowForm(false);

    // 2. Sync to Firebase (Only if Online)
    if (db && isOnline) {
      try {
          await setDoc(doc(db, "sales_records", record.id), sanitizeForFirestore(record));
      } catch (e: any) {
          console.error("Failed to save record to cloud:", e);
           if (e.code === 'permission-denied') {
             setPermissionError(true);
             refreshData(); // Revert optimistic update
           }
      }
    }
  };

  const handleEditRecord = (record: SalesRecord) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleDeleteRecord = async (recordId: string) => {
    // 1. Optimistic Update (UI)
    setAllData(prev => {
        const updated = prev.filter(r => r.id !== recordId);
        localStorage.setItem('sales_records', JSON.stringify(updated));
        return updated;
    });
    setLastUpdated(new Date());

    // 2. Sync to Firebase
    if (db && isOnline) {
        try {
            await deleteDoc(doc(db, "sales_records", recordId));
        } catch (e: any) {
            console.error("Failed to delete record from cloud:", e);
            if (e.code === 'permission-denied') {
                setPermissionError(true);
                refreshData(); // Revert optimistic update
            }
        }
    }
  };

  const handleCreateNew = () => {
    setEditingRecord(null);
    setShowForm(true);
  };

  const handleApproveRecord = (record: SalesRecord, isApproved: boolean) => {
     const updatedRecord: SalesRecord = {
       ...record,
       approvalStatus: isApproved ? 'Approved' : 'Rejected'
     };
     handleSaveRecord(updatedRecord);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser'); // Clear session
    setCurrentScreen('dashboard');
  };

  const handleSelectDSA = (dsaCode: string) => {
    setSelectedDSA(dsaCode);
    setCurrentScreen('detail');
  };

  const handleAddUser = async (newUsers: User | User[]) => {
    const usersToAdd = Array.isArray(newUsers) ? newUsers : [newUsers];
    
    // Optimistic Update
    setUsers(prev => {
        const updated = [...prev, ...usersToAdd];
        localStorage.setItem('app_users', JSON.stringify(updated));
        return updated;
    });

    // Firebase Sync (Only if Online)
    if (db && isOnline) {
      try {
          const promises = usersToAdd.map(u => setDoc(doc(db!, "users", u.id), sanitizeForFirestore(u)));
          await Promise.all(promises);
      } catch (e: any) {
          console.error("Failed to save users to cloud:", e);
          if (e.code === 'permission-denied') {
              setPermissionError(true);
              refreshData(); // Revert
          }
      }
    }
  };
  
  const handleUpdateUser = async (updatedUser: User) => {
    setUsers(prev => {
        const updated = prev.map(u => u.id === updatedUser.id ? updatedUser : u);
        localStorage.setItem('app_users', JSON.stringify(updated));
        return updated;
    });

    if (db && isOnline) {
      try {
          await setDoc(doc(db, "users", updatedUser.id), sanitizeForFirestore(updatedUser));
      } catch (e: any) {
          console.error("Failed to update user in cloud:", e);
          if (e.code === 'permission-denied') {
              setPermissionError(true);
              refreshData(); // Revert
          }
      }
    }
  };
  
  const handleDeleteUser = async (id: string) => {
    setUsers(prev => {
        const updated = prev.filter(u => u.id !== id);
        localStorage.setItem('app_users', JSON.stringify(updated));
        return updated;
    });

    if (db && isOnline) {
      try {
          await deleteDoc(doc(db, "users", id));
      } catch (e: any) {
          console.error("Failed to delete user from cloud:", e);
          if (e.code === 'permission-denied') {
              setPermissionError(true);
              refreshData(); // Revert
          }
      }
    }
  };

  const handleBulkDeleteUsers = async (ids: string[]) => {
    setUsers(prev => {
        const updated = prev.filter(u => !ids.includes(u.id));
        localStorage.setItem('app_users', JSON.stringify(updated));
        return updated;
    });

    if (db && isOnline) {
      try {
          const batch = writeBatch(db);
          ids.forEach(id => {
              batch.delete(doc(db, "users", id));
          });
          await batch.commit();
      } catch (e: any) {
          console.error("Failed to bulk delete users from cloud:", e);
          if (e.code === 'permission-denied') {
              setPermissionError(true);
              refreshData(); // Revert
          }
      }
    }
  };

  const handleViewPending = () => {
    if (pendingRecords.length === 0) return;
    const dates = pendingRecords.map(r => new Date(r.reportDate).getTime());
    const minDate = new Date(Math.min(...dates)).toISOString().split('T')[0];
    const maxDate = new Date(Math.max(...dates)).toISOString().split('T')[0];
    
    setStartDate(minDate);
    setEndDate(maxDate);
    setViewMode('table');
    setStatusFilter('all');
  };

  const handleExportCSV = () => {
    if (filteredData.length === 0) return;
    const headers = [
      "DSA Code", "Họ và Tên", "DSS", "SM Name", "Ngày báo cáo", "Trạng thái", "Duyệt",
      "Direct App", "Direct Loan", "App CRC", "Loan CRC", "App FEOL", "Loan FEOL", "Volume FEOL", "Direct Volume", "Direct Banca", "Direct Rol",
      "Online App", "Online Volume",
      "CTV", "CTV Mới", "Tờ rơi", "ĐLK", "ĐLK Mới", "Cuộc gọi", "Chi phí QC", "Refs"
    ];
    const BOM = "\uFEFF"; 
    const rows = filteredData.map(record => [
      record.dsaCode, `"${record.name}"`, `"${record.dss}"`, `"${record.smName}"`,
      record.reportDate, record.status, record.approvalStatus,
      record.directApp, record.directLoan, record.directAppCRC || 0, record.directLoanCRC || 0, record.directAppFEOL || 0, record.directLoanFEOL || 0, record.directVolumeFEOL || 0,
      record.directVolume, record.directBanca, record.directRol, record.onlineApp,
      record.onlineVolume, record.ctv, record.newCtv, record.flyers,
      record.dlk, record.newDlk, record.callsMonth, record.adSpend, record.refs
    ]);
    const csvContent = BOM + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `DSA_Bao_Cao_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrencyCompact = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(num);
  };

  const refreshData = async () => {
      setIsLoadingData(true);
      setPermissionError(false); 
      
      if (!isOnline && db) {
           const auth = await ensureAuth();
           if (auth.success) {
               setIsOnline(true);
               setFirebaseError(null);
           } else {
               setTimeout(() => setIsLoadingData(false), 500);
               return;
           }
      }

      if (!db) {
        setTimeout(() => setIsLoadingData(false), 500);
        return;
      }

      try {
        // Optimized Refresh: Only fetch last 60 days to save quota
        const today = new Date();
        const sixtyDaysAgo = new Date(today.setDate(today.getDate() - 60)).toISOString().split('T')[0];
        const q = query(
            collection(db, "sales_records"), 
            where("reportDate", ">=", sixtyDaysAgo)
        );

        const salesSnapshot = await getDocs(q);
        if (!salesSnapshot.empty) {
            const remoteSales = salesSnapshot.docs.map(doc => doc.data() as SalesRecord);
            setAllData(remoteSales);
            localStorage.setItem('sales_records', JSON.stringify(remoteSales));
        }
        
        const usersSnapshot = await getDocs(collection(db, "users"));
        if (!usersSnapshot.empty) {
            const remoteUsers = usersSnapshot.docs.map(doc => doc.data() as User);
            setUsers(remoteUsers);
            localStorage.setItem('app_users', JSON.stringify(remoteUsers));
        }

        setLastUpdated(new Date());
      } catch(e: any) {
        if (e.code === 'permission-denied') setPermissionError(true);
        console.error("Refresh error:", e);
      } finally {
        setIsLoadingData(false);
      }
  };

  const setFilterToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  };

  const setFilterWeek = () => {
    const curr = new Date();
    const day = curr.getDay() || 7; 
    const first = new Date(curr);
    first.setDate(curr.getDate() - day + 1);
    const last = new Date(first);
    last.setDate(first.getDate() + 6);
    setStartDate(first.toISOString().split('T')[0]);
    setEndDate(last.toISOString().split('T')[0]);
  };

  const setFilterMonth = () => {
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 500;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(dataUrl);
                } else {
                    reject(new Error("Canvas context failed"));
                }
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
  };

  const handleHeaderAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setIsUploadingAvatar(true);
    try {
        const base64 = await compressImage(file);
        const updatedUser = { ...currentUser, avatar: base64 };
        setCurrentUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser)); // Update stored session
        handleUpdateUser(updatedUser);
    } catch (err) {
        console.error("Avatar upload failed:", err);
        alert("Lỗi khi tải ảnh. Vui lòng thử lại.");
    } finally {
        setIsUploadingAvatar(false);
        if (headerAvatarRef.current) headerAvatarRef.current.value = '';
    }
  };

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} users={users} />;
  }

  const bancaPercentage = stats.totalVolume > 0 
    ? ((stats.totalBanca / stats.totalVolume) * 100).toFixed(1) 
    : '0';

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const canAccessSettings = ['ADMIN', 'RSM', 'SM', 'DSS'].includes(currentUser.role);
  const showSmFilterUI = ['ADMIN', 'RSM'].includes(currentUser.role);
  const showDssFilterUI = ['ADMIN', 'RSM', 'SM'].includes(currentUser.role);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      
      {/* FIREBASE AUTH ERROR MODAL */}
      {(firebaseError === 'auth/configuration-not-found' || firebaseError === 'auth/operation-not-allowed') && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                <AlertTriangle className="mx-auto text-red-500 mb-4" size={56} />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Chưa Cấu Hình Firebase Authentication</h3>
                <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                   Hệ thống phát hiện lỗi <code>{firebaseError}</code>.<br/>
                   Điều này có nghĩa là bạn <b>chưa bật tính năng đăng nhập Ẩn danh</b> cho dự án Firebase của mình.
                </p>
                <div className="bg-red-50 p-4 rounded-lg text-left text-sm mb-6 border border-red-100 max-h-60 overflow-y-auto custom-scrollbar">
                    <p className="font-bold mb-3 text-red-800 flex items-center"><Settings size={16} className="mr-1"/> Cách khắc phục:</p>
                    <ol className="list-decimal pl-5 space-y-2 text-gray-800 font-medium">
                        <li>Truy cập <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold">Firebase Console</a> &rarr; <b>Authentication</b> &rarr; <b>Sign-in method</b>.</li>
                        <li>Bật <b>Anonymous</b> (Ẩn danh).</li>
                        <li className="text-orange-700">Quan trọng: Vào tab <b>Settings</b> &rarr; <b>Authorized domains</b>. Thêm domain hiện tại của App vào danh sách.</li>
                    </ol>
                </div>
                <div className="flex flex-col gap-3">
                    <button onClick={() => window.location.reload()} className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 w-full shadow-lg transform active:scale-95 transition-all">
                        Đã bật xong, tải lại trang
                    </button>
                    <button onClick={() => setFirebaseError(null)} className="text-gray-500 hover:text-gray-800 text-sm font-medium hover:underline py-2">
                        Bỏ qua và dùng Offline tạm thời
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* FIREBASE PERMISSION ERROR MODAL */}
      {permissionError && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
                <ShieldAlert className="mx-auto text-amber-500 mb-4" size={56} />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Không Có Quyền Truy Cập</h3>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                   Bạn không có quyền thực hiện hành động này hoặc dữ liệu đã bị thay đổi bởi người quản lý cấp cao hơn. 
                   Hệ thống sẽ tải lại dữ liệu mới nhất.
                </p>
                <div className="flex flex-col gap-3">
                    <button onClick={() => { setPermissionError(false); refreshData(); }} className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 w-full shadow-lg transform active:scale-95 transition-all">
                        Đã hiểu, tải lại trang
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-emerald-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentScreen('dashboard')}>
             <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-2 rounded-lg shadow-md">
                <FileText size={22} />
             </div>
             <div>
                <h1 className="text-xl font-bold text-gray-800 tracking-tight leading-none">DSA Dashboard</h1>
                <p className="text-xs text-emerald-600 mt-0.5 font-bold uppercase flex items-center">
                    Xin chào, {currentUser.name}
                    <span className="ml-2 text-gray-300">|</span>
                    <span className={`ml-2 flex items-center ${isLoadingData ? 'text-orange-500' : (!isOnline ? 'text-gray-400' : 'text-emerald-500')}`}>
                        {isLoadingData ? <Loader2 size={10} className="mr-1 animate-spin"/> : (!isOnline ? <WifiOff size={10} className="mr-1"/> : <CloudLightning size={10} className="mr-1"/>)}
                        {isLoadingData ? 'Syncing...' : (!isOnline ? 'Offline Mode' : 'Online')}
                    </span>
                </p>
             </div>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4">
             {/* NEW MENU ITEMS */}
             <div className="hidden md:flex items-center space-x-2 mr-2">
                <button 
                  onClick={() => setCurrentScreen('calculator')}
                  className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentScreen === 'calculator' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <Calculator size={18} className="mr-1.5"/> Tính Lãi
                </button>
                <button 
                  onClick={() => setCurrentScreen('knowledge')}
                  className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentScreen === 'knowledge' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <BookOpen size={18} className="mr-1.5"/> Kiến Thức
                </button>
             </div>

             {/* Admin / Management Button */}
             {canAccessSettings && currentScreen !== 'admin' && (
                <button 
                  onClick={() => setCurrentScreen('admin')}
                  className="flex items-center text-gray-600 hover:text-emerald-700 font-medium transition-colors bg-gray-50 hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-emerald-200 hidden md:flex"
                >
                  <Settings size={18} className="mr-2" /> Quản lý
                </button>
             )}

            <div className="flex items-center text-sm text-gray-600 mr-2 bg-gray-50 border border-gray-100 pl-3 pr-2 py-1.5 rounded-full shadow-sm hidden md:flex">
               {/* Header Avatar with Upload Trigger */}
               <div className="relative group cursor-pointer mr-2">
                   <input 
                      ref={headerAvatarRef} 
                      type="file" 
                      accept="image/*" 
                      onChange={handleHeaderAvatarUpload} 
                      className="hidden" 
                   />
                   <div onClick={() => headerAvatarRef.current?.click()} className="relative w-8 h-8">
                       {currentUser.avatar ? (
                          <img src={currentUser.avatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-emerald-200" />
                       ) : (
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-200">
                             <UserCircle className="text-emerald-600" size={20} />
                          </div>
                       )}
                       
                       {/* Upload Overlay */}
                       <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {isUploadingAvatar ? <Loader2 size={12} className="text-white animate-spin"/> : <Camera size={12} className="text-white"/>}
                       </div>
                   </div>
               </div>

               <span className="font-bold text-gray-800 mr-1">{currentUser.name}</span>
               <span className="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded ml-1 font-bold">{currentUser.role}</span>
            </div>

            <button 
               onClick={handleLogout}
               className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
               title="Đăng xuất"
            >
               <LogOut size={20} />
            </button>
          </div>
        </div>
        
        {/* Mobile Sub-menu */}
        <div className="md:hidden border-t border-gray-100 bg-gray-50 flex justify-around p-2">
            <button onClick={() => setCurrentScreen('dashboard')} className={`p-2 rounded-lg ${currentScreen === 'dashboard' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}><BarChart2 size={20}/></button>
            <button onClick={() => setCurrentScreen('calculator')} className={`p-2 rounded-lg ${currentScreen === 'calculator' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}><Calculator size={20}/></button>
            <button onClick={() => setCurrentScreen('knowledge')} className={`p-2 rounded-lg ${currentScreen === 'knowledge' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}><BookOpen size={20}/></button>
            {canAccessSettings && <button onClick={() => setCurrentScreen('admin')} className={`p-2 rounded-lg ${currentScreen === 'admin' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}><Settings size={20}/></button>}
        </div>
      </header>

      <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        
        {/* VIEW ROUTING */}
        <div className="flex-1">
        {currentScreen === 'admin' ? (
          <UserManagement 
            users={users} 
            currentUser={currentUser}
            onAddUser={handleAddUser} 
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onBulkDeleteUsers={handleBulkDeleteUsers}
            onClose={() => setCurrentScreen('dashboard')}
          />
        ) : currentScreen === 'calculator' ? (
            <LoanCalculator currentUser={currentUser} onClose={() => setCurrentScreen('dashboard')} />
        ) : currentScreen === 'knowledge' ? (
            <KnowledgeBase currentUser={currentUser} onClose={() => setCurrentScreen('dashboard')} />
        ) : currentScreen === 'detail' && selectedDSA ? (
          <DSADetail 
            dsaCode={selectedDSA} 
            data={allData} 
            onBack={() => setCurrentScreen('dashboard')} 
          />
        ) : (
          /* Dashboard View */
          <>
             {/* Dynamic Header Alert / Quote */}
            {dsaInfo && !dsaInfo.isReportedToday ? (
            <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl py-4 px-5 flex items-center shadow-sm animate-pulse">
                <div className="bg-red-100 p-2 rounded-full mr-4">
                    <BellRing className="text-red-600 animate-bounce" size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-red-800 text-lg">Bạn chưa báo cáo hôm nay!</h3>
                    <p className="text-red-600 text-sm">Hãy cập nhật doanh số ngay để cải thiện thứ hạng và không bị nhắc nhở.</p>
                </div>
                <button 
                    onClick={handleCreateNew}
                    className="ml-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-colors whitespace-nowrap hidden sm:block"
                >
                    Báo cáo ngay
                </button>
            </div>
            ) : !['ADMIN', 'RSM', 'SM', 'DSS'].includes(currentUser.role) ? (
            <div className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-xl py-3 px-5 flex items-center shadow-sm">
                <Megaphone className="text-orange-500 mr-3 flex-shrink-0 animate-bounce" size={20} />
                <p className="font-bold text-orange-800 italic text-sm md:text-base">
                    "{randomQuote}"
                </p>
            </div>
            ) : null}

            {/* Manager Alerts - Only for Managers */}
            {['ADMIN', 'RSM', 'SM', 'DSS'].includes(currentUser.role) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Pending Approval Alert */}
                    {pendingRecords.length > 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center shadow-sm animate-pulse justify-between">
                            <div className="flex items-center">
                                <div className="bg-orange-100 p-2 rounded-full mr-3 text-orange-600">
                                    <FileCheck size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-orange-800 text-sm md:text-base">Cần duyệt chỉnh sửa</h4>
                                    <p className="text-xs md:text-sm text-orange-700">
                                        Có <span className="font-bold text-lg">{pendingRecords.length}</span> yêu cầu đang chờ bạn phê duyệt.
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={handleViewPending}
                                className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-700 transition-colors shadow-sm whitespace-nowrap ml-2"
                            >
                                Xem & Duyệt
                            </button>
                        </div>
                    )}

                    {/* Missing Report Alert */}
                    {unreportedInfo && unreportedInfo.count > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center shadow-sm">
                            <div className="bg-red-100 p-2 rounded-full mr-3 text-red-600">
                                <UserMinus size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                                 <h4 className="font-bold text-red-800 text-sm md:text-base">Chưa báo cáo hôm nay</h4>
                                 <p className="text-xs md:text-sm text-red-700">
                                    <span className="font-bold text-lg">{unreportedInfo.count}</span> nhân viên chưa cập nhật số liệu.
                                 </p>
                                 <div className="text-xs text-red-500 mt-1 truncate">
                                    {unreportedInfo.names.slice(0, 3).join(', ')} {unreportedInfo.count > 3 ? `và ${unreportedInfo.count - 3} người khác` : ''}
                                 </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4 mb-8">
              <StatsCard 
                title="Tổng Doanh Số" 
                value={`${formatCurrencyCompact(stats.totalVolume)} ₫`} 
                color="red"
                icon={<DollarSign size={20} />}
                trend="+12%"
              />
              <StatsCard 
                title="Tổng Banca" 
                value={`${formatCurrencyCompact(stats.totalBanca)} ₫`} 
                color="green"
                icon={<Briefcase size={20} />}
              />
              <StatsCard 
                title="% Banca" 
                value={`${bancaPercentage}%`} 
                color="orange"
                icon={<Percent size={20} />}
              />
              <StatsCard 
                title="Tổng Thẻ (CRC)" 
                value={stats.totalLoanCRC.toString()} 
                color="blue"
                icon={<CreditCard size={20} />}
              />
              
              {/* Conditional Card: Ranking (DSA) vs Reported (Manager) */}
              {dsaInfo ? (
                 <StatsCard 
                  title="Xếp Hạng Hiện Tại" 
                  value={`#${dsaInfo.rank} / ${dsaInfo.totalDSAs}`} 
                  color="green"
                  icon={<Trophy size={20} />}
                />
              ) : (
                <StatsCard 
                  title="Đã Báo Cáo" 
                  value={`${stats.reportedCount}/${stats.totalRecords}`} 
                  color="green"
                  icon={<Users size={20} />}
                />
              )}

              <StatsCard 
                title="Tỷ lệ hoạt động" 
                value={stats.totalRecords > 0 ? `${((stats.reportedCount / stats.totalRecords) * 100).toFixed(0)}%` : '0%'} 
                color="blue"
                icon={<Loader2 size={20} />}
              />
            </div>

            {/* Controls Toolbar */}
            <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
               {/* Filters */}
               <div className="flex flex-col md:flex-row md:items-center gap-3 w-full">
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                    {/* Date Picker Group */}
                    <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-lg border border-gray-200 w-full sm:w-auto justify-between sm:justify-start">
                      <div className="px-2 text-gray-400"><Calendar size={18} /></div>
                      <input 
                        type="date" 
                        value={startDate} 
                        onChange={e => setStartDate(e.target.value)}
                        className="bg-transparent border-none text-gray-700 text-sm font-medium focus:ring-0 p-1 w-24 md:w-28" 
                      />
                      <span className="text-gray-300 font-bold">-</span>
                      <input 
                        type="date" 
                        value={endDate} 
                        onChange={e => setEndDate(e.target.value)}
                        className="bg-transparent border-none text-gray-700 text-sm font-medium focus:ring-0 p-1 w-24 md:w-28" 
                      />
                    </div>
                    
                    {/* Quick Filters - Mobile Friendly */}
                    <div className="flex gap-2 w-full sm:w-auto">
                       <button onClick={setFilterToday} className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors whitespace-nowrap">
                          Hôm nay
                       </button>
                       <button onClick={setFilterWeek} className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors whitespace-nowrap">
                          Tuần này
                       </button>
                       <button onClick={setFilterMonth} className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors whitespace-nowrap">
                          Tháng này
                       </button>
                    </div>
                  </div>

                   <div className="h-8 w-px bg-gray-200 mx-1 hidden lg:block"></div>
                   
                   <div className="flex flex-wrap gap-2 w-full md:w-auto">
                      {/* SM Filter */}
                      {showSmFilterUI && (
                        <div className="relative flex-1 md:flex-none">
                            <select 
                                value={smFilter} 
                                onChange={e => setSmFilter(e.target.value)}
                                className="w-full bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg p-2.5 pl-9 shadow-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-500 md:w-44 outline-none"
                            >
                                <option value="all">Tất cả SM</option>
                                {smOptions.map(sm => (
                                    <option key={sm.id} value={sm.name}>{sm.name}</option>
                                ))}
                            </select>
                            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none"/>
                        </div>
                      )}

                      {/* DSS Filter */}
                      {showDssFilterUI && (
                        <div className="relative flex-1 md:flex-none">
                            <select 
                                value={dssFilter} 
                                onChange={e => setDssFilter(e.target.value)}
                                className="w-full bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg p-2.5 pl-9 shadow-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-500 md:w-44 outline-none"
                            >
                                <option value="all">Tất cả DSS</option>
                                {dssOptions.map(dss => (
                                    <option key={dss.id} value={dss.name}>{dss.name}</option>
                                ))}
                            </select>
                            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500 pointer-events-none"/>
                        </div>
                      )}

                      {/* Status Filter */}
                      <div className="relative flex-1 md:flex-none">
                          <select 
                            value={statusFilter} 
                            onChange={e => setStatusFilter(e.target.value)}
                            className="w-full bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg p-2.5 pl-9 shadow-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 md:w-44 outline-none"
                          >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="Đã báo cáo">Đã báo cáo</option>
                            <option value="Chưa báo cáo">Chưa báo cáo</option>
                          </select>
                          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"/>
                      </div>
                      
                       <button 
                        onClick={refreshData}
                        className={`p-2.5 bg-gray-50 text-emerald-600 rounded-lg border border-gray-200 hover:bg-emerald-50 hover:border-emerald-200 transition-colors ${isLoadingData ? 'animate-spin' : ''}`}
                        title="Làm mới dữ liệu"
                      >
                          <RefreshCw size={18} />
                      </button>
                   </div>
               </div>

               {/* Actions */}
               <div className="flex items-center gap-3 mt-4 md:mt-0 justify-between md:justify-end w-full md:w-auto">
                   {/* View Toggle */}
                   <div className="bg-gray-100 p-1 rounded-lg flex text-sm shadow-inner w-full md:w-auto justify-center">
                      <button 
                        onClick={() => setViewMode('chart')}
                        className={`flex-1 md:flex-none px-3 py-1.5 rounded-md flex items-center justify-center transition-all ${viewMode === 'chart' ? 'bg-white shadow text-emerald-700 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                         <BarChart2 size={16} className="mr-1.5" /> Biểu đồ
                      </button>
                      <button 
                        onClick={() => setViewMode('table')}
                        className={`flex-1 md:flex-none px-3 py-1.5 rounded-md flex items-center justify-center transition-all ${viewMode === 'table' ? 'bg-white shadow text-emerald-700 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                         <TableIcon size={16} className="mr-1.5" /> Bảng
                      </button>
                   </div>

                   <div className="h-8 w-px bg-gray-200 mx-1 hidden md:block"></div>

                   {/* CHANGE: Export only if NOT DSA */}
                   {currentUser.role !== 'DSA' && (
                       <button 
                        onClick={handleExportCSV}
                        className="inline-flex items-center px-4 py-2.5 border border-gray-200 shadow-sm text-sm font-bold rounded-lg text-gray-700 bg-white hover:bg-gray-50 hover:text-emerald-600 hover:border-emerald-200 transition-all whitespace-nowrap"
                       >
                         <Download size={18} className="mr-2" /> <span className="hidden md:inline">Xuất Excel</span>
                       </button>
                   )}
                   
                   {/* Desktop Update Button */}
                   <button 
                    onClick={handleCreateNew}
                    className="hidden md:inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-bold rounded-lg text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all whitespace-nowrap"
                   >
                     <Plus size={20} className="mr-2" /> Cập nhật mới
                   </button>
               </div>
            </div>

            {/* Main Content Area */}
            {viewMode === 'chart' ? (
               <DashboardCharts 
                data={filteredData} 
                globalData={dateFilteredGlobalData} 
                currentUser={currentUser} 
                users={users}
                onDateChange={handleDateChange}
                startDate={startDate}
                endDate={endDate}
              />
            ) : (
               <SalesTable 
                data={filteredData} 
                onRowClick={handleSelectDSA} 
                onEdit={handleEditRecord}
                onApprove={handleApproveRecord}
                onDelete={handleDeleteRecord}
                currentUser={currentUser}
              />
            )}
          </>
        )}
        </div>

        {/* Developer Signature */}
        <div className="text-center py-6 mt-4 border-t border-dashed border-gray-200">
            <a 
                href="https://zalo.me/0867641331" 
                target="_blank" 
                rel="noreferrer" 
                className="text-xs font-mono text-gray-300 hover:text-gray-500 transition-colors cursor-pointer select-none"
            >
                Developed by DSS Nguyễn Minh Đức
            </a>
        </div>
      </main>

      {/* Entry Form Modal */}
      {showForm && (
        <EntryForm 
          onClose={() => setShowForm(false)} 
          onSave={handleSaveRecord}
          currentUser={currentUser}
          users={users}
          initialData={editingRecord}
        />
      )}
      
      {/* Mobile-Friendly Floating Action Button for Updates */}
      {currentScreen === 'dashboard' && (
          <button
            onClick={handleCreateNew}
            className="md:hidden fixed bottom-6 right-6 z-40 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full p-4 shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center border-4 border-white/20"
            title="Cập nhật mới"
          >
            <Plus size={32} />
          </button>
      )}
      
    </div>
  );
};

export default App;