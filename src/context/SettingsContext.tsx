import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  settingsService,
  AllSettings,
  CompanySettings,
  BillingSettings,
  ShippingSettings,
  SystemSettings,
  SecuritySettings
} from '../services/settingsService';

interface SettingsContextType {
  settings: AllSettings;
  loading: boolean;
  updateCompanySettings: (settings: CompanySettings) => Promise<boolean>;
  updateBillingSettings: (settings: BillingSettings) => Promise<boolean>;
  updateShippingSettings: (settings: ShippingSettings) => Promise<boolean>;
  updateSystemSettings: (settings: SystemSettings) => Promise<boolean>;
  updateSecuritySettings: (settings: SecuritySettings) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
  formatPrice: (price: number) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AllSettings>(() =>
    settingsService['getDefaultSettings']()
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const fetchedSettings = await settingsService.getAllSettings();
      if (fetchedSettings) {
        setSettings(fetchedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCompanySettings = async (newSettings: CompanySettings): Promise<boolean> => {
    const success = await settingsService.updateCompanySettings(newSettings);
    if (success) {
      setSettings(prev => ({
        ...prev,
        company: newSettings
      }));
    }
    return success;
  };

  const updateBillingSettings = async (newSettings: BillingSettings): Promise<boolean> => {
    const success = await settingsService.updateBillingSettings(newSettings);
    if (success) {
      setSettings(prev => ({
        ...prev,
        billing: newSettings
      }));
    }
    return success;
  };

  const updateShippingSettings = async (newSettings: ShippingSettings): Promise<boolean> => {
    const success = await settingsService.updateShippingSettings(newSettings);
    if (success) {
      setSettings(prev => ({
        ...prev,
        shipping: newSettings
      }));
    }
    return success;
  };

  const updateSystemSettings = async (newSettings: SystemSettings): Promise<boolean> => {
    const success = await settingsService.updateSystemSettings(newSettings);
    if (success) {
      setSettings(prev => ({
        ...prev,
        system: newSettings
      }));
    }
    return success;
  };

  const updateSecuritySettings = async (newSettings: SecuritySettings): Promise<boolean> => {
    const success = await settingsService.updateSecuritySettings(newSettings);
    if (success) {
      setSettings(prev => ({
        ...prev,
        security: newSettings
      }));
    }
    return success;
  };

  const refreshSettings = async () => {
    await loadSettings();
  };

  const formatPrice = (price: number): string => {
    const { currency, currencySymbol } = settings.billing;
    
    // Handle undefined, null, or NaN prices
    const safePrice = (price !== null && price !== undefined && !isNaN(price)) ? price : 0;

    switch (currency) {
      case 'EUR':
        return `${safePrice.toFixed(2)}${currencySymbol}`;
      case 'USD':
      case 'GBP':
        return `${currencySymbol}${safePrice.toFixed(2)}`;
      default:
        return `${safePrice.toFixed(2)}${currencySymbol}`;
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        updateCompanySettings,
        updateBillingSettings,
        updateShippingSettings,
        updateSystemSettings,
        updateSecuritySettings,
        refreshSettings,
        formatPrice
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
