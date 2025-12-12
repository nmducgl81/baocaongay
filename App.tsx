import React, { useState, useEffect, useMemo } from 'react';
import { SalesRecord, DashboardStats, User, ViewMode, AppScreen } from './types';
import { generateMockData, MOCK_USERS } from './services/mockData';
import { analyzeSalesData } from './services/geminiService';
import { authService } from './services/authService';
import { SalesTable } from './components/SalesTable';
import { StatsCard } from './components/StatsCard';
import { EntryForm } from './components/EntryForm';
import { Login } from './components/Login';
import { DashboardCharts } from './components/DashboardCharts';
import { DSADetail } from './components/DSADetail';
import { UserManagement } from './components/UserManagement';

import { 
  Users, 
  DollarSign, 
  FileText, 
  Plus, 
  BrainCircuit, 
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
  Briefcase
} from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [allData, setAllData] = useState<SalesRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SalesRecord | null>(null);
  
  const [analysis, setAnalysis] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  
  // Navigation State
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('dashboard');
  const [selectedDSA, setSelectedDSA] = useState<string | null>(null);
  
  // View/Filter State with LocalStorage Persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('viewMode') as ViewMode) || 'table';
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
    // Load initial mock data
    setAllData(generateMockData());
  }, []);

  // Filter data based on user hierarchy, role, date range, and status
  const filteredData = useMemo(() => {
    if (!currentUser) return [];
    
    // 1. Hierarchy Filter - PASS THE CURRENT USERS LIST
    const visibleDSAIds = authService.getVisibleDSAIds(currentUser, users);
    let data = allData.filter(record => visibleDSAIds.includes(record.dsaCode));

    // 2. Date Range Filter
    data = data.filter(record => 
      record.reportDate >= startDate && record.reportDate <= endDate
    );

    // 3. Status Filter
    if (statusFilter !== 'all') {
      data = data.filter(record => record.status === statusFilter);
    }

    return data;
  }, [allData, currentUser, startDate, endDate, statusFilter, users]);

  // Calculate statistics based on filtered data
  const stats: DashboardStats = useMemo(() => {
    return filteredData.reduce(
      (acc, curr) => ({
        totalRecords: acc.totalRecords + 1,
        reportedCount: curr.status === 'Đã báo cáo' ? acc.reportedCount + 1 : acc.reportedCount,
        totalVolume: acc.totalVolume + curr.directVolume,
        totalApps: acc.totalApps + curr.directApp,
        totalLoanCRC: acc.totalLoanCRC + (curr.directLoanCRC || 0), // Sum up Loan CRC
        totalBanca: acc.totalBanca + curr.directBanca,
      }),
      { totalRecords: 0, reportedCount: 0, totalVolume: 0, totalApps: 0, totalLoanCRC: 0, totalBanca: 0 }
    );
  }, [filteredData]);

  const handleSaveRecord = (record: SalesRecord) => {
    setAllData(prev => {
      const existsIndex = prev.findIndex(r => r.id === record.id);
      if (existsIndex !== -1) {
        // Update existing
        const updated = [...prev];
        updated[existsIndex] = record;
        return updated;
      } else {
        // Add new
        return [record, ...prev];
      }
    });
    setEditingRecord(null); // Reset editing state
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

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysis('');
    const result = await analyzeSalesData(filteredData);
    setAnalysis(result);
    setAnalyzing(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAnalysis('');
    setCurrentScreen('dashboard');
  };

  const handleSelectDSA = (dsaCode: string) => {
    setSelectedDSA(dsaCode);
    setCurrentScreen('detail');
  };

  // User Management Handlers (Admin)
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

  if (!currentUser) {
    // Pass users state to Login component
    return <Login onLogin={setCurrentUser} users={users} />;
  }

  // Calculate % Banca
  const bancaPercentage = stats.totalVolume > 0 
    ? ((stats.totalBanca / stats.totalVolume) * 100).toFixed(1) 
    : '0';

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentScreen('dashboard')}>
             <div className="bg-emerald-600 text-white p-2 rounded-lg">
                <FileText size={24} />
             </div>
             <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none">DSA Dashboard</h1>
                <p className="text-xs text-gray-500 mt-0.5 font-medium">{currentUser.role === 'DSA' ? 'Khu vực cá nhân' : 'Khu vực quản trị'}</p>
             </div>
          </div>
          
          <div className="flex items-center space-x-4">
             {/* Admin Button */}
             {currentUser.role === 'ADMIN' && currentScreen !== 'admin' && (
                <button 
                  onClick={() => setCurrentScreen('admin')}
                  className="flex items-center text-gray-600 hover:text-emerald-600 mr-2"
                >
                  <Settings size={18} className="mr-1" /> Admin
                </button>
             )}

            <div className="flex items-center text-sm text-gray-600 mr-2 bg-gray-100 px-3 py-1 rounded-full">
               <UserCircle className="mr-2 text-gray-500" size={16} />
               <span className="font-semibold mr-1">{currentUser.name}</span>
               <span className="text-xs text-gray-400">({currentUser.role})</span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
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
              <StatsCard 
                title="Đã Báo Cáo" 
                value={`${stats.reportedCount}/${stats.totalRecords}`} 
                color="green"
                icon={<Users size={20} />}
              />
              <StatsCard 
                title="Tỷ lệ hoạt động" 
                value={stats.totalRecords > 0 ? `${((stats.reportedCount / stats.totalRecords) * 100).toFixed(0)}%` : '0%'} 
                color="blue"
                icon={<Loader2 size={20} />}
              />
            </div>

            {/* AI Analysis Section */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-8 border border-indigo-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-indigo-900 flex items-center">
                  <BrainCircuit className="mr-2 text-indigo-600" /> 
                  Phân tích thông minh (Gemini AI)
                </h3>
                <button 
                  onClick={handleAnalyze} 
                  disabled={analyzing}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {analyzing ? 'Đang phân tích...' : 'Phân tích dữ liệu ngay'}
                </button>
              </div>
              
              {analysis ? (
                <div className="prose prose-sm text-indigo-800 bg-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                    <p className="whitespace-pre-line">{analysis}</p>
                </div>
              ) : (
                <p className="text-sm text-indigo-400 italic">Nhấn nút "Phân tích" để xem đánh giá hiệu suất {currentUser.role === 'DSA' ? 'cá nhân' : 'đội nhóm'} từ AI.</p>
              )}
            </div>

            {/* Controls Toolbar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-wrap items-center justify-between gap-4">
               {/* Filters */}
               <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Calendar size={18} className="text-gray-400" />
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-white text-sm rounded-md p-2 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                    />
                    <span className="text-gray-400 font-bold">-</span>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-white text-sm rounded-md p-2 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                    />
                  </div>

                  <select 
                    value={statusFilter} 
                    onChange={e => setStatusFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-white text-sm rounded-md p-2 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-w-[160px]"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="Đã báo cáo">Đã báo cáo</option>
                    <option value="Chưa báo cáo">Chưa báo cáo</option>
                  </select>
               </div>

               {/* Actions */}
               <div className="flex items-center gap-3">
                   {/* View Toggle */}
                   <div className="bg-gray-100 p-1 rounded-lg flex text-sm">
                      <button 
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-1.5 rounded-md flex items-center ${viewMode === 'table' ? 'bg-white shadow-sm text-emerald-600 font-medium' : 'text-gray-500'}`}
                      >
                         <TableIcon size={16} className="mr-1" /> Bảng
                      </button>
                      <button 
                        onClick={() => setViewMode('chart')}
                        className={`px-3 py-1.5 rounded-md flex items-center ${viewMode === 'chart' ? 'bg-white shadow-sm text-emerald-600 font-medium' : 'text-gray-500'}`}
                      >
                         <BarChart2 size={16} className="mr-1" /> Biểu đồ
                      </button>
                   </div>

                   <div className="h-6 w-px bg-gray-300 mx-1"></div>

                   <button 
                    onClick={handleExportCSV}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                   >
                     <Download size={16} className="mr-2" /> Xuất Excel
                   </button>
                   
                   <button 
                    onClick={handleCreateNew}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                   >
                     <Plus size={18} className="mr-2" /> Cập nhật mới
                   </button>
               </div>
            </div>

            {/* Main Content Area */}
            {viewMode === 'table' ? (
              <SalesTable 
                data={filteredData} 
                onRowClick={handleSelectDSA} 
                onEdit={handleEditRecord}
                onApprove={handleApproveRecord}
                currentUser={currentUser}
              />
            ) : (
              <DashboardCharts 
                data={filteredData} 
                currentUser={currentUser} 
                onDateChange={handleDateChange}
                startDate={startDate}
                endDate={endDate}
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
    </div>
  );
};

export default App;