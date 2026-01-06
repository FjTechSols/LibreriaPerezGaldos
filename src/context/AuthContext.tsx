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
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
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

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
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
      // Start auth check with safety timeout (5s) due to potential slow DB
      // If DB is slow (Disk IO exhausted), we shouldn't block the UI forever
      const authCheckPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => 
          setTimeout(() => {
              console.warn('⚠️ Auth check timed out (slow DB), defaulting to unauthenticated');
              resolve({ data: { session: null } });
          }, 15000)
      );
      
      // Process auth immediately when done (or timeout)
      const sessionData = await Promise.race([authCheckPromise, timeoutPromise]) as any;
      if (sessionData.data.session?.user) {
        // Also timeout the profile fetch if DB is dying
        const profileLoadPromise = loadUserData(sessionData.data.session.user.id);
        const profileTimeoutPromise = new Promise((resolve) => 
            setTimeout(() => {
                console.warn('⚠️ User profile load timed out (slow DB), continuing without detailed profile');
                resolve(null);
            }, 15000)
        );
        await Promise.race([profileLoadPromise, profileTimeoutPromise]);
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
        .select('id, username, email, rol_id, nombre, nombre_completo, fecha_nacimiento, fecha_registro, telefono, direccion, ciudad, codigo_postal')
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
        username: userData?.username || '',
        fullName: userData?.nombre_completo || userData?.nombre || '',
        birthDate: userData?.fecha_nacimiento || undefined,
        createdAt: userData?.fecha_registro || undefined,
        phone: userData?.telefono || '',
        address: userData?.direccion || '',
        city: userData?.ciudad || '',
        postalCode: userData?.codigo_postal || '',
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

      // Si no contiene @, buscar por nombre de usuario
      if (!emailOrUsername.includes('@')) {
        
        // Búsqueda case-insensitive usando el índice funcional LOWER(username)
        // Usamos .ilike() que PostgreSQL puede optimizar con el índice funcional
        // pero solo si buscamos exactamente (sin wildcards)
        let { data: userData, error: lookupError } = await supabase
          .from('usuarios')
          .select('email')
          .ilike('username', emailOrUsername)
          .maybeSingle();

        // Si no se encuentra por username, intentar por nombre (también case-insensitive)
        if (!userData && lookupError) {
          const result = await supabase
            .from('usuarios')
            .select('email')
            .ilike('nombre', emailOrUsername)
            .maybeSingle();
          
          userData = result.data;
          lookupError = result.error;
        }

        if (lookupError || !userData) {
          console.error('Usuario no encontrado. Error:', lookupError);
          return false;
        }
        
        userEmail = userData.email;
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
          .select('id, username, email, rol_id, nombre_completo, fecha_nacimiento, fecha_registro')
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
          username: userData.username,
          fullName: userData.nombre_completo,
          birthDate: userData.fecha_nacimiento,
          createdAt: userData.fecha_registro,
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

  const refreshUser = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      await loadUserData(sessionData.session.user.id);
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
      isSuperAdmin,
      refreshUser
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
