import React, { useState, useMemo } from 'react';
import { SalesRecord, User } from '../types';
import { ArrowLeft, TrendingUp, Phone, Users, CheckCircle, Info, X, BarChart2, PieChart, Pencil, Check, Calendar, RefreshCw } from 'lucide-react';

interface DSADetailProps {
  dsaCode: string;
  data: SalesRecord[];
  onBack: () => void;
  currentUser: User;
  onEdit: (record: SalesRecord) => void;
  onApprove: (record: SalesRecord, isApproved: boolean) => void;
  users: User[];
}

export const DSADetail: React.FC<DSADetailProps> = ({ dsaCode, data, onBack, currentUser, onEdit, onApprove, users }) => {
  const [showKpiInfo, setShowKpiInfo] = useState(false);
  
  // Date Filter State
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    // Default to first day of current month
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // --- FILTER LOGIC ---
  const filteredRecords = useMemo(() => {
      return data
        .filter(r => 
            r.dsaCode === dsaCode && 
            r.status === 'Đã báo cáo' &&
            r.reportDate >= startDate &&
            r.reportDate <= endDate
        )
        .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
  }, [data, dsaCode, startDate, endDate]);

  // Get latest record info (for name, hierarchy) from ANY valid record for this DSA, not just filtered ones
  const baseInfoRecord = data.find(r => r.dsaCode === dsaCode) || filteredRecords[0];

  if (!baseInfoRecord && filteredRecords.length === 0) return <div className="p-8 text-center">Không tìm thấy dữ liệu cho mã nhân viên này.</div>;

  // Masking helper
  const maskCode = (code: string) => {
    if (!code) return '';
    if (code.length <= 5) return '***';
    return `${code.substring(0, 2)}***${code.substring(code.length - 3)}`;
  };

  // --- HIERARCHY RESOLUTION LOGIC ---
  const dsaUser = users.find(u => u.dsaCode === dsaCode && u.role === 'DSA');
  
  let displayDSS = baseInfoRecord?.dss || '';
  let displaySM = baseInfoRecord?.smName || '';

  if (dsaUser && dsaUser.parentId) {
      const parent = users.find(u => u.id === dsaUser.parentId);
      if (parent) {
          if (parent.role === 'DSS') {
              displayDSS = parent.name;
              const sm = users.find(u => u.id === parent.parentId);
              if (sm) displaySM = sm.name;
          } else if (parent.role === 'SM') {
              displaySM = parent.name;
              displayDSS = parent.name; // Direct report to SM
          }
      }
  }

  // --- AGGREGATION (Based on Filtered Data) ---
  const subtotal = useMemo(() => {
      return filteredRecords.reduce((acc, r) => ({
          volume: acc.volume + r.directVolume,
          apps: acc.apps + r.directApp,
          loans: acc.loans + r.directLoan,
          banca: acc.banca + r.directBanca,
          appCRC: acc.appCRC + (r.directAppCRC || 0),
          loanCRC: acc.loanCRC + (r.directLoanCRC || 0),
          appFEOL: acc.appFEOL + (r.directAppFEOL || 0),
          loanFEOL: acc.loanFEOL + (r.directLoanFEOL || 0),
          flyers: acc.flyers + r.flyers,
          calls: acc.calls + r.callsMonth
      }), { 
          volume: 0, apps: 0, loans: 0, banca: 0, 
          appCRC: 0, loanCRC: 0, appFEOL: 0, loanFEOL: 0, 
          flyers: 0, calls: 0 
      });
  }, [filteredRecords]);

  // --- NEW METRICS CALCULATIONS ---
  const diffTime = Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
  
  const proApp = (subtotal.apps / Math.max(1, diffDays)).toFixed(2);
  const caseSize = subtotal.loans > 0 ? subtotal.volume / subtotal.loans : 0;

  // KPI Calculation Formula (Targets are Monthly, so we might need to adjust logic if viewing short term, but keeping simple for now)
  const TARGET_VOLUME = 100000000; // 100M
  const TARGET_APPS = 10;
  const TARGET_CALLS = 100;

  const volScore = Math.min(40, (subtotal.volume / TARGET_VOLUME) * 40);
  const appScore = Math.min(30, (subtotal.apps / TARGET_APPS) * 30);
  const callScore = Math.min(30, (subtotal.calls / TARGET_CALLS) * 30);
  
  const kpiScore = (volScore + appScore + callScore).toFixed(1);

  // Date Filter Helpers
  const setFilterToday = () => { const t = new Date().toISOString().split('T')[0]; setStartDate(t); setEndDate(t); };
  const setFilterWeek = () => { 
      const d = new Date(); 
      const day = d.getDay(); 
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
      const w = new Date(d.setDate(diff)).toISOString().split('T')[0]; 
      setStartDate(w); 
      setEndDate(new Date().toISOString().split('T')[0]); 
  };
  const setFilterMonth = () => { 
      const d = new Date(); 
      setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`); 
      setEndDate(new Date().toISOString().split('T')[0]); 
  };

  // Permissions
  const canEditRecord = ['ADMIN', 'RSM', 'SM', 'DSS'].includes(currentUser.role);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="bg-emerald-700 p-6 text-white flex items-center shadow-md z-10">
        <button onClick={onBack} className="mr-4 p-2 hover:bg-emerald-600 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold">{baseInfoRecord?.name || 'Chi tiết nhân viên'}</h2>
          <p className="text-emerald-100 opacity-90 text-sm font-mono">
              {maskCode(dsaCode)} || {displayDSS || '---'} || {displaySM || '---'}
          </p>
        </div>
        <div className="ml-auto text-right relative">
          <div className="text-xs uppercase opacity-70 mb-1 flex items-center justify-end gap-1">
             Điểm KPI (Filter)
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
                  <h4 className="font-bold text-sm text-emerald-800">Chi tiết KPI (Theo bộ lọc)</h4>
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
                        Đạt: {new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(subtotal.volume)} / {new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(TARGET_VOLUME)}
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
                        Đạt: {subtotal.apps} / {TARGET_APPS} Apps
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
                        Đạt: {subtotal.calls} / {TARGET_CALLS} Calls
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 md:p-6 flex-1 flex flex-col overflow-hidden">
        
        {/* Date Filter Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center space-x-2 bg-white p-1 rounded-lg border border-gray-300 shadow-sm">
                    <Calendar size={16} className="text-gray-500 ml-2"/>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none text-sm font-medium w-28 focus:ring-0" />
                    <span className="text-gray-400">-</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none text-sm font-medium w-28 focus:ring-0" />
                </div>
                <div className="flex gap-1">
                    <button onClick={setFilterToday} className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all">Hôm nay</button>
                    <button onClick={setFilterWeek} className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all">Tuần này</button>
                    <button onClick={setFilterMonth} className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all">Tháng này</button>
                </div>
            </div>
            <div className="text-xs text-gray-500 font-medium bg-white px-3 py-1 rounded border border-gray-200">
                Hiển thị: <b>{filteredRecords.length}</b> bản ghi
            </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6 flex-shrink-0">
           {/* Card 1: Volume */}
           <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 shadow-sm">
              <div className="flex items-center text-blue-700 mb-1">
                 <TrendingUp size={16} className="mr-1.5" />
                 <span className="font-bold text-xs truncate">Doanh Số</span>
              </div>
              <div className="text-lg font-bold text-gray-800 truncate">
                {new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(subtotal.volume)} ₫
              </div>
           </div>

           {/* Card 2: ProApp */}
           <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 shadow-sm">
              <div className="flex items-center text-indigo-700 mb-1">
                 <BarChart2 size={16} className="mr-1.5" />
                 <span className="font-bold text-xs truncate">ProApp/Ngày</span>
              </div>
              <div className="text-lg font-bold text-gray-800 truncate">
                {proApp}
              </div>
           </div>

           {/* Card 3: Apps */}
           <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 shadow-sm">
              <div className="flex items-center text-purple-700 mb-1">
                 <Users size={16} className="mr-1.5" />
                 <span className="font-bold text-xs truncate">Apps (Tiền mặt)</span>
              </div>
              <div className="text-lg font-bold text-gray-800 truncate">{subtotal.apps}</div>
           </div>

           {/* Card 4: Case Size */}
           <div className="bg-teal-50 p-3 rounded-lg border border-teal-100 shadow-sm">
              <div className="flex items-center text-teal-700 mb-1">
                 <PieChart size={16} className="mr-1.5" />
                 <span className="font-bold text-xs truncate">Case Size</span>
              </div>
              <div className="text-lg font-bold text-gray-800 truncate">
                {new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(caseSize)}
              </div>
           </div>

           {/* Card 5: Approval Rate */}
           <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 shadow-sm">
              <div className="flex items-center text-orange-700 mb-1">
                 <CheckCircle size={16} className="mr-1.5" />
                 <span className="font-bold text-xs truncate">Duyệt (L/A)</span>
              </div>
              <div className="text-lg font-bold text-gray-800 truncate">
                {subtotal.apps > 0 ? ((subtotal.loans / subtotal.apps) * 100).toFixed(1) : 0}%
              </div>
           </div>

           {/* Card 6: Calls */}
           <div className="bg-green-50 p-3 rounded-lg border border-green-100 shadow-sm">
              <div className="flex items-center text-green-700 mb-1">
                 <Phone size={16} className="mr-1.5" />
                 <span className="font-bold text-xs truncate">Calls</span>
              </div>
              <div className="text-lg font-bold text-gray-800 truncate">{subtotal.calls}</div>
           </div>
        </div>

        {/* History Table */}
        <div className="flex flex-col flex-1 min-h-0 border border-gray-200 rounded-lg shadow-sm bg-white">
            <h3 className="text-sm font-bold text-gray-800 p-3 border-b bg-gray-50 flex-shrink-0">Lịch sử báo cáo chi tiết</h3>
            <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="min-w-full text-xs md:text-sm text-left text-gray-600 relative">
                <thead className="bg-gray-100 text-gray-700 font-semibold uppercase sticky top-0 z-20 shadow-sm">
                    <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Ngày</th>
                    <th className="px-4 py-3 text-center bg-emerald-100 text-emerald-900">Volume</th>
                    <th className="px-4 py-3 text-center bg-emerald-50 text-emerald-800">Banca</th>
                    <th className="px-4 py-3 text-center bg-blue-50 text-blue-800">App/Loan</th>
                    <th className="px-4 py-3 text-center bg-red-50 text-red-800">App/Loan CRC</th>
                    <th className="px-4 py-3 text-center bg-purple-50 text-purple-800">App/Loan FEOL</th>
                    <th className="px-4 py-3 text-center">Tờ rơi</th>
                    <th className="px-4 py-3 text-center">Cuộc gọi</th>
                    <th className="px-4 py-3 text-center">Trạng thái</th>
                    <th className="px-4 py-3 text-center bg-gray-200">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredRecords.length > 0 ? (
                        filteredRecords.map(r => {
                        const canApproveRecord = canEditRecord && r.approvalStatus === 'Pending';
                        
                        return (
                            <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-900">{r.reportDate}</td>
                                <td className="px-4 py-2 text-right font-bold text-emerald-700 bg-emerald-50/50">
                                    {new Intl.NumberFormat('vi-VN').format(r.directVolume)}
                                </td>
                                <td className="px-4 py-2 text-right font-medium text-emerald-600 bg-emerald-50/30">
                                    {new Intl.NumberFormat('vi-VN').format(r.directBanca)}
                                </td>
                                <td className="px-4 py-2 text-center bg-blue-50/30"><span className="text-gray-500">{r.directApp}</span> / <span className="font-bold text-blue-700">{r.directLoan}</span></td>
                                <td className="px-4 py-2 text-center bg-red-50/30"><span className="text-gray-500">{r.directAppCRC || 0}</span> / <span className="font-bold text-red-700">{r.directLoanCRC || 0}</span></td>
                                <td className="px-4 py-2 text-center bg-purple-50/30"><span className="text-gray-500">{r.directAppFEOL || 0}</span> / <span className="font-bold text-purple-700">{r.directLoanFEOL || 0}</span></td>
                                <td className="px-4 py-2 text-center">{r.flyers}</td>
                                <td className="px-4 py-2 text-center">{r.callsMonth}</td>
                                <td className="px-4 py-2 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${r.approvalStatus === 'Pending' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                    {r.approvalStatus === 'Pending' ? 'Chờ duyệt' : 'Approved'}
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-center bg-gray-50/50">
                                    <div className="flex items-center justify-center space-x-1">
                                        {canEditRecord && (
                                            <button onClick={() => onEdit(r)} className="text-gray-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title="Chỉnh sửa">
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        {canApproveRecord && (
                                            <>
                                                <button onClick={() => onApprove(r, true)} className="text-green-500 hover:bg-green-100 p-1.5 rounded-lg transition-colors" title="Duyệt">
                                                    <Check className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => onApprove(r, false)} className="text-red-500 hover:bg-red-100 p-1.5 rounded-lg transition-colors" title="Từ chối">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                        })
                    ) : (
                        <tr><td colSpan={10} className="text-center p-8 italic text-gray-400">Không có dữ liệu trong khoảng thời gian này</td></tr>
                    )}
                </tbody>
                {/* SUBTOTAL FOOTER */}
                {filteredRecords.length > 0 && (
                    <tfoot className="bg-emerald-50 sticky bottom-0 z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] border-t-2 border-emerald-100">
                        <tr className="font-bold text-emerald-900 text-xs md:text-sm">
                            <td className="px-4 py-3 whitespace-nowrap bg-emerald-100">TỔNG CỘNG</td>
                            <td className="px-4 py-3 text-right bg-emerald-200">{new Intl.NumberFormat('vi-VN').format(subtotal.volume)}</td>
                            <td className="px-4 py-3 text-right">{new Intl.NumberFormat('vi-VN').format(subtotal.banca)}</td>
                            <td className="px-4 py-3 text-center text-blue-800">{subtotal.apps} / {subtotal.loans}</td>
                            <td className="px-4 py-3 text-center text-red-800">{subtotal.appCRC} / {subtotal.loanCRC}</td>
                            <td className="px-4 py-3 text-center text-purple-800">{subtotal.appFEOL} / {subtotal.loanFEOL}</td>
                            <td className="px-4 py-3 text-center">{subtotal.flyers}</td>
                            <td className="px-4 py-3 text-center">{subtotal.calls}</td>
                            <td className="px-4 py-3 text-center" colSpan={2}></td>
                        </tr>
                    </tfoot>
                )}
            </table>
            </div>
        </div>
      </div>
    </div>
  );
};
