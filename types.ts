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
  appSur: number; // Changed to Number for counting/calculation

  // Red Section: Direct Sales
  directApp: number;
  directLoan: number; // Will be labeled as LOAN_PL
  directLoanXSTU: number; // New field: LOAN XSTU
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

  // Orange Section: Activity (Updated per user request)
  customerCare: number; // Chăm sóc KH (10-15 KH)
  messageNewCust: number; // Nhắn tin tìm KH mới (>= 30 TIN)
  friendZalo: number; // Kết bạn Zalo/FB (2 bạn)
  postSocial: number; // Đăng bài tìm KH qua Zalo/FB/Tiktok (2 bài)
  postGroup: number; // Đăng bài hội nhóm (1 nhóm)
  marketActivity: number; // Hoạt động thị trường (1 lần/ngày)
  ctvCare: number; // Gọi/nhắn CTV hiện hữu (>= 5 CTV)
  newCtv: number; // Tuyển & trao đổi CTV mới (1 - 2 CTV)
}

export interface DashboardStats {
  totalRecords: number;
  reportedCount: number;
  totalVolume: number;
  totalDirectVolume: number; // Only Direct Volume (Cash)
  totalApps: number;
  totalLoans: number; // Total Cash Loans
  totalLoanXSTU: number; // New: Total XSTU Loans
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