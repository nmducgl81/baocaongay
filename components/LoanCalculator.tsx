import React, { useState, useRef } from 'react';
import { User } from '../types';
import { Calculator, Printer, X, Phone, User as UserIcon, Calendar, Percent, DollarSign, Settings, Info } from 'lucide-react';

interface LoanCalculatorProps {
  currentUser: User;
  onClose: () => void;
}

export const LoanCalculator: React.FC<LoanCalculatorProps> = ({ currentUser, onClose }) => {
  const [amount, setAmount] = useState<number>(50000000);
  const [term, setTerm] = useState<number>(24); // months
  const [rate, setRate] = useState<number>(35); // % per year
  const [calculationType, setCalculationType] = useState<'flat' | 'reducing'>('reducing'); 

  const printRef = useRef<HTMLDivElement>(null);

  // Format currency with dots (VN style: 10.000.000)
  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(val));
  };

  const formatCurrency = (val: number) => {
    return `${formatNumber(val)} ₫`;
  };

  // Calculate Logic
  const monthlyRate = rate / 100 / 12;
  let monthlyPayment = 0;
  let totalInterest = 0;
  let totalPayment = 0;

  if (calculationType === 'flat') {
    // Flat Rate
    const totalInt = amount * (rate / 100) * (term / 12);
    totalInterest = totalInt;
    totalPayment = amount + totalInterest;
    monthlyPayment = totalPayment / term;
  } else {
    // Reducing Balance
    if (monthlyRate > 0) {
        monthlyPayment = (amount * monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
        totalPayment = monthlyPayment * term;
        totalInterest = totalPayment - amount;
    } else {
        monthlyPayment = amount / term;
    }
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl border-t-4 border-emerald-600 p-4 md:p-8 max-w-6xl mx-auto mt-4 md:mt-8 animate-in fade-in slide-in-from-bottom-4">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-emerald-100">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600 shadow-sm border border-emerald-100">
            <Calculator size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-gray-800">Tính Lãi Suất Tham Khảo</h2>
            <p className="text-sm text-gray-500 font-medium">Công cụ hỗ trợ tư vấn tài chính</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><X size={28}/></button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: INPUT FORM (Hidden when printing) */}
        <div className="lg:col-span-5 space-y-6 print:hidden">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-5 flex items-center text-lg border-b border-gray-100 pb-2">
                <Settings size={20} className="mr-2 text-emerald-600"/> Thông số khoản vay
            </h3>
            
            <div className="space-y-5">
               {/* Amount Input */}
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Số tiền vay (VNĐ)</label>
                  <div className="relative group">
                     <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 bg-gray-100 p-1 rounded-md">
                        <DollarSign size={16} />
                     </div>
                     {/* FIX: Force bg-white and text-gray-900 for high contrast */}
                     <input 
                       type="text" 
                       value={formatNumber(amount)}
                       onChange={(e) => {
                           const val = parseInt(e.target.value.replace(/\./g, '')) || 0;
                           setAmount(val);
                       }}
                       className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-bold text-gray-900 text-lg shadow-sm transition-all"
                       placeholder="Ví dụ: 50.000.000"
                     />
                  </div>
                  {/* Quick Select Buttons */}
                  <div className="flex justify-start gap-2 mt-2">
                      <button className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors" onClick={() => setAmount(10000000)}>10 Triệu</button>
                      <button className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors" onClick={() => setAmount(50000000)}>50 Triệu</button>
                      <button className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors" onClick={() => setAmount(100000000)}>100 Triệu</button>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-5">
                  {/* Term Input */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Thời hạn (Tháng)</label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                            <Calendar size={18} />
                        </div>
                        <input 
                        type="number" 
                        value={term}
                        onChange={e => setTerm(Number(e.target.value))}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-bold text-gray-900 shadow-sm"
                        />
                    </div>
                  </div>
                  
                  {/* Rate Input */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Lãi suất (%/năm)</label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                            <Percent size={18} />
                        </div>
                        <input 
                        type="number" 
                        value={rate}
                        onChange={e => setRate(Number(e.target.value))}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-bold text-gray-900 shadow-sm"
                        />
                    </div>
                  </div>
               </div>

               {/* Calculation Method */}
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Phương thức tính lãi</label>
                  <div className="grid grid-cols-2 gap-3 p-1.5 bg-gray-100 rounded-xl border border-gray-200">
                     <button 
                        onClick={() => setCalculationType('reducing')}
                        className={`py-2.5 rounded-lg text-sm font-bold transition-all ${calculationType === 'reducing' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'}`}
                     >
                        Dư nợ giảm dần
                     </button>
                     <button 
                        onClick={() => setCalculationType('flat')}
                        className={`py-2.5 rounded-lg text-sm font-bold transition-all ${calculationType === 'flat' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'}`}
                     >
                        Lãi suất phẳng
                     </button>
                  </div>
               </div>
            </div>
          </div>

          <button 
            onClick={handlePrint}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg font-bold text-lg flex items-center justify-center transition-all transform hover:-translate-y-1 active:scale-95"
          >
             <Printer className="mr-2" /> In / Xuất Ảnh PDF
          </button>
          
          <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs flex items-start border border-blue-100">
             <Info size={16} className="mr-2 flex-shrink-0 mt-0.5 text-blue-500"/>
             <p>Mẹo: Để gửi cho khách hàng, hãy nhấn nút <b>"In / Xuất Ảnh"</b> và chọn <b>"Lưu dưới dạng PDF"</b> trên điện thoại.</p>
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW CARD (This part will be printed) */}
        <div className="lg:col-span-7 flex justify-center">
            <div 
                ref={printRef} 
                className="w-full max-w-[500px] bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-200 relative print:border-none print:shadow-none print:w-full print:max-w-none print:rounded-none"
                id="printable-area"
            >
                {/* Decoration Header - Improved Gradient & Contrast */}
                <div className="h-44 bg-gradient-to-br from-emerald-600 to-teal-700 relative flex flex-col justify-center items-center text-white p-6">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                    
                    <div className="bg-white/20 p-3 rounded-full mb-3 backdrop-blur-md shadow-lg border border-white/10">
                        <DollarSign size={40} className="text-white drop-shadow-md" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-wider uppercase text-center drop-shadow-sm">Bảng Tính Khoản Vay</h2>
                    <p className="text-xs md:text-sm text-emerald-100 opacity-90 uppercase tracking-widest mt-2 font-medium">Kế hoạch tài chính</p>
                </div>

                <div className="p-6 md:p-8">
                    {/* Key Figures - Highlight */}
                    <div className="text-center mb-8">
                        <p className="text-xs md:text-sm text-gray-500 font-bold uppercase tracking-wide mb-2">Số tiền trả hàng tháng (Ước tính)</p>
                        <div className="text-4xl md:text-5xl font-extrabold text-emerald-600 tracking-tight flex justify-center items-start">
                           {formatNumber(monthlyPayment)} <span className="text-xl md:text-2xl text-emerald-500 mt-1 ml-1">₫</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 font-medium bg-gray-50 inline-block px-3 py-1 rounded-full">Đã bao gồm gốc + lãi</p>
                    </div>

                    {/* Details Table - Added Monthly Payment Row */}
                    <div className="bg-gray-50 rounded-xl p-5 space-y-4 border border-gray-100 mb-8 text-sm md:text-base">
                        <div className="flex justify-between items-center border-b border-gray-200 border-dashed pb-3">
                            <span className="text-gray-600 font-medium">Số tiền vay:</span>
                            <span className="font-bold text-gray-900 text-lg">{formatCurrency(amount)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-200 border-dashed pb-3">
                            <span className="text-gray-600 font-medium">Thời hạn vay:</span>
                            <span className="font-bold text-gray-900">{term} tháng</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-200 border-dashed pb-3">
                            <span className="text-gray-600 font-medium">Lãi suất áp dụng:</span>
                            <span className="font-bold text-gray-900">{rate}% / năm ({calculationType === 'flat' ? 'Phẳng' : 'Giảm dần'})</span>
                        </div>
                        
                        {/* NEW ROW: Monthly Payment in Details */}
                        <div className="flex justify-between items-center border-b border-gray-200 border-dashed pb-3 bg-emerald-50/50 -mx-5 px-5 py-2">
                            <span className="text-emerald-800 font-bold">Trả mỗi tháng:</span>
                            <span className="font-bold text-emerald-700 text-lg">{formatCurrency(monthlyPayment)}</span>
                        </div>

                        <div className="flex justify-between items-center pt-1">
                            <span className="text-gray-600 font-medium">Tổng lãi dự kiến:</span>
                            <span className="font-bold text-orange-600">{formatCurrency(totalInterest)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 font-extrabold text-gray-800 text-lg border-t border-gray-300 mt-2">
                            <span>Tổng thanh toán:</span>
                            <span>{formatCurrency(totalPayment)}</span>
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="text-[10px] text-justify text-gray-500 italic mb-8 leading-relaxed bg-white border border-gray-200 p-3 rounded-lg">
                        <strong>Lưu ý:</strong> Bảng tính chỉ mang tính chất tham khảo. Số tiền thực tế có thể thay đổi tùy theo ngày giải ngân, bảo hiểm khoản vay (nếu có) và chính sách cụ thể của ngân hàng tại thời điểm ký hợp đồng.
                    </div>

                    {/* DSA Signature Footer */}
                    <div className="border-t-2 border-dashed border-gray-200 pt-6 mt-auto">
                        <div className="flex items-center space-x-4">
                            {currentUser.avatar ? (
                                <img src={currentUser.avatar} alt="Avatar" className="w-12 h-12 rounded-full object-cover border border-emerald-200 shadow-sm bg-white" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                                    <UserIcon size={24} />
                                </div>
                            )}
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Chuyên viên tư vấn</p>
                                <h4 className="font-bold text-gray-900 text-base">{currentUser.name}</h4>
                                {currentUser.phoneNumber && (
                                    <div className="flex flex-col text-xs mt-1.5 space-y-1">
                                        <div className="flex items-center text-gray-600">
                                            <Phone size={12} className="mr-1.5 text-emerald-600"/> 
                                            <span className="font-medium font-mono">{currentUser.phoneNumber}</span>
                                        </div>
                                        <a 
                                            href={`https://zalo.me/${currentUser.phoneNumber}`} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="text-blue-600 font-bold hover:text-blue-800 flex items-center bg-blue-50 px-2 py-1 rounded w-fit print:no-underline"
                                        >
                                            <span className="w-3.5 h-3.5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[8px] mr-1.5 font-sans font-bold">Z</span>
                                            Liên hệ Zalo
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
      
      {/* CSS for Printing */}
      <style>{`
        @media print {
            body * {
                visibility: hidden;
            }
            #printable-area, #printable-area * {
                visibility: visible;
            }
            #printable-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 0;
                box-shadow: none;
                border: none;
            }
            @page {
                size: auto;
                margin: 0mm;
            }
        }
      `}</style>
    </div>
  );
};