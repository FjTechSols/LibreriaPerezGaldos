import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../types';
import { supabase } from '../lib/supabase';
import {
  obtenerRolesDeUsuario,
  obtenerPermisosDeUsuario,
  obtenerRolPrincipal,
  Rol
} from '../services/rolesService';

interface ExtendedUser extends User {
  roles?: Rol[];
  permisos?: string[];
  rolPrincipal?: Rol;
}

interface ExtendedAuthState extends AuthState {
  user: ExtendedUser | null;
  hasPermission: (permiso: string) => boolean;
  hasRole: (rol: string) => boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<ExtendedAuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ExtendedUser | null>(null);
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
      console.error('Error checking user session:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async (authUserId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userEmail = sessionData.session?.user?.email;

      const { data: userData, error } = await supabase
        .from('usuarios')
        .select('id, username, email, rol_id')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        await supabase.auth.signOut();
        return;
      }

      const roles = await obtenerRolesDeUsuario(authUserId);
      const permisos = await obtenerPermisosDeUsuario(authUserId);
      const rolPrincipal = await obtenerRolPrincipal(authUserId);

      const roleType = rolPrincipal?.nombre === 'super_admin' || rolPrincipal?.nombre === 'admin'
        ? 'admin'
        : (userData?.rol_id === 1 ? 'admin' : 'user');

      setUser({
        id: userData?.id || authUserId,
        email: userData?.email || userEmail || '',
        name: userData?.username || userEmail?.split('@')[0] || 'Usuario',
        role: roleType,
        roles,
        permisos,
        rolPrincipal
      });
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const login = async (emailOrUsername: string, password: string): Promise<boolean> => {
    // Validar que los campos no estén vacíos
    if (!emailOrUsername?.trim() || !password?.trim()) {
      console.error('Email/username y contraseña son requeridos');
      return false;
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
      console.error('Error during registration:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
      setUser(null); // Limpiar estado local aunque falle
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

  const hasPermission = (permiso: string): boolean => {
    if (!user) return false;
    return user.permisos?.includes(permiso) || false;
  };

  const hasRole = (rol: string): boolean => {
    if (!user) return false;
    return user.roles?.some(r => r.nombre === rol) || false;
  };

  const isAdmin = hasRole('admin') || hasRole('super_admin');
  const isSuperAdmin = hasRole('super_admin');

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      hasPermission,
      hasRole,
      isAdmin,
      isSuperAdmin
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
