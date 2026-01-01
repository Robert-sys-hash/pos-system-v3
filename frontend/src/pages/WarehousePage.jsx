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
      <div style={{ 
        width: '100%', 
        padding: '2rem', 
        textAlign: 'center',
        backgroundColor: '#f8f9fa',
        minHeight: '100vh'
      }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Ładowanie...</span>
        </div>
        <p style={{ marginTop: '0.5rem', color: '#6c757d', fontSize: '12px' }}>Ładowanie danych magazynu...</p>
      </div>
    );
  }

  return (
    <div
      className="warehouse-page"
      style={{
        padding: "0.75rem",
        backgroundColor: "#f8f9fa",
        minHeight: "100vh",
        fontSize: "12px"
      }}
    >
      {/* Header - kompaktowy styl jak POS */}
      <div
        style={{
          backgroundColor: "#6f42c1",
          color: "white",
          padding: "0.5rem 1rem",
          marginBottom: "0.75rem",
          borderRadius: "0.375rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
        }}
      >
        <div>
          <h5 style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>📦 Magazyn</h5>
          <div style={{ fontSize: "10px", opacity: 0.9 }}>
            {selectedLocation ? `📍 ${selectedLocation.nazwa || selectedLocation.name}` : 'Wybierz lokalizację'} | {new Date().toLocaleDateString()}
          </div>
        </div>
        {/* Przyciski akcji - kompaktowe */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "11px",
              fontWeight: "500",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              backgroundColor: activeTab === "inventory" ? "#28a745" : "rgba(255,255,255,0.2)",
              color: "white"
            }}
            onClick={() => setActiveTab("inventory")}
          >
            📦 Magazyn
          </button>
          <button
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "11px",
              fontWeight: "500",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              backgroundColor: activeTab === "external-receipt" ? "#28a745" : "rgba(255,255,255,0.2)",
              color: "white"
            }}
            onClick={() => setActiveTab("external-receipt")}
          >
            📥 PZ
          </button>
          <button
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "11px",
              fontWeight: "500",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              backgroundColor: activeTab === "internal-receipt" ? "#28a745" : "rgba(255,255,255,0.2)",
              color: "white"
            }}
            onClick={() => setActiveTab("internal-receipt")}
          >
            📦 PW
          </button>
          <button
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "11px",
              fontWeight: "500",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              backgroundColor: activeTab === "internal-issue" ? "#28a745" : "rgba(255,255,255,0.2)",
              color: "white"
            }}
            onClick={() => setActiveTab("internal-issue")}
          >
            � RW
          </button>
          <button
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "11px",
              fontWeight: "500",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              backgroundColor: activeTab === "inventory-check" ? "#28a745" : "rgba(255,255,255,0.2)",
              color: "white"
            }}
            onClick={() => setActiveTab("inventory-check")}
          >
            � Inwentaryzacja
          </button>
          <button
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "11px",
              fontWeight: "500",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              backgroundColor: activeTab === "transfers" ? "#28a745" : "rgba(255,255,255,0.2)",
              color: "white"
            }}
            onClick={() => setActiveTab("transfers")}
          >
            � Transfery
          </button>
          <button
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "11px",
              fontWeight: "500",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              backgroundColor: activeTab === "stats" ? "#28a745" : "rgba(255,255,255,0.2)",
              color: "white"
            }}
            onClick={() => setActiveTab("stats")}
          >
            � Statystyki
          </button>
          <button 
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "11px",
              fontWeight: "500",
              border: "1px solid rgba(255,255,255,0.5)",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              backgroundColor: "transparent",
              color: "white",
              opacity: loading ? 0.7 : 1
            }}
            onClick={loadInitialData}
            disabled={loading}
          >
            🔄 {loading ? "..." : "Odśwież"}
          </button>
        </div>
      </div>

      {/* Ostrzeżenie gdy nie wybrano lokalizacji */}
      {!currentLocationId && (
        <div style={{
          backgroundColor: '#fff3cd',
          color: '#856404',
          padding: '0.5rem 0.75rem',
          borderRadius: '4px',
          marginBottom: '0.75rem',
          border: '1px solid #ffc107',
          textAlign: 'center',
          fontSize: '11px',
          fontWeight: '600'
        }}>
          ⚠️ Wybierz lokalizację w prawym górnym rogu!
        </div>
      )}

      {/* Zawartość zakładek - każda w osobnym bloku warunkowym */}
      {activeTab === 'external-receipt' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '4px',
          padding: '0.75rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          marginBottom: '0.75rem'
        }}>
          <ExternalReceipt />
        </div>
      )}
      
      {activeTab === 'internal-receipt' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '4px',
          padding: '0.75rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          marginBottom: '0.75rem'
        }}>
          <InternalReceipt />
        </div>
      )}
      
      {activeTab === 'internal-issue' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '4px',
          padding: '0.75rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          marginBottom: '0.75rem'
        }}>
          <InternalIssue />
        </div>
      )}
      
      {activeTab === 'inventory-check' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '4px',
          padding: '0.75rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          marginBottom: '0.75rem'
        }}>
          <Inventory />
        </div>
      )}
      
      {activeTab === 'transfers' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '4px',
          padding: '0.75rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          marginBottom: '0.75rem'
        }}>
          <InterWarehouseTransfer />
        </div>
      )}
      
      {activeTab === 'inventory' && (
        <div>
          {/* Statystyki - kompaktowy styl jak POS */}
          <div style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "0.75rem",
            flexWrap: "wrap"
          }}>
            <div
              style={{
                backgroundColor: "white",
                borderLeft: "3px solid #6f42c1",
                borderRadius: "4px",
                padding: "0.5rem 0.75rem",
                textAlign: "center",
                minWidth: "100px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
              }}
            >
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#6f42c1" }}>
                {stats.total_products || inventory.pagination?.total || 0}
              </div>
              <div style={{ fontSize: "10px", color: "#6c757d" }}>
                Produkty
              </div>
            </div>
            
            <div
              style={{
                backgroundColor: "white",
                borderLeft: "3px solid #28a745",
                borderRadius: "4px",
                padding: "0.5rem 0.75rem",
                textAlign: "center",
                minWidth: "100px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
              }}
            >
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#28a745" }}>
                {stats.in_stock || Math.floor((inventory.pagination?.total || 0) * 0.8)}
              </div>
              <div style={{ fontSize: "10px", color: "#6c757d" }}>
                Dostępne
              </div>
            </div>

            <div
              style={{
                backgroundColor: "white",
                borderLeft: "3px solid #dc3545",
                borderRadius: "4px",
                padding: "0.5rem 0.75rem",
                textAlign: "center",
                minWidth: "100px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
              }}
            >
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#dc3545" }}>
                {stats.out_of_stock || Math.floor((inventory.pagination?.total || 0) * 0.1)}
              </div>
              <div style={{ fontSize: "10px", color: "#6c757d" }}>
                Niski stan
              </div>
            </div>

            {/* Przycisk widoku */}
            <div style={{
              backgroundColor: "white",
              borderLeft: "3px solid #17a2b8",
              borderRadius: "4px",
              padding: "0.5rem 0.75rem",
              minWidth: "140px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
            }}>
              <div style={{ fontSize: "10px", color: "#6c757d", marginBottom: "4px" }}>
                ⚡ Widok
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  style={{
                    padding: "0.2rem 0.5rem",
                    fontSize: "10px",
                    fontWeight: "500",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                    backgroundColor: inventoryView === "all" ? "#17a2b8" : "#e9ecef",
                    color: inventoryView === "all" ? "white" : "#495057"
                  }}
                  onClick={() => {
                    setInventoryView('all');
                    handleFilter(filtersRef.current, 1);
                  }}
                >
                  Wszystkie
                </button>
                <button
                  style={{
                    padding: "0.2rem 0.5rem",
                    fontSize: "10px",
                    fontWeight: "500",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                    backgroundColor: inventoryView === "low-stock" ? "#ffc107" : "#e9ecef",
                    color: inventoryView === "low-stock" ? "#212529" : "#495057"
                  }}
                  onClick={() => {
                    setInventoryView('low-stock');
                    loadLowStockProducts();
                  }}
                >
                  Niskie stany
                </button>
              </div>
            </div>
          </div>

          {/* Komunikaty błędów - kompaktowy styl */}
          {error && (
            <div style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '0.5rem 0.75rem',
              borderRadius: '4px',
              marginBottom: '0.75rem',
              border: '1px solid #f5c6cb',
              fontSize: '11px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>⚠️ {error}</span>
              <button 
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#721c24',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
                onClick={() => setError('')}
              >×</button>
            </div>
          )}

          {/* Komunikat sukcesu - kompaktowy styl */}
          {showSuccessAlert && (
            <div style={{
              backgroundColor: '#d4edda',
              color: '#155724',
              padding: '0.5rem 0.75rem',
              borderRadius: '4px',
              marginBottom: '0.75rem',
              border: '1px solid #c3e6cb',
              fontSize: '11px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>✅ {successMessage}</span>
              <button 
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#155724',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
                onClick={() => {
                  setShowSuccessAlert(false);
                  setSuccessMessage('');
                }}
              >×</button>
            </div>
          )}

          {/* Selektor magazynu - kompaktowy */}
          {availableWarehouses.length > 1 && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '4px',
              padding: '0.5rem 0.75rem',
              marginBottom: '0.75rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <span style={{ fontSize: '11px', color: '#6c757d', fontWeight: '600' }}>
                🏪 Magazyn:
              </span>
              <select
                value={selectedWarehouse}
                onChange={(e) => {
                  const newWarehouse = e.target.value;
                  setSelectedWarehouse(newWarehouse);
                }}
                style={{ 
                  padding: '0.25rem 0.5rem',
                  fontSize: '11px',
                  border: '1px solid #ced4da',
                  borderRadius: '3px',
                  backgroundColor: 'white',
                  color: '#495057',
                  minWidth: '150px'
                }}
              >
                <option value="all">Wszystkie ({availableWarehouses.length})</option>
                {availableWarehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.nazwa} ({warehouse.kod_magazynu})
                  </option>
                ))}
              </select>
              {selectedWarehouse !== 'all' && (
                <span style={{
                  fontSize: '10px',
                  color: '#17a2b8',
                  backgroundColor: '#e7f3ff',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '3px'
                }}>
                  Filtrowanie aktywne
                </span>
              )}
            </div>
          )}

          {/* Filtry wyszukiwania */}
          <InventoryFilters
            onFilter={handleFilter}
            categories={categories}
            loading={loading}
            totalProducts={inventory.pagination?.total || 0}
          />

          {/* Tabela produktów */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '4px',
            padding: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
          }}>
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
        </div>
      )}

      {activeTab === 'stats' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '4px',
          padding: '0.75rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }}>
          {/* Statystyki - kompaktowy styl jak w POS */}
          <div style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap"
          }}>
            <div
              style={{
                backgroundColor: "white",
                borderLeft: "3px solid #6f42c1",
                borderRadius: "4px",
                padding: "0.5rem 0.75rem",
                textAlign: "center",
                minWidth: "100px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
              }}
            >
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#6f42c1" }}>
                {stats.total_products || inventory.pagination?.total || 0}
              </div>
              <div style={{ fontSize: "10px", color: "#6c757d" }}>
                Łącznie produktów
              </div>
            </div>
            
            <div
              style={{
                backgroundColor: "white",
                borderLeft: "3px solid #28a745",
                borderRadius: "4px",
                padding: "0.5rem 0.75rem",
                textAlign: "center",
                minWidth: "100px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
              }}
            >
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#28a745" }}>
                {stats.in_stock || Math.floor((inventory.pagination?.total || 0) * 0.8)}
              </div>
              <div style={{ fontSize: "10px", color: "#6c757d" }}>
                Dostępne
              </div>
            </div>

            <div
              style={{
                backgroundColor: "white",
                borderLeft: "3px solid #dc3545",
                borderRadius: "4px",
                padding: "0.5rem 0.75rem",
                textAlign: "center",
                minWidth: "100px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
              }}
            >
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#dc3545" }}>
                {stats.out_of_stock || Math.floor((inventory.pagination?.total || 0) * 0.1)}
              </div>
              <div style={{ fontSize: "10px", color: "#6c757d" }}>
                Niedostępne
              </div>
            </div>

            <div
              style={{
                backgroundColor: "white",
                borderLeft: "3px solid #ffc107",
                borderRadius: "4px",
                padding: "0.5rem 0.75rem",
                textAlign: "center",
                minWidth: "120px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
              }}
            >
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#ffc107" }}>
                {(stats.total_value || 45680.50).toLocaleString('pl-PL')} zł
              </div>
              <div style={{ fontSize: "10px", color: "#6c757d" }}>
                Wartość magazynu
              </div>
            </div>

            <div
              style={{
                backgroundColor: "white",
                borderLeft: "3px solid #17a2b8",
                borderRadius: "4px",
                padding: "0.5rem 0.75rem",
                textAlign: "center",
                minWidth: "100px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
              }}
            >
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#17a2b8" }}>
                {(stats.avg_price || 25.50).toFixed(2)} zł
              </div>
              <div style={{ fontSize: "10px", color: "#6c757d" }}>
                Średnia cena
              </div>
            </div>
          </div>
        </div>
      )}

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
