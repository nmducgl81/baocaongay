import { SalesRecord, User } from '../types';

// Mock Users Hierarchy
export const MOCK_USERS: User[] = [
  { 
      id: 'admin', 
      username: 'admin', 
      name: 'System Admin', 
      role: 'ADMIN',
      phoneNumber: '0909000111',
      avatar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAJJSURBVHgB7Zq9jxpBEIbnDVwcC5bM2LhIEomERMRObEQU/wUQKZK/I0KkCBG5CImIyI0tWzYSEuTGRoaNjc8yM/Z4z9zu9m2PZ6bao5WmZ7p7+ulhprt6Z87n81k1y+WyWq/X1WazqTabjZfVarWqFovFzD1e/X6/2u/3XjabTfX58+d/7nmx2+28rP1+Xz08PMy84/V8PquvX7962YfRaFSPj48z73g9HA7V9fW1l30YjUbV169fpx7yenz8/5XyYRiG1Xg8nnrH6/PzszgIfRiPx9VwOJytx4v3s9lscRD6MBqNqtFoNHOPVz4Iffj+/bs4tFwuh8uHl5eX4iB0Qj6E8iE8hPIhPITyITyE8iE8hPIhPITyITyE8iE8hPIhPITyITyE8iE8hPIhPITyITyE8iE8hPIhPITyITyE8iE8hPIhPITyITyE8iE8hPIhPITyITyE8iE8hPIhPITyITyE8iE8hPIhPITyITyE8iE8hPIhPITyITyE8iE8hPIhPITyITyE8iE8hPIhPITyITyE8iE8hPIhPITyITyE8iE8hPIhPITyITyE8iE8hPIhPITyITyE8iE8hPIh9+Pz5szi0XC6Hy4d3796Jg9AJ+RDKh/AQyofwEMqH8BDKh/AQyofwEMqH8BDKh/AQyofwEMqH8BDKh/AQyofwEMqH8BDKh/AQyofwEPvQ7/eLQ8vlcrh8eP/+\/dQ9XqfTqXj50O12q+fn56l3vA6HQ3V1deVlH7rdbrVer2fe8Xp7e6uOxyMv+/D169f/3POi1Wp5Wfv9vvr06dPMO17/Ad7yJlb1Q/IwAAAAAElFTkSuQmCC'
  },
  { id: 'rsm1', username: 'rsm_hcm', name: 'NGUYỄN VĂN A (RSM)', role: 'RSM', parentId: 'admin', phoneNumber: '0912345678' },
  
  // SMs under RSM1
  { id: 'sm1', username: 'sm_east2', name: 'EAST 2 (SM)', role: 'SM', parentId: 'rsm1', phoneNumber: '0987654321' },
  { id: 'sm2', username: 'sm_west1', name: 'WEST 1 (SM)', role: 'SM', parentId: 'rsm1', phoneNumber: '0977888999' },

  // DSSs under SM1
  { id: 'dss1', username: 'dss_qua', name: 'BÙI CÔNG QUẢ', role: 'DSS', parentId: 'sm1', phoneNumber: '0933444555' },
  { id: 'dss2', username: 'dss_nhung', name: 'LÊ THỊ NHUNG', role: 'DSS', parentId: 'sm1', phoneNumber: '0944555666' },
  { id: 'dss3', username: 'dss_nhi', name: 'HUỲNH KHANG NHI', role: 'DSS', parentId: 'sm1', phoneNumber: '0955666777' },

  // DSAs under DSS1 (Qua)
  { id: 'dsa1', username: 'dsa_thien', dsaCode: 'DA014795', name: 'TRẦN MINH THIỆN', role: 'DSA', parentId: 'dss1', phoneNumber: '0867641331' },
  { id: 'dsa2', username: 'dsa_trang', dsaCode: 'DA013631', name: 'VÒNG ĐOAN TRANG', role: 'DSA', parentId: 'dss1', phoneNumber: '0966777888' },
  { id: 'dsa3', username: 'dsa_thuy', dsaCode: 'DA015535', name: 'TRƯƠNG THỊ THÙY TRANG', role: 'DSA', parentId: 'dss1', phoneNumber: '0988999000' },

  // DSAs under DSS2 (Nhung)
  { id: 'dsa4', username: 'dsa_hue', dsaCode: 'DA012308', name: 'PHAN THỊ THANH HUẾ', role: 'DSA', parentId: 'dss2', phoneNumber: '0999000111' },
  
  // DSAs under DSS3 (Nhi)
  { id: 'dsa5', username: 'dsa_tien', dsaCode: 'DA012262', name: 'NGUYỄN THỊ BÍCH TIÊN', role: 'DSA', parentId: 'dss3', phoneNumber: '0911222333' },
];

