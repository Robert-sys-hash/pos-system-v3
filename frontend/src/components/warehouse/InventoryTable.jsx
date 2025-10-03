import React, { useState, useEffect } from 'react';
import InlineProductEdit from './InlineProductEdit';
import { warehousePricingService } from '../../services/warehousePricingService';
import multiWarehouseService from '../../services/multiWarehouseService';

const InventoryTable = ({ 
  products = [], 
  onUpdateStock, 
  onEditProduct,
  onSaveProduct,
  loading = false,
  pagination = {},
  onPageChange = () => {},
  currentView = 'all'
}) => {
  const [editingStock, setEditingStock] = useState({});
  const [tempValues, setTempValues] = useState({});
  const [editingProduct, setEditingProduct] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationPrices, setLocationPrices] = useState([]);

  // Pobierz domyślny magazyn przy pierwszym renderowaniu
  useEffect(() => {
    const loadDefaultWarehouse = async () => {
      try {
        // Użyj istniejącego serwisu multiWarehouseService
        const result = await multiWarehouseService.getWarehouses();
        if (result.success && result.data && result.data.length > 0) {
          setCurrentLocation(result.data[0]); // używamy tego samego state dla kompatybilności
        }
      } catch (error) {
        console.error('Błąd pobierania magazynów:', error);
      }
    };
    
    loadDefaultWarehouse();
  }, []);

  // Pobierz ceny magazynowe gdy magazyn zostanie ustawiony
  useEffect(() => {
    if (currentLocation) {
      loadWarehousePrices();
    }
  }, [currentLocation]);

  const loadWarehousePrices = async () => {
    if (!currentLocation) return;
    
    try {
      const response = await warehousePricingService.getWarehousePrices(currentLocation.id);
      setLocationPrices(response.data || []); // używamy tego samego state dla kompatybilności
    } catch (error) {
      console.error('Błąd pobierania cen magazynowych:', error);
      setLocationPrices([]);
    }
  };

  // Funkcja do obliczania marży z uwzględnieniem cen specjalnych
  const calculateMargin = (product) => {
    // Sprawdź czy produkt ma cenę specjalną dla aktualnego magazynu
    const warehousePrice = locationPrices.find(lp => lp.product_id === product.id);
    
    // Użyj ceny specjalnej jeśli istnieje, inaczej domyślnej
    const sellPriceNetto = warehousePrice ? 
      warehousePrice.cena_sprzedazy_netto : 
      product.cena_sprzedazy_netto || (product.cena_sprzedazy_brutto / 1.23) || 0;
    
    const buyPriceNetto = product.cena_zakupu_netto || 0;
    
    if (!buyPriceNetto || buyPriceNetto <= 0) return { percent: 0, amount: 0 };
    
    const marginAmount = sellPriceNetto - buyPriceNetto;
    const marginPercent = (marginAmount / buyPriceNetto) * 100;
    
    return {
      percent: marginPercent,
      amount: marginAmount,
      hasSpecialPrice: !!warehousePrice
    };
  };

  const handleStockEdit = (productId, currentStock) => {
    setEditingStock(prev => ({ ...prev, [productId]: true }));
    setTempValues(prev => ({ ...prev, [productId]: currentStock }));
  };

  const handleStockSave = async (productId) => {
    const newStock = tempValues[productId];
    if (newStock === undefined || newStock === null) return;

    const result = await onUpdateStock(productId, {
      operation: 'set',
      stock_quantity: parseFloat(newStock),
      reason: 'Korekta manualna przez interfejs'
    });

    if (result.success) {
      setEditingStock(prev => ({ ...prev, [productId]: false }));
      setTempValues(prev => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });
    }
  };

  const handleStockCancel = (productId) => {
    setEditingStock(prev => ({ ...prev, [productId]: false }));
    setTempValues(prev => {
      const updated = { ...prev };
      delete updated[productId];
      return updated;
    });
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
  };

  const handleSaveProductEdit = async (productId, formData) => {
    try {
      await onSaveProduct(productId, formData);
      setEditingProduct(null);
    } catch (error) {
      throw error;
    }
  };

  const getRowClass = (product) => {
    const stock = product.stock_quantity || 0;
    const minLevel = product.min_stock_level || 0;

    if (stock <= 0) {
      return 'table-danger';
    } else if (stock <= minLevel) {
      return 'table-warning';
    }
    return '';
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Ładowanie...</span>
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="text-muted">
          <i className="fas fa-box-open fa-3x mb-3"></i>
          <h5>Brak produktów</h5>
          <p>Nie znaleziono produktów spełniających kryteria wyszukiwania</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      width: '100%', 
      backgroundColor: 'white',
      border: '1px solid #e9ecef',
      borderRadius: '0.375rem',
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
          <span>Produkty: <strong>{products.length}</strong></span>
        </div>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ 
          width: '100%',
          minWidth: '850px',
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
                width: '28%', 
                padding: '0.5rem 0.5rem',
                fontWeight: '600',
                color: '#495057'
              }}>Produkt</th>
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
              }}>Cena sprz.</th>
              <th style={{ 
                width: '75px', 
                padding: '0.5rem 0.25rem',
                textAlign: 'center',
                fontWeight: '600',
                color: '#495057'
              }}>Cena zak.</th>
              <th style={{ 
                width: '45px', 
                padding: '0.5rem 0.25rem',
                textAlign: 'center',
                fontWeight: '600',
                color: '#495057'
              }}>VAT</th>
              <th style={{ 
                width: '55px', 
                padding: '0.5rem 0.25rem',
                textAlign: 'center',
                fontWeight: '600',
                color: '#495057'
              }}>Stan</th>
              <th style={{ 
                width: '40px', 
                padding: '0.5rem 0.25rem',
                textAlign: 'center',
                fontWeight: '600',
                color: '#495057'
              }}>Jedn.</th>
              <th style={{ 
                width: '80px', 
                padding: '0.5rem 0.25rem',
                textAlign: 'center',
                fontWeight: '600',
                color: '#495057'
              }}>Marża</th>
              <th style={{ 
                width: '70px', 
                padding: '0.5rem 0.25rem',
                textAlign: 'center',
                fontWeight: '600',
                color: '#495057'
              }}>Akcje</th>
            </tr>
          </thead>
          <tbody>
        {products.map((product, index) => (
          <React.Fragment key={product.id}>
            <tr style={{ 
              backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
              borderBottom: '1px solid #e9ecef'
            }}>
              <td style={{ 
                padding: '0.5rem 0.25rem',
                textAlign: 'center'
              }}>
                <span style={{ 
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.65rem',
                  backgroundColor: '#0d6efd',
                  color: 'white',
                  borderRadius: '0.25rem',
                  fontWeight: '600'
                }}>
                  #{product.id}
                </span>
              </td>
              <td style={{ 
                minWidth: '250px', 
                width: '28%', 
                padding: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontSize: '0.85rem', 
                      lineHeight: '1.2',
                      fontWeight: '600',
                      color: '#212529',
                      marginBottom: '0.25rem',
                      wordWrap: 'break-word',
                      whiteSpace: 'normal',
                      overflow: 'visible'
                    }}>
                      {product.name}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: '0.25rem',
                      marginTop: '0.25rem'
                    }}>
                      {product.barcode && product.barcode !== 'null' && product.barcode !== 'None' && (
                        <span style={{ 
                          padding: '0.125rem 0.375rem',
                          fontSize: '0.65rem',
                          backgroundColor: '#17a2b8',
                          color: 'white',
                          borderRadius: '0.25rem'
                        }}>
                          <i className="fas fa-barcode me-1"></i>
                          EAN: {product.barcode}
                        </span>
                      )}
                      {product.product_code && product.product_code !== 'null' && product.product_code !== 'None' && (
                        <span style={{ 
                          padding: '0.125rem 0.375rem',
                          fontSize: '0.65rem',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          borderRadius: '0.25rem'
                        }}>
                          <i className="fas fa-qrcode me-1"></i>
                          Kod: {product.product_code}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </td>
              <td style={{ 
                padding: '0.5rem 0.25rem',
                textAlign: 'center'
              }}>
                <span style={{ 
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.7rem',
                  backgroundColor: '#f8f9fa',
                  color: '#495057',
                  border: '1px solid #dee2e6',
                  borderRadius: '0.25rem'
                }}>
                  {product.category_name || product.category || 'Bez kategorii'}
                </span>
              </td>
              <td style={{ 
                padding: '0.5rem 0.25rem',
                textAlign: 'center'
              }}>
                <div style={{ 
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: '#28a745'
                }}>
                  {parseFloat(product.cena_sprzedazy_brutto || product.price || 0).toFixed(2)} zł
                </div>
              </td>
              <td style={{ 
                padding: '0.5rem 0.25rem',
                textAlign: 'center'
              }}>
                <div style={{ 
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: '#17a2b8'
                }}>
                  {parseFloat(product.cena_zakupu_brutto || product.purchase_price || 0).toFixed(2)} zł
                </div>
              </td>
              <td style={{ 
                padding: '0.5rem 0.25rem',
                textAlign: 'center'
              }}>
                <span style={{ 
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.7rem',
                  backgroundColor: '#ffc107',
                  color: '#212529',
                  borderRadius: '0.25rem',
                  fontWeight: '600'
                }}>
                  {product.tax_rate || 23}%
                </span>
              </td>
              <td style={{ 
                padding: '0.5rem 0.25rem',
                textAlign: 'center'
              }}>
                {editingStock[product.id] ? (
                  <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    <input
                      type="number"
                      value={tempValues[product.id] || ''}
                      onChange={(e) => setTempValues(prev => ({ ...prev, [product.id]: e.target.value }))}
                      style={{ 
                        width: '50px',
                        padding: '0.25rem',
                        fontSize: '0.7rem',
                        border: '1px solid #ced4da',
                        borderRadius: '0.25rem'
                      }}
                    />
                    <button
                      onClick={() => handleStockSave(product.id)}
                      style={{ 
                        padding: '0.25rem',
                        fontSize: '0.6rem',
                        border: '1px solid #28a745',
                        borderRadius: '0.25rem',
                        backgroundColor: '#28a745',
                        color: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fas fa-check"></i>
                    </button>
                    <button
                      onClick={() => handleStockCancel(product.id)}
                      style={{ 
                        padding: '0.25rem',
                        fontSize: '0.6rem',
                        border: '1px solid #dc3545',
                        borderRadius: '0.25rem',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ) : (
                  <div style={{ 
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    color: '#495057',
                    cursor: 'pointer'
                  }} onClick={() => handleStockEdit(product.id, product.stock_quantity)}>
                    {product.stock_quantity || 0}
                  </div>
                )}
              </td>
              <td style={{ 
                padding: '0.5rem 0.25rem',
                textAlign: 'center'
              }}>
                <span style={{ 
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.7rem',
                  backgroundColor: '#f8f9fa',
                  color: '#495057',
                  border: '1px solid #dee2e6',
                  borderRadius: '0.25rem'
                }}>
                  {product.unit || 'szt'}
                </span>
              </td>
              <td style={{ 
                padding: '0.5rem 0.25rem',
                textAlign: 'center'
              }}>
                {(() => {
                  const margin = calculateMargin(product);
                  
                  if (margin.percent > 0 || margin.amount > 0) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '0.25rem', justifyContent: 'center', alignItems: 'center' }}>
                        <span style={{ 
                          padding: '0.125rem 0.375rem',
                          fontSize: '0.65rem',
                          backgroundColor: margin.percent > 20 ? '#28a745' : margin.percent > 10 ? '#ffc107' : '#dc3545',
                          color: margin.percent > 10 ? 'white' : '#212529',
                          borderRadius: '0.25rem',
                          fontWeight: '600',
                          border: margin.hasSpecialPrice ? '2px solid #007bff' : 'none'
                        }}>
                          {margin.percent.toFixed(1)}%
                        </span>
                        <span style={{ 
                          padding: '0.125rem 0.375rem',
                          fontSize: '0.6rem',
                          backgroundColor: margin.hasSpecialPrice ? '#e7f3ff' : '#f8f9fa',
                          color: '#495057',
                          border: '1px solid #dee2e6',
                          borderRadius: '0.25rem'
                        }}>
                          {margin.amount.toFixed(2)}zł
                        </span>
                        {margin.hasSpecialPrice && (
                          <span style={{ 
                            fontSize: '0.5rem',
                            color: '#007bff',
                            fontWeight: 'bold'
                          }}>
                            ⭐
                          </span>
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <span style={{ 
                        fontSize: '0.65rem',
                        color: '#6c757d'
                      }}>
                        -
                      </span>
                    );
                  }
                })()}
              </td>
              <td style={{ 
                padding: '0.5rem 0.25rem',
                textAlign: 'center'
              }}>
                {editingProduct && editingProduct.id === product.id ? (
                  <span style={{ 
                    fontSize: '0.7rem',
                    color: '#6c757d'
                  }}>
                    Edytuje...
                  </span>
                ) : (
                  <button
                    onClick={() => handleEditProduct(product)}
                    style={{ 
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.7rem',
                      border: '1px solid #0d6efd',
                      borderRadius: '0.25rem',
                      backgroundColor: 'white',
                      color: '#0d6efd',
                      cursor: 'pointer'
                    }}
                  >
                    <i className="fas fa-edit me-1"></i>
                    Zmień
                  </button>
                )}
              </td>
            </tr>
            
            {/* Formularz edycji bezpośrednio pod edytowanym wierszem */}
            {editingProduct && editingProduct.id === product.id && (
              <tr>
                <td colSpan="10" style={{ padding: '0', border: 'none' }}>
                  <div style={{ 
                    background: '#f8f9fa', 
                    border: '2px solid #007bff',
                    borderRadius: '8px',
                    margin: '4px',
                    padding: '0'
                  }}>
                    <InlineProductEdit
                      product={editingProduct}
                      onSave={handleSaveProductEdit}
                      onCancel={handleCancelEdit}
                    />
                  </div>
                </td>
              </tr>
            )}
            
          </React.Fragment>
        ))}
      </tbody>
        </table>
      </div>
      
      {/* Paginacja */}
      {pagination && pagination.pages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          borderTop: '1px solid #e9ecef'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              style={{
                padding: '8px 12px',
                border: '1px solid #dee2e6',
                backgroundColor: pagination.page <= 1 ? '#f8f9fa' : '#fff',
                color: pagination.page <= 1 ? '#6c757d' : '#007bff',
                borderRadius: '4px',
                cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer'
              }}
            >
              ← Poprzednia
            </button>
            
            <span style={{
              margin: '0 15px',
              fontSize: '14px',
              color: '#6c757d'
            }}>
              Strona {pagination.page} z {pagination.pages} ({pagination.total} produktów)
            </span>
            
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              style={{
                padding: '8px 12px',
                border: '1px solid #dee2e6',
                backgroundColor: pagination.page >= pagination.pages ? '#f8f9fa' : '#fff',
                color: pagination.page >= pagination.pages ? '#6c757d' : '#007bff',
                borderRadius: '4px',
                cursor: pagination.page >= pagination.pages ? 'not-allowed' : 'pointer'
              }}
            >
              Następna →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTable;
