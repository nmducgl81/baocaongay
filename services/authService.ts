import { User } from '../types';

export const authService = {
  login: async (username: string, password: string, users: User[]): Promise<User | null> => {
    // Simulating API call
    return new Promise((resolve) => {
      setTimeout(() => {
        // Find user in the dynamic list passed from App state
        // Case insensitive and trim whitespace
        const cleanUsername = username.trim();
        const user = users.find(u => u.username === cleanUsername);
        
        // Simple password check (Mock logic: all passwords are '123')
        if (user && password === '123') {
            resolve(user);
        } else {
            resolve(null);
        }
      }, 300); // Reduced delay for better UX
    });
  },

  // Get all DSA IDs that are visible to the current user
  getVisibleDSAIds: (currentUser: User, allUsers: User[]): string[] => {
    if (currentUser.role === 'ADMIN') {
        // Admin sees everyone
        return allUsers.filter(u => u.role === 'DSA').map(u => u.dsaCode || '');
    }

    if (currentUser.role === 'DSA') {
        // DSA only sees themselves
        return [currentUser.dsaCode || ''];
    }

    // Recursive function to find all subordinates based on the current user list
    const getSubordinates = (managerId: string): User[] => {
        const directReports = allUsers.filter(u => u.parentId === managerId);
        let allSubordinates = [...directReports];
        
        directReports.forEach(report => {
            if (report.role !== 'DSA') {
                allSubordinates = [...allSubordinates, ...getSubordinates(report.id)];
            }
        });
        return allSubordinates;
    };

    const subordinates = getSubordinates(currentUser.id);
    return subordinates
        .filter(u => u.role === 'DSA')
        .map(u => u.dsaCode || '')
        .filter(code => code !== '');
  }
};