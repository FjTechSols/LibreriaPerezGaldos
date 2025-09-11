import React from 'react';
import { Filter, SlidersHorizontal, Grid, List } from 'lucide-react';
import { FilterState } from '../../types';
import { categories } from '../../data/mockBooks';
import './BookFilter.css';

interface BookFilterProps {
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function BookFilter({ filters, onFiltersChange, viewMode, onViewModeChange }: BookFilterProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className="book-filter">
      <div className="filter-header">
        <div className="filter-controls">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="filter-toggle"
          >
            <SlidersHorizontal size={20} />
            Filtros
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
            <option value="title">Título</option>
            <option value="price">Precio</option>
            <option value="rating">Valoración</option>
            <option value="newest">Más recientes</option>
          </select>
          
          <select 
            value={filters.sortOrder}
            onChange={(e) => onFiltersChange({ sortOrder: e.target.value as FilterState['sortOrder'] })}
            className="sort-select"
          >
            <option value="asc">Ascendente</option>
            <option value="desc">Descendente</option>
          </select>
        </div>
      </div>

      {isExpanded && (
        <div className="filter-panel">
          <div className="filter-group">
            <label className="filter-label">Categoría</label>
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
            <label className="filter-label">Disponibilidad</label>
            <select 
              value={filters.availability}
              onChange={(e) => onFiltersChange({ availability: e.target.value as FilterState['availability'] })}
              className="filter-select"
            >
              <option value="all">Todos</option>
              <option value="inStock">En stock</option>
              <option value="outOfStock">Sin stock</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Rango de Precio</label>
            <div className="price-range">
              <input
                type="number"
                placeholder="Mín"
                value={filters.priceRange[0] || ''}
                onChange={(e) => onFiltersChange({ 
                  priceRange: [Number(e.target.value) || 0, filters.priceRange[1]] 
                })}
                className="price-input"
              />
              <span className="price-separator">-</span>
              <input
                type="number"
                placeholder="Máx"
                value={filters.priceRange[1] || ''}
                onChange={(e) => onFiltersChange({ 
                  priceRange: [filters.priceRange[0], Number(e.target.value) || 1000] 
                })}
                className="price-input"
              />
            </div>
          </div>

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
            Limpiar Filtros
          </button>
        </div>
      )}
    </div>
  );
}