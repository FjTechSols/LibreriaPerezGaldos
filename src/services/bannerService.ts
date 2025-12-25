import { supabase } from '../lib/supabase';

export type BannerType = 'image' | 'discount' | 'last_minute' | 'exclusive';

export interface Banner {
  id: string;
  title: string;
  image_url?: string;
  link_url?: string;
  active: boolean;
  show_once: boolean;
  created_at: string;
  
  // New Fields
  banner_type: BannerType;
  start_date?: string;
  end_date?: string;
  custom_title?: string;
  custom_description?: string;
  discount_percent?: number;
  book_title?: string;
  book_author?: string;
}

export const bannerService = {
  // Get the currently active banner (if any)
  // We generally expect 0 or 1 active banner. If multiple, we take the most recently created one.
  async getActiveBanner(): Promise<Banner | null> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('marketing_banners')
        .select('*')
        .eq('active', true)
        // Check dates: (start_date IS NULL OR start_date <= now) AND (end_date IS NULL OR end_date >= now)
        // Supabase/PostgREST filter syntax for OR logic with NULLs is tricky in one go.
        // Simplest strategy: Fetch active ones and filter in JS if the volume is low (expected < 10 active banners usually 1).
        // Alternatively, use more complex query builder. Given expected low volume of 'active' banners, JS filtering is safe and robust.
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching active banner:', error);
        return null;
      }

      // Filter in JS for date validity
      const validBanners = (data || []).filter((b: Banner) => {
          const startValid = !b.start_date || new Date(b.start_date) <= new Date();
          const endValid = !b.end_date || new Date(b.end_date) >= new Date();
          return startValid && endValid;
      });

      return validBanners.length > 0 ? validBanners[0] : null;
    } catch (error) {
      console.error('Error in getActiveBanner:', error);
      return null;
    }
  },

  // Get all banners for admin list
  async getAllBanners(): Promise<Banner[]> {
    const { data, error } = await supabase
      .from('marketing_banners')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching banners:', error);
      return [];
    }
    return data || [];
  },

  async createBanner(banner: Omit<Banner, 'id' | 'created_at'>): Promise<Banner | null> {
    const { data, error } = await supabase
      .from('marketing_banners')
      .insert([banner])
      .select()
      .single();

    if (error) {
      console.error('Error creating banner:', error);
      return null;
    }
    return data;
  },

  async updateBanner(id: string, updates: Partial<Banner>): Promise<boolean> {
    const { error } = await supabase
      .from('marketing_banners')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating banner:', error);
      return false;
    }
    return true;
  },

  async deleteBanner(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('marketing_banners')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting banner:', error);
      return false;
    }
    return true;
  },

  // Ensure only one banner is active if desired, or just toggle this one.
  // For simplicity, we allow toggling. User can manually deactivate others if needed,
  // OR we can auto-deactivate others here. Let's auto-deactivate others for better UX.
  async activateBanner(id: string): Promise<boolean> {
    // 1. Deactivate all
    await supabase.from('marketing_banners').update({ active: false }).neq('id', '00000000-0000-0000-0000-000000000000'); // simple way to hit all rows
    
    // 2. Activate specific
    const { error } = await supabase
      .from('marketing_banners')
      .update({ active: true })
      .eq('id', id);

    if (error) {
      console.error('Error activating banner:', error);
      return false;
    }
    return true;
  },

  async deactivateBanner(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('marketing_banners')
      .update({ active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deactivating banner:', error);
      return false;
    }
    return true;
  }
};
