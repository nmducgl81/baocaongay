import React, { useState, useMemo } from 'react';
import { SalesRecord, User } from '../types';
import { Image as ImageIcon, X, Pencil, Check, Ban, AlertCircle, Search, Settings, Layout, ChevronDown } from 'lucide-react';

interface SalesTableProps {
  data: SalesRecord[];
  onRowClick: (dsaCode: string) => void;
  onEdit: (record: SalesRecord) => void;
  onApprove: (record: SalesRecord, isApproved: boolean) => void;
  currentUser: User;
}

export const SalesTable: React.FC<SalesTableProps> = ({ data, onRowClick, onEdit, onApprove, currentUser }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  // Permission checks
  const canShowDSS = !['DSA', 'DSS'].includes(currentUser.role);
  const canShowSM = !['DSA', 'DSS', 'SM'].includes(currentUser.role);

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState({
    // Optional Info
    dss: true,
    sm: true,
    approval: true,
    image: true,
    
    // Direct Sales
    directApp: true,
    directLoan: true,
    directAppCRC: true,
    directLoanCRC: true,
    directVolume: true,
    directBanca: true,
    directRol: true,

    // Online Sales
    onlineApp: true,
    onlineVolume: true,

    // Activity
    ctv: true,
    newCtv: true,
    flyers: true,
    dlk: true,
    newDlk: true,
    calls: true,
    adSpend: true
  });

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  const canEdit = (record: SalesRecord) => {
    if (currentUser.role === 'ADMIN') return true;
    if (currentUser.role === 'DSA' && record.dsaCode === currentUser.dsaCode) return true;
    return true; 
  };

  const canApprove = (record: SalesRecord) => {
    if (currentUser.role === 'DSA') return false;
    return record.approvalStatus === 'Pending';
  };

  const filteredRecords = data.filter(record => {
    const term = searchTerm.toLowerCase();
    return record.name.toLowerCase().includes(term) || 
           record.dsaCode.toLowerCase().includes(term);
  });

  // --- Dynamic ColSpan Calculations ---
  
  // Info Section: Mandatory (TT, Code, Name, Date, Status, Actions) = 6 + Optional visible
  const infoColSpan = 6 
    + (canShowDSS && visibleColumns.dss ? 1 : 0) 
    + (canShowSM && visibleColumns.sm ? 1 : 0) 
    + (visibleColumns.approval ? 1 : 0) 
    + (visibleColumns.image ? 1 : 0);

  // Direct Sales Section
  const directCols = [
    visibleColumns.directApp, visibleColumns.directLoan, visibleColumns.directAppCRC, 
    visibleColumns.directLoanCRC, visibleColumns.directVolume, visibleColumns.directBanca, visibleColumns.directRol
  ];
  const directColSpan = directCols.filter(Boolean).length;

  // Online Sales Section
  const onlineCols = [visibleColumns.onlineApp, visibleColumns.onlineVolume];
  const onlineColSpan = onlineCols.filter(Boolean).length;

  // Activity Section
  const activityCols = [
    visibleColumns.ctv, visibleColumns.newCtv, visibleColumns.flyers, 
    visibleColumns.dlk, visibleColumns.newDlk, visibleColumns.calls, visibleColumns.adSpend
  ];
  const activityColSpan = activityCols.filter(Boolean).length;

  return (
    <div className="flex flex-col space-y-4">
      {/* Search Bar & Settings */}
      <div className="flex justify-between items-center">
        <div className="bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm flex items-center w-full max-w-md focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
            <Search size={20} className="text-gray-400 mr-2" />
            <input 
            type="text" 
            placeholder="Tìm kiếm theo Tên hoặc DSA Code..." 
            className="flex-1 border-none focus:ring-0 text-sm p-0 text-gray-700 font-medium placeholder:font-normal"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
            </button>
            )}
        </div>

        {/* Column Settings Dropdown */}
        <div className="relative">
            <button 
                onClick={() => setShowColumnSettings(!showColumnSettings)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg border transition-all text-sm font-bold ${showColumnSettings ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
                <Layout size={18} />
                <span className="hidden md:inline">Hiển thị cột</span>
                <ChevronDown size={14} className={`transform transition-transform ${showColumnSettings ? 'rotate-180' : ''}`} />
            </button>

            {showColumnSettings && (
                <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowColumnSettings(false)}></div>
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-30 animate-in fade-in zoom-in-95 overflow-hidden">
                        <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <span className="font-bold text-gray-700 text-sm">Tùy chỉnh bảng</span>
                            <button onClick={() => setShowColumnSettings(false)}><X size={16} className="text-gray-400 hover:text-gray-600"/></button>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2">
                            
                            {/* Group: General */}
                            <div className="mb-3">
                                <div className="text-xs font-bold text-emerald-600 uppercase mb-2 px-2">Thông tin chung</div>
                                <div className="space-y-1">
                                    {canShowDSS && (
                                        <label className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                            <input type="checkbox" checked={visibleColumns.dss} onChange={() => toggleColumn('dss')} className="rounded text-emerald-600 focus:ring-emerald-500 mr-3 border-gray-300"/>
                                            <span className="text-sm text-gray-700">DSS Quản lý</span>
                                        </label>
                                    )}
                                    {canShowSM && (
                                        <label className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                            <input type="checkbox" checked={visibleColumns.sm} onChange={() => toggleColumn('sm')} className="rounded text-emerald-600 focus:ring-emerald-500 mr-3 border-gray-300"/>
                                            <span className="text-sm text-gray-700">SM Name</span>
                                        </label>
                                    )}
                                    <label className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                        <input type="checkbox" checked={visibleColumns.approval} onChange={() => toggleColumn('approval')} className="rounded text-emerald-600 focus:ring-emerald-500 mr-3 border-gray-300"/>
                                        <span className="text-sm text-gray-700">Trạng thái duyệt</span>
                                    </label>
                                    <label className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                        <input type="checkbox" checked={visibleColumns.image} onChange={() => toggleColumn('image')} className="rounded text-emerald-600 focus:ring-emerald-500 mr-3 border-gray-300"/>
                                        <span className="text-sm text-gray-700">Hình ảnh</span>
                                    </label>
                                </div>
                            </div>

                            {/* Group: Direct Sales */}
                            <div className="mb-3 border-t border-gray-100 pt-2">
                                <div className="text-xs font-bold text-red-600 uppercase mb-2 px-2">Doanh số trực tiếp</div>
                                <div className="grid grid-cols-2 gap-1">
                                    {Object.keys(visibleColumns).filter(k => k.startsWith('direct')).map(key => (
                                         <label key={key} className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                            <input type="checkbox" checked={(visibleColumns as any)[key]} onChange={() => toggleColumn(key as any)} className="rounded text-red-600 focus:ring-red-500 mr-2 border-gray-300"/>
                                            <span className="text-sm text-gray-700 capitalize">{key.replace('direct', '')}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                             {/* Group: Online & Activity */}
                             <div className="border-t border-gray-100 pt-2">
                                <div className="text-xs font-bold text-blue-600 uppercase mb-2 px-2">Online & Hoạt động</div>
                                <div className="grid grid-cols-2 gap-1">
                                    <label className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                        <input type="checkbox" checked={visibleColumns.onlineApp} onChange={() => toggleColumn('onlineApp')} className="rounded text-blue-600 focus:ring-blue-500 mr-2 border-gray-300"/>
                                        <span className="text-sm text-gray-700">Online App</span>
                                    </label>
                                    <label className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                        <input type="checkbox" checked={visibleColumns.onlineVolume} onChange={() => toggleColumn('onlineVolume')} className="rounded text-blue-600 focus:ring-blue-500 mr-2 border-gray-300"/>
                                        <span className="text-sm text-gray-700">Online Vol</span>
                                    </label>
                                    {Object.keys(visibleColumns).filter(k => !k.startsWith('direct') && !k.startsWith('online') && !['dss','sm','approval','image'].includes(k)).map(key => (
                                         <label key={key} className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                            <input type="checkbox" checked={(visibleColumns as any)[key]} onChange={() => toggleColumn(key as any)} className="rounded text-orange-600 focus:ring-orange-500 mr-2 border-gray-300"/>
                                            <span className="text-sm text-gray-700 capitalize">{key}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                </>
            )}
        </div>
      </div>

      <div className="w-full overflow-hidden border border-gray-300 rounded-lg shadow-md bg-white">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-max border-collapse w-full text-sm">
            {/* --- HEADERS --- */}
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th colSpan={infoColSpan} className="border border-gray-300 p-2 bg-gray-50"></th>
                {/* Only show 'RESULT' header if at least one metric is visible */}
                {(directColSpan + onlineColSpan + activityColSpan) > 0 && (
                     <th colSpan={directColSpan + onlineColSpan + activityColSpan} className="border border-gray-300 p-3 text-center bg-emerald-100 font-bold text-lg text-emerald-900 uppercase tracking-wide">
                        KẾT QUẢ HOẠT ĐỘNG BÁN MTD
                    </th>
                )}
              </tr>
              
              <tr>
                <th colSpan={infoColSpan} className="border border-gray-300 bg-emerald-600 text-white font-semibold">
                  THÔNG TIN NHÂN SỰ
                </th>
                
                {directColSpan > 0 && (
                    <th colSpan={directColSpan} className="border border-gray-300 p-2 text-center bg-red-600 text-white font-semibold">
                    DOANH SỐ TRỰC TIẾP
                    </th>
                )}
                
                {onlineColSpan > 0 && (
                    <th colSpan={onlineColSpan} className="border border-gray-300 p-2 text-center bg-blue-600 text-white font-semibold">
                    DOANH SỐ ONLINE
                    </th>
                )}
                
                {activityColSpan > 0 && (
                    <th colSpan={activityColSpan} className="border border-gray-300 p-2 text-center bg-orange-600 text-white font-semibold">
                    HOẠT ĐỘNG BÁN MTD
                    </th>
                )}
              </tr>

              <tr className="text-xs uppercase bg-emerald-500 text-white">
                <th className="border border-gray-300 p-2 sticky left-0 z-10 bg-emerald-700 min-w-[50px]">TT</th>
                <th className="border border-gray-300 p-2 sticky left-[50px] z-10 bg-emerald-700 min-w-[100px]">DSA Code</th>
                <th className="border border-gray-300 p-2 sticky left-[150px] z-10 bg-emerald-700 min-w-[180px] text-left">Họ và Tên</th>
                
                {canShowDSS && visibleColumns.dss && <th className="border border-gray-300 p-2 min-w-[120px]">DSS</th>}
                {canShowSM && visibleColumns.sm && <th className="border border-gray-300 p-2 min-w-[80px]">SM Name</th>}
                
                <th className="border border-gray-300 p-2 min-w-[100px]">Ngày báo cáo</th>
                <th className="border border-gray-300 p-2 min-w-[100px]">Trạng thái</th>
                
                {visibleColumns.approval && <th className="border border-gray-300 p-2 min-w-[80px]">Duyệt</th>}
                {visibleColumns.image && <th className="border border-gray-300 p-2 min-w-[60px]">Hình ảnh</th>}
                
                <th className="border border-gray-300 p-2 min-w-[80px] bg-gray-600">Thao tác</th>

                {visibleColumns.directApp && <th className="border border-gray-300 p-2 bg-emerald-50 text-gray-800 min-w-[50px]">App</th>}
                {visibleColumns.directLoan && <th className="border border-gray-300 p-2 bg-emerald-50 text-gray-800 min-w-[50px]">Loan</th>}
                {visibleColumns.directAppCRC && <th className="border border-gray-300 p-2 bg-red-50 text-red-900 font-bold min-w-[50px]">App CRC</th>}
                {visibleColumns.directLoanCRC && <th className="border border-gray-300 p-2 bg-red-50 text-red-900 font-bold min-w-[50px]">Loan CRC</th>}
                {visibleColumns.directVolume && <th className="border border-gray-300 p-2 bg-emerald-50 text-gray-800 min-w-[100px]">Volume</th>}
                {visibleColumns.directBanca && <th className="border border-gray-300 p-2 bg-emerald-50 text-gray-800 min-w-[100px]">Banca</th>}
                {visibleColumns.directRol && <th className="border border-gray-300 p-2 bg-emerald-50 text-gray-800 min-w-[60px]">Rol</th>}

                {visibleColumns.onlineApp && <th className="border border-gray-300 p-2 bg-blue-100 text-blue-900 min-w-[60px]">App</th>}
                {visibleColumns.onlineVolume && <th className="border border-gray-300 p-2 bg-blue-100 text-blue-900 min-w-[60px]">Volume</th>}

                {visibleColumns.ctv && <th className="border border-gray-300 p-2 bg-orange-50 text-orange-900 min-w-[60px]">CTV</th>}
                {visibleColumns.newCtv && <th className="border border-gray-300 p-2 bg-orange-50 text-orange-900 min-w-[60px]">CTV Mới</th>}
                {visibleColumns.flyers && <th className="border border-gray-300 p-2 bg-orange-50 text-orange-900 min-w-[80px]">Tờ rơi</th>}
                {visibleColumns.dlk && <th className="border border-gray-300 p-2 bg-orange-50 text-orange-900 min-w-[60px]">ĐLK</th>}
                {visibleColumns.newDlk && <th className="border border-gray-300 p-2 bg-orange-50 text-orange-900 min-w-[60px]">ĐLK Mới</th>}
                {visibleColumns.calls && <th className="border border-gray-300 p-2 bg-orange-50 text-orange-900 min-w-[80px]">Cuộc gọi</th>}
                {visibleColumns.adSpend && <th className="border border-gray-300 p-2 bg-orange-50 text-orange-900 min-w-[100px]">Chi phí QC</th>}
              </tr>
            </thead>

            {/* --- BODY --- */}
            <tbody className="bg-white text-gray-700">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="border border-gray-300 p-2 text-center sticky left-0 bg-white z-10 font-medium">{index + 1}</td>
                    <td className="border border-gray-300 p-2 text-center sticky left-[50px] bg-white z-10 font-mono text-xs">{row.dsaCode}</td>
                    <td className="border border-gray-300 p-2 sticky left-[150px] bg-white z-10 font-medium text-emerald-800 uppercase whitespace-nowrap cursor-pointer hover:text-emerald-600 hover:bg-gray-100 transition-colors" onClick={() => onRowClick(row.dsaCode)}>
                      {row.name}
                    </td>

                    {canShowDSS && visibleColumns.dss && <td className="border border-gray-300 p-2 whitespace-nowrap">{row.dss}</td>}
                    {canShowSM && visibleColumns.sm && <td className="border border-gray-300 p-2 text-center">{row.smName}</td>}
                    
                    <td className="border border-gray-300 p-2 text-center text-xs">{row.reportDate}</td>
                    <td className={`border border-gray-300 p-2 text-center text-xs font-bold ${row.status === 'Đã báo cáo' ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                      {row.status}
                    </td>
                    
                    {/* Approval Status */}
                    {visibleColumns.approval && (
                        <td className="border border-gray-300 p-2 text-center">
                        {row.approvalStatus === 'Approved' && <span className="inline-flex items-center text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><Check size={12} className="mr-1"/> Duyệt</span>}
                        {row.approvalStatus === 'Pending' && <span className="inline-flex items-center text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full"><AlertCircle size={12} className="mr-1"/> Chờ</span>}
                        {row.approvalStatus === 'Rejected' && <span className="inline-flex items-center text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full"><Ban size={12} className="mr-1"/> Từ chối</span>}
                        </td>
                    )}

                    {visibleColumns.image && (
                        <td className="border border-gray-300 p-2 text-center">
                        {row.proofImage ? (
                            <button onClick={() => setSelectedImage(row.proofImage || null)} className="text-emerald-600 hover:text-emerald-800">
                            <ImageIcon size={20} className="mx-auto" />
                            </button>
                        ) : (
                            <span className="text-gray-300">-</span>
                        )}
                        </td>
                    )}

                    {/* Actions */}
                    <td className="border border-gray-300 p-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-2">
                          {canEdit(row) && (
                            <button 
                              onClick={() => onEdit(row)} 
                              className="text-gray-500 hover:text-blue-600"
                              title="Chỉnh sửa"
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                          
                          {canApprove(row) && (
                            <>
                              <button 
                                  onClick={() => onApprove(row, true)}
                                  className="text-green-500 hover:text-green-700 bg-green-50 p-1 rounded hover:bg-green-100"
                                  title="Duyệt"
                              >
                                  <Check size={16} />
                              </button>
                              <button 
                                  onClick={() => onApprove(row, false)}
                                  className="text-red-500 hover:text-red-700 bg-red-50 p-1 rounded hover:bg-red-100"
                                  title="Từ chối"
                              >
                                  <X size={16} />
                              </button>
                            </>
                          )}
                      </div>
                    </td>

                    {visibleColumns.directApp && <td className="border border-gray-300 p-2 text-center">{row.directApp}</td>}
                    {visibleColumns.directLoan && <td className="border border-gray-300 p-2 text-center text-red-600 font-medium">{row.directLoan}</td>}
                    {visibleColumns.directAppCRC && <td className="border border-gray-300 p-2 text-center bg-red-50 font-medium">{row.directAppCRC || 0}</td>}
                    {visibleColumns.directLoanCRC && <td className="border border-gray-300 p-2 text-center bg-red-50 text-red-700 font-bold">{row.directLoanCRC || 0}</td>}
                    {visibleColumns.directVolume && <td className="border border-gray-300 p-2 text-right">{row.directVolume > 0 ? formatCurrency(row.directVolume) : '0'}</td>}
                    {visibleColumns.directBanca && <td className="border border-gray-300 p-2 text-right">{row.directBanca > 0 ? formatCurrency(row.directBanca) : '0'}</td>}
                    {visibleColumns.directRol && <td className="border border-gray-300 p-2 text-center">{row.directRol}</td>}

                    {visibleColumns.onlineApp && <td className="border border-gray-300 p-2 text-center">{row.onlineApp}</td>}
                    {visibleColumns.onlineVolume && <td className="border border-gray-300 p-2 text-center">{row.onlineVolume}</td>}

                    {visibleColumns.ctv && <td className="border border-gray-300 p-2 text-center">{row.ctv}</td>}
                    {visibleColumns.newCtv && <td className="border border-gray-300 p-2 text-center">{row.newCtv}</td>}
                    {visibleColumns.flyers && <td className="border border-gray-300 p-2 text-center">{formatCurrency(row.flyers)}</td>}
                    {visibleColumns.dlk && <td className="border border-gray-300 p-2 text-center">{row.dlk}</td>}
                    {visibleColumns.newDlk && <td className="border border-gray-300 p-2 text-center">{row.newDlk}</td>}
                    {visibleColumns.calls && <td className="border border-gray-300 p-2 text-center">{row.callsMonth}</td>}
                    {visibleColumns.adSpend && <td className="border border-gray-300 p-2 text-right">{row.adSpend > 0 ? formatCurrency(row.adSpend) : '0'}</td>}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={30} className="text-center p-8 text-gray-500 italic">Không tìm thấy dữ liệu phù hợp</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedImage && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
            <div className="relative max-w-4xl max-h-[90vh]">
              <img src={selectedImage} alt="Proof of work" className="max-w-full max-h-[85vh] rounded shadow-lg" />
              <button onClick={() => setSelectedImage(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300">
                <X size={32} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};