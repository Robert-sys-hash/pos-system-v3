import React, { useState, useEffect, useCallback } from 'react';
import { warehouseService } from '../services/warehouseService';
import InterWarehouseTransfer from '../components/warehouse/InterWarehouseTransfer';

const WarehousePage = () => {
  const [inventory, setInventory] = useState({
    products: [],
    pagination: { page: 1, limit: 20, total: 0, pages: 0 }
  });
  
  const [currentFilters, setCurrentFilters] = useState({
    search: '', 
    category: '', 
    available_only: false
  });
  
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('inventory');

  // Funkcja do ładowania danych magazynowych
  const loadInventoryData = useCallback(async (filters = currentFilters, page = 1) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await warehouseService.getInventory({
        ...filters,
        page,
        limit: 20
      });
      
      setInventory(response.data);
      setStats(response.stats || {});
      
    } catch (error) {
      console.error('Błąd ładowania danych magazynowych:', error);
      setError('Błąd podczas ładowania danych magazynowych');
    } finally {
      setLoading(false);
    }
  }, [currentFilters]);

  // Ładowanie danych przy pierwszym uruchomieniu
  useEffect(() => {
    loadInventoryData();
  }, []);

  // Funkcja do obsługi filtrów
  const handleFilter = useCallback(async (filters, page = 1) => {
    setCurrentFilters(filters);
    await loadInventoryData(filters, page);
  }, [loadInventoryData]);

  if (loading) {
    return (
      <div style={{ width: '100%', padding: '1rem' }}>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Ładowanie magazynu...</span>
          </div>
          <div className="mt-2">Ładowanie danych magazynowych...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ width: '100%', padding: '1rem' }}>
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Błąd!</h4>
          <p>{error}</p>
          <button 
            className="btn btn-outline-danger" 
            onClick={() => loadInventoryData()}
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', padding: '1rem' }}>
      <div className="row">
        <div className="col-12">
          <h1>Warehouse Page</h1>
          
          {/* Zakładki główne */}
          <div className="mb-4">
            <ul className="nav nav-tabs nav-fill">
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'inventory' ? 'active' : ''}`}
                  onClick={() => setActiveTab('inventory')}
                >
                  📦 Magazyn
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'transfers' ? 'active' : ''}`}
                  onClick={() => setActiveTab('transfers')}
                >
                  🔄 Transfery
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'stats' ? 'active' : ''}`}
                  onClick={() => setActiveTab('stats')}
                >
                  📊 Statystyki
                </button>
              </li>
            </ul>
          </div>

          {/* Zawartość zakładek */}
          {activeTab === 'transfers' && <InterWarehouseTransfer />}
          
          {activeTab === 'inventory' && (
            <div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Wyszukaj produkty..."
                    value={currentFilters.search}
                    onChange={(e) => handleFilter({...currentFilters, search: e.target.value})}
                  />
                </div>
                <div className="col-md-3">
                  <select
                    className="form-select"
                    value={currentFilters.category}
                    onChange={(e) => handleFilter({...currentFilters, category: e.target.value})}
                  >
                    <option value="">Wszystkie kategorie</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={currentFilters.available_only}
                      onChange={(e) => handleFilter({...currentFilters, available_only: e.target.checked})}
                    />
                    <label className="form-check-label">
                      Tylko dostępne
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Nazwa produktu</th>
                      <th>Kategoria</th>
                      <th>Stan</th>
                      <th>Cena</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.products.length > 0 ? (
                      inventory.products.map(product => (
                        <tr key={product.id}>
                          <td>{product.product_code || product.barcode || '-'}</td>
                          <td>{product.name || product.nazwa || '-'}</td>
                          <td>{product.category || product.kategoria || '-'}</td>
                          <td>
                            <span className={`badge ${product.stock_quantity > 0 ? 'bg-success' : 'bg-danger'}`}>
                              {product.stock_quantity || product.stan_magazynowy || 0}
                            </span>
                          </td>
                          <td>{product.price ? `${product.price} zł` : (product.cena ? `${product.cena} zł` : '-')}</td>
                          <td>
                            <span className={`badge ${product.status_class === 'success' ? 'bg-success' : product.status_class === 'warning' ? 'bg-warning' : 'bg-danger'}`}>
                              {product.status_text || (product.stock_quantity > 0 ? 'Dostępny' : 'Brak')}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center">
                          Brak produktów do wyświetlenia
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {inventory.pagination && inventory.pagination.pages > 1 && (
                <nav aria-label="Paginacja produktów">
                  <ul className="pagination justify-content-center">
                    <li className={`page-item ${inventory.pagination.page <= 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => handleFilter(currentFilters, inventory.pagination.page - 1)}
                        disabled={inventory.pagination.page <= 1}
                      >
                        Poprzednia
                      </button>
                    </li>
                    
                    {[...Array(inventory.pagination.pages)].map((_, i) => (
                      <li key={i + 1} className={`page-item ${inventory.pagination.page === i + 1 ? 'active' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => handleFilter(currentFilters, i + 1)}
                        >
                          {i + 1}
                        </button>
                      </li>
                    ))}
                    
                    <li className={`page-item ${inventory.pagination.page >= inventory.pagination.pages ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => handleFilter(currentFilters, inventory.pagination.page + 1)}
                        disabled={inventory.pagination.page >= inventory.pagination.pages}
                      >
                        Następna
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="row">
              <div className="col-md-3">
                <div className="card text-white bg-primary mb-3">
                  <div className="card-body">
                    <h5 className="card-title">Łączna liczba produktów</h5>
                    <h2 className="card-text">{stats.total_products || inventory.pagination?.total || 0}</h2>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-white bg-success mb-3">
                  <div className="card-body">
                    <h5 className="card-title">Produkty dostępne</h5>
                    <h2 className="card-text">{stats.available_products || 0}</h2>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-white bg-warning mb-3">
                  <div className="card-body">
                    <h5 className="card-title">Produkty na wyczerpaniu</h5>
                    <h2 className="card-text">{stats.low_stock_products || 0}</h2>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-white bg-danger mb-3">
                  <div className="card-body">
                    <h5 className="card-title">Produkty niedostępne</h5>
                    <h2 className="card-text">{stats.out_of_stock_products || 0}</h2>
                  </div>
                </div>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default WarehousePage;