export const generateMockData = (): SalesRecord[] => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  return [
    {
      id: '1',
      dsaCode: 'DA014795',
      name: 'TRẦN MINH THIỆN',
      dss: 'BÙI CÔNG QUẢ',
      smName: 'EAST 2',
      reportDate: todayStr,
      status: 'Đã báo cáo',
      approvalStatus: 'Approved',
      directApp: 1,
      directLoan: 0,
      directAppCRC: 2,
      directLoanCRC: 1,
      directAppFEOL: 0,
      directLoanFEOL: 0,
      directVolumeFEOL: 0,
      directVolume: 0,
      directBanca: 0,
      directRol: '0.0%',
      onlineApp: 0,
      onlineVolume: 0,
      ctv: 5,
      newCtv: 0,
      flyers: 0,
      dlk: 5,
      newDlk: 0,
      callsMonth: 200,
      adSpend: 10000000,
      refs: 10
    },
    {
      id: '2',
      dsaCode: 'DA013631',
      name: 'VÒNG ĐOAN TRANG',
      dss: 'BÙI CÔNG QUẢ',
      smName: 'EAST 2',
      reportDate: todayStr,
      status: 'Chưa báo cáo',
      approvalStatus: 'Approved',
      directApp: 0,
      directLoan: 0,
      directAppCRC: 0,
      directLoanCRC: 0,
      directAppFEOL: 0,
      directLoanFEOL: 0,
      directVolumeFEOL: 0,
      directVolume: 0,
      directBanca: 0,
      directRol: '0.0%',
      onlineApp: 0,
      onlineVolume: 0,
      ctv: 0,
      newCtv: 0,
      flyers: 0,
      dlk: 0,
      newDlk: 0,
      callsMonth: 0,
      adSpend: 0,
      refs: 0
    },
    {
      id: '3',
      dsaCode: 'DA015535',
      name: 'TRƯƠNG THỊ THÙY TRANG',
      dss: 'BÙI CÔNG QUẢ',
      smName: 'EAST 2',
      reportDate: todayStr,
      status: 'Đã báo cáo',
      approvalStatus: 'Approved',
      directApp: 1,
      directLoan: 0,
      directAppCRC: 1,
      directLoanCRC: 1,
      directAppFEOL: 0,
      directLoanFEOL: 0,
      directVolumeFEOL: 0,
      directVolume: 0,
      directBanca: 0,
      directRol: '0.0%',
      onlineApp: 0,
      onlineVolume: 2,
      ctv: 7,
      newCtv: 0,
      flyers: 1000,
      dlk: 5,
      newDlk: 0,
      callsMonth: 200,
      adSpend: 1000000,
      refs: 12
    },
    {
      id: '4',
      dsaCode: 'DA012262',
      name: 'NGUYỄN THỊ BÍCH TIÊN',
      dss: 'HUỲNH KHANG NHI',
      smName: 'EAST 2',
      reportDate: todayStr,
      status: 'Đã báo cáo',
      approvalStatus: 'Pending', // Example of a pending approval
      directApp: 6,
      directLoan: 3,
      directAppCRC: 5,
      directLoanCRC: 2,
      directAppFEOL: 2,
      directLoanFEOL: 1,
      directVolumeFEOL: 15000000,
      directVolume: 105000000,
      directBanca: 1800000,
      directRol: '1.7%',
      onlineApp: 0,
      onlineVolume: 0,
      ctv: 10,
      newCtv: 10,
      flyers: 22000,
      dlk: 10,
      newDlk: 9,
      callsMonth: 100,
      adSpend: 0,
      refs: 70
    },
    {
      id: '5',
      dsaCode: 'DA012308',
      name: 'PHAN THỊ THANH HUẾ',
      dss: 'LÊ THỊ NHUNG',
      smName: 'EAST 2',
      reportDate: todayStr,
      status: 'Đã báo cáo',
      approvalStatus: 'Approved',
      directApp: 2,
      directLoan: 1,
      directAppCRC: 3,
      directLoanCRC: 0,
      directAppFEOL: 0,
      directLoanFEOL: 0,
      directVolumeFEOL: 0,
      directVolume: 27000000,
      directBanca: 600000,
      directRol: '2.2%',
      onlineApp: 1,
      onlineVolume: 0,
      ctv: 11,
      newCtv: 9,
      flyers: 2000000,
      dlk: 11,
      newDlk: 9,
      callsMonth: 70,
      adSpend: 200000,
      refs: 9
    }
  ];
};