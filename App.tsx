import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SalesRecord, ViewMode, AppScreen } from './types';
import { useAuth } from './contexts/AuthContext';
import { useSalesData } from './hooks/useSalesData';
import { useSalesFilter } from './hooks/useSalesFilter';

import { SalesTable } from './components/SalesTable';
import { StatsCard } from './components/StatsCard';
import { EntryForm } from './components/EntryForm';
import { Login } from './components/Login';
import { DashboardCharts } from './components/DashboardCharts';
import { DSADetail } from './components/DSADetail';
import { UserManagement } from './components/UserManagement';
import { LoanCalculator } from './components/LoanCalculator'; 
import { KnowledgeBase } from './components/KnowledgeBase';
import { ProfileSettings } from './components/ProfileSettings';
import { UserGuide } from './components/UserGuide'; 
import { DataManagement } from './components/DataManagement';

import { 
  Users, DollarSign, FileText, Plus, Loader2, LogOut, Download, BarChart2, 
  Settings, CreditCard, Percent, Briefcase, RefreshCw, Trophy, BellRing, 
  AlertTriangle, WifiOff, ShieldAlert, Calculator, BookOpen, Activity, 
  Moon, Sun, Database, Sparkles, Lightbulb, PieChart, HelpCircle, FileCheck, AlignLeft, Archive
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
  // --- CONTEXT & HOOKS ---
  const { currentUser, users, login, logout, addUser, updateUser, deleteUser, bulkDeleteUsers, updateProfile } = useAuth();
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('app_theme') as 'light' | 'dark') || 'light');
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
    localStorage.setItem('app_theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // Filter States
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem('viewMode') as ViewMode) || 'chart');
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    return localStorage.getItem('startDate') || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState<string>(() => localStorage.getItem('endDate') || new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>(() => localStorage.getItem('statusFilter') || 'all');
  const [smFilter, setSmFilter] = useState<string>(() => localStorage.getItem('smFilter') || 'all');
  const [dssFilter, setDssFilter] = useState<string>(() => localStorage.getItem('dssFilter') || 'all');

  // Persist filters
  useEffect(() => { localStorage.setItem('viewMode', viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem('startDate', startDate); }, [startDate]);
  useEffect(() => { localStorage.setItem('endDate', endDate); }, [endDate]);
  useEffect(() => { localStorage.setItem('statusFilter', statusFilter); }, [statusFilter]);
  useEffect(() => { localStorage.setItem('smFilter', smFilter); }, [smFilter]);
  useEffect(() => { localStorage.setItem('dssFilter', dssFilter); }, [dssFilter]);

  // --- DATA LOGIC ---
  const { allData, isLoading, isOnline, refresh, saveRecord, deleteRecord, bulkDeleteRecords, importData } = useSalesData(startDate, endDate);
  
  // --- BUSINESS LOGIC ---
  const { filteredData, stats, dsaInfo, headcount, uniqueReportedCount } = useSalesFilter({
      allData, users, currentUser, startDate, endDate, statusFilter, smFilter, dssFilter
  });

  // UI States
  const [showForm, setShowForm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SalesRecord | null>(null);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('dashboard');
  const [selectedDSA, setSelectedDSA] = useState<string | null>(null);

  const randomQuote = useMemo(() => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)], []);

  // --- HANDLERS ---
  const handleEditRecord = (record: SalesRecord) => { if (record.id.startsWith('virt-')) setEditingRecord(null); else setEditingRecord(record); setShowForm(true); };
  const handleApproveRecord = (record: SalesRecord, isApproved: boolean) => { if (record.id.startsWith('virt-')) return; saveRecord({ ...record, approvalStatus: isApproved ? 'Approved' : 'Rejected' }); };
  const handleCreateNew = () => { setEditingRecord(null); setShowForm(true); };
  const handleSelectDSA = (dsaCode: string) => { setSelectedDSA(dsaCode); setCurrentScreen('detail'); };
  const handleDateChange = (start: string, end: string) => { setStartDate(start); setEndDate(end); };

  const handleExportCSV = () => {
    if (filteredData.length === 0) { alert("Không có dữ liệu!"); return; }
    const headers = ["ID", "DSA Code", "Họ Tên", "DSS", "SM", "Ngày", "Trạng Thái", "Duyệt", "App", "Loan", "Volume", "Banca"];
    const csvRows = [headers.join(','), ...filteredData.map(r => [r.id, r.dsaCode, `"${r.name}"`, `"${r.dss}"`, `"${r.smName}"`, r.reportDate, r.status, r.approvalStatus, r.directApp, r.directLoan, r.directVolume, r.directBanca].join(','))];
    const blob = new Blob(["\uFEFF" + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report_${startDate}.csv`;
    link.click();
  };

  // Helper Filters
  const setFilterToday = () => { const t = new Date().toISOString().split('T')[0]; setStartDate(t); setEndDate(t); };
  const setFilterWeek = () => { const d = new Date(); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); const w = new Date(d.setDate(diff)).toISOString().split('T')[0]; setStartDate(w); setEndDate(new Date().toISOString().split('T')[0]); };
  const setFilterMonth = () => { const d = new Date(); setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`); setEndDate(new Date().toISOString().split('T')[0]); };

  const { smOptions, dssOptions } = useMemo(() => {
    if (!currentUser) return { smOptions: [], dssOptions: [] };
    const sms = users.filter(u => u.role === 'SM').sort((a,b) => a.name.localeCompare(b.name));
    const dsss = users.filter(u => u.role === 'DSS').sort((a,b) => a.name.localeCompare(b.name));
    return { smOptions: sms, dssOptions: dsss };
  }, [users, currentUser]);

  const notReportedCount = headcount - uniqueReportedCount;
  const isViewingToday = startDate === new Date().toISOString().split('T')[0] && endDate === startDate;
  
  // Calculation
  const diffDays = Math.ceil(Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) / (86400000)) + 1;
  const proApp = (stats.totalApps / Math.max(1, diffDays) / Math.max(1, headcount)).toFixed(2);
  const caseSize = (stats.totalLoans + stats.totalLoansFEOL) > 0 ? stats.totalVolume / (stats.totalLoans + stats.totalLoansFEOL) : 0;
  const bancaPct = stats.totalVolume > 0 ? ((stats.totalBanca / stats.totalVolume) * 100).toFixed(1) : '0';
  const formatCompact = (v: number) => new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(v);

  // RENDER LOGIN
  if (!currentUser) return <Login />; 

  const canAccessSettings = ['ADMIN', 'RSM', 'SM', 'DSS'].includes(currentUser.role);
  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col font-sans transition-colors duration-300">
      {!isOnline && <div className="bg-orange-100 text-orange-800 px-4 py-2 text-xs font-bold text-center border-b border-orange-200"><WifiOff size={14} className="inline mr-2"/> Offline Mode</div>}

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-emerald-100 dark:border-gray-700 sticky top-0 z-30 shadow-sm">
        <div className="w-full lg:max-w-[1920px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentScreen('dashboard')}>
             <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-2 rounded-lg shadow-md"><FileText size={22} /></div>
             <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white leading-none flex items-center">DSA Dashboard {isLoading && <Loader2 size={12} className="ml-2 animate-spin"/>}</h1>
                <p className="text-xs mt-0.5 text-gray-500 dark:text-gray-400">Xin chào: <b>{currentUser.name}</b></p>
             </div>
          </div>
          
          <div className="flex items-center space-x-1">
             <button onClick={() => setShowProfileModal(true)} className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 mr-1">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold overflow-hidden">
                    {currentUser.avatar ? <img src={currentUser.avatar} alt="" className="w-full h-full object-cover"/> : currentUser.name.charAt(0)}
                </div>
             </button>
             <button onClick={() => setShowUserGuide(true)} className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50"><HelpCircle size={22}/></button>
             <button onClick={() => setCurrentScreen('calculator')} className="hidden md:flex items-center px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"><Calculator size={18} className="mr-1.5"/> Tính Lãi</button>
             <button onClick={() => setCurrentScreen('knowledge')} className="hidden md:flex items-center px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"><BookOpen size={18} className="mr-1.5"/> Kiến Thức</button>
             
             {canAccessSettings && (
                 <button onClick={() => setCurrentScreen('admin')} className="hidden md:flex items-center px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                    <Settings size={18} className="mr-1.5"/> Quản lý
                 </button>
             )}
             
             {isAdmin && (
                 <button onClick={() => setCurrentScreen('data')} className="hidden md:flex items-center px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50" title="Quản trị dữ liệu (Backup/Cleanup)">
                    <Archive size={18} className="mr-1.5"/> Data
                 </button>
             )}

             <button onClick={toggleTheme} className="p-2 text-gray-500">{theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}</button>
             
             {/* Hard Reset - ADMIN ONLY */}
             {isAdmin && (
                  <button 
                    onClick={() => {
                      if(window.confirm('CẢNH BÁO: Bạn có chắc muốn xóa bộ nhớ đệm và tải lại dữ liệu gốc từ Server?')) {
                         localStorage.removeItem('sales_records');
                         localStorage.removeItem('ts_sales');
                         localStorage.removeItem('app_users');
                         localStorage.removeItem('ts_users');
                         window.location.reload();
                      }
                    }}
                    className="p-2 rounded-full text-gray-500 hover:bg-red-50 hover:text-red-500 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                    title="Hard Reset Cache"
                  >
                    <Database size={20} />
                  </button>
              )}

             <button onClick={logout} className="p-2 text-gray-400 hover:text-red-600"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full lg:max-w-[1920px] mx-auto px-4 py-8 flex flex-col">
        {currentScreen === 'admin' ? (
          <UserManagement users={users} currentUser={currentUser} onAddUser={addUser} onUpdateUser={updateUser} onDeleteUser={deleteUser} onBulkDeleteUsers={bulkDeleteUsers} onClose={() => setCurrentScreen('dashboard')} />
        ) : currentScreen === 'data' ? (
           <DataManagement allData={allData} onBulkDelete={bulkDeleteRecords} onImportData={importData} onClose={() => setCurrentScreen('dashboard')} />
        ) : currentScreen === 'calculator' ? (
            <LoanCalculator currentUser={currentUser} onClose={() => setCurrentScreen('dashboard')} />
        ) : currentScreen === 'knowledge' ? (
            <KnowledgeBase currentUser={currentUser} onClose={() => setCurrentScreen('dashboard')} />
        ) : currentScreen === 'detail' && selectedDSA ? (
          <DSADetail dsaCode={selectedDSA} data={allData} onBack={() => setCurrentScreen('dashboard')} currentUser={currentUser} onEdit={handleEditRecord} onApprove={handleApproveRecord} users={users} />
        ) : (
          <>
            <div className="mb-6 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl p-4 text-white shadow-md relative overflow-hidden">
                 <div className="flex items-center justify-center text-center relative z-10"><Lightbulb className="mr-3 text-yellow-300" size={24} /><span className="italic">"{randomQuote}"</span></div>
                 <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={100} /></div>
            </div>

            {dsaInfo && !dsaInfo.isReportedToday && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl py-4 px-5 flex items-center shadow-sm">
                    <BellRing className="text-red-600 mr-4 animate-bounce" size={24} />
                    <div><h3 className="font-bold text-red-800">Chưa báo cáo hôm nay!</h3><p className="text-red-600 text-sm">Hãy cập nhật ngay.</p></div>
                    <button onClick={handleCreateNew} className="ml-auto bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Báo cáo ngay</button>
                </div>
            )}
            
            {currentUser.role !== 'DSA' && notReportedCount > 0 && isViewingToday && (
                <div className="mb-6 bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center"><AlertTriangle className="text-orange-500 mr-2" size={20}/><span className="font-bold text-orange-800 text-sm">Cảnh báo: Có <span className="text-red-600 text-lg">{notReportedCount}</span> nhân viên chưa báo cáo!</span></div>
                    <button onClick={() => { setStatusFilter('Chưa báo cáo'); setViewMode('table'); }} className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Kiểm tra ngay</button>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-8 gap-3 mb-8">
              <StatsCard title="Doanh Số" value={`${formatCompact(stats.totalVolume)} ₫`} color="red" icon={<DollarSign size={20} />} />
              <StatsCard title="Tổng Banca" value={`${formatCompact(stats.totalBanca)} ₫`} color="green" icon={<Briefcase size={20} />} />
              <StatsCard title="% Banca" value={`${bancaPct}%`} color="orange" icon={<Percent size={20} />} />
              <StatsCard title="Thẻ (CRC)" value={stats.totalLoanCRC.toString()} color="blue" icon={<CreditCard size={20} />} />
              <StatsCard title="ProApp" value={proApp} color="blue" icon={<BarChart2 size={20} />} />
              <StatsCard title="Case Size" value={`${formatCompact(caseSize)}`} color="green" icon={<PieChart size={20} />} />
              {dsaInfo ? <StatsCard title="Xếp Hạng" value={`#${dsaInfo.rank}/${dsaInfo.totalDSAs}`} color="green" icon={<Trophy size={20} />} /> : <StatsCard title="Hoạt Động" value={`${uniqueReportedCount}/${headcount}`} color="green" icon={<Users size={20} />} />}
              <StatsCard title="Tỷ lệ %" value={headcount > 0 ? `${((uniqueReportedCount / headcount) * 100).toFixed(0)}%` : '0%'} color="blue" icon={<Activity size={20} />} />
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md mb-6 flex flex-col md:flex-row justify-between gap-4">
               <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700/50 p-1 rounded-lg border border-gray-200 dark:border-gray-600">
                      <input type="date" value={startDate} onChange={e => handleDateChange(e.target.value, endDate)} className="bg-transparent border-none text-sm font-medium w-28" />
                      <span>-</span>
                      <input type="date" value={endDate} onChange={e => handleDateChange(startDate, e.target.value)} className="bg-transparent border-none text-sm font-medium w-28" />
                    </div>
                    <div className="flex gap-1">
                        <button onClick={setFilterToday} className="px-2 py-1.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded-lg">Hôm nay</button>
                        <button onClick={setFilterWeek} className="px-2 py-1.5 text-[10px] font-bold bg-blue-50 text-blue-700 rounded-lg">Tuần này</button>
                        <button onClick={setFilterMonth} className="px-2 py-1.5 text-[10px] font-bold bg-purple-50 text-purple-700 rounded-lg">Tháng này</button>
                    </div>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm bg-gray-50 border-gray-200 rounded-lg">
                        <option value="all">Tất cả trạng thái</option>
                        <option value="Đã báo cáo">Đã báo cáo</option>
                        <option value="Chưa báo cáo">Chưa báo cáo</option>
                        <option value="Pending">Chờ duyệt</option>
                    </select>
                    {['ADMIN', 'RSM'].includes(currentUser.role) && <select value={smFilter} onChange={e => setSmFilter(e.target.value)} className="text-sm bg-gray-50 border-gray-200 rounded-lg"><option value="all">Tất cả SM</option>{smOptions.map(sm => <option key={sm.id} value={sm.name}>{sm.name}</option>)}</select>}
                    {['ADMIN', 'RSM', 'SM'].includes(currentUser.role) && <select value={dssFilter} onChange={e => setDssFilter(e.target.value)} className="text-sm bg-gray-50 border-gray-200 rounded-lg"><option value="all">Tất cả DSS</option>{dssOptions.map(dss => <option key={dss.id} value={dss.name}>{dss.name}</option>)}</select>}
                    <button onClick={refresh} className="p-1.5 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100"><RefreshCw size={16} className={isLoading ? 'animate-spin' : ''}/></button>
               </div>
               <div className="flex items-center gap-2">
                   <div className="bg-gray-100 p-1 rounded-lg flex text-xs">
                      <button onClick={() => setViewMode('chart')} className={`px-3 py-1.5 rounded-md ${viewMode === 'chart' ? 'bg-white shadow text-emerald-700 font-bold' : 'text-gray-500'}`}>Biểu đồ</button>
                      <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-md ${viewMode === 'table' ? 'bg-white shadow text-emerald-700 font-bold' : 'text-gray-500'}`}>Bảng</button>
                   </div>
                   {currentUser.role !== 'DSA' && <button onClick={handleExportCSV} className="p-2 text-gray-700 bg-white border border-gray-200 rounded-lg"><Download size={18} /></button>}
                   <button onClick={handleCreateNew} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md flex items-center"><Plus size={18} className="mr-1"/> Mới</button>
               </div>
            </div>

            {viewMode === 'chart' ? (
               <DashboardCharts data={filteredData} globalData={allData.filter(r => r.reportDate >= startDate && r.reportDate <= endDate)} currentUser={currentUser} users={users} onDateChange={handleDateChange} startDate={startDate} endDate={endDate} />
            ) : (
               <SalesTable data={filteredData} onRowClick={handleSelectDSA} onEdit={handleEditRecord} onApprove={handleApproveRecord} onDelete={deleteRecord} currentUser={currentUser} statusFilter={statusFilter} />
            )}
          </>
        )}
        <div className="text-center py-6 mt-4 border-t border-dashed border-gray-200 text-[10px] text-gray-400">
            <span className="font-mono">Version 1.2.0 (Backup & Restore)</span> • <a href="https://zalo.me/0867641331" target="_blank" rel="noreferrer" className="font-mono text-gray-300 hover:text-gray-500">Developed by DSS Nguyễn Minh Đức</a>
        </div>
      </main>

      {showForm && <EntryForm onClose={() => setShowForm(false)} onSave={saveRecord} currentUser={currentUser} users={users} initialData={editingRecord} existingRecords={allData} />}
      {showProfileModal && <ProfileSettings currentUser={currentUser} onClose={() => setShowProfileModal(false)} onUpdate={updateProfile} />}
      {showUserGuide && <UserGuide currentUser={currentUser} onClose={() => setShowUserGuide(false)} />}
      {currentScreen === 'dashboard' && <button onClick={handleCreateNew} className="md:hidden fixed bottom-6 right-6 z-40 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full p-4 shadow-xl border-4 border-white/20"><Plus size={32} /></button>}
    </div>
  );
};

export default App;