import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { MOCK_USERS } from '../services/mockData';
import { authService } from '../services/authService';
import { db, ensureAuth } from '../services/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, onSnapshot } from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => void;
  addUser: (u: User | User[]) => Promise<void>;
  updateUser: (u: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  bulkDeleteUsers: (ids: string[]) => Promise<void>;
  updateProfile: (u: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper for safe parsing
const safeJsonParse = <T,>(key: string, fallback: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        console.warn(`Error parsing ${key} from localStorage, resetting.`, e);
        localStorage.removeItem(key);
        return fallback;
    }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Initialize State from LocalStorage SAFELY
  const [currentUser, setCurrentUser] = useState<User | null>(() => safeJsonParse<User | null>('currentUser', null));

  const [users, setUsers] = useState<User[]>(() => safeJsonParse<User[]>('app_users', MOCK_USERS));

  // 2. Real-time Sync with Firebase
  useEffect(() => {
    let unsubscribe: () => void;

    const setupSync = async () => {
        if (!db) return; // Offline fallback

        try {
            const authResult = await ensureAuth();
            if (authResult.success) {
                console.log("☁️ Context: Setting up Real-time Sync...");
                
                unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
                    const remoteUsers = snapshot.docs.map(d => d.data() as User);
                    
                    // Update State immediately for Real-time UI
                    setUsers(remoteUsers);

                    // Non-blocking storage update to prevent UI freeze
                    setTimeout(() => {
                        localStorage.setItem('app_users', JSON.stringify(remoteUsers));
                    }, 0);

                    // Sync current user if data changed
                    if (currentUser) {
                        const updatedSelf = remoteUsers.find(u => u.id === currentUser.id);
                        // Simple check to avoid loop, checking specific fields or just ID/Role/Name could be lighter
                        // but for single user object, JSON stringify is acceptable compared to full list
                        if (updatedSelf && JSON.stringify(updatedSelf) !== JSON.stringify(currentUser)) {
                            setCurrentUser(updatedSelf);
                            setTimeout(() => {
                                localStorage.setItem('currentUser', JSON.stringify(updatedSelf));
                            }, 0);
                        }
                    }
                }, (error) => {
                    console.error("❌ Firestore Sync Error:", error);
                });
            }
        } catch (e) {
            console.warn("AuthContext Sync Setup Error:", e);
        }
    };

    setupSync();

    return () => {
        if (unsubscribe) unsubscribe();
    };
  }, [currentUser]); // Re-run if currentUser changes to ensure sync is active (though mostly stable)

  // 3. Actions
  const login = async (username: string, password: string) => {
      const user = await authService.login(username, password, users);
      if (user) {
          setCurrentUser(user);
          localStorage.setItem('currentUser', JSON.stringify(user));
          return true;
      }
      return false;
  };

  const logout = () => {
      setCurrentUser(null);
      localStorage.removeItem('currentUser');
  };

  const sanitize = (obj: any) => JSON.parse(JSON.stringify(obj));

  const addUser = async (u: User | User[]) => {
      const list = Array.isArray(u) ? u : [u];
      
      // Optimistic update
      setUsers(prev => {
          const updated = [...prev];
          list.forEach(newUser => {
              if (!updated.find(existing => existing.id === newUser.id)) {
                  updated.push(newUser);
              }
          });
          localStorage.setItem('app_users', JSON.stringify(updated));
          return updated;
      });
      
      if (db) {
          try {
              const batch = writeBatch(db);
              list.forEach(item => batch.set(doc(db!, "users", item.id), sanitize(item)));
              await batch.commit();
          } catch(e) { console.warn("Offline Add User Error", e); }
      }
  };

  const updateUser = async (u: User) => {
      // Optimistic update
      setUsers(prev => {
          const updated = prev.map(item => item.id === u.id ? u : item);
          localStorage.setItem('app_users', JSON.stringify(updated));
          return updated;
      });

      if (currentUser?.id === u.id) {
          setCurrentUser(u);
          localStorage.setItem('currentUser', JSON.stringify(u));
      }
      if (db) try { await setDoc(doc(db, "users", u.id), sanitize(u)); } catch(e) { console.warn("Offline Update User Error", e); }
  };

  const deleteUser = async (id: string) => {
      // Optimistic update
      setUsers(prev => {
          const updated = prev.filter(u => u.id !== id);
          localStorage.setItem('app_users', JSON.stringify(updated));
          return updated;
      });

      if (db) try { await deleteDoc(doc(db, "users", id)); } catch(e) { console.warn("Offline Delete User Error", e); }
  };

  const bulkDeleteUsers = async (ids: string[]) => {
      // Optimistic update
      setUsers(prev => {
          const updated = prev.filter(u => !ids.includes(u.id));
          localStorage.setItem('app_users', JSON.stringify(updated));
          return updated;
      });

      if (db) {
          try {
              const batch = writeBatch(db);
              ids.forEach(id => batch.delete(doc(db!, "users", id)));
              await batch.commit();
          } catch(e) { console.warn("Offline Bulk Delete Error", e); }
      }
  };

  const updateProfile = async (u: User) => {
      await updateUser(u);
  };

  return (
    <AuthContext.Provider value={{ currentUser, users, login, logout, addUser, updateUser, deleteUser, bulkDeleteUsers, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
