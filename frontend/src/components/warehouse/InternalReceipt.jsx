import React, { useState, useEffect } from 'react';
import { warehouseService } from '../../services/warehouseService';
import { productService } from '../../services/productService';
import { useLocation } from '../../contexts/LocationContext';

const InternalReceipt = () => {
  const { locationId } = useLocation();
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
    if (activeTab === 'history' && locationId) {
      loadReceipts();
    }
  }, [activeTab]);
  
  // Osobny useEffect dla zmiany lokalizacji
  useEffect(() => {
    if (locationId && activeTab === 'history') {
      loadReceipts();
    }
  }, [locationId]);

  const loadReceipts = async () => {
    try {
      const result = await warehouseService.getInternalReceipts({
        date: dateFilter,
        status: statusFilter,
        location_id: locationId
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
        })),
        location_id: locationId
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
    <div style={{ fontSize: '12px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '0.5rem'
      }}>
        <span style={{ fontWeight: '600', fontSize: '13px' }}>📥 Przyjęcie Wewnętrzne (PW)</span>
      </div>

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
            border: activeTab === 'new' ? '1px solid #20c997' : '1px solid #e9ecef',
            borderRadius: '3px',
            backgroundColor: activeTab === 'new' ? '#20c997' : 'white',
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
          Nowe PW
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
          Historia PW
        </button>
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

      {/* Zawartość zakładek */}
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
              Produkty do przyjęcia
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
                        <input
                          type="number"
                          style={{ width: '60px', padding: '0.2rem 0.3rem', fontSize: '11px', border: '1px solid #ced4da', borderRadius: '3px' }}
                          value={product.quantity}
                          onChange={(e) => updateProductQuantity(product.id, e.target.value)}
                          min="1"
                        />
                      </td>
                      <td style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #eee' }}>
                        <input
                          type="text"
                          style={{ width: '100%', padding: '0.2rem 0.3rem', fontSize: '11px', border: '1px solid #ced4da', borderRadius: '3px' }}
                          placeholder="Powód przyjęcia..."
                          value={product.reason}
                          onChange={(e) => updateProductReason(product.id, e.target.value)}
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
                  backgroundColor: '#198754',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
                onClick={submitInternalReceipt}
                disabled={loading}
              >
                {loading ? (
                  <span>Przetwarzanie...</span>
                ) : (
                  <>
                    <i className="fas fa-check" style={{ fontSize: '10px' }}></i>
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
            <span style={{ fontWeight: '600', fontSize: '11px' }}>Historia Przyjęć Wewnętrznych</span>
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
                <option value="all">Wszystkie</option>
                <option value="completed">Zakończone</option>
                <option value="pending">Oczekujące</option>
              </select>
              <button
                onClick={loadReceipts}
                style={{ padding: '0.2rem 0.4rem', fontSize: '10px', border: '1px solid #6c757d', borderRadius: '3px', backgroundColor: 'white', cursor: 'pointer' }}
              >
                <i className="fas fa-refresh"></i>
              </button>
            </div>
          </div>
          <div style={{ padding: '0.5rem' }}>
            {receipts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: '#6c757d', fontSize: '11px' }}>
                <i className="fas fa-inbox" style={{ fontSize: '16px', marginBottom: '0.25rem', display: 'block' }}></i>
                Brak przyjęć wewnętrznych
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left' }}>Numer dokumentu</th>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left' }}>Data</th>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left' }}>Produkty</th>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left' }}>Utworzył</th>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'center' }}>Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((receipt) => (
                      <tr key={receipt.id}>
                        <td style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #eee' }}>
                          <strong>{receipt.document_number}</strong>
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #eee' }}>
                          {new Date(receipt.receipt_date).toLocaleDateString('pl-PL')}
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #eee' }}>
                          <span style={{ 
                            padding: '0.1rem 0.3rem', 
                            fontSize: '10px', 
                            backgroundColor: '#0dcaf0', 
                            color: '#000', 
                            borderRadius: '3px' 
                          }}>
                            {receipt.items_count || 0} poz.
                          </span>
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #eee' }}>
                          <span style={{ 
                            padding: '0.1rem 0.3rem', 
                            fontSize: '10px', 
                            backgroundColor: receipt.status === 'completed' ? '#198754' : '#ffc107', 
                            color: receipt.status === 'completed' ? '#fff' : '#000', 
                            borderRadius: '3px' 
                          }}>
                            {receipt.status === 'completed' ? 'Zakończone' : 'Oczekujące'}
                          </span>
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #eee', color: '#6c757d', fontSize: '10px' }}>
                          {receipt.created_by || 'System'}
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                          <button
                            style={{ 
                              padding: '0.15rem 0.3rem', 
                              fontSize: '10px', 
                              border: '1px solid #0d6efd', 
                              borderRadius: '3px', 
                              backgroundColor: 'white', 
                              color: '#0d6efd',
                              cursor: 'pointer',
                              marginRight: '0.15rem'
                            }}
                            onClick={() => handleViewDetails(receipt)}
                            title="Zobacz szczegóły"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button
                            style={{ 
                              padding: '0.15rem 0.3rem', 
                              fontSize: '10px', 
                              border: '1px solid #6c757d', 
                              borderRadius: '3px', 
                              backgroundColor: 'white', 
                              color: '#6c757d',
                              cursor: 'pointer'
                            }}
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
      )}      {/* Modal wyboru produktu - styl zgodny z Open/CloseShiftEnhancedModal */}
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
              background: 'linear-gradient(135deg, #20c997, #17a2b8)',
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
                📦
              </div>
              <div style={{ flex: 1 }}>
                <h5 style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>
                  Wybierz produkt do przyjęcia
                </h5>
                <p style={{ margin: 0, fontSize: '11px', opacity: 0.9 }}>
                  PW - Przyjęcie wewnętrzne
                </p>
              </div>
              <button
                onClick={() => setShowProductModal(false)}
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
                  placeholder="Wpisz nazwę lub kod produktu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Tabela produktów */}
              <div style={{ 
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead style={{ 
                      position: 'sticky', 
                      top: 0, 
                      backgroundColor: '#f8f9fa',
                      borderBottom: '2px solid #dee2e6'
                    }}>
                      <tr>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Nazwa produktu</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#495057', width: '120px' }}>Kod</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#495057', width: '90px' }}>Stan mag.</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#495057', width: '90px' }}>Akcja</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📦</div>
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
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ fontWeight: '500', color: '#212529', fontSize: '13px' }}>{product.name}</div>
                              {product.category && (
                                <small style={{ color: '#6c757d', fontSize: '11px' }}>{product.category}</small>
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
                                backgroundColor: (product.stock_quantity || 0) > 0 ? '#d1e7dd' : '#fff3cd',
                                color: (product.stock_quantity || 0) > 0 ? '#0a3622' : '#664d03'
                              }}>
                                {product.stock_quantity || 0} {product.unit || 'szt'}
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
                                  backgroundColor: '#20c997',
                                  color: 'white',
                                  cursor: 'pointer',
                                  transition: 'background-color 0.15s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#17a2b8'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#20c997'}
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
              </div>

              {/* Hint */}
              <div style={{ 
                marginTop: '0.75rem', 
                padding: '10px 12px', 
                backgroundColor: '#e7f3ff', 
                borderRadius: '4px',
                fontSize: '11px',
                color: '#0c63e4',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>💡</span>
                <span>Wpisz minimum 2 znaki, aby wyszukać produkty. Kliknij "Dodaj" aby dodać produkt do listy przyjęcia.</span>
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
