import { supabase } from '../lib/supabase';

export interface Setting {
  id: string;
  key: string;
  value: any;
  category: 'company' | 'billing' | 'shipping' | 'system' | 'security' | 'integrations';
  description?: string;
  updated_at: string;
  updated_by?: string;
}

export interface CompanySettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  taxId: string;
  logo: string;
}

export interface BillingSettings {
  currency: 'EUR' | 'USD' | 'GBP';
  currencySymbol: string;
  taxRate: number;
  invoicePrefix: string;
  invoiceTerms: string;
  invoiceFooter: string;
}

export interface ShippingSettings {
  freeShippingThresholdStandard: number;
  freeShippingThresholdExpress: number;
  standardShippingCost: number;
  expressShippingCost: number;
  shippingZones: string[];
  estimatedDeliveryDays: {
    standard: number;
    express: number;
    international: number;
  };
  internationalRates: {
    europe: ZoneRate;
    america: ZoneRate;
    asia: ZoneRate;
    other: ZoneRate;
  };
}

export interface ZoneRate {
  cost: number;
  freeThreshold: number;
  days: number;
}

export interface SystemSettings {
  itemsPerPageCatalog: number;
  itemsPerPageAdmin: number;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  defaultLanguage: string;
  enableWishlist: boolean;
  enableReviews: boolean;
}

export interface SecuritySettings {
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordMinLength: number;
  requireEmailVerification: boolean;
  enable2FA: boolean;
}

export interface IntegrationsSettings {
  abeBooks: {
    // Global Master Switch
    enabled: boolean;
    lastFullSync?: string | null;

    // API-specific settings (individual operations)
    api: {
      enabled: boolean;
      orders: {
        showTab: boolean;      // Show tab in UI
        download: boolean;     // Download new orders
        manage: boolean;       // Future: Manage details locally
      };
      inventory: {
        upload: boolean;       // Show 'Send to AbeBooks' in BookForm (individual)
        syncStock: boolean;    // Update stock on local changes (individual)
        syncDeletions: boolean;// Delete on AbeBooks when locally deleted (individual)
      };
    };

    // FTPS-specific settings (bulk catalog sync)
    ftps: {
      enabled: boolean;
      autoSync: boolean;       // Enable/disable automatic scheduled sync
      minPrice: number;        // Minimum price for export (default: 12)
      schedule: string;        // Cron schedule (default: "0 */6 * * *")
    };

    // Legacy fields (for backward compatibility, can be removed later)
    orders?: {
      showTab: boolean;
      download: boolean;
      manage: boolean;
    };
    inventory?: {
      upload: boolean;
      syncStock: boolean;
      syncDeletions: boolean;
      autoFullSync: boolean;
    };
  };
  uniliber: {
    enabled: boolean;
  };
}

export interface AllSettings {
  company: CompanySettings;
  billing: BillingSettings;
  shipping: ShippingSettings;
  system: SystemSettings;
  security: SecuritySettings;
  integrations: IntegrationsSettings;
}

class SettingsService {
  async getAllSettings(): Promise<AllSettings | null> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*');

