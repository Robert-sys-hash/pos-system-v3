import React, { useState, useEffect } from 'react';
import { warehouseService } from '../../services/warehouseService';
import { productService } from '../../services/productService';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isInventoryStarted, setIsInventoryStarted] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Historia inwentaryzacji
  const [inventorySessions, setInventorySessions] = useState([]);
  const [activeTab, setActiveTab] = useState('new');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadInventorySessions();
    }
  }, [activeTab, dateFilter, statusFilter]);

  useEffect(() => {
    if (searchTerm || selectedCategory) {
      const timeoutId = setTimeout(() => {
        loadProducts();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, selectedCategory]);

  const loadInventorySessions = async () => {
    try {
      const result = await warehouseService.getInventorySessions({
        date: dateFilter,
        status: statusFilter
      });
      if (result.success) {
        setInventorySessions(result.data || []);
      }
    } catch (err) {
      console.error('Błąd ładowania sesji inwentaryzacji:', err);
    }
  };

  const loadInitialData = async () => {
    try {
      // Załaduj kategorie
      const categoriesResult = await productService.getCategories();
      if (categoriesResult.success) {
        setCategories(categoriesResult.data || []);
      }

      // Sprawdź czy jest aktywna inwentaryzacja
      const activeInventory = await warehouseService.getActiveInventory();
      if (activeInventory.success && activeInventory.data) {
        setIsInventoryStarted(true);
        setInventoryData(activeInventory.data.products || []);
      }
    } catch (err) {
      console.error('Błąd ładowania danych:', err);
    }
  };

  const loadProducts = async () => {
    try {
      const result = await productService.searchProducts({ 
        search: searchTerm,
        category: selectedCategory
      });
      if (result.success) {
        setProducts(result.data?.products || []);
      }
    } catch (err) {
      console.error('Błąd ładowania produktów:', err);
    }
  };

  const startInventory = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await warehouseService.startInventory({
        category: selectedCategory
      });

      if (result.success) {
        setIsInventoryStarted(true);
        setInventoryData(result.data.products || []);
        setSuccess('Inwentaryzacja została rozpoczęta');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Błąd podczas rozpoczynania inwentaryzacji');
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem');
    } finally {
      setLoading(false);
    }
  };

  const updateInventoryCount = (productId, actualCount) => {
    setInventoryData(prev => prev.map(item => 
      item.product_id === productId 
        ? { ...item, actual_count: parseInt(actualCount) || 0 }
        : item
    ));
  };

  const finishInventory = async () => {
    // Sprawdź czy wszystkie produkty mają wprowadzone stany
    const missingCounts = inventoryData.filter(item => 
      item.actual_count === undefined || item.actual_count === null
    );
    
    if (missingCounts.length > 0) {
      setError('Wprowadź stany dla wszystkich produktów przed zakończeniem inwentaryzacji');
      return;
    }

    setLoading(true);
    try {
      const result = await warehouseService.finishInventory({
        products: inventoryData.map(item => ({
          product_id: item.product_id,
          system_count: item.system_count,
          actual_count: item.actual_count,
          difference: item.actual_count - item.system_count
        }))
      });

      if (result.success) {
        setSuccess('Inwentaryzacja została zakończona pomyślnie');
        setIsInventoryStarted(false);
        setInventoryData([]);
        loadInventorySessions(); // Odśwież historię
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Błąd podczas kończenia inwentaryzacji');
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem');
    } finally {
      setLoading(false);
    }
  };

  const cancelInventory = () => {
    setIsInventoryStarted(false);
    setInventoryData([]);
  };

  return (
    <div style={{ fontSize: '12px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '0.5rem'
      }}>
        <span style={{ fontWeight: '600', fontSize: '13px' }}>📋 Inwentaryzacja</span>
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
            border: activeTab === 'new' ? '1px solid #6f42c1' : '1px solid #e9ecef',
            borderRadius: '3px',
            backgroundColor: activeTab === 'new' ? '#6f42c1' : 'white',
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
          Nowa inwentaryzacja
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
          Historia inwentaryzacji
        </button>
      </div>

      {/* Zakładka nowej inwentaryzacji */}
      {activeTab === 'new' && (
        <>
          {!isInventoryStarted ? (
            // Panel startowy inwentaryzacji
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
                <span style={{ fontWeight: '600', fontSize: '11px' }}>Ustawienia inwentaryzacji</span>
                <button 
                  style={{
                    padding: '0.3rem 0.6rem',
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
                  onClick={startInventory}
                  disabled={loading}
                >
                  <i className="fas fa-play" style={{ fontSize: '10px' }}></i>
                  Rozpocznij inwentaryzację
                </button>
              </div>
              <div style={{ padding: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '10px', fontWeight: '600', display: 'block', marginBottom: '0.15rem' }}>Kategoria (opcjonalnie)</label>
                      <select 
                        style={{ width: '100%', padding: '0.25rem 0.5rem', fontSize: '11px', border: '1px solid #ced4da', borderRadius: '3px' }}
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                      >
                        <option value="">Wszystkie kategorie</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <span style={{ fontSize: '9px', color: '#6c757d' }}>
                        Możesz ograniczyć do wybranej kategorii
                      </span>
                    </div>
                  </div>
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '10px', fontWeight: '600', display: 'block', marginBottom: '0.15rem' }}>Szukaj produktów</label>
                      <input
                        type="text"
                        style={{ width: '100%', padding: '0.25rem 0.5rem', fontSize: '11px', border: '1px solid #ced4da', borderRadius: '3px' }}
                        placeholder="Nazwa produktu, kod..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <span style={{ fontSize: '9px', color: '#6c757d' }}>
                        Podgląd produktów do inwentaryzacji
                      </span>
                    </div>
                  </div>
                </div>

                {/* Podgląd produktów */}
                {(searchTerm || selectedCategory) && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <span style={{ fontWeight: '600', fontSize: '11px' }}>Produkty do inwentaryzacji ({products.length})</span>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '0.25rem' }}>
                      <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa' }}>
                          <tr>
                            <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Nazwa</th>
                            <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Kod</th>
                            <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Kategoria</th>
                            <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Stan systemowy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map(product => (
                            <tr key={product.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                              <td style={{ padding: '0.3rem 0.5rem' }}>
                                <strong>{product.name}</strong>
                                {product.description && (
                                  <>
                                    <br />
                                    <small style={{ color: '#6c757d', fontSize: '10px' }}>{product.description}</small>
                                  </>
                                )}
                              </td>
                              <td style={{ padding: '0.3rem 0.5rem' }}>
                                <code style={{ fontSize: '10px', backgroundColor: '#f1f3f4', padding: '1px 4px', borderRadius: '2px' }}>{product.barcode || product.product_code || 'Brak'}</code>
                              </td>
                              <td style={{ padding: '0.3rem 0.5rem' }}>
                                <small style={{ fontSize: '10px' }}>{product.category_name || 'Brak kategorii'}</small>
                              </td>
                              <td style={{ padding: '0.3rem 0.5rem' }}>
                                <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: '#0dcaf0', color: 'white', borderRadius: '3px' }}>
                                  {product.stock_quantity || 0} {product.unit || 'szt'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Panel aktywnej inwentaryzacji
            <div className="card" style={{ fontSize: '12px' }}>
              <div className="card-header d-flex justify-content-between align-items-center" style={{ padding: '0.4rem 0.75rem' }}>
                <h5 className="card-title mb-0" style={{ fontSize: '13px', fontWeight: '600' }}>Inwentaryzacja w toku</h5>
                <div>
                  <button 
                    style={{ padding: '0.3rem 0.6rem', fontSize: '11px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', marginRight: '0.5rem' }}
                    onClick={cancelInventory}
                  >
                    <i className="fas fa-times me-1"></i>
                    Anuluj
                  </button>
                  <button 
                    style={{ padding: '0.3rem 0.6rem', fontSize: '11px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px' }}
                    onClick={finishInventory}
                    disabled={loading}
                  >
                    <i className="fas fa-check me-1"></i>
                    Zakończ inwentaryzację
                  </button>
                </div>
              </div>
              <div className="card-body" style={{ padding: '0.5rem 0.75rem' }}>
                <div className="table-responsive">
                  <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Produkt</th>
                        <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Kod</th>
                        <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Stan systemowy</th>
                        <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Stan rzeczywisty</th>
                        <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Różnica</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryData.map((item) => (
                        <tr key={item.product_id} style={{ borderBottom: '1px solid #e9ecef' }}>
                          <td style={{ padding: '0.3rem 0.5rem' }}>
                            <strong>{item.product_name}</strong>
                            {item.product_description && (
                              <>
                                <br />
                                <small style={{ color: '#6c757d', fontSize: '10px' }}>{item.product_description}</small>
                              </>
                            )}
                          </td>
                          <td style={{ padding: '0.3rem 0.5rem' }}>
                            <code style={{ fontSize: '10px', backgroundColor: '#f1f3f4', padding: '1px 4px', borderRadius: '2px' }}>{item.product_code || 'Brak'}</code>
                          </td>
                          <td style={{ padding: '0.3rem 0.5rem' }}>
                            <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: '#0dcaf0', color: 'white', borderRadius: '3px' }}>
                              {item.system_count} {item.unit || 'szt'}
                            </span>
                          </td>
                          <td style={{ padding: '0.3rem 0.5rem' }}>
                            <input
                              type="number"
                              style={{ width: '80px', fontSize: '11px', padding: '0.2rem 0.4rem', border: '1px solid #ced4da', borderRadius: '3px' }}
                              value={item.actual_count || ''}
                              onChange={(e) => updateInventoryCount(item.product_id, e.target.value)}
                              min="0"
                              placeholder="0"
                            />
                          </td>
                          <td style={{ padding: '0.3rem 0.5rem' }}>
                            {item.actual_count !== undefined && item.actual_count !== null && (
                              <span style={{ 
                                fontSize: '10px', 
                                padding: '2px 6px', 
                                color: 'white', 
                                borderRadius: '3px',
                                backgroundColor: (item.actual_count - item.system_count) === 0 
                                  ? '#28a745' 
                                  : (item.actual_count - item.system_count) > 0 
                                    ? '#ffc107' 
                                    : '#dc3545'
                              }}>
                                {item.actual_count - item.system_count > 0 ? '+' : ''}
                                {item.actual_count - item.system_count}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Zakładka historii inwentaryzacji */}
      {activeTab === 'history' && (
        <div className="card" style={{ fontSize: '12px' }}>
          <div className="card-header" style={{ padding: '0.4rem 0.75rem' }}>
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0" style={{ fontSize: '13px', fontWeight: '600' }}>Historia inwentaryzacji</h5>
              <div className="d-flex gap-2">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  style={{ width: '120px', fontSize: '10px', padding: '0.2rem 0.4rem', border: '1px solid #ced4da', borderRadius: '3px' }}
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ width: '100px', fontSize: '10px', padding: '0.2rem 0.4rem', border: '1px solid #ced4da', borderRadius: '3px' }}
                >
                  <option value="">Wszystkie</option>
                  <option value="active">Aktywne</option>
                  <option value="completed">Zakończone</option>
                </select>
                <button 
                  style={{ padding: '0.25rem 0.5rem', fontSize: '10px', backgroundColor: 'white', color: '#0d6efd', border: '1px solid #0d6efd', borderRadius: '3px' }}
                  onClick={loadInventorySessions}
                >
                  <i className="fas fa-sync-alt"></i>
                </button>
              </div>
            </div>
          </div>
          <div className="card-body" style={{ padding: '0.5rem 0.75rem' }}>
            {inventorySessions.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-muted">
                  <i className="fas fa-history fa-2x mb-2"></i>
                  <p style={{ fontSize: '11px' }}>Brak sesji inwentaryzacji</p>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Data rozpoczęcia</th>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Data zakończenia</th>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Status</th>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Liczba produktów</th>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Utworzył</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventorySessions.map((session) => (
                      <tr key={session.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <td style={{ padding: '0.3rem 0.5rem' }}>
                          {new Date(session.started_at).toLocaleDateString('pl-PL')}
                          <br />
                          <small style={{ color: '#6c757d', fontSize: '10px' }}>
                            {new Date(session.started_at).toLocaleTimeString('pl-PL')}
                          </small>
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem' }}>
                          {session.finished_at ? (
                            <>
                              {new Date(session.finished_at).toLocaleDateString('pl-PL')}
                              <br />
                              <small style={{ color: '#6c757d', fontSize: '10px' }}>
                                {new Date(session.finished_at).toLocaleTimeString('pl-PL')}
                              </small>
                            </>
                          ) : (
                            <span style={{ color: '#6c757d' }}>W toku</span>
                          )}
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem' }}>
                          <span style={{ 
                            fontSize: '10px', 
                            padding: '2px 6px', 
                            color: 'white', 
                            borderRadius: '3px',
                            backgroundColor: session.status === 'completed' ? '#28a745' : '#ffc107'
                          }}>
                            {session.status === 'completed' ? 'Zakończona' : 'Aktywna'}
                          </span>
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem' }}>
                          <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: '#0dcaf0', color: 'white', borderRadius: '3px' }}>
                            {session.total_products || 0}
                          </span>
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem' }}>
                          <small style={{ fontSize: '10px' }}>{session.created_by || 'System'}</small>
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
    </div>
  );
};

export default Inventory;
