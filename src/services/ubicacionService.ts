import { supabase } from '../lib/supabase';

export interface Ubicacion {
  id: number;
  nombre: string;
  descripcion?: string;
  activa: boolean;
  created_at?: string;
}

export const obtenerUbicacionesActivas = async (): Promise<Ubicacion[]> => {
  try {
    const { data, error } = await supabase
      .from('ubicaciones')
      .select('*')
      .eq('activa', true)
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error al obtener ubicaciones:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error inesperado al obtener ubicaciones:', error);
    return [];
  }
};

export const obtenerTodasUbicaciones = async (): Promise<Ubicacion[]> => {
  try {
    const { data, error } = await supabase
      .from('ubicaciones')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error al obtener todas las ubicaciones:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error inesperado al obtener todas las ubicaciones:', error);
    return [];
  }
};

export const crearUbicacion = async (ubicacion: Partial<Ubicacion>): Promise<Ubicacion | null> => {
  try {
    const { data, error } = await supabase
      .from('ubicaciones')
      .insert({
        nombre: ubicacion.nombre,
        descripcion: ubicacion.descripcion || null,
        activa: ubicacion.activa !== undefined ? ubicacion.activa : true
      })
      .select()
      .single();

    if (error) {
      console.error('Error al crear ubicación:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error inesperado al crear ubicación:', error);
    return null;
  }
};

export const actualizarUbicacion = async (id: number, ubicacion: Partial<Ubicacion>): Promise<Ubicacion | null> => {
  try {
    const updateData: any = {};

    if (ubicacion.nombre !== undefined) updateData.nombre = ubicacion.nombre;
    if (ubicacion.descripcion !== undefined) updateData.descripcion = ubicacion.descripcion;
    if (ubicacion.activa !== undefined) updateData.activa = ubicacion.activa;

    const { data, error } = await supabase
      .from('ubicaciones')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar ubicación:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error inesperado al actualizar ubicación:', error);
    return null;
  }
};

export const eliminarUbicacion = async (id: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('ubicaciones')
      .update({ activa: false })
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar ubicación:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error inesperado al eliminar ubicación:', error);
    return false;
  }
};
