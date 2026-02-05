import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import {
  Building2, Mail, Phone, Globe, FileText, DollarSign,
  Truck, Bell, Database, Shield, Settings as SettingsIcon,
  Package, Download, HardDrive, Check, MapPin,
  Home, LayoutDashboard, X, Megaphone, ChevronDown
} from 'lucide-react';

import { GestionUbicaciones } from '../components/admin/books/GestionUbicaciones';
import { GestionUsuariosAdmin } from '../components/admin/clients/GestionUsuariosAdmin';
import { BannerManager } from '../components/admin/marketing/BannerManager';
import { IntegrationsManager } from '../components/admin/integrations/IntegrationsManager';
import {
  exportLibrosToCSV,
  exportCategoriasToCSV,
  exportInvoicesToCSV,
  exportPedidosToCSV,
  exportClientesToCSV
} from '../services/backupService';
import '../styles/pages/AdminSettings.css';
import { MessageModal } from '../components/MessageModal'; // Import MessageModal

export function AdminSettings() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const {
    settings,
    loading,
    updateCompanySettings,
    updateBillingSettings,
    updateShippingSettings,
    updateSystemSettings,
    updateSecuritySettings
  } = useSettings();

  const [activeTab, setActiveTab] = useState<'company' | 'billing' | 'shipping' | 'system' | 'security' | 'marketing' | 'integrations' | 'backup' | 'ubicaciones' | 'usuarios'>('company');

  const [exportState, setExportState] = useState<{ isExporting: boolean; type: string | null; progress: number; total: number }>({
    isExporting: false,
    type: null,
    progress: 0,
    total: 0
  });

  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // State for MessageModal
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalConfig, setMessageModalConfig] = useState<{
    title: string;
    message: string;
    type: 'info' | 'error';
  }>({ title: '', message: '', type: 'info' });

  const showModal = (title: string, message: string, type: 'info' | 'error' = 'info') => {
    setMessageModalConfig({ title, message, type });
    setShowMessageModal(true);
  };

  const [companyData, setCompanyData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    taxId: '',
    logo: ''
  });

  const [billingData, setBillingData] = useState({
    currency: 'EUR' as 'EUR' | 'USD' | 'GBP',
    currencySymbol: '€',
    taxRate: 21,
    invoicePrefix: 'FAC',
    invoiceTerms: '',
    invoiceFooter: ''
  });

  const [shippingData, setShippingData] = useState({
    freeShippingThresholdStandard: 30,
    freeShippingThresholdExpress: 50,
    standardShippingCost: 5.99,
    expressShippingCost: 12.99,
    shippingZones: [] as string[],
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
  });

  const [systemData, setSystemData] = useState({
    itemsPerPageCatalog: 25,
    itemsPerPageAdmin: 20,
    maintenanceMode: false,
    allowRegistration: true,
    defaultLanguage: 'es',
    enableWishlist: true,
    enableReviews: true
  });

  const [securityData, setSecurityData] = useState({
    sessionTimeout: 3600,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requireEmailVerification: false,
    enable2FA: false
  });

  useEffect(() => {
    if (!loading && settings) {
      setCompanyData(settings.company);
      setBillingData(settings.billing);
      setShippingData({
        ...settings.shipping,
        freeShippingThresholdStandard: settings.shipping.freeShippingThresholdStandard ?? 30,
        freeShippingThresholdExpress: settings.shipping.freeShippingThresholdExpress ?? 50,
        internationalRates: settings.shipping.internationalRates || {
            europe: { cost: 15.00, freeThreshold: 100.00, days: 7 },
            america: { cost: 25.00, freeThreshold: 150.00, days: 12 },
            asia: { cost: 30.00, freeThreshold: 180.00, days: 15 },
            other: { cost: 35.00, freeThreshold: 200.00, days: 20 }
        }
      });
      setSystemData(settings.system);
      setSecurityData(settings.security);
    }
  }, [loading, settings]);

  const showSuccessMessage = (message: string) => {
    setSaveSuccess(message);
    setSaveError(null);
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const showErrorMessage = (message: string) => {
    setSaveError(message);
    setSaveSuccess(null);
    setTimeout(() => setSaveError(null), 3000);
  };

  const handleCompanyUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateCompanySettings(companyData);
    if (success) {
      showSuccessMessage('Datos de empresa actualizados correctamente');
    } else {
      showErrorMessage('Error al actualizar los datos de empresa');
    }
  };

  const handleBillingUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateBillingSettings(billingData);
    if (success) {
      showSuccessMessage('Configuración de facturación actualizada correctamente');
    } else {
      showErrorMessage('Error al actualizar la configuración de facturación');
    }
  };

  const handleShippingUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure we are passing the correct structure expected by ShippingSettings interface
    const success = await updateShippingSettings({
      ...shippingData,
      ...shippingData,
      freeShippingThresholdStandard: shippingData.freeShippingThresholdStandard, 
      freeShippingThresholdExpress: shippingData.freeShippingThresholdExpress,
      internationalRates: shippingData.internationalRates
    } as any); 
    
    if (success) {
      showSuccessMessage('Configuración de envíos actualizada correctamente');
    } else {
      showErrorMessage('Error al actualizar la configuración de envíos');
    }
  };

  const handleSystemUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateSystemSettings(systemData);
    if (success) {
      showSuccessMessage('Configuración del sistema actualizada correctamente');
    } else {
      showErrorMessage('Error al actualizar la configuración del sistema');
    }
  };

  const handleSecurityUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateSecuritySettings(securityData);
    if (success) {
      showSuccessMessage('Configuración de seguridad actualizada correctamente');
    } else {
      showErrorMessage('Error al actualizar la configuración de seguridad');
    }
  };

  const handleExport = async (exportFunction: (onProgress: (c: number, t: number) => void) => Promise<{ success: boolean; error?: string }>, name: string) => {
    setExportState({ isExporting: true, type: name, progress: 0, total: 0 });
    try {
      const result = await exportFunction((current, total) => {
         setExportState(prev => ({ ...prev, progress: current, total }));
      });
      
      if (result.success) {
          showModal('Exportación Exitosa', `La exportación de ${name} se ha completado correctamente.\nEl archivo se descargará automáticamente.`, 'info');
      } else {
          showModal('Error en Exportación', result.error || `Error al exportar ${name}`, 'error');
      }
    } catch (error: any) {
      console.error(`Error exportando ${name}:`, error);
      showModal('Error Inesperado', `Ocurrió un error inesperado al exportar ${name}: ${error.message}`, 'error');
    } finally {
      setExportState({ isExporting: false, type: null, progress: 0, total: 0 });
    }
  };

  const tabs = [
    { id: 'company', label: 'Empresa', icon: Building2 },
    { id: 'billing', label: 'Facturación', icon: FileText },
    { id: 'shipping', label: 'Envíos', icon: Truck },
    { id: 'system', label: 'Sistema', icon: SettingsIcon },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'marketing', label: 'Marketing', icon: Megaphone },
    ...(isSuperAdmin ? [{ id: 'integrations', label: 'Integraciones', icon: Globe }] : []),
    { id: 'ubicaciones', label: 'Ubicaciones', icon: MapPin },
    // Only show Usuarios tab if Super Admin
    ...(isSuperAdmin ? [{ id: 'usuarios', label: 'Usuarios Admin', icon: Shield }] : []),
    { id: 'backup', label: 'Copias de Seguridad', icon: HardDrive }
  ];

  return (
    <div className="admin-settings">
      <div className="settings-container">
        <div className="settings-header">
          <h1>Configuración del Sistema</h1>
          <p>Administración general de la librería</p>
          <div className="settings-actions">
            <button onClick={() => navigate('/')} className="btn-nav">
              <Home size={18} />
              Volver a página web
            </button>
            <button onClick={() => navigate('/admin')} className="btn-nav">
              <LayoutDashboard size={18} />
              Volver a admin panel
            </button>
          </div>
        </div>
        
        {saveSuccess && (
          <div className="alert alert-success">
            <Check size={20} />
            <span>{saveSuccess}</span>
          </div>
        )}

        {saveError && (
          <div className="alert alert-error">
            <X size={20} />
            <span>{saveError}</span>
          </div>
        )}

        <div className="settings-layout">
          <nav className="settings-nav">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                >
                  <Icon size={20} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="settings-content">
             {/* ... existing tabs ... */}
             
            {activeTab === 'marketing' && (
              <div className="settings-section">
                <BannerManager />
              </div>
            )}

            {activeTab === 'integrations' && (
              <IntegrationsManager />
            )}

            {activeTab === 'company' && (
              <div className="settings-section">
                <h2>Datos de la Empresa</h2>
                <form onSubmit={handleCompanyUpdate} className="settings-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="companyName">
                        <Building2 size={16} />
                        Nombre de la empresa
                      </label>
                      <input
                        id="companyName"
                        type="text"
                        value={companyData.name}
                        onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="taxId">
                        <FileText size={16} />
                        NIF/CIF
                      </label>
                      <input
                        id="taxId"
                        type="text"
                        value={companyData.taxId}
                        onChange={(e) => setCompanyData({ ...companyData, taxId: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="address">
                      <Building2 size={16} />
                      Dirección Completa
                    </label>
                    <textarea
                      id="address"
                      rows={2}
                      value={companyData.address}
                      onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                      placeholder="Calle, número, ciudad, código postal, país"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="logo">
                      <Building2 size={16} />
                      URL del Logo
                    </label>
                    <input
                      id="logo"
                      type="text"
                      value={companyData.logo}
                      onChange={(e) => setCompanyData({ ...companyData, logo: e.target.value })}
                      placeholder="https://ejemplo.com/logo.png"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="phone">
                        <Phone size={16} />
                        Teléfono
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        value={companyData.phone}
                        onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="email">
                        <Mail size={16} />
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={companyData.email}
                        onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="website">
                        <Globe size={16} />
                        Sitio web
                      </label>
                      <input
                        id="website"
                        type="text"
                        value={companyData.website}
                        onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn-primary">
                    Guardar cambios
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="settings-section">
                <h2>Configuración de Facturación</h2>
                <form onSubmit={handleBillingUpdate} className="settings-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="currency">
                        <DollarSign size={16} />
                        Moneda
                      </label>
                      <select
                        id="currency"
                        value={billingData.currency}
                        onChange={(e) => {
                          const currency = e.target.value as 'EUR' | 'USD' | 'GBP';
                          const symbols = { EUR: '€', USD: '$', GBP: '£' };
                          setBillingData({
                            ...billingData,
                            currency,
                            currencySymbol: symbols[currency]
                          });
                        }}
                      >
                        <option value="EUR">Euro (EUR) - €</option>
                        <option value="USD">Dólar (USD) - $</option>
                        <option value="GBP">Libra (GBP) - £</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="taxRate">
                        <FileText size={16} />
                        IVA (%)
                      </label>
                      <input
                        id="taxRate"
                        type="number"
                        min="0"
                        max="100"
                        value={billingData.taxRate}
                        onChange={(e) => setBillingData({ ...billingData, taxRate: Number(e.target.value) })}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="invoicePrefix">Prefijo de factura</label>
                      <input
                        id="invoicePrefix"
                        type="text"
                        value={billingData.invoicePrefix}
                        onChange={(e) => setBillingData({ ...billingData, invoicePrefix: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="invoiceTerms">
                      <FileText size={16} />
                      Condiciones de Pago
                    </label>
                    <textarea
                      id="invoiceTerms"
                      rows={2}
                      value={billingData.invoiceTerms}
                      onChange={(e) => setBillingData({ ...billingData, invoiceTerms: e.target.value })}
                      placeholder="Ej: Pago a 30 días. Transferencia bancaria."
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="invoiceFooter">
                      <FileText size={16} />
                      Texto al Pie de Factura
                    </label>
                    <textarea
                      id="invoiceFooter"
                      rows={2}
                      value={billingData.invoiceFooter}
                      onChange={(e) => setBillingData({ ...billingData, invoiceFooter: e.target.value })}
                      placeholder="Ej: Gracias por su compra. Para cualquier consulta contacte con nosotros."
                    />
                  </div>

                  <button type="submit" className="btn-primary">
                    Guardar configuración
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="settings-section">
                <h2>Configuración de Envíos</h2>
                <form onSubmit={handleShippingUpdate} className="settings-form">
                  {/* Fila Estándar */}
                  {/* Seccion Envíos Nacionales */}
                  <details className="settings-section-details" open>
                    <summary className="settings-section-summary">
                      <div className="summary-content">
                        <h3>Envíos Nacionales</h3>
                        <span className="summary-subtitle">Configuración para envíos dentro de España</span>
                      </div>
                      <ChevronDown className="summary-icon" size={20} />
                    </summary>
                    
                    <div className="details-content">
                      {/* Fila Estándar */}
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="standardShipping">
                            <Package size={16} />
                            Envío estándar
                          </label>
                          <input
                            id="standardShipping"
                            type="number"
                            step="0.01"
                            value={shippingData.standardShippingCost ?? ''}
                            onChange={(e) => setShippingData({ ...shippingData, standardShippingCost: Number(e.target.value) })}
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="standardDelivery">Días entrega estándar</label>
                          <input
                            id="standardDelivery"
                            type="number"
                            value={shippingData.estimatedDeliveryDays.standard ?? ''}
                            onChange={(e) => setShippingData({
                              ...shippingData,
                              estimatedDeliveryDays: {
                                ...shippingData.estimatedDeliveryDays,
                                standard: Number(e.target.value)
                              }
                            })}
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="freeShippingStandard">Envío estándar gratis desde</label>
                          <input
                            id="freeShippingStandard"
                            type="number"
                            step="0.01"
                            value={shippingData.freeShippingThresholdStandard ?? ''}
                            onChange={(e) => setShippingData({ ...shippingData, freeShippingThresholdStandard: Number(e.target.value) })}
                          />
                        </div>
                      </div>

                      {/* Fila Express */}
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="expressShipping">
                            <Truck size={16} />
                            Envío express
                          </label>
                          <input
                            id="expressShipping"
                            type="number"
                            step="0.01"
                            value={shippingData.expressShippingCost ?? ''}
                            onChange={(e) => setShippingData({ ...shippingData, expressShippingCost: Number(e.target.value) })}
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="expressDelivery">Días entrega express</label>
                          <input
                            id="expressDelivery"
                            type="number"
                            value={shippingData.estimatedDeliveryDays.express ?? ''}
                            onChange={(e) => setShippingData({
                              ...shippingData,
                              estimatedDeliveryDays: {
                                ...shippingData.estimatedDeliveryDays,
                                express: Number(e.target.value)
                              }
                            })}
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="freeShippingExpress">Envío express gratis desde</label>
                          <input
                            id="freeShippingExpress"
                            type="number"
                            step="0.01"
                            value={shippingData.freeShippingThresholdExpress ?? ''}
                            onChange={(e) => setShippingData({ ...shippingData, freeShippingThresholdExpress: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>
                  </details>

                  {/* Seccion Envíos Internacionales */}
                  <details className="settings-section-details">
                    <summary className="settings-section-summary">
                      <div className="summary-content">
                        <h3>Envíos Internacionales</h3>
                        <span className="summary-subtitle">Configuración por regiones (Europa, América, Asia)</span>
                      </div>
                      <ChevronDown className="summary-icon" size={20} />
                    </summary>
                    
                    <div className="details-content">
                        {/* Zone: Europa */}
                        <div className="shipping-region-block">
                            <h4 className="region-title">Europa</h4>
                            <div className="form-row">
                                <div className="form-group">
                                <label>Costo Envío</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={shippingData.internationalRates.europe.cost}
                                    onChange={(e) => setShippingData({
                                        ...shippingData,
                                        internationalRates: {
                                            ...shippingData.internationalRates,
                                            europe: { ...shippingData.internationalRates.europe, cost: Number(e.target.value) }
                                        }
                                    })}
                                />
                                </div>
                                <div className="form-group">
                                <label>Días entrega</label>
                                <input
                                    type="number"
                                    value={shippingData.internationalRates.europe.days}
                                    onChange={(e) => setShippingData({
                                        ...shippingData,
                                        internationalRates: {
                                            ...shippingData.internationalRates,
                                            europe: { ...shippingData.internationalRates.europe, days: Number(e.target.value) }
                                        }
                                    })}
                                />
                                </div>
                                <div className="form-group">
                                <label>Envío gratis desde</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={shippingData.internationalRates.europe.freeThreshold}
                                    onChange={(e) => setShippingData({
                                        ...shippingData,
                                        internationalRates: {
                                            ...shippingData.internationalRates,
                                            europe: { ...shippingData.internationalRates.europe, freeThreshold: Number(e.target.value) }
                                        }
                                    })}
                                />
                                </div>
                            </div>
                        </div>

                         {/* Zone: America */}
                         <div className="shipping-region-block">
                            <h4 className="region-title">América</h4>
                            <div className="form-row">
                                <div className="form-group">
                                <label>Costo Envío</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={shippingData.internationalRates.america.cost}
                                    onChange={(e) => setShippingData({
                                        ...shippingData,
                                        internationalRates: {
                                            ...shippingData.internationalRates,
                                            america: { ...shippingData.internationalRates.america, cost: Number(e.target.value) }
                                        }
                                    })}
                                />
                                </div>
                                <div className="form-group">
                                <label>Días entrega</label>
                                <input
                                    type="number"
                                    value={shippingData.internationalRates.america.days}
                                    onChange={(e) => setShippingData({
                                        ...shippingData,
                                        internationalRates: {
                                            ...shippingData.internationalRates,
                                            america: { ...shippingData.internationalRates.america, days: Number(e.target.value) }
                                        }
                                    })}
                                />
                                </div>
                                <div className="form-group">
                                <label>Envío gratis desde</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={shippingData.internationalRates.america.freeThreshold}
                                    onChange={(e) => setShippingData({
                                        ...shippingData,
                                        internationalRates: {
                                            ...shippingData.internationalRates,
                                            america: { ...shippingData.internationalRates.america, freeThreshold: Number(e.target.value) }
                                        }
                                    })}
                                />
                                </div>
                            </div>
                        </div>

                         {/* Zone: Asia */}
                         <div>
                            <h4 className="region-title">Asia</h4>
                            <div className="form-row">
                                <div className="form-group">
                                <label>Costo Envío</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={shippingData.internationalRates.asia.cost}
                                    onChange={(e) => setShippingData({
                                        ...shippingData,
                                        internationalRates: {
                                            ...shippingData.internationalRates,
                                            asia: { ...shippingData.internationalRates.asia, cost: Number(e.target.value) }
                                        }
                                    })}
                                />
                                </div>
                                <div className="form-group">
                                <label>Días entrega</label>
                                <input
                                    type="number"
                                    value={shippingData.internationalRates.asia.days}
                                    onChange={(e) => setShippingData({
                                        ...shippingData,
                                        internationalRates: {
                                            ...shippingData.internationalRates,
                                            asia: { ...shippingData.internationalRates.asia, days: Number(e.target.value) }
                                        }
                                    })}
                                />
                                </div>
                                <div className="form-group">
                                <label>Envío gratis desde</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={shippingData.internationalRates.asia.freeThreshold}
                                    onChange={(e) => setShippingData({
                                        ...shippingData,
                                        internationalRates: {
                                            ...shippingData.internationalRates,
                                            asia: { ...shippingData.internationalRates.asia, freeThreshold: Number(e.target.value) }
                                        }
                                    })}
                                />
                                </div>
                            </div>
                        </div>

                    </div>
                  </details>

                  <button type="submit" className="btn-primary">
                    Guardar configuración
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="settings-section">
                <h2>Configuración del Sistema</h2>
                <form onSubmit={handleSystemUpdate} className="settings-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="itemsPerPageCatalog">Items por página (Catálogo)</label>
                      <input
                        id="itemsPerPageCatalog"
                        type="number"
                        min="10"
                        max="100"
                        value={systemData.itemsPerPageCatalog}
                        onChange={(e) => setSystemData({ ...systemData, itemsPerPageCatalog: Number(e.target.value) })}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="itemsPerPageAdmin">Items por página (Admin)</label>
                      <input
                        id="itemsPerPageAdmin"
                        type="number"
                        min="10"
                        max="100"
                        value={systemData.itemsPerPageAdmin}
                        onChange={(e) => setSystemData({ ...systemData, itemsPerPageAdmin: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={systemData.maintenanceMode}
                        onChange={(e) => setSystemData({ ...systemData, maintenanceMode: e.target.checked })}
                      />
                      <div>
                        <strong>Modo mantenimiento</strong>
                        <p>Desactivar temporalmente el sitio para mantenimiento</p>
                      </div>
                    </label>
                  </div>

                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={systemData.allowRegistration}
                        onChange={(e) => setSystemData({ ...systemData, allowRegistration: e.target.checked })}
                      />
                      <div>
                        <strong>Permitir registros</strong>
                        <p>Los nuevos usuarios pueden crear cuentas</p>
                      </div>
                    </label>
                  </div>

                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={systemData.enableWishlist}
                        onChange={(e) => setSystemData({ ...systemData, enableWishlist: e.target.checked })}
                      />
                      <div>
                        <strong>Habilitar lista de deseos</strong>
                        <p>Los usuarios pueden agregar libros a su lista de deseos</p>
                      </div>
                    </label>
                  </div>

                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={systemData.enableReviews}
                        onChange={(e) => setSystemData({ ...systemData, enableReviews: e.target.checked })}
                      />
                      <div>
                        <strong>Habilitar reseñas</strong>
                        <p>Los usuarios pueden dejar reseñas en los productos</p>
                      </div>
                    </label>
                  </div>

                  <button type="submit" className="btn-primary">
                    Guardar configuración
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="settings-section">
                <h2>Seguridad y Privacidad</h2>
                <form onSubmit={handleSecurityUpdate} className="settings-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="sessionTimeout">
                        <Shield size={16} />
                        Tiempo de sesión (segundos)
                      </label>
                      <input
                        id="sessionTimeout"
                        type="number"
                        value={securityData.sessionTimeout}
                        onChange={(e) => setSecurityData({ ...securityData, sessionTimeout: Number(e.target.value) })}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="maxLoginAttempts">Intentos máximos de login</label>
                      <input
                        id="maxLoginAttempts"
                        type="number"
                        value={securityData.maxLoginAttempts}
                        onChange={(e) => setSecurityData({ ...securityData, maxLoginAttempts: Number(e.target.value) })}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="passwordMinLength">Longitud mínima de contraseña</label>
                      <input
                        id="passwordMinLength"
                        type="number"
                        min="6"
                        max="20"
                        value={securityData.passwordMinLength}
                        onChange={(e) => setSecurityData({ ...securityData, passwordMinLength: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={securityData.requireEmailVerification}
                        onChange={(e) => setSecurityData({ ...securityData, requireEmailVerification: e.target.checked })}
                      />
                      <div>
                        <strong>Requiere verificación de email</strong>
                        <p>Los nuevos usuarios deben verificar su correo electrónico</p>
                      </div>
                    </label>
                  </div>

                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={securityData.enable2FA}
                        onChange={(e) => setSecurityData({ ...securityData, enable2FA: e.target.checked })}
                      />
                      <div>
                        <strong>Autenticación de dos factores (2FA)</strong>
                        <p>Habilitar 2FA para mayor seguridad</p>
                      </div>
                    </label>
                  </div>

                  <button type="submit" className="btn-primary">
                    Guardar configuración de seguridad
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'ubicaciones' && (
              <div className="settings-section">
                <GestionUbicaciones />
              </div>
            )}

            {activeTab === 'usuarios' && (
              <div className="settings-section">
                <GestionUsuariosAdmin />
              </div>
            )}

            {activeTab === 'backup' && (
              <div className="settings-section">
                <h2>Copias de Seguridad Manuales</h2>
                <div className="settings-form">
                  <div className="info-box">
                    <HardDrive size={24} />
                    <div>
                      <h3>Exportación de datos</h3>
                      <p>Descarga copias de seguridad en formato CSV de todas las tablas del sistema</p>
                    </div>
                  </div>

                  <div className="backup-grid">
                    {[
                        { title: 'Todos los Libros', icon: Database, desc: 'Exportar catálogo completo de libros', fn: exportLibrosToCSV, id: 'Libros' },
                        { title: 'Categorías', icon: Package, desc: 'Exportar todas las categorías', fn: exportCategoriasToCSV, id: 'Categorías' },
                        { title: 'Invoices', icon: FileText, desc: 'Exportar facturas con detalles', fn: exportInvoicesToCSV, id: 'Invoices' },
                        { title: 'Pedidos', icon: Truck, desc: 'Exportar pedidos con detalles', fn: exportPedidosToCSV, id: 'Pedidos' },
                        // { title: 'Iberlibro', icon: Globe, desc: 'Exportar libros de Iberlibro', fn: exportIberlibroToCSV, id: 'Iberlibro', className: 'iberlibro' },
                        { title: 'Clientes', icon: Building2, desc: 'Exportar base de clientes', fn: exportClientesToCSV, id: 'Clientes' }
                    ].map((item) => (
                        <div key={item.id} className={`backup-card ${item.className || ''}`}>
                            <div className="backup-card-header">
                                <item.icon size={32} />
                                <h3>{item.title}</h3>
                            </div>
                            <p>{item.desc}</p>
                            <button
                                onClick={() => handleExport(item.fn, item.id)}
                                disabled={exportState.isExporting}
                                className="btn-primary"
                            >
                                <Download size={18} />
                                {exportState.isExporting && exportState.type === item.id ? 'Exportando...' : 'Descargar CSV'}
                            </button>
                            {exportState.isExporting && exportState.type === item.id && (
                                <div style={{ marginTop: '10px', width: '100%' }}>
                                    {exportState.total > 0 ? (
                                        <>
                                            <div style={{ width: '100%', background: '#eee', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${(exportState.progress / exportState.total) * 100}%`,
                                                    height: '100%',
                                                    background: '#22c55e',
                                                    transition: 'width 0.3s ease'
                                                }} />
                                            </div>
                                            <div style={{ fontSize: '10px', marginTop: '2px', textAlign: 'right', color: '#666' }}>
                                                {exportState.progress.toLocaleString()} / {exportState.total.toLocaleString()}
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--primary-color)' }}>
                                            <span>Exportando...</span>
                                            <strong>{exportState.progress.toLocaleString()} registros</strong>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                  </div>

                  <div className="info-box" style={{ marginTop: '2rem' }}>
                    <Bell size={24} />
                    <div>
                      <h3>Nota importante</h3>
                      <p>Los archivos CSV se descargan con codificación UTF-8 y son compatibles con Excel, Google Sheets y otras aplicaciones de hojas de cálculo.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <MessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        title={messageModalConfig.title}
        message={messageModalConfig.message}
        type={messageModalConfig.type}
      />
    </div>
  );
}
