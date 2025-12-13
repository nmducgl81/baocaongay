export type Role = 'DSA' | 'DSS' | 'SM' | 'RSM' | 'ADMIN';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  parentId?: string; // ID of the manager
  dsaCode?: string; // Only for DSA
  avatar?: string; // Base64 string of the user's portrait
}

export interface SalesRecord {
  id: string;
  // Green Section: Basic Info
  dsaCode: string;
  name: string;
  dss: string;
  smName: string;
  reportDate: string; // YYYY-MM-DD
  status: 'Đã báo cáo' | 'Chưa báo cáo';
  approvalStatus: 'Approved' | 'Pending' | 'Rejected'; // New field for approval workflow
  proofImage?: string; // Base64 string of the uploaded image

  // Red Section: Direct Sales
  directApp: number;
  directLoan: number;
  directAppCRC: number; // New: Credit Card App
  directLoanCRC: number; // New: Credit Card Loan (Issued)
  directVolume: number;
  directBanca: number;
  directRol: string; // e.g., "0.0%"

  // Blue Section: Online Sales
  onlineApp: number;
  onlineVolume: number;

  // Orange Section: Activity
  ctv: number;
  newCtv: number;
  flyers: number;
  dlk: number; // Đăng ký
  newDlk: number;
  callsMonth: number;
  adSpend: number;
  refs: number;
}

export interface DashboardStats {
  totalRecords: number;
  reportedCount: number;
  totalVolume: number;
  totalApps: number;
  totalLoanCRC: number; // Changed from totalApps to specific CRC Loan count
  totalBanca: number;
}

export type ViewMode = 'table' | 'chart';
export type AppScreen = 'dashboard' | 'detail' | 'admin';