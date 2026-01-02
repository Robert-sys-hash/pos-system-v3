import React, { useState, useEffect } from 'react';
import multiWarehouseService from '../../services/multiWarehouseService';
import { useLocation } from '../../contexts/LocationContext';

const InterWarehouseTransfer = () => {
  const { selectedLocation, locationId } = useLocation();
  const currentLocationId = locationId;
  
  const [warehouses, setWarehouses] = useState([]);
  const [sourceWarehouses, setSourceWarehouses] = useState([]); // Magazyny tylko z bieżącej lokalizacji
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  
  // Filtry
  const [filters, setFilters] = useState({
    status: '',
    warehouse_id: ''
  });
  
  // Form tworzenia transferu
  const [transferForm, setTransferForm] = useState({
    magazyn_zrodlowy_id: '',
    magazyn_docelowy_id: '',
    uwagi: '',
    items: []
  });
  
  // Form dodawania produktu do transferu
  const [productForm, setProductForm] = useState({
    produkt_id: '',
    ilosc: '1',
    cena_jednostkowa: ''
  });
  
  // Wyszukiwanie produktów - autocomplete
  const [productSearch, setProductSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [onlyAvailable, setOnlyAvailable] = useState(true); // Domyślnie tylko dostępne

  useEffect(() => {
    loadData();
  }, [filters, currentLocationId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [warehousesRes, transfersRes] = await Promise.all([
        multiWarehouseService.getWarehouses(),
        multiWarehouseService.getTransfers(filters)
      ]);

      if (warehousesRes.success) {
        const allWarehouses = warehousesRes.data;
        setWarehouses(allWarehouses);
        
        // Filtruj magazyny źródłowe do bieżącej lokalizacji
        if (currentLocationId) {
          const localWarehouses = allWarehouses.filter(
            w => w.location_id === currentLocationId || w.lokalizacja_id === currentLocationId
          );
          setSourceWarehouses(localWarehouses);
        } else {
          setSourceWarehouses(allWarehouses);
        }
      }
      if (transfersRes.success) {
        // API zwraca { transfers: [...], total: N }
        setTransfers(transfersRes.data?.transfers || transfersRes.data || []);
      }
    } catch (err) {
      setError('Błąd podczas ładowania danych');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (searchQuery = '') => {
    try {
      // Pobierz więcej produktów na start lub szukaj po query
      // Dodaj location_id aby API zwróciło prawidłowe stany magazynowe
      let url = searchQuery 
        ? `http://localhost:8000/api/products/search?limit=500&query=${encodeURIComponent(searchQuery)}`
        : 'http://localhost:8000/api/products/search?limit=500';
      
      // Dodaj location_id dla prawidłowych stanów magazynowych
      if (currentLocationId) {
        url += `&location_id=${currentLocationId}`;
      }
      
      console.log('🔍 Ładowanie produktów z:', url);
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        // API zwraca: { data: { products: [...] }, success: true }
        const prods = result.data?.products || result.products || [];
        console.log('✅ Załadowano produktów:', prods.length, 'z location_id:', currentLocationId);
        setProducts(prods);
        setFilteredProducts(prods);
      } else {
        console.error('❌ Błąd HTTP:', response.status);
      }
    } catch (err) {
      console.error('❌ Błąd ładowania produktów:', err);
    }
  };

  // Filtrowanie produktów na podstawie wyszukiwania - w czasie rzeczywistym
  useEffect(() => {
    if (productSearch.trim().length < 2) {
      setFilteredProducts([]);
      setShowProductDropdown(false);
    } else {
      const search = productSearch.toLowerCase();
      let filtered = products.filter(p => 
        (p.name || p.nazwa || '').toLowerCase().includes(search) ||
        (p.barcode || p.kod_kreskowy || '').toLowerCase().includes(search)
      );
      
      // Filtruj tylko dostępne jeśli checkbox zaznaczony
      if (onlyAvailable) {
        filtered = filtered.filter(p => (p.stock_quantity || 0) > 0);
      }
      
      // Sortuj: najpierw dostępne (malejąco po ilości), potem niedostępne
      filtered.sort((a, b) => {
        const stockA = a.stock_quantity || 0;
        const stockB = b.stock_quantity || 0;
        return stockB - stockA;
      });
      
      filtered = filtered.slice(0, 15); // Pokaż max 15 wyników
      setFilteredProducts(filtered);
      setShowProductDropdown(filtered.length > 0);
    }
  }, [productSearch, products, onlyAvailable]);

  // Funkcja wyboru produktu z listy - od razu dodaje do listy jak w koszyku
  const handleSelectProduct = (product) => {
    // Sprawdź czy produkt już jest na liście
    const existingIndex = transferForm.items.findIndex(item => item.produkt_id === product.id);
    
    if (existingIndex >= 0) {
      // Jeśli produkt już jest - zwiększ ilość o 1
      setTransferForm(prev => ({
        ...prev,
        items: prev.items.map((item, idx) => 
          idx === existingIndex 
            ? { ...item, ilosc_wyslana: item.ilosc_wyslana + 1 }
            : item
        )
      }));
    } else {
      // Dodaj nowy produkt z ilością 1 i ceną zakupu
      const purchasePrice = product.current_purchase_price || product.cena_zakupu || product.purchase_price || 0;
      const stockQty = product.stock_quantity || product.stan_magazynowy || 0;
      const newItem = {
        produkt_id: product.id,
        nazwa_produktu: product.name || product.nazwa,
        kod_kreskowy: product.barcode || product.kod_kreskowy,
        ilosc_wyslana: 1,
        cena_jednostkowa: purchasePrice,
        dostepna_ilosc: stockQty
      };
      
      setTransferForm(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }));
    }
    
    // Wyczyść wyszukiwarkę
    setProductSearch('');
    setShowProductDropdown(false);
    setError(null);
  };

  // Funkcja aktualizacji ilości produktu na liście
  const handleUpdateItemQuantity = (index, newQuantity) => {
    const qty = parseFloat(newQuantity);
    if (isNaN(qty) || qty <= 0) return;
    
    setTransferForm(prev => ({
      ...prev,
      items: prev.items.map((item, idx) => 
        idx === index ? { ...item, ilosc_wyslana: qty } : item
      )
    }));
  };

  // Funkcja aktualizacji ceny produktu na liście
  const handleUpdateItemPrice = (index, newPrice) => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) return;
    
    setTransferForm(prev => ({
      ...prev,
      items: prev.items.map((item, idx) => 
        idx === index ? { ...item, cena_jednostkowa: price } : item
      )
    }));
  };

  // Załaduj produkty przy otwarciu modalu
  useEffect(() => {
    if (showCreateModal) {
      console.log('📦 Modal otwarty, ładuję produkty...');
      loadProducts();
    }
  }, [showCreateModal]);

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    
    if (transferForm.items.length === 0) {
      setError('Dodaj przynajmniej jeden produkt do transferu');
      return;
    }
    
    setLoading(true);
    try {
      const result = await multiWarehouseService.createTransfer(transferForm);
      
      if (result.success) {
        setSuccess(result.message);
        setShowCreateModal(false);
        resetTransferForm();
        loadData();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Błąd podczas tworzenia transferu');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = () => {
    if (!selectedProduct || !productForm.ilosc) {
      setError('Wybierz produkt i podaj ilość');
      return;
    }

    const newItem = {
      produkt_id: selectedProduct.id,
      nazwa_produktu: selectedProduct.name || selectedProduct.nazwa,
      kod_kreskowy: selectedProduct.barcode || selectedProduct.kod_kreskowy,
      ilosc_wyslana: parseFloat(productForm.ilosc),
      cena_jednostkowa: parseFloat(productForm.cena_jednostkowa) || 0
    };

    // Sprawdź czy produkt już jest na liście
    const exists = transferForm.items.some(item => item.produkt_id === newItem.produkt_id);
    if (exists) {
      setError('Ten produkt jest już na liście');
      return;
    }

    setTransferForm(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    // Reset formularza
    setProductForm({
      produkt_id: '',
      ilosc: '1',
      cena_jednostkowa: ''
    });
    setProductSearch('');
    setSelectedProduct(null);
    setError(null);
  };

  const handleRemoveProduct = (index) => {
    setTransferForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleTransferAction = async (transferId, action, items = []) => {
    const actionLabels = {
      'approve': 'zatwierdzić',
      'ship': 'wysłać',
      'receive': 'odebrać',
      'cancel': 'anulować'
    };
    if (!window.confirm(`Czy na pewno chcesz ${actionLabels[action] || action} ten transfer?`)) {
      return;
    }

    setLoading(true);
    try {
      const result = await multiWarehouseService.updateTransferStatus(transferId, action, items);
      
      if (result.success) {
        setSuccess(result.message);
        loadData();
        if (showDetailsModal) {
          viewTransferDetails(transferId);
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(`Błąd podczas wykonywania akcji: ${actionLabels[action] || action}`);
    } finally {
      setLoading(false);
    }
  };

  const viewTransferDetails = async (transferId) => {
    try {
      const result = await multiWarehouseService.getTransferDetails(transferId);
      if (result.success) {
        setSelectedTransfer(result.data);
        setShowDetailsModal(true);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Błąd podczas pobierania szczegółów transferu');
    }
  };

  const resetTransferForm = () => {
    setTransferForm({
      magazyn_zrodlowy_id: '',
      magazyn_docelowy_id: '',
      uwagi: '',
      items: []
    });
    setProductForm({
      produkt_id: '',
      ilosc: '1',
      cena_jednostkowa: ''
    });
    setProductSearch('');
    setSelectedProduct(null);
    setShowProductDropdown(false);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'oczekujacy': { bg: '#6c757d', text: 'Oczekujący' },
      'zatwierdzony': { bg: '#17a2b8', text: 'Zatwierdzony' },
      'w_transporcie': { bg: '#ffc107', color: '#212529', text: 'W transporcie' },
      'dostarczony': { bg: '#28a745', text: 'Dostarczony' },
      'anulowany': { bg: '#dc3545', text: 'Anulowany' },
      // stare mapowania dla kompatybilności
      'utworzone': { bg: '#6c757d', text: 'Utworzone' },
      'wyslane': { bg: '#ffc107', color: '#212529', text: 'Wysłane' },
      'otrzymane': { bg: '#28a745', text: 'Otrzymane' },
      'anulowane': { bg: '#dc3545', text: 'Anulowane' }
    };
    
    const statusInfo = statusMap[status] || { bg: '#e9ecef', color: '#212529', text: status };
    return (
      <span style={{ 
        fontSize: '10px', 
        padding: '2px 6px', 
        backgroundColor: statusInfo.bg, 
        color: statusInfo.color || 'white', 
        borderRadius: '3px' 
      }}>
        {statusInfo.text}
      </span>
    );
  };

  const getWarehouseName = (warehouseId) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse ? warehouse.nazwa : 'Nieznany magazyn';
  };

  return (
    <div className="inter-warehouse-transfer" style={{ fontSize: '12px' }}>
      {error && (
        <div style={{ padding: '0.35rem 0.75rem', marginBottom: '0.5rem', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '3px', color: '#721c24', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error}
          <button style={{ background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', color: '#721c24' }} onClick={() => setError(null)}>×</button>
        </div>
      )}

      {success && (
        <div style={{ padding: '0.35rem 0.75rem', marginBottom: '0.5rem', backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '3px', color: '#155724', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {success}
          <button style={{ background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', color: '#155724' }} onClick={() => setSuccess(null)}>×</button>
        </div>
      )}

      <div className="card" style={{ fontSize: '11px' }}>
        <div className="card-header d-flex justify-content-between align-items-center" style={{ padding: '0.4rem 0.75rem' }}>
          <h6 style={{ margin: 0, fontWeight: '600', fontSize: '13px' }}>🔄 Transfery międzymagazynowe</h6>
          <button 
            style={{ padding: '0.3rem 0.6rem', fontSize: '11px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
            onClick={() => {
              resetTransferForm();
              setShowCreateModal(true);
            }}
          >
            ➕ Nowy transfer
          </button>
        </div>
        
        <div className="card-body" style={{ padding: '0.5rem 0.75rem' }}>
          {/* Filtry */}
          <div className="row mb-2">
            <div className="col-md-4">
              <select
                style={{ width: '100%', fontSize: '10px', padding: '0.25rem 0.4rem', border: '1px solid #ced4da', borderRadius: '3px' }}
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
              >
                <option value="">Wszystkie statusy</option>
                <option value="oczekujacy">Oczekujący</option>
                <option value="zatwierdzony">Zatwierdzony</option>
                <option value="w_transporcie">W transporcie</option>
                <option value="dostarczony">Dostarczony</option>
                <option value="anulowany">Anulowany</option>
              </select>
            </div>
            <div className="col-md-4">
              <select
                style={{ width: '100%', fontSize: '10px', padding: '0.25rem 0.4rem', border: '1px solid #ced4da', borderRadius: '3px' }}
                value={filters.warehouse_id}
                onChange={(e) => setFilters({...filters, warehouse_id: e.target.value})}
              >
                <option value="">Wszystkie magazyny</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.nazwa}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <button 
                style={{ padding: '0.25rem 0.5rem', fontSize: '10px', backgroundColor: 'white', color: '#0d6efd', border: '1px solid #0d6efd', borderRadius: '3px', cursor: 'pointer' }}
                onClick={loadData}
              >
                🔄 Odśwież
              </button>
            </div>
          </div>

          {/* Lista transferów */}
          {loading ? (
            <div className="text-center py-2">
              <div className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">Ładowanie...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Numer</th>
                    <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Magazyn źródłowy</th>
                    <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Magazyn docelowy</th>
                    <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Status</th>
                    <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Data utworzenia</th>
                    <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map(transfer => (
                    <tr key={transfer.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td style={{ padding: '0.3rem 0.5rem' }}><code style={{ fontSize: '10px', backgroundColor: '#f1f3f4', padding: '1px 4px', borderRadius: '2px' }}>{transfer.numer_transferu}</code></td>
                      <td style={{ padding: '0.3rem 0.5rem' }}>{transfer.magazyn_zrodlowy_nazwa || getWarehouseName(transfer.magazyn_zrodlowy_id)}</td>
                      <td style={{ padding: '0.3rem 0.5rem' }}>{transfer.magazyn_docelowy_nazwa || getWarehouseName(transfer.magazyn_docelowy_id)}</td>
                      <td style={{ padding: '0.3rem 0.5rem' }}>{getStatusBadge(transfer.status)}</td>
                      <td style={{ padding: '0.3rem 0.5rem' }}>{new Date(transfer.data_zlozenia || transfer.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '0.3rem 0.5rem' }}>
                        <button 
                          style={{ padding: '0.2rem 0.4rem', fontSize: '10px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '3px', marginRight: '0.25rem', cursor: 'pointer' }}
                          onClick={() => viewTransferDetails(transfer.id)}
                        >
                          👁️
                        </button>
                        {(transfer.status === 'oczekujacy' || transfer.status === 'zatwierdzony') && (
                          <button 
                            style={{ padding: '0.2rem 0.4rem', fontSize: '10px', backgroundColor: '#ffc107', color: '#212529', border: 'none', borderRadius: '3px', marginRight: '0.25rem', cursor: 'pointer' }}
                            onClick={() => handleTransferAction(transfer.id, 'ship')}
                            title="Wyślij"
                          >
                            📦
                          </button>
                        )}
                        {transfer.status === 'w_transporcie' && (
                          <button 
                            style={{ padding: '0.2rem 0.4rem', fontSize: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                            onClick={() => handleTransferAction(transfer.id, 'receive')}
                            title="Potwierdź odbiór"
                          >
                            ✅
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal tworzenia transferu - styl jak OpenShiftEnhancedModal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '0.5rem'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '6px',
            width: '700px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            {/* Header - styl jak w OpenShiftEnhancedModal */}
            <div style={{
              padding: '0.6rem 1rem',
              background: 'linear-gradient(135deg, #28a745, #1e7e34)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              borderRadius: '6px 6px 0 0'
            }}>
              <div style={{
                width: '1.75rem',
                height: '1.75rem',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem'
              }}>
                🔄
              </div>
              <div style={{ flex: 1 }}>
                <h6 style={{ margin: 0, fontWeight: '600', fontSize: '12px' }}>
                  Nowy transfer międzymagazynowy
                </h6>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.1rem',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTransfer}>
              <div style={{ padding: '0.75rem 1rem', fontSize: '11px' }}>
                {/* Magazyny - grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.25rem', color: '#495057' }}>
                      Magazyn źródłowy * {selectedLocation ? `(${selectedLocation.name || selectedLocation.nazwa})` : ''}
                    </label>
                    <select
                      style={{ width: '100%', fontSize: '11px', padding: '0.4rem', border: '1px solid #ced4da', borderRadius: '4px' }}
                      value={transferForm.magazyn_zrodlowy_id}
                      onChange={(e) => setTransferForm({...transferForm, magazyn_zrodlowy_id: e.target.value})}
                      required
                    >
                      <option value="">Wybierz magazyn źródłowy</option>
                      {sourceWarehouses.map(warehouse => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.nazwa} ({warehouse.kod_magazynu || warehouse.kod})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.25rem', color: '#495057' }}>
                      Magazyn docelowy *
                    </label>
                    <select
                      style={{ width: '100%', fontSize: '11px', padding: '0.4rem', border: '1px solid #ced4da', borderRadius: '4px' }}
                      value={transferForm.magazyn_docelowy_id}
                      onChange={(e) => setTransferForm({...transferForm, magazyn_docelowy_id: e.target.value})}
                      required
                    >
                      <option value="">Wybierz magazyn docelowy</option>
                      {warehouses.map(warehouse => (
                        <option 
                          key={warehouse.id} 
                          value={warehouse.id}
                          disabled={warehouse.id === parseInt(transferForm.magazyn_zrodlowy_id)}
                        >
                          {warehouse.nazwa} ({warehouse.kod_magazynu || warehouse.kod})
                          {warehouse.id === parseInt(transferForm.magazyn_zrodlowy_id) ? ' (źródłowy)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Uwagi */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.25rem', color: '#495057' }}>
                    Uwagi
                  </label>
                  <textarea
                    style={{ width: '100%', fontSize: '11px', padding: '0.4rem', border: '1px solid #ced4da', borderRadius: '4px', minHeight: '50px' }}
                    value={transferForm.uwagi}
                    onChange={(e) => setTransferForm({...transferForm, uwagi: e.target.value})}
                    placeholder="Opcjonalne uwagi do transferu..."
                  />
                </div>

                {/* Sekcja produktów */}
                <div style={{ borderTop: '1px solid #e9ecef', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h6 style={{ fontSize: '12px', fontWeight: '600', margin: 0, color: '#495057' }}>
                      📦 Produkty do przeniesienia
                    </h6>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.3rem', 
                      fontSize: '10px', 
                      cursor: 'pointer',
                      color: onlyAvailable ? '#28a745' : '#6c757d'
                    }}>
                      <input
                        type="checkbox"
                        checked={onlyAvailable}
                        onChange={(e) => setOnlyAvailable(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      Tylko dostępne
                    </label>
                  </div>
                  
                  {/* Wyszukiwanie produktu - autocomplete */}
                  <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      style={{ 
                        width: '100%', 
                        fontSize: '11px', 
                        padding: '0.5rem', 
                        border: selectedProduct ? '2px solid #28a745' : '1px solid #ced4da', 
                        borderRadius: '4px',
                        backgroundColor: selectedProduct ? '#f0fff4' : 'white'
                      }}
                      placeholder="🔍 Wpisz min. 2 znaki aby wyszukać produkt..."
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setSelectedProduct(null); // Reset wyboru przy edycji
                      }}
                      onFocus={() => {
                        if (productSearch.length >= 2 && filteredProducts.length > 0) {
                          setShowProductDropdown(true);
                        }
                      }}
                    />
                    
                    {/* Dropdown z wynikami */}
                    {showProductDropdown && filteredProducts.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        backgroundColor: 'white',
                        border: '1px solid #ced4da',
                        borderTop: 'none',
                        borderRadius: '0 0 4px 4px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        zIndex: 1000
                      }}>
                        {filteredProducts.map(product => (
                          <div
                            key={product.id}
                            onClick={() => handleSelectProduct(product)}
                            style={{
                              padding: '0.5rem',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f0f0f0',
                              fontSize: '11px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '500' }}>{product.name || product.nazwa}</div>
                              <div style={{ color: '#6c757d', fontSize: '10px' }}>
                                {product.barcode || product.kod_kreskowy || 'brak kodu'}
                              </div>
                            </div>
                            <div style={{ 
                              textAlign: 'center', 
                              padding: '0 0.5rem',
                              minWidth: '50px'
                            }}>
                              <div style={{ 
                                fontWeight: '700', 
                                fontSize: '11px',
                                color: (product.stock_quantity || 0) > 0 ? '#28a745' : '#dc3545'
                              }}>
                                {product.stock_quantity || 0}
                              </div>
                              <div style={{ color: '#6c757d', fontSize: '8px' }}>dostępne</div>
                            </div>
                            <div style={{ textAlign: 'right', minWidth: '60px' }}>
                              <div style={{ color: '#007bff', fontWeight: '600' }}>
                                {(product.current_purchase_price || product.cena_zakupu || 0).toFixed(2)} zł
                              </div>
                              <div style={{ color: '#6c757d', fontSize: '8px' }}>cena zak.</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lista dodanych produktów - z edycją inline */}
                  {transferForm.items.length > 0 ? (
                    <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #e9ecef', borderRadius: '4px' }}>
                      <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0 }}>
                          <tr>
                            <th style={{ padding: '0.3rem 0.4rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Produkt</th>
                            <th style={{ padding: '0.3rem 0.4rem', textAlign: 'center', borderBottom: '1px solid #dee2e6', width: '55px' }}>Dostępne</th>
                            <th style={{ padding: '0.3rem 0.4rem', textAlign: 'center', borderBottom: '1px solid #dee2e6', width: '70px' }}>Ilość</th>
                            <th style={{ padding: '0.3rem 0.4rem', textAlign: 'center', borderBottom: '1px solid #dee2e6', width: '80px' }}>Cena zak.</th>
                            <th style={{ padding: '0.3rem 0.4rem', textAlign: 'right', borderBottom: '1px solid #dee2e6', width: '65px' }}>Wartość</th>
                            <th style={{ padding: '0.3rem 0.4rem', textAlign: 'center', borderBottom: '1px solid #dee2e6', width: '30px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {transferForm.items.map((item, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #e9ecef' }}>
                              <td style={{ padding: '0.3rem 0.4rem' }}>
                                <div style={{ fontWeight: '500', fontSize: '10px' }}>{item.nazwa_produktu}</div>
                                <code style={{ fontSize: '8px', backgroundColor: '#f1f3f4', padding: '1px 3px', borderRadius: '2px', color: '#6c757d' }}>
                                  {item.kod_kreskowy}
                                </code>
                              </td>
                              <td style={{ 
                                padding: '0.3rem 0.4rem', 
                                textAlign: 'center', 
                                fontWeight: '600',
                                fontSize: '10px',
                                color: item.dostepna_ilosc > 0 ? (item.ilosc_wyslana > item.dostepna_ilosc ? '#dc3545' : '#28a745') : '#dc3545'
                              }}>
                                {item.dostepna_ilosc || 0}
                                {item.ilosc_wyslana > item.dostepna_ilosc && (
                                  <span title="Ilość przekracza dostępny stan" style={{ marginLeft: '2px' }}>⚠️</span>
                                )}
                              </td>
                              <td style={{ padding: '0.2rem' }}>
                                <input
                                  type="number"
                                  style={{ 
                                    width: '100%', 
                                    fontSize: '10px', 
                                    padding: '0.25rem', 
                                    border: `1px solid ${item.ilosc_wyslana > item.dostepna_ilosc ? '#dc3545' : '#ced4da'}`, 
                                    borderRadius: '3px',
                                    textAlign: 'center',
                                    backgroundColor: item.ilosc_wyslana > item.dostepna_ilosc ? '#fff5f5' : 'white'
                                  }}
                                  step="1"
                                  min="1"
                                  value={item.ilosc_wyslana}
                                  onChange={(e) => handleUpdateItemQuantity(index, e.target.value)}
                                />
                              </td>
                              <td style={{ padding: '0.2rem' }}>
                                <input
                                  type="number"
                                  style={{ 
                                    width: '100%', 
                                    fontSize: '10px', 
                                    padding: '0.25rem', 
                                    border: '1px solid #ced4da', 
                                    borderRadius: '3px',
                                    textAlign: 'center'
                                  }}
                                  step="0.01"
                                  min="0"
                                  value={item.cena_jednostkowa}
                                  onChange={(e) => handleUpdateItemPrice(index, e.target.value)}
                                />
                              </td>
                              <td style={{ padding: '0.3rem 0.4rem', textAlign: 'right', fontWeight: '600', color: '#28a745' }}>
                                {(item.ilosc_wyslana * item.cena_jednostkowa).toFixed(2)} zł
                              </td>
                              <td style={{ padding: '0.2rem', textAlign: 'center' }}>
                                <button 
                                  type="button"
                                  style={{ 
                                    padding: '0.2rem 0.4rem', 
                                    fontSize: '10px', 
                                    backgroundColor: '#dc3545', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '2px', 
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => handleRemoveProduct(index)}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot style={{ backgroundColor: '#e9ecef' }}>
                          <tr>
                            <td colSpan="4" style={{ padding: '0.4rem', textAlign: 'right', fontWeight: '600' }}>
                              Razem ({transferForm.items.length} poz.):
                            </td>
                            <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: '700', color: '#28a745' }}>
                              {transferForm.items.reduce((sum, item) => sum + (item.ilosc_wyslana * item.cena_jednostkowa), 0).toFixed(2)} zł
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#6c757d', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '11px' }}>
                      📦 Wyszukaj i kliknij produkt aby dodać do listy
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid #e9ecef', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button 
                  type="button"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '11px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                  onClick={() => setShowCreateModal(false)}
                >
                  Anuluj
                </button>
                <button 
                  type="submit"
                  style={{ 
                    padding: '0.35rem 0.75rem', 
                    fontSize: '11px', 
                    backgroundColor: transferForm.items.length === 0 ? '#a3cfbb' : '#28a745', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '3px', 
                    cursor: transferForm.items.length === 0 ? 'not-allowed' : 'pointer' 
                  }}
                  disabled={loading || transferForm.items.length === 0}
                >
                  {loading ? 'Tworzenie...' : 'Utwórz transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal szczegółów transferu - styl jak OpenShiftEnhancedModal */}
      {showDetailsModal && selectedTransfer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '0.5rem'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '6px',
            width: '650px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            {/* Header */}
            <div style={{
              padding: '0.6rem 1rem',
              background: 'linear-gradient(135deg, #17a2b8, #138496)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              borderRadius: '6px 6px 0 0'
            }}>
              <div style={{
                width: '1.75rem',
                height: '1.75rem',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem'
              }}>
                📋
              </div>
              <div style={{ flex: 1 }}>
                <h6 style={{ margin: 0, fontWeight: '600', fontSize: '12px' }}>
                  Szczegóły transferu {selectedTransfer.numer_transferu}
                </h6>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.1rem',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '0.75rem 1rem', fontSize: '11px' }}>
              {/* Info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem', padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <div>
                  <p style={{ margin: '0.2rem 0' }}><strong>Status:</strong> {getStatusBadge(selectedTransfer.status)}</p>
                  <p style={{ margin: '0.2rem 0' }}><strong>Magazyn źródłowy:</strong> {selectedTransfer.magazyn_zrodlowy_nazwa || getWarehouseName(selectedTransfer.magazyn_zrodlowy_id)}</p>
                </div>
                <div>
                  <p style={{ margin: '0.2rem 0' }}><strong>Data utworzenia:</strong> {new Date(selectedTransfer.data_zlozenia || selectedTransfer.created_at).toLocaleString()}</p>
                  <p style={{ margin: '0.2rem 0' }}><strong>Magazyn docelowy:</strong> {selectedTransfer.magazyn_docelowy_nazwa || getWarehouseName(selectedTransfer.magazyn_docelowy_id)}</p>
                </div>
              </div>

              {selectedTransfer.uwagi && (
                <div style={{ marginBottom: '0.75rem', padding: '0.4rem', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                  <strong>Uwagi:</strong> {selectedTransfer.uwagi}
                </div>
              )}

              {/* Lista produktów */}
              {selectedTransfer.items && selectedTransfer.items.length > 0 && (
                <>
                  <h6 style={{ fontSize: '11px', fontWeight: '600', marginBottom: '0.5rem' }}>📦 Produkty:</h6>
                  <div className="table-responsive" style={{ maxHeight: '200px', overflow: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
                      <thead style={{ backgroundColor: '#343a40', color: 'white', position: 'sticky', top: 0 }}>
                        <tr>
                          <th style={{ padding: '0.3rem 0.4rem', textAlign: 'left' }}>Produkt</th>
                          <th style={{ padding: '0.3rem 0.4rem', textAlign: 'left' }}>Kod</th>
                          <th style={{ padding: '0.3rem 0.4rem', textAlign: 'right' }}>Ilość</th>
                          <th style={{ padding: '0.3rem 0.4rem', textAlign: 'right' }}>Dostarczone</th>
                          <th style={{ padding: '0.3rem 0.4rem', textAlign: 'left' }}>Jednostka</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTransfer.items.map(item => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                            <td style={{ padding: '0.3rem 0.4rem' }}>{item.nazwa_produktu}</td>
                            <td style={{ padding: '0.3rem 0.4rem' }}>
                              <code style={{ fontSize: '9px', backgroundColor: '#f1f3f4', padding: '1px 3px', borderRadius: '2px' }}>{item.kod_kreskowy}</code>
                            </td>
                            <td style={{ padding: '0.3rem 0.4rem', textAlign: 'right' }}>{item.ilosc_zlecona}</td>
                            <td style={{ padding: '0.3rem 0.4rem', textAlign: 'right' }}>{item.ilosc_dostarczona > 0 ? item.ilosc_dostarczona : '-'}</td>
                            <td style={{ padding: '0.3rem 0.4rem' }}>{item.jednostka || 'szt'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid #e9ecef', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button 
                style={{ padding: '0.35rem 0.75rem', fontSize: '11px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                onClick={() => setShowDetailsModal(false)}
              >
                Zamknij
              </button>
              {(selectedTransfer.status === 'oczekujacy' || selectedTransfer.status === 'zatwierdzony') && (
                <button 
                  style={{ padding: '0.35rem 0.75rem', fontSize: '11px', backgroundColor: '#ffc107', color: '#212529', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                  onClick={() => handleTransferAction(selectedTransfer.id, 'ship')}
                >
                  📦 Wyślij
                </button>
              )}
              {selectedTransfer.status === 'w_transporcie' && (
                <button 
                  style={{ padding: '0.35rem 0.75rem', fontSize: '11px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                  onClick={() => handleTransferAction(selectedTransfer.id, 'receive')}
                >
                  ✅ Odbierz
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterWarehouseTransfer;
