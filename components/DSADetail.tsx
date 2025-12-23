import React, { useState } from 'react';
import { SalesRecord } from '../types';
import { ArrowLeft, TrendingUp, Phone, Users, CheckCircle, Info, X, BarChart2, PieChart } from 'lucide-react';

interface DSADetailProps {
  dsaCode: string;
  data: SalesRecord[];
  onBack: () => void;
}

export const DSADetail: React.FC<DSADetailProps> = ({ dsaCode, data, onBack }) => {
  const [showKpiInfo, setShowKpiInfo] = useState(false);
  
  // FILTER: Only show records that are 'Đã báo cáo'
  const dsaRecords = data
    .filter(r => r.dsaCode === dsaCode && r.status === 'Đã báo cáo')
    .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
    
  const latest = data.find(r => r.dsaCode === dsaCode) || dsaRecords[0];

  if (!latest) return <div>Không tìm thấy dữ liệu</div>;

  // Masking helper
  const maskCode = (code: string) => {
    if (!code) return '';
    if (code.length <= 5) return '***';
    return `${code.substring(0, 2)}***${code.substring(code.length - 3)}`;
  };

  const totalVolume = dsaRecords.reduce((sum, r) => sum + r.directVolume, 0);
  const totalApps = dsaRecords.reduce((sum, r) => sum + r.directApp, 0);
  const totalLoans = dsaRecords.reduce((sum, r) => sum + r.directLoan, 0);
  const totalCalls = dsaRecords.reduce((sum, r) => sum + r.callsMonth, 0);

  // --- NEW METRICS CALCULATIONS ---
  // 1. ProApp: Total App / Current Day of Month (Progress)
  // We use the day from the latest report date to represent "Current Progress Day"
  const currentDayProgress = parseInt(latest.reportDate.split('-')[2]) || 1;
  const proApp = (totalApps / currentDayProgress).toFixed(2);

  // 2. Case Size: Total Volume / Total Loan
  const caseSize = totalLoans > 0 ? totalVolume / totalLoans : 0;

  // KPI Calculation Formula
  const TARGET_VOLUME = 100000000; // 100M
  const TARGET_APPS = 10;
  const TARGET_CALLS = 100;

  // Calculate components capped at their weight (bonus points logic can be added later, here max is capped)
  const volScore = Math.min(40, (totalVolume / TARGET_VOLUME) * 40);
  const appScore = Math.min(30, (totalApps / TARGET_APPS) * 30);
  const callScore = Math.min(30, (totalCalls / TARGET_CALLS) * 30);
  
  const kpiScore = (volScore + appScore + callScore).toFixed(1);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-emerald-700 p-6 text-white flex items-center">
        <button onClick={onBack} className="mr-4 p-2 hover:bg-emerald-600 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold">{latest.name}</h2>
          <p className="text-emerald-100 opacity-90 text-sm">{maskCode(latest.dsaCode)} | {latest.dss} | {latest.smName}</p>
        </div>
        <div className="ml-auto text-right relative">
          <div className="text-xs uppercase opacity-70 mb-1 flex items-center justify-end gap-1">
             Điểm KPI Tháng 
             <button 
               onClick={() => setShowKpiInfo(!showKpiInfo)} 
               className="hover:bg-emerald-600 p-1 rounded-full transition-colors"
               title="Xem chi tiết cách tính"
             >
                <Info size={14} />
             </button>
          </div>
          <div className="text-3xl font-black">{kpiScore}</div>

          {/* KPI Breakdown Popover */}
          {showKpiInfo && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white text-gray-800 rounded-lg shadow-xl p-4 z-50 text-left border border-gray-200 animate-in fade-in zoom-in duration-200">
               <div className="flex justify-between items-center mb-3 border-b pb-2">
                  <h4 className="font-bold text-sm text-emerald-800">Chi tiết KPI (Mục tiêu tháng)</h4>
                  <button onClick={() => setShowKpiInfo(false)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
               </div>
               <div className="space-y-3 text-sm">
                  <div>
                     <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">Doanh số (40%)</span>
                        <span className="font-bold text-emerald-600">{volScore.toFixed(1)}/40</span>
                     </div>
                     <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{width: `${(volScore/40)*100}%`}}></div>
                     </div>
                     <div className="text-xs text-gray-500">
                        Đạt: {new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(totalVolume)} / {new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(TARGET_VOLUME)}
                     </div>
                  </div>
                  
                  <div>
                     <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">Hồ sơ (30%)</span>
                        <span className="font-bold text-blue-600">{appScore.toFixed(1)}/30</span>
                     </div>
                     <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{width: `${(appScore/30)*100}%`}}></div>
                     </div>
                     <div className="text-xs text-gray-500">
                        Đạt: {totalApps} / {TARGET_APPS} Apps
                     </div>
                  </div>

                  <div>
                     <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">Hoạt động (30%)</span>
                        <span className="font-bold text-orange-600">{callScore.toFixed(1)}/30</span>
                     </div>
                     <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                         <div className="bg-orange-500 h-1.5 rounded-full" style={{width: `${(callScore/30)*100}%`}}></div>
                     </div>
                     <div className="text-xs text-gray-500">
                        Đạt: {totalCalls} / {TARGET_CALLS} Calls
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* KPI Cards Grid - Updated to 3 columns for better fit of 6 items */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
           {/* Card 1: Volume */}
           <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="flex items-center text-blue-700 mb-2">
                 <TrendingUp size={18} className="mr-2" />
                 <span className="font-bold text-xs md:text-sm">Tổng Doanh Số</span>
              </div>
              <div className="text-lg md:text-xl font-bold text-gray-800">
                {new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(totalVolume)} ₫
              </div>
           </div>

           {/* Card 2: ProApp (NEW) */}
           <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
              <div className="flex items-center text-indigo-700 mb-2">
                 <BarChart2 size={18} className="mr-2" />
                 <span className="font-bold text-xs md:text-sm">ProApp (App/Ngày)</span>
              </div>
              <div className="text-lg md:text-xl font-bold text-gray-800">
                {proApp} <span className="text-xs text-gray-500 font-normal">/ ngày</span>
              </div>
           </div>

           {/* Card 3: Apps */}
           <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
              <div className="flex items-center text-purple-700 mb-2">
                 <Users size={18} className="mr-2" />
                 <span className="font-bold text-xs md:text-sm">Tổng Hồ Sơ (Apps)</span>
              </div>
              <div className="text-lg md:text-xl font-bold text-gray-800">{totalApps}</div>
           </div>

           {/* Card 4: Case Size (NEW) */}
           <div className="bg-teal-50 p-4 rounded-lg border border-teal-100">
              <div className="flex items-center text-teal-700 mb-2">
                 <PieChart size={18} className="mr-2" />
                 <span className="font-bold text-xs md:text-sm">Case Size (TB/HĐ)</span>
              </div>
              <div className="text-lg md:text-xl font-bold text-gray-800">
                {new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(caseSize)}
              </div>
           </div>

           {/* Card 5: Approval Rate */}
           <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
              <div className="flex items-center text-orange-700 mb-2">
                 <CheckCircle size={18} className="mr-2" />
                 <span className="font-bold text-xs md:text-sm">Tỷ lệ duyệt (L/A)</span>
              </div>
              <div className="text-lg md:text-xl font-bold text-gray-800">
                {totalApps > 0 ? ((totalLoans / totalApps) * 100).toFixed(1) : 0}%
              </div>
           </div>

           {/* Card 6: Calls */}
           <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <div className="flex items-center text-green-700 mb-2">
                 <Phone size={18} className="mr-2" />
                 <span className="font-bold text-xs md:text-sm">Tổng Cuộc Gọi</span>
              </div>
              <div className="text-lg md:text-xl font-bold text-gray-800">{totalCalls}</div>
           </div>
        </div>

        {/* History Table */}
        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Lịch sử báo cáo chi tiết</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left text-gray-600">
             <thead className="bg-gray-50 text-gray-700 font-semibold uppercase">
                <tr>
                   <th className="px-4 py-3">Ngày</th>
                   <th className="px-4 py-3 text-center bg-emerald-50 text-emerald-800">Volume</th>
                   <th className="px-4 py-3 text-center bg-emerald-50 text-emerald-800">Banca</th>
                   <th className="px-4 py-3 text-center bg-blue-50 text-blue-800">App/Loan</th>
                   <th className="px-4 py-3 text-center bg-red-50 text-red-800">App/Loan CRC</th>
                   <th className="px-4 py-3 text-center bg-purple-50 text-purple-800">App/Loan FEOL</th>
                   <th className="px-4 py-3 text-center">Tờ rơi</th>
                   <th className="px-4 py-3 text-center">Cuộc gọi</th>
                   <th className="px-4 py-3 text-center">Trạng thái</th>
                </tr>
             </thead>
             <tbody>
                {dsaRecords.length > 0 ? (
                    dsaRecords.map(r => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">{r.reportDate}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-700 bg-emerald-50/30">
                            {new Intl.NumberFormat('vi-VN').format(r.directVolume)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600 bg-emerald-50/30">
                            {new Intl.NumberFormat('vi-VN').format(r.directBanca)}
                        </td>
                        <td className="px-4 py-3 text-center bg-blue-50/30">{r.directApp} / {r.directLoan}</td>
                        <td className="px-4 py-3 text-center bg-red-50/30">{r.directAppCRC || 0} / {r.directLoanCRC || 0}</td>
                        <td className="px-4 py-3 text-center bg-purple-50/30">{r.directAppFEOL || 0} / {r.directLoanFEOL || 0}</td>
                        <td className="px-4 py-3 text-center">{r.flyers}</td>
                        <td className="px-4 py-3 text-center">{r.callsMonth}</td>
                        <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${r.status === 'Đã báo cáo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {r.status === 'Đã báo cáo' ? 'Y' : 'N'}
                            </span>
                        </td>
                    </tr>
                    ))
                ) : (
                    <tr><td colSpan={9} className="text-center p-4 italic text-gray-400">Chưa có dữ liệu báo cáo</td></tr>
                )}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};