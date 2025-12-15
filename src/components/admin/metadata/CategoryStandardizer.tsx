import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { ArrowRight, Check, Search, RefreshCw } from 'lucide-react';
import { mergeCategories } from '../../../services/categoriaService';

const STANDARD_CATEGORIES = [
  'Arqueología', 'Arte', 'Autoayuda y Desarrollo Personal', 'Biografías y Memorias', 'Ciencia Ficción',
  'Ciencias Naturales (Física, Química, Biología)', 'Ciencias Sociales', 'Cine', 'Cocina y Gastronomía',
  'Cómics y Novela Gráfica', 'Crianza y Embarazo', 'Deportes', 'Derecho', 'Diccionarios y Enciclopedias',
  'Economía', 'Educación y Pedagogía', 'Empresa y Negocios', 'Erótica', 'Espiritualidad', 'Fantasía',
  'Filosofía', 'Finanzas e Inversión', 'Fotografía', 'Historia', 'Hogar y Jardín', 'Idiomas', 'Infantil',
  'Informática', 'Ingeniería', 'Juvenil (Young Adult)', 'Libros de Texto', 'Literatura',
  'Manga', 'Manualidades', 'Música', 'Naturaleza y Medio Ambiente', 'Novela Histórica', 'Novela Negra y Policial',
  'Ocio y Juegos', 'Oposiciones', 'Otros', 'Poesía', 'Política', 'Psicología', 'Religión', 'Romántica',
  'Salud y Bienestar', 'Teatro', 'Tecnología', 'Terror', 'Thriller y Misterio', 'Viajes'
];

interface Category {
  id: number;
  nombre: string;
  descripcion?: string;
  count?: number; 
}

