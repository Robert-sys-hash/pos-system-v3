import React, { useState, useEffect } from 'react';
import { productService } from '../../services/productService';

const ProductSearch = ({ 
  onProductSelect, 
  selectedProducts = [], 
  searchQuery = '', 
  onSearchQueryChange = null,
  selectedCategory = '',
  onlyAvailable = true,
  showFilters = true,
  locationId = null
}) => {
  const [query, setQuery] = useState(searchQuery);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [internalSelectedCategory, setInternalSelectedCategory] = useState(selectedCategory);
  const [internalOnlyAvailable, setInternalOnlyAvailable] = useState(onlyAvailable);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);

  // Używaj zewnętrznych wartości jeśli są przekazane
  const currentCategory = showFilters ? internalSelectedCategory : selectedCategory;
  const currentOnlyAvailable = showFilters ? internalOnlyAvailable : onlyAvailable;

  // Załaduj kategorie przy inicjalizacji
  useEffect(() => {
    if (showFilters) {
      loadCategories();
    }
  }, [showFilters]);

  // Synchronizuj zewnętrzny searchQuery
  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  // Debounced search
  useEffect(() => {
    if (query.length < 2 && !currentCategory) {
      setProducts([]);
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchProducts();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, currentCategory, currentOnlyAvailable]);

  const loadCategories = async () => {
    try {
      const response = await productService.getCategories();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (err) {
      console.error('Błąd ładowania kategorii:', err);
    }
  };

  const searchProducts = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🔍 ProductSearch - wyszukiwanie z locationId:', locationId);
      const response = await productService.searchProducts(query, currentCategory, 50, locationId);
      
      if (response.success) {
        let allProducts = response.data.products || response.data || [];
        
        console.log('🔍 ProductSearch - otrzymane produkty:', allProducts.length);
        
        // Filtruj produkty z niezerowym stanem jeśli opcja jest włączona
        if (currentOnlyAvailable) {
          const availableProducts = allProducts.filter(product => {
            const stock = product.stock_quantity || 0;
            return stock > 0;
          });
          console.log('🔍 ProductSearch - produkty dostępne:', availableProducts.length);
          allProducts = availableProducts;
        }
        
        setProducts(allProducts.slice(0, 15)); // Ogranicz do 15 wyników
        setShowResults(true);
      } else {
        setError(response.message);
        setProducts([]);
      }
    } catch (err) {
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product) => {
    onProductSelect(product);
    const newQuery = '';
    setQuery(newQuery);
    if (onSearchQueryChange) {
      onSearchQueryChange(newQuery);
    }
    setShowResults(false);
  };

  const handleQueryChange = (newQuery) => {
    setQuery(newQuery);
    if (onSearchQueryChange) {
      onSearchQueryChange(newQuery);
    }
  };

  const handleBarcodeSearch = async (barcode) => {
    if (!barcode) return;
    
    setLoading(true);
    try {
      const response = await productService.getProductByBarcode(barcode);
      if (response.success) {
        handleProductSelect(response.data);
      } else {
        setError('Produkt o podanym kodzie kreskowym nie został znaleziony');
      }
    } catch (err) {
      setError('Błąd wyszukiwania po kodzie kreskowym');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Sprawdź czy to może być kod kreskowy (tylko cyfry, długość > 8)
      const isBarcodePattern = /^\d{8,}$/.test(query);
      if (isBarcodePattern) {
        handleBarcodeSearch(query);
      } else if (products.length > 0) {
        handleProductSelect(products[0]);
      }
    }
  };

  const isProductSelected = (productId) => {
    return selectedProducts.some(item => item.product_id === productId || item.id === productId);
  };

  return (
    <div style={{ 
      width: '100%', 
      backgroundColor: 'white',
      border: '1px solid #e9ecef',
      borderRadius: '0.375rem',
      padding: '1rem',
      boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
    }}>

      {/* Kontrolki wyszukiwania */}
      <div style={{ 
        display: 'flex', 
        gap: '0.75rem', 
        alignItems: 'end',
        flexWrap: 'nowrap',
        marginBottom: '1rem'
      }}>
        {/* Wyszukiwanie - pełna szerokość gdy brak filtrów */}
        <div style={{ flex: showFilters ? '0 0 45%' : '1', minWidth: '200px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Nazwa produktu lub kod kreskowy..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyPress={handleKeyPress}
              autoComplete="off"
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
            {loading && (
              <div style={{ 
                position: 'absolute',
                right: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6c757d'
              }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '0.75rem' }}></i>
              </div>
            )}
            {query && !loading && (
              <button
                type="button"
                onClick={() => {
                  handleQueryChange('');
                  setShowResults(false);
                }}
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

        {/* Kategoria - 30% szerokości - tylko gdy showFilters=true */}
        {showFilters && (
          <div style={{ flex: '0 0 30%', minWidth: '110px' }}>
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
              value={internalSelectedCategory}
              onChange={(e) => setInternalSelectedCategory(e.target.value)}
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
        )}

        {/* Checkbox - 25% szerokości - tylko gdy showFilters=true */}
        {showFilters && (
          <div style={{ flex: '0 0 25%', minWidth: '100px' }}>
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
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              border: '1px solid #e9ecef',
              borderRadius: '0.25rem',
              backgroundColor: '#f8f9fa',
              height: '33px' // Wyrównanie wysokości z selectem
            }}>
              <input
                type="checkbox"
                id="onlyAvailableInternal"
                checked={internalOnlyAvailable}
                onChange={(e) => setInternalOnlyAvailable(e.target.checked)}
                style={{ marginRight: '0.4rem' }}
              />
              <label htmlFor="onlyAvailableInternal" style={{ 
                margin: 0, 
                cursor: 'pointer',
                fontSize: '0.7rem',
                whiteSpace: 'nowrap'
              }}>
                <i className="fas fa-box me-1" style={{ color: '#198754' }}></i>
                Dostępne
              </label>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fff3cd',
          color: '#856404',
          border: '1px solid #ffeaa7',
          borderRadius: '0.375rem',
          padding: '0.75rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.8rem'
        }}>
          <i className="fas fa-exclamation-triangle" style={{ color: '#856404' }}></i>
          {error}
        </div>
      )}

      {showResults && products.length > 0 && (
        <div style={{ 
          border: '1px solid #e9ecef', 
          borderRadius: '0.375rem',
          overflow: 'hidden',
          maxHeight: '350px',
          overflowY: 'auto',
          backgroundColor: 'white'
        }}>
          <table style={{ 
            width: '100%', 
            fontSize: '11px',
            borderCollapse: 'collapse'
          }}>
            <thead style={{ 
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid #dee2e6',
              position: 'sticky',
              top: 0,
              zIndex: 1
            }}>
              <tr>
                <th style={{ 
                  padding: '0.5rem', 
                  textAlign: 'left',
                  fontWeight: '600',
                  fontSize: '0.75rem',
                  color: '#495057'
                }}>
                  Produkt
                </th>
                <th style={{ 
                  padding: '0.5rem', 
                  textAlign: 'center',
                  fontWeight: '600',
                  fontSize: '0.75rem',
                  color: '#495057',
                  width: '80px'
                }}>
                  Stan
                </th>
                <th style={{ 
                  padding: '0.5rem', 
                  textAlign: 'right',
                  fontWeight: '600',
                  fontSize: '0.75rem',
                  color: '#495057',
                  width: '80px'
                }}>
                  Cena
                </th>
                <th style={{ 
                  padding: '0.5rem', 
                  textAlign: 'center',
                  fontWeight: '600',
                  fontSize: '0.75rem',
                  color: '#495057',
                  width: '80px'
                }}>
                  Akcja
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const stock = product.stock_quantity || product.stan_magazynowy || 0;
                const price = product.price || product.cena || 0;
                const isSelected = isProductSelected(product.id);
                const isOutOfStock = stock <= 0;
                
                return (
                  <tr 
                    key={product.id}
                    onClick={() => !isOutOfStock && handleProductSelect(product)}
                    style={{
                      borderBottom: '1px solid #f1f3f4',
                      backgroundColor: isSelected ? '#e7f3ff' : 'white',
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                      opacity: isOutOfStock ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!isOutOfStock && !isSelected) {
                        e.target.style.backgroundColor = '#f8f9fa';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isOutOfStock && !isSelected) {
                        e.target.style.backgroundColor = 'white';
                      }
                    }}
                  >
                    <td style={{ padding: '6px 8px' }}>
                      <div style={{ 
                        fontWeight: '500', 
                        fontSize: '11px',
                        color: isOutOfStock ? '#6c757d' : '#212529',
                        marginBottom: '2px'
                      }}>
                        {product.name || product.nazwa}
                        {isSelected && (
                          <i className="fas fa-check text-success ms-1" style={{ fontSize: '10px' }}></i>
                        )}
                      </div>
                      {(product.barcode || product.kod_kreskowy) && (
                        <div style={{ 
                          fontSize: '9px', 
                          color: '#6c757d',
                          fontFamily: 'monospace'
                        }}>
                          {product.barcode || product.kod_kreskowy}
                        </div>
                      )}
                      {(product.category || product.kategoria) && (
                        <span style={{
                          fontSize: '8px',
                          backgroundColor: '#e9ecef',
                          color: '#495057',
                          padding: '1px 4px',
                          borderRadius: '2px',
                          marginTop: '2px',
                          display: 'inline-block'
                        }}>
                          {product.category || product.kategoria}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '500',
                        color: stock > 10 ? '#198754' : stock > 0 ? '#fd7e14' : '#dc3545',
                        backgroundColor: stock > 10 ? '#d1e7dd' : stock > 0 ? '#fff3cd' : '#f8d7da',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        border: `1px solid ${stock > 10 ? '#badbcc' : stock > 0 ? '#ffeaa7' : '#f5c6cb'}`
                      }}>
                        {stock} {product.unit || product.jednostka || 'szt'}
                      </span>
                      {isOutOfStock && (
                        <div style={{ 
                          fontSize: '8px', 
                          color: '#dc3545',
                          fontWeight: '600',
                          marginTop: '2px'
                        }}>
                          BRAK
                        </div>
                      )}
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'right',
                      fontWeight: '600',
                      fontSize: '11px',
                      color: isOutOfStock ? '#6c757d' : '#198754'
                    }}>
                      {price.toFixed(2)} zł
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isOutOfStock) {
                            handleProductSelect(product);
                          }
                        }}
                        disabled={isOutOfStock}
                        style={{
                          backgroundColor: isOutOfStock ? '#6c757d' : isSelected ? '#198754' : '#0d6efd',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          padding: '3px 8px',
                          fontSize: '9px',
                          cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                          fontWeight: '500'
                        }}
                        title={isOutOfStock ? 'Brak na stanie' : isSelected ? 'Już w koszyku' : 'Dodaj do koszyka'}
                      >
                        {isOutOfStock ? '✕' : isSelected ? '✓' : '+'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showResults && products.length === 0 && !loading && (
        <div className="text-center py-3 text-muted">
          <i className="fas fa-search fa-2x mb-2"></i>
          <div>Nie znaleziono produktów</div>
        </div>
      )}
    </div>
  );
};

export default ProductSearch;
