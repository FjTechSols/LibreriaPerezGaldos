import { Book, Ubicacion } from '../../../types';
import { X, Loader2 } from 'lucide-react';

interface BookFormLegacyProps {
    formData: Partial<Book>;
    setFormData: (data: Partial<Book> | ((prev: Partial<Book>) => Partial<Book>)) => void;
    onSubmit: () => Promise<void>;
    isSubmitting: boolean;
    isCreating: boolean;
    onClose: () => void;
    ubicaciones: Ubicacion[];
    dbCategories: string[];
    loadingCategories: boolean;
    // Helper props from parent
    handleISBNSearch: () => void;
    searchingISBN: boolean;
    handleScanSuccess: (text: string) => void;
    // Specific legacy props if needed
    handleEditorialChange: (val: string) => void;
    showEditorialSuggestions: boolean;
    editorialSuggestions: string[];
    setShowEditorialSuggestions: (show: boolean) => void;
}

export function BookFormLegacy({
    formData,
    setFormData,
    onSubmit,
    isSubmitting,
    isCreating,
    onClose,
    ubicaciones,
    dbCategories,
    loadingCategories,
    handleISBNSearch,
    searchingISBN,
    handleEditorialChange,
    showEditorialSuggestions,
    editorialSuggestions,
    setShowEditorialSuggestions
}: BookFormLegacyProps) {

    // Helper for rendering horizontal rows
    const renderField = (label: string, input: React.ReactNode, required = false, customStyle?: React.CSSProperties) => (
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', alignItems: 'center', marginBottom: '4px', ...customStyle }}>
            <label style={{ 
                fontSize: '0.85rem', 
                textAlign: 'left',
                textDecoration: required ? 'underline' : 'none'
            }} className="text-gray-700 dark:text-gray-300">
                {label}:
            </label>
            {input}
        </div>
    );

    return (
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-700 shadow-inner max-h-[85vh] overflow-y-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* Header / Actions */}
            <div className="flex justify-between items-center mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">
                <h3 className="font-bold text-gray-700 dark:text-gray-200">{isCreating ? 'Nuevo Libro (Clásico)' : 'Editar Libro (Clásico)'}</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"><X size={20}/></button>
            </div>

            <div className="space-y-1">
                {/* Row 1: ISBN */}
                {renderField('ISBN', (
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={formData.isbn || ''}
                            onChange={e => setFormData(prev => ({...prev, isbn: e.target.value}))}
                            className="w-full px-2 py-1 text-sm border border-gray-400 dark:border-gray-600 rounded focus:border-blue-500 focus:outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            autoFocus
                        />
                        {isCreating && (
                            <button 
                                onClick={handleISBNSearch}
                                disabled={searchingISBN}
                                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 border border-gray-400 dark:border-gray-500 rounded text-xs font-bold text-gray-700 dark:text-gray-200"
                            >
                                {searchingISBN ? '...' : 'Buscar'}
                            </button>
                        )}
                    </div>
                ))}

                {/* Row 2: Title */}
                {renderField('Título', (
                    <input 
                        type="text" 
                        value={formData.title || ''}
                        onChange={e => setFormData(prev => ({...prev, title: e.target.value}))}
                        className="w-full px-2 py-1 text-sm border border-gray-400 dark:border-gray-600 rounded font-bold bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                ), true)}

                {/* Row 3: Author */}
                {renderField('Autor', (
                    <input 
                        type="text" 
                        value={formData.author || ''}
                        onChange={e => setFormData(prev => ({...prev, author: e.target.value}))}
                        className="w-full px-2 py-1 text-sm border border-gray-400 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                ))}

                {/* Row 4: Description (TextArea) */}
                {renderField('Descripción', (
                    <textarea 
                        value={formData.description || ''}
                        onChange={e => setFormData(prev => ({...prev, description: e.target.value}))}
                        className="w-full px-2 py-1 text-sm border border-gray-400 dark:border-gray-600 rounded resize-y min-h-[80px] bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        rows={5}
                    />
                ))}

                <hr className="border-gray-300 dark:border-gray-700 my-2" />

                {/* Row 5: Editorial */}
                {renderField('Editorial', (
                    <div className="relative">
                        <input 
                            type="text" 
                            value={formData.publisher || ''}
                            onChange={e => handleEditorialChange(e.target.value)}
                            onBlur={() => setTimeout(() => setShowEditorialSuggestions(false), 200)}
                            className="w-full px-2 py-1 text-sm border border-gray-400 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        />
                         {showEditorialSuggestions && editorialSuggestions.length > 0 && (
                            <ul className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-lg z-50 max-h-40 overflow-y-auto text-sm">
                                {editorialSuggestions.map((s, i) => (
                                    <li key={i} className="px-2 py-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer text-gray-900 dark:text-gray-100" onClick={() => {
                                        setFormData(p => ({...p, publisher: s}));
                                        setShowEditorialSuggestions(false);
                                    }}>
                                        {s}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))}

                {/* Row 6: Year */}
                {renderField('Año', (
                    <input 
                        type="text" 
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        placeholder="Ej. 2026"
                        value={formData.publicationYear || ''}
                        onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            setFormData(prev => ({...prev, publicationYear: val ? parseInt(val) : undefined}));
                        }}
                        className="w-24 px-2 py-1 text-sm border border-gray-400 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                ), true)}

                {/* Row 7: Ubicacion */}
                {renderField('Ubicación', (
                    <select
                        value={formData.ubicacion || ''}
                        onChange={e => setFormData(prev => ({...prev, ubicacion: e.target.value}))}
                        className="w-full px-2 py-1 text-sm border border-gray-400 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    >
                         <option value="">Seleccionar</option>
                         {ubicaciones.map(u => <option key={u.id} value={u.nombre}>{u.nombre}</option>)}
                    </select>
                ), true)}


                {/* Row 8: Pages */}
                {renderField('Páginas', (
                     <input 
                        type="number" 
                        value={formData.pages || ''}
                        onChange={e => setFormData(prev => ({...prev, pages: parseInt(e.target.value)}))}
                        className="w-24 px-2 py-1 text-sm border border-gray-400 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                ))}

                {/* Row 9: Categoría (Category) */}
                {renderField('Categoría', (
                    <select
                        value={formData.category || ''}
                        onChange={e => setFormData(prev => ({...prev, category: e.target.value}))}
                         className="w-full px-2 py-1 text-sm border border-gray-400 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    >
                        {loadingCategories ? <option>Cargando...</option> : (
                            <>
                                <option value="">Seleccionar</option>
                                {dbCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </>
                        )}
                    </select>
                ), true)}

                 {/* Row 10: Portada URL */}
                 {renderField('Portada', (
                     <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={formData.coverImage || ''}
                            onChange={e => setFormData(prev => ({...prev, coverImage: e.target.value}))}
                            className="w-full px-2 py-1 text-sm border border-gray-400 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        />
                        {formData.coverImage && (
                            <img src={formData.coverImage} className="h-6 w-6 object-cover border border-gray-400 dark:border-gray-600" alt="" />
                        )}
                     </div>
                ), false, { marginBottom: '12px' })}

                <hr className="border-gray-300 dark:border-gray-700 my-2" />

                {/* Row 11: Checkboxes (Grid) */}
                {renderField('Opciones', (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-white">
                            <input type="checkbox" checked={formData.featured || false} onChange={e => setFormData(p => ({...p, featured: e.target.checked}))} />
                            Oportunidad (Destacado)
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-white">
                            <input type="checkbox" checked={formData.isNew || false} onChange={e => setFormData(p => ({...p, isNew: e.target.checked}))} />
                            Nuevo
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-white">
                            <input type="checkbox" checked={formData.isOutOfPrint || false} onChange={e => setFormData(p => ({...p, isOutOfPrint: e.target.checked}))} />
                            Descatalogado
                        </label>
                         <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-white">
                            <input type="checkbox" checked={formData.isOnSale || false} onChange={e => setFormData(p => ({...p, isOnSale: e.target.checked}))} />
                            Oferta / Recomendado
                        </label>
                    </div>
                ), false, { marginBottom: '12px' })}

                {/* New Row: Estado Físico & Idioma */}
                {renderField('Estado', (
                     <div className="flex gap-4 items-center">
                         <label className="flex items-center gap-2 cursor-pointer">
                             <input 
                                type="radio" 
                                name="condition" 
                                checked={formData.condition === 'nuevo'} 
                                onChange={() => setFormData(p => ({...p, condition: 'nuevo'}))} 
                             />
                             <span className="text-sm">Nuevo</span>
                         </label>
                         <label className="flex items-center gap-2 cursor-pointer">
                             <input 
                                type="radio" 
                                name="condition" 
                                checked={formData.condition === 'leido'} 
                                onChange={() => setFormData(p => ({...p, condition: 'leido'}))} 
                             />
                             <span className="text-sm">Leído</span>
                         </label>
                     </div>
                ), false, { marginBottom: '12px' })}
                 {renderField('Idioma', (
                     <input 
                        type="text" 
                        value={formData.language || 'Español'}
                        onChange={e => setFormData(prev => ({...prev, language: e.target.value}))}
                        className="w-full px-2 py-1 text-sm border border-gray-400 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        placeholder="Español"
                    />
                ))}
                 
                <hr className="border-gray-300 dark:border-gray-700 my-2" />

                {/* Row 12: Price */}
                {renderField('Precio', (
                     <input 
                        type="number" 
                        step="0.01"
                        value={formData.price || ''}
                        onChange={e => setFormData(prev => ({...prev, price: parseFloat(e.target.value)}))}
                        className="w-32 px-2 py-1 text-sm border border-gray-400 dark:border-gray-600 rounded font-bold bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                ), true)}

                 {/* Row 13: Stock (Disponibles) */}
                 {renderField('Disponibles', (
                     <input 
                        type="text"
                        inputMode="numeric"
                        value={formData.stock ?? 0}
                        onKeyDown={(e) => {
                          if (!/[0-9]/.test(e.key) && !['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        onChange={e => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setFormData(prev => ({...prev, stock: val === '' ? 0 : parseInt(val, 10)}));
                        }}
                        className="w-24 px-2 py-1 text-sm border border-gray-400 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                ))}

                <div className="mt-6 pt-4 border-t border-gray-300 dark:border-gray-700 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={onSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-2 text-sm font-medium text-white bg-gray-800 dark:bg-blue-600 border border-transparent rounded shadow-sm hover:bg-gray-900 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-blue-500 flex items-center gap-2"
                    >
                        {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                        {isCreating ? 'Guardar Libro' : 'Actualizar Libro'}
                    </button>
                </div>

            </div>
        </div>
    );
}
