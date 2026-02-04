import { supabase } from '../lib/supabase';
import { settingsService } from './settingsService';

// Re-exporting types for compatibility
export interface AbeBooksOrder {
  orderId: string;
  abeBooksOrderId: string;
  orderDate: string;
  status: AbeBooksOrderStatus;
  customer: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
  };
  items: Array<{
    sku: string;
    title: string;
    author: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shippingCost: number;
  total: number;
  estimatedDelivery?: string;
  trackingNumber?: string;
}

export type AbeBooksOrderStatus = 'New' | 'Acknowledged' | 'Shipped' | 'Cancelled';

export interface AbeBooksOrderFilters {
  status?: AbeBooksOrderStatus | '';
  startDate?: string;
  endDate?: string;
}

class AbeBooksService {
  /**
   * Checks if the AbeBooks integration is globally enabled
   */
  async isEnabled(): Promise<boolean> {
    const settings = await settingsService.getAllSettings();
    return settings?.integrations.abeBooks.enabled || false;
  }

  /**
   * Checks if specific features are enabled
   */
  async getFeatures(): Promise<{
    enabled: boolean;
    syncInventory: boolean;
    syncOrders: boolean;
    syncDeletions: boolean;
  }> {
    const settings = await settingsService.getAllSettings();
    return settings?.integrations.abeBooks || {
      enabled: false,
      syncInventory: false,
      syncOrders: false,
      syncDeletions: false
    };
  }

  /**
   * Fetch orders from AbeBooks API
   * Respected Toggle: syncOrders
   */
  async fetchOrders(filters?: AbeBooksOrderFilters): Promise<AbeBooksOrder[]> {
    const features = await this.getFeatures();
    
    // Check if Integration OR Order Sync is disabled
    if (!features.enabled || !features.syncOrders) {
      console.log('[AbeBooks] Order sync disabled in settings. Skipping fetch.');
      return [];
    }

    // TEMPORARY: Use mock data due to AbeBooks API timeout issues
    const USE_MOCK_DATA = true;
    
    if (USE_MOCK_DATA) {
      console.log('⚠️ [AbeBooks] Using MOCK data for orders');
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      return this.getMockOrders();
    }

    try {
      console.log('🔵 [AbeBooks] Calling fetch-orders Edge Function', filters);
      const { data, error } = await supabase.functions.invoke('fetch-abebooks-orders', {
        body: { filters }
      });

      if (error) throw error;
      if (data?.error) {
        console.error('❌ [AbeBooks] API error:', data.error);
        return [];
      }

      return data?.orders || [];
    } catch (err) {
      console.error('💥 [AbeBooks] Error fetching orders:', err);
      return []; // Return empty to avoid breaking UI
    }
  }

  /**
   * Get detailed order info
   */
  async getOrderDetails(abeBooksOrderId: string): Promise<AbeBooksOrder | null> {
    const features = await this.getFeatures();
    if (!features.enabled || !features.syncOrders) return null;

    try {
        // For now using same Mock logic or Edge Function
        // Assuming Edge Function handles detail fetch too
        const { data, error } = await supabase.functions.invoke('fetch-abebooks-orders', {
            body: { orderId: abeBooksOrderId }
        });
        
        if (error) throw error;
        return data?.order || null;
    } catch (err) {
        console.error('[AbeBooks] Error fetching details:', err);
        return null;
    }
  }

