import React from 'react';
import { User } from '../types';
import { X, HelpCircle, CheckCircle, AlertTriangle, User as UserIcon, Camera, MousePointerClick, ShieldCheck, Layers, Zap, Filter, Eye } from 'lucide-react';

interface UserGuideProps {
  currentUser: User;
  onClose: () => void;
}

export const UserGuide: React.FC<UserGuideProps> = ({ currentUser, onClose }) => {
  const isManager = ['DSS', 'SM', 'RSM', 'ADMIN'].includes(currentUser.role);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 flex justify-between items-start text-white">
          <div>
             <h2 className="text-xl md:text-2xl font-bold flex items-center">
                <HelpCircle className="mr-3" size={28}/> Hướng Dẫn Sử Dụng
             </h2>
             <p className="text-emerald-100 mt-1 text-sm">
                Vai trò hiện tại: <span className="font-bold uppercase bg-white/20 px-2 py-0.5 rounded">{currentUser.role}</span>
             </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={24}/></button>
        </div>

        {/* Content Scrollable */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
            
            {/* 1. Dashboard Logic Overview */}
            <section>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center border-b pb-2 border-gray-100 dark:border-gray-700">
                    <MousePointerClick className="mr-2 text-emerald-600" size={20}/> 
                    Quy Trình Báo Cáo Hàng Ngày
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2 leading-relaxed">
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Nguyên tắc:</strong> Hệ thống hoạt động Real-time (Thời gian thực). Số liệu nhập vào sẽ hiển thị ngay lập tức trên máy của Quản lý.</li>
                        <li><strong>Deadline:</strong> Cần hoàn thành báo cáo trước giờ chốt số hàng ngày (VD: 17:30).</li>
                        <li><strong>Chỉnh sửa:</strong> DSA có thể sửa lại báo cáo trong ngày. Nếu sửa dữ liệu các ngày cũ, trạng thái sẽ chuyển thành <span className="text-orange-500 font-bold">"Chờ duyệt" (Pending)</span> và cần Quản lý xác nhận.</li>
                    </ul>
                </div>
            </section>

            {/* 2. Hierarchy Viewing Guide (NEW) */}
            <section>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center border-b pb-2 border-gray-100 dark:border-gray-700">
                    <Layers className="mr-2 text-blue-600" size={20}/> 
                    Phân Quyền & Cách Xem Số Liệu
                </h3>
                <div className="space-y-4 text-sm">
                    {/* DSA VIEW */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center"><UserIcon size={16} className="mr-2"/> Đối với DSA (Sales)</div>
                        <p className="text-gray-600 dark:text-gray-300 mb-2">Bạn chỉ nhìn thấy dữ liệu cá nhân của mình.</p>
                        <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300">
                            <li><strong>Nhiệm vụ:</strong> Nhấn nút <span className="font-bold text-emerald-600">"+ Báo Cáo"</span> để nhập số liệu.</li>
                            <li><strong>Theo dõi:</strong> Xem biểu đồ để biết mình có đạt chỉ tiêu (Target) tháng hay không.</li>
                            <li><strong>Lịch sử:</strong> Bấm vào tên mình trong bảng để xem lịch sử báo cáo chi tiết từng ngày.</li>
                        </ul>
                    </div>

                    {/* MANAGER VIEW */}
                    {isManager && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                             <div className="font-bold text-indigo-700 dark:text-indigo-400 mb-2 flex items-center"><Eye size={16} className="mr-2"/> Đối với Quản Lý (DSS / SM / RSM)</div>
                             <p className="text-gray-600 dark:text-gray-300 mb-2">Bạn có quyền xem tổng quan và chi tiết (Drill-down) theo cấu trúc cây:</p>
                             <div className="space-y-2">
                                <div className="flex items-start">
                                    <span className="font-bold min-w-[60px] text-gray-700 dark:text-gray-200">DSS:</span>
                                    <span className="text-gray-600 dark:text-gray-400">Xem được toàn bộ DSA trong Team mình. Có thể lọc xem ai chưa báo cáo.</span>
                                </div>
                                <div className="flex items-start">
                                    <span className="font-bold min-w-[60px] text-gray-700 dark:text-gray-200">SM:</span>
                                    <span className="text-gray-600 dark:text-gray-400">Xem tổng quan các Team (DSS) trong Khu vực. Bấm vào tên Team để xem chi tiết từng DSA trong Team đó.</span>
                                </div>
                                <div className="flex items-start">
                                    <span className="font-bold min-w-[60px] text-gray-700 dark:text-gray-200">RSM:</span>
                                    <span className="text-gray-600 dark:text-gray-400">Xem tổng quan các Khu vực (SM). Bấm vào SM -> ra DSS -> ra DSA (Mô hình 3 cấp).</span>
                                </div>
                             </div>
                             <div className="mt-3 pt-2 border-t border-indigo-200 dark:border-indigo-800 text-xs text-indigo-800 dark:text-indigo-300 font-medium italic">
                                * Mẹo: Sử dụng thanh lọc (Filter Bar) ở trên cùng để chuyển nhanh giữa các Team/Khu vực hoặc lọc trạng thái "Chưa báo cáo".
                             </div>
                        </div>
                    )}
                </div>
            </section>

            {/* 3. Manager Actions (NEW - Only for Managers) */}
            {isManager && (
                <section>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center border-b pb-2 border-gray-100 dark:border-gray-700">
                        <Zap className="mr-2 text-yellow-500" size={20}/> 
                        Gợi Ý Tác Động & Thúc Đẩy Số
                    </h3>
                    <div className="grid grid-cols-1 gap-3 text-sm">
                        <div className="border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10 p-3 rounded-r-lg">
                            <span className="font-bold text-red-700 dark:text-red-400 block mb-1">1. Nhân sự thiếu báo cáo</span>
                            <p className="text-gray-600 dark:text-gray-300">
                                -> Chọn lọc trạng thái <b>"Chưa báo cáo"</b> trên thanh công cụ.<br/>
                                -> Chụp màn hình danh sách này gửi vào nhóm Zalo chung để nhắc nhở ngay lập tức.
                            </p>
                        </div>
                        <div className="border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/10 p-3 rounded-r-lg">
                            <span className="font-bold text-orange-700 dark:text-orange-400 block mb-1">2. Doanh số thấp (Low Volume)</span>
                            <p className="text-gray-600 dark:text-gray-300">
                                -> Chuyển biểu đồ sang tab <b>"Hoạt động"</b>.<br/>
                                -> Kiểm tra: Nếu <i>Cuộc gọi/Tờ rơi</i> thấp => Yêu cầu tăng cường đi thị trường/gọi data.<br/>
                                -> Kiểm tra: Nếu <i>Hoạt động cao</i> mà không có số => Cần training lại kỹ năng tư vấn (Skill issue).
                            </p>
                        </div>
                        <div className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-r-lg">
                            <span className="font-bold text-blue-700 dark:text-blue-400 block mb-1">3. Tỷ lệ duyệt thấp (App nhiều - Loan ít)</span>
                            <p className="text-gray-600 dark:text-gray-300">
                                -> Kiểm tra cột <b>"Loan vs App"</b> trong bảng chi tiết.<br/>
                                -> Nếu tỷ lệ rớt hồ sơ {'>'} 50% => Cần xem lại chất lượng khách hàng hoặc cách thẩm định sơ bộ (Pre-check) của nhân viên.
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {/* 4. Statuses & Colors */}
            <section>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center border-b pb-2 border-gray-100 dark:border-gray-700">
                    <ShieldCheck className="mr-2 text-emerald-600" size={20}/> 
                    Trạng Thái Hồ Sơ
                </h3>
                <div className="space-y-3 text-sm">
                    <div className="flex items-center">
                        <div className="w-28 flex-shrink-0">
                             <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold flex items-center w-fit">
                                <CheckCircle size={12} className="mr-1"/> Đã báo cáo
                             </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">Dữ liệu an toàn, đã được tính KPI.</p>
                    </div>
                    <div className="flex items-center">
                        <div className="w-28 flex-shrink-0">
                             <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold flex items-center w-fit">
                                <AlertTriangle size={12} className="mr-1"/> Chưa báo cáo
                             </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">Thiếu dữ liệu. Cần nhập bổ sung ngay.</p>
                    </div>
                    <div className="flex items-center">
                        <div className="w-28 flex-shrink-0">
                             <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold flex items-center w-fit">
                                <div className="w-3 h-3 border-2 border-orange-500 rounded-full mr-1 animate-spin border-t-transparent"></div> Chờ duyệt
                             </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">Dữ liệu chỉnh sửa đang đợi cấp trên xác nhận.</p>
                    </div>
                </div>
            </section>

            {/* 5. Tips & Features */}
            <section>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center border-b pb-2 border-gray-100 dark:border-gray-700">
                    <UserIcon className="mr-2 text-purple-600" size={20}/> 
                    Tiện Ích Khác
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                     <li className="flex items-start">
                        <Camera className="text-emerald-500 mr-2 flex-shrink-0 mt-0.5" size={18} />
                        <div>
                            <span className="font-bold text-gray-800 dark:text-gray-200">Đổi Avatar:</span>
                            <p className="text-gray-500">Bấm vào tên bạn -> Chọn biểu tượng Camera. Avatar đẹp giúp bạn nổi bật trên bảng xếp hạng thi đua.</p>
                        </div>
                     </li>
                     <li className="flex items-start">
                        <Filter className="text-emerald-500 mr-2 flex-shrink-0 mt-0.5" size={18} />
                        <div>
                            <span className="font-bold text-gray-800 dark:text-gray-200">Tìm kiếm nhanh:</span>
                            <p className="text-gray-500">Sử dụng ô tìm kiếm để tra cứu nhanh tên một nhân sự hoặc mã code trong hệ thống.</p>
                        </div>
                     </li>
                </ul>
            </section>

        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700 text-center">
            <button 
                onClick={onClose}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-lg font-bold shadow-md transition-transform active:scale-95"
            >
                Đã Hiểu
            </button>
        </div>

      </div>
    </div>
  );
};