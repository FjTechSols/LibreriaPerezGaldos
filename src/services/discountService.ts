import { supabase } from '../lib/supabase';

export interface DiscountRule {
  id: string;
  name: string;
  discount_percent: number;
  scope: 'GLOBAL' | 'CATEGORY';
  target_category_id?: number | null;
  active: boolean;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
  // Join fields
  categorias?: {
      id: number;
      nombre: string;
  };
}

export const discountService = {
  // Fetch only active and valid rules for the frontend
  getActiveDiscounts: async (): Promise<DiscountRule[]> => {
    try {
      const now = new Date().toISOString();
      // Fetch all active, then filter dates in JS or DB
      // DB filter for dates is cleaner
      const { data, error } = await supabase
        .from('global_discounts')
        .select('*')
        .eq('active', true)
        // Manual date filtering might be safer if timezone issues persist, but let's try DB filter first
        // (start_date is null OR start_date <= now) AND (end_date is null OR end_date >= now)
        // Supabase complex OR logic:
        .or(`start_date.is.null,start_date.lte.${now}`)
        // We handle end_date validation in JS to avoid complex AND+OR PostgREST query in one go
        .order('discount_percent', { ascending: false });

      if (error) throw error;

      // Filter end_date in JS
      const validDiscounts = (data || []).filter(d => {
          if (d.end_date && new Date(d.end_date) < new Date()) return false;
          return true;
      });

      return validDiscounts as DiscountRule[];
    } catch (error) {
      console.error('Error fetching active discounts:', error);
      return [];
    }
  },

  // Fetch all for Admin (including inactive/future/expired)
  getAllDiscounts: async (): Promise<DiscountRule[]> => {
    try {
      const { data, error } = await supabase
        .from('global_discounts')
        .select('*, categorias(id, nombre)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DiscountRule[];
    } catch (error) {
      console.error('Error fetching all discounts:', error);
      return [];
    }
  },

  createDiscount: async (discount: Partial<DiscountRule>): Promise<DiscountRule | null> => {
    try {
      const { data, error } = await supabase
        .from('global_discounts')
        .insert(discount)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating discount:', error);
      return null;
    }
  },

  updateDiscount: async (id: string, updates: Partial<DiscountRule>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('global_discounts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating discount:', error);
      return false;
    }
  },

  deleteDiscount: async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('global_discounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting discount:', error);
      return false;
    }
  },

  toggleActive: async (id: string, currentState: boolean): Promise<boolean> => {
      return await discountService.updateDiscount(id, { active: !currentState });
  }
};
