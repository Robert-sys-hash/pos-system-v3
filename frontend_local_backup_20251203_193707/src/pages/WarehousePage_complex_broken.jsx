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
  
  const [currentFilters, setCurrentFilters] = useState({
    search: '', 
    category: '', 
    available_only: false
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  
  // Ref aby uniknąć dependency issues
  const filtersRef = useRef(currentFilters);
  const pageRef = useRef(currentPage);
  
  // Aktualizuj refs przy zmianie state - bez useEffect aby uniknąć re-renderów
  filtersRef.current = currentFilters;
  pageRef.current = currentPage;
  
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('inventory'); // inventory, transfers, stats
  const [inventoryView, setInventoryView] = useState('all'); // all, low-stock dla widoku magazynu
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); // Flaga inicjalizacji
  
  // Stała wartość limit aby uniknąć dependency issues
  const ITEMS_PER_PAGE = 20;

  // Załaduj dane przy inicjalizacji - tylko raz
  useEffect(() => {
    if (!isInitialized) {
      loadInitialData();
    }
  }, [isInitialized]);

  const loadInitialData = async () => {
    if (isInitialized) return; // Zapobiegaj wielokrotnemu ładowaniu
    
    setLoading(true);
    try {
      // Równoległy załadunek wszystkich potrzebnych danych
      const [inventoryResult, categoriesResult, statsResult] = await Promise.all([
        warehouseService.getInventory(),
        productService.getCategories(),
        warehouseService.getWarehouseStats()
      ]);

      if (inventoryResult.success) {
        setInventory(inventoryResult.data);
      }

      if (categoriesResult.success) {
        setCategories(categoriesResult.data);
      }

      if (statsResult.success) {
        setStats(statsResult.data);
      }
      
      setIsInitialized(true); // Oznacz jako zainicjalizowane
    } catch (err) {
      setError('Błąd ładowania danych magazynowych');
      console.error('Error loading warehouse data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = useCallback(async (filters, page = 1) => {
    setLoading(true);
    setCurrentFilters(filters); // Zachowaj aktualne filtry
    setCurrentPage(page); // Zachowaj aktualną stronę
    
    try {
      const result = await warehouseService.getInventory({
        ...filters,
        page,
        limit: 20  // Użyj stałej wartości zamiast ITEMS_PER_PAGE
      });

      if (result.success) {
        setInventory(result.data);
        setError('');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Błąd filtrowania danych');
      console.error('handleFilter error:', err);
    } finally {
      setLoading(false);
    }
  }, []); // Usunięto wszystkie dependencies

  const handlePageChange = useCallback((newPage) => {
    handleFilter(filtersRef.current, newPage);
  }, [handleFilter]);

  const handleUpdateStock = async (productId, stockData) => {
    try {
      const result = await warehouseService.updateProductStock(productId, stockData);
      
      if (result.success) {
        // Odśwież dane po aktualizacji
        await handleFilter(filtersRef.current, pageRef.current);
        
        // Pokaż komunikat sukcesu
        // TODO: Dodać toast notification
        console.log('Stan magazynowy zaktualizowany:', result.message);
        
        return { success: true };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMsg = 'Błąd aktualizacji stanu magazynowego';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const handleViewHistory = (productId) => {
    // TODO: Implementuj modal z historią ruchów
    console.log('View history for product:', productId);
  };

  const handleEditProduct = (product) => {
    // Usunęte - teraz obsługuje to inline edycja w tabeli
    console.log('Edit product:', product);
  };

  const handleSaveProduct = async (productId, productData) => {
    try {
      const result = await warehouseService.updateProduct(productId, productData);
      
      if (result.success) {
        // Odśwież dane po aktualizacji
        await handleFilter(filtersRef.current, pageRef.current);
        
        // Pokaż komunikat sukcesu
        setSuccessMessage(`Produkt "${productData.name}" został zaktualizowany pomyślnie!`);
        setShowSuccessAlert(true);
        
        // Ukryj komunikat po 5 sekundach
        setTimeout(() => {
          setShowSuccessAlert(false);
          setSuccessMessage('');
        }, 5000);
        
        return { success: true };
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Error updating product:', err);
      setError('Błąd aktualizacji produktu: ' + err.message);
      throw err;
    }
  };

  const loadLowStockProducts = async () => {
    setLoading(true);
    try {
      const result = await warehouseService.getLowStockProducts(50);
      
      if (result.success) {
        setInventory(prev => ({
          ...prev,
          products: result.data,
          pagination: { ...prev.pagination, total: result.data.length }
        }));
        setInventoryView('low-stock');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Błąd ładowania produktów o niskim stanie');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !inventory.products.length) {
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

  return (
    <div style={{ width: '100%', padding: '1rem' }}>
      <div className="row">
        <div className="col-12">
          {/* Nagłówek - modernizowany design */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '1.5rem',
            padding: '1.25rem 1.5rem',
            backgroundColor: 'white',
            border: '1px solid #e9ecef',
            borderRadius: '0.5rem',
            boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '3rem',
                height: '3rem',
                backgroundColor: '#e7f1ff',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #0d6efd'
              }}>
                <i className="fas fa-warehouse" style={{ 
                  color: '#0d6efd', 
                  fontSize: '1.25rem' 
                }}></i>
              </div>
              <div>
                <h1 style={{ 
                  margin: 0, 
                  fontSize: '1.4rem', 
                  fontWeight: '700',
                  color: '#212529',
                  letterSpacing: '-0.025em'
                }}>
                  Zarządzanie Magazynem
                </h1>
                <p style={{ 
                  margin: '0.25rem 0 0 0', 
                  fontSize: '0.875rem', 
                  color: '#6c757d',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem'
                }}>
                  <i className="fas fa-info-circle" style={{ fontSize: '0.8rem' }}></i>
                  System zarządzania stanami magazynowymi produktów
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button 
                onClick={loadLowStockProducts}
                disabled={loading}
                style={{ 
                  padding: '0.625rem 1.125rem',
                  fontSize: '0.875rem',
                  border: '1px solid #ffc107',
                  borderRadius: '0.375rem',
                  backgroundColor: '#fff3cd',
                  color: '#664d03',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: '500',
                  transition: 'all 0.15s ease-in-out'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = '#ffeaa7';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 0.25rem 0.5rem rgba(255, 193, 7, 0.25)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = '#fff3cd';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }
                }}
              >
                <i className="fas fa-exclamation-triangle"></i>
                Niskie stany
                <span style={{ 
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  backgroundColor: '#ffc107',
                  color: '#212529',
                  borderRadius: '0.25rem',
                  fontWeight: '600',
                  minWidth: '1.5rem',
                  textAlign: 'center'
                }}>
                  {stats.out_of_stock || 0}
                </span>
              </button>
              <button 
                onClick={loadInitialData}
                disabled={loading}
                style={{ 
                  padding: '0.625rem 1.125rem',
                  fontSize: '0.875rem',
                  border: '1px solid #0d6efd',
                  borderRadius: '0.375rem',
                  backgroundColor: '#0d6efd',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: '500',
                  transition: 'all 0.15s ease-in-out'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = '#0b5ed7';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 0.25rem 0.5rem rgba(13, 110, 253, 0.25)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = '#0d6efd';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }
                }}
              >
                <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
                {loading ? 'Ładowanie...' : 'Odśwież'}
              </button>
            </div>
          </div>

          {/* Zakładki główne */}
          <div className="mb-4">
            <ul className="nav nav-tabs nav-fill">
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

          {/* Zawartość zakładek */}
          {activeTab === 'transfers' && <InterWarehouseTransfer />}
          
          {activeTab === 'inventory' && (
            <div>
              {/* Filtry i akcje magazynu */}
              {stats && Object.keys(stats).length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  marginBottom: '1rem',
                  flexWrap: 'wrap'
                }}>
              <div style={{ 
                flex: '1', 
                minWidth: '200px',
                padding: '1rem',
                backgroundColor: 'white',
                border: '1px solid #e9ecef',
                borderLeft: '4px solid #0d6efd',
                borderRadius: '0.375rem',
                boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: '1.5rem', 
                      fontWeight: '700',
                      color: '#0d6efd'
                    }}>
                      {stats.total_products || inventory.pagination?.total || 0}
                    </h3>
                    <p style={{ 
                      margin: '0.25rem 0 0 0', 
                      fontSize: '0.8rem', 
                      color: '#6c757d'
                    }}>
                      Wszystkie produkty
                    </p>
                  </div>
                  <i className="fas fa-boxes fa-2x" style={{ color: '#0d6efd', opacity: 0.3 }}></i>
                </div>
              </div>
              
              <div style={{ 
                flex: '1', 
                minWidth: '200px',
                padding: '1rem',
                backgroundColor: 'white',
                border: '1px solid #e9ecef',
                borderLeft: '4px solid #28a745',
                borderRadius: '0.375rem',
                boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: '1.5rem', 
                      fontWeight: '700',
                      color: '#28a745'
                    }}>
                      {stats.in_stock || Math.floor((inventory.pagination?.total || 0) * 0.6)}
                    </h3>
                    <p style={{ 
                      margin: '0.25rem 0 0 0', 
                      fontSize: '0.8rem', 
                      color: '#6c757d'
                    }}>
                      Na stanie
                    </p>
                  </div>
                  <i className="fas fa-check-circle fa-2x" style={{ color: '#28a745', opacity: 0.3 }}></i>
                </div>
              </div>
              
              <div style={{ 
                flex: '1', 
                minWidth: '200px',
                padding: '1rem',
                backgroundColor: 'white',
                border: '1px solid #e9ecef',
                borderLeft: '4px solid #dc3545',
                borderRadius: '0.375rem',
                boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: '1.5rem', 
                      fontWeight: '700',
                      color: '#dc3545'
                    }}>
                      {stats.out_of_stock || Math.floor((inventory.pagination?.total || 0) * 0.1)}
                    </h3>
                    <p style={{ 
                      margin: '0.25rem 0 0 0', 
                      fontSize: '0.8rem', 
                      color: '#6c757d'
                    }}>
                      Brak na stanie
                    </p>
                  </div>
                  <i className="fas fa-exclamation-triangle fa-2x" style={{ color: '#dc3545', opacity: 0.3 }}></i>
                </div>
              </div>
              
              <div style={{ 
                flex: '1', 
                minWidth: '200px',
                padding: '1rem',
                backgroundColor: 'white',
                border: '1px solid #e9ecef',
                borderLeft: '4px solid #ffc107',
                borderRadius: '0.375rem',
                boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: '1.5rem', 
                      fontWeight: '700',
                      color: '#ffc107'
                    }}>
                      {(stats.avg_price || 25.50).toFixed(2)} zł
                    </h3>
                    <p style={{ 
                      margin: '0.25rem 0 0 0', 
                      fontSize: '0.8rem', 
                      color: '#6c757d'
                    }}>
                      Średnia cena
                    </p>
                  </div>
                  <i className="fas fa-chart-line fa-2x" style={{ color: '#ffc107', opacity: 0.3 }}></i>
                </div>
              </div>
            </div>
          )}

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

          {/* Zakładki - modernizowane */}
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
                border: inventoryView === 'all' ? '1px solid #0d6efd' : '1px solid #e9ecef',
                borderRadius: '0.375rem',
                backgroundColor: inventoryView === 'all' ? '#0d6efd' : 'white',
                color: inventoryView === 'all' ? 'white' : '#495057',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.15s ease-in-out'
              }}
              onClick={() => {
                setInventoryView('all');
                handleFilter(filtersRef.current, 1);
              }}
              onMouseEnter={(e) => {
                if (inventoryView !== 'all') {
                  e.target.style.backgroundColor = '#f8f9fa';
                  e.target.style.borderColor = '#0d6efd';
                }
              }}
              onMouseLeave={(e) => {
                if (inventoryView !== 'all') {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.borderColor = '#e9ecef';
                }
              }}
            >
              <i className="fas fa-list"></i>
              Wszystkie produkty
              <span style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                backgroundColor: inventoryView === 'all' ? 'rgba(255,255,255,0.2)' : '#e7f1ff',
                color: inventoryView === 'all' ? 'white' : '#0d6efd',
                borderRadius: '0.25rem',
                fontWeight: '600',
                minWidth: '1.5rem',
                textAlign: 'center'
              }}>
                {inventory.pagination.total}
              </span>
            </button>
            <button
              style={{
                padding: '0.75rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                border: inventoryView === 'low-stock' ? '1px solid #ffc107' : '1px solid #e9ecef',
                borderRadius: '0.375rem',
                backgroundColor: inventoryView === 'low-stock' ? '#ffc107' : 'white',
                color: inventoryView === 'low-stock' ? '#212529' : '#495057',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.15s ease-in-out'
              }}
              onClick={() => {
                setInventoryView('low-stock');
                loadLowStockProducts();
              }}
              onMouseEnter={(e) => {
                if (inventoryView !== 'low-stock') {
                  e.target.style.backgroundColor = '#fff3cd';
                  e.target.style.borderColor = '#ffc107';
                }
              }}
              onMouseLeave={(e) => {
                if (inventoryView !== 'low-stock') {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.borderColor = '#e9ecef';
                }
              }}
            >
              <i className="fas fa-exclamation-triangle"></i>
              Niskie stany
              <span style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                backgroundColor: inventoryView === 'low-stock' ? 'rgba(33,37,41,0.1)' : '#fff3cd',
                color: inventoryView === 'low-stock' ? '#212529' : '#664d03',
                borderRadius: '0.25rem',
                fontWeight: '600',
                minWidth: '1.5rem',
                textAlign: 'center'
              }}>
                {stats.out_of_stock || 0}
              </span>
            </button>
          </div>

          {/* Tabela produktów */}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-0 pb-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0 text-dark">
                  <i className="fas fa-table text-primary me-2"></i>
                  {inventoryView === 'low-stock' ? 'Produkty wymagające uzupełnienia' : 'Lista produktów'}
                </h5>
                <div className="d-flex align-items-center gap-2">
                  {loading && (
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Ładowanie...</span>
                    </div>
                  )}
                  <span className="text-muted small">Na stronę:</span>
                  <select
                    className="form-select form-select-sm"
                    style={{ width: 'auto' }}
                    value={ITEMS_PER_PAGE}
                    onChange={(e) => {
                      // Gdy zmieniamy limit, musimy ponownie załadować z nowym limitem
                      console.log('Changing items per page to:', e.target.value);
                      // Dla uproszczenia, na razie używamy stałej wartości
                    }}
                    disabled
                  >
                    <option value={10}>10 na stronę</option>
                    <option value={20}>20 na stronę</option>
                    <option value={50}>50 na stronę</option>
                    <option value={100}>100 na stronę</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              <InventoryTable
                products={inventory.products}
                onUpdateStock={handleUpdateStock}
                onEditProduct={handleEditProduct}
                onSaveProduct={handleSaveProduct}
                loading={loading}
              />
            </div>

            {/* Paginacja - Modernizowana */}
            {inventory.pagination.pages > 1 && (
              <div style={{ 
                backgroundColor: 'white',
                borderTop: '1px solid #e9ecef',
                padding: '1rem 1.5rem',
                borderRadius: '0 0 0.5rem 0.5rem'
              }}>
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}>
                  {/* Informacje o wynikach - po lewej */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                      color: '#6c757d'
                    }}>
                      <i className="fas fa-info-circle" style={{ color: '#0d6efd' }}></i>
                      <span style={{ fontWeight: '500' }}>
                        Strona <span style={{ 
                          color: '#0d6efd', 
                          fontWeight: '600',
                          padding: '0.125rem 0.375rem',
                          backgroundColor: '#e7f1ff',
                          borderRadius: '0.25rem'
                        }}>{inventory.pagination.page}</span> z <span style={{ fontWeight: '600' }}>{inventory.pagination.pages}</span>
                      </span>
                      <span style={{ 
                        margin: '0 0.5rem',
                        color: '#dee2e6',
                        fontSize: '1rem'
                      }}>|</span>
                      <span>
                        Pokazano <span style={{ 
                          color: '#198754', 
                          fontWeight: '600',
                          padding: '0.125rem 0.375rem',
                          backgroundColor: '#d1e7dd',
                          borderRadius: '0.25rem'
                        }}>{inventory.products?.length || 0}</span> z <span style={{ fontWeight: '600' }}>{inventory.pagination.total}</span> produktów
                      </span>
                    </div>
                  </div>
                  
                  {/* Kontrolki paginacji - po prawej */}
                  <div>
                    <nav aria-label="Nawigacja stron">
                      <div style={{ 
                        display: 'flex',
                        gap: '0.25rem',
                        boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
                        borderRadius: '0.375rem',
                        overflow: 'hidden'
                      }} role="group" aria-label="Paginacja">
                        {/* Przycisk pierwszej strony */}
                        <button
                          type="button"
                          style={{
                            padding: '0.5rem 0.75rem',
                            fontSize: '0.875rem',
                            border: '1px solid #0d6efd',
                            backgroundColor: inventory.pagination.page === 1 ? '#f8f9fa' : 'white',
                            color: inventory.pagination.page === 1 ? '#6c757d' : '#0d6efd',
                            cursor: inventory.pagination.page === 1 ? 'not-allowed' : 'pointer',
                            borderRadius: '0.375rem 0 0 0.375rem',
                            transition: 'all 0.15s ease-in-out'
                          }}
                          onClick={() => handlePageChange(1)}
                          disabled={inventory.pagination.page === 1 || loading}
                          title="Pierwsza strona"
                          onMouseEnter={(e) => {
                            if (!e.target.disabled) {
                              e.target.style.backgroundColor = '#e7f1ff';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!e.target.disabled) {
                              e.target.style.backgroundColor = 'white';
                            }
                          }}
                        >
                          <i className="fas fa-angle-double-left"></i>
                        </button>
                        
                        {/* Przycisk poprzedniej strony */}
                        <button
                          type="button"
                          style={{
                            padding: '0.5rem 0.875rem',
                            fontSize: '0.875rem',
                            border: '1px solid #0d6efd',
                            borderLeft: 'none',
                            backgroundColor: inventory.pagination.page === 1 ? '#f8f9fa' : 'white',
                            color: inventory.pagination.page === 1 ? '#6c757d' : '#0d6efd',
                            cursor: inventory.pagination.page === 1 ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s ease-in-out'
                          }}
                          onClick={() => handlePageChange(inventory.pagination.page - 1)}
                          disabled={inventory.pagination.page === 1 || loading}
                          title="Poprzednia strona"
                          onMouseEnter={(e) => {
                            if (!e.target.disabled) {
                              e.target.style.backgroundColor = '#e7f1ff';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!e.target.disabled) {
                              e.target.style.backgroundColor = 'white';
                            }
                          }}
                        >
                          <i className="fas fa-chevron-left me-1"></i>
                          Poprzednia
                        </button>
                        
                        {/* Numery stron */}
                        {(() => {
                          const pages = [];
                          const currentPage = inventory.pagination.page;
                          const totalPages = inventory.pagination.pages;
                          let startPage = Math.max(1, currentPage - 2);
                          let endPage = Math.min(totalPages, currentPage + 2);
                          
                          // Jeśli jesteśmy blisko początku, pokaż więcej stron na końcu
                          if (currentPage <= 3) {
                            endPage = Math.min(totalPages, 5);
                          }
                          
                          // Jeśli jesteśmy blisko końca, pokaż więcej stron na początku
                          if (currentPage >= totalPages - 2) {
                            startPage = Math.max(1, totalPages - 4);
                          }
                          
                          // Dodaj pierwszą stronę i separator jeśli potrzeba
                          if (startPage > 1) {
                            pages.push(
                              <button
                                key={1}
                                type="button"
                                style={{
                                  padding: '0.5rem 0.75rem',
                                  fontSize: '0.875rem',
                                  border: '1px solid #0d6efd',
                                  borderLeft: 'none',
                                  backgroundColor: 'white',
                                  color: '#0d6efd',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease-in-out'
                                }}
                                onClick={() => handlePageChange(1)}
                                disabled={loading}
                                onMouseEnter={(e) => {
                                  if (!e.target.disabled) {
                                    e.target.style.backgroundColor = '#e7f1ff';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!e.target.disabled) {
                                    e.target.style.backgroundColor = 'white';
                                  }
                                }}
                              >
                                1
                              </button>
                            );
                            if (startPage > 2) {
                              pages.push(
                                <span key="dots1" style={{
                                  padding: '0.5rem 0.75rem',
                                  fontSize: '0.875rem',
                                  border: '1px solid #dee2e6',
                                  borderLeft: 'none',
                                  backgroundColor: '#f8f9fa',
                                  color: '#6c757d',
                                  cursor: 'default'
                                }}>
                                  ...
                                </span>
                              );
                            }
                          }
                          
                          // Dodaj strony w zakresie
                          for (let i = startPage; i <= endPage; i++) {
                            const isActive = i === currentPage;
                            pages.push(
                              <button
                                key={i}
                                type="button"
                                style={{
                                  padding: '0.5rem 0.75rem',
                                  fontSize: '0.875rem',
                                  border: `1px solid ${isActive ? '#0d6efd' : '#0d6efd'}`,
                                  borderLeft: 'none',
                                  backgroundColor: isActive ? '#0d6efd' : 'white',
                                  color: isActive ? 'white' : '#0d6efd',
                                  cursor: 'pointer',
                                  fontWeight: isActive ? '600' : '400',
                                  transition: 'all 0.15s ease-in-out'
                                }}
                                onClick={() => handlePageChange(i)}
                                disabled={loading}
                                onMouseEnter={(e) => {
                                  if (!e.target.disabled && !isActive) {
                                    e.target.style.backgroundColor = '#e7f1ff';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!e.target.disabled && !isActive) {
                                    e.target.style.backgroundColor = 'white';
                                  }
                                }}
                              >
                                {i}
                              </button>
                            );
                          }
                          
                          // Dodaj ostatnią stronę i separator jeśli potrzeba
                          if (endPage < totalPages) {
                            if (endPage < totalPages - 1) {
                              pages.push(
                                <span key="dots2" style={{
                                  padding: '0.5rem 0.75rem',
                                  fontSize: '0.875rem',
                                  border: '1px solid #dee2e6',
                                  borderLeft: 'none',
                                  backgroundColor: '#f8f9fa',
                                  color: '#6c757d',
                                  cursor: 'default'
                                }}>
                                  ...
                                </span>
                              );
                            }
                            pages.push(
                              <button
                                key={totalPages}
                                type="button"
                                style={{
                                  padding: '0.5rem 0.75rem',
                                  fontSize: '0.875rem',
                                  border: '1px solid #0d6efd',
                                  borderLeft: 'none',
                                  backgroundColor: 'white',
                                  color: '#0d6efd',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease-in-out'
                                }}
                                onClick={() => handlePageChange(totalPages)}
                                disabled={loading}
                                onMouseEnter={(e) => {
                                  if (!e.target.disabled) {
                                    e.target.style.backgroundColor = '#e7f1ff';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!e.target.disabled) {
                                    e.target.style.backgroundColor = 'white';
                                  }
                                }}
                              >
                                {totalPages}
                              </button>
                            );
                          }
                          
                          return pages;
                        })()}
                        
                        {/* Przycisk następnej strony */}
                        <button
                          type="button"
                          style={{
                            padding: '0.5rem 0.875rem',
                            fontSize: '0.875rem',
                            border: '1px solid #0d6efd',
                            borderLeft: 'none',
                            backgroundColor: inventory.pagination.page === inventory.pagination.pages ? '#f8f9fa' : 'white',
                            color: inventory.pagination.page === inventory.pagination.pages ? '#6c757d' : '#0d6efd',
                            cursor: inventory.pagination.page === inventory.pagination.pages ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s ease-in-out'
                          }}
                          onClick={() => handlePageChange(inventory.pagination.page + 1)}
                          disabled={inventory.pagination.page === inventory.pagination.pages || loading}
                          title="Następna strona"
                          onMouseEnter={(e) => {
                            if (!e.target.disabled) {
                              e.target.style.backgroundColor = '#e7f1ff';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!e.target.disabled) {
                              e.target.style.backgroundColor = 'white';
                            }
                          }}
                        >
                          Następna
                          <i className="fas fa-chevron-right ms-1"></i>
                        </button>
                        
                        {/* Przycisk ostatniej strony */}
                        <button
                          type="button"
                          style={{
                            padding: '0.5rem 0.75rem',
                            fontSize: '0.875rem',
                            border: '1px solid #0d6efd',
                            borderLeft: 'none',
                            backgroundColor: inventory.pagination.page === inventory.pagination.pages ? '#f8f9fa' : 'white',
                            color: inventory.pagination.page === inventory.pagination.pages ? '#6c757d' : '#0d6efd',
                            cursor: inventory.pagination.page === inventory.pagination.pages ? 'not-allowed' : 'pointer',
                            borderRadius: '0 0.375rem 0.375rem 0',
                            transition: 'all 0.15s ease-in-out'
                          }}
                          onClick={() => handlePageChange(inventory.pagination.pages)}
                          disabled={inventory.pagination.page === inventory.pagination.pages || loading}
                          title="Ostatnia strona"
                          onMouseEnter={(e) => {
                            if (!e.target.disabled) {
                              e.target.style.backgroundColor = '#e7f1ff';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!e.target.disabled) {
                              e.target.style.backgroundColor = 'white';
                            }
                          }}
                        >
                          <i className="fas fa-angle-double-right"></i>
                        </button>
                      </div>
                    </nav>
                  </div>
                </div>
                
                {/* Szybkie przejście do strony - ulepszone */}
                {inventory.pagination.pages > 10 && (
                  <div style={{ 
                    marginTop: '1rem',
                    display: 'flex',
                    justifyContent: 'center'
                  }}>
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      maxWidth: '250px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '0.5rem',
                      padding: '0.5rem',
                      border: '1px solid #e9ecef'
                    }}>
                      <div style={{
                        padding: '0.375rem 0.5rem',
                        backgroundColor: 'white',
                        borderRadius: '0.25rem 0 0 0.25rem',
                        border: '1px solid #ced4da',
                        borderRight: 'none'
                      }}>
                        <i className="fas fa-search" style={{ color: '#6c757d', fontSize: '0.8rem' }}></i>
                      </div>
                      <input
                        type="number"
                        style={{
                          padding: '0.375rem 0.5rem',
                          fontSize: '0.875rem',
                          border: '1px solid #ced4da',
                          borderLeft: 'none',
                          borderRight: 'none',
                          textAlign: 'center',
                          width: '80px',
                          outline: 'none'
                        }}
                        placeholder="Nr"
                        min="1"
                        max={inventory.pagination.pages}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const page = parseInt(e.target.value);
                            if (page >= 1 && page <= inventory.pagination.pages) {
                              handlePageChange(page);
                              e.target.value = '';
                            }
                          }
                        }}
                        disabled={loading}
                      />
                      <div style={{
                        padding: '0.375rem 0.5rem',
                        backgroundColor: 'white',
                        borderRadius: '0 0.25rem 0.25rem 0',
                        border: '1px solid #ced4da',
                        borderLeft: 'none',
                        fontSize: '0.8rem',
                        color: '#6c757d'
                      }}>
                        / {inventory.pagination.pages}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          {activeTab === 'stats' && (
            <div>
              {/* Statystyki - kompaktowy design */}
              {stats && Object.keys(stats).length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  marginBottom: '1rem',
                  flexWrap: 'wrap'
                }}>
                  {/* Karta - Wszystkie produkty */}
                  <div style={{
                    flex: '1',
                    minWidth: '250px',
                    backgroundColor: 'white',
                    border: '1px solid #e9ecef',
                    borderRadius: '0.5rem',
                    padding: '1.25rem',
                    boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '3rem',
                        height: '3rem',
                        backgroundColor: '#e7f1ff',
                        borderRadius: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #0d6efd'
                      }}>
                        <i className="fas fa-box" style={{ color: '#0d6efd', fontSize: '1.25rem' }}></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#6c757d',
                          fontWeight: '500',
                          marginBottom: '0.25rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Wszystkie produkty
                        </div>
                        <div style={{
                          fontSize: '1.875rem',
                          fontWeight: '700',
                          color: '#0d6efd',
                          lineHeight: '1'
                        }}>
                          {stats.total_products || inventory.pagination?.total || 0}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#28a745',
                          marginTop: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <i className="fas fa-chart-line"></i>
                          W systemie
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Karta - Dostępne produkty */}
                  <div style={{
                    flex: '1',
                    minWidth: '250px',
                    backgroundColor: 'white',
                    border: '1px solid #e9ecef',
                    borderRadius: '0.5rem',
                    padding: '1.25rem',
                    boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '3rem',
                        height: '3rem',
                        backgroundColor: '#dcfce7',
                        borderRadius: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #22c55e'
                      }}>
                        <i className="fas fa-check-circle" style={{ color: '#22c55e', fontSize: '1.25rem' }}></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#6c757d',
                          fontWeight: '500',
                          marginBottom: '0.25rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Na stanie
                        </div>
                        <div style={{
                          fontSize: '1.875rem',
                          fontWeight: '700',
                          color: '#22c55e',
                          lineHeight: '1'
                        }}>
                          {stats.in_stock || Math.floor((inventory.pagination?.total || 0) * 0.6)}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#22c55e',
                          marginTop: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <i className="fas fa-arrow-up"></i>
                          Dostępne
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Karta - Brak na stanie */}
                  <div style={{
                    flex: '1',
                    minWidth: '250px',
                    backgroundColor: 'white',
                    border: '1px solid #e9ecef',
                    borderRadius: '0.5rem',
                    padding: '1.25rem',
                    boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
                    background: 'linear-gradient(135deg, #ffffff 0%, #fef7f7 100%)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '3rem',
                        height: '3rem',
                        backgroundColor: '#fee2e2',
                        borderRadius: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #ef4444'
                      }}>
                        <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444', fontSize: '1.25rem' }}></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#6c757d',
                          fontWeight: '500',
                          marginBottom: '0.25rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Brak na stanie
                        </div>
                        <div style={{
                          fontSize: '1.875rem',
                          fontWeight: '700',
                          color: '#ef4444',
                          lineHeight: '1'
                        }}>
                          {stats.out_of_stock || Math.floor((inventory.pagination?.total || 0) * 0.1)}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#ef4444',
                          marginTop: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <i className="fas fa-arrow-down"></i>
                          Wymaga uzupełnienia
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Karta - Średnia cena */}
                  <div style={{
                    flex: '1',
                    minWidth: '250px',
                    backgroundColor: 'white',
                    border: '1px solid #e9ecef',
                    borderRadius: '0.5rem',
                    padding: '1.25rem',
                    boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
                    background: 'linear-gradient(135deg, #ffffff 0%, #fefbf0 100%)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '3rem',
                        height: '3rem',
                        backgroundColor: '#fef3c7',
                        borderRadius: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #f59e0b'
                      }}>
                        <i className="fas fa-coins" style={{ color: '#f59e0b', fontSize: '1.25rem' }}></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#6c757d',
                          fontWeight: '500',
                          marginBottom: '0.25rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Średnia cena
                        </div>
                        <div style={{
                          fontSize: '1.875rem',
                          fontWeight: '700',
                          color: '#f59e0b',
                          lineHeight: '1'
                        }}>
                          {(stats.avg_price || 25.50).toFixed(2)} zł
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#f59e0b',
                          marginTop: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <i className="fas fa-calculator"></i>
                          Za produkt
                        </div>
                      </div>
                    </div>
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
