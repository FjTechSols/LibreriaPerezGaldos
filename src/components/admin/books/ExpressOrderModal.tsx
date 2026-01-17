import React, { useState, useEffect } from 'react';
import { X, Zap, User, Phone, MapPin, Package, Mail } from 'lucide-react';
import { Book } from '../../../types';
import { useTheme } from '../../../context/ThemeContext';
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
  const { actualTheme } = useTheme();
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] backdrop-blur-sm">
      <div className={`${actualTheme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border ${actualTheme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
        <div className={`flex items-center justify-between p-6 border-b ${actualTheme === 'dark' ? 'border-gray-800 bg-gradient-to-r from-yellow-900/20 to-orange-900/20' : 'border-gray-100 bg-gradient-to-r from-yellow-50 to-orange-50'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500 rounded-lg">
              <Zap size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Pedido Express</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Creación rápida</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={24} />
          </button>
        </div>

        <div className={`p-4 border-b ${actualTheme === 'dark' ? 'border-gray-800 bg-gray-800/30' : 'border-gray-100 bg-gray-50'}`}>
          <div className="flex items-start gap-3">
            <Package size={20} className="text-blue-500 mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{book.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{book.author}</p>
              <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">{book.price.toFixed(2)} €</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="relative">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
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
              className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border ${errors.clientName ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm`}
            />
            {errors.clientName && <p className="text-red-500 text-xs mt-1">{errors.clientName}</p>}
            
            {showNameSuggestions && nameSuggestions.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                {nameSuggestions.map((client) => (
                  <li
                    key={client.id}
                    onClick={() => handleClientSelect(client)}
                    className="px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {client.nombre} {client.apellidos || ''}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 flex-shrink-0">
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
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
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
              className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border ${errors.clientPhone ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm`}
            />
            {errors.clientPhone && <p className="text-red-500 text-xs mt-1">{errors.clientPhone}</p>}
            
            {showPhoneSuggestions && phoneSuggestions.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                {phoneSuggestions.map((client) => (
                  <li
                    key={client.id}
                    onClick={() => handleClientSelect(client)}
                    className="px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {client.nombre} {client.apellidos || ''}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 flex-shrink-0">
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
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
               <Mail size={16} />
               Email (Opcional)
            </label>
            <input
              type="email"
              value={formData.clientEmail || ''}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, clientEmail: e.target.value }));
                // Don't reset selectedClientId just for email change
              }}
              placeholder="cliente@email.com"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <MapPin size={16} />
              Punto de Recogida
            </label>
            <select
              value={formData.pickupLocation}
              onChange={(e) => setFormData(prev => ({ ...prev, pickupLocation: e.target.value as 'Galeón' | 'Pérez Galdós' }))}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
            >
              <option value="Pérez Galdós">Pérez Galdós</option>
              <option value="Galeón">Galeón</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <Package size={16} />
              Cantidad
            </label>
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border ${errors.quantity ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm`}
            />
            {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
          </div>

          {/* Deposit Section */}
          <div className="flex items-center gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
             <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDeposit"
                  checked={formData.isDeposit}
                  onChange={(e) => setFormData(prev => ({ ...prev, isDeposit: e.target.checked }))}
                  className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500 border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <label htmlFor="isDeposit" className="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer user-select-none">
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
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                   />
                </div>
             )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-bold rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg"
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
