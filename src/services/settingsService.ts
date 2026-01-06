import { supabase } from '../lib/supabase';

export interface Setting {
  id: string;
  key: string;
  value: any;
  category: 'company' | 'billing' | 'shipping' | 'system' | 'security';
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

export interface AllSettings {
  company: CompanySettings;
  billing: BillingSettings;
  shipping: ShippingSettings;
  system: SystemSettings;
  security: SecuritySettings;
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

  private parseSettings(data: Setting[]): AllSettings {
    const settings = this.getDefaultSettings();

    data.forEach((setting: Setting) => {
      const category = setting.category;
      if (settings[category]) {
        const rawKey = setting.key;
        const prefix = `${category}_`;
        
        // Option 1: Strip prefix if it exists at the start
        let keyWithoutPrefix = rawKey;
        if (rawKey.startsWith(prefix)) {
          keyWithoutPrefix = rawKey.substring(prefix.length);
        }
        const camelCaseWithoutPrefix = this.toCamelCase(keyWithoutPrefix);

        // Option 2: Use raw key (for cases like shipping_zones -> shippingZones)
        const camelCaseRaw = this.toCamelCase(rawKey);
        
        const categorySettings = settings[category] as any;
        
        // Check which key actually exists in the default settings
        if (camelCaseWithoutPrefix in categorySettings) {
          categorySettings[camelCaseWithoutPrefix] = setting.value;
        } else if (camelCaseRaw in categorySettings) {
          categorySettings[camelCaseRaw] = setting.value;
        } else {
            // Fallback: If neither exists, assume the stripped version is intended strictly 
            // from the old logic, or just assign it to avoid data loss on generic objects
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
      }
    };
  }
}

export const settingsService = new SettingsService();
