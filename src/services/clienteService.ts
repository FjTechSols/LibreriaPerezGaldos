import { supabase } from '../lib/supabase';
import { Cliente } from '../types';

export interface PagedClientes {
  data: Cliente[];
  count: number;
}

export interface ClienteFormData {
  nombre: string;
  apellidos: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  codigo_postal?: string;
  provincia?: string;
  pais?: string;
  nif?: string;
  notas?: string;
  activo?: boolean;
  tipo: 'particular' | 'empresa' | 'institucion';
  persona_contacto?: string;
  cargo?: string;
  web?: string;
}

export const getClientes = async (
  page: number = 1,
  pageSize: number = 12,
  tipo?: string
): Promise<PagedClientes> => {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('clientes')
      .select('*', { count: 'exact' })
      .order('apellidos', { ascending: true })
      .order('nombre', { ascending: true })
      .range(from, to);

    if (tipo && tipo !== 'all') {
      query = query.eq('tipo', tipo);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching clients:', error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0
    };
  } catch (error) {
    console.error('Error in getClientes:', error);
    throw error;
  }
};

export const getClienteById = async (id: string): Promise<Cliente | null> => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching client:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getClienteById:', error);
    throw error;
  }
};

export const crearCliente = async (clienteData: ClienteFormData): Promise<Cliente | null> => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .insert({
        nombre: clienteData.nombre,
        apellidos: clienteData.apellidos,
        email: clienteData.email || null,
        telefono: clienteData.telefono || null,
        direccion: clienteData.direccion || null,
        ciudad: clienteData.ciudad || null,
        codigo_postal: clienteData.codigo_postal || null,
        provincia: clienteData.provincia || null,
        pais: clienteData.pais || 'España',
        nif: clienteData.nif || null,
        notas: clienteData.notas || null,
        activo: clienteData.activo !== undefined ? clienteData.activo : true,
        tipo: clienteData.tipo || 'particular',
        persona_contacto: clienteData.persona_contacto || null,
        cargo: clienteData.cargo || null,
        web: clienteData.web || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating client:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in crearCliente:', error);
    throw error;
  }
};

export const actualizarCliente = async (id: string, clienteData: Partial<ClienteFormData>): Promise<Cliente | null> => {
  try {
    const updateData: Record<string, unknown> = {};

    if (clienteData.nombre !== undefined) updateData.nombre = clienteData.nombre;
    if (clienteData.apellidos !== undefined) updateData.apellidos = clienteData.apellidos;
    if (clienteData.email !== undefined) updateData.email = clienteData.email || null;
    if (clienteData.telefono !== undefined) updateData.telefono = clienteData.telefono || null;
    if (clienteData.direccion !== undefined) updateData.direccion = clienteData.direccion || null;
    if (clienteData.ciudad !== undefined) updateData.ciudad = clienteData.ciudad || null;
    if (clienteData.codigo_postal !== undefined) updateData.codigo_postal = clienteData.codigo_postal || null;
    if (clienteData.provincia !== undefined) updateData.provincia = clienteData.provincia || null;
    if (clienteData.pais !== undefined) updateData.pais = clienteData.pais || null;
    if (clienteData.nif !== undefined) updateData.nif = clienteData.nif || null;
    if (clienteData.notas !== undefined) updateData.notas = clienteData.notas || null;
    if (clienteData.activo !== undefined) updateData.activo = clienteData.activo;
    if (clienteData.tipo !== undefined) updateData.tipo = clienteData.tipo;
    if (clienteData.persona_contacto !== undefined) updateData.persona_contacto = clienteData.persona_contacto || null;
    if (clienteData.cargo !== undefined) updateData.cargo = clienteData.cargo || null;
    if (clienteData.web !== undefined) updateData.web = clienteData.web || null;

    const { data, error } = await supabase
      .from('clientes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating client:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in actualizarCliente:', error);
    throw error;
  }
};

export const eliminarCliente = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting client:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in eliminarCliente:', error);
    throw error;
  }
};

export const desactivarCliente = async (id: string): Promise<Cliente | null> => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .update({ activo: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deactivating client:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in desactivarCliente:', error);
    throw error;
  }
};

export const buscarClientes = async (
  query: string,
  page: number = 1,
  pageSize: number = 12,
  tipo?: string
): Promise<PagedClientes> => {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let queryBuilder = supabase
      .from('clientes')
      .select('*', { count: 'exact' })
      .or(`nombre.ilike.%${query}%,apellidos.ilike.%${query}%,email.ilike.%${query}%,nif.ilike.%${query}%,telefono.ilike.%${query}%,persona_contacto.ilike.%${query}%,cargo.ilike.%${query}%`)
      .order('apellidos', { ascending: true })
      .order('nombre', { ascending: true })
      .range(from, to);

    if (tipo && tipo !== 'all') {
      queryBuilder = queryBuilder.eq('tipo', tipo);
    }

    const { data, error, count } = await queryBuilder;

    if (error) {
      console.error('Error searching clients:', error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0
    };
  } catch (error) {
    console.error('Error in buscarClientes:', error);
    throw error;
  }
};

export const findOrCreateCliente = async (clienteData: ClienteFormData): Promise<Cliente> => {
  try {
    if (clienteData.email) {
      const { data: existingCliente } = await supabase
        .from('clientes')
        .select('*')
        .eq('email', clienteData.email)
        .maybeSingle();

      if (existingCliente) {
        return existingCliente;
      }
    }

    const nuevoCliente = await crearCliente(clienteData);

    if (!nuevoCliente) {
      throw new Error('No se pudo crear el cliente');
    }

    return nuevoCliente;
  } catch (error) {
    console.error('Error in findOrCreateCliente:', error);
    throw error;
  }
};
