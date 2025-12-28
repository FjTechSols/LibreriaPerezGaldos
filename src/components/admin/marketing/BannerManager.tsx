import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ExternalLink, Image as ImageIcon, Eye, EyeOff, X, Palette, Star, Tag, Clock, Calendar, Pencil } from 'lucide-react';
import { bannerService, Banner, BannerType } from '../../../services/bannerService';
import { MessageModal } from '../../MessageModal';

export function BannerManager() {
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  // State management
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Update State to handle new fields
  const [activeTab, setActiveTab] = useState<'upload' | 'generate'>('upload');
  const [newBanner, setNewBanner] = useState<{
    // Common
    title: string;
    link_url: string;
    active: boolean;
    start_date: string;
    end_date: string;
    // Image Mode
    image_url: string;
    // Generated Mode
    banner_type: BannerType;
    custom_title: string;
    custom_description: string;
    discount_percent: string; // string for input handling
    book_title: string;
    book_author: string;
  }>({
    title: '',
    link_url: '',
    active: false,
    start_date: '',
    end_date: '',
    image_url: '',
    banner_type: 'image', // default
    custom_title: '',
    custom_description: '',
    discount_percent: '',
    book_title: '',
    book_author: ''
  });

  const [error, setError] = useState<string | null>(null);

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
    loadBanners();
  }, []);

  const loadBanners = async () => {
    setLoading(true);
    const data = await bannerService.getAllBanners();
    setBanners(data);
    setLoading(false);
  };

  const applyStyle = (tag: 'strong' | 'em' | 'span', className?: string) => {
      const textarea = descriptionRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      if (start === end) return; // No selection

      const text = newBanner.custom_description;
      const selectedText = text.substring(start, end);
      
      let openTag = `<${tag}`;
      if (className) openTag += ` class="${className}"`;
      openTag += '>';
      const closeTag = `</${tag}>`;
      
      const newText = text.substring(0, start) + openTag + selectedText + closeTag + text.substring(end);
      
      setNewBanner({ ...newBanner, custom_description: newText });
      
      // Restore selection logic is tricky with changed length, just focus for now
      setTimeout(() => textarea.focus(), 0);
  };

  const toLocalInputString = (dateStr?: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      
      // Get local parts
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleEdit = (banner: Banner) => {
    setEditingId(banner.id);
    setNewBanner({
      title: banner.title,
      link_url: banner.link_url || '',
      active: banner.active,
      start_date: toLocalInputString(banner.start_date),
      end_date: toLocalInputString(banner.end_date),
      image_url: banner.image_url || '',
      banner_type: banner.banner_type,
      custom_title: banner.custom_title || '',
      custom_description: banner.custom_description || '',
      discount_percent: banner.discount_percent ? banner.discount_percent.toString() : '',
      book_title: banner.book_title || '',
      book_author: banner.book_author || ''
    });
    setActiveTab(banner.banner_type === 'image' ? 'upload' : 'generate');
    setIsAdding(true);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setNewBanner({
        title: '',
        link_url: '',
        active: false,
        start_date: '',
        end_date: '',
        image_url: '',
        banner_type: 'image',
        custom_title: '',
        custom_description: '',
        discount_percent: '',
        book_title: '',
        book_author: ''
    });
    setIsAdding(false);
    setEditingId(null);
    setError(null);
    setActiveTab('upload');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!newBanner.title) {
        setError('El título interno es obligatorio.');
        return;
    }

    // Mode specific validation
    if (activeTab === 'upload') {
        if (!newBanner.image_url) {
            setError('La URL de la imagen es obligatoria en modo subida.');
            return;
        }
    } else {
        // Generated mode checks
        if (!newBanner.custom_title) {
            setError('El título del banner es obligatorio.');
            return;
        }
        if (newBanner.banner_type === 'discount' && !newBanner.discount_percent) {
             setError('El porcentaje de descuento es obligatorio.');
             return;
        }
        if (newBanner.banner_type === 'last_minute' && (!newBanner.book_title || !newBanner.book_author)) {
             setError('El título y autor del libro son obligatorios para "Última Hora".');
             return;
        }
    }

    // Build payload
    const payload: any = {
      title: newBanner.title,
      link_url: newBanner.link_url || undefined,
      active: newBanner.active,
      // Convert local input time to UTC ISO string for storage
      start_date: newBanner.start_date ? new Date(newBanner.start_date).toISOString() : null,
      end_date: newBanner.end_date ? new Date(newBanner.end_date).toISOString() : null,
      show_once: false
    };

    if (activeTab === 'upload') {
        payload.banner_type = 'image';
        payload.image_url = newBanner.image_url;
    } else {
        payload.banner_type = newBanner.banner_type;
        // Don't save image_url for generated types to keep clean
        // But if updating, we should probably nullify image_url in DB if switching types? 
        // Supabase update is partial, so explicit null might be needed if switching from image -> generated.
        // For simplicity now, we overwrite.
        payload.custom_title = newBanner.custom_title;
        payload.custom_description = newBanner.custom_description;
        
        if (newBanner.banner_type === 'discount') {
            payload.discount_percent = parseInt(newBanner.discount_percent);
        }
        if (newBanner.banner_type === 'last_minute') {
            payload.book_title = newBanner.book_title;
            payload.book_author = newBanner.book_author;
        }
    }

    let success = false;
    let createdId = '';

    if (editingId) {
        // Update existing
        // If switching from image to generated, we should probably clear image_url
        if (activeTab === 'generate') {
            payload.image_url = null;
        }
        success = await bannerService.updateBanner(editingId, payload);
        createdId = editingId;
    } else {
        // Create new
        const created = await bannerService.createBanner(payload);
        if (created) {
            success = true;
            createdId = created.id;
        }
    }

    if (success) {
      if (newBanner.active) {
         await bannerService.activateBanner(createdId);
      }
      resetForm();
      loadBanners();
    } else {
      setError(editingId ? 'Error al actualizar el banner' : 'Error al crear el banner');
    }
  };

  const handleDelete = (id: string) => {
    showModal(
        'Confirmar Eliminación',
        '¿Estás seguro de que deseas eliminar este banner?',
        'warning',
        async () => {
            const success = await bannerService.deleteBanner(id);
            if (success) {
                loadBanners();
                showModal('Éxito', 'Banner eliminado correctamente', 'success');
            } else {
                showModal('Error', 'No se pudo eliminar el banner', 'error');
            }
        }
    );
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    if (!currentStatus) {
      await bannerService.activateBanner(id);
    } else {
      await bannerService.deactivateBanner(id);
    }
    loadBanners();
  };

  const getBannerIcon = (type: BannerType) => {
      switch(type) {
          case 'discount': return <Tag size={16} className="text-pink-500" />;
          case 'last_minute': return <Clock size={16} className="text-red-500" />;
          case 'exclusive': return <Star size={16} className="text-purple-500" />;
          default: return <ImageIcon size={16} className="text-blue-500" />;
      }
  };

  const getBannerLabel = (type: BannerType) => {
      switch(type) {
          case 'discount': return 'Descuento';
          case 'last_minute': return 'Última Hora';
          case 'exclusive': return 'Exclusivo';
          default: return 'Imagen';
      }
  };

  return (
    <div className="banner-manager">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Banners Publicitarios</h2>
          <p className="text-gray-600 dark:text-gray-300">Gestiona los pop-ups que aparecen en la página principal</p>
        </div>
        <button 
          onClick={isAdding ? resetForm : () => setIsAdding(true)}
          className="btn-primary flex items-center gap-2"
        >
          {isAdding ? <X size={20} /> : <Plus size={20} />}
          {isAdding ? (editingId ? 'Cancelar Edición' : 'Cancelar') : 'Nuevo Banner'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300 px-4 py-3 rounded mb-4 flex items-center gap-2">
          <X size={18} />
          {error}
        </div>
      )}

      {isAdding && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-8 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold mb-6 dark:text-white">{editingId ? 'Editar Banner' : 'Crear Nuevo Banner'}</h3>
          
          {/* Mode Tabs */}
          <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-slate-700 pb-2">
              <button
                 type="button"
                 onClick={() => { setActiveTab('upload'); setNewBanner(prev => ({ ...prev, banner_type: 'image' })); }}
                 className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'upload' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
              >
                  <div className="flex items-center gap-2">
                      <ImageIcon size={18} /> Subir Imagen
                  </div>
              </button>
              <button
                 type="button"
                 onClick={() => { setActiveTab('generate'); setNewBanner(prev => ({ ...prev, banner_type: 'discount' })); }} // default to discount
                 className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'generate' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
              >
                   <div className="flex items-center gap-2">
                      <Palette size={18} /> Diseñar Banner
                  </div>
              </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-6">
            
            {/* Common Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título Interno (Solo Admin)</label>
                <input
                  type="text"
                  value={newBanner.title}
                  onChange={e => setNewBanner({...newBanner, title: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-900 dark:text-white"
                  placeholder="Ej: Oferta Verano 2024"
                />
              </div>

               <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio (Opcional)</label>
                <div className="relative">
                   <input
                    type="datetime-local"
                    value={newBanner.start_date}
                    onChange={e => setNewBanner({...newBanner, start_date: e.target.value})}
                    className="w-full p-2 pl-9 border border-gray-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-900 dark:text-white"
                   />
                   <Calendar className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
                </div>
              </div>
              
               <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Fin (Opcional)</label>
                 <div className="relative">
                   <input
                    type="datetime-local"
                    value={newBanner.end_date}
                    onChange={e => setNewBanner({...newBanner, end_date: e.target.value})}
                    className="w-full p-2 pl-9 border border-gray-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-900 dark:text-white"
                   />
                   <Calendar className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
                 </div>
              </div>
            </div>

            {/* Upload Mode UI */}
            {activeTab === 'upload' && (
                <div className="space-y-4 border-t border-gray-100 dark:border-slate-700 pt-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL de la Imagen</label>
                        <input
                          type="text"
                          value={newBanner.image_url}
                          onChange={e => setNewBanner({...newBanner, image_url: e.target.value})}
                          className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-900 dark:text-white"
                          placeholder="https://..."
                        />
                         {newBanner.image_url && (
                            <div className="mt-2 relative h-40 w-full max-w-md bg-gray-50 dark:bg-slate-900 rounded overflow-hidden border border-gray-200 dark:border-slate-700">
                              <img src={newBanner.image_url} alt="Vista previa" className="h-full w-full object-cover" />
                            </div>
                          )}
                     </div>
                </div>
            )}

             {/* Generated Mode UI */}
            {activeTab === 'generate' && (
                <div className="space-y-6 border-t border-gray-100 dark:border-slate-700 pt-4">
                    {/* Template Selection */}
                    <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selecciona una Plantilla</label>
                         <div className="grid grid-cols-3 gap-3">
                             {[
                                 { id: 'discount', label: 'Descuento', icon: Tag, color: 'text-pink-600', bg: 'bg-pink-50' },
                                 { id: 'exclusive', label: 'Exclusivo', icon: Star, color: 'text-purple-600', bg: 'bg-purple-50' },
                                 { id: 'last_minute', label: 'Última Hora', icon: Clock, color: 'text-red-600', bg: 'bg-red-50' }
                             ].map((type) => {
                                 const Icon = type.icon;
                                 const isSelected = newBanner.banner_type === type.id;
                                 return (
                                     <button
                                         key={type.id}
                                         type="button"
                                         onClick={() => setNewBanner(prev => ({...prev, banner_type: type.id as BannerType}))}
                                         className={`relative p-3 rounded-lg border-2 text-left transition-all ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 hover:border-blue-200 dark:border-slate-600 dark:hover:border-slate-500 dark:bg-slate-900'}`}
                                     >
                                         <div className="flex flex-col items-center gap-2">
                                             <div className={`p-2 rounded-full ${isSelected ? 'bg-white' : 'bg-gray-100 dark:bg-slate-800'}`}>
                                                 <Icon size={20} className={isSelected ? 'text-blue-600' : 'text-gray-500'} />
                                             </div>
                                             <span className={`text-sm font-semibold ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>{type.label}</span>
                                         </div>
                                     </button>
                                 )
                             })}
                         </div>
                    </div>

                    {/* Specific Fields per Type */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título de la Oferta</label>
                             <input
                               type="text"
                               value={newBanner.custom_title}
                               onChange={e => setNewBanner({...newBanner, custom_title: e.target.value})}
                               className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-900 dark:text-white"
                               placeholder="Ej: GRAN VENTA DE INVIERNO"
                             />
                         </div>
                         
                         <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción / Texto Principal</label>
                             
                             {/* Rich Text Toolbar */}
                             <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 dark:bg-slate-900/50 rounded border border-gray-200 dark:border-slate-700">
                                 <button
                                     type="button"
                                     onClick={() => applyStyle('strong')}
                                     className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 font-bold text-gray-700 dark:text-white"
                                     title="Negrita"
                                 >
                                     B
                                 </button>
                                 <button
                                     type="button"
                                     onClick={() => applyStyle('em')}
                                     className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 italic font-serif text-gray-700 dark:text-white"
                                     title="Cursiva"
                                 >
                                     I
                                 </button>
                                 <div className="w-px h-6 bg-gray-300 dark:bg-slate-600 mx-1 self-center"></div>
                                 
                                 {/* Colors */}
                                 {[
                                     { color: 'text-red-500', bg: 'bg-red-500', name: 'Rojo' },
                                     { color: 'text-blue-500', bg: 'bg-blue-500', name: 'Azul' },
                                     { color: 'text-green-500', bg: 'bg-green-500', name: 'Verde' },
                                     { color: 'text-purple-500', bg: 'bg-purple-500', name: 'Morado' },
                                     { color: 'text-pink-500', bg: 'bg-pink-500', name: 'Rosa' },
                                     { color: 'text-orange-500', bg: 'bg-orange-500', name: 'Naranja' },
                                     { color: 'text-yellow-400', bg: 'bg-yellow-400', name: 'Amarillo' },
                                 ].map((c) => (
                                     <button
                                         key={c.color}
                                         type="button"
                                         onClick={() => applyStyle('span', c.color)}
                                         className={`w-6 h-6 rounded-full ${c.bg} border border-gray-200 dark:border-gray-600 hover:scale-110 transition-transform shadow-sm`}
                                         title={`Color ${c.name}`}
                                     />
                                 ))}
                                 
                                 <div className="w-px h-6 bg-gray-300 dark:bg-slate-600 mx-1 self-center"></div>
                                 
                                  <button
                                     type="button"
                                     onClick={() => applyStyle('span', 'bg-yellow-200 text-black px-1 rounded')}
                                     className="px-2 py-0.5 text-xs font-bold bg-yellow-200 text-black rounded hover:bg-yellow-300 transition-colors"
                                     title="Resaltar"
                                 >
                                     Resaltar
                                 </button>
                             </div>

                             <textarea
                               ref={descriptionRef}
                               rows={3}
                               value={newBanner.custom_description}
                               onChange={e => setNewBanner({...newBanner, custom_description: e.target.value})}
                               className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-900 dark:text-white font-mono text-sm"
                               placeholder="Ej: Todos los libros con 10% de descuento..."
                             />
                             <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Selecciona texto y usa los botones para dar estilo.</p>
                         </div>

                         {newBanner.banner_type === 'discount' && (
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Porcentaje Descuento (%)</label>
                                 <input
                                   type="number"
                                   value={newBanner.discount_percent}
                                   onChange={e => setNewBanner({...newBanner, discount_percent: e.target.value})}
                                   className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-900 dark:text-white"
                                   placeholder="10"
                                 />
                             </div>
                         )}

                         {newBanner.banner_type === 'last_minute' && (
                             <>
                                 <div>
                                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título del Libro</label>
                                     <input
                                       type="text"
                                       value={newBanner.book_title}
                                       onChange={e => setNewBanner({...newBanner, book_title: e.target.value})}
                                       className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-900 dark:text-white"
                                       placeholder="Ej: Fortunata y Jacinta"
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Autor</label>
                                     <input
                                       type="text"
                                       value={newBanner.book_author}
                                       onChange={e => setNewBanner({...newBanner, book_author: e.target.value})}
                                       className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-900 dark:text-white"
                                       placeholder="Ej: Benito Pérez Galdós"
                                     />
                                 </div>
                             </>
                         )}
                     </div>
                </div>
            )}

             {/* Common Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enlace de Destino (Opcional)</label>
                <input
                  type="text"
                  value={newBanner.link_url}
                  onChange={e => setNewBanner({...newBanner, link_url: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-900 dark:text-white"
                  placeholder="https://... o /catalogo"
                />
              </div>

             <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="active"
                checked={newBanner.active}
                onChange={e => setNewBanner({...newBanner, active: e.target.checked})}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-slate-900 dark:border-slate-600"
              />
              <label htmlFor="active" className="text-sm text-gray-700 dark:text-gray-300">Activar inmediatamente</label>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" className="btn-primary">
                {editingId ? 'Guardar Cambios' : 'Guardar Banner'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map(banner => (
            <div key={banner.id} className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border ${banner.active ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-200 dark:border-slate-700'} overflow-hidden transition-all hover:shadow-md flex flex-col`}>
              {/* Preview Area */}
              <div className="relative h-48 bg-gray-100 dark:bg-slate-900 overflow-hidden">
                {banner.banner_type === 'image' && banner.image_url ? (
                   <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                ) : (
                   <div className={`w-full h-full flex flex-col items-center justify-center p-4 text-center ${
                       banner.banner_type === 'discount' ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white' :
                       banner.banner_type === 'last_minute' ? 'bg-gradient-to-br from-red-500 to-orange-600 text-white' :
                       banner.banner_type === 'exclusive' ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white' :
                       'bg-gray-200 dark:bg-slate-700 text-gray-500'
                   }`}>
                       {getBannerIcon(banner.banner_type)}
                       <span className="font-bold mt-2 truncate w-full px-2">{banner.custom_title || banner.title}</span>
                       <span className="text-xs opacity-75 mt-1 px-4 line-clamp-2" dangerouslySetInnerHTML={{ __html: banner.custom_description || getBannerLabel(banner.banner_type) }}></span>
                   </div>
                )}
                
                <div className="absolute top-2 right-2 flex gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${banner.active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300'}`}>
                        {banner.active ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                </div>
                
                {/* Date Badge */}
                {(banner.start_date || banner.end_date) && (
                     <div className="absolute bottom-2 left-2 flex gap-1 items-center bg-black/50 text-white px-2 py-1 rounded text-[10px] backdrop-blur-sm">
                         <Calendar size={10} />
                         {banner.end_date ? new Date(banner.end_date).toLocaleDateString() : 'Siempre'}
                     </div>
                )}
              </div>
              
              <div className="p-4 flex-grow">
                <div className="flex items-center gap-2 mb-1">
                    {getBannerIcon(banner.banner_type)}
                    <h3 className="font-bold text-gray-800 dark:text-white truncate" title={banner.title}>{banner.title}</h3>
                </div>
                
                {banner.link_url && (
                  <a href={banner.link_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1 truncate dark:text-blue-400">
                    <ExternalLink size={14} />
                    {banner.link_url}
                  </a>
                )}
              </div>

               <div className="px-4 pb-4 mt-auto">
                    <div className="flex justify-between items-center border-t border-gray-100 dark:border-slate-700 pt-4">
                        <button
                            onClick={() => toggleStatus(banner.id, banner.active)}
                            className={`flex items-center gap-1 text-sm ${banner.active ? 'text-amber-600 hover:text-amber-700 dark:text-amber-500' : 'text-green-600 hover:text-green-700 dark:text-green-400'}`}
                        >
                            {banner.active ? (
                                <><EyeOff size={16} /> Desactivar</>
                            ) : (
                                <><Eye size={16} /> Activar</>
                            )}
                        </button>
                        
                        <div className="flex gap-2">
                             <button
                                onClick={() => handleEdit(banner)}
                                className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                title="Editar"
                            >
                                <Pencil size={18} />
                            </button>
                            <button 
                                onClick={() => handleDelete(banner.id)}
                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Eliminar"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          ))}
          {/* Empty state ... */}
          
          {banners.length === 0 && !isAdding && (
            <div className="col-span-full text-center py-12 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-gray-300 dark:border-slate-600">
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-slate-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No hay banners</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Comienza creando un nuevo banner publicitario.</p>
              <button
                onClick={() => setIsAdding(true)}
                className="mt-6 btn-primary inline-flex items-center"
              >
                <Plus size={16} className="mr-2" />
                Crear Banner
              </button>
            </div>
          )}
        </div>
      )}

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
