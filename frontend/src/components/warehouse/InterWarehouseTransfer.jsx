import React, { useState, useEffect } from 'react';
import multiWarehouseService from '../../services/multiWarehouseService';

const InterWarehouseTransfer = () => {
  const [warehouses, setWarehouses] = useState([]);
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
    ilosc: '',
    cena_jednostkowa: ''
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [warehousesRes, transfersRes] = await Promise.all([
        multiWarehouseService.getWarehouses(),
        multiWarehouseService.getTransfers(filters)
      ]);

      if (warehousesRes.success) {
        setWarehouses(warehousesRes.data);
      }
      if (transfersRes.success) {
        setTransfers(transfersRes.data);
      }
    } catch (err) {
      setError('Błąd podczas ładowania danych');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      // Zakładamy że istnieje serwis produktów
      const response = await fetch('http://localhost:5002/api/products/search?limit=100');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.data?.products || []);
      }
    } catch (err) {
      console.error('Błąd ładowania produktów:', err);
    }
  };

  useEffect(() => {
    if (showCreateModal) {
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
    if (!productForm.produkt_id || !productForm.ilosc) {
      setError('Wybierz produkt i podaj ilość');
      return;
    }

    const product = products.find(p => p.id === parseInt(productForm.produkt_id));
    if (!product) {
      setError('Nie znaleziono produktu');
      return;
    }

    const newItem = {
      produkt_id: parseInt(productForm.produkt_id),
      nazwa_produktu: product.nazwa,
      kod_kreskowy: product.kod_kreskowy,
      ilosc_wyslana: parseFloat(productForm.ilosc),
      cena_jednostkowa: parseFloat(productForm.cena_jednostkowa) || 0
    };

    setTransferForm(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    setProductForm({
      produkt_id: '',
      ilosc: '',
      cena_jednostkowa: ''
    });
  };

  const handleRemoveProduct = (index) => {
    setTransferForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleTransferAction = async (transferId, action, items = []) => {
    if (!window.confirm(`Czy na pewno chcesz ${action === 'send' ? 'wysłać' : 'odebrać'} ten transfer?`)) {
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
      setError(`Błąd podczas ${action === 'send' ? 'wysyłania' : 'odbierania'} transferu`);
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
      ilosc: '',
      cena_jednostkowa: ''
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'utworzone': { class: 'bg-secondary', text: 'Utworzone' },
      'wyslane': { class: 'bg-warning', text: 'Wysłane' },
      'otrzymane': { class: 'bg-success', text: 'Otrzymane' },
      'anulowane': { class: 'bg-danger', text: 'Anulowane' }
    };
    
    const statusInfo = statusMap[status] || { class: 'bg-light', text: status };
    return <span className={`badge ${statusInfo.class}`}>{statusInfo.text}</span>;
  };

  const getWarehouseName = (warehouseId) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse ? warehouse.nazwa : 'Nieznany magazyn';
  };

  return (
    <div className="inter-warehouse-transfer">
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {success}
          <button type="button" className="btn-close" onClick={() => setSuccess(null)}></button>
        </div>
      )}

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5>🔄 Transfery międzymagazynowe</h5>
          <button 
            className="btn btn-success"
            onClick={() => {
              resetTransferForm();
              setShowCreateModal(true);
            }}
          >
            ➕ Nowy transfer
          </button>
        </div>
        
        <div className="card-body">
          {/* Filtry */}
          <div className="row mb-3">
            <div className="col-md-4">
              <select
                className="form-control"
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
              >
                <option value="">Wszystkie statusy</option>
                <option value="utworzone">Utworzone</option>
                <option value="wyslane">Wysłane</option>
                <option value="otrzymane">Otrzymane</option>
                <option value="anulowane">Anulowane</option>
              </select>
            </div>
            <div className="col-md-4">
              <select
                className="form-control"
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
                className="btn btn-outline-primary"
                onClick={loadData}
              >
                🔄 Odśwież
              </button>
            </div>
          </div>

          {/* Lista transferów */}
          {loading ? (
            <div className="text-center">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Ładowanie...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Numer</th>
                    <th>Magazyn źródłowy</th>
                    <th>Magazyn docelowy</th>
                    <th>Status</th>
                    <th>Data utworzenia</th>
                    <th>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map(transfer => (
                    <tr key={transfer.id}>
                      <td><code>{transfer.numer_dokumentu}</code></td>
                      <td>{getWarehouseName(transfer.magazyn_zrodlowy_id)}</td>
                      <td>{getWarehouseName(transfer.magazyn_docelowy_id)}</td>
                      <td>{getStatusBadge(transfer.status)}</td>
                      <td>{new Date(transfer.data_utworzenia).toLocaleDateString()}</td>
                      <td>
                        <button 
                          className="btn btn-sm btn-info me-1"
                          onClick={() => viewTransferDetails(transfer.id)}
                        >
                          👁️
                        </button>
                        {transfer.status === 'utworzone' && (
                          <button 
                            className="btn btn-sm btn-warning me-1"
                            onClick={() => handleTransferAction(transfer.id, 'send')}
                          >
                            📦
                          </button>
                        )}
                        {transfer.status === 'wyslane' && (
                          <button 
                            className="btn btn-sm btn-success"
                            onClick={() => handleTransferAction(transfer.id, 'receive')}
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

      {/* Modal tworzenia transferu */}
      {showCreateModal && (
        <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">🔄 Nowy transfer międzymagazynowy</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowCreateModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateTransfer}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Magazyn źródłowy *</label>
                        <select
                          className="form-control"
                          value={transferForm.magazyn_zrodlowy_id}
                          onChange={(e) => setTransferForm({...transferForm, magazyn_zrodlowy_id: e.target.value})}
                          required
                        >
                          <option value="">Wybierz magazyn źródłowy</option>
                          {warehouses.map(warehouse => (
                            <option key={warehouse.id} value={warehouse.id}>
                              {warehouse.nazwa} ({warehouse.kod})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Magazyn docelowy *</label>
                        <select
                          className="form-control"
                          value={transferForm.magazyn_docelowy_id}
                          onChange={(e) => setTransferForm({...transferForm, magazyn_docelowy_id: e.target.value})}
                          required
                        >
                          <option value="">Wybierz magazyn docelowy</option>
                          {warehouses.filter(w => w.id !== parseInt(transferForm.magazyn_zrodlowy_id)).map(warehouse => (
                            <option key={warehouse.id} value={warehouse.id}>
                              {warehouse.nazwa} ({warehouse.kod})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Uwagi</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={transferForm.uwagi}
                      onChange={(e) => setTransferForm({...transferForm, uwagi: e.target.value})}
                      placeholder="Opcjonalne uwagi do transferu..."
                    />
                  </div>

                  {/* Dodawanie produktów */}
                  <hr />
                  <h6>📦 Produkty do przeniesienia</h6>
                  
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <select
                        className="form-control"
                        value={productForm.produkt_id}
                        onChange={(e) => setProductForm({...productForm, produkt_id: e.target.value})}
                      >
                        <option value="">Wybierz produkt</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.nazwa} ({product.kod_kreskowy})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Ilość"
                        step="0.001"
                        value={productForm.ilosc}
                        onChange={(e) => setProductForm({...productForm, ilosc: e.target.value})}
                      />
                    </div>
                    <div className="col-md-3">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Cena (opcjonalnie)"
                        step="0.01"
                        value={productForm.cena_jednostkowa}
                        onChange={(e) => setProductForm({...productForm, cena_jednostkowa: e.target.value})}
                      />
                    </div>
                    <div className="col-md-2">
                      <button 
                        type="button"
                        className="btn btn-success"
                        onClick={handleAddProduct}
                      >
                        ➕
                      </button>
                    </div>
                  </div>

                  {/* Lista dodanych produktów */}
                  {transferForm.items.length > 0 && (
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Produkt</th>
                            <th>Kod</th>
                            <th>Ilość</th>
                            <th>Cena</th>
                            <th>Akcje</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transferForm.items.map((item, index) => (
                            <tr key={index}>
                              <td>{item.nazwa_produktu}</td>
                              <td><code>{item.kod_kreskowy}</code></td>
                              <td>{item.ilosc_wyslana}</td>
                              <td>{item.cena_jednostkowa > 0 ? `${item.cena_jednostkowa.toFixed(2)} zł` : '-'}</td>
                              <td>
                                <button 
                                  type="button"
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleRemoveProduct(index)}
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowCreateModal(false)}
                  >
                    Anuluj
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading || transferForm.items.length === 0}
                  >
                    {loading ? 'Tworzenie...' : 'Utwórz transfer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal szczegółów transferu */}
      {showDetailsModal && selectedTransfer && (
        <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">📋 Szczegóły transferu {selectedTransfer.numer_dokumentu}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowDetailsModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <strong>Status:</strong> {getStatusBadge(selectedTransfer.status)}
                  </div>
                  <div className="col-md-6">
                    <strong>Data utworzenia:</strong> {new Date(selectedTransfer.data_utworzenia).toLocaleString()}
                  </div>
                </div>
                
                <div className="row mb-3">
                  <div className="col-md-6">
                    <strong>Magazyn źródłowy:</strong> {getWarehouseName(selectedTransfer.magazyn_zrodlowy_id)}
                  </div>
                  <div className="col-md-6">
                    <strong>Magazyn docelowy:</strong> {getWarehouseName(selectedTransfer.magazyn_docelowy_id)}
                  </div>
                </div>

                {selectedTransfer.uwagi && (
                  <div className="mb-3">
                    <strong>Uwagi:</strong> {selectedTransfer.uwagi}
                  </div>
                )}

                {/* Lista produktów */}
                {selectedTransfer.items && selectedTransfer.items.length > 0 && (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Produkt</th>
                          <th>Kod</th>
                          <th>Ilość wysłana</th>
                          <th>Ilość otrzymana</th>
                          <th>Cena</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTransfer.items.map(item => (
                          <tr key={item.id}>
                            <td>{item.nazwa_produktu}</td>
                            <td><code>{item.kod_kreskowy}</code></td>
                            <td>{item.ilosc_wyslana}</td>
                            <td>{item.ilosc_otrzymana || '-'}</td>
                            <td>{item.cena_jednostkowa > 0 ? `${item.cena_jednostkowa.toFixed(2)} zł` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDetailsModal(false)}
                >
                  Zamknij
                </button>
                {selectedTransfer.status === 'utworzone' && (
                  <button 
                    className="btn btn-warning"
                    onClick={() => handleTransferAction(selectedTransfer.id, 'send')}
                  >
                    📦 Wyślij
                  </button>
                )}
                {selectedTransfer.status === 'wyslane' && (
                  <button 
                    className="btn btn-success"
                    onClick={() => handleTransferAction(selectedTransfer.id, 'receive')}
                  >
                    ✅ Odbierz
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterWarehouseTransfer;
