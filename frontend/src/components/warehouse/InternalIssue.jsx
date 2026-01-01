import React, { useState, useEffect, useCallback } from 'react';
import { warehouseService } from '../../services/warehouseService';
import { useLocation } from '../../contexts/LocationContext';

const InternalIssue = () => {
  const { locationId } = useLocation();
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Magazyny dla lokalizacji
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  
  // Historia RW
  const [issues, setIssues] = useState([]);
  const [activeTab, setActiveTab] = useState('new'); // 'new' lub 'history'
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Załaduj magazyny dla lokalizacji
  useEffect(() => {
    const loadWarehouses = async () => {
      if (!locationId) return;
      
      try {
        const response = await fetch('http://localhost:8000/api/warehouses');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const locationWarehouses = data.data.filter(w => w.location_id === locationId);
            setWarehouses(locationWarehouses);
            // Ustaw pierwszy magazyn jako domyślny
            if (locationWarehouses.length > 0 && !selectedWarehouse) {
              setSelectedWarehouse(locationWarehouses[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Błąd ładowania magazynów:', err);
      }
    };
    
    loadWarehouses();
  }, [locationId]);

  useEffect(() => {
    if (activeTab === 'history' && locationId) {
      loadIssues();
    }
  }, [activeTab, locationId]);

  const loadIssues = async () => {
    try {
      const result = await warehouseService.getInternalIssues({
        date: dateFilter,
        status: statusFilter,
        location_id: locationId
      });
      if (result.success) {
        setIssues(result.data || []);
      }
    } catch (err) {
      console.error('Błąd ładowania historii RW:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadIssues();
    }
  }, [dateFilter, statusFilter]);

  // Załaduj produkty z magazynu
  const loadProducts = useCallback(async (search = '') => {
    if (!selectedWarehouse) {
      setProducts([]);
      return;
    }
    
    setLoadingProducts(true);
    try {
      // Użyj warehouseService.getInventory który zwraca produkty z magazynu wraz ze stanami
      const result = await warehouseService.getInventory({
        warehouse_id: selectedWarehouse,
        search: search,
        limit: 50,
        available_only: true
      });
      
      if (result.success && result.data?.products) {
        // Filtruj tylko produkty które mają stan > 0
        const availableProducts = result.data.products.filter(p => 
          (p.stock_quantity || p.quantity || 0) > 0
        );
        setProducts(availableProducts);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Błąd ładowania produktów:', err);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [selectedWarehouse]);

  // Załaduj produkty gdy otwiera się modal lub zmienia magazyn
  useEffect(() => {
    if (showProductModal && selectedWarehouse) {
      loadProducts(searchTerm);
    }
  }, [showProductModal, selectedWarehouse]);

  // Wyszukiwanie z debounce
  useEffect(() => {
    if (!showProductModal) return;
    
    if (searchTerm.length >= 2) {
      const timeoutId = setTimeout(() => {
        loadProducts(searchTerm);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else if (searchTerm.length === 0) {
      loadProducts('');
    }
  }, [searchTerm, showProductModal, loadProducts]);

  const addProduct = (product) => {
    const existing = selectedProducts.find(p => p.id === product.id);
    if (existing) {
      setError('Produkt już został dodany do listy');
      return;
    }
    
    // stock_quantity lub quantity z API magazynowego
    const availableQty = product.stock_quantity || product.quantity || 0;
    
    setSelectedProducts(prev => [...prev, { 
      ...product, 
      quantity: 1,
      reason: '',
      maxQuantity: availableQty
    }]);
    setShowProductModal(false);
    setSearchTerm('');
  };

  const updateProductQuantity = (productId, quantity) => {
    const qty = parseInt(quantity) || 0;
    if (qty <= 0) {
      removeProduct(productId);
      return;
    }
    
    setSelectedProducts(prev => 
      prev.map(p => {
        if (p.id === productId) {
          if (qty > p.maxQuantity) {
            setError(`Maksymalna dostępna ilość dla ${p.name}: ${p.maxQuantity}`);
            return p;
          }
          return { ...p, quantity: qty };
        }
        return p;
      })
    );
  };

  const updateProductReason = (productId, reason) => {
    setSelectedProducts(prev => 
      prev.map(p => 
        p.id === productId 
          ? { ...p, reason: reason }
          : p
      )
    );
  };

  const removeProduct = (productId) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const submitInternalIssue = async () => {
    if (selectedProducts.length === 0) {
      setError('Dodaj przynajmniej jeden produkt');
      return;
    }

    // Sprawdź czy wszystkie produkty mają podany powód
    const missingReason = selectedProducts.find(p => !p.reason.trim());
    if (missingReason) {
      setError('Wszystkie produkty muszą mieć podany powód rozchodu');
      return;
    }

    setLoading(true);
    try {
      const result = await warehouseService.createInternalIssue({
        products: selectedProducts.map(p => ({
          product_id: p.id,
          quantity: p.quantity,
          reason: p.reason
        })),
        location_id: locationId
      });

      if (result.success) {
        setSuccess('Rozchód wewnętrzny został zarejestrowany pomyślnie');
        setSelectedProducts([]);
        loadIssues(); // Odśwież historię
        setTimeout(() => setSuccess(''), 3000);
        // Odśwież listę produktów aby pokazać nowe stany
        loadProducts();
      } else {
        setError(result.error || 'Błąd podczas rejestrowania rozchodu');
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontSize: '12px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '0.5rem'
      }}>
        <span style={{ fontWeight: '600', fontSize: '13px' }}>📤 Rozchód Wewnętrzny (RW)</span>
      </div>

      {error && (
        <div style={{
          padding: '0.35rem 0.5rem',
          marginBottom: '0.5rem',
          backgroundColor: '#f8d7da',
          color: '#842029',
          borderRadius: '4px',
          fontSize: '11px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {error}
          <button 
            style={{ border: 'none', background: 'none', color: '#842029', cursor: 'pointer', padding: '0' }}
            onClick={() => setError('')}
          >×</button>
        </div>
      )}

      {success && (
        <div style={{
          padding: '0.35rem 0.5rem',
          marginBottom: '0.5rem',
          backgroundColor: '#d1e7dd',
          color: '#0f5132',
          borderRadius: '4px',
          fontSize: '11px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {success}
          <button 
            style={{ border: 'none', background: 'none', color: '#0f5132', cursor: 'pointer', padding: '0' }}
            onClick={() => setSuccess('')}
          >×</button>
        </div>
      )}

      {/* Zakładki kompaktowe */}
      <div style={{
        display: 'flex',
        gap: '0.25rem',
        marginBottom: '0.5rem',
        padding: '0.35rem',
        backgroundColor: 'white',
        borderRadius: '4px',
        border: '1px solid #e9ecef',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}>
        <button
          style={{
            padding: '0.3rem 0.6rem',
            fontSize: '11px',
            fontWeight: '500',
            border: activeTab === 'new' ? '1px solid #fd7e14' : '1px solid #e9ecef',
            borderRadius: '3px',
            backgroundColor: activeTab === 'new' ? '#fd7e14' : 'white',
            color: activeTab === 'new' ? 'white' : '#495057',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            transition: 'all 0.15s ease-in-out'
          }}
          onClick={() => setActiveTab('new')}
        >
          <i className="fas fa-plus" style={{ fontSize: '10px' }}></i>
          Nowy rozchód
        </button>
        <button
          style={{
            padding: '0.3rem 0.6rem',
            fontSize: '11px',
            fontWeight: '500',
            border: activeTab === 'history' ? '1px solid #6f42c1' : '1px solid #e9ecef',
            borderRadius: '3px',
            backgroundColor: activeTab === 'history' ? '#6f42c1' : 'white',
            color: activeTab === 'history' ? 'white' : '#495057',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            transition: 'all 0.15s ease-in-out'
          }}
          onClick={() => setActiveTab('history')}
        >
          <i className="fas fa-history" style={{ fontSize: '10px' }}></i>
          Historia rozchodów
        </button>
      </div>

      {/* Zakładka nowego rozchodu */}
      {activeTab === 'new' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
            <button 
              style={{
                padding: '0.3rem 0.6rem',
                fontSize: '11px',
                backgroundColor: '#0d6efd',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
              onClick={() => setShowProductModal(true)}
            >
              <i className="fas fa-plus" style={{ fontSize: '10px' }}></i>
              Dodaj produkt
            </button>
          </div>

          {/* Lista wybranych produktów */}
          <div style={{ 
            backgroundColor: 'white', 
            border: '1px solid #e9ecef', 
            borderRadius: '4px',
            marginBottom: '0.5rem'
          }}>
            <div style={{ 
              padding: '0.4rem 0.6rem', 
              backgroundColor: '#f8f9fa', 
              borderBottom: '1px solid #e9ecef',
              fontWeight: '600',
              fontSize: '11px'
            }}>
              Produkty do wydania
            </div>
            <div style={{ padding: '0.5rem' }}>
              {selectedProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: '#6c757d', fontSize: '11px' }}>
                  <i className="fas fa-inbox" style={{ fontSize: '16px', marginBottom: '0.25rem', display: 'block' }}></i>
                  Brak wybranych produktów
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa' }}>
                        <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left' }}>Produkt</th>
                        <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left' }}>Kod</th>
                        <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left' }}>Stan</th>
                        <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', width: '80px' }}>Ilość</th>
                        <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left' }}>Powód</th>
                        <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'center', width: '50px' }}>Akcje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProducts.map((product) => (
                        <tr key={product.id}>
                          <td style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #eee' }}>
                            <strong>{product.name}</strong>
                            {product.description && (
                              <span style={{ display: 'block', color: '#6c757d', fontSize: '10px' }}>{product.description}</span>
                            )}
                          </td>
                          <td style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #eee' }}>
                            <code style={{ fontSize: '10px' }}>{product.barcode || product.product_code || 'Brak'}</code>
                          </td>
                          <td style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #eee' }}>
                            <span style={{ 
                              padding: '0.1rem 0.3rem', 
                              fontSize: '10px', 
                              backgroundColor: '#0dcaf0', 
                              color: '#000', 
                              borderRadius: '3px' 
                            }}>
                              {product.maxQuantity} {product.unit || 'szt'}
                            </span>
                          </td>
                          <td style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #eee' }}>
                            <input
                              type="number"
                              style={{ width: '60px', padding: '0.2rem 0.3rem', fontSize: '11px', border: '1px solid #ced4da', borderRadius: '3px' }}
                              value={product.quantity}
                              onChange={(e) => updateProductQuantity(product.id, e.target.value)}
                              min="1"
                              max={product.maxQuantity}
                            />
                          </td>
                          <td style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #eee' }}>
                            <input
                              type="text"
                              style={{ width: '100%', padding: '0.2rem 0.3rem', fontSize: '11px', border: '1px solid #ced4da', borderRadius: '3px' }}
                              placeholder="Powód rozchodu..."
                              value={product.reason}
                              onChange={(e) => updateProductReason(product.id, e.target.value)}
                              required
                            />
                          </td>
                          <td style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                            <button
                              style={{
                                padding: '0.2rem 0.4rem',
                                fontSize: '10px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer'
                              }}
                              onClick={() => removeProduct(product.id)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {selectedProducts.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '11px',
                      backgroundColor: '#ffc107',
                      color: '#000',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                    onClick={submitInternalIssue}
                    disabled={loading}
                  >
                    {loading ? (
                      <span>Przetwarzanie...</span>
                    ) : (
                      <>
                        <i className="fas fa-arrow-up" style={{ fontSize: '10px' }}></i>
                        Zatwierdź rozchód
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Zakładka historii rozchodów */}
      {activeTab === 'history' && (
        <div style={{ 
          backgroundColor: 'white', 
          border: '1px solid #e9ecef', 
          borderRadius: '4px'
        }}>
          <div style={{ 
            padding: '0.4rem 0.6rem', 
            backgroundColor: '#f8f9fa', 
            borderBottom: '1px solid #e9ecef',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: '600', fontSize: '11px' }}>Historia rozchodów wewnętrznych</span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{ padding: '0.2rem 0.3rem', fontSize: '10px', border: '1px solid #ced4da', borderRadius: '3px', width: '110px' }}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '0.2rem 0.3rem', fontSize: '10px', border: '1px solid #ced4da', borderRadius: '3px', width: '90px' }}
              >
                <option value="">Wszystkie</option>
                <option value="completed">Zatwierdzone</option>
                <option value="pending">Oczekujące</option>
              </select>
              <button 
                onClick={loadIssues}
                style={{ padding: '0.2rem 0.4rem', fontSize: '10px', border: '1px solid #0d6efd', borderRadius: '3px', backgroundColor: 'white', color: '#0d6efd', cursor: 'pointer' }}
              >
                <i className="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>
          <div style={{ padding: '0.5rem' }}>
            {issues.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: '#6c757d', fontSize: '11px' }}>
                <i className="fas fa-history" style={{ fontSize: '16px', marginBottom: '0.25rem', display: 'block' }}></i>
                Brak rozchodów wewnętrznych
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left' }}>Data</th>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left' }}>Nr dokumentu</th>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left' }}>Produkty</th>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left' }}>Łączna ilość</th>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left' }}>Utworzył</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map((issue) => (
                      <tr key={issue.id}>
                        <td style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #eee' }}>
                          {new Date(issue.created_at).toLocaleDateString('pl-PL')}
                          <span style={{ display: 'block', color: '#6c757d', fontSize: '10px' }}>
                            {new Date(issue.created_at).toLocaleTimeString('pl-PL')}
                          </span>
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #eee' }}>
                          <code style={{ fontSize: '10px' }}>RW-{issue.id.toString().padStart(6, '0')}</code>
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #eee' }}>
                          {issue.items ? (
                            <div>
                              {issue.items.slice(0, 2).map((item, index) => (
                                <div key={index} style={{ fontSize: '10px' }}>
                                  {item.product_name} ({item.quantity} {item.unit || 'szt'})
                                </div>
                              ))}
                              {issue.items.length > 2 && (
                                <span style={{ color: '#6c757d', fontSize: '10px' }}>
                                  ...i {issue.items.length - 2} więcej
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#6c757d' }}>Brak danych</span>
                          )}
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #eee' }}>
                          <span style={{ 
                            padding: '0.1rem 0.3rem', 
                            fontSize: '10px', 
                            backgroundColor: '#ffc107', 
                            color: '#000', 
                            borderRadius: '3px' 
                          }}>
                            {issue.total_quantity || 0}
                          </span>
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #eee' }}>
                          <span style={{ 
                            padding: '0.1rem 0.3rem', 
                            fontSize: '10px', 
                            backgroundColor: issue.status === 'completed' ? '#198754' : '#ffc107', 
                            color: issue.status === 'completed' ? '#fff' : '#000', 
                            borderRadius: '3px' 
                          }}>
                            {issue.status === 'completed' ? 'Zatwierdzony' : 'Oczekujący'}
                          </span>
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #eee', color: '#6c757d', fontSize: '10px' }}>
                          {issue.created_by || 'System'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal wyboru produktu - styl zgodny z Open/CloseShiftEnhancedModal */}
      {showProductModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '6px',
            width: '900px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            {/* Header - styl jak w OpenShiftEnhancedModal */}
            <div style={{
              padding: '0.75rem 1rem',
              background: 'linear-gradient(135deg, #fd7e14, #dc3545)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{
                width: '2rem',
                height: '2rem',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem'
              }}>
                📤
              </div>
              <div style={{ flex: 1 }}>
                <h5 style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>
                  Wybierz produkt do wydania
                </h5>
                <p style={{ margin: 0, fontSize: '11px', opacity: 0.9 }}>
                  RW - Rozchód wewnętrzny
                </p>
              </div>
              <button
                onClick={() => { setShowProductModal(false); setSearchTerm(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1rem', maxHeight: 'calc(90vh - 60px)', overflowY: 'auto' }}>
              {/* Wybór magazynu */}
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#6c757d',
                  marginBottom: '3px'
                }}>
                  🏪 Magazyn źródłowy
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '13px',
                    backgroundColor: '#fff'
                  }}
                  value={selectedWarehouse || ''}
                  onChange={(e) => setSelectedWarehouse(parseInt(e.target.value))}
                >
                  {warehouses.length === 0 ? (
                    <option value="">Brak magazynów dla tej lokalizacji</option>
                  ) : (
                    warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name || w.nazwa}</option>
                    ))
                  )}
                </select>
              </div>

              {/* Wyszukiwarka */}
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#6c757d',
                  marginBottom: '3px'
                }}>
                  🔍 Szukaj produktów
                </label>
                <input
                  type="text"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                  placeholder="Wpisz min. 2 znaki aby wyszukać..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Tabela produktów */}
              {loadingProducts ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    border: '4px solid #e9ecef',
                    borderTop: '4px solid #fd7e14',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto'
                  }}></div>
                  <p style={{ marginTop: '1rem', color: '#6c757d', fontSize: '12px' }}>Ładowanie produktów...</p>
                </div>
              ) : (
                <div style={{ 
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead style={{ 
                        position: 'sticky', 
                        top: 0, 
                        backgroundColor: '#f8f9fa',
                        borderBottom: '2px solid #dee2e6'
                      }}>
                        <tr>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Nazwa</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#495057', width: '110px' }}>Kod</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#495057', width: '90px' }}>Stan</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#495057', width: '90px' }}>Akcja</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.length === 0 ? (
                          <tr>
                            <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
                              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📦</div>
                              Brak dostępnych produktów
                            </td>
                          </tr>
                        ) : (
                          products.map((product) => (
                            <tr key={product.id} style={{ 
                              borderBottom: '1px solid #f0f0f0',
                              transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ fontWeight: '500', color: '#212529', fontSize: '13px' }}>{product.name}</div>
                                {product.description && (
                                  <small style={{ color: '#6c757d', fontSize: '11px' }}>{product.description}</small>
                                )}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <code style={{ 
                                  backgroundColor: '#e9ecef', 
                                  padding: '3px 6px', 
                                  borderRadius: '3px',
                                  fontSize: '11px'
                                }}>
                                  {product.barcode || product.product_code || '-'}
                                </code>
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <span style={{ 
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '500',
                                  backgroundColor: '#d1e7dd',
                                  color: '#0a3622'
                                }}>
                                  {product.stock_quantity || product.quantity || 0} {product.unit || 'szt'}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <button
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '11px',
                                    fontWeight: '500',
                                    border: 'none',
                                    borderRadius: '4px',
                                    backgroundColor: selectedProducts.some(p => p.id === product.id) ? '#6c757d' : '#fd7e14',
                                    color: 'white',
                                    cursor: selectedProducts.some(p => p.id === product.id) ? 'default' : 'pointer',
                                    transition: 'background-color 0.15s'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!selectedProducts.some(p => p.id === product.id)) {
                                      e.target.style.backgroundColor = '#dc3545';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!selectedProducts.some(p => p.id === product.id)) {
                                      e.target.style.backgroundColor = '#fd7e14';
                                    }
                                  }}
                                  onClick={() => addProduct(product)}
                                  disabled={selectedProducts.some(p => p.id === product.id)}
                                >
                                  {selectedProducts.some(p => p.id === product.id) ? '✓ Dodano' : '+ Dodaj'}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Hint */}
              <div style={{ 
                marginTop: '0.75rem', 
                padding: '10px 12px', 
                backgroundColor: '#fff3cd', 
                borderRadius: '4px',
                fontSize: '11px',
                color: '#856404',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>⚠️</span>
                <span>Rozchód wewnętrzny zmniejsza stan magazynowy. Upewnij się, że podajesz prawidłową ilość i powód.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternalIssue;
