import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../types';
import { supabase } from '../lib/supabase';

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (session?.user) {
          await loadUserData(session.user.id);
        } else {
          setUser(null);
        }
      })();
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
      // Silent error handling
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
        await supabase.auth.signOut();
        return;
      }

      if (userData) {
        setUser({
          id: userData.id,
          email: userData.email,
          name: userData.username,
          role: userData.rol_id === 1 ? 'admin' : 'user'
        });
      } else {
        await supabase.auth.signOut();
      }
    } catch (error) {
      await supabase.auth.signOut();
    }
  };

  const login = async (emailOrUsername: string, password: string): Promise<boolean> => {
    const demoUsers = [
      { email: 'admin@admin.com', username: 'admin', password: 'admin', id: 1, name: 'Admin Demo', role: 'admin' as const },
      { email: 'user@user.com', username: 'user', password: 'user', id: 2, name: 'Usuario Demo', role: 'user' as const }
    ];

    const demoUser = demoUsers.find(u =>
      (u.email === emailOrUsername || u.username === emailOrUsername) && u.password === password
    );

    if (demoUser) {
      setUser({
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
        role: demoUser.role
      });
      localStorage.setItem('demo_user', JSON.stringify(demoUser));
      return true;
    }

    try {
      let userEmail = emailOrUsername;

      if (!emailOrUsername.includes('@')) {
        const { data: userData, error: lookupError } = await supabase
          .from('usuarios')
          .select('email')
          .ilike('username', emailOrUsername)
          .maybeSingle();

        if (lookupError || !userData) {
          const { data: userDataExact } = await supabase
            .from('usuarios')
            .select('email')
            .eq('username', emailOrUsername)
            .maybeSingle();

          if (!userDataExact) {
            return false;
          }
          userEmail = userDataExact.email;
        } else {
          userEmail = userData.email;
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password
      });

      if (error) {
        return false;
      }

      if (data.user) {
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('id, username, email, rol_id')
          .eq('auth_user_id', data.user.id)
          .maybeSingle();

        if (userError || !userData) {
          await supabase.auth.signOut();
          return false;
        }

        setUser({
          id: userData.id,
          email: userData.email,
          name: userData.username,
          role: userData.rol_id === 1 ? 'admin' : 'user'
        });
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verificacion-email`,
          data: {
            username: name
          }
        }
      });

      if (authError) {
        return false;
      }

      if (authData.user) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (!authData.session) {
          return true;
        }

        await loadUserData(authData.user.id);
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      // Silent error handling
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
