import { supabase } from '../lib/supabase';
import { Cliente } from '../types';

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
}

export const getClientes = async (): Promise<Cliente[]> => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('apellidos', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error fetching clients:', error);
      throw error;
    }

    return data || [];
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
        activo: clienteData.activo !== undefined ? clienteData.activo : true
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

export const buscarClientes = async (query: string): Promise<Cliente[]> => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .or(`nombre.ilike.%${query}%,apellidos.ilike.%${query}%,email.ilike.%${query}%,nif.ilike.%${query}%`)
      .eq('activo', true)
      .order('apellidos', { ascending: true })
      .order('nombre', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Error searching clients:', error);
      throw error;
    }

    return data || [];
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
        console.log('Cliente existente encontrado:', existingCliente.id);
        return existingCliente;
      }
    }

    const nuevoCliente = await crearCliente(clienteData);

    if (!nuevoCliente) {
      throw new Error('No se pudo crear el cliente');
    }

    console.log('Nuevo cliente creado:', nuevoCliente.id);
    return nuevoCliente;
  } catch (error) {
    console.error('Error in findOrCreateCliente:', error);
    throw error;
  }
};
