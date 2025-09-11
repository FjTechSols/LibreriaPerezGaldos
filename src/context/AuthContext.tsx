import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../types';

const AuthContext = createContext<AuthState | undefined>(undefined);

const mockUsers = [
  { id: '1', email: 'admin@libreria.com', password: 'admin123', name: 'Administrador', role: 'admin' as const },
  { id: '2', email: 'user@libreria.com', password: 'user123', name: 'Usuario Demo', role: 'user' as const }
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('library-user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const foundUser = mockUsers.find(u => u.email === email && u.password === password);
    if (foundUser) {
      const userData = {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
        role: foundUser.role
      };
      setUser(userData);
      localStorage.setItem('library-user', JSON.stringify(userData));
      localStorage.setItem('library-token', 'mock-jwt-token');
      return true;
    }
    return false;
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    const existingUser = mockUsers.find(u => u.email === email);
    if (existingUser) {
      return false;
    }
    
    const newUser = {
      id: Date.now().toString(),
      email,
      name,
      role: 'user' as const
    };
    
    setUser(newUser);
    localStorage.setItem('library-user', JSON.stringify(newUser));
    localStorage.setItem('library-token', 'mock-jwt-token');
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('library-user');
    localStorage.removeItem('library-token');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      register,
      logout
    }}>
      {children}
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