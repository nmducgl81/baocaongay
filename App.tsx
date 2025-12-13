import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SalesRecord, DashboardStats, User, ViewMode, AppScreen } from './types';
import { generateMockData, MOCK_USERS } from './services/mockData';
import { authService } from './services/authService';
import { SalesTable } from './components/SalesTable';
import { StatsCard } from './components/StatsCard';
import { EntryForm } from './components/EntryForm';
import { Login } from './components/Login';
import { DashboardCharts } from './components/DashboardCharts';
import { DSADetail } from './components/DSADetail';
import { UserManagement } from './components/UserManagement';
import { ChatBot } from './components/ChatBot';

import { 
  Users, 
  DollarSign, 
  FileText, 
  Plus, 
  Loader2,
  Calendar,
  LogOut,
  UserCircle,
  Download,
  BarChart2,
  Table as TableIcon,
  Settings,
  CreditCard,
  Percent,
  Briefcase,
  Megaphone,
  RefreshCw,
  Filter,
  Clock,
  Trophy,
  BellRing,
  AlertTriangle
} from 'lucide-react';

const MOTIVATIONAL_QUOTES = [
  "🎯 Thành công không phải là đích đến, mà là một hành trình của sự kiên trì!",
  "🚀 Mỗi ngày cố gắng thêm 1% tốt hơn ngày hôm qua.",
  "💪 Đừng mong đích đến sẽ thay đổi nếu bạn không thay đổi con đường.",
  "🔥 Khó khăn hôm nay là sức mạnh của ngày mai. Keep pushing!",
  "💎 Áp lực tạo nên kim cương. Hãy tỏa sáng theo cách của bạn!",
  "🌟 Thái độ quyết định trình độ. Hãy làm việc bằng cả trái tim!",
  "💰 Doanh số cao là phần thưởng cho những nỗ lực không mệt mỏi.",
  "🏆 Người chiến thắng không bao giờ bỏ cuộc, người bỏ cuộc không bao giờ chiến thắng."
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Initialize Users from LocalStorage or Mock Data
  const [users, setUsers] = useState<User[]>(() => {
    const savedUsers = localStorage.getItem('app_users');
    return savedUsers ? JSON.parse(savedUsers) : MOCK_USERS;
  });

  // Initialize Sales Data from LocalStorage or Mock Data
  const [allData, setAllData] = useState<SalesRecord[]>(() => {
    const savedData = localStorage.getItem('sales_records');
    return savedData ? JSON.parse(savedData) : [];
  });

  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SalesRecord | null>(null);
  
  // Navigation State
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('dashboard');
  const [selectedDSA, setSelectedDSA] = useState<string | null>(null);
  
  // View/Filter State with LocalStorage Persistence
  // CHANGE: Default to 'chart' as requested
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('viewMode') as ViewMode) || 'chart';
  });

  const [startDate, setStartDate] = useState<string>(() => {
    return localStorage.getItem('startDate') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  });

  const [endDate, setEndDate] = useState<string>(() => {
    return localStorage.getItem('endDate') || new Date().toISOString().split('T')[0];
  });

  const [statusFilter, setStatusFilter] = useState<string>(() => {
    return localStorage.getItem('statusFilter') || 'all';
  });

  // NEW FILTERS: SM and DSS
  const [smFilter, setSmFilter] = useState<string>(() => {
    return localStorage.getItem('smFilter') || 'all';
  });
  const [dssFilter, setDssFilter] = useState<string>(() => {
    return localStorage.getItem('dssFilter') || 'all';
  });

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const dataRef = useRef(allData);

  // Random Quote State
  const randomQuote = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    return MOTIVATIONAL_QUOTES[randomIndex];
  }, []);

  // Update ref when state changes (for interval to access latest state)
  useEffect(() => {
    dataRef.current = allData;
  }, [allData]);

  // Persist Users to LocalStorage whenever they change
  useEffect(() => {
    localStorage.setItem('app_users', JSON.stringify(users));
  }, [users]);

  // Persist Sales Records to LocalStorage whenever they change
  useEffect(() => {
    if (allData.length > 0) {
      localStorage.setItem('sales_records', JSON.stringify(allData));
    }
  }, [allData]);

  // Persist state changes to localStorage
  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('startDate', startDate);
  }, [startDate]);

  useEffect(() => {
    localStorage.setItem('endDate', endDate);
  }, [endDate]);

  useEffect(() => {
    localStorage.setItem('statusFilter', statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem('smFilter', smFilter);
  }, [smFilter]);

  useEffect(() => {
    localStorage.setItem('dssFilter', dssFilter);
  }, [dssFilter]);

  // Initial Data Load Logic
  useEffect(() => {
    // If no data in local storage, load mock data
    if (allData.length === 0) {
       const initialData = generateMockData();
       setAllData(initialData);
       localStorage.setItem('sales_records', JSON.stringify(initialData));
    }
  }, []);

  // --- REAL-TIME SYNC OPTIMIZATION ---
  useEffect(() => {
    const checkForUpdates = () => {
      const savedData = localStorage.getItem('sales_records');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (JSON.stringify(parsedData) !== JSON.stringify(dataRef.current)) {
          console.log("Detecting external data change, updating UI...");
          setAllData(parsedData);
          setLastUpdated(new Date());
        }
      }
    };
    const intervalId = setInterval(checkForUpdates, 15000);
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sales_records') {
        checkForUpdates();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // --- SYNC LOGIC: AUTO-UPDATE SALES RECORDS WHEN USERS CHANGE ---
  useEffect(() => {
    if (users.length === 0) return;

    setAllData(currentData => {
        const newData = [...currentData];
        let hasChanges = false;
        const today = new Date().toISOString().split('T')[0];

        // Helper to find hierarchy names
        const getHierarchy = (user: User) => {
            let dss = '';
            let smName = '';
            if (user.parentId) {
                const parent = users.find(u => u.id === user.parentId);
                if (parent) {
                    if (parent.role === 'DSS') {
                        dss = parent.name;
                        const sm = users.find(u => u.id === parent.parentId);
                        if (sm) smName = sm.name;
                    } else if (parent.role === 'SM') {
                        smName = parent.name;
                    }
                }
            }
            return { dss, smName };
        };

        const dsaUsers = users.filter(u => u.role === 'DSA' && u.dsaCode);
        
        dsaUsers.forEach(user => {
            if (!user.dsaCode) return;

            const existingRecordIndex = newData.findIndex(r => r.dsaCode === user.dsaCode);
            const { dss, smName } = getHierarchy(user);

            if (existingRecordIndex === -1) {
                newData.push({
                    id: `auto-${user.id}-${Date.now()}`,
                    dsaCode: user.dsaCode,
                    name: user.name,
                    dss: dss,
                    smName: smName,
                    reportDate: today,
                    status: 'Chưa báo cáo',
                    approvalStatus: 'Approved',
                    directApp: 0, directLoan: 0, directAppCRC: 0, directLoanCRC: 0,
                    directVolume: 0, directBanca: 0, directRol: '0.0%',
                    onlineApp: 0, onlineVolume: 0,
                    ctv: 0, newCtv: 0, flyers: 0, dlk: 0, newDlk: 0,
                    callsMonth: 0, adSpend: 0, refs: 0
                });
                hasChanges = true;
            } else {
                const rec = newData[existingRecordIndex];
                if (rec.dss !== dss || rec.smName !== smName || rec.name !== user.name) {
                    newData[existingRecordIndex] = {
                        ...rec,
                        name: user.name,
                        dss: dss,
                        smName: smName
                    };
                    hasChanges = true;
                }
            }
        });

        return hasChanges ? newData : currentData;
    });
  }, [users]);

  // Compute Available Options for SM and DSS based on Current User and selections
  const { smOptions, dssOptions } = useMemo(() => {
    if (!currentUser) return { smOptions: [], dssOptions: [] };

    let availableSMs: User[] = [];
    let availableDSSs: User[] = [];

    if (currentUser.role === 'ADMIN') {
        availableSMs = users.filter(u => u.role === 'SM');
        availableDSSs = users.filter(u => u.role === 'DSS');
    } else if (currentUser.role === 'RSM') {
        availableSMs = users.filter(u => u.role === 'SM' && u.parentId === currentUser.id);
        const smIds = availableSMs.map(sm => sm.id);
        availableDSSs = users.filter(u => u.role === 'DSS' && smIds.includes(u.parentId || ''));
    } else if (currentUser.role === 'SM') {
        availableSMs = [currentUser];
        availableDSSs = users.filter(u => u.role === 'DSS' && u.parentId === currentUser.id);
    } else if (currentUser.role === 'DSS') {
        availableDSSs = [currentUser];
    }

    if (smFilter !== 'all') {
        const selectedSmUser = users.find(u => u.name === smFilter && u.role === 'SM');
        if (selectedSmUser) {
            availableDSSs = availableDSSs.filter(u => u.parentId === selectedSmUser.id);
        }
    }

    return { 
        smOptions: availableSMs.sort((a,b) => a.name.localeCompare(b.name)), 
        dssOptions: availableDSSs.sort((a,b) => a.name.localeCompare(b.name)) 
    };
  }, [users, currentUser, smFilter]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!currentUser) return [];
    
    const visibleDSAIds = authService.getVisibleDSAIds(currentUser, users);
    let data = allData.filter(record => visibleDSAIds.includes(record.dsaCode));

    data = data.filter(record => 
      record.reportDate >= startDate && record.reportDate <= endDate
    );

    if (statusFilter !== 'all') {
      data = data.filter(record => record.status === statusFilter);
    }
    if (smFilter !== 'all') {
        data = data.filter(record => record.smName === smFilter);
    }
    if (dssFilter !== 'all') {
        data = data.filter(record => record.dss === dssFilter);
    }

    return data;
  }, [allData, currentUser, startDate, endDate, statusFilter, smFilter, dssFilter, users]);

  const dateFilteredGlobalData = useMemo(() => {
    return allData.filter(record => 
        record.reportDate >= startDate && record.reportDate <= endDate
    );
  }, [allData, startDate, endDate]);

  const stats: DashboardStats = useMemo(() => {
    return filteredData.reduce(
      (acc, curr) => ({
        totalRecords: acc.totalRecords + 1,
        reportedCount: curr.status === 'Đã báo cáo' ? acc.reportedCount + 1 : acc.reportedCount,
        totalVolume: acc.totalVolume + curr.directVolume,
        totalApps: acc.totalApps + curr.directApp,
        totalLoanCRC: acc.totalLoanCRC + (curr.directLoanCRC || 0), 
        totalBanca: acc.totalBanca + curr.directBanca,
      }),
      { totalRecords: 0, reportedCount: 0, totalVolume: 0, totalApps: 0, totalLoanCRC: 0, totalBanca: 0 }
    );
  }, [filteredData]);

  // --- DSA RANKING & REPORTING STATUS LOGIC ---
  const dsaInfo = useMemo(() => {
    if (currentUser?.role !== 'DSA') return null;
    
    const today = new Date().toISOString().split('T')[0];
    const isReportedToday = allData.some(r => 
        r.dsaCode === currentUser.dsaCode && 
        r.reportDate === today && 
        r.status === 'Đã báo cáo'
    );

    // Calculate Rank
    // 1. Get all DSAs
    const allDSAs = users.filter(u => u.role === 'DSA');
    
    // 2. Aggregate Volume for the current filtered date range (using filteredData)
    // Note: Use dateFilteredGlobalData to compare against EVERYONE in the same timeframe
    const volumeMap = new Map<string, number>();
    allDSAs.forEach(u => u.dsaCode && volumeMap.set(u.dsaCode, 0)); // Init with 0

    dateFilteredGlobalData.forEach(r => {
        if (volumeMap.has(r.dsaCode)) {
            volumeMap.set(r.dsaCode, volumeMap.get(r.dsaCode)! + r.directVolume);
        }
    });

    // 3. Sort
    const sortedDSAs = Array.from(volumeMap.entries()).sort((a, b) => b[1] - a[1]);
    
    // 4. Find Index
    const myIndex = sortedDSAs.findIndex(item => item[0] === currentUser.dsaCode);
    const myRank = myIndex !== -1 ? myIndex + 1 : sortedDSAs.length;
    const totalDSAs = sortedDSAs.length;

    return {
        isReportedToday,
        rank: myRank,
        totalDSAs
    };
  }, [currentUser, allData, dateFilteredGlobalData, users]);


  const handleSaveRecord = (record: SalesRecord) => {
    setAllData(prev => {
      const existsIndex = prev.findIndex(r => r.id === record.id);
      let updated;
      if (existsIndex !== -1) {
        updated = [...prev];
        updated[existsIndex] = record;
      } else {
        updated = [record, ...prev];
      }
      setLastUpdated(new Date());
      return updated;
    });
    setEditingRecord(null); 
    setShowForm(false);
  };

  const handleEditRecord = (record: SalesRecord) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleCreateNew = () => {
    setEditingRecord(null);
    setShowForm(true);
  };

  const handleApproveRecord = (record: SalesRecord, isApproved: boolean) => {
     const updatedRecord: SalesRecord = {
       ...record,
       approvalStatus: isApproved ? 'Approved' : 'Rejected'
     };
     handleSaveRecord(updatedRecord);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentScreen('dashboard');
  };

  const handleSelectDSA = (dsaCode: string) => {
    setSelectedDSA(dsaCode);
    setCurrentScreen('detail');
  };

  const handleAddUser = (newUsers: User | User[]) => {
    setUsers(prev => {
        const usersToAdd = Array.isArray(newUsers) ? newUsers : [newUsers];
        return [...prev, ...usersToAdd];
    });
  };
  
  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };
  
  const handleDeleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const handleExportCSV = () => {
    if (filteredData.length === 0) return;
    const headers = [
      "DSA Code", "Họ và Tên", "DSS", "SM Name", "Ngày báo cáo", "Trạng thái", "Duyệt",
      "Direct App", "Direct Loan", "App CRC", "Loan CRC", "Direct Volume", "Direct Banca", "Direct Rol",
      "Online App", "Online Volume",
      "CTV", "CTV Mới", "Tờ rơi", "ĐLK", "ĐLK Mới", "Cuộc gọi", "Chi phí QC", "Refs"
    ];
    const BOM = "\uFEFF"; 
    const rows = filteredData.map(record => [
      record.dsaCode, `"${record.name}"`, `"${record.dss}"`, `"${record.smName}"`,
      record.reportDate, record.status, record.approvalStatus,
      record.directApp, record.directLoan, record.directAppCRC || 0, record.directLoanCRC || 0,
      record.directVolume, record.directBanca, record.directRol, record.onlineApp,
      record.onlineVolume, record.ctv, record.newCtv, record.flyers,
      record.dlk, record.newDlk, record.callsMonth, record.adSpend, record.refs
    ]);
    const csvContent = BOM + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `DSA_Bao_Cao_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrencyCompact = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(num);
  };

  const refreshData = () => {
     const savedData = localStorage.getItem('sales_records');
     if (savedData) {
        setAllData(JSON.parse(savedData));
        setLastUpdated(new Date());
     }
  };

  // Helper functions for Date Filtering (Quick Select)
  const setFilterToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  };

  const setFilterMonth = () => {
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} users={users} />;
  }

  const bancaPercentage = stats.totalVolume > 0 
    ? ((stats.totalBanca / stats.totalVolume) * 100).toFixed(1) 
    : '0';

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const canAccessSettings = ['ADMIN', 'RSM', 'SM', 'DSS'].includes(currentUser.role);
  const showSmFilterUI = ['ADMIN', 'RSM'].includes(currentUser.role);
  const showDssFilterUI = ['ADMIN', 'RSM', 'SM'].includes(currentUser.role);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-emerald-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentScreen('dashboard')}>
             <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-2 rounded-lg shadow-md">
                <FileText size={22} />
             </div>
             <div>
                <h1 className="text-xl font-bold text-gray-800 tracking-tight leading-none">DSA Dashboard</h1>
                <p className="text-xs text-emerald-600 mt-0.5 font-bold uppercase">{currentUser.role === 'DSA' ? 'Khu vực cá nhân' : 'Khu vực quản trị'}</p>
             </div>
          </div>
          
          <div className="flex items-center space-x-4">
             {/* Admin / Management Button */}
             {canAccessSettings && currentScreen !== 'admin' && (
                <button 
                  onClick={() => setCurrentScreen('admin')}
                  className="flex items-center text-gray-600 hover:text-emerald-700 font-medium transition-colors bg-gray-50 hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-emerald-200 hidden md:flex"
                >
                  <Settings size={18} className="mr-2" /> Quản lý
                </button>
             )}

            <div className="flex items-center text-sm text-gray-600 mr-2 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full shadow-sm hidden md:flex">
               {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover mr-2 border border-emerald-200" />
               ) : (
                  <UserCircle className="mr-2 text-emerald-600" size={18} />
               )}
               <span className="font-bold text-gray-800 mr-1">{currentUser.name}</span>
               <span className="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded ml-1 font-bold">{currentUser.role}</span>
            </div>

            <button 
               onClick={handleLogout}
               className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
               title="Đăng xuất"
            >
               <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Dynamic Header Alert / Quote */}
        {dsaInfo && !dsaInfo.isReportedToday ? (
           <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl py-4 px-5 flex items-center shadow-sm animate-pulse">
               <div className="bg-red-100 p-2 rounded-full mr-4">
                 <BellRing className="text-red-600 animate-bounce" size={24} />
               </div>
               <div>
                  <h3 className="font-bold text-red-800 text-lg">Bạn chưa báo cáo hôm nay!</h3>
                  <p className="text-red-600 text-sm">Hãy cập nhật doanh số ngay để cải thiện thứ hạng và không bị nhắc nhở.</p>
               </div>
               <button 
                onClick={handleCreateNew}
                className="ml-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-colors whitespace-nowrap hidden sm:block"
               >
                 Báo cáo ngay
               </button>
           </div>
        ) : (
           <div className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-xl py-3 px-5 flex items-center shadow-sm">
              <Megaphone className="text-orange-500 mr-3 flex-shrink-0 animate-bounce" size={20} />
              <p className="font-bold text-orange-800 italic text-sm md:text-base">
                 "{randomQuote}"
              </p>
           </div>
        )}

        {currentScreen === 'admin' ? (
          <UserManagement 
            users={users} 
            currentUser={currentUser}
            onAddUser={handleAddUser} 
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser} 
            onClose={() => setCurrentScreen('dashboard')}
          />
        ) : currentScreen === 'detail' && selectedDSA ? (
          <DSADetail 
            dsaCode={selectedDSA} 
            data={allData} 
            onBack={() => setCurrentScreen('dashboard')} 
          />
        ) : (
          /* Dashboard View */
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4 mb-8">
              <StatsCard 
                title="Tổng Doanh Số" 
                value={`${formatCurrencyCompact(stats.totalVolume)} ₫`} 
                color="red"
                icon={<DollarSign size={20} />}
                trend="+12%"
              />
              <StatsCard 
                title="Tổng Banca" 
                value={`${formatCurrencyCompact(stats.totalBanca)} ₫`} 
                color="green"
                icon={<Briefcase size={20} />}
              />
              <StatsCard 
                title="% Banca" 
                value={`${bancaPercentage}%`} 
                color="orange"
                icon={<Percent size={20} />}
              />
              <StatsCard 
                title="Tổng Thẻ (CRC)" 
                value={stats.totalLoanCRC.toString()} 
                color="blue"
                icon={<CreditCard size={20} />}
              />
              
              {/* Conditional Card: Ranking (DSA) vs Reported (Manager) */}
              {dsaInfo ? (
                 <StatsCard 
                  title="Xếp Hạng Hiện Tại" 
                  value={`#${dsaInfo.rank} / ${dsaInfo.totalDSAs}`} 
                  color="green"
                  icon={<Trophy size={20} />}
                />
              ) : (
                <StatsCard 
                  title="Đã Báo Cáo" 
                  value={`${stats.reportedCount}/${stats.totalRecords}`} 
                  color="green"
                  icon={<Users size={20} />}
                />
              )}

              <StatsCard 
                title="Tỷ lệ hoạt động" 
                value={stats.totalRecords > 0 ? `${((stats.reportedCount / stats.totalRecords) * 100).toFixed(0)}%` : '0%'} 
                color="blue"
                icon={<Loader2 size={20} />}
              />
            </div>

            {/* Controls Toolbar */}
            <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
               {/* Filters */}
               <div className="flex flex-col md:flex-row md:items-center gap-3 w-full">
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                    {/* Date Picker Group */}
                    <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-lg border border-gray-200 w-full sm:w-auto justify-between sm:justify-start">
                      <div className="px-2 text-gray-400"><Calendar size={18} /></div>
                      <input 
                        type="date" 
                        value={startDate} 
                        onChange={e => setStartDate(e.target.value)}
                        className="bg-transparent border-none text-gray-700 text-sm font-medium focus:ring-0 p-1 w-24 md:w-28" 
                      />
                      <span className="text-gray-300 font-bold">-</span>
                      <input 
                        type="date" 
                        value={endDate} 
                        onChange={e => setEndDate(e.target.value)}
                        className="bg-transparent border-none text-gray-700 text-sm font-medium focus:ring-0 p-1 w-24 md:w-28" 
                      />
                    </div>
                    
                    {/* Quick Filters - Mobile Friendly */}
                    <div className="flex gap-2 w-full sm:w-auto">
                       <button onClick={setFilterToday} className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors whitespace-nowrap">
                          Hôm nay
                       </button>
                       <button onClick={setFilterMonth} className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors whitespace-nowrap">
                          Tháng này
                       </button>
                    </div>
                  </div>

                   <div className="h-8 w-px bg-gray-200 mx-1 hidden lg:block"></div>
                   
                   <div className="flex flex-wrap gap-2 w-full md:w-auto">
                      {/* SM Filter */}
                      {showSmFilterUI && (
                        <div className="relative flex-1 md:flex-none">
                            <select 
                                value={smFilter} 
                                onChange={e => setSmFilter(e.target.value)}
                                className="w-full bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg p-2.5 pl-9 shadow-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-500 md:w-44 outline-none"
                            >
                                <option value="all">Tất cả SM</option>
                                {smOptions.map(sm => (
                                    <option key={sm.id} value={sm.name}>{sm.name}</option>
                                ))}
                            </select>
                            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none"/>
                        </div>
                      )}

                      {/* DSS Filter */}
                      {showDssFilterUI && (
                        <div className="relative flex-1 md:flex-none">
                            <select 
                                value={dssFilter} 
                                onChange={e => setDssFilter(e.target.value)}
                                className="w-full bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg p-2.5 pl-9 shadow-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-500 md:w-44 outline-none"
                            >
                                <option value="all">Tất cả DSS</option>
                                {dssOptions.map(dss => (
                                    <option key={dss.id} value={dss.name}>{dss.name}</option>
                                ))}
                            </select>
                            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500 pointer-events-none"/>
                        </div>
                      )}

                      {/* Status Filter */}
                      <div className="relative flex-1 md:flex-none">
                          <select 
                            value={statusFilter} 
                            onChange={e => setStatusFilter(e.target.value)}
                            className="w-full bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg p-2.5 pl-9 shadow-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 md:w-44 outline-none"
                          >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="Đã báo cáo">Đã báo cáo</option>
                            <option value="Chưa báo cáo">Chưa báo cáo</option>
                          </select>
                          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"/>
                      </div>
                      
                       <button 
                        onClick={refreshData}
                        className="p-2.5 bg-gray-50 text-emerald-600 rounded-lg border border-gray-200 hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
                        title="Làm mới dữ liệu"
                      >
                          <RefreshCw size={18} />
                      </button>
                   </div>
               </div>

               {/* Actions */}
               <div className="flex items-center gap-3 mt-4 md:mt-0 justify-between md:justify-end w-full md:w-auto">
                   {/* View Toggle */}
                   <div className="bg-gray-100 p-1 rounded-lg flex text-sm shadow-inner w-full md:w-auto justify-center">
                      <button 
                        onClick={() => setViewMode('chart')}
                        className={`flex-1 md:flex-none px-3 py-1.5 rounded-md flex items-center justify-center transition-all ${viewMode === 'chart' ? 'bg-white shadow text-emerald-700 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                         <BarChart2 size={16} className="mr-1.5" /> Biểu đồ
                      </button>
                      <button 
                        onClick={() => setViewMode('table')}
                        className={`flex-1 md:flex-none px-3 py-1.5 rounded-md flex items-center justify-center transition-all ${viewMode === 'table' ? 'bg-white shadow text-emerald-700 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                         <TableIcon size={16} className="mr-1.5" /> Bảng
                      </button>
                   </div>

                   <div className="h-8 w-px bg-gray-200 mx-1 hidden md:block"></div>

                   {/* CHANGE: Export only if NOT DSA */}
                   {currentUser.role !== 'DSA' && (
                       <button 
                        onClick={handleExportCSV}
                        className="inline-flex items-center px-4 py-2.5 border border-gray-200 shadow-sm text-sm font-bold rounded-lg text-gray-700 bg-white hover:bg-gray-50 hover:text-emerald-600 hover:border-emerald-200 transition-all whitespace-nowrap"
                       >
                         <Download size={18} className="mr-2" /> <span className="hidden md:inline">Xuất Excel</span>
                       </button>
                   )}
                   
                   {/* Desktop Update Button */}
                   <button 
                    onClick={handleCreateNew}
                    className="hidden md:inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-bold rounded-lg text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all whitespace-nowrap"
                   >
                     <Plus size={20} className="mr-2" /> Cập nhật mới
                   </button>
               </div>
            </div>

            {/* Main Content Area */}
            {viewMode === 'chart' ? (
               <DashboardCharts 
                data={filteredData} 
                globalData={dateFilteredGlobalData} 
                currentUser={currentUser} 
                users={users}
                onDateChange={handleDateChange}
                startDate={startDate}
                endDate={endDate}
              />
            ) : (
               <SalesTable 
                data={filteredData} 
                onRowClick={handleSelectDSA} 
                onEdit={handleEditRecord}
                onApprove={handleApproveRecord}
                currentUser={currentUser}
              />
            )}
          </>
        )}
      </main>

      {/* Entry Form Modal */}
      {showForm && (
        <EntryForm 
          onClose={() => setShowForm(false)} 
          onSave={handleSaveRecord}
          currentUser={currentUser}
          users={users}
          initialData={editingRecord}
        />
      )}
      
      {/* Mobile-Friendly Floating Action Button for Updates */}
      {currentScreen === 'dashboard' && (
          <button
            onClick={handleCreateNew}
            className="md:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full p-4 shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center border-4 border-white/20"
            title="Cập nhật mới"
          >
            <Plus size={32} />
          </button>
      )}
      
      {/* Floating Chatbot */}
      <ChatBot data={filteredData} />
    </div>
  );
};

export default App;