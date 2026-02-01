import React, { useState, useEffect } from 'react';
import { X, Zap, User, Phone, MapPin, Package, Mail } from 'lucide-react';
import { Book } from '../../../types';
import { buscarClientes } from '../../../services/clienteService';

interface ExpressOrderModalProps {
  isOpen: boolean;
  book: Book | null;
  onClose: () => void;
  onSubmit: (data: ExpressOrderData) => void;
}

export interface ExpressOrderData {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  pickupLocation: 'Galeón' | 'Pérez Galdós';
  quantity: number;
  clientId?: string;
  isDeposit?: boolean;
  depositAmount?: number;
}

interface ClientSuggestion {
  id: string;
  nombre: string;
  apellidos?: string;
  telefono: string;
  email?: string;
}

export function ExpressOrderModal({ isOpen, book, onClose, onSubmit }: ExpressOrderModalProps) {
  const [formData, setFormData] = useState<ExpressOrderData>({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    pickupLocation: 'Pérez Galdós',
    quantity: 1,
    isDeposit: false,
    depositAmount: 0
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ExpressOrderData, string>>>({});
  
  const [nameSuggestions, setNameSuggestions] = useState<ClientSuggestion[]>([]);
  const [phoneSuggestions, setPhoneSuggestions] = useState<ClientSuggestion[]>([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();

  // Normalize text for comparison (remove accents, lowercase)
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (formData.clientName.trim().length >= 2) {
        try {
          const { data } = await buscarClientes(formData.clientName, 1, 10); // Fetch more to filter client-side
          const normalizedQuery = normalizeText(formData.clientName);
          const filtered = data.filter(c => {
            const fullName = normalizeText(`${c.nombre} ${c.apellidos || ''}`);
            return fullName.includes(normalizedQuery);
          });
          setNameSuggestions(filtered.slice(0, 5).map(c => ({
            id: c.id,
            nombre: c.nombre,
            apellidos: c.apellidos,
            telefono: c.telefono || '',
            email: c.email || ''
          })));
          setShowNameSuggestions(true);
        } catch (error) {
          console.error('Error searching clients by name:', error);
        }
      } else {
        setNameSuggestions([]);
        setShowNameSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [formData.clientName]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (formData.clientPhone.trim().length >= 3) {
        try {
          const { data } = await buscarClientes(formData.clientPhone, 1, 5);
          setPhoneSuggestions(data.map(c => ({
            id: c.id,
            nombre: c.nombre,
            apellidos: c.apellidos,
            telefono: c.telefono || '',
            email: c.email || ''
          })));
          setShowPhoneSuggestions(true);
        } catch (error) {
          console.error('Error searching clients by phone:', error);
        }
      } else {
        setPhoneSuggestions([]);
        setShowPhoneSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [formData.clientPhone]);

  const handleClientSelect = (client: ClientSuggestion) => {
    setFormData(prev => ({
      ...prev,
      clientName: client.nombre + (client.apellidos ? ' ' + client.apellidos : ''),
      clientPhone: client.telefono,
      clientEmail: client.email || ''
    }));
    setSelectedClientId(client.id);
    setShowNameSuggestions(false);
    setShowPhoneSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Partial<Record<keyof ExpressOrderData, string>> = {};
    
    if (!formData.clientName.trim()) {
      newErrors.clientName = 'El nombre es obligatorio';
    }
    
    if (!formData.clientPhone.trim()) {
      newErrors.clientPhone = 'El teléfono es obligatorio';
    } else if (!/^\d{9,15}$/.test(formData.clientPhone.replace(/\s/g, ''))) {
      newErrors.clientPhone = 'Teléfono inválido (9-15 dígitos)';
    }
    
    if (formData.quantity < 1) {
      newErrors.quantity = 'La cantidad debe ser al menos 1';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      ...formData,
      clientId: selectedClientId
    });
    
    setFormData({
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      pickupLocation: 'Pérez Galdós',
      quantity: 1,
      isDeposit: false,
      depositAmount: 0
    });
    setSelectedClientId(undefined);
    setErrors({});
  };

  const handleClose = () => {
    setFormData({
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      pickupLocation: 'Pérez Galdós',
      quantity: 1,
      isDeposit: false,
      depositAmount: 0 // Reset deposit too ideally
    });
    setSelectedClientId(undefined);
    setErrors({});
    setNameSuggestions([]);
    setPhoneSuggestions([]);
    setShowNameSuggestions(false);
    setShowPhoneSuggestions(false);
    onClose();
  };

  if (!isOpen || !book) return null;

  return (
    <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-[70] backdrop-blur-sm">
      <div className="bg-[var(--bg-surface)] text-[var(--text-main)] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-[var(--border-subtle)]">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)] bg-gradient-to-r from-[var(--bg-page)] to-[var(--bg-surface)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--warning)] rounded-lg">
              <Zap size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Pedido Express</h2>
              <p className="text-sm text-[var(--text-muted)]">Creación rápida</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors rounded-full hover:bg-[var(--bg-hover)]"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-page)]/50">
          <div className="flex items-start gap-3">
            <Package size={20} className="text-blue-500 mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{book.title}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{book.author}</p>
              <p className="text-sm font-bold text-[var(--accent)] mt-1">{book.price.toFixed(2)} €</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="relative">
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)] mb-2">
              <User size={16} />
              Nombre del Cliente
            </label>
            <input
              type="text"
              value={formData.clientName}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, clientName: e.target.value }));
                setSelectedClientId(undefined);
              }}
              onFocus={() => nameSuggestions.length > 0 && setShowNameSuggestions(true)}
              onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
              placeholder="Ej: Juan Pérez"
              className={`w-full px-4 py-2.5 bg-[var(--bg-page)]/50 border ${errors.clientName ? 'border-[var(--danger)]' : 'border-[var(--border-subtle)]'} rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all text-sm text-[var(--text-main)]`}
            />
            {errors.clientName && <p className="text-[var(--danger)] text-xs mt-1">{errors.clientName}</p>}
            
            {showNameSuggestions && nameSuggestions.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                {nameSuggestions.map((client) => (
                  <li
                    key={client.id}
                    onClick={() => handleClientSelect(client)}
                    className="px-4 py-2.5 hover:bg-[var(--bg-hover)] cursor-pointer border-b border-[var(--border-subtle)] last:border-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--text-main)]">
                        {client.nombre} {client.apellidos || ''}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 flex-shrink-0">
                        <Phone size={12} />
                        {client.telefono || 'Sin teléfono'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="relative">
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)] mb-2">
              <Phone size={16} />
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.clientPhone}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, clientPhone: e.target.value }));
                setSelectedClientId(undefined);
              }}
              onFocus={() => phoneSuggestions.length > 0 && setShowPhoneSuggestions(true)}
              onBlur={() => setTimeout(() => setShowPhoneSuggestions(false), 200)}
              placeholder="Ej: 612345678"
              className={`w-full px-4 py-2.5 bg-[var(--bg-page)]/50 border ${errors.clientPhone ? 'border-[var(--danger)]' : 'border-[var(--border-subtle)]'} rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all text-sm text-[var(--text-main)]`}
            />
            {errors.clientPhone && <p className="text-[var(--danger)] text-xs mt-1">{errors.clientPhone}</p>}
            
            {showPhoneSuggestions && phoneSuggestions.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                {phoneSuggestions.map((client) => (
                  <li
                    key={client.id}
                    onClick={() => handleClientSelect(client)}
                    className="px-4 py-2.5 hover:bg-[var(--bg-hover)] cursor-pointer border-b border-[var(--border-subtle)] last:border-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--text-main)]">
                        {client.nombre} {client.apellidos || ''}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 flex-shrink-0">
                        <Phone size={12} />
                        {client.telefono || 'Sin teléfono'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)] mb-2">
               <Mail size={16} />
               Email (Opcional)
            </label>
            <input
              type="email"
              value={formData.clientEmail || ''}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, clientEmail: e.target.value }));
              }}
              placeholder="cliente@email.com"
              className="w-full px-4 py-2.5 bg-[var(--bg-page)]/50 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all text-sm text-[var(--text-main)]"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)] mb-2">
              <MapPin size={16} />
              Punto de Recogida
            </label>
            <select
              value={formData.pickupLocation}
              onChange={(e) => setFormData(prev => ({ ...prev, pickupLocation: e.target.value as 'Galeón' | 'Pérez Galdós' }))}
              className="w-full px-4 py-2.5 bg-[var(--bg-page)]/50 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all text-sm text-[var(--text-main)]"
            >
              <option value="Pérez Galdós">Pérez Galdós</option>
              <option value="Galeón">Galeón</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)] mb-2">
              <Package size={16} />
              Cantidad
            </label>
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              className={`w-full px-4 py-2.5 bg-[var(--bg-page)]/50 border ${errors.quantity ? 'border-[var(--danger)]' : 'border-[var(--border-subtle)]'} rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all text-sm text-[var(--text-main)]`}
            />
            {errors.quantity && <p className="text-[var(--danger)] text-xs mt-1">{errors.quantity}</p>}
          </div>

          {/* Deposit Section */}
          <div className="flex items-center gap-4 pt-2 border-t border-[var(--border-subtle)]">
             <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDeposit"
                  checked={formData.isDeposit}
                  onChange={(e) => setFormData(prev => ({ ...prev, isDeposit: e.target.checked }))}
                  className="w-4 h-4 text-[var(--warning)] rounded focus:ring-[var(--warning)] border-[var(--border-subtle)] cursor-pointer"
                />
                <label htmlFor="isDeposit" className="text-sm font-semibold text-[var(--text-main)] cursor-pointer user-select-none">
                   Deja Señal
                </label>
             </div>
             
             {formData.isDeposit && (
                <div className="flex-1">
                   <input 
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="Importe"
                      value={formData.depositAmount || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, depositAmount: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 bg-[var(--bg-page)]/50 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--warning)] focus:border-transparent outline-none transition-all text-sm text-[var(--text-main)]"
                   />
                </div>
             )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-[var(--text-main)] bg-[var(--bg-hover)] rounded-lg hover:bg-[var(--border-subtle)] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[var(--warning)] to-[var(--danger)] text-white text-sm font-bold rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Zap size={18} />
              Crear Pedido
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
