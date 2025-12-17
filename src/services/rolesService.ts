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
  return users;
};

export const crearUsuarioAdministrativo = async (
  email: string,
  password: string,
  rolId: number,
  asignadoPor: string | null,
  notas?: string
): Promise<string> => {
  const { data: newUser, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) throw signUpError;
  if (!newUser.user) throw new Error('No se pudo crear el usuario');

  await asignarRolAUsuario(newUser.user.id, rolId, asignadoPor, notas);

  return newUser.user.id;
};

export const actualizarRolesUsuario = async (
  userId: string,
  rolesIds: number[],
  asignadoPor: string | null
): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No authenticated session');
  }

  const { error } = await supabase.functions.invoke('admin-update-roles', {
    body: {
      userId,
      rolesIds,
      asignadoPor,
    },
  });

  if (error) throw error;
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
