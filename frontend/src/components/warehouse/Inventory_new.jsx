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
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>📋 Inwentaryzacja</h3>
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

      {/* Zakładki */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => setActiveTab('new')}
          >
            <i className="fas fa-plus me-2"></i>
            Nowa inwentaryzacja
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <i className="fas fa-history me-2"></i>
            Historia inwentaryzacji
          </button>
        </li>
      </ul>

      {/* Zakładka nowej inwentaryzacji */}
      {activeTab === 'new' && (
        <>
          {!isInventoryStarted ? (
            // Panel startowy inwentaryzacji
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Ustawienia inwentaryzacji</h5>
                <button 
                  className="btn btn-success"
                  onClick={startInventory}
                  disabled={loading}
                >
                  <i className="fas fa-play me-2"></i>
                  Rozpocznij inwentaryzację
                </button>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Kategoria (opcjonalnie)</label>
                      <select 
                        className="form-select"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                      >
                        <option value="">Wszystkie kategorie</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <small className="text-muted">
                        Możesz ograniczyć inwentaryzację do wybranej kategorii
                      </small>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Szukaj produktów</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Nazwa produktu, kod, kod kreskowy..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <small className="text-muted">
                        Podgląd produktów do inwentaryzacji
                      </small>
                    </div>
                  </div>
                </div>

                {/* Podgląd produktów */}
                {(searchTerm || selectedCategory) && (
                  <div className="mt-4">
                    <h6>Produkty do inwentaryzacji ({products.length})</h6>
                    <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      <table className="table table-sm">
                        <thead className="sticky-top bg-white">
                          <tr>
                            <th>Nazwa</th>
                            <th>Kod</th>
                            <th>Kategoria</th>
                            <th>Stan systemowy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map(product => (
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
                                <small>{product.category_name || 'Brak kategorii'}</small>
                              </td>
                              <td>
                                <span className="badge bg-info">
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
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Inwentaryzacja w toku</h5>
                <div>
                  <button 
                    className="btn btn-secondary me-2"
                    onClick={cancelInventory}
                  >
                    <i className="fas fa-times me-2"></i>
                    Anuluj
                  </button>
                  <button 
                    className="btn btn-success"
                    onClick={finishInventory}
                    disabled={loading}
                  >
                    <i className="fas fa-check me-2"></i>
                    Zakończ inwentaryzację
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Produkt</th>
                        <th>Kod</th>
                        <th>Stan systemowy</th>
                        <th>Stan rzeczywisty</th>
                        <th>Różnica</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryData.map((item) => (
                        <tr key={item.product_id}>
                          <td>
                            <strong>{item.product_name}</strong>
                            {item.product_description && (
                              <>
                                <br />
                                <small className="text-muted">{item.product_description}</small>
                              </>
                            )}
                          </td>
                          <td>
                            <code>{item.product_code || 'Brak'}</code>
                          </td>
                          <td>
                            <span className="badge bg-info">
                              {item.system_count} {item.unit || 'szt'}
                            </span>
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-control"
                              style={{ width: '120px' }}
                              value={item.actual_count || ''}
                              onChange={(e) => updateInventoryCount(item.product_id, e.target.value)}
                              min="0"
                              placeholder="0"
                            />
                          </td>
                          <td>
                            {item.actual_count !== undefined && item.actual_count !== null && (
                              <span className={`badge ${
                                (item.actual_count - item.system_count) === 0 
                                  ? 'bg-success' 
                                  : (item.actual_count - item.system_count) > 0 
                                    ? 'bg-warning' 
                                    : 'bg-danger'
                              }`}>
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
        <div className="card">
          <div className="card-header">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">Historia inwentaryzacji</h5>
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
                  <option value="active">Aktywne</option>
                  <option value="completed">Zakończone</option>
                </select>
                <button 
                  className="btn btn-outline-primary btn-sm"
                  onClick={loadInventorySessions}
                >
                  <i className="fas fa-sync-alt"></i>
                </button>
              </div>
            </div>
          </div>
          <div className="card-body">
            {inventorySessions.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-muted">
                  <i className="fas fa-history fa-2x mb-2"></i>
                  <p>Brak sesji inwentaryzacji</p>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Data rozpoczęcia</th>
                      <th>Data zakończenia</th>
                      <th>Status</th>
                      <th>Liczba produktów</th>
                      <th>Utworzył</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventorySessions.map((session) => (
                      <tr key={session.id}>
                        <td>
                          {new Date(session.started_at).toLocaleDateString('pl-PL')}
                          <br />
                          <small className="text-muted">
                            {new Date(session.started_at).toLocaleTimeString('pl-PL')}
                          </small>
                        </td>
                        <td>
                          {session.finished_at ? (
                            <>
                              {new Date(session.finished_at).toLocaleDateString('pl-PL')}
                              <br />
                              <small className="text-muted">
                                {new Date(session.finished_at).toLocaleTimeString('pl-PL')}
                              </small>
                            </>
                          ) : (
                            <span className="text-muted">W toku</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${session.status === 'completed' ? 'bg-success' : 'bg-warning'}`}>
                            {session.status === 'completed' ? 'Zakończona' : 'Aktywna'}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-info">
                            {session.total_products || 0}
                          </span>
                        </td>
                        <td>
                          <small>{session.created_by || 'System'}</small>
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
