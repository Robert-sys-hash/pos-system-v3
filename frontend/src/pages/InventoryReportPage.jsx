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
  
  // Stan dla danych - używamy zarówno cen netto jak i brutto
  const [reportData, setReportData] = useState({
    products: [],
    allProducts: [], // Wszystkie produkty do exportu
    statistics: {
      totalProducts: 0,
      totalQuantity: 0,
      totalPurchaseValueNet: 0,
      totalPurchaseValueGross: 0,
      totalSaleValueNet: 0,
      totalSaleValueGross: 0
    },
    pagination: { page: 1, limit: 50, total: 0, pages: 0 }
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Oblicz totalPages na podstawie allProducts
  const totalPages = Math.ceil((reportData.allProducts || []).length / itemsPerPage);

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

  // Regeneruj widok gdy zmieni się strona lub ilość na stronę
  useEffect(() => {
    if (reportData.allProducts.length > 0) {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedProducts = reportData.allProducts.slice(startIndex, endIndex);
      
      setReportData(prev => ({
        ...prev,
        products: paginatedProducts,
        pagination: {
          ...prev.pagination,
          page: currentPage,
          limit: itemsPerPage,
          pages: Math.ceil(prev.allProducts.length / itemsPerPage)
        }
      }));
    }
  }, [currentPage, itemsPerPage]);

  const loadLocations = async () => {
    try {
      console.log('🏢 Ładowanie lokalizacji...');
      const response = await fetch('http://localhost:8000/api/locations/');
      if (response.ok) {
        const data = await response.json();
        console.log('🏢 Odpowiedź lokalizacji:', data);
        if (data.success) {
          // Poprawka: data.data to już tablica, nie data.data.locations
          const locationsArray = Array.isArray(data.data) ? data.data : (data.data.locations || []);
          console.log('🏢 Ustawiam lokalizacje:', locationsArray);
          setLocations(locationsArray);
        }
      }
    } catch (error) {
      console.error('Błąd ładowania lokalizacji:', error);
      setError('Nie udało się załadować lokalizacji');
    }
  };

  const loadWarehouses = async () => {
    try {
      console.log('🏪 Ładowanie magazynów dla lokalizacji:', selectedLocations);
      const response = await fetch('http://localhost:8000/api/warehouses');
      if (response.ok) {
        const data = await response.json();
        console.log('🏪 Odpowiedź magazynów:', data);
        if (data.success) {
          // Backend zwraca data jako listę bezpośrednio
          const allWarehouses = Array.isArray(data.data) ? data.data : [];
          // Filtruj magazyny dla wybranych lokalizacji
          const filteredWarehouses = allWarehouses.filter(warehouse => 
            selectedLocations.includes(warehouse.location_id)
          );
          console.log('🏪 Filtrowane magazyny:', filteredWarehouses);
          setWarehouses(filteredWarehouses);
        }
      }
    } catch (error) {
      console.error('Błąd ładowania magazynów:', error);
      setError('Nie udało się załadować magazynów');
    }
  };

  const generateReport = async () => {
    console.log('📊 Generowanie raportu...');
    console.log('📊 Wybrane lokalizacje:', selectedLocations);
    console.log('📊 Wybrane magazyny:', selectedWarehouses);
    console.log('📊 Dostępne magazyny:', warehouses);
    
    setLoading(true);
    setError('');
    
    try {
      // Jeśli wybrano konkretne magazyny, użyj ich
      // Jeśli nie, użyj wszystkich magazynów z wybranych lokalizacji
      // Jeśli wybrano tylko lokalizacje bez magazynów, użyj location_id
      const warehousesToQuery = selectedWarehouses.length > 0 
        ? selectedWarehouses 
        : warehouses.map(w => w.id);

      const locationsToQuery = selectedLocations.length > 0 && warehousesToQuery.length === 0
        ? selectedLocations
        : [];

      console.log('📊 Magazyny do zapytania:', warehousesToQuery);
      console.log('📊 Lokalizacje do zapytania:', locationsToQuery);

      if (warehousesToQuery.length === 0 && locationsToQuery.length === 0) {
        setReportData({
          products: [],
          statistics: {
            totalProducts: 0,
            totalQuantity: 0,
            totalPurchaseValueNet: 0,
            totalPurchaseValueGross: 0,
            totalSaleValueNet: 0,
            totalSaleValueGross: 0
          },
          pagination: { page: 1, limit: 50, total: 0, pages: 0 }
        });
        return;
      }

      // Pobierz dane dla każdego magazynu lub lokalizacji i zagreguj
      const allProducts = [];
      let totalStats = {
        totalProducts: 0,
        totalQuantity: 0,
        totalPurchaseValueNet: 0,
        totalPurchaseValueGross: 0,
        totalSaleValueNet: 0,
        totalSaleValueGross: 0
      };

      // Obsługa zapytań dla magazynów
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
        console.log(`📊 Wynik dla magazynu ${warehouseId}:`, result);
        
        if (result.success && result.data.products) {
          const warehouseInfo = warehouses.find(w => w.id === warehouseId);
          const locationInfo = locations.find(l => l.id === warehouseInfo?.location_id);
          console.log(`📊 Produkty dla magazynu ${warehouseId}:`, result.data.products.length);
          
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
            
            // Agreguj statystyki - używamy zarówno cen netto jak i brutto
            const quantity = product.stock_quantity || 0;
            const purchasePriceNet = product.purchase_price || product.cena_zakupu_netto || 0;
            const purchasePriceGross = product.cena_zakupu_brutto || 0;
            const salePriceNet = product.price_net || product.cena_sprzedazy_netto || 0;
            const salePriceGross = product.price || product.cena_sprzedazy_brutto || 0;
            
            totalStats.totalQuantity += quantity;
            totalStats.totalPurchaseValueNet += quantity * purchasePriceNet;
            totalStats.totalPurchaseValueGross += quantity * purchasePriceGross;
            totalStats.totalSaleValueNet += quantity * salePriceNet;
            totalStats.totalSaleValueGross += quantity * salePriceGross;
          });
        }
      }

      // Obsługa zapytań dla lokalizacji (gdy nie wybrano konkretnych magazynów)
      for (const locationId of locationsToQuery) {
        const params = {
          location_id: locationId,
          page: 1,
          limit: 1000, // Pobierz wszystkie produkty dla statystyk
          search: filters.search,
          category: filters.category,
          available_only: filters.available_only
        };

        const result = await warehouseService.getInventory(params);
        console.log(`📊 Wynik dla lokalizacji ${locationId}:`, result);
        
        if (result.success && result.data.products) {
          const locationInfo = locations.find(l => l.id === locationId);
          console.log(`📊 Produkty dla lokalizacji ${locationId}:`, result.data.products.length);
          
          result.data.products.forEach(product => {
            // Dodaj informacje o magazynie i lokalizacji
            const productWithLocation = {
              ...product,
              warehouse_name: 'Wszystkie magazyny',
              location_name: locationInfo?.nazwa || 'Nieznana',
              warehouse_id: null,
              location_id: locationId
            };
            
            allProducts.push(productWithLocation);
            
            // Agreguj statystyki - używamy zarówno cen netto jak i brutto
            const quantity = product.stock_quantity || 0;
            const purchasePriceNet = product.purchase_price || product.cena_zakupu_netto || 0;
            const purchasePriceGross = product.cena_zakupu_brutto || 0;
            const salePriceNet = product.price_net || product.cena_sprzedazy_netto || 0;
            const salePriceGross = product.price || product.cena_sprzedazy_brutto || 0;
            
            totalStats.totalQuantity += quantity;
            totalStats.totalPurchaseValueNet += quantity * purchasePriceNet;
            totalStats.totalPurchaseValueGross += quantity * purchasePriceGross;
            totalStats.totalSaleValueNet += quantity * salePriceNet;
            totalStats.totalSaleValueGross += quantity * salePriceGross;
          });
        }
      }

      totalStats.totalProducts = allProducts.length;

      // Paginacja produktów
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedProducts = allProducts.slice(startIndex, endIndex);

      setReportData({
        products: paginatedProducts,
        allProducts: allProducts, // Wszystkie produkty do exportu
        statistics: totalStats,
        pagination: { 
          page: currentPage, 
          limit: itemsPerPage, 
          total: allProducts.length, 
          pages: Math.ceil(allProducts.length / itemsPerPage) 
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

  // Funkcja eksportu do CSV/Excel
  const exportToCSV = () => {
    const headers = [
      'Lp.',
      'Nazwa produktu',
      'EAN',
      'Kod produktu', 
      'Lokalizacja',
      'Magazyn',
      'Stan',
      'Cena zakupu netto',
      'Cena zakupu brutto',
      'Wartość netto',
      'Cena sprzedaży netto',
      'Cena sprzedaży brutto'
    ];

    const csvContent = [
      headers.join(';'),
      ...reportData.allProducts.map((product, index) => [
        index + 1,
        `"${product.name}"`,
        `"${product.barcode || ''}"`,
        `"${product.product_code || ''}"`,
        `"${product.location_name}"`,
        `"${product.warehouse_name}"`,
        Math.round(product.stock_quantity || 0),
        (product.purchase_price || product.cena_zakupu_netto || 0).toFixed(2),
        (product.cena_zakupu_brutto || 0).toFixed(2),
        ((product.stock_quantity || 0) * (product.purchase_price || product.cena_zakupu_netto || 0)).toFixed(2),
        (product.price_net || product.cena_sprzedazy_netto || 0).toFixed(2),
        (product.price || product.cena_sprzedazy_brutto || 0).toFixed(2)
      ].join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `raport_magazynowy_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Funkcja eksportu do XML
  const exportToXML = () => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<RaportMagazynowy>\n';
    xml += `  <DataGenerowania>${new Date().toISOString()}</DataGenerowania>\n`;
    xml += '  <Statystyki>\n';
    xml += `    <LiczbaProduktow>${reportData.statistics.totalProducts}</LiczbaProduktow>\n`;
    xml += `    <LacznaIlosc>${Math.round(reportData.statistics.totalQuantity)}</LacznaIlosc>\n`;
    xml += `    <WartoscZakupuNetto>${reportData.statistics.totalPurchaseValueNet.toFixed(2)}</WartoscZakupuNetto>\n`;
    xml += `    <WartoscZakupuBrutto>${reportData.statistics.totalPurchaseValueGross.toFixed(2)}</WartoscZakupuBrutto>\n`;
    xml += '  </Statystyki>\n';
    xml += '  <Produkty>\n';
    
    reportData.allProducts.forEach((product, index) => {
      xml += '    <Produkt>\n';
      xml += `      <Lp>${index + 1}</Lp>\n`;
      xml += `      <Nazwa><![CDATA[${product.name}]]></Nazwa>\n`;
      xml += `      <EAN><![CDATA[${product.barcode || ''}]]></EAN>\n`;
      xml += `      <KodProduktu><![CDATA[${product.product_code || ''}]]></KodProduktu>\n`;
      xml += `      <Lokalizacja><![CDATA[${product.location_name}]]></Lokalizacja>\n`;
      xml += `      <Magazyn><![CDATA[${product.warehouse_name}]]></Magazyn>\n`;
      xml += `      <Stan>${Math.round(product.stock_quantity || 0)}</Stan>\n`;
      xml += `      <CenaZakupuNetto>${(product.purchase_price || product.cena_zakupu_netto || 0).toFixed(2)}</CenaZakupuNetto>\n`;
      xml += `      <CenaZakupuBrutto>${(product.cena_zakupu_brutto || 0).toFixed(2)}</CenaZakupuBrutto>\n`;
      xml += `      <WartoscNetto>${((product.stock_quantity || 0) * (product.purchase_price || product.cena_zakupu_netto || 0)).toFixed(2)}</WartoscNetto>\n`;
      xml += `      <CenaSprzedazyNetto>${(product.price_net || product.cena_sprzedazy_netto || 0).toFixed(2)}</CenaSprzedazyNetto>\n`;
      xml += `      <CenaSprzedazyBrutto>${(product.price || product.cena_sprzedazy_brutto || 0).toFixed(2)}</CenaSprzedazyBrutto>\n`;
      xml += '    </Produkt>\n';
    });
    
    xml += '  </Produkty>\n';
    xml += '</RaportMagazynowy>';

    const blob = new Blob([xml], { type: 'application/xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `raport_magazynowy_${new Date().toISOString().split('T')[0]}.xml`;
    link.click();
  };

  // Funkcja eksportu do PDF (używa window.print)
  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Raport Magazynowy</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; font-size: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 4px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .stats { margin: 20px 0; }
          .stats div { margin: 5px 0; }
          h1 { color: #2c3e50; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
        </style>
      </head>
      <body>
        <h1>📊 Raport Magazynowy - Ceny netto i brutto</h1>
        <p>Data generowania: ${new Date().toLocaleDateString('pl-PL')}</p>
        
        <div class="stats">
          <h3>Statystyki:</h3>
          <div>📦 Produkty: ${reportData.statistics.totalProducts}</div>
          <div>📊 Łączna ilość: ${Math.round(reportData.statistics.totalQuantity)}</div>
          <div>💰 Wartość zakupu netto: ${formatCurrency(reportData.statistics.totalPurchaseValueNet)}</div>
          <div>💰 Wartość zakupu brutto: ${formatCurrency(reportData.statistics.totalPurchaseValueGross)}</div>
          <div>💎 Wartość sprzedaży netto: ${formatCurrency(reportData.statistics.totalSaleValueNet)}</div>
          <div>💎 Wartość sprzedaży brutto: ${formatCurrency(reportData.statistics.totalSaleValueGross)}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Lp.</th>
              <th>Produkt</th>
              <th>EAN</th>
              <th>Lokalizacja</th>
              <th>Magazyn</th>
              <th class="text-center">Stan</th>
              <th class="text-right">Cena zakupu netto</th>
              <th class="text-right">Cena zakupu brutto</th>
              <th class="text-right">Wartość netto</th>
              <th class="text-right">Cena sprzedaży netto</th>
              <th class="text-right">Cena sprzedaży brutto</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.allProducts.map((product, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${product.name}</td>
                <td>${product.barcode || ''}</td>
                <td>${product.location_name}</td>
                <td>${product.warehouse_name}</td>
                <td class="text-center">${Math.round(product.stock_quantity || 0)}</td>
                <td class="text-right">${formatCurrency(product.purchase_price || product.cena_zakupu_netto || 0)}</td>
                <td class="text-right">${formatCurrency(product.cena_zakupu_brutto || 0)}</td>
                <td class="text-right">${formatCurrency((product.stock_quantity || 0) * (product.purchase_price || product.cena_zakupu_netto || 0))}</td>
                <td class="text-right">${formatCurrency(product.price_net || product.cena_sprzedazy_netto || 0)}</td>
                <td class="text-right">${formatCurrency(product.price || product.cena_sprzedazy_brutto || 0)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div style={{ padding: '12px', maxWidth: '1600px', margin: '0 auto', fontSize: '13px' }}>
      <h1 style={{ 
        color: '#2c3e50', 
        marginBottom: '16px',
        borderBottom: '2px solid #3498db',
        paddingBottom: '6px',
        fontSize: '20px'
      }}>
        📊 Raport Magazynowy
      </h1>

      {/* Filtry */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #e9ecef',
        borderRadius: '6px',
        padding: '12px',
        marginBottom: '16px'
      }}>
        <h3 style={{ marginTop: 0, color: '#495057', marginBottom: '12px', fontSize: '15px' }}>
          🔍 Filtry
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          {/* Wybór lokalizacji */}
          <div>
            <h4 style={{ marginBottom: '6px', color: '#6c757d', fontSize: '13px' }}>📍 Lokalizacje</h4>
            <div style={{ 
              maxHeight: '120px', 
              overflowY: 'auto',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              padding: '6px',
              backgroundColor: 'white',
              fontSize: '12px'
            }}>
              {locations.map(location => (
                <label key={location.id} style={{ 
                  display: 'block', 
                  marginBottom: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}>
                  <input
                    type="checkbox"
                    checked={selectedLocations.includes(location.id)}
                    onChange={(e) => handleLocationChange(location.id, e.target.checked)}
                    style={{ marginRight: '6px' }}
                  />
                  {location.nazwa}
                </label>
              ))}
            </div>
          </div>

          {/* Wybór magazynów */}
          <div>
            <h4 style={{ marginBottom: '6px', color: '#6c757d', fontSize: '13px' }}>🏪 Magazyny</h4>
            <div style={{ 
              maxHeight: '120px', 
              overflowY: 'auto', 
              border: '1px solid #ced4da',
              borderRadius: '4px',
              padding: '6px',
              backgroundColor: 'white',
              fontSize: '12px'
            }}>
              {warehouses.length === 0 ? (
                <p style={{ color: '#6c757d', fontStyle: 'italic', margin: 0, fontSize: '11px' }}>
                  Wybierz lokalizację
                </p>
              ) : (
                warehouses.map(warehouse => (
                  <label key={warehouse.id} style={{ 
                    display: 'block', 
                    marginBottom: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedWarehouses.includes(warehouse.id)}
                      onChange={(e) => handleWarehouseChange(warehouse.id, e.target.checked)}
                      style={{ marginRight: '6px' }}
                    />
                    {warehouse.nazwa} ({warehouse.kod_magazynu})
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Filtry produktów */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold', fontSize: '12px' }}>
              🔎 Szukaj
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              placeholder="Nazwa, kod, EAN..."
              style={{
                width: '100%',
                padding: '4px 6px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold', fontSize: '12px' }}>
              📂 Kategoria
            </label>
            <input
              type="text"
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
              placeholder="Kategoria..."
              style={{
                width: '100%',
                padding: '4px 6px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold', fontSize: '12px' }}>
              ✅ Opcje
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '12px' }}>
              <input
                type="checkbox"
                checked={filters.available_only}
                onChange={(e) => setFilters({...filters, available_only: e.target.checked})}
                style={{ marginRight: '6px' }}
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <div style={{ 
            backgroundColor: '#e3f2fd', 
            padding: '8px', 
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 4px 0', color: '#1976d2', fontSize: '12px' }}>📦 Produkty</h4>
            <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#0d47a1' }}>
              {reportData.statistics.totalProducts}
            </p>
          </div>

          <div style={{ 
            backgroundColor: '#f3e5f5', 
            padding: '8px', 
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 4px 0', color: '#7b1fa2', fontSize: '12px' }}>📊 Ilość</h4>
            <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#4a148c' }}>
              {Math.round(reportData.statistics.totalQuantity)}
            </p>
          </div>

          <div style={{ 
            backgroundColor: '#e8f5e8', 
            padding: '8px', 
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 4px 0', color: '#388e3c', fontSize: '12px' }}>💰 Zakup netto</h4>
            <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: '#1b5e20' }}>
              {formatCurrency(reportData.statistics.totalPurchaseValueNet)}
            </p>
          </div>

          <div style={{ 
            backgroundColor: '#e8f5e8', 
            padding: '8px', 
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 4px 0', color: '#388e3c', fontSize: '12px' }}>💰 Zakup brutto</h4>
            <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: '#1b5e20' }}>
              {formatCurrency(reportData.statistics.totalPurchaseValueGross)}
            </p>
          </div>

          <div style={{ 
            backgroundColor: '#e1f5fe', 
            padding: '8px', 
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 4px 0', color: '#0277bd', fontSize: '12px' }}>💎 Sprzedaż netto</h4>
            <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: '#01579b' }}>
              {formatCurrency(reportData.statistics.totalSaleValueNet)}
            </p>
          </div>

          <div style={{ 
            backgroundColor: '#e1f5fe', 
            padding: '8px', 
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 4px 0', color: '#0277bd', fontSize: '12px' }}>💎 Sprzedaż brutto</h4>
            <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: '#01579b' }}>
              {formatCurrency(reportData.statistics.totalSaleValueGross)}
            </p>
          </div>
        </div>
      )}

      {/* Kontrolki eksportu */}
      {!loading && reportData.allProducts.length > 0 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '12px',
          padding: '8px 12px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '12px' }}>
              Na stronę:
              <select 
                value={itemsPerPage} 
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{ marginLeft: '4px', padding: '2px 4px', fontSize: '12px' }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
              </select>
            </label>
          </div>
          
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={exportToCSV}
              style={{
                padding: '4px 8px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              📊 CSV
            </button>
            <button
              onClick={exportToXML}
              style={{
                padding: '4px 8px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              📄 XML
            </button>
            <button
              onClick={exportToPDF}
              style={{
                padding: '4px 8px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              📋 PDF
            </button>
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
          border: '1px solid #e9ecef',
          borderRadius: '6px',
          overflow: 'hidden'
        }}>
          <h3 style={{ 
            margin: 0, 
            padding: '8px 12px',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #e9ecef',
            color: '#495057',
            fontSize: '14px'
          }}>
            📋 Produkty ({reportData.pagination.total})
          </h3>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #e9ecef', width: '40px' }}>Lp.</th>
                  <th style={{ padding: '6px', textAlign: 'left', borderBottom: '1px solid #e9ecef' }}>Produkt</th>
                  <th style={{ padding: '6px', textAlign: 'left', borderBottom: '1px solid #e9ecef' }}>Lokalizacja</th>
                  <th style={{ padding: '6px', textAlign: 'left', borderBottom: '1px solid #e9ecef' }}>Magazyn</th>
                  <th style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #e9ecef' }}>Stan</th>
                  <th style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid #e9ecef' }}>Zakup netto</th>
                  <th style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid #e9ecef' }}>Zakup brutto</th>
                  <th style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid #e9ecef' }}>Wartość netto</th>
                  <th style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid #e9ecef' }}>Sprzedaż netto</th>
                  <th style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid #e9ecef' }}>Sprzedaż brutto</th>
                </tr>
              </thead>
              <tbody>
                {reportData.products.map((product, index) => (
                  <tr key={`${product.id}-${product.warehouse_id}`} style={{ 
                    backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa'
                  }}>
                    <td style={{ 
                      padding: '4px', 
                      borderBottom: '1px solid #f0f0f0', 
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: '#495057'
                    }}>
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td style={{ padding: '4px 6px', borderBottom: '1px solid #f0f0f0' }}>
                      <strong style={{ fontSize: '11px' }}>{product.name}</strong>
                      <br />
                      <small style={{ color: '#6c757d', fontSize: '10px' }}>
                        {product.barcode && `EAN: ${product.barcode}`}
                        {product.product_code && ` | Kod: ${product.product_code}`}
                      </small>
                    </td>
                    <td style={{ padding: '4px 6px', borderBottom: '1px solid #f0f0f0' }}>
                      {product.location_name}
                    </td>
                    <td style={{ padding: '4px 6px', borderBottom: '1px solid #f0f0f0' }}>
                      {product.warehouse_name}
                    </td>
                    <td style={{ 
                      padding: '4px', 
                      borderBottom: '1px solid #f0f0f0', 
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: product.stock_quantity > 0 ? '#28a745' : '#dc3545'
                    }}>
                      {Math.round(product.stock_quantity || 0)}
                    </td>
                    <td style={{ padding: '4px 6px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>
                      {formatCurrency(product.purchase_price || product.cena_zakupu_netto || 0)}
                    </td>
                    <td style={{ padding: '4px 6px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>
                      {formatCurrency(product.cena_zakupu_brutto || 0)}
                    </td>
                    <td style={{ padding: '4px 6px', borderBottom: '1px solid #f0f0f0', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency((product.stock_quantity || 0) * (product.purchase_price || product.cena_zakupu_netto || 0))}
                    </td>
                    <td style={{ padding: '4px 6px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>
                      {formatCurrency(product.price_net || product.cena_sprzedazy_netto || 0)}
                    </td>
                    <td style={{ padding: '4px 6px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>
                      {formatCurrency(product.price || product.cena_sprzedazy_brutto || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginTop: '8px',
              padding: '8px 12px',
              backgroundColor: '#f8f9fa',
              borderTop: '1px solid #e9ecef'
            }}>
              <div style={{ color: '#6c757d', fontSize: '11px' }}>
                Strona {currentPage} z {totalPages} (razem {reportData.allProducts.length} produktów)
              </div>
              
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '4px 8px',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    backgroundColor: currentPage === 1 ? '#f8f9fa' : '#007bff',
                    color: currentPage === 1 ? '#6c757d' : 'white',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '11px'
                  }}
                >
                  ← Poprz
                </button>
                
                <span style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '0 8px',
                  fontSize: '11px',
                  color: '#495057'
                }}>
                  {currentPage}/{totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '4px 8px',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    backgroundColor: currentPage === totalPages ? '#f8f9fa' : '#007bff',
                    color: currentPage === totalPages ? '#6c757d' : 'white',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '11px'
                  }}
                >
                  Nast →
                </button>
              </div>
            </div>
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
          <p><strong>Uwaga:</strong> Raport pokazuje ceny netto i brutto (z VAT).</p>
        </div>
      )}
    </div>
  );
};

export default InventoryReportPage;
