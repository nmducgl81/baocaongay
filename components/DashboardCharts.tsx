import React, { useState, useMemo } from 'react';
import { SalesRecord, User } from '../types';
import { Calendar, Award, BarChart, Users, Map, User as UserIcon } from 'lucide-react';

interface DashboardChartsProps {
  data: SalesRecord[]; // Local filtered data for performance view
  globalData: SalesRecord[]; // Global date-filtered data for Leaderboard view
  currentUser: User;
  users?: User[]; // Full user list to fetch avatars and calculate Headcount
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
  headcount: number; // Distinct DSA count from HR List
}

const DashboardChartsComponent: React.FC<DashboardChartsProps> = ({ data, globalData, currentUser, users = [], onDateChange, startDate, endDate }) => {
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
    // Only process up to 1000 records to prevent hanging if data is huge, though usually filtered by date
    const processData = data.length > 3000 ? data.slice(0, 3000) : data;

    const grouped = processData.reduce((acc, curr) => {
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
      // Sum Direct + FEOL for total visualization
      const totalVol = (curr.directVolume || 0) + (curr.directVolumeFEOL || 0);
      acc[key].directVolume += totalVol;
      acc[key].onlineVolume += curr.onlineVolume;
      acc[key].directApp += curr.directApp;
      acc[key].onlineApp += curr.onlineApp;
      acc[key].directLoan += curr.directLoan;
      acc[key].calls += curr.callsMonth;
      acc[key].flyers += curr.flyers;
      acc[key].dlk += curr.dlk;
      return acc;
    }, {} as Record<string, any>);

    const sorted = Object.values(grouped).sort((a: any, b: any) => {
      if (groupKey === 'reportDate') return a.key.localeCompare(b.key); 
      if (activeTab === 'volume') return b.directVolume - a.directVolume;
      if (activeTab === 'apps') return b.directApp - a.directApp;
      return b.calls - a.calls;
    });

    // Limit chart items for performance if too many bars
    return sorted.length > 50 ? sorted.slice(0, 50) : sorted;
  }, [data, groupKey, activeTab]);

  // --- OPTIMIZATION: Memoize Headcount separately from Sales Data ---
  // Only recalculate when User List changes, NOT when Date changes
  const headcountMap = useMemo(() => {
      const counts: Record<string, number> = {};
      if (rankingScope === 'dsa') return counts;

      users.forEach(u => {
          if (u.role === 'DSA') {
              // Find hierarchy names for this user
              let dssName = '';
              let smName = '';
              
              const dssParent = users.find(p => p.id === u.parentId);
              if (dssParent && dssParent.role === 'DSS') {
                  dssName = dssParent.name;
                  const smParent = users.find(p => p.id === dssParent.parentId);
                  if (smParent) smName = smParent.name;
              } else if (dssParent && dssParent.role === 'SM') {
                  // Direct report to SM
                  smName = dssParent.name;
              }
              
              // Increment counts using the Name as key (Must match report names)
              if (rankingScope === 'dss' && dssName) {
                  counts[dssName] = (counts[dssName] || 0) + 1;
              } else if (rankingScope === 'sm' && smName) {
                  counts[smName] = (counts[smName] || 0) + 1;
              }
          }
      });
      return counts;
  }, [users, rankingScope]);

  // --- RANKING DATA LOGIC ---
  const rankingData = useMemo(() => {
    // Return empty immediately if viewing chart to save calc time
    if (viewType !== 'ranking') return { topVolume: [], topBanca: [], topCRC: [], title: '' };

    // Config based on selected Scope
    let groupBy = 'dsaCode';
    let nameKey = 'name';
    let rankTitle = 'Cá nhân xuất sắc (DSA)';

    if (rankingScope === 'dss') {
        groupBy = 'dss';
        nameKey = 'dss';
        rankTitle = 'Team xuất sắc (DSS) - Tính theo Năng suất';
    } else if (rankingScope === 'sm') {
        groupBy = 'smName';
        nameKey = 'smName';
        rankTitle = 'Khu vực xuất sắc (SM) - Tính theo Năng suất';
    }

    // STEP 2: Aggregate Sales Data from RECORDS
    const grouped = globalData.reduce((acc, curr) => {
        const key = (curr as any)[groupBy];
        if (!key) return acc;
        
        const displayName = (curr as any)[nameKey] || key;

        if (!acc[key]) {
            acc[key] = {
                id: key,
                name: displayName, 
                volume: 0,
                banca: 0,
                crc: 0,
                dsaSet: new Set<string>() // Used as fallback for headcount if user list missing
            };
        }
        
        // Accumulate TOTAL Volume (Direct + FEOL)
        const vol = (curr.directVolume || 0) + (curr.directVolumeFEOL || 0);
        
        acc[key].volume += vol;
        acc[key].banca += curr.directBanca;
        acc[key].crc += (curr.directLoanCRC || 0);
        acc[key].dsaSet.add(curr.dsaCode); 
        return acc;
    }, {} as Record<string, any>);

    // STEP 3: Finalize Items with Correct Headcount
    const allItems: RankingItem[] = Object.values(grouped).map((item: any) => {
        let finalHeadcount = item.dsaSet.size; // Default to active count
        
        // If viewing Teams, use the REAL headcount from User List if available
        if (rankingScope !== 'dsa' && headcountMap[item.name]) {
            finalHeadcount = headcountMap[item.name];
        }

        return {
            ...item,
            headcount: rankingScope === 'dsa' ? 1 : finalHeadcount
        };
    });

    // Sorting Logic: 
    // If DSA: Sort by Total Volume
    // If Team (DSS/SM): Sort by Average Volume (Productivity = Total / Real Headcount)
    const getSortValue = (item: RankingItem, metric: 'volume' | 'banca' | 'crc') => {
        if (rankingScope === 'dsa') return item[metric];
        // Team Ranking: Calculate Average
        return item[metric] / (item.headcount || 1);
    };

    return {
        topVolume: [...allItems].sort((a, b) => getSortValue(b, 'volume') - getSortValue(a, 'volume')).slice(0, 20).filter(i => i.volume > 0),
        topBanca: [...allItems].sort((a, b) => getSortValue(b, 'banca') - getSortValue(a, 'banca')).slice(0, 20).filter(i => i.banca > 0),
        topCRC: [...allItems].sort((a, b) => getSortValue(b, 'crc') - getSortValue(a, 'crc')).slice(0, 20).filter(i => i.crc > 0),
        title: rankTitle
    };

  }, [globalData, rankingScope, headcountMap, viewType]);


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

  const renderRankingColumn = (title: string, items: RankingItem[], metricKey: 'volume' | 'banca' | 'crc', colorTheme: 'yellow' | 'blue' | 'red') => {
      // Calculate max for bar width based on the SORTING METRIC (Total or Avg)
      const getMax = () => {
          if (rankingScope === 'dsa') return Math.max(...items.map(i => i[metricKey]), 1);
          return Math.max(...items.map(i => i[metricKey] / (i.headcount || 1)), 1);
      };
      
      const maxVal = getMax();
      
      const themeStyles = {
          yellow: { header: 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800', bar: 'bg-yellow-400', text: 'text-yellow-700 dark:text-yellow-400' },
          blue: { header: 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800', bar: 'bg-blue-400', text: 'text-blue-700 dark:text-blue-400' },
          red: { header: 'text-red-700 bg-red-50 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800', bar: 'bg-red-400', text: 'text-red-700 dark:text-red-400' },
      };
      
      const style = themeStyles[colorTheme];

      return (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-full transition-colors duration-300">
               <div className={`p-3 font-bold text-center border-b uppercase text-sm tracking-wider ${style.header}`}>
                   {title}
               </div>
               <div className="flex-1 p-2 overflow-y-auto custom-scrollbar max-h-[400px]">
                   {items.length === 0 ? (
                       <div className="h-32 flex items-center justify-center text-gray-400 text-xs italic">Chưa có dữ liệu</div>
                   ) : (
                       items.map((item, idx) => {
                           const isTop1 = idx === 0;
                           
                           // Calculate width based on Avg if Team, or Total if DSA
                           const rawValue = item[metricKey];
                           const avgValue = rawValue / (item.headcount || 1);
                           const displayValue = rankingScope === 'dsa' ? rawValue : avgValue;
                           
                           const widthPercent = (displayValue / maxVal) * 100;
                           
                           // Find Avatar Logic:
                           let avatar = null;
                           if (rankingScope === 'dsa') {
                               const user = users.find(u => u.name === item.name || u.dsaCode === item.id);
                               avatar = user?.avatar;
                           }

                           return (
                               <div key={idx} className="flex items-center gap-3 mb-3 last:mb-0 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0">
                                   <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${isTop1 ? 'bg-yellow-400 text-yellow-900 shadow-sm' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                                       {idx + 1}
                                   </div>
                                   <div className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 overflow-hidden flex-shrink-0 bg-gray-50 dark:bg-gray-700">
                                       {avatar ? (
                                           <img src={avatar} alt="" className="w-full h-full object-cover"/> 
                                       ) : (
                                           <div className={`w-full h-full flex items-center justify-center text-[10px] font-bold ${rankingScope !== 'dsa' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-gray-100 text-gray-400 dark:bg-gray-600 dark:text-gray-300'}`}>
                                               {rankingScope === 'dss' ? 'TM' : rankingScope === 'sm' ? 'KV' : item.name.charAt(0)}
                                           </div>
                                       )}
                                   </div>
                                   <div className="flex-1 min-w-0">
                                       <div className="flex justify-between items-center text-xs mb-1">
                                           <span className={`font-bold truncate ${isTop1 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>{item.name}</span>
                                           <span className={`font-bold font-mono text-right ${style.text}`}>
                                               {rankingScope !== 'dsa' && <span className="text-[10px] text-gray-400 mr-1 font-sans">Avg:</span>}
                                               {metricKey === 'crc' ? displayValue.toFixed(1) : formatValue(displayValue)}
                                           </span>
                                       </div>
                                       
                                       {/* Progress Bar */}
                                       <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
                                           <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${widthPercent}%` }}></div>
                                       </div>
                                       
                                       {/* Sub-info for Teams: Headcount & Total */}
                                       {rankingScope !== 'dsa' && (
                                           <div className="flex justify-between text-[10px] text-gray-400">
                                                <span>NS: <b>{item.headcount}</b></span>
                                                <span>Tổng: {formatValue(rawValue)}</span>
                                           </div>
                                       )}
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
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 h-full flex flex-col transition-colors duration-300">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <div>
           <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
              {viewType === 'ranking' ? <Award className="mr-2 text-yellow-500" /> : <BarChart className="mr-2 text-emerald-600 dark:text-emerald-400" />}
              {viewType === 'ranking' ? rankingData.title : 'Biểu đồ hiệu quả kinh doanh'}
           </h3>
           <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
             {viewType === 'ranking' 
                ? `Vinh danh các thành tích xuất sắc nhất`
                : `Phân tích dữ liệu theo: ${xAxisLabel}`
             }
           </p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
          {/* View Toggle */}
          <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex shadow-inner">
             <button onClick={() => setViewType('chart')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center transition-all ${viewType === 'chart' ? 'bg-white dark:bg-gray-600 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                <BarChart size={16} className="mr-2"/> Biểu Đồ
             </button>
             <button onClick={() => setViewType('ranking')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center transition-all ${viewType === 'ranking' ? 'bg-white dark:bg-gray-600 text-yellow-600 dark:text-yellow-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                <Award size={16} className="mr-2"/> Xếp Hạng
             </button>
          </div>

          <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden md:block"></div>

          {/* Date Filter */}
          <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700/50 p-1.5 rounded-lg border border-gray-200 dark:border-gray-600">
              <Calendar size={16} className="text-gray-400 ml-1" />
              <input type="date" value={startDate} onChange={e => onDateChange(e.target.value, endDate)} className="bg-transparent text-sm border-none focus:ring-0 text-gray-700 dark:text-gray-200 font-medium w-28 p-0 color-scheme-dark" />
              <span className="text-gray-400 font-bold">-</span>
              <input type="date" value={endDate} onChange={e => onDateChange(startDate, e.target.value)} className="bg-transparent text-sm border-none focus:ring-0 text-gray-700 dark:text-gray-200 font-medium w-28 p-0 color-scheme-dark" />
          </div>

          {/* Metric Tabs (Only for Chart View) */}
          {viewType === 'chart' && (
              <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg overflow-x-auto w-full md:w-auto custom-scrollbar">
                <button onClick={() => setActiveTab('volume')} className={`px-3 py-2 text-sm font-bold rounded-md whitespace-nowrap transition-all ${activeTab === 'volume' ? 'bg-white dark:bg-gray-600 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Doanh số</button>
                <button onClick={() => setActiveTab('apps')} className={`px-3 py-2 text-sm font-bold rounded-md whitespace-nowrap transition-all ${activeTab === 'apps' ? 'bg-white dark:bg-gray-600 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Hồ sơ</button>
                <button onClick={() => setActiveTab('activity')} className={`px-3 py-2 text-sm font-bold rounded-md whitespace-nowrap transition-all ${activeTab === 'activity' ? 'bg-white dark:bg-gray-600 text-orange-700 dark:text-orange-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Hoạt động</button>
              </div>
          )}

          {/* Ranking Scope Tabs (Only for Ranking View) */}
          {viewType === 'ranking' && (
              <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg overflow-x-auto w-full md:w-auto custom-scrollbar">
                <button onClick={() => setRankingScope('dsa')} className={`px-3 py-2 text-sm font-bold rounded-md whitespace-nowrap transition-all flex items-center ${rankingScope === 'dsa' ? 'bg-white dark:bg-gray-600 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                    <UserIcon size={14} className="mr-1"/> Cá nhân
                </button>
                <button onClick={() => setRankingScope('dss')} className={`px-3 py-2 text-sm font-bold rounded-md whitespace-nowrap transition-all flex items-center ${rankingScope === 'dss' ? 'bg-white dark:bg-gray-600 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                    <Users size={14} className="mr-1"/> Team
                </button>
                <button onClick={() => setRankingScope('sm')} className={`px-3 py-2 text-sm font-bold rounded-md whitespace-nowrap transition-all flex items-center ${rankingScope === 'sm' ? 'bg-white dark:bg-gray-600 text-purple-700 dark:text-purple-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
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
               {renderRankingColumn(`Top 20 Volume (Direct + FEOL)`, rankingData.topVolume, "volume", "yellow")}
               {renderRankingColumn(`Top 20 Banca`, rankingData.topBanca, "banca", "blue")}
               {renderRankingColumn(`Top 20 Thẻ CRC`, rankingData.topCRC, "crc", "red")}
            </div>
        )}

        {/* VIEW 2: CHART */}
        {viewType === 'chart' && (
            <div className="relative h-[400px] w-full mt-4 pb-4 overflow-x-auto custom-scrollbar">
                {chartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-400 italic bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-600">
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
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 dark:bg-gray-600 text-white text-xs py-1 px-2 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-lg arrow-bottom">
                                        {formatValue(activeTab === 'volume' ? item.directVolume : activeTab === 'apps' ? item.directApp : item.calls)}
                                    </div>
                                </div>

                                {/* Bar 2 (Secondary) */}
                                <div 
                                    className={`w-8 md:w-12 rounded-t-lg transition-all duration-500 relative group/bar shadow-sm opacity-60 hover:opacity-80 ${activeTab === 'volume' ? 'bg-emerald-300' : activeTab === 'apps' ? 'bg-blue-300' : 'bg-orange-300'}`}
                                    style={{ height: `${Math.max((activeTab === 'volume' ? item.onlineVolume : activeTab === 'apps' ? item.onlineApp : item.flyers) / maxValue * 100, 2)}%` }}
                                >
                                    {/* Value Label on Top (Hover) */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-700 dark:bg-gray-600 text-white text-xs py-1 px-2 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-lg">
                                        {formatValue(activeTab === 'volume' ? item.onlineVolume : activeTab === 'apps' ? item.onlineApp : item.flyers)}
                                    </div>
                                </div>

                                {/* Bar 3 (Tertiary - Only for Apps/Activity) */}
                                {activeTab !== 'volume' && (
                                    <div 
                                    className={`w-8 md:w-12 rounded-t-lg transition-all duration-500 relative group/bar shadow-sm ${activeTab === 'apps' ? 'bg-indigo-400' : 'bg-purple-400'}`}
                                    style={{ height: `${Math.max((activeTab === 'apps' ? item.directLoan : item.dlk) / maxValue * 100, 2)}%` }}
                                    >
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-700 dark:bg-gray-600 text-white text-xs py-1 px-2 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-lg">
                                            {formatValue(activeTab === 'apps' ? item.directLoan : item.dlk)}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* X-Axis Label */}
                            <div className="mt-4 text-xs font-bold text-gray-600 dark:text-gray-300 rotate-0 md:-rotate-45 origin-top-left md:translate-y-3 w-28 truncate text-center md:text-left hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-default" title={item.key}>
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
        <div className="flex justify-center space-x-6 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 flex-wrap">
            <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${activeTab === 'volume' ? 'bg-emerald-500' : activeTab === 'apps' ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                <span className="font-medium">{activeTab === 'volume' ? 'Direct Volume (Total)' : activeTab === 'apps' ? 'Direct App' : 'Cuộc gọi'}</span>
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

export const DashboardCharts = React.memo(DashboardChartsComponent);