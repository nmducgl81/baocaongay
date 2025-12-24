import React, { useState, useMemo, useEffect } from 'react';
import { SalesRecord, User } from '../types';
import { X, Pencil, Check, Search, Layout, ChevronDown, Trash2, AlertTriangle, Clock, ArrowUp, ArrowDown, Maximize2, Minimize2, ZoomIn, ZoomOut, Users, Map, User as UserIcon, ChevronRight, RotateCcw } from 'lucide-react';

interface SalesTableProps {
  data: SalesRecord[];
  onRowClick: (dsaCode: string) => void;
  onEdit: (record: SalesRecord) => void;
  onApprove: (record: SalesRecord, isApproved: boolean) => void;
  onDelete?: (recordId: string) => void; // Optional delete handler
  currentUser: User;
  statusFilter: string; // New prop to control visibility of "Chưa báo cáo"
  // Props for scaling
  uiScale?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

type TableScope = 'dsa' | 'dss' | 'sm';

export const SalesTable: React.FC<SalesTableProps> = ({ 
  data, onRowClick, onEdit, onApprove, onDelete, currentUser, statusFilter,
  uiScale = 100, onZoomIn, onZoomOut
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; ids: string[]; name: string } | null>(null);
  const [tableScope, setTableScope] = useState<TableScope>('dsa');
  
  // Drill-down State
  const [internalFilter, setInternalFilter] = useState<{ smName?: string; dss?: string } | null>(null);

  // Full Screen State
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Sort State: 'desc' (Highest Volume first by default for aggregated view)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Permission checks
  const canShowDSS = !['DSA'].includes(currentUser.role);
  const canShowSM = !['DSA', 'DSS', 'SM'].includes(currentUser.role);
  
  // Hide Search and Column Settings for DSA
  const showToolbar = currentUser.role !== 'DSA';
  const canConfigureColumns = currentUser.role === 'ADMIN' || ['RSM', 'SM', 'DSS'].includes(currentUser.role);

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState({
    id: false, 
    dss: true,
    sm: true,
    approval: true,
    directApp: true,
    directLoan: true,
    directAppCRC: true,
    directLoanCRC: true,
    directVolume: true,
    directBanca: true,
    directRol: true,
    directAppFEOL: true,
    directLoanFEOL: true,
    directVolumeFEOL: true,
    ctv: true,
    newCtv: true,
    flyers: true,
    dlk: true,
    newDlk: true,
    calls: true,
    adSpend: true
  });

  const toggleColumn = (key: keyof typeof visibleColumns) => setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val);
  
  // Handle Esc key to exit full screen
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsFullScreen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const canEdit = (record: SalesRecord) => {
    // In aggregated view, we don't edit the summary row directly
    // Editing happens in Detail View or if it's a raw record (which we are moving away from in main table)
    if (record.id.startsWith('virt-')) return true; 
    return false;
  };

  const canApprove = (record: SalesRecord) => {
     // Approval happens in Detail View
    return false;
  };

  const canDelete = ['ADMIN', 'RSM', 'SM', 'DSS'].includes(currentUser.role);
  
  // Can Delete Summary Rows? Only Admin and RSM should delete entire groups to avoid accidents
  const canDeleteSummary = ['ADMIN', 'RSM'].includes(currentUser.role);

  // Handle Tab Switch (Reset Drill-down)
  const handleTabChange = (scope: TableScope) => {
      setTableScope(scope);
      setInternalFilter(null); // Reset filter when switching main tabs
  };

