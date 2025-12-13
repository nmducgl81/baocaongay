import React, { useState, useMemo } from 'react';
import { SalesRecord, User } from '../types';
import { Calendar, Award, BarChart, Medal, TrendingUp, Crown, Trophy, Star } from 'lucide-react';

interface DashboardChartsProps {
  data: SalesRecord[]; // Local filtered data for performance view
  globalData: SalesRecord[]; // Global date-filtered data for Leaderboard view
  currentUser: User;
  users?: User[]; // Full user list to fetch avatars
  onDateChange: (start: string, end: string) => void;
  startDate: string;
  endDate: string;
}

type TabType = 'volume' | 'apps' | 'activity';
type ViewType = 'chart' | 'ranking';

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ data, globalData, currentUser, users = [], onDateChange, startDate, endDate }) => {
  const [activeTab, setActiveTab] = useState<TabType>('volume');
  const [viewType, setViewType] = useState<ViewType>('chart');

  // Determine grouping key based on user role for the CHART
  const groupKey = useMemo(() => {
    switch (currentUser.role) {
      case 'DSA': return 'reportDate'; // Chart shows trend over time
      case 'DSS': return 'name'; // Chart shows DSAs comparison
      case 'SM': return 'dss'; // Chart shows DSSs comparison
      case 'RSM': 
      case 'ADMIN': return 'smName'; // Chart shows Regions comparison
      default: return 'name';
    }
  }, [currentUser.role]);

  const xAxisLabel = useMemo(() => {
    switch (currentUser.role) {
      case 'DSA': return 'Ngày';
      case 'DSS': return 'Nhân viên (DSA)';
      case 'SM': return 'Trưởng nhóm (DSS)';
      case 'RSM': 
      case 'ADMIN': return 'Khu vực (SM)';
      default: return 'Đối tượng';
    }
  }, [currentUser.role]);

  // --- CHART DATA AGGREGATION (Uses `data` - scoped permission) ---
  const chartData = useMemo(() => {
    const grouped = data.reduce((acc, curr) => {
      const key = (curr as any)[groupKey] || 'N/A';
      if (!acc[key]) {
        acc[key] = {
          key,
          directVolume: 0,
          onlineVolume: 0,
          directApp: 0,
          onlineApp: 0,
          directLoan: 0,
          calls: 0,
          flyers: 0,
          dlk: 0
        };
      }
      acc[key].directVolume += curr.directVolume;
      acc[key].onlineVolume += curr.onlineVolume;
      acc[key].directApp += curr.directApp;
      acc[key].onlineApp += curr.onlineApp;
      acc[key].directLoan += curr.directLoan;
      acc[key].calls += curr.callsMonth;
      acc[key].flyers += curr.flyers;
      acc[key].dlk += curr.dlk;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).sort((a: any, b: any) => {
      if (groupKey === 'reportDate') return a.key.localeCompare(b.key); 
      if (activeTab === 'volume') return b.directVolume - a.directVolume;
      if (activeTab === 'apps') return b.directApp - a.directApp;
      return b.calls - a.calls;
    });
  }, [data, groupKey, activeTab]);

  // --- RANKING DATA LOGIC (Uses `globalData` - regional view) ---
  const rankingData = useMemo(() => {
    let groupBy = 'dsaCode';
    let nameKey = 'name';
    let subKey = 'dss'; 
    let rankTitle = 'DSA xuất sắc nhất';
    
    // For ranking, we want to show detailed info for individual performers if possible
    // But logic depends on who is viewing.
    // However, the request asks to honor Top 3 stars (DSA, DSS, SM).
    // Let's assume the default view is ranking DSAs regardless of user, OR respect hierarchy.
    // The previous implementation respected hierarchy. Let's keep it but enhance data.

    if (currentUser.role === 'DSS') {
       groupBy = 'dss';
       nameKey = 'dss';
       subKey = 'smName';
       rankTitle = 'DSS xuất sắc nhất';
    } else if (['SM', 'RSM', 'ADMIN'].includes(currentUser.role)) {
       // If SM/Admin viewing, usually they want to see Top DSAs or Top DSSs.
       // The prompt implies honoring "Stars" with DSA, DSS, SM names. 
       // This implies the leaderboard items are DSAs.
       groupBy = 'dsaCode';
       nameKey = 'name';
       rankTitle = 'Ngôi sao bán hàng (DSA)';
    }

    const grouped = globalData.reduce((acc, curr) => {
        const key = (curr as any)[groupBy];
        if (!key) return acc;
        
        if (!acc[key]) {
            acc[key] = {
                id: key,
                name: (curr as any)[nameKey],
                dss: curr.dss,
                sm: curr.smName,
                volume: 0,
                apps: 0
            };
        }
        acc[key].volume += curr.directVolume;
        acc[key].apps += curr.directApp;
        return acc;
    }, {} as Record<string, any>);

    return {
        items: Object.values(grouped)
            .sort((a: any, b: any) => b.volume - a.volume)
            .slice(0, 10), // Top 10
        title: rankTitle
    };

  }, [globalData, currentUser.role]);


  const maxValue = useMemo(() => {
    if (viewType === 'chart') {
        return Math.max(...chartData.map((d: any) => {
        if (activeTab === 'volume') return Math.max(d.directVolume, d.onlineVolume);
        if (activeTab === 'apps') return Math.max(d.directApp, d.onlineApp, d.directLoan);
        return Math.max(d.calls, d.flyers, d.dlk);
        }), 1);
    } else {
        return Math.max(...rankingData.items.map((d: any) => d.volume), 1);
    }
  }, [chartData, rankingData, activeTab, viewType]);

  const formatValue = (val: number) => {
     return new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(val);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 h-full flex flex-col">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <div>
           <h3 className="text-xl font-bold text-gray-800 flex items-center">
              {viewType === 'ranking' ? <Trophy className="mr-2 text-yellow-500" /> : <BarChart className="mr-2 text-emerald-600" />}
              {viewType === 'ranking' ? 'Bảng vàng thành tích' : 'Biểu đồ hiệu quả kinh doanh'}
           </h3>
           <p className="text-sm text-gray-500 mt-1 font-medium">
             {viewType === 'ranking' 
                ? `Top 10 ${rankingData.title} theo doanh số (Volume)`
                : `Phân tích dữ liệu theo: ${xAxisLabel}`
             }
           </p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
          {/* View Toggle */}
          <div className="bg-gray-100 p-1 rounded-lg flex shadow-inner">
             <button onClick={() => setViewType('chart')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center transition-all ${viewType === 'chart' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <BarChart size={16} className="mr-2"/> Biểu Đồ
             </button>
             <button onClick={() => setViewType('ranking')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center transition-all ${viewType === 'ranking' ? 'bg-white text-yellow-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <Award size={16} className="mr-2"/> Xếp Hạng
             </button>
          </div>

          <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

          {/* Date Filter */}
          <div className="flex items-center space-x-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
              <Calendar size={16} className="text-gray-400 ml-1" />
              <input type="date" value={startDate} onChange={e => onDateChange(e.target.value, endDate)} className="bg-transparent text-sm border-none focus:ring-0 text-gray-700 font-medium w-28 p-0" />
              <span className="text-gray-400 font-bold">-</span>
              <input type="date" value={endDate} onChange={e => onDateChange(startDate, e.target.value)} className="bg-transparent text-sm border-none focus:ring-0 text-gray-700 font-medium w-28 p-0" />
          </div>

          {/* Metric Tabs (Only for Chart View) */}
          {viewType === 'chart' && (
              <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto w-full md:w-auto custom-scrollbar">
                <button onClick={() => setActiveTab('volume')} className={`px-3 py-2 text-sm font-bold rounded-md whitespace-nowrap transition-all ${activeTab === 'volume' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Doanh số</button>
                <button onClick={() => setActiveTab('apps')} className={`px-3 py-2 text-sm font-bold rounded-md whitespace-nowrap transition-all ${activeTab === 'apps' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Hồ sơ</button>
                <button onClick={() => setActiveTab('activity')} className={`px-3 py-2 text-sm font-bold rounded-md whitespace-nowrap transition-all ${activeTab === 'activity' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Hoạt động</button>
              </div>
          )}
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 min-h-[400px]">
        
        {/* VIEW 1: RANKING LEADERBOARD */}
        {viewType === 'ranking' && (
            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-4">
               {rankingData.items.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                       <Award size={48} className="mb-2 opacity-50"/>
                       <p className="font-medium">Chưa có dữ liệu xếp hạng trong khoảng thời gian này.</p>
                   </div>
               ) : (
                   <div className="space-y-4">
                        {/* Header Row */}
                        <div className="flex justify-between items-center px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                            <span>Hạng & Ngôi sao</span>
                            <span>Thành tích</span>
                        </div>
                        
                        {rankingData.items.map((item: any, idx) => {
                            const isTop1 = idx === 0;
                            const isTop2 = idx === 1;
                            const isTop3 = idx === 2;
                            const isTop3Any = idx < 3;
                            const widthPercent = (item.volume / maxValue) * 100;
                            
                            // Find user to get avatar
                            const user = users.find(u => u.name === item.name || u.dsaCode === item.id);
                            const avatar = user?.avatar;

                            // Styling for Top 3
                            let cardClass = "bg-white border-gray-100 hover:border-emerald-200";
                            let badgeClass = "bg-gray-100 text-gray-600";
                            let avatarBorderClass = "border-gray-200";
                            let icon = <span className="font-bold text-sm">{idx + 1}</span>;
                            let starColor = "text-gray-300";

                            if (isTop1) {
                                cardClass = "bg-gradient-to-r from-yellow-50 via-amber-50 to-white border-yellow-300 shadow-lg transform scale-[1.02] z-10";
                                badgeClass = "bg-yellow-100 text-yellow-700 border border-yellow-200";
                                avatarBorderClass = "border-yellow-400 ring-4 ring-yellow-100";
                                icon = <Crown size={20} className="text-yellow-600 fill-yellow-600" />;
                                starColor = "text-yellow-500 fill-yellow-500";
                            } else if (isTop2) {
                                cardClass = "bg-gradient-to-r from-slate-50 to-white border-slate-300 shadow-md z-0";
                                badgeClass = "bg-slate-200 text-slate-700 border border-slate-300";
                                avatarBorderClass = "border-slate-400 ring-4 ring-slate-100";
                                icon = <Medal size={20} className="text-slate-500 fill-slate-300" />;
                                starColor = "text-slate-400 fill-slate-400";
                            } else if (isTop3) {
                                cardClass = "bg-gradient-to-r from-orange-50 to-white border-orange-300 shadow-md z-0";
                                badgeClass = "bg-orange-100 text-orange-800 border border-orange-200";
                                avatarBorderClass = "border-orange-400 ring-4 ring-orange-100";
                                icon = <Medal size={20} className="text-orange-600 fill-orange-300" />;
                                starColor = "text-orange-500 fill-orange-500";
                            }

                            return (
                                <div key={idx} className={`relative p-4 rounded-xl border transition-all duration-300 flex flex-col md:flex-row items-start md:items-center gap-4 group ${cardClass}`}>
                                    {/* Rank Badge & Avatar */}
                                    <div className="flex items-center gap-4 min-w-[250px]">
                                        <div className={`w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0 font-bold shadow-sm ${badgeClass}`}>
                                            {icon}
                                        </div>
                                        
                                        {/* Avatar Container with Star Border Effect */}
                                        <div className="relative">
                                            <div className={`w-14 h-14 rounded-full border-2 overflow-hidden ${avatarBorderClass}`}>
                                                {avatar ? (
                                                    <img src={avatar} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold">
                                                        {item.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            {isTop3Any && (
                                                <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-100">
                                                    <Star size={14} className={starColor} />
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className={`font-bold text-base ${isTop1 ? 'text-gray-900 text-lg' : 'text-gray-800'}`}>
                                                    {item.name}
                                                </h4>
                                                {isTop1 && <span className="text-[10px] bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Vô địch</span>}
                                            </div>
                                            <div className="text-xs text-gray-500 flex flex-col">
                                                {item.dss && <span>DSS: <b>{item.dss}</b></span>}
                                                {item.sm && <span>SM: <b>{item.sm}</b></span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info & Progress */}
                                    <div className="flex-1 w-full min-w-0">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-xs font-bold text-gray-400 uppercase">Doanh số</span>
                                            <span className={`font-black font-mono text-lg ${isTop1 ? 'text-emerald-700' : 'text-gray-700'}`}>
                                                {formatValue(item.volume)}
                                            </span>
                                        </div>
                                        {/* Progress Bar */}
                                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ease-out 
                                                    ${isTop1 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : 
                                                      isTop2 ? 'bg-gradient-to-r from-slate-400 to-slate-500' : 
                                                      isTop3 ? 'bg-gradient-to-r from-orange-400 to-orange-500' : 
                                                      'bg-emerald-500'}`} 
                                                style={{ width: `${widthPercent}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                   </div>
               )}
            </div>
        )}

        {/* VIEW 2: CHART */}
        {viewType === 'chart' && (
            <div className="relative h-[400px] w-full mt-4 pb-4 overflow-x-auto custom-scrollbar">
                {chartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-400 italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        Chưa có dữ liệu để hiển thị biểu đồ
                    </div>
                ) : (
                    <div className="h-full flex items-end space-x-8 md:space-x-12 min-w-max px-4 pt-10 pb-2">
                    {chartData.map((item: any) => (
                        <div key={item.key} className="flex flex-col items-center group relative min-w-[60px]">
                            {/* Bars Container */}
                            <div className="flex items-end space-x-1 h-[300px] relative">
                                {/* Bar 1 */}
                                <div 
                                    className={`w-8 md:w-12 rounded-t-lg transition-all duration-500 relative group/bar shadow-sm hover:opacity-90 ${activeTab === 'volume' ? 'bg-emerald-500' : activeTab === 'apps' ? 'bg-blue-500' : 'bg-orange-500'}`}
                                    style={{ height: `${Math.max((activeTab === 'volume' ? item.directVolume : activeTab === 'apps' ? item.directApp : item.calls) / maxValue * 100, 4)}%` }}
                                >
                                    {/* Value Label on Top (Hover) */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-lg arrow-bottom">
                                        {formatValue(activeTab === 'volume' ? item.directVolume : activeTab === 'apps' ? item.directApp : item.calls)}
                                    </div>
                                </div>

                                {/* Bar 2 (Secondary) */}
                                <div 
                                    className={`w-8 md:w-12 rounded-t-lg transition-all duration-500 relative group/bar shadow-sm opacity-60 hover:opacity-80 ${activeTab === 'volume' ? 'bg-emerald-300' : activeTab === 'apps' ? 'bg-blue-300' : 'bg-orange-300'}`}
                                    style={{ height: `${Math.max((activeTab === 'volume' ? item.onlineVolume : activeTab === 'apps' ? item.onlineApp : item.flyers) / maxValue * 100, 2)}%` }}
                                >
                                    {/* Value Label on Top (Hover) */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-700 text-white text-xs py-1 px-2 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-lg">
                                        {formatValue(activeTab === 'volume' ? item.onlineVolume : activeTab === 'apps' ? item.onlineApp : item.flyers)}
                                    </div>
                                </div>

                                {/* Bar 3 (Tertiary - Only for Apps/Activity) */}
                                {activeTab !== 'volume' && (
                                    <div 
                                    className={`w-8 md:w-12 rounded-t-lg transition-all duration-500 relative group/bar shadow-sm ${activeTab === 'apps' ? 'bg-indigo-400' : 'bg-purple-400'}`}
                                    style={{ height: `${Math.max((activeTab === 'apps' ? item.directLoan : item.dlk) / maxValue * 100, 2)}%` }}
                                    >
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-700 text-white text-xs py-1 px-2 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-lg">
                                            {formatValue(activeTab === 'apps' ? item.directLoan : item.dlk)}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* X-Axis Label */}
                            <div className="mt-4 text-xs font-bold text-gray-600 rotate-0 md:-rotate-45 origin-top-left md:translate-y-3 w-28 truncate text-center md:text-left hover:text-emerald-600 transition-colors cursor-default" title={item.key}>
                                {item.key}
                            </div>
                        </div>
                    ))}
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Legend for Chart View */}
      {viewType === 'chart' && (
        <div className="flex justify-center space-x-6 mt-6 pt-4 border-t border-gray-100 text-sm text-gray-600 flex-wrap">
            <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${activeTab === 'volume' ? 'bg-emerald-500' : activeTab === 'apps' ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                <span className="font-medium">{activeTab === 'volume' ? 'Direct Volume' : activeTab === 'apps' ? 'Direct App' : 'Cuộc gọi'}</span>
            </div>
            <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 opacity-60 ${activeTab === 'volume' ? 'bg-emerald-300' : activeTab === 'apps' ? 'bg-blue-300' : 'bg-orange-300'}`}></div>
                <span className="font-medium">{activeTab === 'volume' ? 'Online Volume' : activeTab === 'apps' ? 'Online App' : 'Tờ rơi'}</span>
            </div>
            {activeTab !== 'volume' && (
                <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${activeTab === 'apps' ? 'bg-indigo-400' : 'bg-purple-400'}`}></div>
                    <span className="font-medium">{activeTab === 'apps' ? 'Direct Loan' : 'ĐLK'}</span>
                </div>
            )}
        </div>
      )}
    </div>
  );
};