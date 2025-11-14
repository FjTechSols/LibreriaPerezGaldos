import React from 'react';
import { Filter, SlidersHorizontal, Grid2x2 as Grid, List } from 'lucide-react';
import { FilterState } from '../types';
import { categories } from '../data/categories';
import { useLanguage } from '../context/LanguageContext';
import '../styles/components/BookFilter.css';

interface BookFilterProps {
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function BookFilter({ filters, onFiltersChange, viewMode, onViewModeChange }: BookFilterProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { language } = useLanguage();

  return (
    <div className="book-filter">
      <div className="filter-header">
        <div className="filter-controls">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="filter-toggle"
          >
            <SlidersHorizontal size={20} />
            {language === 'es' ? 'Filtros' : language === 'en' ? 'Filters' : 'Filtres'}
          </button>
          
          <div className="view-toggle">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              aria-label="Vista en cuadrícula"
            >
              <Grid size={20} />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              aria-label="Vista en lista"
            >
              <List size={20} />
            </button>
          </div>
        </div>

        <div className="sort-controls">
          <select 
            value={filters.sortBy}
            onChange={(e) => onFiltersChange({ sortBy: e.target.value as FilterState['sortBy'] })}
            className="sort-select"
          >
            <option value="title">{language === 'es' ? 'Título' : language === 'en' ? 'Title' : 'Titre'}</option>
            <option value="price">{language === 'es' ? 'Precio' : language === 'en' ? 'Price' : 'Prix'}</option>
            <option value="rating">{language === 'es' ? 'Valoración' : language === 'en' ? 'Rating' : 'Évaluation'}</option>
            <option value="newest">{language === 'es' ? 'Más recientes' : language === 'en' ? 'Newest' : 'Plus récents'}</option>
          </select>
          
          <select 
            value={filters.sortOrder}
            onChange={(e) => onFiltersChange({ sortOrder: e.target.value as FilterState['sortOrder'] })}
            className="sort-select"
          >
            <option value="asc">{language === 'es' ? 'Ascendente' : language === 'en' ? 'Ascending' : 'Ascendant'}</option>
            <option value="desc">{language === 'es' ? 'Descendente' : language === 'en' ? 'Descending' : 'Descendant'}</option>
          </select>
        </div>
      </div>

      {isExpanded && (
        <>
        <div className="filter-panel">
          <div className="filter-group">
            <label className="filter-label">{language === 'es' ? 'Categoría' : language === 'en' ? 'Category' : 'Catégorie'}</label>
            <select
              value={filters.category}
              onChange={(e) => onFiltersChange({ category: e.target.value })}
              className="filter-select"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">{language === 'es' ? 'Disponibilidad' : language === 'en' ? 'Availability' : 'Disponibilité'}</label>
            <select
              value={filters.availability}
              onChange={(e) => onFiltersChange({ availability: e.target.value as FilterState['availability'] })}
              className="filter-select"
            >
              <option value="all">{language === 'es' ? 'Todos' : language === 'en' ? 'All' : 'Tous'}</option>
              <option value="inStock">{language === 'es' ? 'En stock' : language === 'en' ? 'In Stock' : 'En stock'}</option>
              <option value="outOfStock">{language === 'es' ? 'Sin stock' : language === 'en' ? 'Out of Stock' : 'Épuisé'}</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">{language === 'es' ? 'Rango de Precio' : language === 'en' ? 'Price Range' : 'Fourchette de Prix'}</label>
            <div className="price-range">
              <input
                type="number"
                placeholder={language === 'es' ? 'Mín' : language === 'en' ? 'Min' : 'Min'}
                value={filters.priceRange[0] || ''}
                onChange={(e) => onFiltersChange({
                  priceRange: [Number(e.target.value) || 0, filters.priceRange[1]]
                })}
                className="price-input"
              />
              <span className="price-separator">-</span>
              <input
                type="number"
                placeholder={language === 'es' ? 'Máx' : language === 'en' ? 'Max' : 'Max'}
                value={filters.priceRange[1] || ''}
                onChange={(e) => onFiltersChange({
                  priceRange: [filters.priceRange[0], Number(e.target.value) || 1000]
                })}
                className="price-input"
              />
            </div>
          </div>
        </div>
        <div className="filter-actions">
          <button
            onClick={() => onFiltersChange({
              category: 'Todos',
              availability: 'all',
              priceRange: [0, 1000],
              sortBy: 'title',
              sortOrder: 'asc'
            })}
            className="clear-filters-btn"
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