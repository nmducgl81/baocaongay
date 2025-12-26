export type Role = 'DSA' | 'DSS' | 'SM' | 'RSM' | 'ADMIN';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  parentId?: string; // ID of the manager
  dsaCode?: string; // Only for DSA
  avatar?: string; // Base64 string of the user's portrait
  phoneNumber?: string; // New: Phone number for contact
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
  
  // Purple Section: FEOL Sales
  directAppFEOL: number;
  directLoanFEOL: number;
  directVolumeFEOL: number;

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
  totalDirectVolume: number; // Only Direct Volume (Cash)
  totalApps: number;
  totalLoans: number; // Total Cash Loans
  totalLoansFEOL: number; // New: Total FEOL Loans for Case Size
  totalLoanCRC: number; 
  totalBanca: number;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string; // HTML or Markdown text
  image?: string; // Base64 compressed image
  author: string;
  date: string;
  role: Role; // Role required to see/edit (usually all see, manager edit)
}

export type ViewMode = 'table' | 'chart';
export type AppScreen = 'dashboard' | 'detail' | 'admin' | 'calculator' | 'knowledge' | 'data';