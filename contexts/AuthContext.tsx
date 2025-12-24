import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { MOCK_USERS } from '../services/mockData';
import { authService } from '../services/authService';
import { db, ensureAuth } from '../services/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

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

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Initialize State from LocalStorage
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('app_users');
    return saved ? JSON.parse(saved) : MOCK_USERS;
  });

  // 2. Fetch Users from Firebase (Background Sync)
  useEffect(() => {
    const fetchUsers = async () => {
        const now = Date.now();
        const lastFetch = Number(localStorage.getItem('ts_users') || 0);
        
        // Cache Strategy: Only fetch if expired or empty
        if (users.length > 5 && now - lastFetch < CACHE_TTL) return;

        if (!db) return; // Offline fallback

        try {
            const authResult = await ensureAuth();
            if (authResult.success) {
                console.log("☁️ Context: Fetching Users...");
                const snapshot = await getDocs(collection(db, "users"));
                if (!snapshot.empty) {
                    const remoteUsers = snapshot.docs.map(d => d.data() as User);
                    setUsers(remoteUsers);
                    localStorage.setItem('app_users', JSON.stringify(remoteUsers));
                    localStorage.setItem('ts_users', now.toString());
                    
                    // Sync current user if data changed
                    if (currentUser) {
                        const updatedSelf = remoteUsers.find(u => u.id === currentUser.id);
                        if (updatedSelf) {
                            setCurrentUser(updatedSelf);
                            localStorage.setItem('currentUser', JSON.stringify(updatedSelf));
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("AuthContext Fetch Error:", e);
        }
    };

    fetchUsers();
  }, []);

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
      const updated = [...users, ...list];
      setUsers(updated);
      localStorage.setItem('app_users', JSON.stringify(updated));
      
      if (db) {
          try {
              const batch = writeBatch(db);
              list.forEach(item => batch.set(doc(db!, "users", item.id), sanitize(item)));
              await batch.commit();
          } catch(e) { console.warn("Offline Add User"); }
      }
  };

  const updateUser = async (u: User) => {
      const updated = users.map(item => item.id === u.id ? u : item);
      setUsers(updated);
      localStorage.setItem('app_users', JSON.stringify(updated));
      if (currentUser?.id === u.id) {
          setCurrentUser(u);
          localStorage.setItem('currentUser', JSON.stringify(u));
      }
      if (db) try { await setDoc(doc(db, "users", u.id), sanitize(u)); } catch(e) {}
  };

  const deleteUser = async (id: string) => {
      const updated = users.filter(u => u.id !== id);
      setUsers(updated);
      localStorage.setItem('app_users', JSON.stringify(updated));
      if (db) try { await deleteDoc(doc(db, "users", id)); } catch(e) {}
  };

  const bulkDeleteUsers = async (ids: string[]) => {
      const updated = users.filter(u => !ids.includes(u.id));
      setUsers(updated);
      localStorage.setItem('app_users', JSON.stringify(updated));
      if (db) {
          try {
              const batch = writeBatch(db);
              ids.forEach(id => batch.delete(doc(db!, "users", id)));
              await batch.commit();
          } catch(e) {}
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
