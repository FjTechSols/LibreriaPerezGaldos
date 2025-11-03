import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import {
  Building2, Mail, Phone, Globe, FileText, DollarSign,
  Truck, Bell, Database, Shield, Settings as SettingsIcon,
  Package, CreditCard, Download, HardDrive, Check, MapPin
} from 'lucide-react';
import { GestionUbicaciones } from '../components/GestionUbicaciones';
import {
  exportLibrosToCSV,
  exportCategoriasToCSV,
  exportFacturasToCSV,
  exportPedidosToCSV,
  exportIberlibroToCSV,
  exportUniliberToCSV,
  exportClientesToCSV
} from '../services/backupService';
import '../styles/pages/AdminSettings.css';

export function AdminSettings() {
  const { user } = useAuth();
  const {
    settings,
    loading,
    updateCompanySettings,
    updateBillingSettings,
    updateShippingSettings,
    updateSystemSettings,
    updateSecuritySettings
  } = useSettings();

  const [activeTab, setActiveTab] = useState<'company' | 'billing' | 'shipping' | 'system' | 'security' | 'backup' | 'ubicaciones'>('company');
  const [isExporting, setIsExporting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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
    freeShippingThreshold: 50,
    standardShippingCost: 5.99,
    expressShippingCost: 12.99,
    shippingZones: [] as string[],
    estimatedDeliveryDays: {
      standard: 5,
      express: 2
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
      setShippingData(settings.shipping);
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
    const success = await updateShippingSettings(shippingData);
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

  const handleExport = async (exportFunction: () => Promise<void>, name: string) => {
    setIsExporting(true);
    try {
      await exportFunction();
      console.log(`${name} exportado correctamente`);
    } catch (error) {
      console.error(`Error exportando ${name}:`, error);
    } finally {
      setIsExporting(false);
    }
  };

  const tabs = [
    { id: 'company', label: 'Empresa', icon: Building2 },
    { id: 'billing', label: 'Facturación', icon: FileText },
    { id: 'shipping', label: 'Envíos', icon: Truck },
    { id: 'system', label: 'Sistema', icon: SettingsIcon },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'ubicaciones', label: 'Ubicaciones', icon: MapPin },
    { id: 'backup', label: 'Copias de Seguridad', icon: HardDrive }
  ];

  return (
    <div className="admin-settings">
      <div className="settings-container">
        <div className="settings-header">
          <h1>Configuración del Sistema</h1>
          <p>Administración general de la librería</p>
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
                        value={shippingData.standardShippingCost}
                        onChange={(e) => setShippingData({ ...shippingData, standardShippingCost: Number(e.target.value) })}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="expressShipping">
                        <Truck size={16} />
                        Envío express
                      </label>
                      <input
                        id="expressShipping"
                        type="number"
                        step="0.01"
                        value={shippingData.expressShippingCost}
                        onChange={(e) => setShippingData({ ...shippingData, expressShippingCost: Number(e.target.value) })}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="freeShipping">Envío gratis desde</label>
                      <input
                        id="freeShipping"
                        type="number"
                        step="0.01"
                        value={shippingData.freeShippingThreshold}
                        onChange={(e) => setShippingData({ ...shippingData, freeShippingThreshold: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="standardDelivery">Días entrega estándar</label>
                      <input
                        id="standardDelivery"
                        type="number"
                        value={shippingData.estimatedDeliveryDays.standard}
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
                      <label htmlFor="expressDelivery">Días entrega express</label>
                      <input
                        id="expressDelivery"
                        type="number"
                        value={shippingData.estimatedDeliveryDays.express}
                        onChange={(e) => setShippingData({
                          ...shippingData,
                          estimatedDeliveryDays: {
                            ...shippingData.estimatedDeliveryDays,
                            express: Number(e.target.value)
                          }
                        })}
                      />
                    </div>
                  </div>

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
                    <div className="backup-card">
                      <div className="backup-card-header">
                        <Database size={32} />
                        <h3>Todos los Libros</h3>
                      </div>
                      <p>Exportar catálogo completo de libros (internos y externos)</p>
                      <button
                        onClick={() => handleExport(exportLibrosToCSV, 'Libros')}
                        disabled={isExporting}
                        className="btn-primary"
                      >
                        <Download size={18} />
                        {isExporting ? 'Exportando...' : 'Descargar CSV'}
                      </button>
                    </div>

                    <div className="backup-card">
                      <div className="backup-card-header">
                        <Package size={32} />
                        <h3>Categorías</h3>
                      </div>
                      <p>Exportar todas las categorías de libros</p>
                      <button
                        onClick={() => handleExport(exportCategoriasToCSV, 'Categorías')}
                        disabled={isExporting}
                        className="btn-primary"
                      >
                        <Download size={18} />
                        {isExporting ? 'Exportando...' : 'Descargar CSV'}
                      </button>
                    </div>

                    <div className="backup-card">
                      <div className="backup-card-header">
                        <FileText size={32} />
                        <h3>Facturas</h3>
                      </div>
                      <p>Exportar todas las facturas con líneas de detalle</p>
                      <button
                        onClick={() => handleExport(exportFacturasToCSV, 'Facturas')}
                        disabled={isExporting}
                        className="btn-primary"
                      >
                        <Download size={18} />
                        {isExporting ? 'Exportando...' : 'Descargar CSV'}
                      </button>
                    </div>

                    <div className="backup-card">
                      <div className="backup-card-header">
                        <Truck size={32} />
                        <h3>Pedidos</h3>
                      </div>
                      <p>Exportar todos los pedidos con líneas de detalle</p>
                      <button
                        onClick={() => handleExport(exportPedidosToCSV, 'Pedidos')}
                        disabled={isExporting}
                        className="btn-primary"
                      >
                        <Download size={18} />
                        {isExporting ? 'Exportando...' : 'Descargar CSV'}
                      </button>
                    </div>

                    <div className="backup-card iberlibro">
                      <div className="backup-card-header">
                        <Globe size={32} />
                        <h3>Iberlibro</h3>
                      </div>
                      <p>Exportar solo libros de Iberlibro</p>
                      <button
                        onClick={() => handleExport(exportIberlibroToCSV, 'Iberlibro')}
                        disabled={isExporting}
                        className="btn-primary"
                      >
                        <Download size={18} />
                        {isExporting ? 'Exportando...' : 'Descargar CSV'}
                      </button>
                    </div>

                    <div className="backup-card uniliber">
                      <div className="backup-card-header">
                        <Globe size={32} />
                        <h3>Uniliber</h3>
                      </div>
                      <p>Exportar solo libros de Uniliber</p>
                      <button
                        onClick={() => handleExport(exportUniliberToCSV, 'Uniliber')}
                        disabled={isExporting}
                        className="btn-primary"
                      >
                        <Download size={18} />
                        {isExporting ? 'Exportando...' : 'Descargar CSV'}
                      </button>
                    </div>

                    <div className="backup-card">
                      <div className="backup-card-header">
                        <Building2 size={32} />
                        <h3>Clientes</h3>
                      </div>
                      <p>Exportar base de datos de clientes</p>
                      <button
                        onClick={() => handleExport(exportClientesToCSV, 'Clientes')}
                        disabled={isExporting}
                        className="btn-primary"
                      >
                        <Download size={18} />
                        {isExporting ? 'Exportando...' : 'Descargar CSV'}
                      </button>
                    </div>
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
    </div>
  );
}