      if (error) {
        // Si la tabla no existe (error PGRST205), usar valores por defecto silenciosamente
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          return this.getDefaultSettings();
        }
        throw error;
      }

      if (!data || data.length === 0) {
        return this.getDefaultSettings();
      }

      return this.parseSettings(data);
    } catch (error) {
      console.error('❌ Error fetching settings:', error);
      return this.getDefaultSettings();
    }
  }

  async getSettingsByCategory(category: string): Promise<Record<string, unknown>> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('category', category);

      if (error) throw error;

      const result: Record<string, unknown> = {};
      data?.forEach((setting: Setting) => {
        const key = this.toCamelCase(setting.key.replace(`${category}_`, ''));
        result[key] = setting.value;
      });

      return result;
    } catch (error) {
      console.error(`Error fetching ${category} settings:`, error);
      return {};
    }
  }

  async updateSetting(key: string, value: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('settings')
        .update({ value })
        .eq('key', key);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating setting:', error);
      return false;
    }
  }

  async updateMultipleSettings(updates: { key: string; value: any; category?: string }[]): Promise<boolean> {
    try {
      const promises = updates.map(({ key, value, category }) => {
        // Prepare the data object. Key and value are required.
        // Category is optional but recommended for new inserts.
        const data: any = { key, value, updated_at: new Date().toISOString() };
        if (category) {
          data.category = category;
        }

        return supabase
          .from('settings')
          .upsert(data, { onConflict: 'key' });
      });

      const results = await Promise.all(promises);
      const hasErrors = results.some(result => result.error);

      if (hasErrors) {
        const firstError = results.find(r => r.error)?.error;
        console.error('Error updating settings:', firstError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error updating multiple settings:', error);
      return false;
    }
  }

  async updateCompanySettings(settings: CompanySettings): Promise<boolean> {
    const category = 'company';
    const updates = [
      { key: 'company_name', value: settings.name, category },
      { key: 'company_address', value: settings.address, category },
      { key: 'company_phone', value: settings.phone, category },
      { key: 'company_email', value: settings.email, category },
      { key: 'company_website', value: settings.website, category },
      { key: 'company_tax_id', value: settings.taxId, category },
      { key: 'company_logo', value: settings.logo, category },
    ];

    return this.updateMultipleSettings(updates);
  }

  async updateBillingSettings(settings: BillingSettings): Promise<boolean> {
    const category = 'billing';
    const updates = [
      { key: 'currency', value: settings.currency, category },
      { key: 'currency_symbol', value: settings.currencySymbol, category },
      { key: 'tax_rate', value: settings.taxRate, category },
      { key: 'invoice_prefix', value: settings.invoicePrefix, category },
      { key: 'invoice_terms', value: settings.invoiceTerms, category },
      { key: 'invoice_footer', value: settings.invoiceFooter, category },
    ];

    return this.updateMultipleSettings(updates);
  }

  async updateShippingSettings(settings: ShippingSettings): Promise<boolean> {
    const category = 'shipping';
    const updates = [
      { key: 'free_shipping_threshold_standard', value: settings.freeShippingThresholdStandard, category },
      { key: 'free_shipping_threshold_express', value: settings.freeShippingThresholdExpress, category },
      { key: 'standard_shipping_cost', value: settings.standardShippingCost, category },
      { key: 'express_shipping_cost', value: settings.expressShippingCost, category },
      { key: 'shipping_zones', value: settings.shippingZones, category },
      { key: 'estimated_delivery_days', value: settings.estimatedDeliveryDays, category },
      { key: 'international_rates', value: settings.internationalRates, category },
    ];

    return this.updateMultipleSettings(updates);
  }

  async updateSystemSettings(settings: SystemSettings): Promise<boolean> {
    const category = 'system';
    const updates = [
      { key: 'items_per_page_catalog', value: settings.itemsPerPageCatalog, category },
      { key: 'items_per_page_admin', value: settings.itemsPerPageAdmin, category },
      { key: 'maintenance_mode', value: settings.maintenanceMode, category },
      { key: 'allow_registration', value: settings.allowRegistration, category },
      { key: 'default_language', value: settings.defaultLanguage, category },
      { key: 'enable_wishlist', value: settings.enableWishlist, category },
      { key: 'enable_reviews', value: settings.enableReviews, category },
    ];

    return this.updateMultipleSettings(updates);
  }

  async updateSecuritySettings(settings: SecuritySettings): Promise<boolean> {
    const category = 'security';
    const updates = [
      { key: 'session_timeout', value: settings.sessionTimeout, category },
      { key: 'max_login_attempts', value: settings.maxLoginAttempts, category },
      { key: 'password_min_length', value: settings.passwordMinLength, category },
      { key: 'require_email_verification', value: settings.requireEmailVerification, category },
      { key: 'enable_2fa', value: settings.enable2FA, category },
    ];

    return this.updateMultipleSettings(updates);
  }

  async updateIntegrationsSettings(settings: IntegrationsSettings): Promise<boolean> {
    // We use 'system' category because DB might not have 'integrations' enum value
    const category = 'system'; 
    const updates = [
      // Global
      { key: 'abebooks_enabled', value: settings.abeBooks.enabled, category },
      { key: 'abebooks_last_full_sync', value: settings.abeBooks.lastFullSync, category },
      
      // Orders
      { key: 'abebooks_orders_showTab', value: settings.abeBooks.api.orders.showTab, category },
      { key: 'abebooks_orders_download', value: settings.abeBooks.api.orders.download, category },
      { key: 'abebooks_orders_manage', value: settings.abeBooks.api.orders.manage, category },
      
      // Inventory
      { key: 'abebooks_inventory_upload', value: settings.abeBooks.api.inventory.upload, category },
      { key: 'abebooks_inventory_syncStock', value: settings.abeBooks.api.inventory.syncStock, category },
      { key: 'abebooks_inventory_syncDeletions', value: settings.abeBooks.api.inventory.syncDeletions, category },

      // FTPS
      { key: 'abebooks_ftps_autoSync', value: settings.abeBooks.ftps.autoSync, category },
      { key: 'abebooks_ftps_minPrice', value: settings.abeBooks.ftps.minPrice, category },
      { key: 'abebooks_ftps_schedule', value: settings.abeBooks.ftps.schedule, category },

      // Other Integrations
      { key: 'uniliber_enabled', value: settings.uniliber.enabled, category },
    ];

    return this.updateMultipleSettings(updates);
  }

  private parseSettings(data: Setting[]): AllSettings {
    const settings = this.getDefaultSettings();

    data.forEach((setting: Setting) => {
      const category = setting.category;
      if (settings[category]) {
        const rawKey = setting.key;
        const prefix = `${category}_`;
        
        let keyWithoutPrefix = rawKey;
        if (rawKey.startsWith(prefix)) {
          keyWithoutPrefix = rawKey.substring(prefix.length);
        }
        const camelCaseWithoutPrefix = this.toCamelCase(keyWithoutPrefix);
        const camelCaseRaw = this.toCamelCase(rawKey);
        
        const categorySettings = settings[category] as any;
        
        // Special handling for Integrations (stored in 'system' or 'integrations')
        // We check keys regardless of category if they look like integration keys
        if (rawKey.startsWith('abebooks_')) {
            const suffix = rawKey.replace('abebooks_', '');
            
            // Nested parsing for 'orders_' and 'inventory_'
            if (suffix.startsWith('orders_')) {
                const subKey = this.toCamelCase(suffix.replace('orders_', ''));
                if (settings.integrations.abeBooks?.api?.orders) {
                    (settings.integrations.abeBooks.api.orders as any)[subKey] = setting.value;
                    // Also update legacy for safety if needed, or just migrate completely
                    if (settings.integrations.abeBooks.orders) {
                         (settings.integrations.abeBooks.orders as any)[subKey] = setting.value;
                    }
                    return;
                }
            } else if (suffix.startsWith('inventory_')) {
                const subKey = this.toCamelCase(suffix.replace('inventory_', ''));
                if (settings.integrations.abeBooks?.api?.inventory) {
                    (settings.integrations.abeBooks.api.inventory as any)[subKey] = setting.value;
                     if (settings.integrations.abeBooks.inventory) {
                         (settings.integrations.abeBooks.inventory as any)[subKey] = setting.value;
                    }
                    return;
                }
            } else if (suffix.startsWith('ftps_')) {
                const subKey = this.toCamelCase(suffix.replace('ftps_', ''));
                if (settings.integrations.abeBooks?.ftps) {
                    (settings.integrations.abeBooks.ftps as any)[subKey] = setting.value;
                    return;
                }
            } else {
                // Top level properties (enabled, lastFullSync)
                const subKey = this.toCamelCase(suffix);
                if (settings.integrations.abeBooks) {
                    (settings.integrations.abeBooks as any)[subKey] = setting.value;
                    return; 
                }
            }
        }
        if (rawKey.startsWith('uniliber_')) {
             const subKey = this.toCamelCase(rawKey.replace('uniliber_', ''));
             if (settings.integrations.uniliber) {
                (settings.integrations.uniliber as any)[subKey] = setting.value;
                return;
             }
        }

        // Generic handling for flat settings
        if (camelCaseWithoutPrefix in categorySettings) {
          categorySettings[camelCaseWithoutPrefix] = setting.value;
        } else if (camelCaseRaw in categorySettings) {
          categorySettings[camelCaseRaw] = setting.value;
        } else {
             categorySettings[camelCaseWithoutPrefix] = setting.value;
        }
      }
    });

    return settings;
  }

  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private getDefaultSettings(): AllSettings {
    return {
      company: {
        name: 'Perez Galdos',
        address: 'Calle Hortaleza 5, 28004 Madrid, España',
        phone: '+34 91 531 26 40',
        email: 'libreria@perezgaldos.com',
        website: 'www.perezgaldos.es',
        taxId: 'B12345678',
        logo: '/Logo Exlibris Perez Galdos.png'
      },
      billing: {
        currency: 'EUR',
        currencySymbol: '€',
        taxRate: 21,
        invoicePrefix: 'FAC',
        invoiceTerms: 'Pago a 30 días. Transferencia bancaria.',
        invoiceFooter: 'Gracias por su compra. Para cualquier consulta contacte con nosotros.'
      },
      shipping: {
        freeShippingThresholdStandard: 30,
        freeShippingThresholdExpress: 50,
        standardShippingCost: 5.99,
        expressShippingCost: 12.99,
        shippingZones: ['España', 'Portugal', 'Francia', 'Italia'],
        estimatedDeliveryDays: {
          standard: 5,
          express: 2,
          international: 10
        },
        internationalRates: {
            europe: { cost: 15.00, freeThreshold: 100.00, days: 7 },
            america: { cost: 25.00, freeThreshold: 150.00, days: 12 },
            asia: { cost: 30.00, freeThreshold: 180.00, days: 15 },
            other: { cost: 35.00, freeThreshold: 200.00, days: 20 }
        }
      },
      system: {
        itemsPerPageCatalog: 25,
        itemsPerPageAdmin: 20,
        maintenanceMode: false,
        allowRegistration: true,
        defaultLanguage: 'es',
        enableWishlist: true,
        enableReviews: true
      },
      security: {
        sessionTimeout: 3600,
        maxLoginAttempts: 5,
        passwordMinLength: 8,
        requireEmailVerification: false,
        enable2FA: false
      },
      integrations: {
        abeBooks: {
          enabled: false,
          lastFullSync: null,
          api: {
            enabled: false,
            orders: {
              showTab: false,
              download: false,
              manage: false
            },
            inventory: {
              upload: false,
              syncStock: false,
              syncDeletions: false
            }
          },
          ftps: {
            enabled: false,
            autoSync: false,
            minPrice: 12,
            schedule: '0 */6 * * *'
          },
          // Legacy fields for backward compatibility
          orders: {
            showTab: false,
            download: false,
            manage: false
          },
          inventory: {
            upload: false,
            syncStock: false,
            syncDeletions: false,
            autoFullSync: false
          }
        },
        uniliber: {
          enabled: false
        }
      }
    };
  }
}

export const settingsService = new SettingsService();
