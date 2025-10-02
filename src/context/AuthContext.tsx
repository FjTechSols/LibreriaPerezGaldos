import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../types';
import { supabase } from '../lib/supabase';

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadUserData(session.user.id);
      } else {
        setUser(null);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        await loadUserData(session.user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async (authUserId: string) => {
    try {
      const { data: userData, error } = await supabase
        .from('usuarios')
        .select('id, username, email, rol_id')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (error) {
        console.error('Error loading user data:', error);
        return;
      }

      if (userData) {
        setUser({
          id: userData.id,
          email: userData.email,
          name: userData.username,
          role: userData.rol_id === 1 ? 'admin' : 'user'
        });
      }
    } catch (error) {
      console.error('Error in loadUserData:', error);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login error:', error.message);
        return false;
      }

      if (data.user) {
        await loadUserData(data.user.id);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error in login:', error);
      return false;
    }
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
      });

      if (authError) {
        console.error('Registration error:', authError.message);
        return false;
      }

      if (authData.user) {
        const { error: userError } = await supabase
          .from('usuarios')
          .insert({
            auth_user_id: authData.user.id,
            username: name,
            email: email,
            rol_id: 2
          });

        if (userError) {
          console.error('Error creating user record:', userError);
          return false;
        }

        await loadUserData(authData.user.id);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error in register:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error in logout:', error);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '1.125rem',
        color: '#64748b'
      }}>
        Cargando...
      </div>
    );
  }

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
