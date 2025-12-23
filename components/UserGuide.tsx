import React from 'react';
import { User } from '../types';
import { X, HelpCircle, TrendingUp, CheckCircle, AlertTriangle, User as UserIcon, BarChart2, MousePointerClick, ShieldCheck, Camera } from 'lucide-react';

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
                Dành cho: <span className="font-bold uppercase bg-white/20 px-2 py-0.5 rounded">{currentUser.role}</span>
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
                    Quy Trình & Logic Hệ Thống
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2 leading-relaxed">
                    {!isManager ? (
                        // DSA Content
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Đây là công cụ để bạn cập nhật kết quả làm việc hàng ngày (Daily Sales Report).</li>
                            <li>Hệ thống hoạt động theo thời gian thực (Real-time). Dữ liệu bạn nhập sẽ được DSS/SM thấy ngay lập tức.</li>
                            <li>Nếu bạn quên báo cáo, hệ thống sẽ hiển thị cảnh báo và đánh dấu trạng thái là <span className="text-red-500 font-bold">"Chưa báo cáo"</span>.</li>
                            <li>Dữ liệu cũ nếu chỉnh sửa sẽ chuyển sang trạng thái <b>"Chờ duyệt" (Pending)</b> để quản lý kiểm tra lại.</li>
                        </ul>
                    ) : (
                        // Manager Content
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Dashboard giúp bạn theo dõi tiến độ của toàn bộ nhân sự cấp dưới (Trực tiếp & Gián tiếp).</li>
                            <li>Bạn có thể lọc dữ liệu theo Ngày, Khu vực (SM), hoặc Team (DSS) để phân tích sâu hơn.</li>
                            <li>Hệ thống tự động phát hiện nhân viên chưa báo cáo trong ngày để bạn nhắc nhở.</li>
                            <li>Bạn có quyền <b>Duyệt (Approve)</b> hoặc <b>Từ chối (Reject)</b> các chỉnh sửa dữ liệu của nhân viên.</li>
                        </ul>
                    )}
                </div>
            </section>

            {/* 2. Key Metrics Definitions */}
            <section>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center border-b pb-2 border-gray-100 dark:border-gray-700">
                    <TrendingUp className="mr-2 text-blue-600" size={20}/> 
                    Giải Thích Chỉ Số (Metrics)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-1">Volume (Doanh số)</span>
                        Là tổng số tiền giải ngân thực tế (bao gồm cả Direct Loan và FEOL Loan). Đây là chỉ số chính để xếp hạng.
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
                        <span className="font-bold text-blue-700 dark:text-blue-400 block mb-1">ProApp (Năng suất)</span>
                        Công thức: <code>(Tổng App / Số ngày đã qua) / Nhân sự</code>. <br/>
                        Chỉ số này đo lường tốc độ ra hồ sơ trung bình mỗi ngày của một nhân viên.
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
                        <span className="font-bold text-teal-700 dark:text-teal-400 block mb-1">Case Size (HĐ Bình quân)</span>
                        Công thức: <code>Tổng Volume / Tổng Loan</code>. <br/>
                        Cho biết giá trị trung bình của một hợp đồng giải ngân thành công.
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
                        <span className="font-bold text-purple-700 dark:text-purple-400 block mb-1">% Banca</span>
                        Tỷ lệ doanh số bảo hiểm trên tổng doanh số giải ngân.
                    </div>
                </div>
            </section>

            {/* 3. Statuses & Colors */}
            <section>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center border-b pb-2 border-gray-100 dark:border-gray-700">
                    <ShieldCheck className="mr-2 text-orange-600" size={20}/> 
                    Trạng Thái & Màu Sắc
                </h3>
                <div className="space-y-3 text-sm">
                    <div className="flex items-center">
                        <div className="w-24 flex-shrink-0">
                             <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold flex items-center w-fit">
                                <CheckCircle size={12} className="mr-1"/> Đã báo cáo
                             </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">Dữ liệu đã được ghi nhận thành công và tính vào KPI.</p>
                    </div>
                    <div className="flex items-center">
                        <div className="w-24 flex-shrink-0">
                             <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold flex items-center w-fit">
                                <AlertTriangle size={12} className="mr-1"/> Chưa báo cáo
                             </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">Hệ thống phát hiện thiếu báo cáo ngày hôm nay hoặc các ngày trong quá khứ.</p>
                    </div>
                    <div className="flex items-center">
                        <div className="w-24 flex-shrink-0">
                             <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold flex items-center w-fit">
                                <div className="w-3 h-3 border-2 border-orange-500 rounded-full mr-1 animate-spin border-t-transparent"></div> Chờ duyệt
                             </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">Bản ghi đã chỉnh sửa, đang đợi Quản lý (DSS/SM) phê duyệt mới được tính.</p>
                    </div>
                </div>
            </section>

            {/* 4. Tips & Features */}
            <section>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center border-b pb-2 border-gray-100 dark:border-gray-700">
                    <UserIcon className="mr-2 text-purple-600" size={20}/> 
                    Mẹo & Tính Năng Cá Nhân
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                     <li className="flex items-start">
                        <Camera className="text-emerald-500 mr-2 flex-shrink-0 mt-0.5" size={18} />
                        <div>
                            <span className="font-bold text-gray-800 dark:text-gray-200">Cập nhật Avatar:</span>
                            <p className="text-gray-500">Bấm vào tên bạn ở góc trên bên phải, chọn biểu tượng Camera để tải ảnh đại diện lên. Avatar giúp nhận diện dễ hơn trong bảng xếp hạng.</p>
                        </div>
                     </li>
                     <li className="flex items-start">
                        <BarChart2 className="text-emerald-500 mr-2 flex-shrink-0 mt-0.5" size={18} />
                        <div>
                            <span className="font-bold text-gray-800 dark:text-gray-200">Biểu đồ & Xếp hạng:</span>
                            <p className="text-gray-500">Bấm vào nút "Biểu đồ & Rank" trên menu (hoặc Sidebar mobile) để xem vị trí của bạn so với đồng nghiệp.</p>
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