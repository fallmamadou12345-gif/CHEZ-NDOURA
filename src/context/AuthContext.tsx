import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { storage } from '../services/storage';

interface AuthContextType {
  user: User | null;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default Admin User (if no users exist)
const DEFAULT_ADMIN: User = {
  id: 'admin',
  name: 'Administrateur',
  role: 'ADMIN',
  pin: '0000',
  created_at: new Date().toISOString()
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if session persists (optional, for now let's require login on reload for security)
    setLoading(false);
  }, []);

  const login = async (pin: string): Promise<boolean> => {
    const users = await storage.getUsers();
    
    // If no users exist, allow default admin login
    if (users.length === 0) {
      if (pin === DEFAULT_ADMIN.pin) {
        setUser(DEFAULT_ADMIN);
        // Save default admin to storage so it persists
        await storage.saveUser(DEFAULT_ADMIN);
        return true;
      }
    }

    const foundUser = users.find(u => u.pin === pin);
    if (foundUser) {
      setUser(foundUser);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === 'ADMIN' }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
