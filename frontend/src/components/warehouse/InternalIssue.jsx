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
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>📤 Rozchód Wewnętrzny (RW)</h3>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {success}
          <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
        </div>
      )}

      {/* Zakładki z pięknym formatowaniem */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        padding: '0.75rem',
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        border: '1px solid #e9ecef',
        boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
      }}>
        <button
          style={{
            padding: '0.75rem 1.25rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            border: activeTab === 'new' ? '1px solid #fd7e14' : '1px solid #e9ecef',
            borderRadius: '0.375rem',
            backgroundColor: activeTab === 'new' ? '#fd7e14' : 'white',
            color: activeTab === 'new' ? 'white' : '#495057',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease-in-out'
          }}
          onClick={() => setActiveTab('new')}
        >
          <i className="fas fa-plus"></i>
          Nowy rozchód
        </button>
        <button
          style={{
            padding: '0.75rem 1.25rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            border: activeTab === 'history' ? '1px solid #6f42c1' : '1px solid #e9ecef',
            borderRadius: '0.375rem',
            backgroundColor: activeTab === 'history' ? '#6f42c1' : 'white',
            color: activeTab === 'history' ? 'white' : '#495057',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease-in-out'
          }}
          onClick={() => setActiveTab('history')}
        >
          <i className="fas fa-history"></i>
          Historia rozchodów
        </button>
      </div>

      {/* Zakładka nowego rozchodu */}
      {activeTab === 'new' && (
        <>
          <div className="d-flex justify-content-end mb-3">
            <button 
              className="btn btn-primary"
              onClick={() => setShowProductModal(true)}
            >
              <i className="fas fa-plus me-2"></i>
              Dodaj produkt
            </button>
          </div>

          {/* Lista wybranych produktów */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="card-title mb-0">Produkty do wydania</h5>
            </div>
            <div className="card-body">
              {selectedProducts.length === 0 ? (
                <div className="text-center py-4">
                  <div className="text-muted">
                    <i className="fas fa-inbox fa-2x mb-2"></i>
                    <p>Brak wybranych produktów</p>
                  </div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Produkt</th>
                        <th>Kod</th>
                        <th>Stan dostępny</th>
                        <th>Ilość do wydania</th>
                        <th>Powód</th>
                        <th>Akcje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProducts.map((product) => (
                        <tr key={product.id}>
                          <td>
                            <strong>{product.name}</strong>
                            {product.description && (
                              <>
                                <br />
                                <small className="text-muted">{product.description}</small>
                              </>
                            )}
                          </td>
                          <td>
                            <code>{product.barcode || product.product_code || 'Brak'}</code>
                          </td>
                          <td>
                            <span className="badge bg-info">
                              {product.maxQuantity} {product.unit || 'szt'}
                            </span>
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-control"
                              style={{ width: '120px' }}
                              value={product.quantity}
                              onChange={(e) => updateProductQuantity(product.id, e.target.value)}
                              min="1"
                              max={product.maxQuantity}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Powód rozchodu..."
                              value={product.reason}
                              onChange={(e) => updateProductReason(product.id, e.target.value)}
                              required
                            />
                          </td>
                          <td>
                            <button
                              className="btn btn-danger btn-sm"
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
                <div className="d-flex justify-content-end mt-3">
                  <button
                    className="btn btn-warning"
                    onClick={submitInternalIssue}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Przetwarzanie...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-arrow-up me-2"></i>
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
        <div className="card">
          <div className="card-header">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">Historia rozchodów wewnętrznych</h5>
              <div className="d-flex gap-2">
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  style={{ width: '150px' }}
                />
                <select
                  className="form-select form-select-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ width: '120px' }}
                >
                  <option value="">Wszystkie</option>
                  <option value="completed">Zatwierdzone</option>
                  <option value="pending">Oczekujące</option>
                </select>
                <button 
                  className="btn btn-outline-primary btn-sm"
                  onClick={loadIssues}
                >
                  <i className="fas fa-sync-alt"></i>
                </button>
              </div>
            </div>
          </div>
          <div className="card-body">
            {issues.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-muted">
                  <i className="fas fa-history fa-2x mb-2"></i>
                  <p>Brak rozchodów wewnętrznych</p>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Nr dokumentu</th>
                      <th>Produkty</th>
                      <th>Łączna ilość</th>
                      <th>Status</th>
                      <th>Utworzył</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map((issue) => (
                      <tr key={issue.id}>
                        <td>
                          {new Date(issue.created_at).toLocaleDateString('pl-PL')}
                          <br />
                          <small className="text-muted">
                            {new Date(issue.created_at).toLocaleTimeString('pl-PL')}
                          </small>
                        </td>
                        <td>
                          <code>RW-{issue.id.toString().padStart(6, '0')}</code>
                        </td>
                        <td>
                          {issue.items ? (
                            <div>
                              {issue.items.slice(0, 2).map((item, index) => (
                                <div key={index} className="small">
                                  {item.product_name} ({item.quantity} {item.unit || 'szt'})
                                </div>
                              ))}
                              {issue.items.length > 2 && (
                                <small className="text-muted">
                                  ...i {issue.items.length - 2} więcej
                                </small>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted">Brak danych</span>
                          )}
                        </td>
                        <td>
                          <span className="badge bg-warning">
                            {issue.total_quantity || 0}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${issue.status === 'completed' ? 'bg-success' : 'bg-warning'}`}>
                            {issue.status === 'completed' ? 'Zatwierdzony' : 'Oczekujący'}
                          </span>
                        </td>
                        <td>
                          <small>{issue.created_by || 'System'}</small>
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

      {/* Modal wyboru produktu */}
      {showProductModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Wybierz produkt</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => { setShowProductModal(false); setSearchTerm(''); }}
                ></button>
              </div>
              <div className="modal-body">
                {/* Wybór magazynu */}
                <div className="mb-3">
                  <label className="form-label">Magazyn źródłowy:</label>
                  <select
                    className="form-select"
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
                
                <div className="mb-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Szukaj produktów (wpisz min. 2 znaki)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {loadingProducts ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Ładowanie...</span>
                    </div>
                    <p className="mt-2 text-muted">Ładowanie produktów...</p>
                  </div>
                ) : (
                <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table className="table table-hover">
                    <thead className="sticky-top bg-white">
                      <tr>
                        <th>Nazwa</th>
                        <th>Kod</th>
                        <th>Stan</th>
                        <th>Akcja</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center py-4">
                            <div className="text-muted">
                              <i className="fas fa-search fa-2x mb-2"></i>
                              <p>Brak dostępnych produktów</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        products.map((product) => (
                          <tr key={product.id}>
                            <td>
                              <strong>{product.name}</strong>
                              {product.description && (
                                <>
                                  <br />
                                  <small className="text-muted">{product.description}</small>
                                </>
                              )}
                            </td>
                            <td>
                              <code>{product.barcode || product.product_code || 'Brak'}</code>
                            </td>
                            <td>
                              <span className="badge bg-success">
                                {product.stock_quantity || product.quantity || 0} {product.unit || 'szt'}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => addProduct(product)}
                                disabled={selectedProducts.some(p => p.id === product.id)}
                              >
                                <i className="fas fa-plus me-1"></i>
                                {selectedProducts.some(p => p.id === product.id) ? 'Dodano' : 'Dodaj'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showProductModal && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default InternalIssue;
