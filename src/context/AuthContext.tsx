import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../types';
import { supabase } from '../lib/supabase';
import {
  obtenerRolesDeUsuario,
  obtenerPermisosDeUsuario,
  obtenerRolPrincipal,
  Rol
} from '../services/rolesService';
import { Loader } from '../components/Loader';

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
  // Only show splash on true initial load (not on navigation)
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('hasLoadedBefore');
  });

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
      const isInitialLoad = !sessionStorage.getItem('hasLoadedBefore');
      
      // Start minimum timer only on initial load (3 seconds)
      const timerPromise = isInitialLoad 
        ? new Promise(resolve => setTimeout(resolve, 3000))
        : Promise.resolve();
      
      // Start auth check
      const authCheckPromise = supabase.auth.getSession();
      
      // Process auth immediately when done
      const sessionData = await authCheckPromise;
      if (sessionData.data.session?.user) {
        await loadUserData(sessionData.data.session.user.id);
      }
      
      // Auth is ready, allow app to mount (fetching data in background)
      setLoading(false);

      // Wait for timer to finish before hiding splash
      await timerPromise;
      setShowSplash(false);
      
      // Mark that we've loaded at least once
      sessionStorage.setItem('hasLoadedBefore', 'true');

    } catch (error) {
      console.error('Error checking user session:', error);
      setUser(null);
      setLoading(false);
      setShowSplash(false);
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
        rolPrincipal: rolPrincipal || undefined
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

  const register = async (email: string, password: string, username: string, firstName: string, lastName: string): Promise<boolean> => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verificacion-email`,
          data: {
            username: username,
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`.trim()
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

  // Render overlay if splash is active
  // But also block children if loading (auth) is true?
  // If loading is true, we must NOT render children because ProtectedRoute needs auth state.
  // But checkUser sets loading=false early.
  // So 'children' will render.
  
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
      {(loading || showSplash) && <Loader />}
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
