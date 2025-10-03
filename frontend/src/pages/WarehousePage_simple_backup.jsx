import React, { useState, useEffect, useCallback, useRef } from 'react';
import { warehouseService } from '../services/warehouseService';
import { productService } from '../services/productService';
import InventoryTable from '../components/warehouse/InventoryTable';
import InventoryFilters from '../components/warehouse/InventoryFilters';
import InterWarehouseTransfer from '../components/warehouse/InterWarehouseTransfer';

const WarehousePage = () => {
  const [inventory, setInventory] = useState({
    products: [],
    pagination: { page: 1, limit: 20, total: 0, pages: 0 }
  });
  const [categories, setCategories] = useState([]);
  const [filtersRef, setFiltersRef] = useState({});
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('inventory');
  const [inventoryView, setInventoryView] = useState('all');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    if (!isInitialized) {
      loadInitialData();
    }
  }, [isInitialized]);

  const loadInitialData = async () => {
    console.log('🔄 Ładowanie danych magazynu...');
    setLoading(true);
    setError('');
    
    try {
      setIsInitialized(true);
      
      const categoriesResult = await productService.getCategories();
      if (categoriesResult.success) {
        setCategories(categoriesResult.data || []);
      } else {
        console.warn('⚠️ Błąd ładowania kategorii:', categoriesResult.error);
      }

    } catch (error) {
      console.error('❌ Błąd ładowania danych magazynu:', error);
      setError('Nie udało się załadować danych magazynu');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async (filters, page = 1) => {
    console.log('🔍 Filtrowanie produktów:', filters, 'strona:', page);
    // Implementation here
  };

  if (loading && !inventory.products.length) {
    return (
      <div style={{ width: '100%', padding: '2rem', textAlign: 'center' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Ładowanie...</span>
        </div>
        <p className="mt-2 text-muted">Ładowanie danych magazynu...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', padding: '1rem' }}>
      <div className="row">
        <div className="col-12">
          {/* Nagłówek */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '1.5rem',
            padding: '1rem',
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            border: '1px solid #e9ecef',
            boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
          }}>
            <div>
              <h2 style={{ margin: 0, color: '#495057', fontSize: '1.5rem', fontWeight: '600' }}>
                <i className="fas fa-warehouse text-primary me-2"></i>
                Zarządzanie Magazynem
              </h2>
              <p style={{ margin: '0.25rem 0 0 0', color: '#6c757d', fontSize: '0.9rem' }}>
                Przeglądaj i zarządzaj stanem magazynowym
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'white',
                  backgroundColor: '#28a745',
                  border: '1px solid #28a745',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onClick={loadInitialData}
                disabled={loading}
              >
                <i style={{
                  fontSize: '0.875rem',
                  transform: loading ? 'rotate(360deg)' : 'none',
                  transition: 'transform 1s linear'
                }}></i>
                {loading ? 'Ładowanie...' : 'Odśwież'}
              </button>
            </div>
          </div>

          {/* Zakładki główne */}
          <div>
            <ul className="nav nav-tabs">
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'inventory' ? 'active' : ''}`}
                  onClick={() => setActiveTab('inventory')}
                  style={{ border: 'none', background: 'none' }}
                >
                  📦 Magazyn
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'transfers' ? 'active' : ''}`}
                  onClick={() => setActiveTab('transfers')}
                  style={{ border: 'none', background: 'none' }}
                >
                  🔄 Transfery
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'stats' ? 'active' : ''}`}
                  onClick={() => setActiveTab('stats')}
                  style={{ border: 'none', background: 'none' }}
                >
                  📊 Statystyki
                </button>
              </li>
            </ul>
          </div>

          {/* Zawartość zakładek - każda w osobnym bloku warunkowym */}
          {activeTab === 'transfers' && (
            <div>
              <InterWarehouseTransfer />
            </div>
          )}
          
          {activeTab === 'inventory' && (
            <div>
              <h3>Zarządzanie Magazynem</h3>
              <p>Tutaj będzie zawartość magazynu...</p>
              
              {/* Komunikaty błędów */}
              {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {error}
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setError('')}
                  ></button>
                </div>
              )}

              {/* Komunikat sukcesu */}
              {showSuccessAlert && (
                <div className="alert alert-success alert-dismissible fade show" role="alert">
                  <i className="fas fa-check-circle me-2"></i>
                  {successMessage}
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => {
                      setShowSuccessAlert(false);
                      setSuccessMessage('');
                    }}
                  ></button>
                </div>
              )}

              {/* Filtry wyszukiwania */}
              <InventoryFilters
                onFilter={handleFilter}
                categories={categories}
                loading={loading}
                totalProducts={inventory.pagination?.total || 0}
              />
            </div>
          )}

          {activeTab === 'stats' && (
            <div>
              <h3>Statystyki Magazynu</h3>
              <p>Tutaj będą statystyki...</p>
              
              {stats && Object.keys(stats).length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  marginBottom: '1rem',
                  flexWrap: 'wrap'
                }}>
                  <div style={{
                    flex: '1',
                    minWidth: '250px',
                    backgroundColor: 'white',
                    border: '1px solid #e9ecef',
                    borderRadius: '0.5rem',
                    padding: '1.25rem',
                    boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
                  }}>
                    <h5>Wszystkie produkty</h5>
                    <p>Całkowita liczba produktów: {stats.total_products || 0}</p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default WarehousePage;
