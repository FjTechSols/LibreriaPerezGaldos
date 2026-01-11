import { useState, useEffect } from 'react';
import { Search, X, Package, Globe, Book as BookIcon } from 'lucide-react';
import { Libro } from '../../../types';
import { obtenerLibros } from '../../../services/pedidoService';

interface AddProductToOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: { 
    libro?: Libro; 
    nombre_externo?: string; 
    precio_unitario: number; 
    cantidad: number;
    url_externa?: string;
    isExternal: boolean;
  }) => void;
}

export function AddProductToOrderModal({ isOpen, onClose, onAdd }: AddProductToOrderModalProps) {
  const [mode, setMode] = useState<'internal' | 'external'>('internal');
  
  // Internal State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Libro[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedInternalBook, setSelectedInternalBook] = useState<Libro | null>(null);
  
  // External State
  const [externalData, setExternalData] = useState({
    title: '',
    price: '',
    quantity: '1',
    url: ''
  });

  // Internal Quantity (separate from external for clarity)
  const [internalQuantity, setInternalQuantity] = useState(1);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setMode('internal');
      setSearchTerm('');
      setSearchResults([]);
      setSelectedInternalBook(null);
      setInternalQuantity(1);
      setExternalData({ title: '', price: '', quantity: '1', url: '' });
    }
  }, [isOpen]);

  // Search Effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        setIsSearching(true);
        try {
            const results = await obtenerLibros(searchTerm);
            setSearchResults(results);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSubmit = () => {
    if (mode === 'internal') {
        if (!selectedInternalBook) return;
        onAdd({
            libro: selectedInternalBook,
            precio_unitario: selectedInternalBook.precio, // Default to book price, editable later in list
            cantidad: internalQuantity,
            isExternal: false
        });
    } else {
        // Validation
        if (!externalData.title || !externalData.price || !externalData.quantity) {
            alert('Por favor completa Título, Precio y Cantidad.');
            return;
        }
        onAdd({
            nombre_externo: externalData.title,
            precio_unitario: Number(externalData.price),
            cantidad: Number(externalData.quantity),
            url_externa: externalData.url,
            isExternal: true
        });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2">
            <Package className="text-blue-600 dark:text-blue-400" size={20} />
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Añadir Producto al Pedido</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="p-4 flex gap-4 border-b border-gray-200 dark:border-gray-700">
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${mode === 'internal' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}>
                <input 
                    type="radio" 
                    name="productMode" 
                    checked={mode === 'internal'} 
                    onChange={() => setMode('internal')} 
                    className="hidden"
                />
                <BookIcon size={18} />
                <span className="font-medium">Producto Interno (Base de Datos)</span>
            </label>
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${mode === 'external' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}>
                <input 
                    type="radio" 
                    name="productMode" 
                    checked={mode === 'external'} 
                    onChange={() => setMode('external')} 
                    className="hidden" 
                />
                <Globe size={18} />
                <span className="font-medium">Producto Externo (A pedir)</span>
            </label>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
            {mode === 'internal' ? (
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar por Título, Autor, ISBN o Código..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {isSearching && <div className="text-center py-4 text-gray-500">Buscando...</div>}
                    
                    {!isSearching && searchTerm.length < 2 && (
                         <div className="text-center py-8 text-gray-400">
                            Escribe al menos 2 caracteres para buscar en el catálogo.
                         </div>
                    )}

                    {!isSearching && searchResults.length > 0 && (
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                            {searchResults.map(book => (
                                <div 
                                    key={book.id}
                                    className={`p-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer flex items-center justify-between hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${selectedInternalBook?.id === book.id ? 'bg-blue-100 dark:bg-blue-900/40' : ''}`}
                                    onClick={() => setSelectedInternalBook(book)}
                                >
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{book.titulo}</p>
                                        <p className="text-sm text-gray-500">{book.autor} • {book.precio.toFixed(2)}€</p>
                                    </div>
                                    <div className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300">
                                        {book.stock} en stock
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                         <div className="w-24">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad</label>
                            <input 
                                type="number" 
                                min="1"
                                value={internalQuantity}
                                onChange={(e) => setInternalQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                            />
                         </div>
                         <div className="flex-1 flex justify-end items-end h-full pt-6">
                             <p className="text-lg font-bold text-gray-900 dark:text-white">
                                 Total: {selectedInternalBook ? (selectedInternalBook.precio * internalQuantity).toFixed(2) : '0.00'}€
                             </p>
                         </div>
                    </div>

                </div>
            ) : (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título / Descripción del Producto *</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ej: Libro raro..."
                            value={externalData.title}
                            onChange={(e) => setExternalData({...externalData, title: e.target.value})}
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio Unitario (€) *</label>
                            <input 
                                type="number" 
                                step="0.01"
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="0.00"
                                value={externalData.price}
                                onChange={(e) => setExternalData({...externalData, price: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad *</label>
                            <input 
                                type="number" 
                                min="1"
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={externalData.quantity}
                                onChange={(e) => setExternalData({...externalData, quantity: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL de Referencia (Opcional)</label>
                        <input 
                            type="url" 
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="https://..."
                            value={externalData.url}
                            onChange={(e) => setExternalData({...externalData, url: e.target.value})}
                        />
                        <p className="text-xs text-gray-500 mt-1">Enlace al producto en la web externa para referencia del pedido.</p>
                    </div>
                </div>
            )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
            >
                Cancelar
            </button>
            <button 
                onClick={handleSubmit}
                disabled={mode === 'internal' ? !selectedInternalBook : (!externalData.title || !externalData.price)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {mode === 'internal' ? 'Añadir Libro' : 'Añadir Producto Externo'}
            </button>
        </div>
      </div>
    </div>
  );
}
