import { supabase } from '../lib/supabase';

export interface Rol {
  id: string;
  nombre: string;
  display_name: string;
  descripcion: string;
  nivel_jerarquia: number;
  activo: boolean;
  es_sistema: boolean;
  created_at: string;
  updated_at: string;
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
    .from('usuarios_roles')
    .select(`
      roles (*)
    `)
    .eq('user_id', userId)
    .eq('activo', true);

  if (error) throw error;
  return data?.map((item: any) => item.roles) || [];
};

export const obtenerRolPrincipal = async (userId: string): Promise<Rol | null> => {
  const { data, error } = await supabase
    .rpc('obtener_rol_principal', { usuario_id: userId })
    .single();

  if (error) {
    console.error('Error al obtener rol principal:', error);
    return null;
  }

  if (!data) return null;

  return {
    nombre: data.rol_nombre,
    display_name: data.rol_display_name,
    nivel_jerarquia: data.nivel_jerarquia,
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
  rolId: string,
  asignadoPor: string,
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

export const removerRolDeUsuario = async (userId: string, rolId: string): Promise<void> => {
  const { error } = await supabase
    .from('usuarios_roles')
    .update({ activo: false })
    .eq('user_id', userId)
    .eq('rol_id', rolId);

  if (error) throw error;
};

export const obtenerTodosLosUsuariosConRoles = async (): Promise<UsuarioConRoles[]> => {
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) throw authError;

  const usuariosConRoles: UsuarioConRoles[] = [];

  for (const user of authUsers.users) {
    const roles = await obtenerRolesDeUsuario(user.id);
    const rolPrincipal = roles.length > 0
      ? roles.reduce((prev, current) =>
          prev.nivel_jerarquia < current.nivel_jerarquia ? prev : current
        )
      : undefined;

    usuariosConRoles.push({
      id: user.id,
      email: user.email || '',
      created_at: user.created_at,
      roles,
      rol_principal: rolPrincipal
    });
  }

  return usuariosConRoles;
};

export const crearUsuarioAdministrativo = async (
  email: string,
  password: string,
  rolId: string,
  asignadoPor: string,
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
  rolesIds: string[],
  asignadoPor: string
): Promise<void> => {
  const { error: deleteError } = await supabase
    .from('usuarios_roles')
    .update({ activo: false })
    .eq('user_id', userId);

  if (deleteError) throw deleteError;

  for (const rolId of rolesIds) {
    await asignarRolAUsuario(userId, rolId, asignadoPor);
  }
};

export const eliminarUsuario = async (userId: string): Promise<void> => {
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw error;
};

export const cambiarPasswordUsuario = async (
  userId: string,
  newPassword: string
): Promise<void> => {
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword
  });

  if (error) throw error;
};
