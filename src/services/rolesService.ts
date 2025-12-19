import { supabase } from '../lib/supabase';

export interface Rol {
  id: number;
  nombre: string;
  display_name: string;
  descripcion: string;
  nivel_jerarquia: number;
  activo: boolean;
  es_sistema: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Permiso {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  created_at: string;
}

export interface UsuarioRol {
  id: string;
  user_id: string;
  rol_id: string;
  asignado_por: string;
  fecha_asignacion: string;
  activo: boolean;
  notas: string;
  rol?: Rol;
  usuario?: {
    email: string;
  };
}

export interface UsuarioConRoles {
  id: string;
  email: string;
  created_at: string;
  roles: Rol[];
  rol_principal?: Rol;
}

export const obtenerTodosLosRoles = async (): Promise<Rol[]> => {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('activo', true)
    .order('nivel_jerarquia', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const obtenerTodosLosPermisos = async (): Promise<Permiso[]> => {
  const { data, error } = await supabase
    .from('permisos')
    .select('*')
    .order('categoria, nombre');

  if (error) throw error;
  return data || [];
};

export const obtenerPermisosDeRol = async (rolId: string): Promise<Permiso[]> => {
  const { data, error } = await supabase
    .from('roles_permisos')
    .select(`
      permisos (*)
    `)
    .eq('rol_id', rolId);

  if (error) throw error;
  return data?.map((item: any) => item.permisos) || [];
};

export const obtenerRolesDeUsuario = async (userId: string): Promise<Rol[]> => {
  const { data, error } = await supabase
    .rpc('obtener_roles_usuario', { usuario_id: userId });

  if (error) {
    console.error('Error al obtener roles:', error);
    return [];
  }
  return data || [];
};


interface RolPrincipalResponse {
  rol_nombre: string;
  rol_display_name: string;
  nivel_jerarquia: number;
}

export const obtenerRolPrincipal = async (userId: string): Promise<Rol | null> => {
  const { data, error } = await supabase
    .rpc('obtener_rol_principal', { usuario_id: userId })
    .single();

  if (error) {
    console.error('Error al obtener rol principal:', error);
    return null;
  }

  if (!data) return null;

  // Supabase returns 'any' or generic, but we cast to trusted interface
  const rolData = data as RolPrincipalResponse;

  return {
    nombre: rolData.rol_nombre,
    display_name: rolData.rol_display_name,
    nivel_jerarquia: rolData.nivel_jerarquia,
  } as Rol;
};

export const obtenerPermisosDeUsuario = async (userId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .rpc('obtener_permisos_usuario', { usuario_id: userId });

  if (error) {
    console.error('Error al obtener permisos:', error);
    return [];
  }

  return data?.map((p: any) => p.permiso_codigo) || [];
};

export const tienePermiso = async (userId: string, permisoCodigo: string): Promise<boolean> => {
  const { data, error } = await supabase
    .rpc('tiene_permiso', { usuario_id: userId, permiso_codigo: permisoCodigo });

  if (error) {
    console.error('Error al verificar permiso:', error);
    return false;
  }

  return data || false;
};

export const asignarRolAUsuario = async (
  userId: string,
  rolId: number,
  asignadoPor: string | null,
  notas?: string
): Promise<void> => {
  const { error } = await supabase
    .from('usuarios_roles')
    .upsert({
      user_id: userId,
      rol_id: rolId,
      asignado_por: asignadoPor,
      activo: true,
      notas: notas || null,
      fecha_asignacion: new Date().toISOString()
    }, {
      onConflict: 'user_id,rol_id'
    });

  if (error) throw error;
};

export const removerRolDeUsuario = async (userId: string, rolId: number): Promise<void> => {
  const { error } = await supabase
    .from('usuarios_roles')
    .update({ activo: false })
    .eq('user_id', userId)
    .eq('rol_id', rolId);

  if (error) throw error;
};

export const obtenerTodosLosUsuariosConRoles = async (): Promise<UsuarioConRoles[]> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No authenticated session');
  }

  // 1. Fetch Users (IDs, Emails, Metadata) from Edge Function
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-list-users`;

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch users');
  }

  const { users } = await response.json();

  // 2. Fetch Fresh Roles from Database
  const { data: userRoles, error: rolesError } = await supabase
    .from('usuarios_roles')
    .select('user_id, roles (*)')
    .eq('activo', true);

  if (rolesError) {
      console.error('Error fetching fresh roles:', rolesError);
      // Fallback to whatever EF returned if DB fails, but typically we want the DB truth
  }

  // 3. Merge Data
  // We want to Replace the 'roles' array from EF with the one from DB
  const mergedUsers: UsuarioConRoles[] = users.map((u: any) => {
      // Find roles for this user in fresh DB fetch
      const freshRolesRel = userRoles?.filter(ur => ur.user_id === u.id) || [];
      const freshRoles = freshRolesRel.map(ur => (Array.isArray(ur.roles) ? ur.roles[0] : ur.roles)).filter(r => r && r.id) as unknown as Rol[];

      // Determine main role (highest hierarchy)
      // Sort by hierarchy (1 is highest/Top e.g. SuperAdmin)
      const sortedRoles = [...freshRoles].sort((a, b) => a.nivel_jerarquia - b.nivel_jerarquia);
      const mainRole = sortedRoles.length > 0 ? sortedRoles[0] : undefined;

      return {
          ...u,
          roles: freshRoles,
          rol_principal: mainRole
      };
  });

  return mergedUsers;
};

export const crearUsuarioAdministrativo = async (
  email: string,
  password: string,
  rolId: number,
  asignadoPor: string | null,
  notas?: string
): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No authenticated session');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      email, 
      password, 
      rolId, 
      notas 
      // 'asignadoPor' is handled by the function using the caller's token
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create user');
  }

  const data = await response.json();
  return data.userId;
};

export const actualizarRolesUsuario = async (
  userId: string,
  rolesIds: number[],
  asignadoPor: string | null
): Promise<void> => {
  // 1. Get all available roles to know what to disable
  const allRoles = await obtenerTodosLosRoles();
  
  // 2. Prepare operations
  const operations = allRoles.map(async (rol) => {
    const shouldHaveRole = rolesIds.includes(rol.id);
    
    // Check if relation exists
    const { data: existingRel, error: fetchError } = await supabase
        .from('usuarios_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('rol_id', rol.id)
        .maybeSingle(); // Use maybeSingle to avoid 406 error if multiple (shouldn't happen) or 0

    if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 is JSON single error, maybeSingle handles it but let's be safe
        console.error('Error checking role:', fetchError);
        throw fetchError;
    }

    if (existingRel) {
       // UPDATE
       // If it exists, update usage
       const { error } = await supabase
        .from('usuarios_roles')
        .update({
          activo: shouldHaveRole, // True if selected, False if not
          asignado_por: asignadoPor, // Update signer
          updated_at: new Date().toISOString() // Assuming updated_at column exists
        })
        .eq('id', existingRel.id);

       if (error) throw error;
    } else {
       // INSERT
       if (shouldHaveRole) {
           // Only insert if it should be active. NO need to insert "inactive" roles if they don't exist.
           const { error } = await supabase
            .from('usuarios_roles')
            .insert({
              user_id: userId,
              rol_id: rol.id,
              asignado_por: asignadoPor,
              activo: true,
              fecha_asignacion: new Date().toISOString()
            });

           if (error) throw error;
       }
    }
  });

  await Promise.all(operations);
};

export const eliminarUsuario = async (userId: string): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No authenticated session');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete user');
  }
};

export const cambiarPasswordUsuario = async (
  userId: string,
  newPassword: string
): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No authenticated session');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-password`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, newPassword }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update password');
  }
};
