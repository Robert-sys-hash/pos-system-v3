import React, { useState, useEffect } from 'react';
import { warehouseService } from '../../services/warehouseService';
import { productService } from '../../services/productService';

const InternalReceipt = () => {
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  
  // Historia PW
  const [receipts, setReceipts] = useState([]);
  const [activeTab, setActiveTab] = useState('new'); // 'new' lub 'history'
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadProducts();
    if (activeTab === 'history') {
      loadReceipts();
    }
  }, [activeTab]);

  const loadReceipts = async () => {
    try {
      const result = await warehouseService.getInternalReceipts({
        date: dateFilter,
        status: statusFilter
      });
      if (result.success) {
        setReceipts(result.data || []);
      }
    } catch (err) {
      console.error('Błąd ładowania historii PW:', err);
    }
  };

  const loadProducts = async () => {
    try {
      console.log('🔍 Ładowanie produktów, searchTerm:', searchTerm);
      const result = await productService.searchProducts(searchTerm);
      console.log('🔍 Wynik searchProducts:', result);
      
      if (result && result.data && result.data.products) {
        console.log('🔍 Znalezione produkty (data.products):', result.data.products);
        setProducts(result.data.products);
      } else if (result && result.products) {
        console.log('🔍 Znalezione produkty (products):', result.products);
        setProducts(result.products);
      } else {
        console.log('🔍 Brak produktów w odpowiedzi');
        setProducts([]);
      }
    } catch (err) {
      console.error('Błąd ładowania produktów:', err);
      setProducts([]);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadReceipts();
    }
  }, [dateFilter, statusFilter]);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      const timeoutId = setTimeout(() => {
        loadProducts();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else if (searchTerm.length === 0) {
      loadProducts();
    }
  }, [searchTerm]);

  const addProduct = (product) => {
    const existing = selectedProducts.find(p => p.id === product.id);
    if (existing) {
      setSelectedProducts(prev => 
        prev.map(p => 
          p.id === product.id 
            ? { ...p, quantity: p.quantity + 1 }
            : p
        )
      );
    } else {
      setSelectedProducts(prev => [...prev, { 
        ...product, 
        quantity: 1,
        reason: ''
      }]);
    }
    setShowProductModal(false);
  };

  const updateProductQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeProduct(productId);
      return;
    }
    setSelectedProducts(prev => 
      prev.map(p => 
        p.id === productId 
          ? { ...p, quantity: parseInt(quantity) || 1 }
          : p
      )
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

  const submitInternalReceipt = async () => {
    if (selectedProducts.length === 0) {
      setError('Dodaj przynajmniej jeden produkt');
      return;
    }

    setLoading(true);
    try {
      const result = await warehouseService.createInternalReceipt({
        products: selectedProducts.map(p => ({
          product_id: p.id,
          quantity: p.quantity,
          reason: p.reason || 'Przyjęcie wewnętrzne'
        }))
      });

      if (result.success) {
        setSuccess('Przyjęcie wewnętrzne zostało zarejestrowane pomyślnie');
        setSelectedProducts([]);
        loadReceipts(); // Odśwież historię
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Błąd podczas rejestrowania przyjęcia');
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
        <h3>📥 Przyjęcie Wewnętrzne (PW)</h3>
      </div>

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
            border: activeTab === 'new' ? '1px solid #20c997' : '1px solid #e9ecef',
            borderRadius: '0.375rem',
            backgroundColor: activeTab === 'new' ? '#20c997' : 'white',
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
          Nowe PW
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
          Historia PW
        </button>
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

      {/* Zawartość zakładek */}
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
          <h5 className="card-title mb-0">Produkty do przyjęcia</h5>
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
                    <th>Ilość</th>
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
                        <input
                          type="number"
                          className="form-control"
                          style={{ width: '100px' }}
                          value={product.quantity}
                          onChange={(e) => updateProductQuantity(product.id, e.target.value)}
                          min="1"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Powód przyjęcia..."
                          value={product.reason}
                          onChange={(e) => updateProductReason(product.id, e.target.value)}
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
                className="btn btn-success"
                onClick={submitInternalReceipt}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Przetwarzanie...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check me-2"></i>
                    Zatwierdź przyjęcie
                  </>
                )}
              </button>
            </div>
            )}
          </div>
        </div>
        </>
      )}

      {/* Zakładka Historia */}
      {activeTab === 'history' && (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">Historia Przyjęć Wewnętrznych</h5>
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
                <option value="all">Wszystkie</option>
                <option value="completed">Zakończone</option>
                <option value="pending">Oczekujące</option>
              </select>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={loadReceipts}
              >
                <i className="fas fa-refresh"></i>
              </button>
            </div>
          </div>
          <div className="card-body">
            {receipts.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-muted">
                  <i className="fas fa-inbox fa-2x mb-2"></i>
                  <p>Brak przyjęć wewnętrznych</p>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Numer dokumentu</th>
                      <th>Data</th>
                      <th>Produkty</th>
                      <th>Status</th>
                      <th>Utworzył</th>
                      <th>Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((receipt) => (
                      <tr key={receipt.id}>
                        <td>
                          <strong>{receipt.document_number}</strong>
                        </td>
                        <td>
                          {new Date(receipt.receipt_date).toLocaleDateString('pl-PL')}
                        </td>
                        <td>
                          <span className="badge bg-info">
                            {receipt.items_count || 0} pozycji
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${
                            receipt.status === 'completed' ? 'bg-success' : 'bg-warning'
                          }`}>
                            {receipt.status === 'completed' ? 'Zakończone' : 'Oczekujące'}
                          </span>
                        </td>
                        <td>
                          <small className="text-muted">{receipt.created_by || 'System'}</small>
                        </td>
                        <td>
                          <button
                            className="btn btn-outline-primary btn-sm me-1"
                            onClick={() => {/* TODO: Zobacz szczegóły */}}
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => {/* TODO: Drukuj */}}
                          >
                            <i className="fas fa-print"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}      {/* Modal wyboru produktu */}
      {showProductModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Wybierz produkt</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowProductModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Szukaj produktów..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
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
                      {products.map((product) => (
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
                            <span className={`badge ${
                              (product.stock_quantity || 0) > 0 ? 'bg-success' : 'bg-warning'
                            }`}>
                              {product.stock_quantity || 0} {product.unit || 'szt'}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => addProduct(product)}
                            >
                              <i className="fas fa-plus me-1"></i>
                              Dodaj
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showProductModal && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default InternalReceipt;
