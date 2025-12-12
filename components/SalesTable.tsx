import React, { useState } from 'react';
import { SalesRecord, User } from '../types';
import { Image as ImageIcon, X, Pencil, Check, Ban, AlertCircle, Search } from 'lucide-react';

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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  const showDSS = !['DSA', 'DSS'].includes(currentUser.role);
  const showSM = !['DSA', 'DSS', 'SM'].includes(currentUser.role);

  // Columns: TT, Code, Name, DSS(opt), SM(opt), Date, Status, Approval, Image, Actions
  const baseInfoCols = 6; 
  const infoColSpan = baseInfoCols + (showDSS ? 1 : 0) + (showSM ? 1 : 0) + 2; // + Approval + Actions

  const canEdit = (record: SalesRecord) => {
    if (currentUser.role === 'ADMIN') return true;
    if (currentUser.role === 'DSA' && record.dsaCode === currentUser.dsaCode) return true;
    // Managers can edit subordinates' records
    return true; 
  };

  const canApprove = (record: SalesRecord) => {
    // DSS, SM, RSM, ADMIN can approve
    if (currentUser.role === 'DSA') return false;
    // Should verify hierarchy in a real app, but simplified for now
    return record.approvalStatus === 'Pending';
  };

  const filteredRecords = data.filter(record => {
    const term = searchTerm.toLowerCase();
    return record.name.toLowerCase().includes(term) || 
           record.dsaCode.toLowerCase().includes(term);
  });

  return (
    <div className="flex flex-col space-y-4">
      {/* Search Bar */}
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center max-w-md">
        <Search size={20} className="text-gray-400 mr-2" />
        <input 
          type="text" 
          placeholder="Tìm kiếm theo Tên hoặc DSA Code..." 
          className="flex-1 border-none focus:ring-0 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="w-full overflow-hidden border border-gray-300 rounded-lg shadow-md bg-white">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-max border-collapse w-full text-sm">
            {/* --- HEADERS --- */}
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th colSpan={infoColSpan} className="border border-gray-300 p-2 bg-gray-50"></th>
                <th colSpan={16} className="border border-gray-300 p-3 text-center bg-emerald-100 font-bold text-lg text-emerald-900 uppercase tracking-wide">
                  KẾT QUẢ HOẠT ĐỘNG BÁN MTD
                </th>
              </tr>
              
              <tr>
                <th colSpan={infoColSpan} className="border border-gray-300 bg-emerald-600 text-white font-semibold">
                  THÔNG TIN NHÂN SỰ
                </th>
                
                <th colSpan={7} className="border border-gray-300 p-2 text-center bg-red-600 text-white font-semibold">
                  DOANH SỐ TRỰC TIẾP
                </th>
                
                <th colSpan={2} className="border border-gray-300 p-2 text-center bg-blue-600 text-white font-semibold">
                  DOANH SỐ ONLINE
                </th>
                
                <th colSpan={7} className="border border-gray-300 p-2 text-center bg-orange-600 text-white font-semibold">
                  HOẠT ĐỘNG BÁN MTD
                </th>
              </tr>

              <tr className="text-xs uppercase bg-emerald-500 text-white">
                <th className="border border-gray-300 p-2 sticky left-0 z-10 bg-emerald-700 min-w-[50px]">TT</th>
                <th className="border border-gray-300 p-2 sticky left-[50px] z-10 bg-emerald-700 min-w-[100px]">DSA Code</th>
                <th className="border border-gray-300 p-2 sticky left-[150px] z-10 bg-emerald-700 min-w-[180px] text-left">Họ và Tên</th>
                
                {showDSS && <th className="border border-gray-300 p-2 min-w-[120px]">DSS</th>}
                {showSM && <th className="border border-gray-300 p-2 min-w-[80px]">SM Name</th>}
                
                <th className="border border-gray-300 p-2 min-w-[100px]">Ngày báo cáo</th>
                <th className="border border-gray-300 p-2 min-w-[100px]">Trạng thái</th>
                <th className="border border-gray-300 p-2 min-w-[80px]">Duyệt</th>
                <th className="border border-gray-300 p-2 min-w-[60px]">Hình ảnh</th>
                <th className="border border-gray-300 p-2 min-w-[80px] bg-gray-600">Thao tác</th>

                <th className="border border-gray-300 p-2 bg-emerald-50 text-gray-800 min-w-[50px]">App</th>
                <th className="border border-gray-300 p-2 bg-emerald-50 text-gray-800 min-w-[50px]">Loan</th>
                <th className="border border-gray-300 p-2 bg-red-50 text-red-900 font-bold min-w-[50px]">App CRC</th>
                <th className="border border-gray-300 p-2 bg-red-50 text-red-900 font-bold min-w-[50px]">Loan CRC</th>
                <th className="border border-gray-300 p-2 bg-emerald-50 text-gray-800 min-w-[100px]">Volume</th>
                <th className="border border-gray-300 p-2 bg-emerald-50 text-gray-800 min-w-[100px]">Banca</th>
                <th className="border border-gray-300 p-2 bg-emerald-50 text-gray-800 min-w-[60px]">Rol</th>

                <th className="border border-gray-300 p-2 bg-blue-100 text-blue-900 min-w-[60px]">App</th>
                <th className="border border-gray-300 p-2 bg-blue-100 text-blue-900 min-w-[60px]">Volume</th>

                <th className="border border-gray-300 p-2 bg-orange-50 text-orange-900 min-w-[60px]">CTV</th>
                <th className="border border-gray-300 p-2 bg-orange-50 text-orange-900 min-w-[60px]">CTV Mới</th>
                <th className="border border-gray-300 p-2 bg-orange-50 text-orange-900 min-w-[80px]">Tờ rơi</th>
                <th className="border border-gray-300 p-2 bg-orange-50 text-orange-900 min-w-[60px]">ĐLK</th>
                <th className="border border-gray-300 p-2 bg-orange-50 text-orange-900 min-w-[60px]">ĐLK Mới</th>
                <th className="border border-gray-300 p-2 bg-orange-50 text-orange-900 min-w-[80px]">Cuộc gọi</th>
                <th className="border border-gray-300 p-2 bg-orange-50 text-orange-900 min-w-[100px]">Chi phí QC</th>
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

                    {showDSS && <td className="border border-gray-300 p-2 whitespace-nowrap">{row.dss}</td>}
                    {showSM && <td className="border border-gray-300 p-2 text-center">{row.smName}</td>}
                    
                    <td className="border border-gray-300 p-2 text-center text-xs">{row.reportDate}</td>
                    <td className={`border border-gray-300 p-2 text-center text-xs font-bold ${row.status === 'Đã báo cáo' ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                      {row.status}
                    </td>
                    
                    {/* Approval Status */}
                    <td className="border border-gray-300 p-2 text-center">
                      {row.approvalStatus === 'Approved' && <span className="inline-flex items-center text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><Check size={12} className="mr-1"/> Duyệt</span>}
                      {row.approvalStatus === 'Pending' && <span className="inline-flex items-center text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full"><AlertCircle size={12} className="mr-1"/> Chờ</span>}
                      {row.approvalStatus === 'Rejected' && <span className="inline-flex items-center text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full"><Ban size={12} className="mr-1"/> Từ chối</span>}
                    </td>

                    <td className="border border-gray-300 p-2 text-center">
                      {row.proofImage ? (
                        <button onClick={() => setSelectedImage(row.proofImage || null)} className="text-emerald-600 hover:text-emerald-800">
                          <ImageIcon size={20} className="mx-auto" />
                        </button>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>

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

                    <td className="border border-gray-300 p-2 text-center">{row.directApp}</td>
                    <td className="border border-gray-300 p-2 text-center text-red-600 font-medium">{row.directLoan}</td>
                    <td className="border border-gray-300 p-2 text-center bg-red-50 font-medium">{row.directAppCRC || 0}</td>
                    <td className="border border-gray-300 p-2 text-center bg-red-50 text-red-700 font-bold">{row.directLoanCRC || 0}</td>
                    <td className="border border-gray-300 p-2 text-right">{row.directVolume > 0 ? formatCurrency(row.directVolume) : '0'}</td>
                    <td className="border border-gray-300 p-2 text-right">{row.directBanca > 0 ? formatCurrency(row.directBanca) : '0'}</td>
                    <td className="border border-gray-300 p-2 text-center">{row.directRol}</td>
                    <td className="border border-gray-300 p-2 text-center">{row.onlineApp}</td>
                    <td className="border border-gray-300 p-2 text-center">{row.onlineVolume}</td>
                    <td className="border border-gray-300 p-2 text-center">{row.ctv}</td>
                    <td className="border border-gray-300 p-2 text-center">{row.newCtv}</td>
                    <td className="border border-gray-300 p-2 text-center">{formatCurrency(row.flyers)}</td>
                    <td className="border border-gray-300 p-2 text-center">{row.dlk}</td>
                    <td className="border border-gray-300 p-2 text-center">{row.newDlk}</td>
                    <td className="border border-gray-300 p-2 text-center">{row.callsMonth}</td>
                    <td className="border border-gray-300 p-2 text-right">{row.adSpend > 0 ? formatCurrency(row.adSpend) : '0'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={26} className="text-center p-8 text-gray-500 italic">Không tìm thấy dữ liệu phù hợp</td>
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