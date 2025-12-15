import React, { useState, useMemo } from 'react';
import { SalesRecord, User } from '../types';
import { Calendar, Award, BarChart, Users, Map, User as UserIcon } from 'lucide-react';

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
type RankingScope = 'dsa' | 'dss' | 'sm';

interface RankingItem {
  id: string;
  name: string;
  dss: string;
  sm: string;
  volume: number;
  banca: number;
  crc: number;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ data, globalData, currentUser, users = [], onDateChange, startDate, endDate }) => {
  const [activeTab, setActiveTab] = useState<TabType>('volume');
  const [viewType, setViewType] = useState<ViewType>('chart');
  const [rankingScope, setRankingScope] = useState<RankingScope>('dsa');

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
    
    // Config based on selected Scope
    let groupBy = 'dsaCode';
    let nameKey = 'name';
    let rankTitle = 'Cá nhân xuất sắc (DSA)';

    if (rankingScope === 'dss') {
        groupBy = 'dss';
        nameKey = 'dss';
        rankTitle = 'Team xuất sắc (DSS)';
    } else if (rankingScope === 'sm') {
        groupBy = 'smName';
        nameKey = 'smName';
        rankTitle = 'Khu vực xuất sắc (SM)';
    }

    const grouped = globalData.reduce((acc, curr) => {
        const key = (curr as any)[groupBy];
        if (!key) return acc;
        
        if (!acc[key]) {
            acc[key] = {
                id: key,
                name: (curr as any)[nameKey] || key, // Use key as fallback name
                dss: curr.dss,
                sm: curr.smName,
                volume: 0,
                banca: 0,
                crc: 0
            };
        }
        acc[key].volume += curr.directVolume;
        acc[key].banca += curr.directBanca;
        acc[key].crc += (curr.directLoanCRC || 0);
        return acc;
    }, {} as Record<string, RankingItem>);

    const allItems = Object.values(grouped);

    // Create 3 sorted lists
    return {
        topVolume: [...allItems].sort((a: RankingItem, b: RankingItem) => b.volume - a.volume).slice(0, 10).filter((i: RankingItem) => i.volume > 0),
        topBanca: [...allItems].sort((a: RankingItem, b: RankingItem) => b.banca - a.banca).slice(0, 10).filter((i: RankingItem) => i.banca > 0),
        topCRC: [...allItems].sort((a: RankingItem, b: RankingItem) => b.crc - a.crc).slice(0, 10).filter((i: RankingItem) => i.crc > 0),
        title: rankTitle
    };

  }, [globalData, rankingScope]);


  const maxValue = useMemo(() => {
    if (viewType === 'chart') {
        return Math.max(...chartData.map((d: any) => {
        if (activeTab === 'volume') return Math.max(d.directVolume, d.onlineVolume);
        if (activeTab === 'apps') return Math.max(d.directApp, d.onlineApp, d.directLoan);
        return Math.max(d.calls, d.flyers, d.dlk);
        }), 1);
    } else {
        return 1;
    }
  }, [chartData, activeTab, viewType]);

  const formatValue = (val: number) => {
     return new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(val);
  };

  const renderRankingColumn = (title: string, items: any[], metricKey: string, colorTheme: 'yellow' | 'blue' | 'red') => {
      const maxVal = Math.max(...items.map((i: any) => i[metricKey]), 1);
      
      const themeStyles = {
          yellow: { header: 'text-yellow-700 bg-yellow-50 border-yellow-200', bar: 'bg-yellow-400', text: 'text-yellow-700' },
          blue: { header: 'text-blue-700 bg-blue-50 border-blue-200', bar: 'bg-blue-400', text: 'text-blue-700' },
          red: { header: 'text-red-700 bg-red-50 border-red-200', bar: 'bg-red-400', text: 'text-red-700' },
      };
      
      const style = themeStyles[colorTheme];

      return (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
               <div className={`p-3 font-bold text-center border-b uppercase text-sm tracking-wider ${style.header}`}>
                   {title}
               </div>
               <div className="flex-1 p-2 overflow-y-auto custom-scrollbar max-h-[400px]">
                   {items.length === 0 ? (
                       <div className="h-32 flex items-center justify-center text-gray-400 text-xs italic">Chưa có dữ liệu</div>
                   ) : (
                       items.map((item, idx) => {
                           const isTop1 = idx === 0;
                           const widthPercent = (item[metricKey] / maxVal) * 100;
                           
                           // Find Avatar Logic:
                           // If scope is DSA: match dsaCode or name
                           // If scope is Team/SM: No avatar usually, use Initials
                           let avatar = null;
                           if (rankingScope === 'dsa') {
                               const user = users.find(u => u.name === item.name || u.dsaCode === item.id);
                               avatar = user?.avatar;
                           }

                           return (
                               <div key={idx} className="flex items-center gap-3 mb-3 last:mb-0 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                   <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${isTop1 ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-200 text-gray-600'}`}>
                                       {idx + 1}
                                   </div>
                                   <div className="w-8 h-8 rounded-full border border-gray-200 overflow-hidden flex-shrink-0">
                                       {avatar ? (
                                           <img src={avatar} alt="" className="w-full h-full object-cover"/> 
                                       ) : (
                                           <div className={`w-full h-full flex items-center justify-center text-[10px] font-bold ${rankingScope !== 'dsa' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                                               {rankingScope === 'dss' ? 'TM' : rankingScope === 'sm' ? 'KV' : item.name.charAt(0)}
                                           </div>
                                       )}
                                   </div>
                                   <div className="flex-1 min-w-0">
                                       <div className="flex justify-between items-center text-xs mb-1">
                                           <span className={`font-bold truncate ${isTop1 ? 'text-gray-900' : 'text-gray-700'}`}>{item.name}</span>
                                           <span className={`font-bold font-mono ${style.text}`}>
                                               {metricKey === 'crc' ? item[metricKey] : formatValue(item[metricKey])}
                                               {metricKey === 'crc' ? '' : ''}
                                           </span>
                                       </div>
                                       <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                           <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${widthPercent}%` }}></div>
                                       </div>
                                   </div>
                               </div>
                           );
                       })
                   )}
               </div>
          </div>
      );
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 h-full flex flex-col">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <div>
           <h3 className="text-xl font-bold text-gray-800 flex items-center">
              {viewType === 'ranking' ? <Award className="mr-2 text-yellow-500" /> : <BarChart className="mr-2 text-emerald-600" />}
              {viewType === 'ranking' ? rankingData.title : 'Biểu đồ hiệu quả kinh doanh'}
           </h3>
           <p className="text-sm text-gray-500 mt-1 font-medium">
             {viewType === 'ranking' 
                ? `Vinh danh các thành tích xuất sắc nhất`
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

          {/* Ranking Scope Tabs (Only for Ranking View) */}
          {viewType === 'ranking' && (
              <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto w-full md:w-auto custom-scrollbar">
                <button onClick={() => setRankingScope('dsa')} className={`px-3 py-2 text-sm font-bold rounded-md whitespace-nowrap transition-all flex items-center ${rankingScope === 'dsa' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    <UserIcon size={14} className="mr-1"/> Cá nhân
                </button>
                <button onClick={() => setRankingScope('dss')} className={`px-3 py-2 text-sm font-bold rounded-md whitespace-nowrap transition-all flex items-center ${rankingScope === 'dss' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    <Users size={14} className="mr-1"/> Team
                </button>
                <button onClick={() => setRankingScope('sm')} className={`px-3 py-2 text-sm font-bold rounded-md whitespace-nowrap transition-all flex items-center ${rankingScope === 'sm' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    <Map size={14} className="mr-1"/> Khu vực
                </button>
              </div>
          )}
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 min-h-[400px]">
        
        {/* VIEW 1: RANKING LEADERBOARD (UPDATED: 3 COLUMNS) */}
        {viewType === 'ranking' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full animate-in fade-in slide-in-from-bottom-4">
               {renderRankingColumn(`Top 10 Volume ${rankingScope === 'dsa' ? '(DSA)' : rankingScope === 'dss' ? '(Team)' : '(Khu Vực)'}`, rankingData.topVolume, "volume", "yellow")}
               {renderRankingColumn(`Top 10 Banca ${rankingScope === 'dsa' ? '(DSA)' : rankingScope === 'dss' ? '(Team)' : '(Khu Vực)'}`, rankingData.topBanca, "banca", "blue")}
               {renderRankingColumn(`Top 10 Thẻ CRC ${rankingScope === 'dsa' ? '(DSA)' : rankingScope === 'dss' ? '(Team)' : '(Khu Vực)'}`, rankingData.topCRC, "crc", "red")}
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