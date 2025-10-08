import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2, Mail, Phone, Globe, FileText, DollarSign,
  Truck, Bell, Database, Shield, Settings as SettingsIcon,
  Package, CreditCard, Download, HardDrive
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'company' | 'billing' | 'shipping' | 'system' | 'security' | 'backup'>('company');
  const [isExporting, setIsExporting] = useState(false);

  const [companyData, setCompanyData] = useState({
    name: 'Librería Online',
    nif: 'B12345678',
    address: 'Calle Principal 123',
    city: 'Madrid',
    postalCode: '28001',
    country: 'España',
    phone: '+34 912 345 678',
    email: 'info@libreria.com',
    website: 'www.libreria.com'
  });

  const [billingSettings, setBillingSettings] = useState({
    currency: 'EUR',
    taxRate: 21,
    invoicePrefix: 'FAC',
    invoiceStartNumber: 1000,
    paymentMethods: ['Tarjeta', 'PayPal', 'Transferencia'],
    paymentTerms: 30
  });

  const [shippingSettings, setShippingSettings] = useState({
    carriers: ['ASM', 'GLS', 'Envialia'],
    defaultCarrier: 'ASM',
    freeShippingThreshold: 50,
    standardShippingCost: 5.99,
    expressShippingCost: 9.99,
    estimatedDeliveryDays: 3
  });

  const [systemSettings, setSystemSettings] = useState({
    maintenanceMode: false,
    allowRegistrations: true,
    requireEmailVerification: true,
    sessionTimeout: 60,
    maxLoginAttempts: 5,
    backupFrequency: 'daily'
  });

  const handleCompanyUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Actualizar datos de empresa:', companyData);
  };

  const handleBillingUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Actualizar configuración de facturación:', billingSettings);
  };

  const handleShippingUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Actualizar configuración de envíos:', shippingSettings);
  };

  const handleSystemUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Actualizar configuración del sistema:', systemSettings);
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
    { id: 'backup', label: 'Copias de Seguridad', icon: HardDrive }
  ];

  return (
    <div className="admin-settings">
      <div className="settings-container">
        <div className="settings-header">
          <h1>Configuración del Sistema</h1>
          <p>Administración general de la librería</p>
        </div>

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
                      <label htmlFor="nif">
                        <FileText size={16} />
                        NIF/CIF
                      </label>
                      <input
                        id="nif"
                        type="text"
                        value={companyData.nif}
                        onChange={(e) => setCompanyData({ ...companyData, nif: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="address">
                      <Building2 size={16} />
                      Dirección
                    </label>
                    <input
                      id="address"
                      type="text"
                      value={companyData.address}
                      onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="city">Ciudad</label>
                      <input
                        id="city"
                        type="text"
                        value={companyData.city}
                        onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="postalCode">Código Postal</label>
                      <input
                        id="postalCode"
                        type="text"
                        value={companyData.postalCode}
                        onChange={(e) => setCompanyData({ ...companyData, postalCode: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="country">País</label>
                      <input
                        id="country"
                        type="text"
                        value={companyData.country}
                        onChange={(e) => setCompanyData({ ...companyData, country: e.target.value })}
                      />
                    </div>
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
                        value={billingSettings.currency}
                        onChange={(e) => setBillingSettings({ ...billingSettings, currency: e.target.value })}
                      >
                        <option value="EUR">Euro (EUR)</option>
                        <option value="USD">Dólar (USD)</option>
                        <option value="GBP">Libra (GBP)</option>
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
                        value={billingSettings.taxRate}
                        onChange={(e) => setBillingSettings({ ...billingSettings, taxRate: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="invoicePrefix">Prefijo de factura</label>
                      <input
                        id="invoicePrefix"
                        type="text"
                        value={billingSettings.invoicePrefix}
                        onChange={(e) => setBillingSettings({ ...billingSettings, invoicePrefix: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="invoiceStartNumber">Número inicial</label>
                      <input
                        id="invoiceStartNumber"
                        type="number"
                        value={billingSettings.invoiceStartNumber}
                        onChange={(e) => setBillingSettings({ ...billingSettings, invoiceStartNumber: Number(e.target.value) })}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="paymentTerms">Plazo de pago (días)</label>
                      <input
                        id="paymentTerms"
                        type="number"
                        value={billingSettings.paymentTerms}
                        onChange={(e) => setBillingSettings({ ...billingSettings, paymentTerms: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>
                      <CreditCard size={16} />
                      Métodos de pago activos
                    </label>
                    <div className="checkbox-grid">
                      {['Tarjeta', 'PayPal', 'Transferencia', 'Reembolso'].map(method => (
                        <label key={method} className="checkbox-label-inline">
                          <input
                            type="checkbox"
                            checked={billingSettings.paymentMethods.includes(method)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBillingSettings({
                                  ...billingSettings,
                                  paymentMethods: [...billingSettings.paymentMethods, method]
                                });
                              } else {
                                setBillingSettings({
                                  ...billingSettings,
                                  paymentMethods: billingSettings.paymentMethods.filter(m => m !== method)
                                });
                              }
                            }}
                          />
                          <span>{method}</span>
                        </label>
                      ))}
                    </div>
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
                  <div className="form-group">
                    <label htmlFor="defaultCarrier">
                      <Truck size={16} />
                      Transportista predeterminado
                    </label>
                    <select
                      id="defaultCarrier"
                      value={shippingSettings.defaultCarrier}
                      onChange={(e) => setShippingSettings({ ...shippingSettings, defaultCarrier: e.target.value })}
                    >
                      {shippingSettings.carriers.map(carrier => (
                        <option key={carrier} value={carrier}>{carrier}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="standardShipping">
                        <Package size={16} />
                        Envío estándar (€)
                      </label>
                      <input
                        id="standardShipping"
                        type="number"
                        step="0.01"
                        value={shippingSettings.standardShippingCost}
                        onChange={(e) => setShippingSettings({ ...shippingSettings, standardShippingCost: Number(e.target.value) })}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="expressShipping">Envío express (€)</label>
                      <input
                        id="expressShipping"
                        type="number"
                        step="0.01"
                        value={shippingSettings.expressShippingCost}
                        onChange={(e) => setShippingSettings({ ...shippingSettings, expressShippingCost: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="freeShipping">Envío gratis desde (€)</label>
                      <input
                        id="freeShipping"
                        type="number"
                        step="0.01"
                        value={shippingSettings.freeShippingThreshold}
                        onChange={(e) => setShippingSettings({ ...shippingSettings, freeShippingThreshold: Number(e.target.value) })}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="deliveryDays">Días estimados de entrega</label>
                      <input
                        id="deliveryDays"
                        type="number"
                        value={shippingSettings.estimatedDeliveryDays}
                        onChange={(e) => setShippingSettings({ ...shippingSettings, estimatedDeliveryDays: Number(e.target.value) })}
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
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={systemSettings.maintenanceMode}
                        onChange={(e) => setSystemSettings({ ...systemSettings, maintenanceMode: e.target.checked })}
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
                        checked={systemSettings.allowRegistrations}
                        onChange={(e) => setSystemSettings({ ...systemSettings, allowRegistrations: e.target.checked })}
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
                        checked={systemSettings.requireEmailVerification}
                        onChange={(e) => setSystemSettings({ ...systemSettings, requireEmailVerification: e.target.checked })}
                      />
                      <div>
                        <strong>Verificación de email</strong>
                        <p>Requerir verificación de email para nuevos usuarios</p>
                      </div>
                    </label>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="sessionTimeout">Tiempo de sesión (min)</label>
                      <input
                        id="sessionTimeout"
                        type="number"
                        value={systemSettings.sessionTimeout}
                        onChange={(e) => setSystemSettings({ ...systemSettings, sessionTimeout: Number(e.target.value) })}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="maxLoginAttempts">Intentos de login máximos</label>
                      <input
                        id="maxLoginAttempts"
                        type="number"
                        value={systemSettings.maxLoginAttempts}
                        onChange={(e) => setSystemSettings({ ...systemSettings, maxLoginAttempts: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="backupFrequency">
                      <Database size={16} />
                      Frecuencia de respaldo
                    </label>
                    <select
                      id="backupFrequency"
                      value={systemSettings.backupFrequency}
                      onChange={(e) => setSystemSettings({ ...systemSettings, backupFrequency: e.target.value })}
                    >
                      <option value="hourly">Cada hora</option>
                      <option value="daily">Diario</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensual</option>
                    </select>
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
                <div className="settings-form">
                  <div className="info-box">
                    <Shield size={24} />
                    <div>
                      <h3>Seguridad de la cuenta</h3>
                      <p>Las políticas de seguridad (RLS) están activas en la base de datos</p>
                    </div>
                  </div>

                  <div className="info-box">
                    <Database size={24} />
                    <div>
                      <h3>Backup de datos</h3>
                      <p>Los respaldos se realizan automáticamente según la configuración del sistema</p>
                    </div>
                  </div>

                  <div className="info-box">
                    <Bell size={24} />
                    <div>
                      <h3>Logs de actividad</h3>
                      <p>Todas las acciones administrativas quedan registradas</p>
                    </div>
                  </div>

                  <button className="btn-secondary">
                    Ver logs de seguridad
                  </button>
                </div>
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
