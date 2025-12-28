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
  
  // Modal szczegółów PW
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receiptDetails, setReceiptDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

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

  // Funkcja do wyświetlania szczegółów PW
  const handleViewDetails = async (receipt) => {
    setSelectedReceipt(receipt);
    setShowDetailsModal(true);
    setLoadingDetails(true);
    
    try {
      const result = await warehouseService.getInternalReceiptDetails(receipt.id);
      if (result.success) {
        setReceiptDetails(result.data);
      } else {
        setError('Nie udało się pobrać szczegółów dokumentu');
      }
    } catch (err) {
      console.error('Błąd pobierania szczegółów PW:', err);
      setError('Błąd połączenia z serwerem');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Funkcja do drukowania PW
  const handlePrint = (receipt) => {
    // Otwórz okno drukowania z danymi dokumentu
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Drukuj PW - ${receipt.document_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 18px; margin-bottom: 20px; }
            .info { margin-bottom: 15px; }
            .info span { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>📥 Przyjęcie Wewnętrzne (PW)</h1>
          <div class="info">
            <p><span>Numer dokumentu:</span> ${receipt.document_number}</p>
            <p><span>Data:</span> ${new Date(receipt.receipt_date).toLocaleDateString('pl-PL')}</p>
            <p><span>Status:</span> ${receipt.status === 'completed' ? 'Zakończone' : 'Oczekujące'}</p>
            <p><span>Utworzył:</span> ${receipt.created_by || 'System'}</p>
            <p><span>Liczba pozycji:</span> ${receipt.items_count || 0}</p>
          </div>
          <div class="footer">
            <p>Wydrukowano: ${new Date().toLocaleString('pl-PL')}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const loadProducts = async () => {
    try {
      console.log('🔍 Ładowanie produktów, searchTerm:', searchTerm);
      const result = await productService.searchProducts({ search: searchTerm });
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
                            onClick={() => handleViewDetails(receipt)}
                            title="Zobacz szczegóły"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => handlePrint(receipt)}
                            title="Drukuj"
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
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog" style={{ maxWidth: '900px', margin: '1.75rem auto' }}>
            <div className="modal-content" style={{ borderRadius: '0.5rem', boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)' }}>
              <div className="modal-header" style={{ 
                padding: '1rem 1.5rem', 
                borderBottom: '1px solid #dee2e6',
                backgroundColor: '#f8f9fa'
              }}>
                <h5 className="modal-title" style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>
                  📦 Wybierz produkt do przyjęcia
                </h5>
                <button 
                  type="button" 
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    padding: '0',
                    lineHeight: '1'
                  }}
                  onClick={() => setShowProductModal(false)}
                >×</button>
              </div>
              <div className="modal-body" style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <input
                    type="text"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      fontSize: '0.9rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      outline: 'none'
                    }}
                    placeholder="🔍 Szukaj produktów po nazwie lub kodzie..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div style={{ 
                  maxHeight: '450px', 
                  overflowY: 'auto',
                  border: '1px solid #dee2e6',
                  borderRadius: '0.375rem'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead style={{ 
                      position: 'sticky', 
                      top: 0, 
                      backgroundColor: '#f8f9fa',
                      borderBottom: '2px solid #dee2e6'
                    }}>
                      <tr>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600' }}>Nazwa produktu</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600', width: '120px' }}>Kod</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: '600', width: '100px' }}>Stan mag.</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: '600', width: '100px' }}>Akcja</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
                            {searchTerm ? 'Nie znaleziono produktów' : 'Wpisz nazwę lub kod produktu, aby wyszukać'}
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
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <div style={{ fontWeight: '500', color: '#212529' }}>{product.name}</div>
                              {product.category && (
                                <small style={{ color: '#6c757d', fontSize: '0.75rem' }}>{product.category}</small>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <code style={{ 
                                backgroundColor: '#e9ecef', 
                                padding: '0.2rem 0.4rem', 
                                borderRadius: '0.25rem',
                                fontSize: '0.8rem'
                              }}>
                                {product.barcode || product.product_code || '-'}
                              </code>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                              <span style={{ 
                                display: 'inline-block',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontSize: '0.8rem',
                                fontWeight: '500',
                                backgroundColor: (product.stock_quantity || 0) > 0 ? '#d1e7dd' : '#fff3cd',
                                color: (product.stock_quantity || 0) > 0 ? '#0a3622' : '#664d03'
                              }}>
                                {product.stock_quantity || 0} {product.unit || 'szt'}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                              <button
                                style={{
                                  padding: '0.4rem 0.75rem',
                                  fontSize: '0.8rem',
                                  fontWeight: '500',
                                  border: 'none',
                                  borderRadius: '0.25rem',
                                  backgroundColor: '#198754',
                                  color: 'white',
                                  cursor: 'pointer',
                                  transition: 'background-color 0.15s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#157347'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#198754'}
                                onClick={() => addProduct(product)}
                              >
                                + Dodaj
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '0.75rem', 
                  backgroundColor: '#e7f3ff', 
                  borderRadius: '0.375rem',
                  fontSize: '0.8rem',
                  color: '#0c63e4'
                }}>
                  💡 Wpisz minimum 2 znaki, aby wyszukać produkty. Kliknij "Dodaj" aby dodać produkt do listy przyjęcia.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal szczegółów PW */}
      {showDetailsModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 1050
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '0.5rem', 
            width: '90%', 
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'hidden',
            boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ 
              padding: '1rem 1.5rem', 
              borderBottom: '1px solid #dee2e6',
              backgroundColor: '#f8f9fa',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h5 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
                📋 Szczegóły Przyjęcia Wewnętrznego
              </h5>
              <button 
                onClick={() => {
                  setShowDetailsModal(false);
                  setReceiptDetails(null);
                  setSelectedReceipt(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0',
                  lineHeight: '1'
                }}
              >×</button>
            </div>
            
            <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: 'calc(80vh - 60px)' }}>
              {loadingDetails ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    border: '4px solid #e9ecef',
                    borderTop: '4px solid #20c997',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto'
                  }}></div>
                  <p style={{ marginTop: '1rem', color: '#6c757d' }}>Ładowanie szczegółów...</p>
                </div>
              ) : (
                <>
                  {/* Nagłówek dokumentu */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, 1fr)', 
                    gap: '1rem',
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '0.375rem'
                  }}>
                    <div>
                      <small style={{ color: '#6c757d' }}>Numer dokumentu</small>
                      <div style={{ fontWeight: '600', fontSize: '1rem' }}>
                        {selectedReceipt?.document_number || '-'}
                      </div>
                    </div>
                    <div>
                      <small style={{ color: '#6c757d' }}>Data</small>
                      <div style={{ fontWeight: '600', fontSize: '1rem' }}>
                        {selectedReceipt?.receipt_date ? new Date(selectedReceipt.receipt_date).toLocaleDateString('pl-PL') : '-'}
                      </div>
                    </div>
                    <div>
                      <small style={{ color: '#6c757d' }}>Status</small>
                      <div>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.8rem',
                          fontWeight: '500',
                          backgroundColor: selectedReceipt?.status === 'completed' ? '#d1e7dd' : '#fff3cd',
                          color: selectedReceipt?.status === 'completed' ? '#0a3622' : '#664d03'
                        }}>
                          {selectedReceipt?.status === 'completed' ? 'Zakończone' : 'Oczekujące'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <small style={{ color: '#6c757d' }}>Utworzył</small>
                      <div style={{ fontWeight: '500' }}>
                        {selectedReceipt?.created_by || 'System'}
                      </div>
                    </div>
                  </div>

                  {/* Lista produktów */}
                  <h6 style={{ marginBottom: '0.75rem', fontWeight: '600' }}>📦 Produkty w dokumencie</h6>
                  {receiptDetails?.items && receiptDetails.items.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                          <th style={{ padding: '0.75rem', textAlign: 'left' }}>Produkt</th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', width: '100px' }}>Ilość</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left' }}>Powód</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receiptDetails.items.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: '0.75rem' }}>
                              <div style={{ fontWeight: '500' }}>{item.product_name || `Produkt #${item.product_id}`}</div>
                              {item.product_code && (
                                <small style={{ color: '#6c757d' }}>{item.product_code}</small>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '0.25rem 0.5rem',
                                backgroundColor: '#e7f3ff',
                                borderRadius: '0.25rem',
                                fontWeight: '600',
                                color: '#0c63e4'
                              }}>
                                +{item.quantity}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem', color: '#6c757d' }}>
                              {item.reason || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '2rem', 
                      color: '#6c757d',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '0.375rem'
                    }}>
                      Brak pozycji w dokumencie
                    </div>
                  )}

                  {/* Podsumowanie */}
                  {receiptDetails?.items && receiptDetails.items.length > 0 && (
                    <div style={{ 
                      marginTop: '1rem', 
                      padding: '0.75rem 1rem',
                      backgroundColor: '#d1e7dd',
                      borderRadius: '0.375rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontWeight: '500', color: '#0a3622' }}>
                        Suma pozycji: {receiptDetails.items.length}
                      </span>
                      <span style={{ fontWeight: '600', color: '#0a3622' }}>
                        Łączna ilość: +{receiptDetails.items.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternalReceipt;
