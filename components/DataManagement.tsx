import React, { useState, useMemo, useRef } from 'react';
import { SalesRecord } from '../types';
import { Database, Download, Trash2, AlertTriangle, FileJson, FileSpreadsheet, CheckCircle, X, ShieldAlert, Archive, Upload, RefreshCw, FileUp } from 'lucide-react';

interface DataManagementProps {
  allData: SalesRecord[];
  onBulkDelete: (ids: string[]) => Promise<void>;
  onImportData?: (records: SalesRecord[]) => Promise<void>;
  onClose: () => void;
}

export const DataManagement: React.FC<DataManagementProps> = ({ allData, onBulkDelete, onImportData, onClose }) => {
  const [cleanupStep, setCleanupStep] = useState<'info' | 'confirm' | 'processing' | 'done'>('info');
  const [deletedCount, setDeletedCount] = useState(0);
  
  // Import States
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Constants
  const DAYS_THRESHOLD = 60;
  
  // Calculate Old Data
  const { oldRecords, oldRecordIds, cutoffDateStr } = useMemo(() => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - DAYS_THRESHOLD);
      const cutoffStr = cutoff.toISOString().split('T')[0];

      const old = allData.filter(r => r.reportDate < cutoffStr);
      return {
          oldRecords: old,
          oldRecordIds: old.map(r => r.id),
          cutoffDateStr: cutoffStr
      };
  }, [allData]);

  // Handle Backup (Download JSON)
  const handleBackupJSON = () => {
    const dataStr = JSON.stringify(allData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_dsa_full_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Backup (Download CSV)
  const handleBackupCSV = () => {
    if (allData.length === 0) return;
    
    // Get all keys from first object to make headers
    const headers = Object.keys(allData[0]);
    const csvRows = [
        headers.join(','), 
        ...allData.map(row => {
            return headers.map(fieldName => {
                let val = (row as any)[fieldName];
                if (typeof val === 'string') {
                    val = `"${val.replace(/"/g, '""')}"`; // Escape quotes
                }
                return val;
            }).join(',');
        })
    ];
    
    const blob = new Blob(["\uFEFF" + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_dsa_excel_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCleanup = async () => {
      if (oldRecordIds.length === 0) return;
      setCleanupStep('processing');
      await onBulkDelete(oldRecordIds);
      setDeletedCount(oldRecordIds.length);
      setCleanupStep('done');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              setIsImporting(true);
              const jsonStr = event.target?.result as string;
              const rawData = JSON.parse(jsonStr);

              if (!Array.isArray(rawData)) {
                  alert("File không hợp lệ: Dữ liệu phải là danh sách (Array).");
                  setIsImporting(false);
                  return;
              }

              if (rawData.length === 0) {
                  alert("File rỗng.");
                  setIsImporting(false);
                  return;
              }

              // Filter valid records
              const validRecords: SalesRecord[] = rawData.filter((r: any) => {
                  return r.dsaCode && r.reportDate && r.id && (r.status === 'Đã báo cáo' || r.status === 'Chưa báo cáo');
              });

              if (validRecords.length === 0) {
                   alert("Không tìm thấy dữ liệu hợp lệ trong file.");
                   setIsImporting(false);
                   return;
              }

              if (window.confirm(`Tìm thấy ${validRecords.length} bản ghi hợp lệ (Tổng: ${rawData.length}).\nBạn có muốn khôi phục (gộp) vào hệ thống không?`)) {
                  if (onImportData) {
                      await onImportData(validRecords);
                      alert("Khôi phục dữ liệu thành công!");
                  }
              }
          } catch (error) {
              console.error(error);
              alert("Lỗi đọc file JSON. Vui lòng kiểm tra lại file backup.");
          } finally {
              setIsImporting(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      };
      reader.readAsText(file);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-t-4 border-emerald-600 p-6 max-w-6xl mx-auto mt-6 animate-in fade-in slide-in-from-bottom-4 transition-colors duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100 dark:border-gray-700">
         <div className="flex items-center space-x-3">
             <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2.5 rounded-xl text-emerald-700 dark:text-emerald-400">
                <Database size={28} />
             </div>
             <div>
                 <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Quản trị dữ liệu</h2>
                 <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Sao lưu, Khôi phục & Tối ưu hóa</p>
             </div>
         </div>
         <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 rounded-full transition-colors"><X size={24}/></button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Backup */}
          <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-6 border border-blue-100 dark:border-blue-800 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <Archive size={100} className="text-blue-600"/>
              </div>
              
              <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center">
                  <Download className="mr-2" size={20}/> Sao lưu (Backup)
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-6 leading-relaxed relative z-10 h-10">
                  Tải dữ liệu báo cáo về máy để lưu trữ an toàn.
              </p>

              <div className="flex gap-3 relative z-10">
                  <button 
                    onClick={handleBackupJSON}
                    className="flex-1 py-3 bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 font-bold rounded-xl shadow-sm border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center justify-center transition-all"
                  >
                      <FileJson className="mr-2" size={18}/> JSON
                  </button>
                  <button 
                    onClick={handleBackupCSV}
                    className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 flex items-center justify-center transition-all"
                  >
                      <FileSpreadsheet className="mr-2" size={18}/> Excel
                  </button>
              </div>

              <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800/50 text-xs text-blue-800 dark:text-blue-400 font-medium flex justify-between">
                  <span>Tổng bản ghi:</span>
                  <span className="font-bold">{allData.length}</span>
              </div>
          </div>

          {/* Card 2: Restore (Import) */}
          <div className="bg-purple-50 dark:bg-purple-900/10 rounded-2xl p-6 border border-purple-100 dark:border-purple-800 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <Upload size={100} className="text-purple-600"/>
              </div>

              <h3 className="text-lg font-bold text-purple-800 dark:text-purple-300 mb-2 flex items-center">
                  <RefreshCw className="mr-2" size={20}/> Khôi phục (Restore)
              </h3>
              
              <p className="text-sm text-purple-600 dark:text-purple-400 mb-6 leading-relaxed relative z-10 h-10">
                  Tải lên file JSON backup để khôi phục dữ liệu đã mất.
              </p>

              <div className="relative z-10">
                  <input 
                      ref={fileInputRef}
                      type="file" 
                      accept=".json" 
                      onChange={handleFileSelect}
                      className="hidden" 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl shadow-md hover:bg-purple-700 flex items-center justify-center transition-all disabled:opacity-50"
                  >
                      {isImporting ? <RefreshCw className="animate-spin mr-2"/> : <FileUp className="mr-2" size={18}/>}
                      {isImporting ? 'Đang xử lý...' : 'Chọn File Backup (.json)'}
                  </button>
              </div>

              <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800/50 text-xs text-purple-800 dark:text-purple-400 font-medium flex justify-between">
                  <span>Chế độ:</span>
                  <span className="font-bold">Gộp & Cập nhật (Merge)</span>
              </div>
          </div>

          {/* Card 3: Cleanup */}
          <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-6 border border-red-100 dark:border-red-800 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <ShieldAlert size={100} className="text-red-600"/>
              </div>

              <h3 className="text-lg font-bold text-red-800 dark:text-red-300 mb-2 flex items-center">
                  <Trash2 className="mr-2" size={20}/> Dọn dẹp (Cleanup)
              </h3>
              
              {cleanupStep === 'done' ? (
                  <div className="flex flex-col items-center justify-center h-[120px] animate-in zoom-in">
                      <CheckCircle size={48} className="text-green-500 mb-2"/>
                      <p className="text-green-700 font-bold">Đã xóa {deletedCount} bản ghi cũ!</p>
                      <button onClick={() => setCleanupStep('info')} className="mt-2 text-xs underline text-gray-500">Quay lại</button>
                  </div>
              ) : (
                <>
                    <p className="text-sm text-red-600 dark:text-red-400 mb-4 leading-relaxed relative z-10 h-10">
                         Xóa vĩnh viễn các báo cáo cũ hơn <b>{DAYS_THRESHOLD} ngày</b>.
                    </p>

                    <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-red-100 dark:border-red-900/50 mb-4 flex justify-between items-center shadow-sm relative z-10">
                        <div className="text-xs">
                            <span className="text-gray-500 dark:text-gray-400 block">Dữ liệu cũ ({cutoffDateStr}):</span>
                            <span className="font-bold text-red-600 text-base">{oldRecords.length} bản ghi</span>
                        </div>
                    </div>

                    {cleanupStep === 'info' && (
                        <button 
                            onClick={() => setCleanupStep('confirm')}
                            disabled={oldRecords.length === 0}
                            className="w-full py-3 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 font-bold rounded-xl border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
                        >
                            Quét & Dọn Dẹp
                        </button>
                    )}

                    {cleanupStep === 'confirm' && (
                        <div className="flex gap-2 relative z-10 animate-in fade-in">
                            <button 
                                onClick={() => setCleanupStep('info')}
                                className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300"
                            >
                                Hủy
                            </button>
                            <button 
                                onClick={handleCleanup}
                                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 flex items-center justify-center"
                            >
                                <AlertTriangle size={18} className="mr-2"/> Xóa
                            </button>
                        </div>
                    )}
                     
                    {cleanupStep === 'processing' && (
                         <button disabled className="w-full py-3 bg-red-100 text-red-400 font-bold rounded-xl cursor-wait">
                             Đang xử lý...
                         </button>
                    )}
                </>
              )}
          </div>
      </div>
    </div>
  );
};