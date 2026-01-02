
import React, { useState, useMemo } from 'react';
import { SalesRecord, User } from '../types';
import { Award, BarChart, Users, Map, User as UserIcon, PieChart, AlignLeft, BarChart2, LayoutGrid, LineChart } from 'lucide-react';

interface DashboardChartsProps {
  data: SalesRecord[]; // Local filtered data for performance view
  globalData: SalesRecord[]; // Global date-filtered data for Leaderboard view
  currentUser: User;
  users?: User[]; // Full user list to fetch avatars and calculate Headcount
  onDateChange: (start: string, end: string) => void;
  startDate: string;
  endDate: string;
}

type TabType = 'financial' | 'apps' | 'activity';
type ViewType = 'chart' | 'ranking';
type ChartType = 'column' | 'bar' | 'pie' | 'combo';
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
  const [activeTab, setActiveTab] = useState<TabType>('financial');
  const [viewType, setViewType] = useState<ViewType>('chart');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [rankingScope, setRankingScope] = useState<RankingScope>('dsa');

  // Determine grouping key based on user role for the CHART
  const groupKey = useMemo(() => {
    switch (currentUser.role) {
      case 'DSA': return 'reportDate'; 
      case 'DSS': return 'name'; 
      case 'SM': return 'dss'; 
      case 'RSM': 
      case 'ADMIN': return 'smName'; 
      default: return 'name';
    }
  }, [currentUser.role]);

  const xAxisLabel = useMemo(() => {
    switch (currentUser.role) {
      case 'DSA': return 'Ngày';
      case 'DSS': return 'Nhân viên';
      case 'SM': return 'Team (DSS)';
      case 'RSM': 
      case 'ADMIN': return 'Khu vực (SM)';
      default: return 'Đối tượng';
    }
  }, [currentUser.role]);

  // --- CHART DATA AGGREGATION ---
  const chartData = useMemo(() => {
    const processData = data.length > 3000 ? data.slice(0, 3000) : data;

    const grouped = processData.reduce((acc, curr) => {
      const rawKey = (curr as any)[groupKey];
      if (!rawKey || rawKey === 'N/A' || (typeof rawKey === 'string' && rawKey.trim() === '')) return acc;
      const key = rawKey;

      if (!acc[key]) {
        acc[key] = {
          key,
          totalVolume: 0,
          totalBanca: 0,
          appPL: 0,
          appCRC: 0,
          loanCRC: 0,
          calls: 0,
          flyers: 0,
          ctv: 0,
          newCtv: 0,
          dlk: 0,
          newDlk: 0,
          adSpend: 0
        };
      }
      
      acc[key].totalVolume += (curr.directVolume || 0) + (curr.directVolumeFEOL || 0);
      acc[key].totalBanca += (curr.directBanca || 0);
      acc[key].appPL += (curr.directApp || 0) + (curr.directAppFEOL || 0);
      acc[key].appCRC += (curr.directAppCRC || 0);
      acc[key].loanCRC += (curr.directLoanCRC || 0);
      acc[key].calls += curr.callsMonth;
      acc[key].flyers += curr.flyers;
      acc[key].ctv += curr.ctv;
      acc[key].newCtv += curr.newCtv;
      acc[key].dlk += curr.dlk;
      acc[key].newDlk += curr.newDlk;
      acc[key].adSpend += (curr.adSpend / 1000000);
      return acc;
    }, {} as Record<string, any>);

    const sorted = Object.values(grouped).sort((a: any, b: any) => {
      if (groupKey === 'reportDate') return a.key.localeCompare(b.key); 
      if (activeTab === 'financial') return b.totalVolume - a.totalVolume;
      if (activeTab === 'apps') return (b.appPL + b.loanCRC) - (a.appPL + a.loanCRC);
      return Math.max(b.calls, b.adSpend) - Math.max(a.calls, a.adSpend);
    });

    return sorted.length > 50 ? sorted.slice(0, 50) : sorted;
  }, [data, groupKey, activeTab]);

  // --- RANKING DATA LOGIC ---
  const headcountMap = useMemo(() => {
      const counts: Record<string, number> = {};
      if (rankingScope === 'dsa') return counts;

      users.forEach(u => {
          if (u.role === 'DSA') {
              let dssName = '';
              let smName = '';
              const dssParent = users.find(p => p.id === u.parentId);
              if (dssParent && dssParent.role === 'DSS') {
                  dssName = dssParent.name;
                  const smParent = users.find(p => p.id === dssParent.parentId);
                  if (smParent) smName = smParent.name;
              } else if (dssParent && dssParent.role === 'SM') {
                  smName = dssParent.name;
              }
              if (rankingScope === 'dss' && dssName) counts[dssName] = (counts[dssName] || 0) + 1;
              else if (rankingScope === 'sm' && smName) counts[smName] = (counts[smName] || 0) + 1;
          }
      });
      return counts;
  }, [users, rankingScope]);

  const rankingData = useMemo(() => {
    if (viewType !== 'ranking') return { topVolume: [], topBanca: [], topCRC: [], title: '' };

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
        if (!key || key === 'N/A') return acc;
        const displayName = (curr as any)[nameKey] || key;
        if (!acc[key]) {
            acc[key] = {
                id: key,
                name: displayName, 
                dss: curr.dss,
                sm: curr.smName,
                volume: 0,
                banca: 0,
                crc: 0, 
                dsaSet: new Set<string>() 
            };
        }
        acc[key].volume += (curr.directVolume || 0) + (curr.directVolumeFEOL || 0);
        acc[key].banca += (curr.directBanca || 0);
        acc[key].crc += (curr.directLoanCRC || 0);
        acc[key].dsaSet.add(curr.dsaCode); 
        return acc;
    }, {} as Record<string, any>);

    const allItems: RankingItem[] = Object.values(grouped).map((item: any) => {
        let finalHeadcount = item.dsaSet.size;
        if (rankingScope !== 'dsa' && headcountMap[item.name]) {
            finalHeadcount = headcountMap[item.name];
        }
        return { ...item, headcount: rankingScope === 'dsa' ? 1 : finalHeadcount };
    });

    return {
        topVolume: [...allItems].sort((a, b) => b.volume - a.volume).slice(0, 20).filter(i => i.volume > 0),
        topBanca: [...allItems].sort((a, b) => b.banca - a.banca).slice(0, 20).filter(i => i.banca > 0),
        topCRC: [...allItems].sort((a, b) => b.crc - a.crc).slice(0, 20).filter(i => i.crc > 0),
        title: rankTitle
    };
  }, [globalData, rankingScope, headcountMap, viewType]);

  const maxValue = useMemo(() => {
    if (viewType === 'chart') {
        return Math.max(...chartData.map((d: any) => {
          if (chartType === 'combo') return d.totalVolume; 
          if (activeTab === 'financial') return Math.max(d.totalVolume, d.totalBanca);
          if (activeTab === 'apps') return Math.max(d.appPL, d.appCRC, d.loanCRC);
          return Math.max(d.calls, d.flyers, d.adSpend); 
        }), 1);
    }
    return 1;
  }, [chartData, activeTab, viewType, chartType]);

  const maxAppValue = useMemo(() => chartType === 'combo' ? Math.max(...chartData.map((d: any) => d.appPL), 1) : 1, [chartData, chartType]);
  const formatValue = (val: number) => new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(val);

  const renderRankingColumn = (title: string, items: RankingItem[], metricKey: 'volume' | 'banca' | 'crc', colorTheme: 'yellow' | 'blue' | 'red') => {
      const maxVal = Math.max(...items.map(i => i[metricKey]), 1);
      
      const themeStyles = {
          yellow: { header: 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800', bar: 'bg-yellow-400', text: 'text-yellow-700 dark:text-yellow-400' },
          blue: { header: 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800', bar: 'bg-blue-400', text: 'text-blue-700 dark:text-blue-400' },
          red: { header: 'text-red-700 bg-red-50 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800', bar: 'bg-red-400', text: 'text-red-700 dark:text-red-400' },
      };
      
      const style = themeStyles[colorTheme];

      return (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col h-full transition-colors duration-300 relative">
               <div className={`p-3 font-bold text-center border-b uppercase text-sm tracking-wider sticky top-0 z-20 rounded-t-xl shadow-sm ${style.header}`}>
                   {title}
               </div>
               <div className="flex-1 p-1 overflow-y-auto custom-scrollbar max-h-[1200px]">
                   {items.length === 0 ? (
                       <div className="h-32 flex items-center justify-center text-gray-400 text-xs italic">Chưa có dữ liệu</div>
                   ) : (
                       items.map((item, idx) => {
                           const isTop1 = idx === 0;
                           const rawValue = item[metricKey];
                           const widthPercent = (rawValue / maxVal) * 100;
                           
                           let avatar = null;
                           if (rankingScope === 'dsa') {
                               const user = users.find(u => u.dsaCode === item.id);
                               avatar = user?.avatar;
                           } else {
                               const targetRole = rankingScope === 'dss' ? 'DSS' : 'SM';
                               const user = users.find(u => u.name === item.id && u.role === targetRole); 
                               avatar = user?.avatar;
                           }

                           return (
                               <div key={idx} className="flex items-center gap-2 mb-1.5 last:mb-0 p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0">
                                   <div className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0 ${isTop1 ? 'bg-yellow-400 text-yellow-900 shadow-sm' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                                       {idx + 1}
                                   </div>
                                   <div className="w-10 h-10 rounded-full border border-gray-100 dark:border-gray-600 overflow-hidden flex-shrink-0 bg-gray-50 dark:bg-gray-700 shadow-sm">
                                       {avatar ? (
                                           <img src={avatar} alt="" className="w-full h-full object-cover"/> 
                                       ) : (
                                           <div className={`w-full h-full flex items-center justify-center text-sm font-bold ${rankingScope !== 'dsa' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-gray-100 text-gray-400 dark:bg-gray-600 dark:text-gray-300'}`}>
                                               {rankingScope === 'dss' ? 'TM' : rankingScope === 'sm' ? 'KV' : item.name.charAt(0)}
                                           </div>
                                       )}
                                   </div>
                                   <div className="flex-1 min-w-0">
                                       <div className="flex justify-between items-center text-xs mb-0.5">
                                           <div className="min-w-0 truncate pr-1">
                                              <span className={`font-bold block truncate text-xs ${isTop1 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>{item.name}</span>
                                              
                                              {/* UPDATE: Change DSS color for DSA ranking */}
                                              {rankingScope === 'dsa' && item.dss && (
                                                <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 block truncate">
                                                  DSS: {item.dss}
                                                </span>
                                              )}
                                              
                                              {/* UPDATE: Add SM name below DSS for Team ranking */}
                                              {rankingScope === 'dss' && item.sm && (
                                                <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 block truncate">
                                                  SM: {item.sm}
                                                </span>
                                              )}
                                           </div>
                                           <span className={`font-bold font-mono text-right text-[11px] ${style.text}`}>
                                               {metricKey === 'crc' ? rawValue : formatValue(rawValue)}
                                           </span>
                                       </div>
                                       <div className="h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
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

  const renderColumnChart = () => (
    <div className="h-full flex items-end space-x-8 md:space-x-12 min-w-max px-4 pt-10 pb-2">
        {chartData.map((item: any) => (
            <div key={item.key} className="flex flex-col items-center group relative min-w-[60px]">
                <div className="flex items-end space-x-1 h-[300px] relative">
                    <div className={`w-8 md:w-10 rounded-t-lg transition-all duration-500 relative shadow-sm ${activeTab === 'financial' ? 'bg-emerald-500' : activeTab === 'apps' ? 'bg-indigo-500' : 'bg-orange-500'}`} style={{ height: `${Math.max(((activeTab === 'financial' ? item.totalVolume : activeTab === 'apps' ? item.appPL : item.calls) / maxValue) * 100, 2)}%` }}>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[10px] md:text-xs font-bold text-gray-700 dark:text-gray-200 whitespace-nowrap z-20">
                            {formatValue(activeTab === 'financial' ? item.totalVolume : activeTab === 'apps' ? item.appPL : item.calls)}
                        </div>
                    </div>
                    <div className={`w-8 md:w-10 rounded-t-lg transition-all duration-500 relative shadow-sm ${activeTab === 'financial' ? 'bg-blue-500' : activeTab === 'apps' ? 'bg-rose-500' : 'bg-amber-400'}`} style={{ height: `${Math.max(((activeTab === 'financial' ? item.totalBanca : activeTab === 'apps' ? item.appCRC : item.flyers) / maxValue) * 100, 2)}%` }}>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[10px] md:text-xs font-bold text-gray-700 dark:text-gray-200 whitespace-nowrap z-20">
                            {formatValue(activeTab === 'financial' ? item.totalBanca : activeTab === 'apps' ? item.appCRC : item.flyers)}
                        </div>
                    </div>
                    {(activeTab === 'apps' || activeTab === 'activity') && (
                        // Fix line 308: Added missing opening quote for 'bg-red-500'
                        <div className={`w-8 md:w-10 rounded-t-lg transition-all duration-500 relative shadow-sm ${activeTab === 'apps' ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ height: `${Math.max(((activeTab === 'apps' ? item.loanCRC : item.adSpend) / maxValue) * 100, 2)}%` }}>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[10px] md:text-xs font-bold text-gray-700 dark:text-gray-200 whitespace-nowrap z-20">
                                {formatValue(activeTab === 'apps' ? item.loanCRC : item.adSpend)}{activeTab === 'activity' && 'Tr'}
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-4 text-xs font-bold text-gray-600 dark:text-gray-300 rotate-0 md:-rotate-45 origin-top-left md:translate-y-3 w-28 truncate text-center md:text-left cursor-default" title={item.key}>{item.key}</div>
            </div>
        ))}
    </div>
  );

  const renderBarChart = () => (
    <div className="flex flex-col space-y-4 w-full h-full overflow-y-auto px-2">
        {chartData.map((item: any) => (
            <div key={item.key} className="flex items-start w-full border-b border-gray-50 dark:border-gray-700 pb-3 last:border-0">
                <div className="w-32 text-xs font-bold text-gray-700 dark:text-gray-300 truncate mr-3 text-right pt-1" title={item.key}>{item.key}</div>
                {activeTab !== 'activity' ? (
                  <div className="flex-1 flex flex-col space-y-1.5">
                      <div className="flex items-center">
                          <div className={`h-5 rounded-r-md transition-all duration-500 ${activeTab === 'financial' ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${Math.max(((activeTab === 'financial' ? item.totalVolume : item.appPL) / maxValue) * 100, 2)}%` }}></div>
                          <span className="ml-2 text-xs font-bold text-gray-600 dark:text-gray-400">{formatValue(activeTab === 'financial' ? item.totalVolume : item.appPL)}</span>
                      </div>
                      <div className="flex items-center">
                          <div className={`h-5 rounded-r-md transition-all duration-500 ${activeTab === 'financial' ? 'bg-blue-500' : 'bg-rose-500'}`} style={{ width: `${Math.max(((activeTab === 'financial' ? item.totalBanca : item.appCRC) / maxValue) * 100, 2)}%` }}></div>
                          <span className="ml-2 text-xs font-bold text-gray-600 dark:text-gray-400">{formatValue(activeTab === 'financial' ? item.totalBanca : item.appCRC)}</span>
                      </div>
                      {activeTab === 'apps' && (
                          <div className="flex items-center">
                              <div className="h-5 rounded-r-md transition-all duration-500 bg-emerald-500" style={{ width: `${Math.max((item.loanCRC / maxValue) * 100, 2)}%` }}></div>
                              <span className="ml-2 text-xs font-bold text-gray-600 dark:text-gray-400">{formatValue(item.loanCRC)}</span>
                          </div>
                      )}
                  </div>
                ) : (
                   <div className="flex-1 flex flex-col space-y-1.5">
                       <div className="flex items-center">
                           <div className="h-4 rounded-r-md transition-all duration-500 bg-orange-500" style={{ width: `${Math.max((item.calls / maxValue) * 100, 2)}%` }}></div>
                           <span className="ml-2 text-[10px] font-bold text-gray-500 dark:text-gray-400">{item.calls} Calls</span>
                       </div>
                       <div className="flex items-center">
                           <div className="h-4 rounded-r-md transition-all duration-500 bg-amber-400" style={{ width: `${Math.max((item.flyers / maxValue) * 100, 2)}%` }}></div>
                           <span className="ml-2 text-[10px] font-bold text-gray-500 dark:text-gray-400">{formatValue(item.flyers)} Tờ rơi</span>
                       </div>
                       <div className="flex items-center">
                           <div className="h-4 rounded-r-md transition-all duration-500 bg-red-500" style={{ width: `${Math.max((item.adSpend / maxValue) * 100, 2)}%` }}></div>
                           <span className="ml-2 text-[10px] font-bold text-red-600 dark:text-red-400">{formatValue(item.adSpend)} Tr QC</span>
                       </div>
                       <div className="flex gap-2 mt-1 pl-1">
                          {item.ctv > 0 && <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">CTV: {item.ctv}</span>}
                          {item.dlk > 0 && <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">ĐLK: {item.dlk}</span>}
                       </div>
                   </div>
                )}
            </div>
        ))}
    </div>
  );

  const renderPieChart = () => {
      const primaryMetricKey = activeTab === 'financial' ? 'totalVolume' : activeTab === 'apps' ? 'appPL' : 'calls';
      const total = chartData.reduce((sum, item: any) => sum + item[primaryMetricKey], 0);
      const sorted = [...chartData].sort((a: any, b: any) => b[primaryMetricKey] - a[primaryMetricKey]);
      const topSlices = sorted.slice(0, 6);
      const othersValue = sorted.slice(6).reduce((sum, item: any) => sum + item[primaryMetricKey], 0);
      const pieData = [...topSlices];
      if (othersValue > 0) pieData.push({ key: 'Khác', [primaryMetricKey]: othersValue });
      const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#9ca3af'];
      let currentAngle = 0;
      const gradientParts = pieData.map((item: any, index) => {
          const value = item[primaryMetricKey];
          const percentage = (value / total) * 100;
          const endAngle = currentAngle + (percentage * 3.6);
          const str = `${colors[index % colors.length]} ${currentAngle}deg ${endAngle}deg`;
          currentAngle = endAngle;
          return str;
      });
      return (
          <div className="h-full flex flex-col md:flex-row items-center justify-center gap-8">
              <div className="relative w-64 h-64 rounded-full shadow-lg border-4 border-white dark:border-gray-700" style={{ background: `conic-gradient(${gradientParts.join(', ')})` }}>
                  <div className="absolute inset-0 m-auto w-32 h-32 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center flex-col">
                      <span className="text-xs text-gray-500 font-bold uppercase">Tổng</span>
                      <span className="text-lg font-bold text-gray-800 dark:text-white">{formatValue(total)}</span>
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                  {pieData.map((item: any, index) => (
                      <div key={index} className="flex items-center">
                          <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colors[index % colors.length] }}></div>
                          <span className="font-bold text-gray-700 dark:text-gray-300 mr-2">{item.key}:</span>
                          <span className="text-gray-500 dark:text-gray-400">{((item[primaryMetricKey]/total)*100).toFixed(1)}%</span>
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  const renderComboChart = () => {
    const itemWidth = 80; 
    const gap = 32; 
    const chartHeight = 300;
    const totalWidth = chartData.length * (itemWidth + gap);
    const points = chartData.map((d: any, i: number) => `${i * (itemWidth + gap) + (itemWidth / 2)},${chartHeight - (d.appPL / maxAppValue) * chartHeight}`).join(' ');
    return (
        <div className="relative h-full" style={{ width: `${totalWidth}px` }}>
            <svg className="absolute top-0 left-0 w-full h-[300px] z-10 pointer-events-none overflow-visible">
                <polyline fill="none" stroke="#f97316" strokeWidth="3" points={points} className="drop-shadow-md" />
                {chartData.map((d: any, i: number) => (
                    <circle key={i} cx={i * (itemWidth + gap) + (itemWidth / 2)} cy={chartHeight - (d.appPL / maxAppValue) * chartHeight} r="5" fill="white" stroke="#f97316" strokeWidth="3" />
                ))}
            </svg>
            <div className="h-full flex items-end">
                {chartData.map((item: any) => (
                    <div key={item.key} className="flex flex-col items-center group relative" style={{ width: `${itemWidth}px`, marginRight: `${gap}px` }}>
                        <div className="flex items-end justify-center w-full h-[300px] relative">
                            <div className="w-12 rounded-t-lg transition-all duration-500 relative shadow-sm bg-emerald-500/90 hover:bg-emerald-500" style={{ height: `${Math.max((item.totalVolume / maxValue) * 100, 2)}%` }}>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[10px] md:text-xs font-bold text-gray-700 dark:text-gray-200 whitespace-nowrap z-20">{formatValue(item.totalVolume)}</div>
                            </div>
                            <div className="absolute left-1/2 -translate-x-1/2 bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full z-20 shadow-sm" style={{ bottom: `${(item.appPL / maxAppValue) * 100}%`, marginBottom: '10px' }}>{item.appPL} App</div>
                        </div>
                        <div className="mt-4 text-xs font-bold text-gray-600 dark:text-gray-300 w-full truncate text-center cursor-default" title={item.key}>{item.key}</div>
                    </div>
                ))}
            </div>
        </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 h-full flex flex-col transition-colors duration-300">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <div>
           <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
              {viewType === 'ranking' ? <Award className="mr-2 text-yellow-500" /> : <BarChart className="mr-2 text-emerald-600 dark:text-emerald-400" />}
              {viewType === 'ranking' ? 'Bảng xếp hạng thi đua' : 'Biểu đồ hiệu quả kinh doanh'}
           </h3>
           <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">{viewType === 'ranking' ? `Vinh danh các thành tích xuất sắc nhất` : `Phân tích dữ liệu theo: ${xAxisLabel}`}</p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
          {viewType === 'chart' && (
              <div className="relative">
                  <select value={chartType} onChange={(e) => setChartType(e.target.value as ChartType)} className="appearance-none bg-gray-100 dark:bg-gray-700 border-none rounded-lg py-2 pl-9 pr-8 text-sm font-bold text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 cursor-pointer">
                      <option value="column">Biểu đồ Cột</option>
                      <option value="bar">Biểu đồ Ngang</option>
                      <option value="pie">Biểu đồ Tròn</option>
                      <option value="combo">Biểu đồ Hỗn hợp</option>
                  </select>
                  {chartType === 'column' && <BarChart2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"/>}
                  {chartType === 'bar' && <AlignLeft size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none transform rotate-90"/>}
                  {chartType === 'pie' && <PieChart size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"/>}
                  {chartType === 'combo' && <LineChart size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"/>}
              </div>
          )}
          <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex shadow-inner">
             <button onClick={() => setViewType('chart')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center transition-all ${viewType === 'chart' ? 'bg-white dark:bg-gray-600 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}><LayoutGrid size={16} className="mr-2"/> Biểu Đồ</button>
             <button onClick={() => setViewType('ranking')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center transition-all ${viewType === 'ranking' ? 'bg-white dark:bg-gray-600 text-yellow-600 dark:text-yellow-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}><Award size={16} className="mr-2"/> Xếp Hạng</button>
          </div>
          {viewType === 'chart' && chartType !== 'combo' && (
              <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg overflow-x-auto w-full md:w-auto custom-scrollbar">
                <button onClick={() => setActiveTab('financial')} className={`px-3 py-2 text-sm font-bold rounded-md whitespace-nowrap transition-all ${activeTab === 'financial' ? 'bg-white dark:bg-gray-600 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Doanh số</button>
                <button onClick={() => setActiveTab('apps')} className={`px-3 py-2 text-sm font-bold rounded-md whitespace-nowrap transition-all ${activeTab === 'apps' ? 'bg-white dark:bg-gray-600 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Sản phẩm (App/Thẻ)</button>
                <button onClick={() => setActiveTab('activity')} className={`px-3 py-2 text-sm font-bold rounded-md whitespace-nowrap transition-all ${activeTab === 'activity' ? 'bg-white dark:bg-gray-600 text-orange-700 dark:text-orange-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Hoạt động</button>
              </div>
          )}
          {viewType === 'ranking' && (
              <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg overflow-x-auto w-full md:w-auto custom-scrollbar">
                <button onClick={() => setRankingScope('dsa')} className={`px-3 py-2 text-sm font-bold rounded-md whitespace-nowrap transition-all flex items-center ${rankingScope === 'dsa' ? 'bg-white dark:bg-gray-600 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}><UserIcon size={14} className="mr-1"/> Cá nhân</button>
                <button onClick={() => setRankingScope('dss')} className={`px-3 py-2 text-sm font-bold rounded-md whitespace-nowrap transition-all flex items-center ${rankingScope === 'dss' ? 'bg-white dark:bg-gray-600 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}><Users size={14} className="mr-1"/> Team</button>
                <button onClick={() => setRankingScope('sm')} className={`px-3 py-2 text-sm font-bold rounded-md whitespace-nowrap transition-all flex items-center ${rankingScope === 'sm' ? 'bg-white dark:bg-gray-600 text-purple-700 dark:text-purple-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}><Map size={14} className="mr-1"/> Khu vực</button>
              </div>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-[400px]">
        {viewType === 'ranking' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full animate-in fade-in slide-in-from-bottom-4">
               {renderRankingColumn(`Top 20 Volume`, rankingData.topVolume, "volume", "yellow")}
               {renderRankingColumn(`Top 20 Banca`, rankingData.topBanca, "banca", "blue")}
               {renderRankingColumn(`Top 20 Loan CRC`, rankingData.topCRC, "crc", "red")}
            </div>
        ) : (
            <div className="relative h-[400px] w-full mt-4 pb-4 overflow-x-auto custom-scrollbar">
                {chartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-400 italic bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-600">Chưa có dữ liệu để hiển thị biểu đồ</div>
                ) : (
                    <>
                        {chartType === 'column' && renderColumnChart()}
                        {chartType === 'bar' && renderBarChart()}
                        {chartType === 'pie' && renderPieChart()}
                        {chartType === 'combo' && renderComboChart()}
                    </>
                )}
            </div>
        )}
      </div>
      {viewType === 'chart' && (
        <div className="flex justify-center space-x-6 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 flex-wrap">
            {chartType !== 'combo' ? (
              <>
                <div className="flex items-center"><div className={`w-3 h-3 rounded-full mr-2 ${activeTab === 'financial' ? 'bg-emerald-500' : activeTab === 'apps' ? 'bg-indigo-500' : 'bg-orange-500'}`}></div><span className="font-medium">{activeTab === 'financial' ? 'Volume (Direct + FEOL)' : activeTab === 'apps' ? 'App PL (Tổng)' : 'Calls (Cuộc gọi)'}</span></div>
                {chartType !== 'pie' && <div className="flex items-center"><div className={`w-3 h-3 rounded-full mr-2 ${activeTab === 'financial' ? 'bg-blue-500' : activeTab === 'apps' ? 'bg-rose-500' : 'bg-amber-400'}`}></div><span className="font-medium">{activeTab === 'financial' ? 'Banca' : activeTab === 'apps' ? 'App CRC (Thẻ)' : 'Flyers (Tờ rơi)'}</span></div>}
                {activeTab === 'apps' && chartType !== 'pie' && <div className="flex items-center"><div className="w-3 h-3 rounded-full mr-2 bg-emerald-500"></div><span className="font-medium">Loan CRC (Đã cấp)</span></div>}
                {activeTab === 'activity' && chartType !== 'pie' && (
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center"><div className="w-3 h-3 rounded-full mr-2 bg-red-500"></div><span className="font-medium">Chi phí QC (x1.000.000đ)</span></div>
                        <div className="flex items-center"><div className="w-3 h-3 rounded-full mr-2 bg-blue-500"></div><span className="font-medium">CTV</span></div>
                        <div className="flex items-center"><div className="w-3 h-3 rounded-full mr-2 bg-purple-500"></div><span className="font-medium">ĐLK</span></div>
                    </div>
                )}
              </>
            ) : (
              <>
                 <div className="flex items-center"><div className="w-3 h-3 rounded-full mr-2 bg-emerald-500"></div><span className="font-medium">Doanh Số (Cột)</span></div>
                 <div className="flex items-center"><div className="w-8 h-1 mr-2 bg-orange-500 flex items-center justify-center relative"><div className="w-2 h-2 rounded-full bg-white border-2 border-orange-500"></div></div><span className="font-medium">Tổng App (Đường)</span></div>
              </>
            )}
        </div>
      )}
    </div>
  );
};

export const DashboardCharts = React.memo(DashboardChartsComponent);
