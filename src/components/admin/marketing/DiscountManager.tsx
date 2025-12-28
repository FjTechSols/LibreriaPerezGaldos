import React, { useState, useEffect } from 'react';
import { Plus, Tag, Trash2, Power, PowerOff, Filter, Calendar } from 'lucide-react';
import { discountService, DiscountRule } from '../../../services/discountService';
import { supabase } from '../../../lib/supabase';
import { MessageModal } from '../../MessageModal';

// Simple Category type for dropdown
interface Category {
    id: number;
    nombre: string;
}

export function DiscountManager() {
    const [discounts, setDiscounts] = useState<DiscountRule[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [newDiscount, setNewDiscount] = useState<{
        name: string;
        discount_percent: string;
        scope: 'GLOBAL' | 'CATEGORY';
        target_category_id: string;
        start_date: string;
        end_date: string;
    }>({
        name: '',
        discount_percent: '',
        scope: 'GLOBAL',
        target_category_id: '',
        start_date: '',
        end_date: ''
    });

    // MessageModal State
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [messageModalConfig, setMessageModalConfig] = useState<{
        title: string;
        message: string;
        type: 'info' | 'error' | 'success' | 'warning';
        onConfirm?: () => void;
        showCancel?: boolean;
        buttonText?: string;
    }>({ title: '', message: '', type: 'info' });

    const showModal = (
        title: string, 
        message: string, 
        type: 'info' | 'error' | 'success' | 'warning' = 'info',
        onConfirm?: () => void
    ) => {
        setMessageModalConfig({ 
            title, 
            message, 
            type, 
            onConfirm,
            showCancel: !!onConfirm,
            buttonText: onConfirm ? 'Aceptar' : 'Cerrar'
        });
        setShowMessageModal(true);
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [rules, cats] = await Promise.all([
            discountService.getAllDiscounts(),
            fetchCategories()
        ]);
        setDiscounts(rules);
        setCategories(cats);
        setLoading(false);
    };

    const fetchCategories = async () => {
        const { data } = await supabase.from('categorias').select('id, nombre').order('nombre');
        return data || [];
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!newDiscount.name || !newDiscount.discount_percent) {
            setError('Nombre y porcentaje son obligatorios');
            return;
        }

        const percent = parseInt(newDiscount.discount_percent);
        if (isNaN(percent) || percent <= 0 || percent > 100) {
            setError('El porcentaje debe ser entre 1 y 100');
            return;
        }

        if (newDiscount.scope === 'CATEGORY' && !newDiscount.target_category_id) {
            setError('Debes seleccionar una categoría');
            return;
        }

        const payload: Partial<DiscountRule> = {
            name: newDiscount.name,
            discount_percent: percent,
            scope: newDiscount.scope,
            target_category_id: newDiscount.scope === 'CATEGORY' ? parseInt(newDiscount.target_category_id) : null,
            active: true,
            start_date: newDiscount.start_date ? new Date(newDiscount.start_date).toISOString() : null,
            end_date: newDiscount.end_date ? new Date(newDiscount.end_date).toISOString() : null
        };

        const created = await discountService.createDiscount(payload);
        if (created) {
            setNewDiscount({
                name: '',
                discount_percent: '',
                scope: 'GLOBAL',
                target_category_id: '',
                start_date: '',
                end_date: ''
            });
            setIsAdding(false);
            loadData();
        } else {
            setError('Error al crear el descuento');
        }
    };

    const toggleStatus = async (id: string, current: boolean) => {
        const success = await discountService.toggleActive(id, current);
        if (success) {
            setDiscounts(discounts.map(d => d.id === id ? { ...d, active: !current } : d));
        }
    };

    const handleDelete = (id: string) => {
        showModal(
            'Confirmar Eliminación',
            '¿Seguro que quieres eliminar este descuento?',
            'warning',
            async () => {
                const success = await discountService.deleteDiscount(id);
                if (success) {
                    setDiscounts(discounts.filter(d => d.id !== id));
                    showModal('Éxito', 'Descuento eliminado correctamente', 'success');
                } else {
                    showModal('Error', 'No se pudo eliminar el descuento', 'error');
                }
            }
        );
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                        <Tag className="text-blue-600" />
                        Gestión de Ofertas
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Crea descuentos globales o por categoría</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={18} />
                    {isAdding ? 'Cancelar' : 'Nueva Oferta'}
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 border border-red-100">
                    {error}
                </div>
            )}

            {isAdding && (
                <form onSubmit={handleCreate} className="bg-gray-50 dark:bg-slate-900/50 p-6 rounded-lg mb-8 border border-gray-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Nombre de la Oferta</label>
                            <input
                                type="text"
                                value={newDiscount.name}
                                onChange={e => setNewDiscount({ ...newDiscount, name: e.target.value })}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                                placeholder="Ej: Rebajas de Verano"
                            />
                        </div>
                        
                        <div>
                             <label className="block text-sm font-medium mb-1 dark:text-gray-300">Porcentaje de Descuento (%)</label>
                             <input
                                type="number"
                                min="1"
                                max="100"
                                value={newDiscount.discount_percent}
                                onChange={e => setNewDiscount({ ...newDiscount, discount_percent: e.target.value })}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                                placeholder="10"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Tipo de Oferta</label>
                            <div className="flex bg-white dark:bg-slate-800 rounded-md border border-gray-200 dark:border-slate-600 p-1">
                                <button
                                    type="button"
                                    onClick={() => setNewDiscount({ ...newDiscount, scope: 'GLOBAL' })}
                                    className={`flex-1 py-1 px-3 rounded text-sm font-medium transition-colors ${newDiscount.scope === 'GLOBAL' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                                >
                                    Global (Todo)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewDiscount({ ...newDiscount, scope: 'CATEGORY' })}
                                    className={`flex-1 py-1 px-3 rounded text-sm font-medium transition-colors ${newDiscount.scope === 'CATEGORY' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                                >
                                    Por Categoría
                                </button>
                            </div>
                        </div>

                        {newDiscount.scope === 'CATEGORY' && (
                             <div className="md:col-span-2 animate-fadeIn">
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Selecciona Categoría</label>
                                <select
                                    value={newDiscount.target_category_id}
                                    onChange={e => setNewDiscount({ ...newDiscount, target_category_id: e.target.value })}
                                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                                    ))}
                                </select>
                             </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Fecha Inicio (Opcional)</label>
                            <input
                                type="datetime-local"
                                value={newDiscount.start_date}
                                onChange={e => setNewDiscount({ ...newDiscount, start_date: e.target.value })}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Fecha Fin (Opcional)</label>
                            <input
                                type="datetime-local"
                                value={newDiscount.end_date}
                                onChange={e => setNewDiscount({ ...newDiscount, end_date: e.target.value })}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button type="submit" className="btn-primary">
                            Crear Oferta
                        </button>
                    </div>
                </form>
            )}

            <div className="space-y-4">
                {discounts.length === 0 && !loading ? (
                    <p className="text-center py-8 text-gray-500">No hay ofertas creadas.</p>
                ) : (
                    discounts.map(discount => (
                        <div key={discount.id} className={`border rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4 transition-colors ${discount.active ? 'bg-white dark:bg-slate-800 border-green-200 dark:border-green-900/30' : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 opacity-75'}`}>
                            <div className="flex items-center gap-4 flex-1">
                                <div className={`p-3 rounded-full ${discount.active ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-200 text-gray-500 dark:bg-slate-700'}`}>
                                    <Tag size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                        {discount.name}
                                        <span className="text-sm px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                            {discount.discount_percent}% OFF
                                        </span>
                                    </h3>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                        <span className="flex items-center gap-1">
                                            <Filter size={14} />
                                            {discount.scope === 'GLOBAL' ? 'Todo el Catálogo' : `Categoría: ${discount.categorias?.nombre || 'Desconocida'}`}
                                        </span>
                                        {(discount.start_date || discount.end_date) && (
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                {discount.end_date ? `Hasta ${new Date(discount.end_date).toLocaleDateString()}` : 'Desde ahora'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => toggleStatus(discount.id, discount.active)}
                                    className={`p-2 rounded-full transition-colors ${discount.active ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                                    title={discount.active ? 'Desactivar' : 'Activar'}
                                >
                                    {discount.active ? <Power size={20} /> : <PowerOff size={20} />}
                                </button>
                                <button
                                    onClick={() => handleDelete(discount.id)}
                                    className="p-2 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    title="Eliminar"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <MessageModal
                isOpen={showMessageModal}
                onClose={() => setShowMessageModal(false)}
                title={messageModalConfig.title}
                message={messageModalConfig.message}
                type={messageModalConfig.type as any}
                onConfirm={messageModalConfig.onConfirm}
                showCancel={messageModalConfig.showCancel}
                buttonText={messageModalConfig.buttonText}
            />
        </div>
    );
}