export function CategoryStandardizer() {
  // State
  const [standardCats, setStandardCats] = useState<Category[]>([]);
  const [otherCats, setOtherCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<number>>(new Set());
  
  // Filtering
  const [targetFilter, setTargetFilter] = useState('');
  const [candidateFilter, setCandidateFilter] = useState('');
  
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
        // Fetch ALL categories
        // In a real app with 28k categories, this should be paginated or searched on server.
        // For the tool, let's try to fetch a reasonably large chunk or implement basic search.
        // Since the user wants to clean up "remaining" categories, maybe we limit to 2000 non-standard ones?
        const { data: allCats, error } = await supabase
            .from('categorias')
            .select('id, nombre, descripcion')
            .order('nombre')
            .limit(3000); // Safety limit for UI performance
            
        if (error) throw error;
        
        if (!allCats) {
             setLoading(false);
             return;
        }

        const stdSet = new Set(STANDARD_CATEGORIES.map(s => s.toLowerCase()));
        
        const standard: Category[] = [];
        const others: Category[] = [];

        // Distribute
        allCats.forEach(c => {
            if (stdSet.has(c.nombre.toLowerCase()) || c.descripcion === 'Categoría Estándar') {
                standard.push(c);
            } else {
                others.push(c);
            }
        });
        
        // Ensure ALL Standard Categories appear even if not in DB yet (optional, but good for UX)
        // (The user can create them just by selecting?)
        // Actually, better to just show what we have + maybe the ones from the list.
        
        // Merge missing standard categories into the list for selection
        // const existingStdNames = new Set(standard.map(c => c.nombre.toLowerCase())); // Removed unused
        
        // We can't really select a target if it doesn't exist in DB with an ID yet.
        // So we strictly stick to what's in DB for now. 
        // If "Historia" is missing in DB (unlikely), we can't merge TO it.
        
        standard.sort((a, b) => a.nombre.localeCompare(b.nombre));
        others.sort((a, b) => a.nombre.localeCompare(b.nombre));

        setStandardCats(standard);
        setOtherCats(others);
        
    } catch (err) {
        console.error("Error loading categories:", err);
    } finally {
        setLoading(false);
    }
  };

  /* New State for Progress */
  const [progressState, setProgressState] = useState({ current: 0, total: 0 });

  const ensureStandardCategories = async () => {
    if (!window.confirm('Esto verificará que existan todas las categorías estándar en la base de datos y las creará si faltan. ¿Continuar?')) return;
    
    setLoading(true);
    try {
        const { data: existing } = await supabase.from('categorias').select('nombre');
        const existingNames = new Set(existing?.map(c => c.nombre.toLowerCase()) || []);
        
        const toCreate = STANDARD_CATEGORIES.filter(c => !existingNames.has(c.toLowerCase()));
        
        if (toCreate.length === 0) {
            alert('Todas las categorías estándar ya existen.');
        } else {
            const { error } = await supabase.from('categorias').insert(
                toCreate.map(name => ({ nombre: name, descripcion: 'Categoría Estándar' }))
            );
            if (error) throw error;
            alert(`Se han creado ${toCreate.length} categorías faltantes (incluyendo 'Otros').`);
            await loadData(); // Reload to see them
        }
    } catch (err) {
        console.error(err);
        alert('Error al crear categorías.');
        setLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!selectedTargetId || selectedCandidates.size === 0) return;
    
    if (!window.confirm(`¿Estás seguro de fusionar ${selectedCandidates.size} categorías en la categoría seleccionada?`)) return;

    setMerging(true);
    setProgressState({ current: 0, total: selectedCandidates.size });

    try {
        const candidateIds = Array.from(selectedCandidates);
        
        const result = await mergeCategories(
            selectedTargetId, 
            candidateIds,
            (current, total) => setProgressState({ current, total })
        );
        
        if (result.success) {
            // Remove merged from 'others'
            setOtherCats(prev => prev.filter(c => !selectedCandidates.has(c.id)));
            setSelectedCandidates(new Set());
            alert('Fusión completada con éxito.');
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error(err);
        alert('Ocurrió un error inesperado.');
    } finally {
        setMerging(false);
        setProgressState({ current: 0, total: 0 });
    }
  };

  const toggleCandidate = (id: number) => {
    const next = new Set(selectedCandidates);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCandidates(next);
  };
  
  // Filtered Lists
  const filteredTargets = standardCats.filter(c => c.nombre.toLowerCase().includes(targetFilter.toLowerCase()));
  const filteredCandidates = otherCats.filter(c => c.nombre.toLowerCase().includes(candidateFilter.toLowerCase()));

  // UI Components
  return (
    <div className="standardizer-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', minHeight: '600px' }}>
      
      <div className="standardizer-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
         <div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Herramienta de Fusión Manual</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
               Selecciona una categoría destino (izquierda) y marcar las categorías a fusionar (derecha).
            </p>
         </div>
         <div style={{ display: 'flex', gap: '1rem' }}>
             <button 
               className="btn-secondary" 
               onClick={ensureStandardCategories}
               disabled={loading}
               title="Crear categorías estándar faltantes"
             >
               <RefreshCw size={18} style={{ marginRight: '8px' }} />
               Verificar Estándar
             </button>
             <button 
               className="btn-primary" 
               onClick={handleMerge}
               disabled={merging || !selectedTargetId || selectedCandidates.size === 0}
             >
               {merging ? 'Fusionando...' : `Fusionar Selección (${selectedCandidates.size})`}
               <ArrowRight size={18} style={{ marginLeft: '8px' }} />
             </button>
         </div>
      </div>

      {merging && progressState.total > 0 && (
         <div style={{ marginBottom: '1rem', width: '100%' }}>
            <div className="standardizer-progress-info">
                <span>Fusionando categorías...</span>
                <span>{progressState.current} / {progressState.total}</span>
            </div>
            <div style={{ width: '100%', background: 'var(--border-color)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                <div style={{
                    width: `${(progressState.current / progressState.total) * 100}%`,
                    height: '100%',
                    background: '#22c55e', // Success Green
                    transition: 'width 0.3s ease'
                }} />
            </div>
         </div>
      )}

      <div className="columns-wrapper" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flex: 1 }}>
         
         {/* LEFT COLUMN: TARGETS */}
         <div className="column-panel" style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)' }}>
            <div className="column-header" style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
               <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>1. Destino (Estándar)</h4>
               <div className="search-wrapper" style={{ width: '100%' }}>
                  <Search size={16} className="search-icon" />
                  <input 
                    type="text" 
                    className="search-input" 
                    placeholder="Filtrar estándar..."
                    value={targetFilter}
                    onChange={e => setTargetFilter(e.target.value)}
                  />
               </div>
            </div>
            <div className="column-list" style={{ flex: 1, overflowY: 'auto', padding: '0.5rem', maxHeight: '600px' }}>
               {filteredTargets.map(cat => (
                 <div 
                   key={cat.id}
                   onClick={() => setSelectedTargetId(cat.id)}
                   style={{
                     padding: '0.75rem',
                     cursor: 'pointer',
                     borderRadius: '6px',
                     marginBottom: '4px',
                     backgroundColor: selectedTargetId === cat.id ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                     border: selectedTargetId === cat.id ? '1px solid var(--primary-color)' : '1px solid transparent',
                     display: 'flex',
                     justifyContent: 'space-between',
                     alignItems: 'center',
                     color: 'var(--text-primary)'
                   }}
                 >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 500 }}>{cat.nombre}</span>
                        {cat.descripcion && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{cat.descripcion}</span>
                        )}
                    </div>
                    {selectedTargetId === cat.id && <Check size={16} color="var(--primary-color)" />}
                 </div>
               ))}
            </div>
         </div>

         {/* RIGHT COLUMN: CANDIDATES */}
         <div className="column-panel" style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)' }}>
            <div className="column-header" style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
               <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
    {selectedTargetId 
        ? `2. A Fusionar en: ${standardCats.find(c => c.id === selectedTargetId)?.nombre}` 
        : '2. A Fusionar (Otros)'}
</h4>
               <div className="search-wrapper" style={{ width: '100%' }}>
                  <Search size={16} className="search-icon" />
                  <input 
                    type="text" 
                    className="search-input" 
                    placeholder="Buscar para fusionar..."
                    value={candidateFilter}
                    onChange={e => setCandidateFilter(e.target.value)}
                  />
               </div>
            </div>
            <div className="column-list" style={{ flex: 1, overflowY: 'auto', padding: '0.5rem', maxHeight: '600px' }}>
               {filteredCandidates.length === 0 ? (
                 <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {loading ? 'Cargando...' : 'No hay categorías coinciden.'}
                 </div>
               ) : (
                   filteredCandidates.map(cat => (
                     <label 
                       key={cat.id}
                       style={{
                         padding: '0.75rem',
                         cursor: 'pointer',
                         borderRadius: '6px',
                         marginBottom: '4px',
                         backgroundColor: selectedCandidates.has(cat.id) ? 'rgba(239, 68, 68, 0.05)' : 'transparent', 
                         border: '1px solid transparent', 
                         display: 'flex',
                         alignItems: 'center',
                         gap: '0.75rem',
                         color: 'var(--text-primary)'
                       }}
                     >
                        <input 
                          type="checkbox" 
                          checked={selectedCandidates.has(cat.id)}
                          onChange={() => toggleCandidate(cat.id)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span>{cat.nombre}</span>
                     </label>
                   ))
               )}
            </div>
         </div>

      </div>
    </div>
  );
}
