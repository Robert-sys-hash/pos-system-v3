import React, { useState, useEffect } from 'react';

const InventoryFilters = ({ 
  onFilter, 
  categories = [], 
  loading = false,
  totalProducts = 0 
}) => {
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    available_only: false
  });

  const [searchTimeout, setSearchTimeout] = useState(null);

  // Debounced search
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      onFilter(filters);
    }, 300);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [filters.search]);

  // Immediate filter for non-search changes
  useEffect(() => {
    onFilter(filters);
  }, [filters.category, filters.available_only]);

  const handleSearchChange = (e) => {
    setFilters(prev => ({
      ...prev,
      search: e.target.value
    }));
  };

  const handleCategoryChange = (e) => {
    setFilters(prev => ({
      ...prev,
      category: e.target.value
    }));
  };

  const handleAvailableOnlyChange = (e) => {
    setFilters(prev => ({
      ...prev,
      available_only: e.target.checked
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      available_only: false
    });
  };

  const hasActiveFilters = filters.search || filters.category || filters.available_only;

  return (
    <div style={{ 
      width: '100%', 
      backgroundColor: 'white',
      border: '1px solid #e9ecef',
      borderRadius: '0.375rem',
      padding: '1rem',
      marginBottom: '1rem',
      boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '0.75rem'
      }}>
        <h6 style={{ 
          margin: 0, 
          color: '#495057', 
          fontWeight: '600',
          fontSize: '0.9rem'
        }}>
          <i className="fas fa-filter me-2" style={{ color: '#6c757d' }}></i>
          Filtry i wyszukiwanie
        </h6>
        <div style={{ 
          fontSize: '0.75rem', 
          color: '#6c757d',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <i className="fas fa-boxes"></i>
          <span>Znaleziono: <strong>{totalProducts}</strong> produktów</span>
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        gap: '0.75rem', 
        alignItems: 'end',
        flexWrap: 'wrap'
      }}>
        {/* Wyszukiwanie - 35% szerokości */}
        <div style={{ flex: '0 0 35%', minWidth: '250px' }}>
          <label style={{ 
            fontSize: '0.75rem', 
            fontWeight: '600',
            color: '#495057',
            display: 'block',
            marginBottom: '0.25rem'
          }}>
            <i className="fas fa-search me-1" style={{ color: '#17a2b8' }}></i>
            Wyszukaj produkty
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Nazwa, opis, kod kreskowy..."
              value={filters.search}
              onChange={handleSearchChange}
              disabled={loading}
              style={{ 
                width: '100%',
                padding: '0.375rem 0.75rem',
                paddingLeft: '2rem',
                fontSize: '0.8rem',
                border: '1px solid #ced4da',
                borderRadius: '0.25rem',
                boxSizing: 'border-box'
              }}
            />
            <i className="fas fa-search" style={{ 
              position: 'absolute',
              left: '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6c757d',
              fontSize: '0.75rem'
            }}></i>
            {filters.search && (
              <button
                type="button"
                onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                style={{ 
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'none',
                  color: '#6c757d',
                  cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
                title="Wyczyść wyszukiwanie"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </div>

        {/* Kategoria - 20% szerokości */}
        <div style={{ flex: '0 0 20%', minWidth: '150px' }}>
          <label style={{ 
            fontSize: '0.75rem', 
            fontWeight: '600',
            color: '#495057',
            display: 'block',
            marginBottom: '0.25rem'
          }}>
            <i className="fas fa-tags me-1" style={{ color: '#ffc107' }}></i>
            Kategoria
          </label>
          <select
            value={filters.category}
            onChange={handleCategoryChange}
            disabled={loading}
            style={{ 
              width: '100%',
              padding: '0.375rem 0.75rem',
              fontSize: '0.8rem',
              border: '1px solid #ced4da',
              borderRadius: '0.25rem',
              boxSizing: 'border-box'
            }}
          >
            <option value="">🏷️ Wszystkie</option>
            {categories.map((category, index) => (
              <option key={index} value={category.name}>
                {category.name} ({category.product_count || 0})
              </option>
            ))}
          </select>
        </div>

        {/* Checkbox - 25% szerokości */}
        <div style={{ flex: '0 0 25%', minWidth: '120px' }}>
          <label style={{ 
            fontSize: '0.75rem', 
            fontWeight: '600',
            color: '#495057',
            display: 'block',
            marginBottom: '0.25rem'
          }}>
            <i className="fas fa-eye me-1" style={{ color: '#28a745' }}></i>
            Widok
          </label>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            padding: '0.375rem 0.75rem',
            fontSize: '0.8rem',
            border: '1px solid #e9ecef',
            borderRadius: '0.25rem',
            backgroundColor: '#f8f9fa'
          }}>
            <input
              type="checkbox"
              id="available-only"
              checked={filters.available_only}
              onChange={handleAvailableOnlyChange}
              disabled={loading}
              style={{ marginRight: '0.5rem' }}
            />
            <label htmlFor="available-only" style={{ 
              margin: 0, 
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}>
              Tylko dostępne
            </label>
          </div>
        </div>

        {/* Akcje - 20% szerokości */}
        <div style={{ flex: '0 0 20%', minWidth: '140px' }}>
          <label style={{ 
            fontSize: '0.75rem', 
            fontWeight: '600',
            color: '#495057',
            display: 'block',
            marginBottom: '0.25rem'
          }}>
            <i className="fas fa-cog me-1" style={{ color: '#6c757d' }}></i>
            Akcje
          </label>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              type="button"
              onClick={clearFilters}
              disabled={loading}
              style={{ 
                padding: '0.375rem 0.5rem',
                fontSize: '0.7rem',
                border: '1px solid #dc3545',
                borderRadius: '0.25rem',
                backgroundColor: 'white',
                color: '#dc3545',
                cursor: 'pointer',
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem'
              }}
              title="Wyczyść wszystkie filtry"
            >
              <i className="fas fa-eraser"></i>
              <span>Wyczyść</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              disabled={loading}
              style={{ 
                padding: '0.375rem 0.5rem',
                fontSize: '0.7rem',
                border: '1px solid #17a2b8',
                borderRadius: '0.25rem',
                backgroundColor: 'white',
                color: '#17a2b8',
                cursor: 'pointer',
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem'
              }}
              title="Odśwież dane"
            >
              <i className="fas fa-sync-alt"></i>
              <span>Odśwież</span>
            </button>
          </div>
        </div>
      </div>

      {/* Aktywne filtry */}
      {hasActiveFilters && (
        <div style={{ 
          marginTop: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid #e9ecef'
        }}>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '0.5rem',
            alignItems: 'center'
          }}>
            <span style={{ 
              fontSize: '0.7rem', 
              color: '#6c757d',
              fontWeight: '600'
            }}>
              Aktywne filtry:
            </span>
            
            {filters.search && (
              <span style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.5rem',
                fontSize: '0.65rem',
                backgroundColor: '#17a2b8',
                color: 'white',
                borderRadius: '0.25rem'
              }}>
                Szukaj: "{filters.search}"
                <button
                  type="button"
                  onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                  style={{ 
                    border: 'none',
                    background: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.6rem',
                    marginLeft: '0.25rem'
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </span>
            )}
            
            {filters.category && (
              <span style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.5rem',
                fontSize: '0.65rem',
                backgroundColor: '#ffc107',
                color: '#212529',
                borderRadius: '0.25rem'
              }}>
                Kategoria: {filters.category}
                <button
                  type="button"
                  onClick={() => setFilters(prev => ({ ...prev, category: '' }))}
                  style={{ 
                    border: 'none',
                    background: 'none',
                    color: '#212529',
                    cursor: 'pointer',
                    fontSize: '0.6rem',
                    marginLeft: '0.25rem'
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </span>
            )}
            
            {filters.available_only && (
              <span style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.5rem',
                fontSize: '0.65rem',
                backgroundColor: '#28a745',
                color: 'white',
                borderRadius: '0.25rem'
              }}>
                Tylko dostępne
                <button
                  type="button"
                  onClick={() => setFilters(prev => ({ ...prev, available_only: false }))}
                  style={{ 
                    border: 'none',
                    background: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.6rem',
                    marginLeft: '0.25rem'
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryFilters;