  // Handle Drill Down Click
  const handleSummaryClick = (record: any) => {
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

     // 2. AGGREGATION (ALWAYS AGGREGATE NOW - whether DSA, DSS, or SM)
     // This ensures we see "Total Results" per person/team
    const groupBy = tableScope === 'dss' ? 'dss' : (tableScope === 'sm' ? 'smName' : 'dsaCode');
    const groups: Record<string, any> = {};

    records.forEach(r => {
        if (r.status === 'Chưa báo cáo') return;

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
                _childIds: [] // Store child IDs for bulk delete
            };
        }

        // Sum Metrics
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
        g._childIds.push(r.id);
    });

    records = Object.values(groups);

     // 3. SORT (By Volume descending by default for Aggregated Views)
     records.sort((a, b) => {
         const volA = a.directVolume + a.directVolumeFEOL;
         const volB = b.directVolume + b.directVolumeFEOL;
         return sortOrder === 'desc' ? volB - volA : volA - volB;
     });

     return records;
  }, [data, searchTerm, sortOrder, tableScope, internalFilter]);

  // --- DUPLICATE DETECTION LOGIC (Disabled in Aggregated View) ---
  const duplicateIds = new Set<string>();

  return (
    <div className={isFullScreen 
        ? "fixed inset-0 z-[100] bg-white dark:bg-gray-900 flex flex-col p-2 md:p-4 animate-in fade-in zoom-in-95 duration-200" 
        : "flex flex-col space-y-4 h-full"
    }>
      {/* SCOPE TABS & BREADCRUMB */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
              <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                  <button 
                    onClick={() => handleTabChange('dsa')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-all ${tableScope === 'dsa' ? 'bg-white dark:bg-gray-700 text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  >
                    <UserIcon size={16} className="mr-2"/> Chi tiết DSA
                  </button>
                  {canShowDSS && (
                    <button 
                        onClick={() => handleTabChange('dss')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-all ${tableScope === 'dss' ? 'bg-white dark:bg-gray-700 text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <Users size={16} className="mr-2"/> Tổng Team (DSS)
                    </button>
                  )}
                  {canShowSM && (
                    <button 
                        onClick={() => handleTabChange('sm')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-all ${tableScope === 'sm' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <Map size={16} className="mr-2"/> Tổng Khu Vực (SM)
                    </button>
                  )}
              </div>

              {/* Drill Down Breadcrumb */}
              {internalFilter && (
                  <div className="flex items-center text-sm bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-lg border border-orange-200 dark:border-orange-800 animate-in fade-in slide-in-from-left-4">
                      <button onClick={resetDrillDown} className="text-gray-500 hover:text-orange-600"><RotateCcw size={14}/></button>
                      <span className="mx-2 text-gray-400">|</span>
                      <span className="font-bold text-gray-600 dark:text-gray-300">Đang xem:</span>
                      {internalFilter.smName && (
                          <>
                            <ChevronRight size={14} className="mx-1 text-gray-400"/>
                            <span className="font-bold text-blue-600">{internalFilter.smName}</span>
                          </>
                      )}
                      {internalFilter.dss && (
                          <>
                            <ChevronRight size={14} className="mx-1 text-gray-400"/>
                            <span className="font-bold text-purple-600">{internalFilter.dss}</span>
                          </>
                      )}
                      <button onClick={() => setInternalFilter(null)} className="ml-3 text-xs bg-white border px-2 py-0.5 rounded text-gray-500 hover:text-red-500 hover:border-red-200">Xóa lọc</button>
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
                {/* Zoom Controls */}
                {(isFullScreen || window.innerWidth < 768) && onZoomIn && onZoomOut && (
                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        <button onClick={onZoomOut} disabled={uiScale <= 60} className="p-2 text-gray-500 hover:text-emerald-600 disabled:opacity-30"><ZoomOut size={16}/></button>
                        <span className="text-xs font-bold w-8 text-center">{uiScale}%</span>
                        <button onClick={onZoomIn} disabled={uiScale >= 100} className="p-2 text-gray-500 hover:text-emerald-600 disabled:opacity-30"><ZoomIn size={16}/></button>
                    </div>
                )}

                {/* Sort Button */}
                <button 
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')} 
                  className="flex items-center space-x-2 px-3 py-2.5 rounded-lg border border-gray-200 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm font-bold shadow-sm whitespace-nowrap"
                >
                   {sortOrder === 'desc' ? <ArrowDown size={18} className="text-emerald-600"/> : <ArrowUp size={18} className="text-orange-500"/>}
                   <span className="hidden md:inline">{sortOrder === 'desc' ? 'Cao nhất' : 'Thấp nhất'}</span>
                </button>

                {canConfigureColumns && (
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
                                </div>
                            </div>
                        </>
                    )}
                </div>
                )}
                
                {/* Full Screen Toggle */}
                <button 
                    onClick={() => setIsFullScreen(!isFullScreen)} 
                    className={`p-2.5 rounded-lg border transition-all shadow-sm ${isFullScreen ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200'}`}
                    title={isFullScreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
                >
                    {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
            </div>
        </div>
      )}

      {/* Use 100dvh for better mobile experience (dynamic viewport height) */}
      <div className={`w-full overflow-hidden border border-gray-300 dark:border-gray-700 rounded-lg shadow-md bg-white dark:bg-gray-800 flex flex-col flex-1 ${isFullScreen ? 'h-full' : 'h-[calc(100dvh-140px)] md:h-[65vh]'}`}>
        <div className="overflow-x-auto overflow-y-auto flex-1 relative custom-scrollbar">
          <table className="min-w-max border-collapse w-full text-xs md:text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 sticky top-0 z-20">
              <tr className="uppercase bg-emerald-500 text-white font-bold text-[10px] md:text-xs">
                <th className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 sticky left-0 z-30 bg-emerald-700 min-w-[35px]">TT</th>
                {visibleColumns.id && <th className="border border-gray-300 p-2 min-w-[60px] bg-gray-600">ID</th>}
                
                {/* Dynamic Name Column based on Scope */}
                <th className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 sticky left-[35px] z-30 bg-emerald-700 min-w-[100px] text-left">
                    {tableScope === 'dsa' ? 'Nhân sự (DSA)' : tableScope === 'dss' ? 'Team (DSS)' : 'Khu Vực (SM)'}
                </th>

                {/* Only show Hierarchy columns in DSA view */}
                {tableScope === 'dsa' && canShowDSS && visibleColumns.dss && <th className="border border-gray-300 p-2 min-w-[80px]">DSS</th>}
                {tableScope === 'dsa' && canShowSM && visibleColumns.sm && <th className="border border-gray-300 p-2 min-w-[60px]">SM</th>}
                
                {/* In Summary views, show the parent hierarchy if relevant */}
                {tableScope === 'dss' && canShowSM && <th className="border border-gray-300 p-2 min-w-[60px]">SM</th>}

                {/* Status Column changed to "Tổng hợp" or Actions */}
                <th className="border border-gray-300 p-2 min-w-[40px] bg-gray-600">
                    {canDeleteSummary ? 'Xóa' : 'TT'}
                </th>

                {visibleColumns.directApp && <th className="border border-gray-300 p-2 bg-emerald-50 text-gray-800 min-w-[40px]">App</th>}
                {visibleColumns.directLoan && <th className="border border-gray-300 p-2 bg-emerald-50 text-gray-800 min-w-[40px]">Loan</th>}
                {visibleColumns.directAppCRC && <th className="border border-gray-300 p-2 bg-red-50 text-red-900 font-bold min-w-[40px]">App CRC</th>}
                {visibleColumns.directLoanCRC && <th className="border border-gray-300 p-2 bg-red-50 text-red-900 font-bold min-w-[40px]">Loan CRC</th>}
                {visibleColumns.directVolume && <th className="border border-gray-300 p-2 bg-emerald-50 text-gray-800 min-w-[80px]">Volume</th>}
                {visibleColumns.directBanca && <th className="border border-gray-300 p-2 bg-emerald-50 text-gray-800 min-w-[80px]">Banca</th>}
                {visibleColumns.directRol && <th className="border border-gray-300 p-2 bg-emerald-50 text-gray-800 min-w-[50px]">Rol (%)</th>}
                {visibleColumns.directAppFEOL && <th className="border border-gray-300 p-2 bg-purple-50 text-purple-900 font-bold min-w-[40px]">App FEOL</th>}
                {visibleColumns.directLoanFEOL && <th className="border border-gray-300 p-2 bg-purple-50 text-purple-900 font-bold min-w-[40px]">Loan FEOL</th>}
                {visibleColumns.directVolumeFEOL && <th className="border border-gray-300 p-2 bg-purple-50 text-purple-900 font-bold min-w-[80px]">Vol FEOL</th>}
                {visibleColumns.ctv && <th className="border border-gray-300 p-2 bg-orange-50 text-orange-900 min-w-[40px]">CTV</th>}
                {visibleColumns.newCtv && <th className="border border-gray-300 p-2 bg-orange-50 text-orange-900 min-w-[40px]">CTV Mới</th>}
                {visibleColumns.flyers && <th className="border border-gray-300 p-2">Tờ rơi</th>}
                {visibleColumns.dlk && <th className="border border-gray-300 p-2">ĐLK</th>}
                {visibleColumns.newDlk && <th className="border border-gray-300 p-2">ĐLK Mới</th>}
                {visibleColumns.calls && <th className="border border-gray-300 p-2">Cuộc Gọi</th>}
                {visibleColumns.adSpend && <th className="border border-gray-300 p-2 text-right">Chi phí QC</th>}
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

                  return (
                    <tr key={row.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-[11px] md:text-sm font-medium`}>
                      <td className={`border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-center sticky left-0 z-10 font-medium bg-white dark:bg-gray-800`}>
                          {index + 1}
                      </td>
                      {visibleColumns.id && <td className="border border-gray-300 p-1 md:p-2 text-center font-mono text-[9px] text-gray-400">{row.id}</td>}
                      
                      {/* Name Column (Clickable to Drill Down or Detail) */}
                      <td 
                        className={`border border-gray-300 dark:border-gray-600 p-1 md:p-2 sticky left-[35px] z-10 uppercase whitespace-nowrap bg-white dark:bg-gray-800 text-emerald-800 dark:text-emerald-400 font-bold cursor-pointer hover:text-blue-600 hover:underline`} 
                        onClick={() => handleSummaryClick(row)}
                      >
                        <span className="hidden sm:inline">{row.name}</span>
                        <span className="sm:hidden">{lastName}</span>
                        {(row as any)._childIds?.length > 0 && <span className="ml-2 text-[9px] text-gray-400 font-normal">({(row as any)._childIds.length})</span>}
                      </td>
                      
                      {/* Hierarchy Columns */}
                      {tableScope === 'dsa' && canShowDSS && visibleColumns.dss && <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 whitespace-nowrap text-[10px] md:text-xs font-medium text-purple-700">{row.dss}</td>}
                      {tableScope === 'dsa' && canShowSM && visibleColumns.sm && <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-center text-[10px] md:text-xs font-medium text-blue-700">{row.smName}</td>}
                      
                      {/* Show SM column in DSS view for better context */}
                      {tableScope === 'dss' && canShowSM && <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-center text-[10px] md:text-xs font-bold text-blue-700">{row.smName}</td>}

                      {/* Action / Status Column */}
                      <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-center whitespace-nowrap">
                          {canDeleteSummary ? (
                              <button 
                                onClick={() => setDeleteConfirm({isOpen: true, ids: (row as any)._childIds, name: row.name})}
                                className="text-red-400 hover:text-red-600 p-1 rounded" 
                                title={`Xóa ${(row as any)._childIds?.length} bản ghi của nhóm này`}
                              >
                                  <Trash2 className="w-3.5 h-3.5" />
                              </button>
                          ) : (
                              <span className="text-gray-400">-</span>
                          )}
                      </td>

                      {/* Metrics */}
                      {visibleColumns.directApp && <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-center">{row.directApp}</td>}
                      {visibleColumns.directLoan && <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-center text-red-600 font-medium">{row.directLoan}</td>}
                      {visibleColumns.directAppCRC && <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-center bg-red-50/50">{row.directAppCRC || 0}</td>}
                      {visibleColumns.directLoanCRC && <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-center bg-red-50/50 text-red-700 font-bold">{row.directLoanCRC || 0}</td>}
                      {visibleColumns.directVolume && <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-right">{formatCurrency(row.directVolume)}</td>}
                      {visibleColumns.directBanca && <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-right text-emerald-600">{formatCurrency(row.directBanca)}</td>}
                      {visibleColumns.directRol && <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-center font-bold text-blue-600">{rolDisplay}</td>}
                      {visibleColumns.directAppFEOL && <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-center bg-purple-50/50">{row.directAppFEOL || 0}</td>}
                      {visibleColumns.directLoanFEOL && <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-center bg-purple-50/50 font-bold">{row.directLoanFEOL || 0}</td>}
                      {visibleColumns.directVolumeFEOL && <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-right bg-purple-50/50">{formatCurrency(row.directVolumeFEOL)}</td>}
                      {visibleColumns.ctv && <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-center">{row.ctv}</td>}
                      {visibleColumns.newCtv && <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-center">{row.newCtv}</td>}
                      {visibleColumns.flyers && <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-center">{formatCurrency(row.flyers)}</td>}
                      {visibleColumns.dlk && <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-center">{row.dlk}</td>}
                      {visibleColumns.newDlk && <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-center">{row.newDlk}</td>}
                      {visibleColumns.calls && <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-center">{row.callsMonth}</td>}
                      {visibleColumns.adSpend && <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-right">{formatCurrency(row.adSpend)}</td>}
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