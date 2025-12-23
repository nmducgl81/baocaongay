import React, { useState, useMemo, useEffect } from 'react';
import { SalesRecord, User } from '../types';
import { X, Pencil, Check, Ban, AlertCircle, Search, Layout, ChevronDown, Trash2, AlertTriangle, Clock, Copy, ArrowDownAZ, ArrowUpAZ, ArrowUp, ArrowDown, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';

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

export const SalesTable: React.FC<SalesTableProps> = ({ 
  data, onRowClick, onEdit, onApprove, onDelete, currentUser, statusFilter,
  uiScale = 100, onZoomIn, onZoomOut
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  
  // Full Screen State
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Sort State: 'desc' (Newest first) is default
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Permission checks
  const canShowDSS = !['DSA', 'DSS'].includes(currentUser.role);
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
    if (record.id.startsWith('virt-')) return true; // Can "edit" a placeholder to create real record
    if (currentUser.role === 'ADMIN') return true;
    if (currentUser.role === 'DSA' && record.dsaCode === currentUser.dsaCode) return true;
    return true; 
  };

  const canApprove = (record: SalesRecord) => {
    if (record.id.startsWith('virt-')) return false;
    if (currentUser.role === 'DSA') return false;
    return record.approvalStatus === 'Pending';
  };

  const canDelete = ['ADMIN', 'RSM', 'SM', 'DSS'].includes(currentUser.role);
  
  // PROCESSING LOGIC (Filter + Sort):
  const processedRecords = useMemo(() => {
     // 1. FILTER
     const term = searchTerm.toLowerCase();
     let records = data.filter(record => {
        const matchesSearch = record.name.toLowerCase().includes(term) || record.dsaCode.toLowerCase().includes(term);
        return matchesSearch;
     });

     // 2. SORT (By Report Date)
     records.sort((a, b) => {
         const dateA = new Date(a.reportDate).getTime();
         const dateB = new Date(b.reportDate).getTime();
         return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
     });

     return records;
  }, [data, searchTerm, sortOrder]);

  // --- DUPLICATE DETECTION LOGIC ---
  const duplicateIds = useMemo(() => {
      const counts: Record<string, string[]> = {};
      const ids = new Set<string>();

      data.forEach(r => {
          if (r.status === 'Chưa báo cáo' || r.id.startsWith('virt-')) return;
          const key = `${r.dsaCode}_${r.reportDate}`;
          if (!counts[key]) counts[key] = [];
          counts[key].push(r.id);
      });

      Object.values(counts).forEach(recordIds => {
          if (recordIds.length > 1) {
              recordIds.forEach(id => ids.add(id));
          }
      });

      return ids;
  }, [data]);

  return (
    <div className={isFullScreen 
        ? "fixed inset-0 z-[100] bg-white dark:bg-gray-900 flex flex-col p-2 md:p-4 animate-in fade-in zoom-in-95 duration-200" 
        : "flex flex-col space-y-4 h-full"
    }>
      {/* Warning if duplicates found */}
      {duplicateIds.size > 0 && !isFullScreen && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center shadow-sm animate-pulse">
              <AlertTriangle className="mr-3 flex-shrink-0" size={24} />
              <div>
                  <p className="font-bold text-sm">Phát hiện dữ liệu trùng lặp!</p>
                  <p className="text-xs">Có {duplicateIds.size} bản ghi bị trùng (cùng Mã nhân viên & Ngày báo cáo). Các dòng bị trùng đang được tô đỏ bên dưới. Vui lòng kiểm tra và xóa bớt.</p>
              </div>
          </div>
      )}

      {showToolbar && (
        <div className="flex flex-col md:flex-row justify-between items-center gap-2">
            <div className="bg-emerald-50/80 dark:bg-emerald-900/20 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm flex items-center w-full max-w-md focus-within:ring-2 focus-within:ring-emerald-400 focus-within:bg-white dark:focus-within:bg-gray-800 transition-all duration-300">
                <Search size={20} className="text-emerald-600 dark:text-emerald-400 mr-2" />
                <input type="text" placeholder="Tìm kiếm theo Tên..." className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-0 text-emerald-900 dark:text-emerald-100 font-semibold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                {searchTerm && <button onClick={() => setSearchTerm('')} className="text-emerald-400 hover:text-red-500"><X size={16} /></button>}
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                {/* Zoom Controls (Visible in Full Screen or standard) */}
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
                   <span className="hidden md:inline">{sortOrder === 'desc' ? 'Mới nhất' : 'Cũ nhất'}</span>
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
                {/* DSA Code Column Removed */}
                <th className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 sticky left-[35px] z-30 bg-emerald-700 min-w-[100px] text-left">Họ và Tên</th>
                {canShowDSS && visibleColumns.dss && <th className="border border-gray-300 p-2 min-w-[80px]">DSS</th>}
                {canShowSM && visibleColumns.sm && <th className="border border-gray-300 p-2 min-w-[60px]">SM</th>}
                {/* Date Column Removed */}
                <th className="border border-gray-300 p-2 min-w-[40px] md:min-w-[80px]">Status</th>
                {visibleColumns.approval && <th className="border border-gray-300 p-2 min-w-[40px]">Duyệt</th>}
                <th className="border border-gray-300 p-2 min-w-[80px] bg-gray-600">Thao tác</th>
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
              {processedRecords.length > 0 ? (
                processedRecords.map((row, index) => {
                  const isHistorical = row.status.startsWith('Ngày');
                  const isVirtual = row.id.startsWith('virt-');
                  const isDuplicate = duplicateIds.has(row.id);
                  
                  // Mobile Optimization: Show only last name if space is tight
                  const nameParts = row.name.split(' ');
                  const lastName = nameParts[nameParts.length - 1];
                  
                  // Rol Calculation: Banca / Volume
                  const rolValue = row.directVolume > 0 ? (row.directBanca / row.directVolume) * 100 : 0;
                  const rolDisplay = rolValue.toFixed(1) + '%';

                  return (
                    <tr key={row.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-[11px] md:text-sm ${isHistorical ? 'opacity-70 italic' : ''} ${isVirtual ? 'bg-red-50/20' : ''} ${isDuplicate ? 'bg-red-100 dark:bg-red-900/40 animate-pulse' : ''}`}>
                      <td className={`border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-center sticky left-0 z-10 font-medium ${isDuplicate ? 'bg-red-100 dark:bg-red-900' : 'bg-white dark:bg-gray-800'}`}>
                          {isDuplicate ? <AlertTriangle size={14} className="text-red-600 mx-auto" /> : index + 1}
                      </td>
                      {visibleColumns.id && <td className="border border-gray-300 p-1 md:p-2 text-center font-mono text-[9px] text-gray-400">{row.id}</td>}
                      
                      {/* Name Column */}
                      <td className={`border border-gray-300 dark:border-gray-600 p-1 md:p-2 sticky left-[35px] z-10 font-medium uppercase whitespace-nowrap cursor-pointer hover:text-emerald-600 ${isDuplicate ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' : 'bg-white dark:bg-gray-800 text-emerald-800 dark:text-emerald-400'}`} onClick={() => onRowClick(row.dsaCode)}>
                        <span className="hidden sm:inline">{row.name}</span>
                        <span className="sm:hidden">{lastName}</span>
                        {isDuplicate && <span className="ml-2 text-[9px] bg-red-600 text-white px-1 rounded">TRÙNG</span>}
                      </td>
                      
                      {canShowDSS && visibleColumns.dss && <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 whitespace-nowrap text-[10px] md:text-xs font-medium text-purple-700">{row.dss}</td>}
                      {canShowSM && visibleColumns.sm && <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-center text-[10px] md:text-xs font-medium text-blue-700">{row.smName}</td>}
                      
                      {/* Date Column Removed */}

                      <td className={`border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-center text-[10px] md:text-xs font-bold whitespace-nowrap 
                        ${isHistorical ? 'text-gray-500 bg-gray-50' : 
                          row.status === 'Đã báo cáo' ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                        {isHistorical && <Clock size={10} className="inline mr-1" />}
                        {/* Mobile: Y/N, Desktop: Full text */}
                        <span className="md:hidden text-base">{row.status === 'Đã báo cáo' ? 'Y' : 'N'}</span>
                        <span className="hidden md:inline">{row.status}</span>
                      </td>
                      
                      {/* Approval Status: A / P */}
                      {visibleColumns.approval && <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-center whitespace-nowrap">{row.approvalStatus === 'Approved' && <span className="text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full text-xs font-bold">A</span>}{row.approvalStatus === 'Pending' && <span className="text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-full text-xs font-bold">P</span>}{row.approvalStatus === 'Rejected' && <span className="text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full text-[10px]">Từ chối</span>}</td>}
                      
                      <td className="border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                            {canEdit(row) && <button onClick={() => onEdit(row)} className="text-gray-500 hover:text-blue-600 p-1" title="Chỉnh sửa"><Pencil className="w-3.5 h-3.5" /></button>}
                            {canApprove(row) && <><button onClick={() => onApprove(row, true)} className="text-green-500 hover:bg-green-100 p-1 rounded"><Check className="w-3.5 h-3.5" /></button><button onClick={() => onApprove(row, false)} className="text-red-500 hover:bg-red-100 p-1 rounded"><X className="w-3.5 h-3.5" /></button></>}
                            {canDelete && !isVirtual && <button onClick={() => setDeleteRecordId(row.id)} className="text-red-400 hover:text-red-600 p-1 rounded"><Trash2 className="w-3.5 h-3.5" /></button>}
                        </div>
                      </td>
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
                        <button onClick={() => { if (onDelete) onDelete(deleteRecordId); setDeleteRecordId(null); }} className="flex-1 py-2 bg-red-600 text-white rounded-lg">Xóa Ngay</button>
                    </div>
                </div>
            </div>
        )}
      </div>
      <div className="mt-2 text-right text-xs md:text-sm text-gray-500 dark:text-gray-400 italic">
          Xin chào: <span className="font-bold text-emerald-700 dark:text-emerald-400">{currentUser.name}</span>
      </div>
    </div>
  );
};