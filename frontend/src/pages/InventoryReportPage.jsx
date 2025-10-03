import React, { useState, useEffect } from 'react';
import { warehouseService } from '../services/warehouseService';

const InventoryReportPage = () => {
  // Stan dla filtrów
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedWarehouses, setSelectedWarehouses] = useState([]);
  
  // Stan dla filtrów produktów
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    available_only: false
  });
  
  // Stan dla danych - używamy tylko cen netto
  const [reportData, setReportData] = useState({
    products: [],
    statistics: {
      totalProducts: 0,
      totalQuantity: 0,
      totalPurchaseValueNet: 0,
      totalSaleValueNet: 0
    },
    pagination: { page: 1, limit: 50, total: 0, pages: 0 }
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Ładowanie lokalizacji przy inicjalizacji
  useEffect(() => {
    loadLocations();
  }, []);

  // Ładowanie magazynów gdy zmienią się wybrane lokalizacje
  useEffect(() => {
    if (selectedLocations.length > 0) {
      loadWarehouses();
    } else {
      setWarehouses([]);
      setSelectedWarehouses([]);
    }
  }, [selectedLocations]);

  // Generowanie raportu gdy zmienią się filtry
  useEffect(() => {
    if (selectedLocations.length > 0 || selectedWarehouses.length > 0) {
      generateReport();
    }
  }, [selectedLocations, selectedWarehouses, filters]);

  const loadLocations = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/locations');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLocations(data.data || []);
        }
      }
    } catch (error) {
      console.error('Błąd ładowania lokalizacji:', error);
      setError('Nie udało się załadować lokalizacji');
    }
  };

  const loadWarehouses = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/warehouses');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Filtruj magazyny dla wybranych lokalizacji
          const filteredWarehouses = data.data.filter(warehouse => 
            selectedLocations.includes(warehouse.location_id)
          );
          setWarehouses(filteredWarehouses);
        }
      }
    } catch (error) {
      console.error('Błąd ładowania magazynów:', error);
      setError('Nie udało się załadować magazynów');
    }
  };

  const generateReport = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Jeśli wybrano konkretne magazyny, użyj ich
      // Jeśli nie, użyj wszystkich magazynów z wybranych lokalizacji
      const warehousesToQuery = selectedWarehouses.length > 0 
        ? selectedWarehouses 
        : warehouses.map(w => w.id);

      if (warehousesToQuery.length === 0 && selectedLocations.length === 0) {
        setReportData({
          products: [],
          statistics: {
            totalProducts: 0,
            totalQuantity: 0,
            totalPurchaseValueNet: 0,
            totalSaleValueNet: 0
          },
          pagination: { page: 1, limit: 50, total: 0, pages: 0 }
        });
        return;
      }

      // Pobierz dane dla każdego magazynu i zagreguj
      const allProducts = [];
      let totalStats = {
        totalProducts: 0,
        totalQuantity: 0,
        totalPurchaseValueNet: 0,
        totalSaleValueNet: 0
      };

      for (const warehouseId of warehousesToQuery) {
        const params = {
          warehouse_id: warehouseId,
          page: 1,
          limit: 1000, // Pobierz wszystkie produkty dla statystyk
          search: filters.search,
          category: filters.category,
          available_only: filters.available_only
        };

        const result = await warehouseService.getInventory(params);
        
        if (result.success && result.data.products) {
          const warehouseInfo = warehouses.find(w => w.id === warehouseId);
          const locationInfo = locations.find(l => l.id === warehouseInfo?.location_id);
          
          result.data.products.forEach(product => {
            // Dodaj informacje o magazynie i lokalizacji
            const productWithLocation = {
              ...product,
              warehouse_name: warehouseInfo?.nazwa || 'Nieznany',
              location_name: locationInfo?.nazwa || 'Nieznana',
              warehouse_id: warehouseId,
              location_id: warehouseInfo?.location_id
            };
            
            allProducts.push(productWithLocation);
            
            // Agreguj statystyki - używamy tylko cen netto
            const quantity = product.stock_quantity || 0;
            const purchasePriceNet = product.purchase_price || product.cena_zakupu_netto || 0;
            const salePriceNet = product.price_net || product.cena_sprzedazy_netto || 0;
            
            totalStats.totalQuantity += quantity;
            totalStats.totalPurchaseValueNet += quantity * purchasePriceNet;
            totalStats.totalSaleValueNet += quantity * salePriceNet;
          });
        }
      }

      totalStats.totalProducts = allProducts.length;

      setReportData({
        products: allProducts.slice(0, 50), // Pokaż pierwsze 50 dla wydajności
        statistics: totalStats,
        pagination: { 
          page: 1, 
          limit: 50, 
          total: allProducts.length, 
          pages: Math.ceil(allProducts.length / 50) 
        }
      });

    } catch (error) {
      console.error('Błąd generowania raportu:', error);
      setError('Nie udało się wygenerować raportu');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (locationId, checked) => {
    if (checked) {
      setSelectedLocations([...selectedLocations, locationId]);
    } else {
      setSelectedLocations(selectedLocations.filter(id => id !== locationId));
      // Usuń też magazyny z tej lokalizacji
      const warehousesToRemove = warehouses
        .filter(w => w.location_id === locationId)
        .map(w => w.id);
      setSelectedWarehouses(selectedWarehouses.filter(id => !warehousesToRemove.includes(id)));
    }
  };

  const handleWarehouseChange = (warehouseId, checked) => {
    if (checked) {
      setSelectedWarehouses([...selectedWarehouses, warehouseId]);
    } else {
      setSelectedWarehouses(selectedWarehouses.filter(id => id !== warehouseId));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN'
    }).format(amount || 0);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ 
        color: '#2c3e50', 
        marginBottom: '30px',
        borderBottom: '3px solid #3498db',
        paddingBottom: '10px'
      }}>
        📊 Raport Magazynowy (tylko ceny netto)
      </h1>

      {/* Filtry */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '30px'
      }}>
        <h3 style={{ marginTop: 0, color: '#495057', marginBottom: '20px' }}>
          🔍 Filtry raportu
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          {/* Wybór lokalizacji */}
          <div>
            <h4 style={{ marginBottom: '10px', color: '#6c757d' }}>📍 Lokalizacje</h4>
            <div style={{ 
              maxHeight: '200px', 
              overflowY: 'auto', 
              border: '1px solid #ced4da',
              borderRadius: '4px',
              padding: '10px',
              backgroundColor: 'white'
            }}>
              {locations.map(location => (
                <label key={location.id} style={{ 
                  display: 'block', 
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={selectedLocations.includes(location.id)}
                    onChange={(e) => handleLocationChange(location.id, e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  {location.nazwa} ({location.adres})
                </label>
              ))}
            </div>
          </div>

          {/* Wybór magazynów */}
          <div>
            <h4 style={{ marginBottom: '10px', color: '#6c757d' }}>🏪 Magazyny</h4>
            <div style={{ 
              maxHeight: '200px', 
              overflowY: 'auto', 
              border: '1px solid #ced4da',
              borderRadius: '4px',
              padding: '10px',
              backgroundColor: 'white'
            }}>
              {warehouses.length === 0 ? (
                <p style={{ color: '#6c757d', fontStyle: 'italic', margin: 0 }}>
                  Wybierz lokalizację, aby zobaczyć magazyny
                </p>
              ) : (
                warehouses.map(warehouse => (
                  <label key={warehouse.id} style={{ 
                    display: 'block', 
                    marginBottom: '8px',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedWarehouses.includes(warehouse.id)}
                      onChange={(e) => handleWarehouseChange(warehouse.id, e.target.checked)}
                      style={{ marginRight: '8px' }}
                    />
                    {warehouse.nazwa} ({warehouse.kod_magazynu})
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Filtry produktów */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              🔎 Szukaj produktu
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              placeholder="Nazwa, kod, EAN..."
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ced4da',
                borderRadius: '4px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              📂 Kategoria
            </label>
            <input
              type="text"
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
              placeholder="Kategoria produktu..."
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ced4da',
                borderRadius: '4px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              ✅ Opcje
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={filters.available_only}
                onChange={(e) => setFilters({...filters, available_only: e.target.checked})}
                style={{ marginRight: '8px' }}
              />
              Tylko dostępne na stanie
            </label>
          </div>
        </div>
      </div>

      {/* Statystyki */}
      {!loading && (selectedLocations.length > 0 || selectedWarehouses.length > 0) && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div style={{ 
            backgroundColor: '#e3f2fd', 
            padding: '15px', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>📦 Produkty</h4>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#0d47a1' }}>
              {reportData.statistics.totalProducts}
            </p>
          </div>

          <div style={{ 
            backgroundColor: '#f3e5f5', 
            padding: '15px', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#7b1fa2' }}>📊 Łączna ilość</h4>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#4a148c' }}>
              {Math.round(reportData.statistics.totalQuantity)}
            </p>
          </div>

          <div style={{ 
            backgroundColor: '#e8f5e8', 
            padding: '15px', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#388e3c' }}>💰 Wartość zakupu netto</h4>
            <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#1b5e20' }}>
              {formatCurrency(reportData.statistics.totalPurchaseValueNet)}
            </p>
          </div>

          <div style={{ 
            backgroundColor: '#e1f5fe', 
            padding: '15px', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#0277bd' }}>💎 Wartość sprzedaży netto</h4>
            <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#01579b' }}>
              {formatCurrency(reportData.statistics.totalSaleValueNet)}
            </p>
          </div>
        </div>
      )}

      {/* Stan ładowania */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>⏳ Generowanie raportu...</p>
        </div>
      )}

      {/* Błędy */}
      {error && (
        <div style={{ 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Tabela produktów */}
      {!loading && reportData.products.length > 0 && (
        <div style={{ 
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <h3 style={{ 
            margin: 0, 
            padding: '15px 20px',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #dee2e6',
            color: '#495057'
          }}>
            📋 Produkty ({reportData.pagination.total})
          </h3>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Produkt</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Lokalizacja</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Magazyn</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Stan</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>Cena zakupu netto</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>Wartość netto</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>Cena sprzedaży netto</th>
                </tr>
              </thead>
              <tbody>
                {reportData.products.map((product, index) => (
                  <tr key={`${product.id}-${product.warehouse_id}`} style={{ 
                    backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa'
                  }}>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      <strong>{product.name}</strong>
                      <br />
                      <small style={{ color: '#6c757d' }}>
                        {product.barcode && `EAN: ${product.barcode}`}
                        {product.product_code && ` | Kod: ${product.product_code}`}
                      </small>
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      {product.location_name}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      {product.warehouse_name}
                    </td>
                    <td style={{ 
                      padding: '12px', 
                      borderBottom: '1px solid #dee2e6', 
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: product.stock_quantity > 0 ? '#28a745' : '#dc3545'
                    }}>
                      {Math.round(product.stock_quantity || 0)}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6', textAlign: 'right' }}>
                      {formatCurrency(product.purchase_price || product.cena_zakupu_netto || 0)}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency((product.stock_quantity || 0) * (product.purchase_price || product.cena_zakupu_netto || 0))}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6', textAlign: 'right' }}>
                      {formatCurrency(product.price_net || product.cena_sprzedazy_netto || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Brak danych */}
      {!loading && reportData.products.length === 0 && (selectedLocations.length > 0 || selectedWarehouses.length > 0) && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          color: '#6c757d'
        }}>
          📋 Brak produktów spełniających kryteria
        </div>
      )}

      {/* Instrukcja */}
      {!loading && selectedLocations.length === 0 && selectedWarehouses.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          color: '#1976d2'
        }}>
          <h3>👋 Witaj w Raporcie Magazynowym!</h3>
          <p>Wybierz lokalizacje lub magazyny powyżej, aby wygenerować raport.</p>
          <p><strong>Uwaga:</strong> Raport pokazuje tylko ceny netto (bez VAT).</p>
        </div>
      )}
    </div>
  );
};

export default InventoryReportPage;
