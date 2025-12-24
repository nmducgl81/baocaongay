import { useMemo } from 'react';
import { SalesRecord, User, DashboardStats } from '../types';
import { authService } from '../services/authService';

interface FilterProps {
    allData: SalesRecord[];
    users: User[];
    currentUser: User | null;
    startDate: string;
    endDate: string;
    statusFilter: string;
    smFilter: string;
    dssFilter: string;
}

export const useSalesFilter = ({ 
    allData, users, currentUser, startDate, endDate, statusFilter, smFilter, dssFilter 
}: FilterProps) => {

    // 1. Hierarchy & Permissions Map
    const hierarchyInfo = useMemo(() => {
        if (!currentUser) return { visibleIds: [], hierarchyMap: new Map() };
        
        const visibleIds = authService.getVisibleDSAIds(currentUser, users);
        const hierarchyMap = new Map<string, { dss: string, sm: string }>();
        
        users.forEach(u => {
            if (u.role === 'DSA' && u.dsaCode) {
                let dss = '';
                let sm = '';
                const parent = users.find(p => p.id === u.parentId);
                if (parent) {
                    if (parent.role === 'DSS') {
                        dss = parent.name;
                        const grandParent = users.find(gp => gp.id === parent.parentId);
                        if (grandParent && grandParent.role === 'SM') sm = grandParent.name;
                    } else if (parent.role === 'SM') {
                        sm = parent.name;
                    }
                }
                hierarchyMap.set(u.dsaCode, { dss, sm });
            }
        });
        return { visibleIds, hierarchyMap };
    }, [currentUser, users]);

    // 2. Filter Logic & Virtual Record Generation
    const filteredData = useMemo(() => {
        if (!currentUser) return [];
        const { visibleIds, hierarchyMap } = hierarchyInfo;

        // A. Filter Actual Records
        let actualRecords = allData.filter(record => 
            visibleIds.includes(record.dsaCode) && 
            record.reportDate >= startDate && 
            record.reportDate <= endDate
        ).map(record => {
            // Sync Hierarchy Names
            const currentHierarchy = hierarchyMap.get(record.dsaCode);
            if (currentHierarchy) {
                return {
                    ...record,
                    dss: currentHierarchy.dss || record.dss,
                    smName: currentHierarchy.sm || record.smName
                };
            }
            return record;
        });

        // B. Apply Dropdown Filters
        if (smFilter !== 'all') actualRecords = actualRecords.filter(r => r.smName === smFilter);
        if (dssFilter !== 'all') actualRecords = actualRecords.filter(r => r.dss === dssFilter);

        if (statusFilter === 'Đã báo cáo') return actualRecords.filter(r => r.status === 'Đã báo cáo');
        if (statusFilter === 'Pending') return actualRecords.filter(r => r.approvalStatus === 'Pending');

        // C. Generate "Missing" (Virtual) Records
        const dayDiff = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24);
        let virtualRecords: SalesRecord[] = [];

        // Only generate if range is reasonable (<= 31 days)
        if (dayDiff <= 31) {
            const dsaUsersInScope = users.filter(u => u.role === 'DSA' && visibleIds.includes(u.dsaCode || ''));
            const existingMap = new Set(actualRecords.map(r => `${r.dsaCode}_${r.reportDate}`));
            
            const dt = new Date(startDate);
            const endDt = new Date(endDate);
            
            while (dt <= endDt) {
                const dateStr = dt.toISOString().split('T')[0];
                
                dsaUsersInScope.forEach(user => {
                    const hier = hierarchyMap.get(user.dsaCode || '') || { dss: '', sm: '' };
                    let matchesFilter = true;
                    if (smFilter !== 'all' && hier.sm !== smFilter) matchesFilter = false;
                    if (dssFilter !== 'all' && hier.dss !== dssFilter) matchesFilter = false;

                    if (matchesFilter) {
                        const key = `${user.dsaCode}_${dateStr}`;
                        if (!existingMap.has(key)) {
                            virtualRecords.push({
                                id: `virt-${user.id}-${dateStr}`, 
                                dsaCode: user.dsaCode || '',
                                name: user.name,
                                dss: hier.dss,
                                smName: hier.sm,
                                reportDate: dateStr,
                                status: 'Chưa báo cáo',
                                approvalStatus: 'Approved',
                                directApp: 0, directLoan: 0, directAppCRC: 0, directLoanCRC: 0, 
                                directAppFEOL: 0, directLoanFEOL: 0, directVolumeFEOL: 0, 
                                directVolume: 0, directBanca: 0, directRol: '0.0%', 
                                onlineApp: 0, onlineVolume: 0, ctv: 0, newCtv: 0, 
                                flyers: 0, dlk: 0, newDlk: 0, callsMonth: 0, adSpend: 0, refs: 0
                            });
                        }
                    }
                });
                dt.setDate(dt.getDate() + 1);
            }
        }

        if (statusFilter === 'Chưa báo cáo') return virtualRecords;

        const realReports = actualRecords.filter(r => r.status === 'Đã báo cáo' || r.status.startsWith('Ngày'));
        return [...realReports, ...virtualRecords];

    }, [allData, currentUser, startDate, endDate, statusFilter, smFilter, dssFilter, users, hierarchyInfo]);

    // 3. Calculate Stats
    const stats: DashboardStats = useMemo(() => {
        return filteredData.reduce((acc, curr) => ({ 
            totalRecords: acc.totalRecords + 1, 
            reportedCount: curr.status === 'Đã báo cáo' ? acc.reportedCount + 1 : acc.reportedCount, 
            totalVolume: acc.totalVolume + curr.directVolume + (curr.directVolumeFEOL || 0), 
            totalDirectVolume: acc.totalDirectVolume + curr.directVolume, 
            totalApps: acc.totalApps + curr.directApp, 
            totalLoans: acc.totalLoans + curr.directLoan, 
            totalLoansFEOL: acc.totalLoansFEOL + (curr.directLoanFEOL || 0), 
            totalLoanCRC: acc.totalLoanCRC + (curr.directLoanCRC || 0), 
            totalBanca: acc.totalBanca + curr.directBanca 
        }), { totalRecords: 0, reportedCount: 0, totalVolume: 0, totalDirectVolume: 0, totalApps: 0, totalLoans: 0, totalLoansFEOL: 0, totalLoanCRC: 0, totalBanca: 0 });
    }, [filteredData]);

    // 4. Calculate DSA Info (Rank, Status for Current User)
    const dsaInfo = useMemo(() => {
        if (currentUser?.role !== 'DSA') return null;
        const today = new Date().toISOString().split('T')[0];
        const isReportedToday = allData.some(r => r.dsaCode === currentUser.dsaCode && r.reportDate === today && r.status === 'Đã báo cáo');
        
        // Calculate Rank in Global Scope
        const volumeMap = new Map<string, number>();
        users.filter(u => u.role === 'DSA').forEach(u => u.dsaCode && volumeMap.set(u.dsaCode, 0));
        
        allData.filter(r => r.reportDate >= startDate && r.reportDate <= endDate)
               .forEach(r => {
                   if (volumeMap.has(r.dsaCode)) {
                       volumeMap.set(r.dsaCode, volumeMap.get(r.dsaCode)! + r.directVolume + (r.directVolumeFEOL || 0));
                   }
               });
        
        const sorted = Array.from(volumeMap.entries()).sort((a, b) => b[1] - a[1]);
        const myRank = sorted.findIndex(item => item[0] === currentUser.dsaCode) + 1;
        
        return { isReportedToday, rank: myRank || sorted.length, totalDSAs: sorted.length };
    }, [currentUser, allData, startDate, endDate, users]);

    // 5. Headcount Logic
    const headcount = useMemo(() => {
        if (!currentUser) return 0;
        const { visibleIds } = hierarchyInfo;
        let target = users.filter(u => u.role === 'DSA' && visibleIds.includes(u.dsaCode || ''));
        if (smFilter !== 'all') target = target.filter(u => { const p = users.find(x => x.id === u.parentId); if (!p) return false; if (p.role === 'SM') return p.name === smFilter; const gp = users.find(x => x.id === p.parentId); return gp && gp.name === smFilter; });
        if (dssFilter !== 'all') target = target.filter(u => users.find(x => x.id === u.parentId)?.name === dssFilter);
        return target.length;
    }, [users, currentUser, smFilter, dssFilter, hierarchyInfo]);

    const uniqueReportedCount = useMemo(() => new Set(filteredData.filter(r => r.status === 'Đã báo cáo').map(r => r.dsaCode)).size, [filteredData]);

    return { filteredData, stats, dsaInfo, headcount, uniqueReportedCount };
};
