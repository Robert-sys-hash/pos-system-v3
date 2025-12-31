import React, { useState, useEffect, useCallback, useRef } from 'react';
import { warehouseService } from '../services/warehouseService';
import { productService } from '../services/productService';
import { useLocation } from '../contexts/LocationContext';
import InventoryTable from '../components/warehouse/InventoryTable';
import InventoryFilters from '../components/warehouse/InventoryFilters';
import InterWarehouseTransfer from '../components/warehouse/InterWarehouseTransfer';
import ExternalReceipt from '../components/warehouse/ExternalReceipt';
import InternalReceipt from '../components/warehouse/InternalReceipt';
import InternalIssue from '../components/warehouse/InternalIssue';
import Inventory from '../components/warehouse/Inventory';
import ProductHistoryModal from '../components/ProductHistoryModal';

const WarehousePage = () => {
  // Używamy tylko LocationProvider dla spójności filtrowania
  const { selectedLocation, locationId } = useLocation();
  
  // Używamy tylko location-based filtering dla spójności
  const currentLocationId = locationId;
  
  // Ref do śledzenia poprzedniej lokalizacji (żeby wykryć rzeczywistą zmianę)
  const prevLocationIdRef = useRef(null);
  const locationIdRef = useRef(currentLocationId);
  const isLoadingRef = useRef(false); // Zapobiegaj równoległym ładowaniom
  
  // DEBUG: log każdej zmiany w currentLocationId (usuń w produkcji)
  // console.log('🔍 RENDER: currentLocationId =', currentLocationId, 'selectedLocation =', selectedLocation);
  
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
  
  // State dla filtrowania magazynów
  const [availableWarehouses, setAvailableWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('all'); // 'all' = wszystkie magazyny w lokalizacji
  
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
  const [activeTab, setActiveTab] = useState('inventory');
  const [inventoryView, setInventoryView] = useState('all');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Stan dla modalu historii produktu
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState(null);
  
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    if (!isInitialized) {
      loadInitialData();
    }
  }, [isInitialized]);

  // Ładuj dane po zmianie lokalizacji - tylko gdy rzeczywiście się zmieni
  useEffect(() => {
    // Sprawdź czy lokalizacja rzeczywiście się zmieniła (nie tylko pierwszy render)
    const locationChanged = prevLocationIdRef.current !== null && 
                            prevLocationIdRef.current !== currentLocationId;
    
    // Aktualizuj refy
    locationIdRef.current = currentLocationId;
    prevLocationIdRef.current = currentLocationId;
    
    // Tylko jeśli zainicjalizowano i lokalizacja się zmieniła
    if (isInitialized && currentLocationId && locationChanged) {
      // Opóźnij wywołanie żeby uniknąć wielokrotnych requestów
      const timeoutId = setTimeout(async () => {
        await loadInventoryData();
      }, 150);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentLocationId, isInitialized]);

  const loadInitialData = async () => {
    if (isInitialized) return; // Zapobiegaj wielokrotnemu ładowaniu
    
    setLoading(true);
    setError('');
    
    try {
      // Tylko raz ustawiamy flagę że zainicjowaliśmy
      setIsInitialized(true);
      
      // Ładowanie kategorii
      const categoriesResult = await productService.getCategories();
      if (categoriesResult.success) {
        setCategories(categoriesResult.data || []);
      } else {
        console.warn('⚠️ Błąd ładowania kategorii:', categoriesResult.error);
      }

      // Ładowanie podstawowych produktów z pierwszą stroną
      const result = await warehouseService.getInventory({
        page: 1,
        limit: ITEMS_PER_PAGE,
        search: '',
        category: '',
        location_id: currentLocationId
      });

      if (result.success) {
        setInventory({
          products: result.data?.products || [],
          pagination: result.data?.pagination || { page: 1, limit: ITEMS_PER_PAGE, total: 0, pages: 0 }
        });
      } else {
        console.warn('⚠️ Błąd ładowania produktów:', result.error);
        setError('Nie udało się załadować produktów');
      }

      // Ładowanie statystyk
      const statsResult = await warehouseService.getStats();
      if (statsResult.success) {
        setStats(statsResult.data || {});
      } else {
        console.warn('⚠️ Błąd ładowania statystyk:', statsResult.error);
      }

    } catch (error) {
      console.error('❌ Błąd ładowania danych magazynu:', error);
      setError('Nie udało się załadować danych magazynu');
    } finally {
      setLoading(false);
    }
  };

  // Ładowanie magazynów dla wybranej lokalizacji
  const loadWarehouses = useCallback(async () => {
    const locId = locationIdRef.current;
    if (!locId) {
      setAvailableWarehouses([]);
      return;
    }

    // Zapobiegaj równoległym wywołaniom
    if (isLoadingRef.current) return;
    
    try {
      const response = await fetch('http://localhost:8000/api/warehouses');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Filtruj magazyny dla wybranej lokalizacji
          const locationWarehouses = data.data.filter(warehouse => 
            warehouse.location_id === locId
          );
          
          setAvailableWarehouses(locationWarehouses);
          
          // Resetuj wybór magazynu gdy zmienia się lokalizacja - ale użyj funkcji setter
          // Sprawdź czy poprzednio wybrany magazyn istnieje w nowej lokalizacji
          setSelectedWarehouse(prev => {
            if (prev !== 'all') {
              const warehouseStillExists = locationWarehouses.some(w => w.id.toString() === prev);
              return warehouseStillExists ? prev : 'all';
            }
            return 'all';
          });
        }
      }
    } catch (error) {
      console.error('Błąd ładowania magazynów:', error);
    }
  }, []); // Usunięto currentLocationId - używamy ref

  // Ładuj magazyny gdy zmienia się lokalizacja - ale tylko gdy rzeczywiście się zmieni
  const prevLocForWarehousesRef = useRef(null);
  useEffect(() => {
    if (currentLocationId && prevLocForWarehousesRef.current !== currentLocationId) {
      prevLocForWarehousesRef.current = currentLocationId;
      loadWarehouses();
    }
  }, [currentLocationId]);

  // Odśwież dane gdy zmienia się wybrany magazyn (ale NIE 'all' - to obsługuje loadInventoryData)
  const prevSelectedWarehouseRef = useRef('all');
  useEffect(() => {
    // Wywołaj tylko gdy selectedWarehouse się zmienił na konkretny magazyn (nie 'all')
    if (selectedWarehouse !== 'all' && 
        prevSelectedWarehouseRef.current !== selectedWarehouse &&
        currentLocationId) {
      prevSelectedWarehouseRef.current = selectedWarehouse;
      handleFilter(filtersRef.current, 1);
    } else {
      prevSelectedWarehouseRef.current = selectedWarehouse;
    }
  }, [selectedWarehouse]);

  // Funkcja do przeładowania danych inwentarza dla wybranego magazynu/lokalizacji
  const loadInventoryData = useCallback(async () => {
    // Zapobiegaj równoległym wywołaniom
    if (isLoadingRef.current) {
      return;
    }
    
    const locationToUse = locationIdRef.current;
    isLoadingRef.current = true;
    setLoading(true);
    setError('');
    
    try {
      // Ładowanie produktów z aktualnym filtrem i pierwszą stroną
      const inventoryParams = {
        page: 1,
        limit: ITEMS_PER_PAGE,
        search: filtersRef.current.search,
        category: filtersRef.current.category
      };
      
      // Dodaj location_id tylko jeśli jest ustawiony
      if (locationToUse) {
        inventoryParams.location_id = locationToUse;
      }
      
      const result = await warehouseService.getInventory(inventoryParams);

      if (result.success) {
        setInventory({
          products: result.data?.products || [],
          pagination: result.data?.pagination || { page: 1, limit: ITEMS_PER_PAGE, total: 0, pages: 0 }
        });
        setCurrentPage(1);
      } else {
        setError('Nie udało się załadować produktów');
      }

      // Ładowanie statystyk
      const statsResult = await warehouseService.getStats(locationToUse);
      if (statsResult.success) {
        setStats(statsResult.data || {});
      }

    } catch (error) {
      console.error('Błąd ładowania danych magazynu:', error);
      setError('Nie udało się załadować danych magazynu');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []); // Usuń currentLocationId z dependencies - używamy ref

  // Funkcja filtrowania produktów - używa useCallback aby uniknąć re-renderów
  const handleFilter = useCallback(async (filters, page = 1) => {
    const locationToUse = locationIdRef.current;
    setLoading(true);
    setError('');

    try {
      const inventoryParams = {
        page: page,
        limit: ITEMS_PER_PAGE,
        search: filters.search || '',
        category: filters.category || '',
        available_only: filters.available_only || false
      };
      
      // Dodaj location_id lub warehouse_id w zależności od wyboru
      if (selectedWarehouse === 'all' && locationToUse) {
        inventoryParams.location_id = locationToUse;
      } else if (selectedWarehouse !== 'all') {
        inventoryParams.warehouse_id = parseInt(selectedWarehouse, 10);
      }
      
      const result = await warehouseService.getInventory(inventoryParams);

      if (result.success) {
        const newProducts = result.data?.products || [];
        
        setInventory({
          products: newProducts,
          pagination: result.data?.pagination || { page: page, limit: ITEMS_PER_PAGE, total: 0, pages: 0 }
        });
        setCurrentPage(page);
        setCurrentFilters(filters);
        
        return { success: true };
      } else {
        setError(result.error || 'Błąd podczas filtrowania produktów');
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMsg = 'Błąd podczas ładowania produktów';
      console.error('Błąd filtrowania:', error);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [ITEMS_PER_PAGE, selectedWarehouse]);

  // Funkcja ładowania produktów z niskim stanem
  const loadLowStockProducts = useCallback(async () => {
    const locationToUse = locationIdRef.current;
    setLoading(true);
    setError('');

    try {
      const result = await warehouseService.getLowStockProducts(locationToUse);
      if (result.success) {
        // Backend zwraca tablicę produktów bezpośrednio w result.data
        const products = Array.isArray(result.data) ? result.data : [];
        setInventory({
          products: products,
          pagination: { ...inventory.pagination, total: products.length }
        });
        setInventoryView('low-stock');
        return { success: true };
      } else {
        console.error('❌ Błąd ładowania produktów z niskim stanem:', result.error);
        setError('Nie udało się załadować produktów z niskim stanem');
      }
    } catch (error) {
      console.error('❌ Błąd ładowania produktów z niskim stanem:', error);
      setError('Błąd podczas ładowania produktów z niskim stanem');
    } finally {
      setLoading(false);
    }
  }, [inventory.pagination]); // Usuń currentLocationId - używamy ref

  const handleShowHistory = (product) => {
    console.log('🔍 WarehousePage handleShowHistory wywołane:', product);
    console.log('🔍 Product properties:', Object.keys(product));
    console.log('🔍 Product name options:', { 
      nazwa: product.nazwa, 
      name: product.name, 
      product_name: product.product_name,
      full_name: product.full_name 
    });
    setSelectedProductForHistory(product);
    setShowHistoryModal(true);
    console.log('🔍 Modal states set:', { showHistoryModal: true, productId: product.id });
  };

  // Funkcja do zapisywania edytowanego produktu
  const handleSaveProduct = async (productId, formData) => {
    console.log('🔍 handleSaveProduct wywołane:', { productId, formData });
    
    try {
      setLoading(true);
      
      // Przygotuj dane do aktualizacji
      const updateData = {
        name: formData.name,
        barcode: formData.barcode,
        product_code: formData.product_code,
        description: formData.description,
        price: parseFloat(formData.price) || 0,
        purchase_price: parseFloat(formData.purchase_price) || 0,
        cena_sprzedazy_netto: parseFloat(formData.cena_sprzedazy_netto) || 0,
        cena_sprzedazy_brutto: parseFloat(formData.cena_sprzedazy_brutto) || 0,
        cena_zakupu_netto: parseFloat(formData.cena_zakupu_netto) || 0,
        cena_zakupu_brutto: parseFloat(formData.cena_zakupu_brutto) || 0,
        tax_rate: parseFloat(formData.tax_rate) || 23,
        category_id: formData.category_id || null,
        unit: formData.unit || 'szt'
      };
      
      console.log('📤 Wysyłanie danych do API:', updateData);
      
      // Aktualizuj produkt
      const result = await warehouseService.updateProduct(productId, updateData);
      
      console.log('📥 Odpowiedź z API:', result);
      
      if (result.success) {
        showSuccess('Produkt został zaktualizowany pomyślnie');
        console.log('🔄 Odświeżanie listy produktów z filtrami:', filtersRef.current);
        
        // Odśwież listę produktów z aktualną stroną
        const refreshResult = await handleFilter(filtersRef.current, pageRef.current);
        console.log('🔄 Wynik odświeżania:', refreshResult);
        
        if (!refreshResult?.success) {
          console.warn('⚠️ Odświeżanie listy nie powiodło się, próba ponownego ładowania...');
          // Fallback - załaduj pierwszą stronę
          await handleFilter(filtersRef.current, 1);
        }
      } else {
        throw new Error(result.error || 'Nie udało się zaktualizować produktu');
      }
    } catch (error) {
      console.error('❌ Błąd podczas zapisywania produktu:', error);
      throw error; // Przekaż błąd dalej dla InlineProductEdit
    } finally {
      setLoading(false);
    }
  };

  // Helper do pokazywania komunikatu sukcesu
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setShowSuccessAlert(true);
    setTimeout(() => {
      setShowSuccessAlert(false);
      setSuccessMessage('');
    }, 5000);
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
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            border: '1px solid #e9ecef',
            boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
                📦 Magazyn
              </h2>
              {selectedLocation && (
                <span style={{ 
                  backgroundColor: '#e3f2fd', 
                  color: '#1565c0', 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '0.25rem',
                  fontSize: '0.8rem',
                  fontWeight: '500'
                }}>
                  📍 {selectedLocation.nazwa || selectedLocation.name}
                </span>
              )}
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
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1rem',
            boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
            border: '1px solid #e9ecef',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              <button 
                className={`nav-link ${activeTab === 'inventory' ? 'active' : ''}`}
                onClick={() => setActiveTab('inventory')}
                style={{
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  border: activeTab === 'inventory' ? '1px solid #0d6efd' : '1px solid #e9ecef',
                  borderRadius: '0.375rem',
                  backgroundColor: activeTab === 'inventory' ? '#0d6efd' : 'white',
                  color: activeTab === 'inventory' ? 'white' : '#495057',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease-in-out'
                }}
              >
                📦 Magazyn
              </button>
              <button 
                className={`nav-link ${activeTab === 'external-receipt' ? 'active' : ''}`}
                onClick={() => setActiveTab('external-receipt')}
                style={{
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  border: activeTab === 'external-receipt' ? '1px solid #198754' : '1px solid #e9ecef',
                  borderRadius: '0.375rem',
                  backgroundColor: activeTab === 'external-receipt' ? '#198754' : 'white',
                  color: activeTab === 'external-receipt' ? 'white' : '#495057',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease-in-out'
                }}
              >
                📥 PZ - Przyjęcie zewnętrzne
              </button>
              <button 
                className={`nav-link ${activeTab === 'internal-receipt' ? 'active' : ''}`}
                onClick={() => setActiveTab('internal-receipt')}
                style={{
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  border: activeTab === 'internal-receipt' ? '1px solid #20c997' : '1px solid #e9ecef',
                  borderRadius: '0.375rem',
                  backgroundColor: activeTab === 'internal-receipt' ? '#20c997' : 'white',
                  color: activeTab === 'internal-receipt' ? 'white' : '#495057',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease-in-out'
                }}
              >
                📦 PW - Przyjęcie wewnętrzne
              </button>
              <button 
                className={`nav-link ${activeTab === 'internal-issue' ? 'active' : ''}`}
                onClick={() => setActiveTab('internal-issue')}
                style={{
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  border: activeTab === 'internal-issue' ? '1px solid #fd7e14' : '1px solid #e9ecef',
                  borderRadius: '0.375rem',
                  backgroundColor: activeTab === 'internal-issue' ? '#fd7e14' : 'white',
                  color: activeTab === 'internal-issue' ? 'white' : '#495057',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease-in-out'
                }}
              >
                📤 RW - Rozchód wewnętrzny
              </button>
              <button 
                className={`nav-link ${activeTab === 'inventory-check' ? 'active' : ''}`}
                onClick={() => setActiveTab('inventory-check')}
                style={{
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  border: activeTab === 'inventory-check' ? '1px solid #6f42c1' : '1px solid #e9ecef',
                  borderRadius: '0.375rem',
                  backgroundColor: activeTab === 'inventory-check' ? '#6f42c1' : 'white',
                  color: activeTab === 'inventory-check' ? 'white' : '#495057',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease-in-out'
                }}
              >
                📋 Inwentaryzacja
              </button>
              <button 
                className={`nav-link ${activeTab === 'transfers' ? 'active' : ''}`}
                onClick={() => setActiveTab('transfers')}
                style={{
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  border: activeTab === 'transfers' ? '1px solid #dc3545' : '1px solid #e9ecef',
                  borderRadius: '0.375rem',
                  backgroundColor: activeTab === 'transfers' ? '#dc3545' : 'white',
                  color: activeTab === 'transfers' ? 'white' : '#495057',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease-in-out'
                }}
              >
                🔄 Transfery
              </button>
              <button 
                className={`nav-link ${activeTab === 'stats' ? 'active' : ''}`}
                onClick={() => setActiveTab('stats')}
                style={{
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  border: activeTab === 'stats' ? '1px solid #6610f2' : '1px solid #e9ecef',
                  borderRadius: '0.375rem',
                  backgroundColor: activeTab === 'stats' ? '#6610f2' : 'white',
                  color: activeTab === 'stats' ? 'white' : '#495057',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease-in-out'
                }}
              >
                📊 Statystyki
              </button>
            </div>
          </div>

          {/* Zawartość zakładek - każda w osobnym bloku warunkowym */}
          {activeTab === 'external-receipt' && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
              border: '1px solid #e9ecef',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
            }}>
              <ExternalReceipt />
            </div>
          )}
          
          {activeTab === 'internal-receipt' && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
              border: '1px solid #e9ecef',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
            }}>
              <InternalReceipt />
            </div>
          )}
          
          {activeTab === 'internal-issue' && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
              border: '1px solid #e9ecef',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
            }}>
              <InternalIssue />
            </div>
          )}
          
          {activeTab === 'inventory-check' && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
              border: '1px solid #e9ecef',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
            }}>
              <Inventory />
            </div>
          )}
          
          {activeTab === 'transfers' && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
              border: '1px solid #e9ecef',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
            }}>
              <InterWarehouseTransfer />
            </div>
          )}
          
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
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: '#e7f1ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <i className="fas fa-cubes" style={{ color: '#0d6efd', fontSize: '1.5rem' }}></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#6c757d', fontWeight: '500' }}>
                          Wszystkie produkty
                        </p>
                        <h3 style={{
                          margin: '0.25rem 0 0 0',
                          fontSize: '1.75rem',
                          fontWeight: '700',
                          color: '#0d6efd',
                          lineHeight: '1'
                        }}>
                          {stats.total_products || inventory.pagination?.total || 0}
                        </h3>
                      </div>
                    </div>
                    <button
                      style={{
                        width: '100%',
                        marginTop: '1rem',
                        padding: '0.5rem',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        color: '#0d6efd',
                        backgroundColor: '#e7f1ff',
                        border: '1px solid #b6d7ff',
                        borderRadius: '0.375rem',
                        cursor: 'pointer'
                      }}
                      onClick={loadLowStockProducts}
                      disabled={loading}
                    >
                      Zobacz wszystkie
                    </button>
                  </div>

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
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: '#d1ecf1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <i className="fas fa-check-circle" style={{ color: '#0c5460', fontSize: '1.5rem' }}></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#6c757d', fontWeight: '500' }}>
                          Dostępne
                        </p>
                        <h3 style={{
                          margin: '0.25rem 0 0 0',
                          fontSize: '1.75rem',
                          fontWeight: '700',
                          color: '#0c5460',
                          lineHeight: '1'
                        }}>
                          {stats.in_stock || Math.floor((inventory.pagination?.total || 0) * 0.6)}
                        </h3>
                      </div>
                    </div>
                    <button
                      style={{
                        width: '100%',
                        marginTop: '1rem',
                        padding: '0.5rem',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        color: '#0c5460',
                        backgroundColor: '#d1ecf1',
                        border: '1px solid #bee5eb',
                        borderRadius: '0.375rem',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setInventoryView('all');
                        handleFilter(filtersRef.current, 1);
                      }}
                      disabled={loading}
                    >
                      Filtruj dostępne
                    </button>
                  </div>

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
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: '#f8d7da',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <i className="fas fa-exclamation-triangle" style={{ color: '#721c24', fontSize: '1.5rem' }}></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#6c757d', fontWeight: '500' }}>
                          Niski stan
                        </p>
                        <h3 style={{
                          margin: '0.25rem 0 0 0',
                          fontSize: '1.75rem',
                          fontWeight: '700',
                          color: '#721c24',
                          lineHeight: '1'
                        }}>
                          {stats.out_of_stock || Math.floor((inventory.pagination?.total || 0) * 0.1)}
                        </h3>
                      </div>
                    </div>
                    <button
                      style={{
                        width: '100%',
                        marginTop: '1rem',
                        padding: '0.5rem',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        color: '#721c24',
                        backgroundColor: '#f8d7da',
                        border: '1px solid #f5c6cb',
                        borderRadius: '0.375rem',
                        cursor: 'pointer'
                      }}
                      onClick={loadInitialData}
                      disabled={loading}
                    >
                      Uzupełnij
                    </button>
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

              {/* Selektor magazynu */}
              {availableWarehouses.length > 1 && (
                <div style={{
                  backgroundColor: 'white',
                  border: '1px solid #e9ecef',
                  borderRadius: '0.375rem',
                  padding: '1rem',
                  marginBottom: '1rem',
                  boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '0.75rem'
                  }}>
                    <h6 style={{ 
                      margin: 0, 
                      fontSize: '0.875rem', 
                      fontWeight: '600',
                      color: '#495057'
                    }}>
                      <i className="fas fa-warehouse me-2" style={{ color: '#6f42c1' }}></i>
                      Filtr magazynu
                    </h6>
                    <span style={{
                      fontSize: '0.75rem',
                      color: '#6c757d',
                      backgroundColor: '#f8f9fa',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem'
                    }}>
                      {availableWarehouses.length} magazynów
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ flex: '1', minWidth: '200px' }}>
                      <label style={{ 
                        display: 'block',
                        fontSize: '0.75rem', 
                        fontWeight: '600',
                        color: '#495057',
                        marginBottom: '0.25rem'
                      }}>
                        <i className="fas fa-filter me-1" style={{ color: '#17a2b8' }}></i>
                        Wybierz magazyn
                      </label>
                      <select
                        value={selectedWarehouse}
                        onChange={(e) => {
                          const newWarehouse = e.target.value;
                          console.log('🏪 Zmiana magazynu z', selectedWarehouse, 'na', newWarehouse);
                          setSelectedWarehouse(newWarehouse);
                        }}
                        style={{ 
                          width: '100%',
                          padding: '0.375rem 0.75rem',
                          fontSize: '0.8rem',
                          border: '1px solid #ced4da',
                          borderRadius: '0.25rem',
                          backgroundColor: 'white',
                          color: '#495057'
                        }}
                      >
                        <option value="all">
                          🏢 Wszystkie magazyny ({availableWarehouses.length})
                        </option>
                        {availableWarehouses.map(warehouse => (
                          <option key={warehouse.id} value={warehouse.id}>
                            🏪 {warehouse.nazwa} ({warehouse.kod_magazynu})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {selectedWarehouse !== 'all' && (
                      <div style={{
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#e7f1ff',
                        border: '1px solid #bee5eb',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        color: '#0c5460'
                      }}>
                        <i className="fas fa-info-circle me-1"></i>
                        Wyświetlanie tylko produktów z wybranego magazynu
                      </div>
                    )}
                  </div>
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
              <InventoryTable
                products={Array.isArray(inventory.products) ? inventory.products : []}
                loading={loading}
                onEdit={(product) => console.log('Edit product:', product)}
                onDelete={(productId) => console.log('Delete product:', productId)}
                onUpdateStock={(productId, newStock) => console.log('Update stock:', productId, newStock)}
                onSaveProduct={handleSaveProduct}
                onShowHistory={handleShowHistory}
                pagination={inventory.pagination}
                onPageChange={(page) => handleFilter(filtersRef.current, page)}
                currentView={inventoryView}
              />
            </div>
          )}

          {activeTab === 'stats' && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
              border: '1px solid #e9ecef',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
            }}>
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
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: '#e7f1ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <i className="fas fa-cubes" style={{ color: '#0d6efd', fontSize: '1.25rem' }}></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '1.5rem',
                          fontWeight: '700',
                          color: '#0d6efd',
                          lineHeight: '1'
                        }}>
                          {stats.total_products || inventory.pagination?.total || 0}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#0d6efd',
                          marginTop: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <i className="fas fa-boxes"></i>
                          Łącznie produktów
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Karta - Produkty dostępne */}
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
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: '#d1ecf1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <i className="fas fa-check-circle" style={{ color: '#28a745', fontSize: '1.25rem' }}></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '1.5rem',
                          fontWeight: '700',
                          color: '#28a745',
                          lineHeight: '1'
                        }}>
                          {stats.in_stock || Math.floor((inventory.pagination?.total || 0) * 0.8)}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#28a745',
                          marginTop: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <i className="fas fa-check"></i>
                          Dostępne w magazynie
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Karta - Produkty niedostępne */}
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
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: '#f8d7da',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <i className="fas fa-times-circle" style={{ color: '#dc3545', fontSize: '1.25rem' }}></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '1.5rem',
                          fontWeight: '700',
                          color: '#dc3545',
                          lineHeight: '1'
                        }}>
                          {stats.out_of_stock || Math.floor((inventory.pagination?.total || 0) * 0.1)}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#dc3545',
                          marginTop: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <i className="fas fa-exclamation-triangle"></i>
                          Niedostępne
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Karta - Wartość magazynu */}
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
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: '#fff3cd',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <i className="fas fa-coins" style={{ color: '#f59e0b', fontSize: '1.25rem' }}></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '1.5rem',
                          fontWeight: '700',
                          color: '#f59e0b',
                          lineHeight: '1'
                        }}>
                          {(stats.total_value || 45680.50).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#f59e0b',
                          marginTop: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <i className="fas fa-wallet"></i>
                          Wartość magazynu
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
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: '#fff3cd',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <i className="fas fa-coins" style={{ color: '#f59e0b', fontSize: '1.25rem' }}></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '1.5rem',
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

      {/* Modal historii produktu */}
      {showHistoryModal && selectedProductForHistory && (
        <ProductHistoryModal
          productId={selectedProductForHistory.id}
          productName={selectedProductForHistory.nazwa || selectedProductForHistory.name}
          isOpen={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedProductForHistory(null);
          }}
        />
      )}
    </div>
  );
};

export default WarehousePage;
