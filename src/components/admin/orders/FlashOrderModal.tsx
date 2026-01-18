import React, { useState, useEffect } from 'react';
import { X, Zap, User, Phone, MapPin, Package, Mail, Trash2 } from 'lucide-react';
import { useOrder } from '../../../context/OrderContext';
import { useTheme } from '../../../context/ThemeContext';
import { buscarClientes } from '../../../services/clienteService';
import { crearPedidoFlash } from '../../../services/pedidoService';
import { useAuth } from '../../../context/AuthContext';

interface FlashOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
}

interface OrderFormData {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  pickupLocation: 'Galeón' | 'Pérez Galdós';
  isDeposit: boolean;
  depositAmount: number;
}

interface ClientSuggestion {
  id: string;
  nombre: string;
  apellidos?: string;
  telefono: string;
  email?: string;
}

export function FlashOrderModal({ isOpen, onClose, onSuccess }: FlashOrderModalProps) {
  const { flashItems, removeFlashItem, clearFlashOrder } = useOrder();
  const { actualTheme } = useTheme();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState<OrderFormData>({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    pickupLocation: 'Pérez Galdós',
    isDeposit: false,
    depositAmount: 0
  });

  const [errors, setErrors] = useState<Partial<Record<keyof OrderFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  
  // Client Search State
  const [nameSuggestions, setNameSuggestions] = useState<ClientSuggestion[]>([]);
  const [phoneSuggestions, setPhoneSuggestions] = useState<ClientSuggestion[]>([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();

  // Calculate totals
  const totalItems = flashItems.length;
  const totalPrice = flashItems.reduce((sum, item) => sum + item.price, 0);

  // Normalize text for comparison
  const normalizeText = (text: string): string => {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  // Search Logic (same as ExpressOrderModal)
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (formData.clientName.trim().length >= 2) {
        try {
          const { data } = await buscarClientes(formData.clientName, 1, 10);
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
          console.error('Error searching clients:', error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const newErrors: Partial<Record<keyof OrderFormData, string>> = {};
    if (!formData.clientName.trim()) newErrors.clientName = 'El nombre es obligatorio';
    if (!formData.clientPhone.trim()) newErrors.clientPhone = 'El teléfono es obligatorio';
    else if (!/^\d{9,15}$/.test(formData.clientPhone.replace(/\s/g, ''))) newErrors.clientPhone = 'Teléfono inválido';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      // Map flash items to FlashOrderInput details
      const detalles = flashItems.map(item => ({
         bookId: parseInt(item.id),
         quantity: 1, // Default 1 for now
         price: item.price
      }));

      // Create Flash Order
      const pedido = await crearPedidoFlash({
          detalles,
          clientName: formData.clientName,
          clientPhone: formData.clientPhone,
          clientEmail: formData.clientEmail,
          pickupLocation: formData.pickupLocation,
          adminUserId: user.id,
          clientId: selectedClientId, // String, no parseInt
          isDeposit: formData.isDeposit,
          depositAmount: formData.depositAmount
      });

      if (pedido) {
          clearFlashOrder();
          onSuccess(pedido.id.toString());
          onClose(); // Parent (Fab) handles notifications usually, or we can show toast here if we had access.
      }
    } catch (error) {
      console.error('Error creating flash order:', error);
      // Show generic error or update status
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] backdrop-blur-sm p-4">
      <div className={`${actualTheme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-2xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden border ${actualTheme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${actualTheme === 'dark' ? 'border-gray-800 bg-gradient-to-r from-blue-900/40 to-cyan-900/40' : 'border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg shadow-lg">
              <Zap size={24} className="text-white fill-current" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Pedido Flash</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{totalItems} libros seleccionados</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content: 2 Columns */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            
            {/* Left: Items List */}
            <div className={`flex-1 overflow-y-auto p-4 border-b lg:border-b-0 lg:border-r ${actualTheme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Artículos</h3>
                {flashItems.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <Package size={48} className="mx-auto mb-2 opacity-50" />
                        <p>No hay libros seleccionados</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {flashItems.map((item, index) => (
                            <div key={`${item.id}-${index}`} className={`flex gap-3 p-3 rounded-xl border ${actualTheme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                                <div className="w-12 h-16 bg-gray-200 rounded-md flex-shrink-0 overflow-hidden">
                                     {item.coverImage ? (
                                         <img src={item.coverImage} alt="" className="w-full h-full object-cover" />
                                     ) : (
                                         <div className="w-full h-full flex items-center justify-center text-gray-400">
                                             <Package size={16} />
                                         </div>
                                     )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-sm truncate" title={item.title}>{item.title}</h4>
                                    <p className="text-xs text-gray-500 truncate">{item.author}</p>
                                    <p className="text-blue-600 font-bold text-sm mt-1">{item.price.toFixed(2)} €</p>
                                </div>
                                <button 
                                    onClick={() => removeFlashItem(item.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors self-center"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Right: Client Form */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-black/20">
                 <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Datos del Cliente</h3>
                 <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Name Input */}
                      <div className="relative">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                           <User size={16} /> Cliente
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
                            placeholder="Nombre completo"
                            className={`w-full px-4 py-2.5 rounded-lg border ${errors.clientName ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                        />
                        {errors.clientName && <p className="text-xs text-red-500 mt-1 ml-1">{errors.clientName}</p>}
                         {showNameSuggestions && nameSuggestions.length > 0 && (
                            <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                                {nameSuggestions.map(client => (
                                    <li key={client.id} onClick={() => handleClientSelect(client)} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                                        <div className="font-medium">{client.nombre} {client.apellidos}</div>
                                        <div className="text-xs text-gray-500">{client.telefono}</div>
                                    </li>
                                ))}
                            </ul>
                         )}
                      </div>

                      {/* Phone Input */}
                      <div className="relative">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                           <Phone size={16} /> Teléfono
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
                            placeholder="600 000 000"
                            className={`w-full px-4 py-2.5 rounded-lg border ${errors.clientPhone ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                        />
                        {errors.clientPhone && <p className="text-xs text-red-500 mt-1 ml-1">{errors.clientPhone}</p>}
                         {showPhoneSuggestions && phoneSuggestions.length > 0 && (
                            <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                                {phoneSuggestions.map(client => (
                                    <li key={client.id} onClick={() => handleClientSelect(client)} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                                        <div className="font-medium">{client.nombre} {client.apellidos}</div>
                                        <div className="text-xs text-gray-500">{client.telefono}</div>
                                    </li>
                                ))}
                            </ul>
                         )}
                      </div>

                      {/* Email Input */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                           <Mail size={16} /> Email (Opcional)
                        </label>
                        <input
                            type="email"
                            value={formData.clientEmail || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                            placeholder="cliente@ejemplo.com"
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>

                      {/* Location Input */}
                      <div>
                         <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                           <MapPin size={16} /> Recogida
                        </label>
                        <select
                            value={formData.pickupLocation}
                            onChange={(e) => setFormData(prev => ({ ...prev, pickupLocation: e.target.value as any }))}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        >
                            <option value="Pérez Galdós">Pérez Galdós</option>
                            <option value="Galeón">Galeón</option>
                        </select>
                      </div>

                      {/* Summary & Submit */}
                      <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
                           <div className="flex justify-between items-center mb-4 text-lg font-bold">
                               <span>Total Estimado</span>
                               <span className="text-blue-600">{totalPrice.toFixed(2)} €</span>
                           </div>
                           
                           <button
                              type="submit"
                              disabled={submitting || flashItems.length === 0}
                              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-xl shadow-lg transform active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                           >
                               {submitting ? 'Procesando...' : (
                                   <>
                                     <Zap size={20} className="fill-current" />
                                     Confirmar Pedido Flash
                                   </>
                               )}
                           </button>
                      </div>
                 </form>
            </div>
        </div>
      </div>
    </div>
  );
}
