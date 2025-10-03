import React, { useState, useEffect } from 'react';
import { productService } from '../services/productService';

// Komponent strony produktów - styl warehouse
const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await productService.getProducts();
      console.log('🔍 Pobrane produkty:', data);
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('❌ Błąd pobierania produktów:', err);
      setError('Błąd podczas pobierania produktów: ' + err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = Array.isArray(products) ? products.filter(product =>
    product.nazwa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.kod_produktu?.includes(searchTerm) ||
    product.ean?.includes(searchTerm) ||
    product.kategoria?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  if (loading) {
    return (
      <div style={{ padding: '2rem', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Ładowanie...</span>
          </div>
          <p className="mt-3">Ładowanie produktów...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div className="container-fluid" style={{ maxWidth: '1400px' }}>
        
        {/* Header - styl warehouse */}
        <div style={{
          padding: '1.5rem',
          marginBottom: '1.5rem',
          backgroundColor: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderRadius: '0.5rem',
          border: '1px solid #e9ecef',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
        }}>
          <div>
            <h2 style={{ margin: 0, color: '#495057', fontSize: '1.5rem', fontWeight: '600' }}>
              <i className="fas fa-box text-primary me-2"></i>
              Zarządzanie Produktami
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', color: '#6c757d', fontSize: '0.9rem' }}>
              Przeglądaj i zarządzaj produktami w systemie
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'white',
                backgroundColor: '#28a745',
                border: '1px solid #28a745',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onClick={fetchProducts}
              disabled={loading}
            >
              <i className="fas fa-sync-alt"></i>
              {loading ? 'Ładowanie...' : 'Odśwież'}
            </button>
          </div>
        </div>

        {/* Komunikaty błędów */}
        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setError('')}
            ></button>
          </div>
        )}

        {/* Kontrolki wyszukiwania */}
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          border: '1px solid #e9ecef',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ flex: '1', minWidth: '300px' }}>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Szukaj produktów po nazwie, kodzie lub kategorii..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <small className="text-muted">
              Znaleziono <strong>{filteredProducts.length}</strong> z <strong>{products.length}</strong> produktów
            </small>
          </div>
        </div>

        {/* Tabela produktów - uproszczona */}
        <div style={{ 
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.5rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
          overflowX: 'auto'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef'
          }}>
            <h6 style={{ 
              margin: 0, 
              color: '#495057', 
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              <i className="fas fa-table me-2" style={{ color: '#6c757d' }}></i>
              Lista produktów
            </h6>
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#6c757d',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <i className="fas fa-list"></i>
              <span>Produkty: <strong>{filteredProducts.length}</strong></span>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Ładowanie...</span>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-muted">
                <i className="fas fa-box-open fa-3x mb-3"></i>
                <h5>Brak produktów</h5>
                <p>{searchTerm ? 'Nie znaleziono produktów pasujących do wyszukiwania' : 'Dodaj pierwszy produkt aby rozpocząć'}</p>
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%',
                minWidth: '900px',
                fontSize: '0.8rem',
                borderCollapse: 'separate',
                borderSpacing: 0
              }}>
                <thead style={{ 
                  backgroundColor: '#f8f9fa',
                  borderBottom: '2px solid #dee2e6'
                }}>
                  <tr style={{ fontSize: '0.75rem' }}>
                    <th style={{ 
                      width: '40px', 
                      padding: '0.5rem 0.25rem',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#495057'
                    }}>ID</th>
                    <th style={{ 
                      minWidth: '250px', 
                      width: '30%', 
                      padding: '0.5rem 0.5rem',
                      fontWeight: '600',
                      color: '#495057'
                    }}>Produkt</th>
                    <th style={{ 
                      width: '130px', 
                      padding: '0.5rem 0.25rem',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#495057'
                    }}>Kod produktu</th>
                    <th style={{ 
                      width: '120px', 
                      padding: '0.5rem 0.25rem',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#495057'
                    }}>EAN</th>
                    <th style={{ 
                      width: '80px', 
                      padding: '0.5rem 0.25rem',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#495057'
                    }}>Kategoria</th>
                    <th style={{ 
                      width: '75px', 
                      padding: '0.5rem 0.25rem',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#495057'
                    }}>Cena</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product, index) => (
                    <tr key={product.id} style={{
                      backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                      borderBottom: '1px solid #e9ecef',
                      fontSize: '0.75rem'
                    }}>
                      <td style={{ 
                        padding: '0.4rem 0.25rem', 
                        textAlign: 'center',
                        color: '#6c757d',
                        fontWeight: '500'
                      }}>
                        {product.id}
                      </td>
                      <td style={{ 
                        padding: '0.4rem 0.5rem',
                        maxWidth: '250px'
                      }}>
                        <div style={{ 
                          fontWeight: '600',
                          color: '#212529',
                          marginBottom: '0.1rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {product.nazwa || 'Brak nazwy'}
                        </div>
                        {product.opis && (
                          <div style={{ 
                            color: '#6c757d',
                            fontSize: '0.7rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {product.opis}
                          </div>
                        )}
                      </td>
                      <td style={{ 
                        padding: '0.4rem 0.25rem', 
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        fontSize: '0.7rem'
                      }}>
                        {product.kod_produktu || '-'}
                      </td>
                      <td style={{ 
                        padding: '0.4rem 0.25rem', 
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        fontSize: '0.7rem'
                      }}>
                        {product.ean || '-'}
                      </td>
                      <td style={{ 
                        padding: '0.4rem 0.25rem', 
                        textAlign: 'center'
                      }}>
                        {product.kategoria ? (
                          <span style={{
                            backgroundColor: '#e9ecef',
                            color: '#495057',
                            padding: '0.1rem 0.3rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.65rem',
                            fontWeight: '500'
                          }}>
                            {product.kategoria}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{ 
                        padding: '0.4rem 0.25rem', 
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#28a745'
                      }}>
                        {parseFloat(product.cena || product.cena_sprzedazy || 0).toFixed(2)} zł
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
