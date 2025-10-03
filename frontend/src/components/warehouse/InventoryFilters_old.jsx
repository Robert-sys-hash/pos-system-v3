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
  }, [filters.search]); // Usunięto onFilter z dependencies

  // Immediate filter for non-search changes
  useEffect(() => {
    onFilter(filters);
  }, [filters.category, filters.available_only]); // Usunięto onFilter z dependencies

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
    <div className="card shadow-sm mb-4">
      <div className="card-header bg-light border-0">
        <div className="row align-items-center">
          <div className="col">
            <h6 className="mb-0 text-dark">
              <i className="fas fa-filter text-primary me-2"></i>
              Filtry wyszukiwania
            </h6>
          </div>
          <div className="col-auto">
            <div className="d-flex align-items-center gap-3">
              <span className="badge bg-primary rounded-pill">
                <i className="fas fa-box me-1"></i>
                {totalProducts} produktów
              </span>
              {hasActiveFilters && (
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={clearFilters}
                  title="Wyczyść filtry"
                >
                  <i className="fas fa-times me-1"></i>
                  Wyczyść
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="card-body">
        <div className="row g-3">
          {/* Wyszukiwanie */}
          <div className="col-lg-6">
            <label className="form-label fw-semibold">
              <i className="fas fa-search text-muted me-1"></i>
              Wyszukaj produkty
            </label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <i className="fas fa-search text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="Nazwa, opis, kod kreskowy..."
                value={filters.search}
                onChange={handleSearchChange}
                disabled={loading}
              />
              {filters.search && (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                  title="Wyczyść wyszukiwanie"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          </div>

          {/* Kategoria */}
          <div className="col-lg-3">
            <label className="form-label fw-semibold">
              <i className="fas fa-tags text-muted me-1"></i>
              Kategoria
            </label>
            <select
              className="form-select"
              value={filters.category}
              onChange={handleCategoryChange}
              disabled={loading}
            >
              <option value="">🏷️ Wszystkie kategorie</option>
              {categories.map((category, index) => (
                <option key={index} value={category.name}>
                  {category.name} ({category.product_count || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Opcje dodatkowe */}
          <div className="col-lg-3">
            <label className="form-label fw-semibold">
              <i className="fas fa-sliders-h text-muted me-1"></i>
              Opcje
            </label>
            <div className="form-check form-switch mt-2">
              <input
                className="form-check-input"
                type="checkbox"
                id="available-only"
                checked={filters.available_only}
                onChange={handleAvailableOnlyChange}
                disabled={loading}
              />
              <label className="form-check-label" htmlFor="available-only">
                <i className="fas fa-check-circle text-success me-1"></i>
                Tylko dostępne
              </label>
            </div>
          </div>
        </div>

        {/* Szybkie filtry */}
        <div className="row mt-3">
          <div className="col">
            <div className="d-flex flex-wrap gap-2">
              <span className="text-muted small">Szybkie filtry:</span>
              
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => setFilters(prev => ({ ...prev, available_only: false, search: 'stan:0' }))}
                disabled={loading}
              >
                <i className="fas fa-exclamation-triangle me-1"></i>
                Brak na stanie
              </button>
              
              <button
                className="btn btn-sm btn-outline-warning"
                onClick={() => setFilters(prev => ({ ...prev, search: 'niski_stan' }))}
                disabled={loading}
              >
                <i className="fas fa-exclamation me-1"></i>
                Niski stan
              </button>
              
              <button
                className="btn btn-sm btn-outline-success"
                onClick={() => setFilters(prev => ({ ...prev, available_only: true }))}
                disabled={loading}
              >
                <i className="fas fa-check me-1"></i>
                Dostępne
              </button>

              {hasActiveFilters && (
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={clearFilters}
                  disabled={loading}
                >
                  <i className="fas fa-times me-1"></i>
                  Wyczyść wszystko
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Podsumowanie aktywnych filtrów */}
        {hasActiveFilters && (
          <div className="row mt-2">
            <div className="col">
              <div className="d-flex flex-wrap gap-1">
                <small className="text-muted">Aktywne filtry:</small>
                
                {filters.search && (
                  <span className="badge bg-primary">
                    Szukaj: "{filters.search}"
                    <button
                      className="btn-close btn-close-white ms-1"
                      style={{ fontSize: '0.6em' }}
                      onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                    ></button>
                  </span>
                )}
                
                {filters.category && (
                  <span className="badge bg-secondary">
                    Kategoria: {filters.category}
                    <button
                      className="btn-close btn-close-white ms-1"
                      style={{ fontSize: '0.6em' }}
                      onClick={() => setFilters(prev => ({ ...prev, category: '' }))}
                    ></button>
                  </span>
                )}
                
                {filters.available_only && (
                  <span className="badge bg-success">
                    Tylko dostępne
                    <button
                      className="btn-close btn-close-white ms-1"
                      style={{ fontSize: '0.6em' }}
                      onClick={() => setFilters(prev => ({ ...prev, available_only: false }))}
                    ></button>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryFilters;
