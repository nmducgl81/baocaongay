import React, { useState, useMemo } from 'react';
import { SalesRecord, User } from '../types';
import { X, Pencil, Search, Layout, ChevronDown, Trash2, AlertTriangle, ArrowUp, ArrowDown, Users, Map, User as UserIcon, ChevronRight, RotateCcw, CalendarOff, FileText } from 'lucide-react';

interface SalesTableProps {
  data: SalesRecord[];
  onRowClick: (dsaCode: string) => void;
  onEdit: (record: SalesRecord) => void;
  onApprove: (record: SalesRecord, isApproved: boolean) => void;
  onDelete?: (recordId: string) => void;
  currentUser: User;
  statusFilter: string;
  isLoading?: boolean; // New prop for skeleton loading
}

type TableScope = 'dsa' | 'dss' | 'sm';

export const SalesTable: React.FC<SalesTableProps> = ({ 
  data, onRowClick, onEdit, onApprove, onDelete, currentUser, statusFilter, isLoading = false
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

  // Default Visible Columns: Show ALL by default, user can scroll or hide manually
  const [visibleColumns, setVisibleColumns] = useState({
        id: false, 
        dss: true,
        sm: true,
        approval: true,
        directApp: true,
        directLoan: true,
        directVolume: true,
        directAppCRC: true,
        directLoanCRC: true,
        directBanca: true,
        directRol: true,
        directAppFEOL: true,
        directLoanFEOL: true,
        directVolumeFEOL: true,
        appSur: true, 
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
  
  const canDeleteSummary = ['ADMIN', 'RSM'].includes(currentUser.role);

  const handleTabChange = (scope: TableScope) => {
      setTableScope(scope);
      setInternalFilter(null);
  };

  const handleSummaryClick = (record: any) => {
      if (statusFilter === 'Chưa báo cáo') return;

      if (tableScope === 'sm') {
          setInternalFilter({ smName: record.name });
          setTableScope('dss');
      } else if (tableScope === 'dss') {
          setInternalFilter(prev => ({ ...(prev || {}), dss: record.name }));
          setTableScope('dsa');
      } else if (tableScope === 'dsa') {
          onRowClick(record.dsaCode);
      }
  };

  const resetDrillDown = () => {
      setInternalFilter(null);
      if (canShowSM) setTableScope('sm');
      else if (canShowDSS) setTableScope('dss');
      else setTableScope('dsa');
  };

  const displayRecords = useMemo(() => {
     if (isLoading) return []; // Return empty if loading to show skeleton

     // FILTER
     const term = searchTerm.toLowerCase();
     let records = data.filter(record => {
        const matchesSearch = record.name.toLowerCase().includes(term) || record.dsaCode.toLowerCase().includes(term);
        let matchesInternal = true;
        if (internalFilter) {
            if (internalFilter.smName && record.smName !== internalFilter.smName) matchesInternal = false;
            if (internalFilter.dss && record.dss?.trim() !== internalFilter.dss?.trim()) matchesInternal = false;
        }
        return matchesSearch && matchesInternal;
     });

     // AGGREGATION
     if (statusFilter === 'Chưa báo cáo') {
         const missingGroups: Record<string, any> = {};
         records.forEach(r => {
             if (!missingGroups[r.dsaCode]) {
                 missingGroups[r.dsaCode] = {
                     ...r,
                     id: `group-missing-${r.dsaCode}`,
                     missingDates: [r.reportDate],
                     missingCount: 1
                 };
             } else {
                 missingGroups[r.dsaCode].missingDates.push(r.reportDate);
                 missingGroups[r.dsaCode].missingCount++;
             }
         });
         const groupedRecords = Object.values(missingGroups);
         groupedRecords.sort((a, b) => b.missingCount - a.missingCount);
         groupedRecords.forEach(g => {
             g.missingDates.sort((d1: string, d2: string) => d2.localeCompare(d1));
         });
         return groupedRecords;
     }

    const groupBy = tableScope === 'dss' ? 'dss' : (tableScope === 'sm' ? 'smName' : 'dsaCode');
    const groups: Record<string, any> = {};

    records.forEach(r => {
        let key = (r as any)[groupBy];
        if (!key) key = 'Unknown';

        if (!groups[key]) {
            groups[key] = {
                ...r,
                id: `group-${key}`,
                name: tableScope === 'dsa' ? r.name : key,
                dsaCode: tableScope === 'dsa' ? r.dsaCode : 'SUMMARY',
                status: 'Tổng hợp',
                approvalStatus: 'Approved',
                directApp: 0, directLoan: 0, directAppCRC: 0, directLoanCRC: 0,
                directVolume: 0, directBanca: 0, 
                directAppFEOL: 0, directLoanFEOL: 0, directVolumeFEOL: 0,
                appSur: 0, 
                ctv: 0, newCtv: 0, flyers: 0, dlk: 0, newDlk: 0, callsMonth: 0, adSpend: 0,
                _childIds: [],
                missingCount: 0
            };
        }

        if (r.status === 'Chưa báo cáo') {
            groups[key].missingCount += 1;
        }

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
        g.appSur += (r.appSur || 0);
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

     // SORT
     records.sort((a, b) => {
         const volA = a.directVolume + a.directVolumeFEOL;
         const volB = b.directVolume + b.directVolumeFEOL;
         return sortOrder === 'desc' ? volB - volA : volA - volB;
     });

     return records;
  }, [data, searchTerm, sortOrder, tableScope, internalFilter, statusFilter, isLoading]);

  const isMissingView = statusFilter === 'Chưa báo cáo';
  const showActionColumn = isMissingView || canDeleteSummary;

  // Calculate Subtotal Row
  const totalSummary = useMemo(() => {
    if (isMissingView || displayRecords.length === 0) return null;
    return displayRecords.reduce((acc, r) => ({
        directApp: acc.directApp + r.directApp,
        directLoan: acc.directLoan + r.directLoan,
        directAppCRC: acc.directAppCRC + (r.directAppCRC || 0),
        directLoanCRC: acc.directLoanCRC + (r.directLoanCRC || 0),
        directVolume: acc.directVolume + r.directVolume,
        directBanca: acc.directBanca + r.directBanca,
        directAppFEOL: acc.directAppFEOL + (r.directAppFEOL || 0),
        directLoanFEOL: acc.directLoanFEOL + (r.directLoanFEOL || 0),
        directVolumeFEOL: acc.directVolumeFEOL + (r.directVolumeFEOL || 0),
        appSur: acc.appSur + (r.appSur || 0),
        ctv: acc.ctv + r.ctv,
        newCtv: acc.newCtv + r.newCtv,
        flyers: acc.flyers + r.flyers,
        dlk: acc.dlk + r.dlk,
        newDlk: acc.newDlk + r.newDlk,
        callsMonth: acc.callsMonth + r.callsMonth,
        adSpend: acc.adSpend + r.adSpend,
    }), {
        directApp: 0, directLoan: 0, directAppCRC: 0, directLoanCRC: 0,
        directVolume: 0, directBanca: 0,
        directAppFEOL: 0, directLoanFEOL: 0, directVolumeFEOL: 0,
        appSur: 0,
        ctv: 0, newCtv: 0, flyers: 0, dlk: 0, newDlk: 0, callsMonth: 0, adSpend: 0
    });
  }, [displayRecords, isMissingView]);

  return (
    <div className="flex flex-col space-y-4 w-full">
      {/* SCOPE TABS & BREADCRUMB */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
              <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit overflow-x-auto max-w-full no-scrollbar">
                  {!isMissingView ? (
                      <>
                        <button onClick={() => handleTabChange('dsa')} className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center transition-all whitespace-nowrap ${tableScope === 'dsa' ? 'bg-white dark:bg-gray-700 text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                            <UserIcon size={16} className="mr-1 md:mr-2"/> Chi tiết
                        </button>
                        {canShowDSS && (
                            <button onClick={() => handleTabChange('dss')} className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center transition-all whitespace-nowrap ${tableScope === 'dss' ? 'bg-white dark:bg-gray-700 text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                <Users size={16} className="mr-1 md:mr-2"/> Team
                            </button>
                        )}
                        {canShowSM && (
                            <button onClick={() => handleTabChange('sm')} className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center transition-all whitespace-nowrap ${tableScope === 'sm' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
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
                            <div className="absolute right-0 top-full mt-2 w-72 max-w-[90vw] bg-white dark:bg-gray-800 border border-gray-200 rounded-xl shadow-xl z-30 overflow-hidden animate-in fade-in zoom-in-95">
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
                                        <label className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"><input type="checkbox" checked={visibleColumns.appSur} onChange={() => toggleColumn('appSur')} className="mr-3"/><span>App Sur (Chứng từ)</span></label>
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

      {/* TABLE CONTAINER - Fixed: Adjusted height to ensure scrollability on mobile */}
      {/* Removed overflow-hidden from parent to avoid sticky issues on Safari */}
      <div className="w-full border border-gray-300 dark:border-gray-700 rounded-lg shadow-md bg-white dark:bg-gray-800 flex flex-col h-[65dvh] md:h-[calc(100vh-140px)] relative">
        {/* 'overflow-auto' enables scrolling in BOTH directions */}
        <div className="overflow-auto flex-1 relative custom-scrollbar rounded-lg">
          <table className="min-w-max border-collapse w-full text-xs md:text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 sticky top-0 z-40">
              <tr className="uppercase bg-emerald-500 text-white font-bold text-xs">
                {/* STICKY COLUMN 1: TT (Index) */}
                <th className="border border-gray-300 dark:border-gray-600 p-2 sticky left-0 z-50 bg-emerald-700 w-[40px] min-w-[40px] max-w-[40px] text-center">TT</th>
                
                {visibleColumns.id && <th className="border border-gray-300 p-2 min-w-[60px] bg-gray-600">ID</th>}
                
                {/* STICKY COLUMN 2: Name */}
                <th className="border border-gray-300 dark:border-gray-600 p-2 sticky left-[40px] z-50 bg-emerald-700 w-[130px] min-w-[130px] max-w-[130px] md:w-[200px] md:min-w-[200px] md:max-w-[200px] text-left shadow-lg">
                    {isMissingView ? 'Nhân sự (DSA)' : (tableScope === 'dsa' ? 'Nhân sự (DSA)' : tableScope === 'dss' ? 'Team (DSS)' : 'Khu Vực (SM)')}
                </th>

                {(tableScope === 'dsa' || isMissingView) && canShowDSS && visibleColumns.dss && <th className="border border-gray-300 p-2 min-w-[80px]">DSS</th>}
                {(tableScope === 'dsa' || isMissingView) && canShowSM && visibleColumns.sm && <th className="border border-gray-300 p-2 min-w-[60px]">SM</th>}
                
                {tableScope === 'dss' && canShowSM && !isMissingView && <th className="border border-gray-300 p-2 min-w-[60px]">SM</th>}

                {showActionColumn && (
                    <th className="border border-gray-300 p-2 min-w-[40px] bg-gray-600 text-left">
                        {isMissingView ? 'Danh sách ngày thiếu' : 'Xóa'}
                    </th>
                )}

                {!isMissingView && (
                    <>
                        {visibleColumns.directApp && <th className="border border-gray-300 p-2 bg-emerald-50 text-gray-800 min-w-[50px]">App</th>}
                        {visibleColumns.directLoan && <th className="border border-gray-300 p-2 bg-emerald-50 text-gray-800 min-w-[50px]">Loan</th>}
                        
                        {/* UPDATE: Sync App Sur Style */}
                        {visibleColumns.appSur && <th className="border border-gray-300 p-2 bg-teal-50 text-teal-900 min-w-[60px]">App Sur</th>}
                        
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
              
              {/* SKELETON LOADING STATE */}
              {isLoading && (
                  Array.from({ length: 10 }).map((_, idx) => (
                      <tr key={`skeleton-${idx}`} className="animate-pulse bg-white">
                          <td className="border p-2"><div className="h-4 bg-gray-200 rounded w-full"></div></td>
                          <td className="border p-2"><div className="h-4 bg-gray-200 rounded w-full"></div></td>
                          {visibleColumns.directApp && <td className="border p-2"><div className="h-4 bg-gray-100 rounded w-full"></div></td>}
                          {visibleColumns.directLoan && <td className="border p-2"><div className="h-4 bg-gray-100 rounded w-full"></div></td>}
                          {visibleColumns.appSur && <td className="border p-2"><div className="h-4 bg-gray-100 rounded w-full"></div></td>}
                          {visibleColumns.directVolume && <td className="border p-2"><div className="h-4 bg-gray-100 rounded w-full"></div></td>}
                          <td colSpan={10} className="border p-2"></td>
                      </tr>
                  ))
              )}

              {/* SUBTOTAL ROW */}
              {totalSummary && !isMissingView && !isLoading && (
                <tr className="bg-yellow-50 dark:bg-yellow-900/30 font-bold text-xs md:text-sm border-b-2 border-yellow-200 dark:border-yellow-700/50 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors">
                    {/* Sticky Column 1: Index */}
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-center sticky left-0 z-30 bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-200 w-[40px] max-w-[40px] min-w-[40px]">
                        Σ
                    </td>
                    {visibleColumns.id && <td className="border border-gray-300 p-2 bg-yellow-50 dark:bg-yellow-900/20 text-center">-</td>}
                    
                    {/* Sticky Column 2: Name */}
                    <td className="border border-gray-300 dark:border-gray-600 p-2 sticky left-[40px] z-30 bg-yellow-100 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 shadow-lg w-[130px] min-w-[130px] max-w-[130px] md:w-[200px] md:min-w-[200px] md:max-w-[200px] truncate uppercase tracking-tight">
                        TỔNG ({displayRecords.length})
                    </td>

                    {/* Hierarchy Spacers */}
                    {(tableScope === 'dsa') && canShowDSS && visibleColumns.dss && <td className="border border-gray-300 dark:border-gray-600 p-2 bg-yellow-50 dark:bg-yellow-900/20"></td>}
                    {(tableScope === 'dsa') && canShowSM && visibleColumns.sm && <td className="border border-gray-300 dark:border-gray-600 p-2 bg-yellow-50 dark:bg-yellow-900/20"></td>}
                    {tableScope === 'dss' && canShowSM && <td className="border border-gray-300 dark:border-gray-600 p-2 bg-yellow-50 dark:bg-yellow-900/20"></td>}

                    {showActionColumn && <td className="border border-gray-300 dark:border-gray-600 p-2 bg-yellow-50 dark:bg-yellow-900/20"></td>}

                    {/* Metrics - Added tabular-nums for alignment */}
                    {visibleColumns.directApp && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center text-emerald-800 dark:text-emerald-300 tabular-nums">{totalSummary.directApp}</td>}
                    {visibleColumns.directLoan && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center text-red-700 dark:text-red-300 tabular-nums">{totalSummary.directLoan}</td>}
                    
                    {/* UPDATE: Sync App Sur Style in Subtotal */}
                    {visibleColumns.appSur && <td className="border border-gray-300 dark:border-gray-600 p-2 bg-teal-50/50 dark:bg-teal-900/20 text-center font-bold text-teal-800 dark:text-teal-300 tabular-nums">{totalSummary.appSur}</td>}
                    
                    {visibleColumns.directAppCRC && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center text-red-800 dark:text-red-300 tabular-nums">{totalSummary.directAppCRC}</td>}
                    {visibleColumns.directLoanCRC && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center text-red-800 dark:text-red-300 tabular-nums">{totalSummary.directLoanCRC}</td>}
                    {visibleColumns.directVolume && <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-emerald-800 dark:text-emerald-300 tabular-nums">{formatCurrency(totalSummary.directVolume)}</td>}
                    {visibleColumns.directBanca && <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-blue-800 dark:text-blue-300 tabular-nums">{formatCurrency(totalSummary.directBanca)}</td>}
                    {visibleColumns.directRol && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center text-purple-800 dark:text-purple-300 tabular-nums">
                        {totalSummary.directVolume > 0 ? ((totalSummary.directBanca / totalSummary.directVolume) * 100).toFixed(1) + '%' : '0%'}
                    </td>}
                    {visibleColumns.directAppFEOL && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center text-purple-800 dark:text-purple-300 tabular-nums">{totalSummary.directAppFEOL}</td>}
                    {visibleColumns.directLoanFEOL && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center text-purple-800 dark:text-purple-300 tabular-nums">{totalSummary.directLoanFEOL}</td>}
                    {visibleColumns.directVolumeFEOL && <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-purple-800 dark:text-purple-300 tabular-nums">{formatCurrency(totalSummary.directVolumeFEOL)}</td>}
                    {visibleColumns.ctv && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center tabular-nums">{totalSummary.ctv}</td>}
                    {visibleColumns.newCtv && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center tabular-nums">{totalSummary.newCtv}</td>}
                    {visibleColumns.flyers && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center tabular-nums">{formatCurrency(totalSummary.flyers)}</td>}
                    {visibleColumns.dlk && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center tabular-nums">{totalSummary.dlk}</td>}
                    {visibleColumns.newDlk && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center tabular-nums">{totalSummary.newDlk}</td>}
                    {visibleColumns.calls && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center tabular-nums">{totalSummary.callsMonth}</td>}
                    {visibleColumns.adSpend && <td className="border border-gray-300 dark:border-gray-600 p-2 text-right tabular-nums">{formatCurrency(totalSummary.adSpend)}</td>}
                </tr>
              )}

              {displayRecords.length > 0 && !isLoading ? (
                displayRecords.map((row, index) => {
                  const rolValue = row.directVolume > 0 ? (row.directBanca / row.directVolume) * 100 : 0;
                  const rolDisplay = rolValue.toFixed(1) + '%';
                  
                  if (isMissingView) {
                      const missingDates = (row as any).missingDates || [];
                      const missingCount = (row as any).missingCount || 0;

                      return (
                        <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs md:text-sm font-medium bg-red-50/30 dark:bg-red-900/10">
                            {/* Sticky Column 1: Index */}
                            <td className="border border-gray-300 dark:border-gray-600 p-2 text-center sticky left-0 z-30 font-medium bg-white dark:bg-gray-800 text-red-600 w-[40px] max-w-[40px] min-w-[40px]">
                                {index + 1}
                            </td>
                            {visibleColumns.id && <td className="border border-gray-300 p-2 text-center font-mono text-[9px] text-gray-400">{row.id}</td>}
                            
                            {/* Sticky Column 2: Name */}
                            <td className="border border-gray-300 dark:border-gray-600 p-2 sticky left-[40px] z-30 uppercase font-bold bg-white dark:bg-gray-800 text-emerald-800 dark:text-emerald-400 shadow-lg w-[130px] min-w-[130px] max-w-[130px] md:w-[200px] md:min-w-[200px] md:max-w-[200px] truncate">
                                <span>{row.name}</span>
                                <span className="ml-2 text-xs text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full inline-block">{missingCount}</span>
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

                  return (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs md:text-sm font-medium">
                      {/* Sticky Column 1: Index */}
                      <td className="border border-gray-300 dark:border-gray-600 p-2 text-center sticky left-0 z-30 font-medium bg-white dark:bg-gray-800 w-[40px] max-w-[40px] min-w-[40px]">
                          {index + 1}
                      </td>
                      {visibleColumns.id && <td className="border border-gray-300 p-2 text-center font-mono text-[9px] text-gray-400">{row.id}</td>}
                      
                      {/* Sticky Column 2: Name */}
                      <td 
                        className="border border-gray-300 dark:border-gray-600 p-2 sticky left-[40px] z-30 uppercase font-bold cursor-pointer hover:text-blue-600 hover:underline bg-white dark:bg-gray-800 text-emerald-800 dark:text-emerald-400 shadow-lg w-[130px] min-w-[130px] max-w-[130px] md:w-[200px] md:min-w-[200px] md:max-w-[200px] truncate" 
                        onClick={() => handleSummaryClick(row)}
                        title={row.name}
                      >
                        {row.name}
                        {(row as any)._childIds?.length > 0 && <span className="ml-2 text-[10px] text-gray-400 font-normal">({(row as any)._childIds.length})</span>}
                      </td>
                      
                      {tableScope === 'dsa' && canShowDSS && visibleColumns.dss && <td className="border border-gray-300 dark:border-gray-600 p-2 whitespace-nowrap text-xs font-medium text-purple-700">{row.dss}</td>}
                      {tableScope === 'dsa' && canShowSM && visibleColumns.sm && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center text-xs font-medium text-blue-700">{row.smName}</td>}
                      
                      {tableScope === 'dss' && canShowSM && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center text-xs font-bold text-blue-700">{row.smName}</td>}

                      {showActionColumn && (
                          <td className="border border-gray-300 dark:border-gray-600 p-2 text-center whitespace-nowrap">
                              {canDeleteSummary ? (
                                  <button 
                                    onClick={() => setDeleteConfirm({isOpen: true, ids: (row as any)._childIds, name: row.name})}
                                    className="text-red-400 hover:text-red-600 p-1 rounded" 
                                  >
                                      <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                              ) : null}
                          </td>
                      )}

                      {/* Metrics: Added tabular-nums for vertical alignment */}
                      {visibleColumns.directApp && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center tabular-nums">{row.directApp}</td>}
                      {visibleColumns.directLoan && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center text-red-600 font-medium tabular-nums">{row.directLoan}</td>}
                      
                      {/* UPDATE: Sync App Sur Style Body */}
                      {visibleColumns.appSur && <td className={`border border-gray-300 dark:border-gray-600 p-2 text-center font-bold tabular-nums ${row.appSur > 0 ? 'text-teal-700' : 'text-gray-400 font-normal'}`}>{row.appSur || 0}</td>}
                      
                      {visibleColumns.directAppCRC && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center bg-red-50/50 tabular-nums">{row.directAppCRC || 0}</td>}
                      {visibleColumns.directLoanCRC && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center bg-red-50/50 text-red-700 font-bold tabular-nums">{row.directLoanCRC || 0}</td>}
                      {visibleColumns.directVolume && <td className="border border-gray-300 dark:border-gray-600 p-2 text-right tabular-nums">{formatCurrency(row.directVolume)}</td>}
                      {visibleColumns.directBanca && <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-emerald-600 tabular-nums">{formatCurrency(row.directBanca)}</td>}
                      {visibleColumns.directRol && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center font-bold text-blue-600 tabular-nums">{rolDisplay}</td>}
                      {visibleColumns.directAppFEOL && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center bg-purple-50/50 tabular-nums">{row.directAppFEOL || 0}</td>}
                      {visibleColumns.directLoanFEOL && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center bg-purple-50/50 font-bold tabular-nums">{row.directLoanFEOL || 0}</td>}
                      {visibleColumns.directVolumeFEOL && <td className="border border-gray-300 dark:border-gray-600 p-2 text-right bg-purple-50/50 tabular-nums">{formatCurrency(row.directVolumeFEOL)}</td>}
                      {visibleColumns.ctv && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center tabular-nums">{row.ctv}</td>}
                      {visibleColumns.newCtv && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center tabular-nums">{row.newCtv}</td>}
                      {visibleColumns.flyers && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center tabular-nums">{formatCurrency(row.flyers)}</td>}
                      {visibleColumns.dlk && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center tabular-nums">{row.dlk}</td>}
                      {visibleColumns.newDlk && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center tabular-nums">{row.newDlk}</td>}
                      {visibleColumns.calls && <td className="border border-gray-300 dark:border-gray-600 p-2 text-center tabular-nums">{row.callsMonth}</td>}
                      {visibleColumns.adSpend && <td className="border border-gray-300 dark:border-gray-600 p-2 text-right tabular-nums">{formatCurrency(row.adSpend)}</td>}
                    </tr>
                  );
                })
              ) : (
                !isLoading && <tr><td colSpan={30} className="text-center p-8 text-gray-500 italic">Không tìm thấy dữ liệu</td></tr>
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