  /**
   * Sync a book (Create/Update) to AbeBooks
   * Respected Toggle: syncInventory (and global enabled)
   * Use this for: New Books, Price Updates, Stock Updates
   */
  async syncBook(bookId: number | string): Promise<{ success: boolean; message?: string }> {
    const features = await this.getFeatures();
    
    if (!features.enabled) {
        return { success: false, message: 'Integration disabled' };
    }
    
    // For Upload/Update we strictly check syncInventory
    if (!features.syncInventory) {
        console.log(`[AbeBooks] Inventory sync disabled. Skipping sync for book ${bookId}`);
        return { success: false, message: 'Inventory sync disabled' };
    }

    try {
      console.log(`🔵 [AbeBooks] Syncing book ${bookId}...`);
      const { error } = await supabase.functions.invoke('upload-to-abebooks', {
        body: { bookId: Number(bookId) } 
        // No action = default upsert/upload logic in Edge Function
      });

      if (error) {
        console.error(`❌ [AbeBooks] Sync error for ${bookId}:`, error);
        return { success: false, message: error.message };
      }

      console.log(`✅ [AbeBooks] Book ${bookId} synced successfully.`);
      return { success: true, message: 'Synced' };
    } catch (err: any) {
      console.error(`💥 [AbeBooks] Exception syncing book ${bookId}:`, err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Delete a book from AbeBooks
   * Respected Toggle: syncDeletions (and global enabled)
   */
  async deleteBook(bookId: number | string): Promise<{ success: boolean; message?: string }> {
    const features = await this.getFeatures();

    if (!features.enabled) return { success: false, message: 'Integration disabled' };
    if (!features.syncDeletions) {
         console.log(`[AbeBooks] Deletion sync disabled. Skipping delete for book ${bookId}`);
         return { success: false, message: 'Deletion sync disabled' };
    }

    try {
      console.log(`🔴 [AbeBooks] Deleting book ${bookId}...`);
      // Fire and forget usually, but we await to log result
      const { error } = await supabase.functions.invoke('upload-to-abebooks', {
        body: { bookId: Number(bookId), action: 'delete' }
      });

      if (error) {
         console.error(`❌ [AbeBooks] Delete error for ${bookId}:`, error);
         return { success: false, message: error.message };
      }
      
      console.log(`✅ [AbeBooks] Book ${bookId} deleted.`);
      return { success: true };
    } catch (err: any) {
      console.error(`💥 [AbeBooks] Exception deleting book ${bookId}:`, err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Specialized method for Stock Changes
   * If stock > 0: Calls syncBook (Update)
   * If stock <= 0: Calls deleteBook (Remove) 
   * (AbeBooks requires removal for 0 stock items usually, or we can send Qty=0 if supported. 
   * Based on audit, we use 'delete' for <=0)
   */
  async syncStock(bookId: number | string, newStock: number): Promise<void> {
      // Logic:
      // If stock 0 -> THIS IS A DELETION from AbeBooks perspective (remove listing)
      // HOWEVER, 'deleteBook' checks 'syncDeletions'.
      // 'syncInventory' usually implies managing Qty.
      // If I set Stock=0, is that a "Deletion" or an "Inventory Update"?
      // Use case: I sold the book. It should be removed.
      // If 'syncInventory' is ON but 'syncDeletions' is OFF... 
      // Should we remove it? 
      // Usually "Sync Deletions" refers to "Permanent Deletion of Reference" vs "Stock=0".
      // But in AbeBooks "Delete" is how you remove it from search.
      // Let's assume:
      // Stock <= 0 -> standard inventory sync (remove from sale). controlled by syncInventory.
      // Manual "Delete Book" button -> controlled by syncDeletions.
      
      const features = await this.getFeatures();
      if (!features.enabled) return;
      if (!features.syncInventory) return; 

      // If we are strictly finding that 0 stock means 'delete' action in our Edge Function:
      if (newStock <= 0) {
          // We call the edge function with 'delete' action, BUT we skip the 'deleteBook' wrapper 
          // because that one checks 'syncDeletions'. 
          // We accept that 0 stock = remove from listing is part of INVENTORY SYNC.
           try {
              console.log(`[AbeBooks] Stock is 0 for ${bookId}. Removing from listing (Inventory Sync).`);
              await supabase.functions.invoke('upload-to-abebooks', {
                  body: { bookId: Number(bookId), action: 'delete' }
              });
           } catch (e) {
               console.error('[AbeBooks] Error syncing 0 stock:', e);
           }
      } else {
          // Normal update
          await this.syncBook(bookId);
      }
  }

  // --- MOCK DATA HELPER ---
  private getMockOrders(): AbeBooksOrder[] {
    return [
      {
        orderId: '1001',
        abeBooksOrderId: 'ABE-2024-001',
        orderDate: '2024-02-01T10:30:00Z',
        status: 'New',
        customer: { name: 'Juan García', address: 'Calle Mayor 1', city: 'Madrid', postalCode: '28001', country: 'Spain', email: 'juan@test.com' },
        items: [{ sku: '02008403', title: 'Cien Años de Soledad', author: 'García Márquez', quantity: 1, price: 25.50 }],
        subtotal: 25.50, shippingCost: 5.00, total: 30.50
      },
      {
        orderId: '1002',
        abeBooksOrderId: 'ABE-2024-002',
        orderDate: '2024-02-02T14:15:00Z',
        status: 'Acknowledged',
        customer: { name: 'María López', address: 'Diagonal 200', city: 'Barcelona', postalCode: '08018', country: 'Spain' },
        items: [{ sku: '02273892', title: 'Don Quijote', author: 'Cervantes', quantity: 1, price: 18.00 }],
        subtotal: 18.0, shippingCost: 7.50, total: 25.50
      }
    ];
  }
  /**
   * Triggers a full catalog synchronization (upload active, delete inactive)
   */
  async triggerFullSync(): Promise<{ success: boolean; message: string }> {
    if (!await this.isEnabled()) {
      return { success: false, message: 'La integración con AbeBooks está desactivada.' };
    }

    try {
      console.log('🔵 [AbeBooks] Starting Full Catalog Sync...');
      const { error } = await supabase.functions.invoke('abebooks-full-sync', {
        body: { mode: 'manual' }
      });

      if (error) throw error;

      return { success: true, message: 'Sincronización completa iniciada correctamente.' };
    } catch (error: any) {
      console.error('❌ [AbeBooks] Error in Full Sync:', error);
      return { success: false, message: error.message || 'Error al iniciar la sincronización.' };
    }
  }
}

export const abeBooksService = new AbeBooksService();
