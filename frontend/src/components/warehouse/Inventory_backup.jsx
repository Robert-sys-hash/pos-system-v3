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
      const result = await productService.getProducts({ 
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

  useEffect(() => {
    if (searchTerm.length >= 2 || selectedCategory) {
      const timeoutId = setTimeout(() => {
        loadProducts();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else if (searchTerm.length === 0 && !selectedCategory) {
      loadProducts();
    }
  }, [searchTerm, selectedCategory]);

  const startInventory = async () => {
    setLoading(true);
    try {
      const result = await warehouseService.startInventory({
        category: selectedCategory || null
      });

      if (result.success) {
        setSuccess('Inwentaryzacja została rozpoczęta');
        setIsInventoryStarted(true);
        setInventoryData(result.data?.products || []);
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
    setInventoryData(prev => 
      prev.map(item => 
        item.product_id === productId 
          ? { ...item, actual_count: parseInt(actualCount) || 0 }
          : item
      )
    );
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
    setError('');
    setSuccess('Inwentaryzacja została anulowana');
    setTimeout(() => setSuccess(''), 3000);
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
        <div>

      {!isInventoryStarted ? (
        // Panel startowy inwentaryzacji
        <div className="card">
          <div className="card-header">
            <h5 className="card-title mb-0">Ustawienia inwentaryzacji</h5>
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
            </div>
            <div className="alert alert-info">
              <h6>💡 Jak działa inwentaryzacja:</h6>
              <ul className="mb-0">
                <li>System wygeneruje listę wszystkich produktów z aktualnym stanem systemowym</li>
                <li>Wprowadź rzeczywisty stan dla każdego produktu</li>
                <li>System automatycznie obliczy różnice i zaktualizuje stany</li>
                <li>Wszystkie zmiany będą zalogowane w historii magazynu</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        // Panel inwentaryzacji w toku
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="alert alert-warning mb-0">
              <i className="fas fa-exclamation-triangle me-2"></i>
              <strong>Inwentaryzacja w toku</strong> - wprowadź rzeczywiste stany produktów
            </div>
            <div>
              <button 
                className="btn btn-secondary me-2"
                onClick={cancelInventory}
              >
                <i className="fas fa-times me-1"></i>
                Anuluj
              </button>
              <button 
                className="btn btn-success"
                onClick={finishInventory}
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
                    Zakończ inwentaryzację
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                Produkty do zinwentaryzowania ({inventoryData.length})
              </h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Produkt</th>
                      <th>Kod</th>
                      <th>Stan systemowy</th>
                      <th>Stan rzeczywisty</th>
                      <th>Różnica</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryData.map((item) => {
                      const actualCount = item.actual_count ?? '';
                      const difference = actualCount !== '' ? actualCount - item.system_count : null;
                      const isComplete = actualCount !== '';
                      
                      return (
                        <tr key={item.product_id}>
                          <td>
                            <strong>{item.product_name}</strong>
                            {item.description && (
                              <>
                                <br />
                                <small className="text-muted">{item.description}</small>
                              </>
                            )}
                          </td>
                          <td>
                            <code>{item.product_code}</code>
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
                              value={actualCount}
                              onChange={(e) => updateInventoryCount(item.product_id, e.target.value)}
                              placeholder="0"
                              min="0"
                            />
                          </td>
                          <td>
                            {difference !== null && (
                              <span className={`badge ${
                                difference === 0 ? 'bg-success' : 
                                difference > 0 ? 'bg-primary' : 'bg-danger'
                              }`}>
                                {difference > 0 ? '+' : ''}{difference}
                              </span>
                            )}
                          </td>
                          <td>
                            {isComplete ? (
                              <span className="badge bg-success">
                                <i className="fas fa-check me-1"></i>
                                Gotowe
                              </span>
                            ) : (
                              <span className="badge bg-warning">
                                <i className="fas fa-clock me-1"></i>
                                Oczekuje
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Podsumowanie */}
              <div className="row mt-4">
                <div className="col-md-12">
                  <div className="card bg-light">
                    <div className="card-body">
                      <h6>📊 Podsumowanie inwentaryzacji:</h6>
                      <div className="row">
                        <div className="col-md-3">
                          <div className="text-center">
                            <div className="h4 text-primary">
                              {inventoryData.length}
                            </div>
                            <small>Produktów łącznie</small>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="text-center">
                            <div className="h4 text-success">
                              {inventoryData.filter(item => item.actual_count !== undefined && item.actual_count !== null).length}
                            </div>
                            <small>Zinwentaryzowane</small>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="text-center">
                            <div className="h4 text-warning">
                              {inventoryData.filter(item => item.actual_count === undefined || item.actual_count === null).length}
                            </div>
                            <small>Pozostało</small>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="text-center">
                            <div className="h4 text-info">
                              {Math.round((inventoryData.filter(item => item.actual_count !== undefined && item.actual_count !== null).length / inventoryData.length) * 100)}%
                            </div>
                            <small>Postęp</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Inventory;
