import { useEffect, useState } from 'react';
import { Filter, SlidersHorizontal, Grid2x2 as Grid, List } from 'lucide-react';
import { FilterState } from '../types';
import { getCategorias } from '../services/categoriaService';
import { buscarEditoriales } from '../services/libroService';
import { useLanguage } from '../context/LanguageContext';
import '../styles/components/BookFilter.css';

interface BookFilterProps {
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function BookFilter({ filters, onFiltersChange, viewMode, onViewModeChange }: BookFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { language } = useLanguage();
  const [categories, setCategories] = useState<string[]>(['Todos']);
  const [publisherInput, setPublisherInput] = useState(filters.publisher || '');
  const [publisherSuggestions, setPublisherSuggestions] = useState<{id: number, nombre: string}[]>([]); 

  useEffect(() => {
     if (filters.publisher !== undefined && filters.publisher !== publisherInput) {
         setPublisherInput(filters.publisher);
     } else if (filters.publisher === undefined && publisherInput !== '') {
         setPublisherInput('');
     }
  }, [filters.publisher]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategorias();
        if (data && data.length > 0) {
          // Add 'Todos' and then map DB categories to names
          setCategories(['Todos', ...data.map(c => c.nombre)]);
        }
      } catch (error) {
        console.error('Failed to load categories', error);
      }
    };
    loadCategories();
  }, []);

  return (

    <div className="Book-Filter">
      <div className="Book-Filter__header">
        <div className="Book-Filter__controls-left">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="Book-Filter__toggle-filters"
          >
            <SlidersHorizontal size={20} />
            {language === 'es' ? 'Filtros' : language === 'en' ? 'Filters' : 'Filtres'}
          </button>
          
          <div className="Book-Filter__view-switch">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`Book-Filter__view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              aria-label="Vista en cuadrícula"
              title="Vista en cuadrícula"
            >
              <Grid size={24} />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`Book-Filter__view-btn ${viewMode === 'list' ? 'active' : ''}`}
              aria-label="Vista en lista"
              title="Vista en lista"
            >
              <List size={24} />
            </button>
          </div>
        </div>

        <div className="Book-Filter__controls-center">
             <button
                className={`Book-Filter__quick-btn ${filters.featured ? 'active' : ''}`}
                onClick={() => onFiltersChange({ featured: !filters.featured, onSale: false, isNew: false })}
                title={language === 'es' ? 'Destacados' : 'Featured'}
              >
                {language === 'es' ? 'Destacados' : 'Featured'}
              </button>
              <button
                className={`Book-Filter__quick-btn ${filters.onSale ? 'active' : ''}`}
                onClick={() => onFiltersChange({ onSale: !filters.onSale, featured: false, isNew: false })}
                title={language === 'es' ? 'Ofertas' : 'Offers'}
              >
                {language === 'es' ? 'Ofertas' : 'Offers'}
              </button>
              <button
                className={`Book-Filter__quick-btn ${filters.isNew ? 'active' : ''}`}
                onClick={() => onFiltersChange({ isNew: !filters.isNew, featured: false, onSale: false })}
                title={language === 'es' ? 'Novedades' : 'New Arrivals'}
              >
                 {language === 'es' ? 'Novedades' : 'New'}
              </button>
        </div>

        <div className="Book-Filter__controls-right">
          <select 
            value={filters.sortBy}
            onChange={(e) => onFiltersChange({ sortBy: e.target.value as FilterState['sortBy'] })}
            className="Book-Filter__sort-select"
          >
            <option value="default">{language === 'es' ? 'Por defecto' : language === 'en' ? 'Default' : 'Par défaut'}</option>
            <option value="title">{language === 'es' ? 'Título' : language === 'en' ? 'Title' : 'Titre'}</option>
            <option value="price">{language === 'es' ? 'Precio' : language === 'en' ? 'Price' : 'Prix'}</option>
            <option value="rating">{language === 'es' ? 'Valoración' : language === 'en' ? 'Rating' : 'Évaluation'}</option>
            <option value="newest">{language === 'es' ? 'Más recientes' : language === 'en' ? 'Newest' : 'Plus récents'}</option>
          </select>
          
          <select 
            value={filters.sortOrder}
            onChange={(e) => onFiltersChange({ sortOrder: e.target.value as FilterState['sortOrder'] })}
            className="Book-Filter__sort-select"
          >
            <option value="asc">{language === 'es' ? 'Ascendente' : language === 'en' ? 'Ascending' : 'Ascendant'}</option>
            <option value="desc">{language === 'es' ? 'Descendente' : language === 'en' ? 'Descending' : 'Descendant'}</option>
          </select>
        </div>
      </div>

      {isExpanded && (
        <>
        <div className="Book-Filter__panel">
          <div className="Book-Filter__group">
            <label className="Book-Filter__label">{language === 'es' ? 'Categoría' : language === 'en' ? 'Category' : 'Catégorie'}</label>
            <select
              value={filters.category}
              onChange={(e) => onFiltersChange({ category: e.target.value })}
              className="Book-Filter__input-select"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="Book-Filter__group relative-group">
            <label className="Book-Filter__label">{language === 'es' ? 'Editorial' : 'Publisher'}</label>
            <div className="Book-Filter__autocomplete">
                <input
                  type="text"
                  value={publisherInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPublisherInput(val);
                    if (val.length < 2) {
                        setPublisherSuggestions([]);
                        return;
                    }
                    if (val.length >= 2) {
                        // Debounce manually or simple call
                        // For simplicity in this quick implementation, we call directly but ideally debounce
                        // Considering low traffic, direct call is okay-ish, but debounce is better.
                        // We'll use a timeout ref if we want, but let's just let it be responsive for now
                         buscarEditoriales(val).then(setPublisherSuggestions);
                    }
                  }}
                  onBlur={() => {
                      // Delayed clear to allow click on suggestion
                      setTimeout(() => {
                           if (!filters.publisher && publisherInput.length > 0) {
                               // If user typed but didn't select, apply what they typed?
                               onFiltersChange({ publisher: publisherInput });
                           }
                           setPublisherSuggestions([]);
                      }, 200);
                  }}
                  onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                          onFiltersChange({ publisher: publisherInput });
                          setPublisherSuggestions([]);
                      }
                  }}
                  placeholder={language === 'es' ? 'Buscar editorial...' : 'Search publisher...'}
                  className="Book-Filter__input-text"
                />
                
                {publisherSuggestions.length > 0 && (
                    <div className="Book-Filter__suggestions">
                        {publisherSuggestions.map(pub => (
                            <div 
                                key={pub.id} 
                                className="Book-Filter__suggestion-item"
                                onClick={() => {
                                    setPublisherInput(pub.nombre);
                                    onFiltersChange({ publisher: pub.nombre });
                                    setPublisherSuggestions([]);
                                }}
                            >
                                {pub.nombre}
                            </div>
                        ))}
                    </div>
                )}
            </div>
             {filters.publisher && (
                  <button 
                      className="Book-Filter__clear-badg"
                      onClick={() => {
                          setPublisherInput('');
                          onFiltersChange({ publisher: undefined });
                      }}
                  >
                      ✕
                  </button>
             )}
          </div>



          <div className="Book-Filter__group">
            <label className="Book-Filter__label">{language === 'es' ? 'Rango de Precio' : language === 'en' ? 'Price Range' : 'Fourchette de Prix'}</label>
            <div className="Book-Filter__price-range">
              <input
                type="number"
                placeholder={language === 'es' ? 'Mín' : language === 'en' ? 'Min' : 'Min'}
                value={filters.priceRange[0] || ''}
                onChange={(e) => onFiltersChange({
                  priceRange: [Number(e.target.value) || 0, filters.priceRange[1]]
                })}
                className="Book-Filter__input-price"
              />
              <span className="Book-Filter__price-separator">-</span>
              <input
                type="number"
                placeholder={language === 'es' ? 'Máx' : language === 'en' ? 'Max' : 'Max'}
                value={filters.priceRange[1] || ''}
                onChange={(e) => onFiltersChange({
                  priceRange: [filters.priceRange[0], Number(e.target.value) || 1000]
                })}
                className="Book-Filter__input-price"
              />
            </div>
          </div>
        </div>
        <div className="Book-Filter__actions">
          <button
            onClick={() => onFiltersChange({
              category: 'Todos',
              availability: 'inStock',
              priceRange: [0, 1000],
              sortBy: 'default',
              sortOrder: 'asc'
            })}
            className="Book-Filter__btn-clear"
          >
            <Filter size={16} />
            {language === 'es' ? 'Limpiar Filtros' : language === 'en' ? 'Clear Filters' : 'Effacer les Filtres'}
          </button>
        </div>
        </>
      )}
    </div>
  );
}