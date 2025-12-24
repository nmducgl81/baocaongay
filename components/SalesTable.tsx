import React, { useState, useMemo } from 'react';
import { SalesRecord, User } from '../types';
import { X, Pencil, Search, Layout, ChevronDown, Trash2, AlertTriangle, ArrowUp, ArrowDown, Users, Map, User as UserIcon, ChevronRight, RotateCcw, CalendarOff } from 'lucide-react';

interface SalesTableProps {
  data: SalesRecord[];
  onRowClick: (dsaCode: string) => void;
  onEdit: (record: SalesRecord) => void;
  onApprove: (record: SalesRecord, isApproved: boolean) => void;
  onDelete?: (recordId: string) => void; // Optional delete handler
  currentUser: User;
  statusFilter: string; // New prop to control visibility of "Chưa báo cáo"
}

type TableScope = 'dsa' | 'dss' | 'sm';

export const SalesTable: React.FC<SalesTableProps> = ({ 
  data, onRowClick, onEdit, onApprove, onDelete, currentUser, statusFilter
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; ids: string[]; name: string } | null>(null);
  const [tableScope, setTableScope] = useState<TableScope>('dsa');
  
  // Drill-down State
  const [internalFilter, setInternalFilter] = useState<{ smName?: string; dss?: string } | null>(null);

  // Sort State: 'desc' (Highest Volume first by default for aggregated view)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Permission checks
  const canShowDSS = !['DSA'].includes(currentUser.role);
  const canShowSM = !['DSA', 'DSS', 'SM'].includes(currentUser.role);
  
  // Hide Search and Column Settings for DSA
  const showToolbar = currentUser.role !== 'DSA';
  const canConfigureColumns = currentUser.role === 'ADMIN' || ['RSM', 'SM', 'DSS'].includes(currentUser.role);

  // Column Visibility State - OPTIMIZED FOR MOBILE
  const [visibleColumns, setVisibleColumns] = useState(() => {
    // Check if screen width is less than 768px (Mobile)
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    
    return {
        id: false, 
        dss: !isMobile, // Hide DSS on mobile
        sm: !isMobile,  // Hide SM on mobile
        approval: true,
        directApp: true,
        directLoan: true,
        directVolume: true,
        
        // Hide detailed metrics on mobile by default to prevent horizontal bloat
        directAppCRC: !isMobile,
        directLoanCRC: !isMobile,
        directBanca: !isMobile,
        directRol: !isMobile,
        directAppFEOL: !isMobile,
        directLoanFEOL: !isMobile,
        directVolumeFEOL: !isMobile,
        ctv: !isMobile,
        newCtv: !isMobile,
        flyers: !isMobile,
        dlk: !isMobile,
        newDlk: !isMobile,
        calls: !isMobile,
        adSpend: !isMobile
    };
  });

  const toggleColumn = (key: keyof typeof visibleColumns) => setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val);
  
  const canDeleteSummary = ['ADMIN', 'RSM'].includes(currentUser.role);

  // Handle Tab Switch (Reset Drill-down)
  const handleTabChange = (scope: TableScope) => {
      setTableScope(scope);
      setInternalFilter(null); // Reset filter when switching main tabs
  };

  // Handle Drill Down Click
  const handleSummaryClick = (record: any) => {
      if (statusFilter === 'Chưa báo cáo') {
          // In grouped view, clicking the name doesn't do much, users should click specific dates
          return;
      }

      if (tableScope === 'sm') {
          // Click SM -> View DSS of that SM
          setInternalFilter({ smName: record.name });
          setTableScope('dss');
      } else if (tableScope === 'dss') {
          // Click DSS -> View DSA of that DSS
          setInternalFilter(prev => ({ ...(prev || {}), dss: record.name }));
          setTableScope('dsa');
      } else if (tableScope === 'dsa') {
          // Click DSA Row -> Go to Detail View
          onRowClick(record.dsaCode);
      }
  };

  // Reset Filter Logic
  const resetDrillDown = () => {
      setInternalFilter(null);
      // Reset scope based on Role or default
      if (canShowSM) setTableScope('sm');
      else if (canShowDSS) setTableScope('dss');
      else setTableScope('dsa');
  };

  // PROCESSING LOGIC (Filter + Sort + Aggregation):
  const displayRecords = useMemo(() => {
     // 1. FILTER
     const term = searchTerm.toLowerCase();
     let records = data.filter(record => {
        const matchesSearch = record.name.toLowerCase().includes(term) || record.dsaCode.toLowerCase().includes(term);
        
        // Apply Drill-down filters if active
        let matchesInternal = true;
        if (internalFilter) {
            if (internalFilter.smName && record.smName !== internalFilter.smName) matchesInternal = false;
            // Trim comparison to avoid whitespace issues
            if (internalFilter.dss && record.dss?.trim() !== internalFilter.dss?.trim()) matchesInternal = false;
        }

        return matchesSearch && matchesInternal;
     });

     // 2. AGGREGATION LOGIC
     // IF statusFilter is 'Chưa báo cáo', we GROUP BY DSA to compact the list
     if (statusFilter === 'Chưa báo cáo') {
         const missingGroups: Record<string, any> = {};
         
         records.forEach(r => {
             if (!missingGroups[r.dsaCode]) {
                 missingGroups[r.dsaCode] = {
                     ...r,
                     id: `group-missing-${r.dsaCode}`,
                     missingDates: [r.reportDate], // Array to store missing dates
                     missingCount: 1
                 };
             } else {
                 missingGroups[r.dsaCode].missingDates.push(r.reportDate);
                 missingGroups[r.dsaCode].missingCount++;
             }
         });

         // Convert back to array and sort by who misses the most
         const groupedRecords = Object.values(missingGroups);
         groupedRecords.sort((a, b) => b.missingCount - a.missingCount);
         
         // Sort dates within each record descending
         groupedRecords.forEach(g => {
             g.missingDates.sort((d1: string, d2: string) => d2.localeCompare(d1));
         });

         return groupedRecords;
     }

     // NORMAL MODE: Aggregate by Scope
    const groupBy = tableScope === 'dss' ? 'dss' : (tableScope === 'sm' ? 'smName' : 'dsaCode');
    const groups: Record<string, any> = {};

    records.forEach(r => {
        // Determine key
        let key = (r as any)[groupBy];
        // For DSA scope, key is dsaCode. For others, it's name.
        if (!key) key = 'Unknown';

        if (!groups[key]) {
            // Initialize Group Record
            groups[key] = {
                ...r,
                id: `group-${key}`, // Virtual ID for the row
                name: tableScope === 'dsa' ? r.name : key, // Display Name
                dsaCode: tableScope === 'dsa' ? r.dsaCode : 'SUMMARY',
                status: 'Tổng hợp', // Display status for aggregation
                approvalStatus: 'Approved',
                // Initialize metrics to 0
                directApp: 0, directLoan: 0, directAppCRC: 0, directLoanCRC: 0,
                directVolume: 0, directBanca: 0, 
                directAppFEOL: 0, directLoanFEOL: 0, directVolumeFEOL: 0,
                ctv: 0, newCtv: 0, flyers: 0, dlk: 0, newDlk: 0, callsMonth: 0, adSpend: 0,
                _childIds: [], // Store child IDs for bulk delete
                missingCount: 0 // Track how many 'Chưa báo cáo' records
            };
        }

        // Count missing reports
        if (r.status === 'Chưa báo cáo') {
            groups[key].missingCount += 1;
        }

        // Sum Metrics (Only for reported records essentially, since virtual ones are 0)
        const g = groups[key];
        g.directApp += r.directApp;
        g.directLoan += r.directLoan;
        g.directAppCRC += r.directAppCRC;
        g.directLoanCRC += r.directLoanCRC;
        g.directVolume += r.directVolume;
        g.directBanca += r.directBanca;
        g.directAppFEOL += r.directAppFEOL;
        g.directLoanFEOL += r.directLoanFEOL;
        g.directVolumeFEOL += r.directVolumeFEOL;
        g.ctv += r.ctv;
        g.newCtv += r.newCtv;
        g.flyers += r.flyers;
        g.dlk += r.dlk;
        g.newDlk += r.newDlk;
        g.callsMonth += r.callsMonth;
        g.adSpend += r.adSpend;
        if (!r.id.startsWith('virt-')) {
            g._childIds.push(r.id);
        }
    });

    records = Object.values(groups);

     // 3. SORT (By Volume descending by default)
     records.sort((a, b) => {
         const volA = a.directVolume + a.directVolumeFEOL;
         const volB = b.directVolume + b.directVolumeFEOL;
         return sortOrder === 'desc' ? volB - volA : volA - volB;
     });

     return records;
  }, [data, searchTerm, sortOrder, tableScope, internalFilter, statusFilter]);

  const isMissingView = statusFilter === 'Chưa báo cáo';
  // Condition to show Action Column: Is Missing View (Need buttons) OR User can delete (Admin/RSM)
  const showActionColumn = isMissingView || canDeleteSummary;

  return (
    <div className="flex flex-col space-y-4 h-full">
      {/* SCOPE TABS & BREADCRUMB */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
              <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit overflow-x-auto max-w-full no-scrollbar">
                  {!isMissingView ? (
                      <>
                        <button 
                            onClick={() => handleTabChange('dsa')}
                            className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center transition-all whitespace-nowrap ${tableScope === 'dsa' ? 'bg-white dark:bg-gray-700 text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            <UserIcon size={16} className="mr-1 md:mr-2"/> Chi tiết
                        </button>
                        {canShowDSS && (
                            <button 
                                onClick={() => handleTabChange('dss')}
                                className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center transition-all whitespace-nowrap ${tableScope === 'dss' ? 'bg-white dark:bg-gray-700 text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                <Users size={16} className="mr-1 md:mr-2"/> Team
                            </button>
                        )}
                        {canShowSM && (
                            <button 
                                onClick={() => handleTabChange('sm')}
                                className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center transition-all whitespace-nowrap ${tableScope === 'sm' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                <Map size={16} className="mr-1 md:mr-2"/> Khu Vực
                            </button>
                        )}
                      </>
                  ) : (
                      <div className="px-4 py-2 rounded-lg text-sm font-bold flex items-center bg-red-50 text-red-600 border border-red-200 shadow-sm animate-in fade-in whitespace-nowrap">
                          <CalendarOff size={16} className="mr-2"/> Danh sách thiếu báo cáo (Gom nhóm)
                      </div>
                  )}
              </div>

              {/* Drill Down Breadcrumb */}
              {internalFilter && !isMissingView && (
                  <div className="flex items-center text-sm bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-lg border border-orange-200 dark:border-orange-800 animate-in fade-in slide-in-from-left-4 overflow-x-auto max-w-full">
                      <button onClick={resetDrillDown} className="text-gray-500 hover:text-orange-600 flex-shrink-0"><RotateCcw size={14}/></button>
                      <span className="mx-2 text-gray-400">|</span>
                      <span className="font-bold text-gray-600 dark:text-gray-300 whitespace-nowrap">Xem:</span>
                      {internalFilter.smName && (
                          <>
                            <ChevronRight size={14} className="mx-1 text-gray-400 flex-shrink-0"/>
                            <span className="font-bold text-blue-600 whitespace-nowrap">{internalFilter.smName}</span>
                          </>
                      )}
                      {internalFilter.dss && (
                          <>
                            <ChevronRight size={14} className="mx-1 text-gray-400 flex-shrink-0"/>
                            <span className="font-bold text-purple-600 whitespace-nowrap">{internalFilter.dss}</span>
                          </>
                      )}
                      <button onClick={() => setInternalFilter(null)} className="ml-3 text-xs bg-white border px-2 py-0.5 rounded text-gray-500 hover:text-red-500 hover:border-red-200 whitespace-nowrap">Xóa lọc</button>
                  </div>
              )}
          </div>
      </div>

      {showToolbar && (
        <div className="flex flex-col md:flex-row justify-between items-center gap-2">
            <div className="bg-emerald-50/80 dark:bg-emerald-900/20 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm flex items-center w-full max-w-md focus-within:ring-2 focus-within:ring-emerald-400 focus-within:bg-white dark:focus-within:bg-gray-800 transition-all duration-300">
                <Search size={20} className="text-emerald-600 dark:text-emerald-400 mr-2" />
                <input type="text" placeholder="Tìm kiếm tên..." className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-0 text-emerald-900 dark:text-emerald-100 font-semibold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                {searchTerm && <button onClick={() => setSearchTerm('')} className="text-emerald-400 hover:text-red-500"><X size={16} /></button>}
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                {/* Sort Button (Hidden in Not Reported view as we sort by Date) */}
                {!isMissingView && (
                    <button 
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')} 
                    className="flex items-center space-x-2 px-3 py-2.5 rounded-lg border border-gray-200 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm font-bold shadow-sm whitespace-nowrap"
                    >
                    {sortOrder === 'desc' ? <ArrowDown size={18} className="text-emerald-600"/> : <ArrowUp size={18} className="text-orange-500"/>}
                    <span className="hidden md:inline">{sortOrder === 'desc' ? 'Cao nhất' : 'Thấp nhất'}</span>
                    </button>
                )}

                {canConfigureColumns && !isMissingView && (
                <div className="relative">
                    <button onClick={() => setShowColumnSettings(!showColumnSettings)} className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg border transition-all text-sm font-bold ${showColumnSettings ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white dark:bg-gray-800 border-gray-200 text-gray-600'}`}>
                        <Layout size={18} /><span className="hidden md:inline">Hiển thị</span><ChevronDown size={14} className={`${showColumnSettings ? 'rotate-180' : ''}`} />
                    </button>
                    {showColumnSettings && (
                        <>
                            <div className="fixed inset-0 z-20" onClick={() => setShowColumnSettings(false)}></div>
                            <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 rounded-xl shadow-xl z-30 overflow-hidden">
                                <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center"><span className="font-bold text-sm">Tùy chỉnh bảng</span><button onClick={() => setShowColumnSettings(false)}><X size={16}/></button></div>
                                <div className="max-h-[400px] overflow-y-auto p-2">
                                    <div className="mb-3">
                                        <div className="text-xs font-bold text-emerald-600 uppercase mb-2 px-2">Thông tin</div>
                                        <label className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"><input type="checkbox" checked={visibleColumns.id} onChange={() => toggleColumn('id')} className="mr-3"/><span>ID (Debug)</span></label>
                                        {canShowDSS && <label className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"><input type="checkbox" checked={visibleColumns.dss} onChange={() => toggleColumn('dss')} className="mr-3"/><span>DSS</span></label>}
                                        {canShowSM && <label className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"><input type="checkbox" checked={visibleColumns.sm} onChange={() => toggleColumn('sm')} className="mr-3"/><span>SM</span></label>}
                                        <label className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"><input type="checkbox" checked={visibleColumns.approval} onChange={() => toggleColumn('approval')} className="mr-3"/><span>Trạng thái duyệt</span></label>
                                    </div>
                                    <div className="mb-3">
                                        <div className="text-xs font-bold text-blue-600 uppercase mb-2 px-2">Sản phẩm</div>
                                        <label className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"><input type="checkbox" checked={visibleColumns.directApp} onChange={() => toggleColumn('directApp')} className="mr-3"/><span>App (Tiền mặt)</span></label>
                                        <label className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"><input type="checkbox" checked={visibleColumns.directLoan} onChange={() => toggleColumn('directLoan')} className="mr-3"/><span>Loan (Tiền mặt)</span></label>
                                        <label className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"><input type="checkbox" checked={visibleColumns.directVolume} onChange={() => toggleColumn('directVolume')} className="mr-3"/><span>Volume</span></label>
                                        <label className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"><input type="checkbox" checked={visibleColumns.directBanca} onChange={() => toggleColumn('directBanca')} className="mr-3"/><span>Banca</span></label>
                                        <label className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"><input type="checkbox" checked={visibleColumns.directAppCRC} onChange={() => toggleColumn('directAppCRC')} className="mr-3"/><span>App CRC (Thẻ)</span></label>
                                        <label className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"><input type="checkbox" checked={visibleColumns.directLoanCRC} onChange={() => toggleColumn('directLoanCRC')} className="mr-3"/><span>Loan CRC</span></label>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                )}
            </div>
        </div>
      )}

      {/* Use 100dvh for better mobile experience (dynamic viewport height) */}
      <div className="w-full overflow-hidden border border-gray-300 dark:border-gray-700 rounded-lg shadow-md bg-white dark:bg-gray-800 flex flex-col flex-1 h-[calc(100dvh-140px)] md:h-[65vh]">
        <div className="overflow-x-auto overflow-y-auto flex-1 relative custom-scrollbar">
          <table className="min-w-max border-collapse w-full text-xs md:text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 sticky top-0 z-20">
              <tr className="uppercase bg-emerald-500 text-white font-bold text-xs">
                <th className="border border-gray-300 dark:border-gray-600 p-2 sticky left-0 z-30 bg-emerald-700 min-w-[35px] text-center">TT</th>
                {visibleColumns.id && <th className="border border-gray-300 p-2 min-w-[60px] bg-gray-600">ID</th>}
                
                {/* Dynamic Name Column based on Scope */}
                <th className="border border-gray-300 dark:border-gray-600 p-2 sticky left-[35px] z-30 bg-emerald-700 min-w-[120px] text-left shadow-lg">
                    {isMissingView ? 'Nhân sự (DSA)' : (tableScope === 'dsa' ? 'Nhân sự (DSA)' : tableScope === 'dss' ? 'Team (DSS)' : 'Khu Vực (SM)')}
                </th>

                {/* Only show Hierarchy columns in DSA view OR when viewing missing reports */}
                {(tableScope === 'dsa' || isMissingView) && canShowDSS && visibleColumns.dss && <th className="border border-gray-300 p-2 min-w-[80px]">DSS</th>}
                {(tableScope === 'dsa' || isMissingView) && canShowSM && visibleColumns.sm && <th className="border border-gray-300 p-2 min-w-[60px]">SM</th>}
                
                {/* In Summary views, show the parent hierarchy if relevant */}
                {tableScope === 'dss' && canShowSM && !isMissingView && <th className="border border-gray-300 p-2 min-w-[60px]">SM</th>}

                {/* Status / Missing List Column - Only visible if has permission or missing view */}
                {showActionColumn && (
                    <th className="border border-gray-300 p-2 min-w-[40px] bg-gray-600 text-left">
                        {isMissingView ? 'Danh sách ngày thiếu (Bấm để nhập)' : 'Xóa'}
                    </th>
                )}

                {/* METRICS - Only show if NOT in Missing View */}
                {!isMissingView && (
                    <>
                        {visibleColumns.directApp && <th className="border border-gray-300 p-2 bg-emerald-50 text-gray-800 min-w-[50px]">App</th>}
                        {visibleColumns.directLoan && <th className="border border-gray-300 p-2 bg-emerald-50 text-gray-800 min-w-[50px]">Loan</th>}
                        {visibleColumns.directAppCRC && <th className="border border-gray-300 p-2 bg-red-50 text-red-900 font-bold min-w-[50px]">App CRC</th>}
                        {visibleColumns.directLoanCRC && <th className="border border-gray-300 p-2 bg-red-50 text-red-900 font-bold min-w-[50px]">Loan CRC</th>}
                        {visibleColumns.directVolume && <th className="border border-gray-300 p-2 bg-emerald-50 text-gray-800 min-w-[90px]">Volume</th>}
                        {visibleColumns.directBanca && <th className="border border-gray-300 p-2 bg-emerald-50 text-gray-800 min-w-[90px]">Banca</th>}
                        {visibleColumns.directRol && <th className="border border-gray-300 p-2 bg-emerald-50 text-gray-800 min-w-[50px]">Rol (%)</th>}
                        {visibleColumns.directAppFEOL && <th className="border border-gray-300 p-2 bg-purple-50 text-purple-900 font-bold min-w-[50px]">App FEOL</th>}
                        {visibleColumns.directLoanFEOL && <th className="border border-gray-300 p-2 bg-purple-50 text-purple-900 font-bold min-w-[50px]">Loan FEOL</th>}
                        {visibleColumns.directVolumeFEOL && <th className="border border-gray-300 p-2 bg-purple-50 text-purple-900 font-bold min-w-[90px]">Vol FEOL</th>}
                        {visibleColumns.ctv && <th className="border border-gray-300 p-2 bg-orange-50 text-orange-900 min-w-[50px]">CTV</th>}
                        {visibleColumns.newCtv && <th className="border border-gray-300 p-2 bg-orange-50 text-orange-900 min-w-[50px]">CTV Mới</th>}
                        {visibleColumns.flyers && <th className="border border-gray-300 p-2">Tờ rơi</th>}
                        {visibleColumns.dlk && <th className="border border-gray-300 p-2">ĐLK</th>}
                        {visibleColumns.newDlk && <th className="border border-gray-300 p-2">ĐLK Mới</th>}
                        {visibleColumns.calls && <th className="border border-gray-300 p-2">Cuộc Gọi</th>}
                        {visibleColumns.adSpend && <th className="border border-gray-300 p-2 text-right">Chi phí QC</th>}
                    </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              {displayRecords.length > 0 ? (
                displayRecords.map((row, index) => {
                  // Mobile Optimization: Show only last name if space is tight
                  const nameParts = row.name.split(' ');
                  const lastName = nameParts[nameParts.length - 1];
                  
                  // Rol Calculation: Banca / Volume (Calculate fresh for aggregated rows)
                  const rolValue = row.directVolume > 0 ? (row.directBanca / row.directVolume) * 100 : 0;
                  const rolDisplay = rolValue.toFixed(1) + '%';
                  
                  // Handle "Missing View" Logic
                  if (isMissingView) {
                      const missingDates = (row as any).missingDates || [];
                      const missingCount = (row as any).missingCount || 0;

                      return (
                        <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs md:text-sm font-medium bg-red-50/30 dark:bg-red-900/10">
                            <td className="border border-gray-300 dark:border-gray-600 p-2 text-center sticky left-0 z-10 font-medium bg-white dark:bg-gray-800 text-red-600">
                                {index + 1}
                            </td>
                            {visibleColumns.id && <td className="border border-gray-300 p-2 text-center font-mono text-[9px] text-gray-400">{row.id}</td>}
                            
                            <td className="border border-gray-300 dark:border-gray-600 p-2 sticky left-[35px] z-10 uppercase whitespace-nowrap font-bold bg-white dark:bg-gray-800 text-emerald-800 dark:text-emerald-400 shadow-lg">
                                <span className="hidden sm:inline">{row.name}</span>
                                <span className="sm:hidden">{lastName}</span>
                                <span className="ml-2 text-xs text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full">Thiếu: {missingCount}</span>
                            </td>

                            {canShowDSS && visibleColumns.dss && <td className="border border-gray-300 dark:border-gray-600 p-2 whitespace-nowrap text-xs font-medium text-purple-700">{row.dss}</td>}
                            {canShowSM && visibleColumns.sm && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center text-xs font-medium text-blue-700">{row.smName}</td>}

                            {showActionColumn && (
                                <td className="border border-gray-300 dark:border-gray-600 p-2">
                                    <div className="flex flex-wrap gap-1.5">
                                        {missingDates.map((date: string) => {
                                            const [y, m, d] = date.split('-');
                                            const shortDate = `${d}-${m}`;
                                            return (
                                                <button 
                                                    key={date}
                                                    onClick={() => onEdit({ ...row, reportDate: date })}
                                                    className="px-2 py-1 text-xs font-bold bg-white border border-red-200 text-red-600 rounded hover:bg-red-500 hover:text-white transition-colors shadow-sm flex items-center"
                                                    title={`Nhấn để báo cáo ngày ${date}`}
                                                >
                                                    {shortDate} <Pencil size={10} className="ml-1 opacity-50"/>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </td>
                            )}
                        </tr>
                      );
                  }

                  // Handle Normal View
                  return (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs md:text-sm font-medium">
                      <td className="border border-gray-300 dark:border-gray-600 p-2 text-center sticky left-0 z-10 font-medium bg-white dark:bg-gray-800">
                          {index + 1}
                      </td>
                      {visibleColumns.id && <td className="border border-gray-300 p-2 text-center font-mono text-[9px] text-gray-400">{row.id}</td>}
                      
                      {/* Name Column (Clickable to Drill Down or Detail) */}
                      <td 
                        className="border border-gray-300 dark:border-gray-600 p-2 sticky left-[35px] z-10 uppercase whitespace-nowrap font-bold cursor-pointer hover:text-blue-600 hover:underline bg-white dark:bg-gray-800 text-emerald-800 dark:text-emerald-400 shadow-lg" 
                        onClick={() => handleSummaryClick(row)}
                      >
                        <span className="hidden sm:inline">{row.name}</span>
                        <span className="sm:hidden">{lastName}</span>
                        {(row as any)._childIds?.length > 0 && <span className="ml-2 text-[10px] text-gray-400 font-normal">({(row as any)._childIds.length})</span>}
                      </td>
                      
                      {/* Hierarchy Columns */}
                      {tableScope === 'dsa' && canShowDSS && visibleColumns.dss && <td className="border border-gray-300 dark:border-gray-600 p-2 whitespace-nowrap text-xs font-medium text-purple-700">{row.dss}</td>}
                      {tableScope === 'dsa' && canShowSM && visibleColumns.sm && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center text-xs font-medium text-blue-700">{row.smName}</td>}
                      
                      {/* Show SM column in DSS view for better context */}
                      {tableScope === 'dss' && canShowSM && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center text-xs font-bold text-blue-700">{row.smName}</td>}

                      {/* Action / Status Column - Hidden if showActionColumn is false */}
                      {showActionColumn && (
                          <td className="border border-gray-300 dark:border-gray-600 p-2 text-center whitespace-nowrap">
                              {canDeleteSummary ? (
                                  <button 
                                    onClick={() => setDeleteConfirm({isOpen: true, ids: (row as any)._childIds, name: row.name})}
                                    className="text-red-400 hover:text-red-600 p-1 rounded" 
                                    title={`Xóa ${(row as any)._childIds?.length} bản ghi của nhóm này`}
                                  >
                                      <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                              ) : null}
                          </td>
                      )}

                      {/* Metrics */}
                      {visibleColumns.directApp && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center">{row.directApp}</td>}
                      {visibleColumns.directLoan && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center text-red-600 font-medium">{row.directLoan}</td>}
                      {visibleColumns.directAppCRC && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center bg-red-50/50">{row.directAppCRC || 0}</td>}
                      {visibleColumns.directLoanCRC && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center bg-red-50/50 text-red-700 font-bold">{row.directLoanCRC || 0}</td>}
                      {visibleColumns.directVolume && <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">{formatCurrency(row.directVolume)}</td>}
                      {visibleColumns.directBanca && <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-emerald-600">{formatCurrency(row.directBanca)}</td>}
                      {visibleColumns.directRol && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center font-bold text-blue-600">{rolDisplay}</td>}
                      {visibleColumns.directAppFEOL && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center bg-purple-50/50">{row.directAppFEOL || 0}</td>}
                      {visibleColumns.directLoanFEOL && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center bg-purple-50/50 font-bold">{row.directLoanFEOL || 0}</td>}
                      {visibleColumns.directVolumeFEOL && <td className="border border-gray-300 dark:border-gray-600 p-2 text-right bg-purple-50/50">{formatCurrency(row.directVolumeFEOL)}</td>}
                      {visibleColumns.ctv && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center">{row.ctv}</td>}
                      {visibleColumns.newCtv && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center">{row.newCtv}</td>}
                      {visibleColumns.flyers && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center">{formatCurrency(row.flyers)}</td>}
                      {visibleColumns.dlk && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center">{row.dlk}</td>}
                      {visibleColumns.newDlk && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center">{row.newDlk}</td>}
                      {visibleColumns.calls && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center">{row.callsMonth}</td>}
                      {visibleColumns.adSpend && <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">{formatCurrency(row.adSpend)}</td>}
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={30} className="text-center p-8 text-gray-500 italic">Không tìm thấy dữ liệu</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {deleteRecordId && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl p-6 text-center max-w-sm w-full">
                    <AlertTriangle className="mx-auto text-red-600 mb-4" size={32} />
                    <h3 className="text-lg font-bold mb-2">Xác nhận xóa?</h3>
                    <p className="text-sm text-gray-600 mb-6">Hành động này không thể hoàn tác.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setDeleteRecordId(null)} className="flex-1 py-2 bg-gray-100 rounded-lg">Hủy</button>
                        <button onClick={() => { if (onDelete && deleteRecordId) onDelete(deleteRecordId); setDeleteRecordId(null); }} className="flex-1 py-2 bg-red-600 text-white rounded-lg">Xóa Ngay</button>
                    </div>
                </div>
            </div>
        )}
        
        {/* Bulk Delete Confirmation for Summary Rows */}
        {deleteConfirm && deleteConfirm.isOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl p-6 text-center max-w-sm w-full">
                    <AlertTriangle className="mx-auto text-red-600 mb-4" size={32} />
                    <h3 className="text-lg font-bold mb-2">Xác nhận xóa nhóm?</h3>
                    <p className="text-sm text-gray-600 mb-2">Bạn đang xóa nhóm <b>{deleteConfirm.name}</b></p>
                    <p className="text-xs text-red-500 mb-6">Hành động này sẽ xóa vĩnh viễn {deleteConfirm.ids.length} bản ghi báo cáo con.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 bg-gray-100 rounded-lg font-bold">Hủy</button>
                        <button onClick={() => { 
                             if (onDelete) {
                                 deleteConfirm.ids.forEach(id => onDelete(id));
                             }
                             setDeleteConfirm(null); 
                        }} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold shadow-lg">Xóa {deleteConfirm.ids.length} mục</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};