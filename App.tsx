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
import { LoanCalculator } from './components/LoanCalculator'; 
import { KnowledgeBase } from './components/KnowledgeBase';
import { ProfileSettings } from './components/ProfileSettings';
import { UserGuide } from './components/UserGuide'; // Import UserGuide

// Firebase Imports
import { db, ensureAuth } from './services/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, query, where, onSnapshot } from 'firebase/firestore';

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
  Trophy,
  BellRing,
  AlertTriangle,
  CloudLightning,
  WifiOff,
  ShieldAlert,
  Calculator, 
  BookOpen, 
  Camera,
  UserMinus, 
  FileCheck,
  Activity,
  Moon,
  Sun,
  ArrowRight,
  Database,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Lightbulb,
  PieChart,
  Target,
  HelpCircle // Import Help Icon
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
  // Helper to format date as YYYY-MM-DD in Local Time
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatCurrencyCompact = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(val);
  };

  // --- THEME & SCALE STATE ---
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('app_theme') as 'light' | 'dark') || 'light';
  });

  // Scale: 100, 90, 80, 70, 60 (Percentage)
  const [uiScale, setUiScale] = useState<number>(() => {
    return Number(localStorage.getItem('app_scale')) || 100;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  // Apply Scale Class to HTML
  useEffect(() => {
    const root = window.document.documentElement;
    // Remove all scale classes
    root.classList.remove('ui-scale-100', 'ui-scale-90', 'ui-scale-80', 'ui-scale-70', 'ui-scale-60');
    // Add current scale class
    root.classList.add(`ui-scale-${uiScale}`);
    localStorage.setItem('app_scale', uiScale.toString());
  }, [uiScale]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleZoomIn = () => {
      setUiScale(prev => Math.min(prev + 10, 100));
  };

  const handleZoomOut = () => {
      setUiScale(prev => Math.max(prev - 10, 60));
  };

  // Check localStorage for saved session on initial load
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isOnline, setIsOnline] = useState(false); 
  const [firebaseError, setFirebaseError] = useState<string | null>(null); 
  const [permissionError, setPermissionError] = useState(false); 

  // Initialize Users from LocalStorage (Cache first)
  const [users, setUsers] = useState<User[]>(() => {
    const savedUsers = localStorage.getItem('app_users');
    return savedUsers ? JSON.parse(savedUsers) : MOCK_USERS;
  });

  // Initialize Sales Data from LocalStorage (Cache first)
  const [allData, setAllData] = useState<SalesRecord[]>(() => {
    const savedData = localStorage.getItem('sales_records');
    return savedData ? JSON.parse(savedData) : [];
  });

  const [showForm, setShowForm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false); // State for User Guide
  const [editingRecord, setEditingRecord] = useState<SalesRecord | null>(null);
  
  // Navigation State
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('dashboard');
  const [selectedDSA, setSelectedDSA] = useState<string | null>(null);
  
  // View/Filter State with LocalStorage Persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('viewMode') as ViewMode) || 'chart';
  });

  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return localStorage.getItem('startDate') || formatDate(firstDay);
  });

  const [endDate, setEndDate] = useState<string>(() => {
    return localStorage.getItem('endDate') || formatDate(new Date());
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

  // Avatar Upload Ref
  const headerAvatarRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Random Quote State
  const randomQuote = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    return MOTIVATIONAL_QUOTES[randomIndex];
  }, []);

  // Update ref when state changes
  useEffect(() => {
    dataRef.current = allData;
  }, [allData]);

  // --- FIREBASE SYNC LOGIC ---
  const sanitizeForFirestore = (obj: any): any => {
      if (obj === null || obj === undefined) return null;
      if (typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
      const newObj: any = {};
      Object.keys(obj).forEach(key => { if (obj[key] !== undefined) newObj[key] = sanitizeForFirestore(obj[key]); });
      return newObj;
  };
  
  useEffect(() => {
    let unsubscribeSales: (() => void) | undefined;
    let unsubscribeUsers: (() => void) | undefined;

    const initializeListeners = async () => {
      setIsLoadingData(true);
      // Fallback if DB not present or already known offline
      if (!db) { 
          if (allData.length === 0) setAllData(generateMockData()); 
          setIsOnline(false); // Explicitly mark offline
          setIsLoadingData(false); 
          return; 
      }
      try {
        const authResult = await ensureAuth();
        if (!authResult.success) {
           console.log("⚠️ App running offline due to:", authResult.error);
           setIsOnline(false); 
           setFirebaseError(authResult.error || 'unknown_error');
           // Initialize with Mock Data if LocalStorage is empty
           if (allData.length === 0) setAllData(generateMockData()); 
           setIsLoadingData(false); 
           return;
        }
        
        setIsOnline(true);
        unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
            const remoteUsers = snapshot.docs.map(doc => doc.data() as User);
            setUsers(remoteUsers); 
            localStorage.setItem('app_users', JSON.stringify(remoteUsers)); 
            
            // Sync Current User if their data changed remotely
            if (currentUser) {
               const updatedSelf = remoteUsers.find(u => u.id === currentUser.id);
               if (updatedSelf) setCurrentUser(updatedSelf);
            }
        }, (error) => {
            console.warn("Snapshot users error (Offline fallback):", error);
            setIsOnline(false);
        });

        const sixtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 60)).toISOString().split('T')[0];
        const q = query(collection(db, "sales_records"), where("reportDate", ">=", sixtyDaysAgo));
        unsubscribeSales = onSnapshot(q, (snapshot) => {
            const remoteSales = snapshot.docs.map(doc => doc.data() as SalesRecord);
            setAllData(remoteSales); 
            localStorage.setItem('sales_records', JSON.stringify(remoteSales));
            setLastUpdated(new Date()); 
            setIsLoadingData(false);
        }, (error) => {
            console.warn("Snapshot sales error (Offline fallback):", error);
            setIsOnline(false);
            setIsLoadingData(false);
        });

      } catch (error) { 
          console.error("Critical Init Error:", error);
          setIsOnline(false);
          setIsLoadingData(false); 
      }
    };
    initializeListeners();
    return () => { if (unsubscribeSales) unsubscribeSales(); if (unsubscribeUsers) unsubscribeUsers(); };
  }, []); 

  useEffect(() => { localStorage.setItem('viewMode', viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem('startDate', startDate); }, [startDate]);
  useEffect(() => { localStorage.setItem('endDate', endDate); }, [endDate]);
  useEffect(() => { localStorage.setItem('statusFilter', statusFilter); }, [statusFilter]);
  useEffect(() => { localStorage.setItem('smFilter', smFilter); }, [smFilter]);
  useEffect(() => { localStorage.setItem('dssFilter', dssFilter); }, [dssFilter]);

  const { smOptions, dssOptions } = useMemo(() => {
    if (!currentUser) return { smOptions: [], dssOptions: [] };
    let availableSMs: User[] = [];
    let availableDSSs: User[] = [];
    if (currentUser.role === 'ADMIN') { availableSMs = users.filter(u => u.role === 'SM'); availableDSSs = users.filter(u => u.role === 'DSS'); }
    else if (currentUser.role === 'RSM') { availableSMs = users.filter(u => u.role === 'SM' && u.parentId === currentUser.id); const smIds = availableSMs.map(sm => sm.id); availableDSSs = users.filter(u => u.role === 'DSS' && smIds.includes(u.parentId || '')); }
    else if (currentUser.role === 'SM') { availableSMs = [currentUser]; availableDSSs = users.filter(u => u.role === 'DSS' && u.parentId === currentUser.id); }
    else if (currentUser.role === 'DSS') { availableDSSs = [currentUser]; }
    if (smFilter !== 'all') { const s = users.find(u => u.name === smFilter && u.role === 'SM'); if (s) availableDSSs = availableDSSs.filter(u => u.parentId === s.id); }
    return { smOptions: availableSMs.sort((a,b) => a.name.localeCompare(b.name)), dssOptions: availableDSSs.sort((a,b) => a.name.localeCompare(b.name)) };
  }, [users, currentUser, smFilter]);

  const filteredData = useMemo(() => {
    if (!currentUser) return [];
    const visibleDSAIds = authService.getVisibleDSAIds(currentUser, users);
    
    // 1. Get Actual Records within selected Date Range
    let actualRecords = allData.filter(record => 
        visibleDSAIds.includes(record.dsaCode) && 
        record.reportDate >= startDate && 
        record.reportDate <= endDate
    );

    // Apply secondary filters (SM/DSS) to actual records first
    if (smFilter !== 'all') actualRecords = actualRecords.filter(r => r.smName === smFilter);
    if (dssFilter !== 'all') actualRecords = actualRecords.filter(r => r.dss === dssFilter);

    // --- Optimization: Short-circuit if looking for explicit status ---
    if (statusFilter === 'Đã báo cáo') {
        return actualRecords.filter(r => r.status === 'Đã báo cáo');
    }
    if (statusFilter === 'Pending') {
        return actualRecords.filter(r => r.approvalStatus === 'Pending');
    }

    // --- LOGIC: GENERATE MISSING RECORDS (Chưa báo cáo) ---
    // Only generate if user wants to see 'Chưa báo cáo' or 'All'
    // To prevent crashes, limit virtual generation to ~31 days range
    const dayDiff = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24);
    let virtualRecords: SalesRecord[] = [];

    if (dayDiff <= 31) {
        const dsaUsersInScope = users.filter(u => u.role === 'DSA' && visibleDSAIds.includes(u.dsaCode || ''));
        
        // Helper to get array of dates strings (YYYY-MM-DD)
        const getDates = (start: string, end: string) => {
            const arr = [];
            const dt = new Date(start);
            const endDt = new Date(end);
            while (dt <= endDt) {
                arr.push(new Date(dt).toISOString().split('T')[0]);
                dt.setDate(dt.getDate() + 1);
            }
            return arr;
        };
        const dateRange = getDates(startDate, endDate);

        // Create a fast lookup Set: "DSACODE_DATE"
        // Use actualRecords so we know who HAS reported
        const existingMap = new Set(actualRecords.map(r => `${r.dsaCode}_${r.reportDate}`));

        // Iterate Dates -> Users to find gaps
        dateRange.forEach(date => {
            dsaUsersInScope.forEach(user => {
                // Apply SM/DSS Filter to Virtual Users too
                let matchesFilter = true;
                if (smFilter !== 'all' || dssFilter !== 'all') {
                    const parent = users.find(u => u.id === user.parentId);
                    const grandParent = parent ? users.find(u => u.id === parent.parentId) : null;
                    const smName = grandParent?.role === 'SM' ? grandParent.name : (parent?.role === 'SM' ? parent.name : '');
                    const dssName = parent?.role === 'DSS' ? parent.name : '';

                    if (smFilter !== 'all' && smName !== smFilter) matchesFilter = false;
                    if (dssFilter !== 'all' && dssName !== dssFilter) matchesFilter = false;
                }

                if (matchesFilter) {
                    const key = `${user.dsaCode}_${date}`;
                    if (!existingMap.has(key)) {
                        // Generate Virtual Record
                        const parent = users.find(u => u.id === user.parentId);
                        const grandParent = parent ? users.find(u => u.id === parent.parentId) : null;
                        const smName = grandParent?.role === 'SM' ? grandParent.name : (parent?.role === 'SM' ? parent.name : '');

                        virtualRecords.push({
                            id: `virt-${user.id}-${date}`, // Unique ID for key
                            dsaCode: user.dsaCode || '',
                            name: user.name,
                            dss: parent?.role === 'DSS' ? parent.name : '',
                            smName: smName,
                            reportDate: date,
                            status: 'Chưa báo cáo',
                            approvalStatus: 'Approved',
                            // Default Zeros
                            directApp: 0, directLoan: 0, directAppCRC: 0, directLoanCRC: 0, 
                            directAppFEOL: 0, directLoanFEOL: 0, directVolumeFEOL: 0, 
                            directVolume: 0, directBanca: 0, directRol: '0.0%', 
                            onlineApp: 0, onlineVolume: 0, ctv: 0, newCtv: 0, 
                            flyers: 0, dlk: 0, newDlk: 0, callsMonth: 0, adSpend: 0, refs: 0
                        });
                    }
                }
            });
        });
    }

    if (statusFilter === 'Chưa báo cáo') {
        return virtualRecords;
    }

    // Default: 'all' -> Combine Actual + Virtual
    // Filter actual to exclude 'Chưa báo cáo' placeholders that might exist in DB (unlikely but safe)
    // and combine with generated virtuals
    const realReports = actualRecords.filter(r => r.status === 'Đã báo cáo' || r.status.startsWith('Ngày'));
    return [...realReports, ...virtualRecords];

  }, [allData, currentUser, startDate, endDate, statusFilter, smFilter, dssFilter, users]);

  const stats: DashboardStats = useMemo(() => {
    const actual = filteredData.filter(r => r.reportDate === startDate || (startDate !== endDate && r.reportDate >= startDate && r.reportDate <= endDate));
    return actual.reduce((acc, curr) => ({ 
        totalRecords: acc.totalRecords + 1, 
        reportedCount: curr.status === 'Đã báo cáo' ? acc.reportedCount + 1 : acc.reportedCount, 
        totalVolume: acc.totalVolume + curr.directVolume + (curr.directVolumeFEOL || 0), 
        totalDirectVolume: acc.totalDirectVolume + curr.directVolume, // Only Direct Volume (Cash) for Case Size
        totalApps: acc.totalApps + curr.directApp, 
        totalLoans: acc.totalLoans + curr.directLoan, // Only Cash Loans
        totalLoansFEOL: acc.totalLoansFEOL + (curr.directLoanFEOL || 0), // Include FEOL Loans for Case Size
        totalLoanCRC: acc.totalLoanCRC + (curr.directLoanCRC || 0), 
        totalBanca: acc.totalBanca + curr.directBanca 
    }), { totalRecords: 0, reportedCount: 0, totalVolume: 0, totalDirectVolume: 0, totalApps: 0, totalLoans: 0, totalLoansFEOL: 0, totalLoanCRC: 0, totalBanca: 0 });
  }, [filteredData, startDate, endDate]);

  const filteredHeadcount = useMemo(() => {
    if (!currentUser) return 0;
    const visibleIds = authService.getVisibleDSAIds(currentUser, users);
    let target = users.filter(u => u.role === 'DSA' && visibleIds.includes(u.dsaCode || ''));
    if (smFilter !== 'all') target = target.filter(u => { const p = users.find(x => x.id === u.parentId); if (!p) return false; if (p.role === 'SM') return p.name === smFilter; const gp = users.find(x => x.id === p.parentId); return gp && gp.name === smFilter; });
    if (dssFilter !== 'all') target = target.filter(u => users.find(x => x.id === u.parentId)?.name === dssFilter);
    return target.length;
  }, [users, currentUser, smFilter, dssFilter]);

  // --- NEW METRICS CALCULATIONS ---
  // 1. ProApp: (Total Apps / Days Passed) / Headcount
  const diffTime = Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive count
  
  // Prevent division by zero
  const safeHeadcount = Math.max(1, filteredHeadcount);
  const avgAppsPerDay = stats.totalApps / Math.max(1, diffDays);
  
  const proApp = (avgAppsPerDay / safeHeadcount).toFixed(2);

  // 2. Case Size: Total Volume (Includes FEOL) / (Total Direct Loan + Total FEOL Loan)
  const totalCombinedLoans = stats.totalLoans + stats.totalLoansFEOL;
  const caseSize = totalCombinedLoans > 0 ? (stats.totalVolume / totalCombinedLoans) : 0;

  const dateFilteredGlobalData = useMemo(() => {
    if (!currentUser) return [];
    const activeDsaCodes = new Set(users.filter(u => u.role === 'DSA' && u.dsaCode).map(u => u.dsaCode!));
    let data = allData.filter(record => record.reportDate >= startDate && record.reportDate <= endDate && activeDsaCodes.has(record.dsaCode));
    if (smFilter !== 'all') data = data.filter(record => record.smName === smFilter);
    if (dssFilter !== 'all') data = data.filter(record => record.dss === dssFilter);
    return data;
  }, [allData, currentUser, startDate, endDate, smFilter, dssFilter, users]);

  const pendingRecords = useMemo(() => { if (!currentUser || currentUser.role === 'DSA') return []; const visible = authService.getVisibleDSAIds(currentUser, users); return allData.filter(r => visible.includes(r.dsaCode) && r.approvalStatus === 'Pending'); }, [allData, currentUser, users]);
  
  // Calculate Reports Info for current filter (Today/Specific Date)
  const uniqueReportedCount = useMemo(() => new Set(filteredData.filter(r => r.status === 'Đã báo cáo').map(r => r.dsaCode)).size, [filteredData]);
  const notReportedCount = filteredHeadcount - uniqueReportedCount;
  
  // Is user looking at today?
  const isViewingToday = useMemo(() => {
      const today = formatDate(new Date());
      return startDate === today && endDate === today;
  }, [startDate, endDate]);

  const dsaInfo = useMemo(() => {
    if (currentUser?.role !== 'DSA') return null;
    const today = formatDate(new Date());
    const isReportedToday = allData.some(r => r.dsaCode === currentUser.dsaCode && r.reportDate === today && r.status === 'Đã báo cáo');
    const allDSAs = users.filter(u => u.role === 'DSA');
    const volumeMap = new Map<string, number>();
    allDSAs.forEach(u => u.dsaCode && volumeMap.set(u.dsaCode, 0)); 
    dateFilteredGlobalData.forEach(r => { if (volumeMap.has(r.dsaCode)) volumeMap.set(r.dsaCode, volumeMap.get(r.dsaCode)! + r.directVolume + (r.directVolumeFEOL || 0)); });
    const sorted = Array.from(volumeMap.entries()).sort((a, b) => b[1] - a[1]);
    const myRank = sorted.findIndex(item => item[0] === currentUser.dsaCode) + 1;
    return { isReportedToday, rank: myRank || sorted.length, totalDSAs: sorted.length };
  }, [currentUser, allData, dateFilteredGlobalData, users]);

  const handleSaveRecord = async (record: SalesRecord) => {
    // 1. Update Local State & Storage immediately (Optimistic UI)
    setAllData(prev => { 
        const idx = prev.findIndex(r => r.id === record.id); 
        let updated; 
        if (idx !== -1) { updated = [...prev]; updated[idx] = record; } 
        else { updated = [record, ...prev]; } 
        localStorage.setItem('sales_records', JSON.stringify(updated)); // Persist locally
        return updated; 
    });
    setLastUpdated(new Date()); setEditingRecord(null); setShowForm(false);
    
    // 2. Try Sync to Firebase if Online
    if (db && isOnline) { 
        try { 
            await setDoc(doc(db, "sales_records", record.id), sanitizeForFirestore(record)); 
        } catch (e: any) { 
            console.warn("Save Failed (Fallback Offline):", e);
            // Don't error out, just let the user know they are offline? 
            // We already have the isOnline indicator.
        } 
    }
  };

  const handleEditRecord = (record: SalesRecord) => { if (record.id.startsWith('virt-')) setEditingRecord(null); else setEditingRecord(record); setShowForm(true); };
  const handleDeleteRecord = async (id: string) => { 
      if (id.startsWith('virt-')) return; 
      
      setAllData(prev => {
          const updated = prev.filter(r => r.id !== id);
          localStorage.setItem('sales_records', JSON.stringify(updated));
          return updated;
      });
      
      if (db && isOnline) { 
          try { await deleteDoc(doc(db, "sales_records", id)); } catch (e) { console.warn("Delete Failed (Offline)", e); } 
      } 
  };
  const handleCreateNew = () => { setEditingRecord(null); setShowForm(true); };
  const handleApproveRecord = (record: SalesRecord, isApproved: boolean) => { if (record.id.startsWith('virt-')) return; handleSaveRecord({ ...record, approvalStatus: isApproved ? 'Approved' : 'Rejected' }); };
  const handleLogout = () => { setCurrentUser(null); localStorage.removeItem('currentUser'); setCurrentScreen('dashboard'); };
  const handleSelectDSA = (dsaCode: string) => { setSelectedDSA(dsaCode); setCurrentScreen('detail'); };

  // User Management Handlers (Fixed missing function errors)
  const handleAddUser = async (u: User | User[]) => {
    const list = Array.isArray(u) ? u : [u];
    
    setUsers(prev => {
        const updated = [...prev, ...list];
        localStorage.setItem('app_users', JSON.stringify(updated));
        return updated;
    });

    if (db && isOnline) { 
        try { 
            const batch = writeBatch(db); 
            list.forEach(item => batch.set(doc(db!, "users", item.id), sanitizeForFirestore(item))); 
            await batch.commit(); 
        } catch(e) { console.warn("Add User Offline", e); } 
    }
  };
  const handleUpdateUser = async (u: User) => {
    setUsers(prev => {
        const updated = prev.map(item => item.id === u.id ? u : item);
        localStorage.setItem('app_users', JSON.stringify(updated));
        return updated;
    });
    if (db && isOnline) { try { await setDoc(doc(db, "users", u.id), sanitizeForFirestore(u)); } catch(e) {} }
  };
  const handleDeleteUser = async (id: string) => {
    setUsers(prev => {
        const updated = prev.filter(u => u.id !== id);
        localStorage.setItem('app_users', JSON.stringify(updated));
        return updated;
    });
    if (db && isOnline) { try { await deleteDoc(doc(db, "users", id)); } catch(e) {} }
  };
  const handleBulkDeleteUsers = async (ids: string[]) => {
    setUsers(prev => {
        const updated = prev.filter(u => !ids.includes(u.id));
        localStorage.setItem('app_users', JSON.stringify(updated));
        return updated;
    });
    if (db && isOnline) { try { const batch = writeBatch(db); ids.forEach(id => batch.delete(doc(db!, "users", id))); await batch.commit(); } catch(e) {} }
  };

  // --- HANDLE SELF PROFILE UPDATE ---
  const handleUpdateProfile = async (updatedUser: User) => {
      // 1. Update State
      setCurrentUser(updatedUser);
      setUsers(prev => {
          const updated = prev.map(u => u.id === updatedUser.id ? updatedUser : u);
          localStorage.setItem('app_users', JSON.stringify(updated));
          return updated;
      });
      
      // 2. Persist to LocalStorage
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      
      // 3. Persist to Firestore
      if (db && isOnline) {
          try {
              await setDoc(doc(db, "users", updatedUser.id), sanitizeForFirestore(updatedUser));
          } catch(e) {
              console.error("Failed to update profile", e);
          }
      }
  };
  
  const refreshData = async () => {
      setIsLoadingData(true); setPermissionError(false); 
      if (!db || !isOnline) { setTimeout(() => setIsLoadingData(false), 500); return; }
      try {
        const sixtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 60)).toISOString().split('T')[0];
        const q = query(collection(db, "sales_records"), where("reportDate", ">=", sixtyDaysAgo));
        const sales = await getDocs(q); if (!sales.empty) {
            const data = sales.docs.map(doc => doc.data() as SalesRecord);
            setAllData(data);
            localStorage.setItem('sales_records', JSON.stringify(data));
        }
        const remUsers = await getDocs(collection(db, "users")); if (!remUsers.empty) {
            const uData = remUsers.docs.map(doc => doc.data() as User);
            setUsers(uData);
            localStorage.setItem('app_users', JSON.stringify(uData));
        }
        setLastUpdated(new Date());
      } catch(e: any) { if (e.code === 'permission-denied') setPermissionError(true); } finally { setIsLoadingData(false); }
  };

  const handleHardReset = () => { if(window.confirm("Bạn có chắc chắn muốn xóa Cache và Tải lại dữ liệu?")) { localStorage.removeItem('sales_records'); setAllData([]); refreshData(); } };
  
  // DATE FILTER HELPERS
  const setFilterToday = () => { setStartDate(formatDate(new Date())); setEndDate(formatDate(new Date())); };
  
  const setFilterWeek = () => {
    const curr = new Date();
    // getDay(): 0 is Sunday, 1 is Monday.
    // Calculate difference to get Monday (1)
    const first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1);
    const firstDay = new Date(curr.setDate(first));
    setStartDate(formatDate(firstDay));
    setEndDate(formatDate(new Date()));
  };

  const setFilterMonth = () => {
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    setStartDate(formatDate(firstDay));
    setEndDate(formatDate(new Date()));
  };

  const handleDateChange = (start: string, end: string) => { setStartDate(start); setEndDate(end); };

  // IMPLEMENTED: View Pending Records
  const handleViewPending = () => {
    setStatusFilter('Pending');
    setViewMode('table');
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    setStartDate(formatDate(sixtyDaysAgo));
    setEndDate(formatDate(new Date()));
  };

  // IMPLEMENTED: View Not Reported for Manager
  const handleViewNotReported = () => {
    setStatusFilter('Chưa báo cáo');
    setViewMode('table');
  };

  // IMPLEMENTED: Export CSV
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
        alert("Không có dữ liệu để xuất!");
        return;
    }
    const headers = [
        "ID", "DSA Code", "Họ Tên", "DSS", "SM", "Ngày Báo Cáo", "Trạng Thái", "Duyệt",
        "App", "Loan", "App CRC", "Loan CRC", "Volume", "Banca", 
        "App FEOL", "Loan FEOL", "Volume FEOL",
        "CTV", "CTV Mới", "Tờ Rơi", "ĐLK", "ĐLK Mới", "Cuộc Gọi", "Chi Phí QC"
    ];
    const csvRows = [
        headers.join(','),
        ...filteredData.map(row => [
            row.id, row.dsaCode, `"${row.name}"`, `"${row.dss}"`, `"${row.smName}"`,
            row.reportDate, row.status, row.approvalStatus,
            row.directApp, row.directLoan, row.directAppCRC, row.directLoanCRC, row.directVolume, row.directBanca,
            row.directAppFEOL, row.directLoanFEOL, row.directVolumeFEOL,
            row.ctv, row.newCtv, row.flyers, row.dlk, row.newDlk, row.callsMonth, row.adSpend
        ].join(','))
    ];
    const csvContent = "\uFEFF" + csvRows.join('\n'); 
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bao_cao_dsa_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentUser) return <Login onLogin={setCurrentUser} users={users} />;

  const bancaPercentage = stats.totalVolume > 0 ? ((stats.totalBanca / stats.totalVolume) * 100).toFixed(1) : '0';
  const canAccessSettings = ['ADMIN', 'RSM', 'SM', 'DSS'].includes(currentUser.role);
  const showSmFilterUI = ['ADMIN', 'RSM'].includes(currentUser.role);
  const showDssFilterUI = ['ADMIN', 'RSM', 'SM'].includes(currentUser.role);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col font-sans transition-colors duration-300">
      {/* Permission Error or Offline Warning */}
      {!isOnline && !isLoadingData && (
        <div className="bg-orange-100 text-orange-800 px-4 py-2 text-xs md:text-sm font-bold text-center flex items-center justify-center border-b border-orange-200">
             <WifiOff size={16} className="mr-2"/>
             <span>Chế độ Offline: Dữ liệu đang được lưu trên máy của bạn (Hết quota Firebase hoặc mất mạng).</span>
        </div>
      )}

      {permissionError && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"><div className="bg-white rounded-xl max-w-lg w-full p-6 text-center shadow-2xl"><ShieldAlert className="mx-auto text-amber-500 mb-4" size={56} /><h3 className="text-xl font-bold text-gray-900 mb-2">Không Có Quyền Truy Cập</h3><p className="text-gray-600 mb-4 text-sm">Hệ thống sẽ tải lại dữ liệu mới nhất.</p><button onClick={() => { setPermissionError(false); refreshData(); }} className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold w-full">Tải lại trang</button></div></div>
      )}

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-emerald-100 dark:border-gray-700 sticky top-0 z-30 shadow-sm">
        <div className="w-full lg:max-w-[1920px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentScreen('dashboard')}>
             <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-2 rounded-lg shadow-md"><FileText size={22} /></div>
             <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white leading-none">DSA Dashboard</h1>
                <p className="text-xs mt-0.5 font-bold uppercase flex items-center">
                    {isLoadingData ? <Loader2 size={10} className="animate-spin mr-1 text-emerald-600"/> : 
                     (isOnline ? <span className="text-emerald-600 dark:text-emerald-400">Online</span> : <span className="text-orange-500">Offline (Local)</span>)}
                </p>
             </div>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2">
             
             {/* User Avatar - Trigger Profile Modal */}
             <button 
                onClick={() => setShowProfileModal(true)}
                className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mr-1"
             >
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800 overflow-hidden">
                    {currentUser.avatar ? (
                        <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover"/>
                    ) : (
                        currentUser.name.charAt(0)
                    )}
                </div>
                <span className="hidden md:inline text-sm font-bold text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                    {currentUser.name}
                </span>
             </button>

             {/* SCALE CONTROLS (MOBILE ONLY) */}
             <div className="lg:hidden flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mr-1">
                 <button 
                    onClick={handleZoomOut} 
                    disabled={uiScale <= 60}
                    className="p-1.5 text-gray-500 hover:text-emerald-600 disabled:opacity-30 transition-colors"
                 >
                    <ZoomOut size={16} />
                 </button>
                 <span className="text-[10px] font-bold w-8 text-center">{uiScale}%</span>
                 <button 
                    onClick={handleZoomIn} 
                    disabled={uiScale >= 100}
                    className="p-1.5 text-gray-500 hover:text-emerald-600 disabled:opacity-30 transition-colors"
                 >
                    <ZoomIn size={16} />
                 </button>
             </div>

             <button onClick={() => setShowUserGuide(true)} className="flex items-center p-2 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors" title="Hướng dẫn sử dụng">
                 <HelpCircle size={22}/>
             </button>

             <button onClick={() => setCurrentScreen('calculator')} className="hidden md:flex items-center px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50"><Calculator size={18} className="mr-1.5"/> Tính Lãi</button>
             <button onClick={() => setCurrentScreen('knowledge')} className="hidden md:flex items-center px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50"><BookOpen size={18} className="mr-1.5"/> Kiến Thức</button>
             {canAccessSettings && <button onClick={() => setCurrentScreen('admin')} className="hidden md:flex items-center px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50"><Settings size={18} className="mr-1.5"/> Quản lý</button>}
             <button onClick={toggleTheme} className="p-2 text-gray-500">{theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}</button>
             <button onClick={handleHardReset} className="p-2 text-gray-500 hover:text-red-500"><Database size={20} /></button>
             <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-600"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full lg:max-w-[1920px] mx-auto px-4 py-8 flex flex-col">
        {currentScreen === 'admin' ? (
          <UserManagement users={users} currentUser={currentUser} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} onBulkDeleteUsers={handleBulkDeleteUsers} onClose={() => setCurrentScreen('dashboard')} />
        ) : currentScreen === 'calculator' ? (
            <LoanCalculator currentUser={currentUser} onClose={() => setCurrentScreen('dashboard')} />
        ) : currentScreen === 'knowledge' ? (
            <KnowledgeBase currentUser={currentUser} onClose={() => setCurrentScreen('dashboard')} />
        ) : currentScreen === 'detail' && selectedDSA ? (
          <DSADetail dsaCode={selectedDSA} data={allData} onBack={() => setCurrentScreen('dashboard')} />
        ) : (
          <>
            {/* MOTIVATIONAL QUOTE BANNER */}
            <div className="mb-6 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl p-4 text-white shadow-md relative overflow-hidden animate-in fade-in slide-in-from-top-4">
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                     <Sparkles size={100} />
                 </div>
                 <div className="flex items-center justify-center text-center relative z-10">
                     <Lightbulb className="mr-3 text-yellow-300 flex-shrink-0 hidden md:block" size={24} />
                     <span className="font-medium text-sm md:text-base italic">"{randomQuote}"</span>
                 </div>
            </div>

            {/* ALERT FOR DSA (SELF) */}
            {dsaInfo && !dsaInfo.isReportedToday && (
                <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl py-4 px-5 flex items-center shadow-sm dark:from-red-900/30 dark:to-pink-900/30">
                    <div className="bg-red-100 p-2 rounded-full mr-4"><BellRing className="text-red-600 animate-bounce" size={24} /></div>
                    <div>
                        <h3 className="font-bold text-red-800 dark:text-red-300">Bạn chưa báo cáo hôm nay!</h3>
                        <p className="text-red-600 text-sm">Hãy cập nhật doanh số ngay để cải thiện thứ hạng.</p>
                    </div>
                    <button onClick={handleCreateNew} className="ml-auto bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Báo cáo ngay</button>
                </div>
            )}
            
            {/* ALERT FOR MANAGER (UNREPORTED STAFF) */}
            {currentUser.role !== 'DSA' && notReportedCount > 0 && isViewingToday && (
                <div className="mb-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 rounded-xl p-3 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center">
                        <AlertTriangle className="text-orange-500 mr-2" size={20}/>
                        <span className="font-bold text-orange-800 dark:text-orange-300 text-sm">
                           Cảnh báo: Có <span className="text-red-600 text-lg">{notReportedCount}</span> nhân viên chưa báo cáo hôm nay!
                        </span>
                    </div>
                    <button onClick={handleViewNotReported} className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-700 transition-colors">
                        Kiểm tra ngay
                    </button>
                </div>
            )}

            {/* ALERT FOR PENDING APPROVALS */}
            {pendingRecords.length > 0 && (
                <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center">
                        <FileCheck className="text-blue-500 mr-2" size={20}/>
                        <span className="font-bold text-blue-800 dark:text-blue-300 text-sm">Có {pendingRecords.length} yêu cầu chờ duyệt.</span>
                    </div>
                    <button onClick={handleViewPending} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors">Duyệt Ngay</button>
                </div>
            )}

            {/* MODIFIED GRID: Balanced 4 columns on desktop, 8 columns only on very large screens */}
            <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-8 gap-3 mb-8">
              <StatsCard title="Doanh Số" value={`${formatCurrencyCompact(stats.totalVolume)} ₫`} color="red" icon={<DollarSign size={20} />} />
              <StatsCard title="Tổng Banca" value={`${formatCurrencyCompact(stats.totalBanca)} ₫`} color="green" icon={<Briefcase size={20} />} />
              <StatsCard title="% Banca" value={`${bancaPercentage}%`} color="orange" icon={<Percent size={20} />} />
              <StatsCard title="Thẻ (CRC)" value={stats.totalLoanCRC.toString()} color="blue" icon={<CreditCard size={20} />} />
              
              {/* NEW CARDS */}
              <StatsCard title="ProApp" value={proApp} color="blue" icon={<BarChart2 size={20} />} />
              <StatsCard title="Case Size" value={`${formatCurrencyCompact(caseSize)}`} color="green" icon={<PieChart size={20} />} />

              {dsaInfo ? <StatsCard title="Xếp Hạng" value={`#${dsaInfo.rank}/${dsaInfo.totalDSAs}`} color="green" icon={<Trophy size={20} />} /> : <StatsCard title="Hoạt Động" value={`${uniqueReportedCount}/${filteredHeadcount}`} color="green" icon={<Users size={20} />} />}
              <StatsCard title="Tỷ lệ %" value={filteredHeadcount > 0 ? `${((uniqueReportedCount / filteredHeadcount) * 100).toFixed(0)}%` : '0%'} color="blue" icon={<Activity size={20} />} />
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md mb-6 flex flex-col md:flex-row justify-between gap-4">
               <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700/50 p-1 rounded-lg border border-gray-200 dark:border-gray-600">
                      <input type="date" value={startDate} onChange={e => handleDateChange(e.target.value, endDate)} className="bg-transparent border-none text-sm font-medium w-28" />
                      <span>-</span>
                      <input type="date" value={endDate} onChange={e => handleDateChange(startDate, e.target.value)} className="bg-transparent border-none text-sm font-medium w-28" />
                    </div>
                    <div className="flex gap-1">
                        <button onClick={setFilterToday} className="px-2 py-1.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded-lg whitespace-nowrap">Hôm nay</button>
                        <button onClick={setFilterWeek} className="px-2 py-1.5 text-[10px] font-bold bg-blue-50 text-blue-700 rounded-lg whitespace-nowrap">Tuần này</button>
                        <button onClick={setFilterMonth} className="px-2 py-1.5 text-[10px] font-bold bg-purple-50 text-purple-700 rounded-lg whitespace-nowrap">Tháng này</button>
                    </div>
                    {/* Status Filter */}
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm bg-gray-50 border-gray-200 rounded-lg">
                        <option value="all">Tất cả trạng thái</option>
                        <option value="Đã báo cáo">Đã báo cáo</option>
                        <option value="Chưa báo cáo">Chưa báo cáo</option>
                        <option value="Pending">Chờ duyệt</option>
                    </select>

                    {showSmFilterUI && <select value={smFilter} onChange={e => setSmFilter(e.target.value)} className="text-sm bg-gray-50 border-gray-200 rounded-lg"><option value="all">Tất cả SM</option>{smOptions.map(sm => <option key={sm.id} value={sm.name}>{sm.name}</option>)}</select>}
                    {showDssFilterUI && <select value={dssFilter} onChange={e => setDssFilter(e.target.value)} className="text-sm bg-gray-50 border-gray-200 rounded-lg"><option value="all">Tất cả DSS</option>{dssOptions.map(dss => <option key={dss.id} value={dss.name}>{dss.name}</option>)}</select>}
                    <button onClick={refreshData} className="p-1.5 text-emerald-600"><RefreshCw size={16} className={isLoadingData ? 'animate-spin' : ''}/></button>
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
               <DashboardCharts data={filteredData} globalData={dateFilteredGlobalData} currentUser={currentUser} users={users} onDateChange={handleDateChange} startDate={startDate} endDate={endDate} />
            ) : (
               <SalesTable data={filteredData} onRowClick={handleSelectDSA} onEdit={handleEditRecord} onApprove={handleApproveRecord} onDelete={handleDeleteRecord} currentUser={currentUser} statusFilter={statusFilter} />
            )}
          </>
        )}
        <div className="text-center py-6 mt-4 border-t border-dashed border-gray-200"><a href="https://zalo.me/0867641331" target="_blank" rel="noreferrer" className="text-[10px] font-mono text-gray-300 hover:text-gray-500 transition-colors">Developed by DSS Nguyễn Minh Đức</a></div>
      </main>

      {/* --- MODALS --- */}
      {showForm && (
        <EntryForm onClose={() => setShowForm(false)} onSave={handleSaveRecord} currentUser={currentUser} users={users} initialData={editingRecord} existingRecords={allData} />
      )}
      
      {showProfileModal && (
        <ProfileSettings currentUser={currentUser} onClose={() => setShowProfileModal(false)} onUpdate={handleUpdateProfile} />
      )}

      {showUserGuide && (
        <UserGuide currentUser={currentUser} onClose={() => setShowUserGuide(false)} />
      )}

      {currentScreen === 'dashboard' && <button onClick={handleCreateNew} className="md:hidden fixed bottom-6 right-6 z-40 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full p-4 shadow-xl border-4 border-white/20"><Plus size={32} /></button>}
    </div>
  );
};

export default App;