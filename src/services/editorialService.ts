import { supabase } from '../lib/supabase';
import { Editorial } from '../types';

export const getEditoriales = async (): Promise<Editorial[]> => {
  try {
    const { data, error } = await supabase
      .from('editoriales')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching publishers:', error);
    return [];
  }
};

export const createEditorial = async (editorial: Partial<Editorial>): Promise<Editorial | null> => {
  try {
    const { data, error } = await supabase
      .from('editoriales')
      .insert(editorial)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating publisher:', error);
    return null;
  }
};

export const updateEditorial = async (id: number, editorial: Partial<Editorial>): Promise<Editorial | null> => {
  try {
    const { data, error } = await supabase
      .from('editoriales')
      .update(editorial)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating publisher:', error);
    return null;
  }
};

export const deleteEditorial = async (id: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('editoriales')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting publisher:', error);
    return false;
  }
};
