import React, { useState, useMemo } from 'react';
import { SalesRecord, User } from '../types';
import { Calendar } from 'lucide-react';

interface DashboardChartsProps {
  data: SalesRecord[];
  currentUser: User;
  onDateChange: (start: string, end: string) => void;
  startDate: string;
  endDate: string;
}

type TabType = 'volume' | 'apps' | 'activity';

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ data, currentUser, onDateChange, startDate, endDate }) => {
  const [activeTab, setActiveTab] = useState<TabType>('volume');

  // Determine grouping key based on user role
  // DSA -> Group by Date (Show daily progress)
  // DSS -> Group by DSA Name (Show staff comparison)
  // SM -> Group by DSS Name (Show team comparison)
  // RSM/ADMIN -> Group by SM Name (Show region comparison)
  const groupKey = useMemo(() => {
    switch (currentUser.role) {
      case 'DSA': return 'reportDate';
      case 'DSS': return 'name'; // DSA Name
      case 'SM': return 'dss';
      case 'RSM': 
      case 'ADMIN': return 'smName';
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

  // Aggregate data
  const chartData = useMemo(() => {
    const grouped = data.reduce((acc, curr) => {
      const key = (curr as any)[groupKey] || 'N/A';
      if (!acc[key]) {
        acc[key] = {
          key,
          // Volume
          directVolume: 0,
          onlineVolume: 0,
          // Apps
          directApp: 0,
          onlineApp: 0,
          directLoan: 0,
          // Activity
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
      // Sort logic
      if (groupKey === 'reportDate') return a.key.localeCompare(b.key); // Date ascending
      if (activeTab === 'volume') return b.directVolume - a.directVolume;
      if (activeTab === 'apps') return b.directApp - a.directApp;
      return b.calls - a.calls;
    });
  }, [data, groupKey, activeTab]);

  // Determine Max Value for Scaling Y-Axis
  const maxValue = useMemo(() => {
    return Math.max(...chartData.map((d: any) => {
      if (activeTab === 'volume') return Math.max(d.directVolume, d.onlineVolume);
      if (activeTab === 'apps') return Math.max(d.directApp, d.onlineApp, d.directLoan);
      return Math.max(d.calls, d.flyers, d.dlk);
    }), 1); // Avoid div by 0
  }, [chartData, activeTab]);

  const formatValue = (val: number) => {
    if (activeTab === 'volume') {
        return new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(val);
    }
    return val.toString();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4">
        <div>
           <h3 className="text-lg font-bold text-gray-800">Biểu đồ hiệu quả kinh doanh</h3>
           <p className="text-sm text-gray-500">Phân tích theo: <span className="font-semibold text-emerald-600">{xAxisLabel}</span></p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
          {/* Chart Date Filter */}
          <div className="flex items-center space-x-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200 w-full md:w-auto">
              <Calendar size={16} className="text-gray-400 ml-1" />
              <input 
                type="date" 
                value={startDate} 
                onChange={e => onDateChange(e.target.value, endDate)}
                className="bg-transparent text-sm border-none focus:ring-0 text-gray-700 w-28 p-0" 
              />
              <span className="text-gray-400 font-bold">-</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => onDateChange(startDate, e.target.value)}
                className="bg-transparent text-sm border-none focus:ring-0 text-gray-700 w-28 p-0" 
              />
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
             <button 
               onClick={() => setActiveTab('volume')}
               className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap flex-1 md:flex-none ${activeTab === 'volume' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
               Doanh số
             </button>
             <button 
               onClick={() => setActiveTab('apps')}
               className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap flex-1 md:flex-none ${activeTab === 'apps' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
               Hồ sơ (Apps/Loan)
             </button>
             <button 
               onClick={() => setActiveTab('activity')}
               className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap flex-1 md:flex-none ${activeTab === 'activity' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
               Hoạt động
             </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative h-[400px] w-full mt-4 pb-12 overflow-x-auto custom-scrollbar">
         {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 italic">Chưa có dữ liệu để hiển thị</div>
         ) : (
            <div className="h-full flex items-end space-x-8 md:space-x-12 min-w-max px-4">
               {chartData.map((item: any) => (
                  <div key={item.key} className="flex flex-col items-center group relative min-w-[60px]">
                     {/* Bars Container */}
                     <div className="flex items-end space-x-1 h-[300px] relative">
                        {/* Bar 1 */}
                        <div 
                           className={`w-6 md:w-8 rounded-t-md transition-all duration-500 relative group/bar ${activeTab === 'volume' ? 'bg-emerald-500' : activeTab === 'apps' ? 'bg-blue-500' : 'bg-orange-400'}`}
                           style={{ height: `${Math.max((activeTab === 'volume' ? item.directVolume : activeTab === 'apps' ? item.directApp : item.calls) / maxValue * 100, 2)}%` }}
                        >
                           {/* Enhanced Tooltip */}
                           <div className="opacity-0 group-hover/bar:opacity-100 absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white text-xs p-2 rounded shadow-lg whitespace-nowrap z-50 pointer-events-none transition-opacity border border-gray-700 text-center">
                              <div className="font-bold border-b border-gray-600 pb-1 mb-1">{item.key}</div>
                              <div>
                                 {activeTab === 'volume' ? 'Direct Vol' : activeTab === 'apps' ? 'Direct App' : 'Cuộc gọi'}: 
                                 <span className="font-mono font-bold ml-1">{formatValue(activeTab === 'volume' ? item.directVolume : activeTab === 'apps' ? item.directApp : item.calls)}</span>
                              </div>
                           </div>
                        </div>

                        {/* Bar 2 */}
                        <div 
                           className={`w-6 md:w-8 rounded-t-md transition-all duration-500 relative group/bar ${activeTab === 'volume' ? 'bg-emerald-200' : activeTab === 'apps' ? 'bg-blue-200' : 'bg-orange-200'}`}
                           style={{ height: `${Math.max((activeTab === 'volume' ? item.onlineVolume : activeTab === 'apps' ? item.onlineApp : item.flyers) / maxValue * 100, 2)}%` }}
                        >
                            <div className="opacity-0 group-hover/bar:opacity-100 absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white text-xs p-2 rounded shadow-lg whitespace-nowrap z-50 pointer-events-none transition-opacity border border-gray-700 text-center">
                              <div className="font-bold border-b border-gray-600 pb-1 mb-1">{item.key}</div>
                              <div>
                                {activeTab === 'volume' ? 'Online Vol' : activeTab === 'apps' ? 'Online App' : 'Tờ rơi'}: 
                                <span className="font-mono font-bold ml-1">{formatValue(activeTab === 'volume' ? item.onlineVolume : activeTab === 'apps' ? item.onlineApp : item.flyers)}</span>
                              </div>
                           </div>
                        </div>

                         {/* Bar 3 (Only for apps/activity) */}
                         {activeTab !== 'volume' && (
                             <div 
                             className={`w-6 md:w-8 rounded-t-md transition-all duration-500 relative group/bar ${activeTab === 'apps' ? 'bg-red-400' : 'bg-purple-400'}`}
                             style={{ height: `${Math.max((activeTab === 'apps' ? item.directLoan : item.dlk) / maxValue * 100, 2)}%` }}
                             >
                                <div className="opacity-0 group-hover/bar:opacity-100 absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white text-xs p-2 rounded shadow-lg whitespace-nowrap z-50 pointer-events-none transition-opacity border border-gray-700 text-center">
                                    <div className="font-bold border-b border-gray-600 pb-1 mb-1">{item.key}</div>
                                    <div>
                                       {activeTab === 'apps' ? 'Loan' : 'ĐLK'}: 
                                       <span className="font-mono font-bold ml-1">{formatValue(activeTab === 'apps' ? item.directLoan : item.dlk)}</span>
                                    </div>
                                </div>
                             </div>
                         )}
                     </div>
                     
                     {/* X-Axis Label */}
                     <div className="mt-3 text-xs font-medium text-gray-600 rotate-0 md:-rotate-45 origin-top-left md:translate-y-2 w-24 truncate text-center md:text-left">
                        {item.key}
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>

      {/* Legend */}
      <div className="flex justify-center space-x-6 mt-4 pt-4 border-t text-sm text-gray-600 flex-wrap">
         <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${activeTab === 'volume' ? 'bg-emerald-500' : activeTab === 'apps' ? 'bg-blue-500' : 'bg-orange-400'}`}></div>
            <span>{activeTab === 'volume' ? 'Direct Volume' : activeTab === 'apps' ? 'Direct App' : 'Cuộc gọi'}</span>
         </div>
         <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${activeTab === 'volume' ? 'bg-emerald-200' : activeTab === 'apps' ? 'bg-blue-200' : 'bg-orange-200'}`}></div>
            <span>{activeTab === 'volume' ? 'Online Volume' : activeTab === 'apps' ? 'Online App' : 'Tờ rơi'}</span>
         </div>
         {activeTab !== 'volume' && (
             <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${activeTab === 'apps' ? 'bg-red-400' : 'bg-purple-400'}`}></div>
                <span>{activeTab === 'apps' ? 'Direct Loan' : 'ĐLK'}</span>
             </div>
         )}
      </div>
    </div>
  );
};