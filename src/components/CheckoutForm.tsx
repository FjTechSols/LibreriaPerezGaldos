import React, { useState, useEffect } from 'react';
import { MapPin, FileText, User, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import '../styles/components/CheckoutForm.css';

export interface CheckoutData {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  codigo_postal: string;
  provincia: string;
  pais: string;
  observaciones: string;
}

interface CheckoutFormProps {
  subtotal: number;
  iva: number;
  total: number;
  onSubmit: (data: CheckoutData, shippingMethod: 'standard' | 'express', shippingCost: number) => void;
  onCancel: () => void;
  isProcessing: boolean;
  initialShippingMethod?: 'standard' | 'express';
}

export default function CheckoutForm({
  subtotal,
  iva,

  onSubmit,
  onCancel,
  isProcessing,
  initialShippingMethod = 'standard'
}: CheckoutFormProps) {
  const { user, refreshUser } = useAuth();
  const { formatPrice, settings } = useSettings();
  const { t } = useLanguage();
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express'>(initialShippingMethod || 'standard');

  const [formData, setFormData] = useState<CheckoutData>({
    nombre: '',
    apellidos: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    codigo_postal: '',
    provincia: '',
    pais: 'España',
    observaciones: ''
  });



  // Country Constants
  const SUPPORTED_COUNTRIES = {
    europe: ['Alemania', 'Austria', 'Bélgica', 'Dinamarca', 'Francia', 'Grecia', 'Holanda', 'Hungría', 'Irlanda', 'Italia', 'Noruega', 'Polonia', 'Portugal', 'Reino Unido', 'República Checa', 'Rumania', 'Suecia', 'Suiza'],
    america: ['Argentina', 'Bolivia', 'Brasil', 'Canadá', 'Chile', 'Colombia', 'Costa Rica', 'Ecuador', 'Estados Unidos', 'México', 'Panamá', 'Paraguay', 'Perú', 'Uruguay', 'Venezuela'],
    asia: ['China', 'Corea del Sur', 'Filipinas', 'Hong Kong', 'India', 'Indonesia', 'Japón', 'Malasia', 'Singapur', 'Tailandia', 'Taiwán', 'Vietnam']
  };

  // Helper to determine shipping zone
  const getShippingZone = (country: string): 'national' | 'europe' | 'america' | 'asia' | 'other' => {
    const lowerCountry = country.toLowerCase().trim();
    
    if (['españa', 'spain', 'es'].includes(lowerCountry)) return 'national';

    // Check vs lists
    if (SUPPORTED_COUNTRIES.europe.some(c => c.toLowerCase() === lowerCountry)) return 'europe';
    if (SUPPORTED_COUNTRIES.america.some(c => c.toLowerCase() === lowerCountry)) return 'america';
    if (SUPPORTED_COUNTRIES.asia.some(c => c.toLowerCase() === lowerCountry)) return 'asia';
    
    // Fallback for typed inputs (legacy support or if we allow custom)
    // using the broader lists from previous step if we want to be robust, 
    // but for the select dropdown, exact match is expected. 
    // Let's keep the robust check just in case.
    const europeBroad = ['francia', 'france', 'portugal', 'italia', 'italy', 'alemania', 'germany', 'reino unido', 'uk', 'united kingdom', 'bélgica', 'belgium', 'holanda', 'netherlands', 'países bajos', 'austria', 'dinamarca', 'denmark', 'suecia', 'sweden', 'noruega', 'norway', 'suiza', 'switzerland', 'irlanda', 'ireland', 'grecia', 'greece', 'polonia', 'poland', 'república checa', 'czech republic', 'hungría', 'hungary', 'rumania', 'romania'];
    if (europeBroad.includes(lowerCountry)) return 'europe';

    return 'other'; 
  };

  const currentZone = getShippingZone(formData.pais);

  // Calculate Shipping Cost based on rules
  const getShippingCost = () => {
    // En lógica "IVA Incluido", el umbral de envío gratis se basa en el precio total de productos (IVA incluido)
    // subtotal es Base Imponible, iva es la cuota. Sumados dan el bruto.
    const productsTotalWithTax = subtotal + iva;

    if (currentZone === 'national') {
       if (shippingMethod === 'standard') {
            return productsTotalWithTax >= settings.shipping.freeShippingThresholdStandard 
              ? 0 
              : settings.shipping.standardShippingCost;
        } else {
            return productsTotalWithTax >= settings.shipping.freeShippingThresholdExpress 
              ? 0 
              : settings.shipping.expressShippingCost;
        }
    } else {
        // International logic
        if (!settings.shipping.internationalRates) return 15.00; // Fallback
        
        // Use type assertion or access with default because interface might not be perfectly inferred everywhere yet
        // In settingsService we defined internationalRates with europe, america, asia, other
        const rates = settings.shipping.internationalRates;
        const regionRate = rates[currentZone as keyof typeof rates] || rates.other;

        return productsTotalWithTax >= regionRate.freeThreshold ? 0 : regionRate.cost;
    }
  };

  const shippingCost = getShippingCost();
  
  // Calculate Final Total
  // subtotal (products) + iva (products) + shippingCost
  // Note: Assuming shipping cost includes its own tax or is tax-free for simplicity for now, 
  // or that 'iva' passed prop is only for products.
  const finalTotal = subtotal + iva + shippingCost;



  // Helper to split full name with basic heuristics
  const splitFullName = (fullName: string) => {
    // Remove extra spaces
    const parts = fullName.trim().split(/\s+/);
    
    if (parts.length === 0) return { nombre: '', apellidos: '' };
    if (parts.length === 1) return { nombre: parts[0], apellidos: '' };
    
    // Heuristic: If 4 or more parts, assume compound name (e.g., "Francisco Javier Gonzalez Sanchez")
    // taking first 2 words as Name.
    if (parts.length >= 4) {
      const nombre = parts.slice(0, 2).join(' ');
      const apellidos = parts.slice(2).join(' ');
      return { nombre, apellidos };
    }
    
    // Default: First word is Name, rest are Surnames
    const nombre = parts[0];
    const apellidos = parts.slice(1).join(' ');
    return { nombre, apellidos };
  };

  // Pre-fill form with user data
  useEffect(() => {
    if (user) {
      const { nombre, apellidos } = splitFullName(user.fullName || user.name || '');
      
      setFormData(prev => ({
        ...prev,
        nombre: nombre,
        apellidos: apellidos,
        email: user.email || '',
        telefono: user.phone || '',
        direccion: user.address || '',
        ciudad: user.city || '',
        codigo_postal: user.postalCode || ''
      }));
    }
  }, [user]);

  // Update shipping method based on country
  useEffect(() => {
    const zone = getShippingZone(formData.pais);

    if (zone !== 'national') {
        setShippingMethod('express'); // Use 'express' as the key for international for simplicity in backend/email templates for now, or add 'international' type later
    } else {
        // If switching back to Spain, default to standard potentially? Or keep selection if valid.
        // If current method was set to 'express' (which we use for intl), and user goes back to Spain, maybe default to standard to avoid high confusion?
        // Let's safe default to standard when entering Spain
        setShippingMethod('standard');
    }
  }, [formData.pais]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaveAsDefault(e.target.checked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save as default if checked
    if (saveAsDefault && user) {
      try {
        const fullName = `${formData.nombre} ${formData.apellidos}`.trim();
        
        const { error } = await supabase
          .from('usuarios')
          .update({
            nombre: fullName, // Save combined name to 'nombre' field
            telefono: formData.telefono,
            direccion: formData.direccion,
            ciudad: formData.ciudad,
            codigo_postal: formData.codigo_postal
          })
          .eq('auth_user_id', user.id);

        if (!error) {
          await refreshUser(); // Update context
        }
      } catch (err) {
        console.error('Error saving default address:', err);
      }
    }

    onSubmit(formData, shippingMethod, shippingCost);
  };

  return (
    <div className="checkout-form-container">
      <form onSubmit={handleSubmit} className="checkout-form">
        <div className="checkout-section">
          <div className="section-header">
            <User size={20} />
            <h3>{t('personalInformation')}</h3>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="nombre">{t('firstName')} *</label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                className="form-input"
                placeholder={t('firstNamePlaceholder')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="apellidos">{t('lastName')} *</label>
              <input
                type="text"
                id="apellidos"
                name="apellidos"
                value={formData.apellidos}
                onChange={handleChange}
                required
                className="form-input"
                placeholder={t('lastNamePlaceholder')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">{t('email')} *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="form-input"
                placeholder={t('yourEmail')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="telefono">{t('phone')} *</label>
              <input
                type="tel"
                id="telefono"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                required
                className="form-input"
                placeholder={t('phonePlaceholder')}
              />
            </div>
          </div>
        </div>

        <div className="checkout-section">
          <div className="section-header">
            <MapPin size={20} />
            <h3>{t('shippingAndAddress')}</h3>
          </div>



          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="direccion">{t('streetAddress')} *</label>
              <input
                type="text"
                id="direccion"
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
                required
                className="form-input"
                placeholder={t('streetAddressPlaceholder')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="ciudad">{t('city')} *</label>
              <input
                type="text"
                id="ciudad"
                name="ciudad"
                value={formData.ciudad}
                onChange={handleChange}
                required
                className="form-input"
                placeholder={t('cityPlaceholder')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="codigo_postal">{t('postalCodeLabel')} *</label>
              <input
                type="text"
                id="codigo_postal"
                name="codigo_postal"
                value={formData.codigo_postal}
                onChange={handleChange}
                required
                className="form-input"
                placeholder={t('postalCodePlaceholder')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="provincia">{t('province')} *</label>
              <input
                type="text"
                id="provincia"
                name="provincia"
                value={formData.provincia}
                onChange={handleChange}
                required
                className="form-input"
                placeholder={t('provincePlaceholder')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="pais">{t('country')} *</label>
              <select
                id="pais"
                name="pais"
                value={formData.pais}
                onChange={handleChange}
                required
                className="form-input"
                style={{ appearance: 'none', backgroundImage: 'none' }} // Ensure consistent styling if needed
              >
                <option value="España">España</option>
                
                <optgroup label="Europa">
                    {SUPPORTED_COUNTRIES.europe.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
                
                <optgroup label="América">
                    {SUPPORTED_COUNTRIES.america.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
                
                <optgroup label="Asia">
                    {SUPPORTED_COUNTRIES.asia.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
              </select>
            </div>
          </div>
          
          {user && (
            <div className="save-defaults-container" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                type="checkbox" 
                id="saveAsDefault" 
                checked={saveAsDefault} 
                onChange={handleCheckboxChange} 
                className="form-checkbox"
                style={{ width: 'auto', margin: 0 }}
              />
              <label htmlFor="saveAsDefault" style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Save size={16} />
                {t('saveAsDefaultAddress')}
              </label>
            </div>
          )}
        </div>

        {/* Shipping Methods Section - Moved here */}
        <div className="checkout-section">
          <div className="section-header">
            <MapPin size={20} />
            <h3>{t('shippingMethodLabel')}</h3>
          </div>

          <div className="shipping-methods-container" style={{ marginBottom: '1.5rem' }}>
            {['españa', 'spain', 'es'].includes(formData.pais.toLowerCase()) ? (
              // National Options
              <>
                 <div 
                  className={`shipping-option ${shippingMethod === 'standard' ? 'selected' : ''}`}
                  onClick={() => setShippingMethod('standard')}
                >
                  <div className="shipping-option-details">
                    <div className="shipping-option-title">{t('standardShipping')} (Nacional)</div>
                    <div className="shipping-option-subtitle">
                      {settings.shipping.estimatedDeliveryDays.standard} {t('workingDays')}
                    </div>
                  </div>
                  <div className={`shipping-option-price ${(subtotal + iva) >= settings.shipping.freeShippingThresholdStandard ? 'free' : ''}`}>
                    {(subtotal + iva) >= settings.shipping.freeShippingThresholdStandard 
                      ? t('freeLabel') 
                      : formatPrice(settings.shipping.standardShippingCost)}
                  </div>
                </div>

                <div 
                  className={`shipping-option ${shippingMethod === 'express' ? 'selected' : ''}`}
                  onClick={() => setShippingMethod('express')}
                >
                  <div className="shipping-option-details">
                    <div className="shipping-option-title">{t('expressShipping')} (Nacional)</div>
                    <div className="shipping-option-subtitle">
                      {settings.shipping.estimatedDeliveryDays.express} {t('workingDays')}
                    </div>
                  </div>
                  <div className={`shipping-option-price ${(subtotal + iva) >= settings.shipping.freeShippingThresholdExpress ? 'free' : ''}`}>
                    {(subtotal + iva) >= settings.shipping.freeShippingThresholdExpress 
                      ? t('freeLabel') 
                      : formatPrice(settings.shipping.expressShippingCost)}
                  </div>
                </div>
              </>
            ) : (
              // International Options
              (() => {
                  const rates = settings.shipping.internationalRates;
                  const zone = getShippingZone(formData.pais);
                  // Default to 'other' if settings not loaded or zone weird
                  const rate = rates ? (rates[zone as keyof typeof rates] || rates.other) : { cost: 15, days: 10, freeThreshold: 100 };
                  
                  const zoneNameMap: Record<string, string> = {
                      'europe': 'Europa',
                      'america': 'América',
                      'asia': 'Asia',
                      'other': 'Resto del mundo'
                  };

                  return (
                    <div 
                        className={`shipping-option ${shippingMethod === 'express' ? 'selected' : ''}`}
                        onClick={() => setShippingMethod('express')}
                        >
                        <div className="shipping-option-details">
                            <div className="shipping-option-title">Envío Internacional ({zoneNameMap[zone] || 'General'})</div>
                            <div className="shipping-option-subtitle">
                            {rate.days} {t('workingDays')}
                            </div>
                        </div>
                        <div className={`shipping-option-price ${(subtotal + iva) >= rate.freeThreshold ? 'free' : ''}`}>
                            {(subtotal + iva) >= rate.freeThreshold 
                            ? t('freeLabel') 
                            : formatPrice(rate.cost)}
                        </div>
                    </div>
                  );
              })()
            )}
          </div>
        </div>

        <div className="checkout-section">
          <div className="section-header">
            <FileText size={20} />
            <h3>{t('notesOptional')}</h3>
          </div>

          <div className="form-group full-width">
            <textarea
              id="observaciones"
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              className="form-textarea"
              rows={3}
              placeholder={t('notesPlaceholder')}
            />
          </div>
        </div>

        <div className="checkout-summary">
          <h3>{t('orderSummary')}</h3>
          <div className="summary-line">
            <span>{t('subtotalLabel')}:</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="summary-line">
            <span>{t('shipping')} ({shippingMethod === 'standard' ? t('standardOption') : t('expressOption')}):</span>
            <span>{shippingCost === 0 ? t('freeLabel') : formatPrice(shippingCost)}</span>
          </div>
          <div className="summary-line">
            <span>IVA ({settings.billing.taxRate}%):</span>
            <span>{formatPrice(iva)}</span>
          </div>
          <div className="summary-line total">
            <span>{t('checkoutTotal')}:</span>
            <span>{formatPrice(finalTotal)}</span>
          </div>
        </div>

        <div className="checkout-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn-cancel"
            disabled={isProcessing}
          >
            {t('backToCart')}
          </button>
          <button
            type="submit"
            className="btn-confirm"
            disabled={isProcessing}
          >
            {isProcessing ? t('processingOrder') : t('confirmOrder')}
          </button>
        </div>
      </form>
    </div>
  );
}
