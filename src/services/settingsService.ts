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
  freeShippingThreshold: number;
  standardShippingCost: number;
  expressShippingCost: number;
  shippingZones: string[];
  estimatedDeliveryDays: {
    standard: number;
    express: number;
  };
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
          console.warn('⚠️  Tabla settings no encontrada en Supabase. Usando configuración por defecto.');
          console.log('📝 Para aplicar la migración, ve al SQL Editor de Supabase y ejecuta:');
          console.log('   supabase/migrations/20251008000000_create_settings_table.sql');
          return this.getDefaultSettings();
        }
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('ℹ️  No hay configuraciones en la base de datos. Usando valores por defecto.');
        return this.getDefaultSettings();
      }

      console.log('✅ Configuraciones cargadas desde Supabase:', data.length, 'settings');
      return this.parseSettings(data);
    } catch (error) {
      console.error('❌ Error fetching settings:', error);
      return this.getDefaultSettings();
    }
  }

  async getSettingsByCategory(category: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('category', category);

      if (error) throw error;

      const result: any = {};
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

  async updateMultipleSettings(updates: { key: string; value: any }[]): Promise<boolean> {
    try {
      const promises = updates.map(({ key, value }) =>
        supabase.from('settings').update({ value }).eq('key', key)
      );

      const results = await Promise.all(promises);
      const hasErrors = results.some(result => result.error);

      if (hasErrors) {
        const firstError = results.find(r => r.error)?.error;
        if (firstError?.code === 'PGRST205' || firstError?.message?.includes('Could not find the table')) {
          console.warn('⚠️  No se pueden guardar configuraciones: tabla settings no existe en Supabase');
          console.log('📝 Las configuraciones se aplicarán temporalmente pero no se guardarán');
          return false;
        }
        throw new Error('Some settings failed to update');
      }

      console.log('✅ Configuraciones actualizadas exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error updating multiple settings:', error);
      return false;
    }
  }

  async updateCompanySettings(settings: CompanySettings): Promise<boolean> {
    const updates = [
      { key: 'company_name', value: settings.name },
      { key: 'company_address', value: settings.address },
      { key: 'company_phone', value: settings.phone },
      { key: 'company_email', value: settings.email },
      { key: 'company_website', value: settings.website },
      { key: 'company_tax_id', value: settings.taxId },
      { key: 'company_logo', value: settings.logo },
    ];

    return this.updateMultipleSettings(updates);
  }

  async updateBillingSettings(settings: BillingSettings): Promise<boolean> {
    const updates = [
      { key: 'currency', value: settings.currency },
      { key: 'currency_symbol', value: settings.currencySymbol },
      { key: 'tax_rate', value: settings.taxRate },
      { key: 'invoice_prefix', value: settings.invoicePrefix },
      { key: 'invoice_terms', value: settings.invoiceTerms },
      { key: 'invoice_footer', value: settings.invoiceFooter },
    ];

    return this.updateMultipleSettings(updates);
  }

  async updateShippingSettings(settings: ShippingSettings): Promise<boolean> {
    const updates = [
      { key: 'free_shipping_threshold', value: settings.freeShippingThreshold },
      { key: 'standard_shipping_cost', value: settings.standardShippingCost },
      { key: 'express_shipping_cost', value: settings.expressShippingCost },
      { key: 'shipping_zones', value: settings.shippingZones },
      { key: 'estimated_delivery_days', value: settings.estimatedDeliveryDays },
    ];

    return this.updateMultipleSettings(updates);
  }

  async updateSystemSettings(settings: SystemSettings): Promise<boolean> {
    const updates = [
      { key: 'items_per_page_catalog', value: settings.itemsPerPageCatalog },
      { key: 'items_per_page_admin', value: settings.itemsPerPageAdmin },
      { key: 'maintenance_mode', value: settings.maintenanceMode },
      { key: 'allow_registration', value: settings.allowRegistration },
      { key: 'default_language', value: settings.defaultLanguage },
      { key: 'enable_wishlist', value: settings.enableWishlist },
      { key: 'enable_reviews', value: settings.enableReviews },
    ];

    return this.updateMultipleSettings(updates);
  }

  async updateSecuritySettings(settings: SecuritySettings): Promise<boolean> {
    const updates = [
      { key: 'session_timeout', value: settings.sessionTimeout },
      { key: 'max_login_attempts', value: settings.maxLoginAttempts },
      { key: 'password_min_length', value: settings.passwordMinLength },
      { key: 'require_email_verification', value: settings.requireEmailVerification },
      { key: 'enable_2fa', value: settings.enable2FA },
    ];

    return this.updateMultipleSettings(updates);
  }

  private parseSettings(data: Setting[]): AllSettings {
    const settings: any = {
      company: {},
      billing: {},
      shipping: {},
      system: {},
      security: {}
    };

    data.forEach((setting: Setting) => {
      const category = setting.category;
      const key = this.toCamelCase(setting.key.replace(`${category}_`, ''));
      settings[category][key] = setting.value;
    });

    return settings as AllSettings;
  }

  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private getDefaultSettings(): AllSettings {
    return {
      company: {
        name: 'Perez Galdos S.L.',
        address: 'Calle Hortaleza 5, 28004 Madrid, España',
        phone: '+34 91 531 26 40',
        email: 'libreria@perezgaldos.com',
        website: 'www.perezgaldos.es',
        taxId: 'B12345678',
        logo: 'https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=200'
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
        freeShippingThreshold: 50,
        standardShippingCost: 5.99,
        expressShippingCost: 12.99,
        shippingZones: ['España', 'Portugal', 'Francia', 'Italia'],
        estimatedDeliveryDays: {
          standard: 5,
          express: 2
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
