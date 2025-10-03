import React, { useState, useEffect } from 'react';
import { invoiceService } from '../services/invoiceService';
import { useLocation } from '../contexts/LocationContext';
import { useWarehouse } from '../contexts/WarehouseContext';

const InvoicesPage = () => {
  const { selectedLocation, locationId } = useLocation();
  const { selectedWarehouse, warehouseId } = useWarehouse();
  
  // Użyj location_id dla adminów, warehouse_id dla pracowników
  const currentLocationId = locationId || warehouseId;

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({});
  const [suppliers, setSuppliers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    numer_faktury: '',
    data_faktury: new Date().toISOString().split('T')[0],
    data_dostawy: '',
    data_platnosci: '',
    dostawca_nazwa: '',
    dostawca_nip: '',
    dostawca_adres: '',
    suma_netto: '',
    suma_vat: '',
    suma_brutto: '',
    status: 'nowa',
    sposob_platnosci: '',
    uwagi: ''
  });

  useEffect(() => {
    loadData();
  }, [currentLocationId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invoicesData, statsData, suppliersData] = await Promise.all([
        invoiceService.getInvoices({ location_id: currentLocationId }),
        invoiceService.getInvoiceStats().catch(() => ({ data: {} })),
        invoiceService.getSuppliers().catch(() => ({ data: [] }))
      ]);
      
      setInvoices(invoicesData.data?.invoices || []);
      setStats(invoicesData.data?.stats || {});
      setSuppliers(suppliersData.data || []);
    } catch (err) {
      setError('Błąd podczas ładowania faktur: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInvoice = async (e) => {
    e.preventDefault();
    try {
      await invoiceService.createInvoice(newInvoice);
      setNewInvoice({
        numer_faktury: '',
        data_faktury: new Date().toISOString().split('T')[0],
        data_dostawy: '',
        data_platnosci: '',
        dostawca_nazwa: '',
        dostawca_nip: '',
        dostawca_adres: '',
        suma_netto: '',
        suma_vat: '',
        suma_brutto: '',
        status: 'nowa',
        sposob_platnosci: '',
        uwagi: ''
      });
      setShowAddForm(false);
      loadData();
    } catch (err) {
      setError('Błąd podczas dodawania faktury: ' + err.message);
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (window.confirm('Czy na pewno chcesz usunąć tę fakturę?')) {
      try {
        await invoiceService.deleteInvoice(invoiceId);
        loadData();
      } catch (err) {
        setError('Błąd podczas usuwania faktury: ' + err.message);
      }
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadData();
      return;
    }

    try {
      setLoading(true);
      const searchData = await invoiceService.searchInvoices({ query: searchTerm });
      setInvoices(searchData.data?.invoices || []);
    } catch (err) {
      setError('Błąd podczas wyszukiwania: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = searchTerm ? invoices : invoices.filter(invoice =>
    invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="container mt-4"><div className="text-center">Ładowanie...</div></div>;

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        <div className="col-12">
          <h2>📄 Zarządzanie Fakturami</h2>
          
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              {error}
              <button type="button" className="btn-close" onClick={() => setError(null)}></button>
            </div>
          )}

          {/* Statystyki */}
          {stats && (
            <div className="row mb-3">
              <div className="col-md-4">
                <div className="card text-white bg-primary">
                  <div className="card-body">
                    <h5 className="card-title">Łączna liczba</h5>
                    <h2>{stats.total_count || 0}</h2>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card text-white bg-success">
                  <div className="card-body">
                    <h5 className="card-title">Łączna wartość</h5>
                    <h2>{(stats.total_amount || 0).toFixed(2)} zł</h2>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card text-white bg-info">
                  <div className="card-body">
                    <h5 className="card-title">Średnia wartość</h5>
                    <h2>{(stats.average_amount || 0).toFixed(2)} zł</h2>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="card mb-3">
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="input-group">
                    <span className="input-group-text">🔍</span>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Szukaj faktur..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button className="btn btn-primary" onClick={handleSearch}>
                      Szukaj
                    </button>
                  </div>
                </div>
                <div className="col-md-6 text-end">
                  <button 
                    className="btn btn-success"
                    onClick={() => setShowAddForm(!showAddForm)}
                  >
                    ➕ Nowa Faktura
                  </button>
                  <button className="btn btn-info ms-2" onClick={loadData}>
                    🔄 Odśwież
                  </button>
                  <button className="btn btn-secondary ms-2">📤 Eksportuj</button>
                </div>
              </div>
            </div>
          </div>

          {/* Formularz dodawania */}
          {showAddForm && (
            <div className="card mb-3">
              <div className="card-header">
                <h5>➕ Dodaj Nową Fakturę</h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleAddInvoice}>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Numer faktury *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newInvoice.numer_faktury}
                          onChange={(e) => setNewInvoice({...newInvoice, numer_faktury: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Data faktury *</label>
                        <input
                          type="date"
                          className="form-control"
                          value={newInvoice.data_faktury}
                          onChange={(e) => setNewInvoice({...newInvoice, data_faktury: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-8">
                      <div className="mb-3">
                        <label className="form-label">Nazwa dostawcy *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newInvoice.dostawca_nazwa}
                          onChange={(e) => setNewInvoice({...newInvoice, dostawca_nazwa: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">NIP dostawcy</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newInvoice.dostawca_nip}
                          onChange={(e) => setNewInvoice({...newInvoice, dostawca_nip: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Suma netto</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          value={newInvoice.suma_netto}
                          onChange={(e) => setNewInvoice({...newInvoice, suma_netto: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">VAT</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          value={newInvoice.suma_vat}
                          onChange={(e) => setNewInvoice({...newInvoice, suma_vat: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Suma brutto *</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          value={newInvoice.suma_brutto}
                          onChange={(e) => setNewInvoice({...newInvoice, suma_brutto: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Status</label>
                        <select
                          className="form-control"
                          value={newInvoice.status}
                          onChange={(e) => setNewInvoice({...newInvoice, status: e.target.value})}
                        >
                          <option value="nowa">Nowa</option>
                          <option value="oczekuje">Oczekuje płatności</option>
                          <option value="zaplacona">Zapłacona</option>
                          <option value="anulowana">Anulowana</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Sposób płatności</label>
                        <select
                          className="form-control"
                          value={newInvoice.sposob_platnosci}
                          onChange={(e) => setNewInvoice({...newInvoice, sposob_platnosci: e.target.value})}
                        >
                          <option value="">Wybierz...</option>
                          <option value="gotowka">Gotówka</option>
                          <option value="przelew">Przelew</option>
                          <option value="karta">Karta</option>
                          <option value="blik">BLIK</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Uwagi</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={newInvoice.uwagi}
                      onChange={(e) => setNewInvoice({...newInvoice, uwagi: e.target.value})}
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-success">Zapisz</button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
                      Anuluj
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h5>📋 Lista Faktur ({filteredInvoices.length})</h5>
            </div>
            <div className="card-body">
              {filteredInvoices.length === 0 ? (
                <div className="text-center py-4">
                  <p>Brak faktur do wyświetlenia</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Numer</th>
                        <th>Data</th>
                        <th>Dostawca</th>
                        <th>Kwota netto</th>
                        <th>Kwota brutto</th>
                        <th>Status</th>
                        <th>Akcje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td><strong>{invoice.invoice_number}</strong></td>
                          <td>{invoice.invoice_date}</td>
                          <td>
                            <div>{invoice.supplier_name}</div>
                            {invoice.supplier_nip && (
                              <small className="text-muted">NIP: {invoice.supplier_nip}</small>
                            )}
                          </td>
                          <td>{(invoice.net_amount || 0).toFixed(2)} zł</td>
                          <td><strong>{(invoice.gross_amount || 0).toFixed(2)} zł</strong></td>
                          <td>
                            <span className={`badge ${
                              invoice.status === 'zaplacona' ? 'bg-success' : 
                              invoice.status === 'oczekuje' ? 'bg-warning' : 
                              invoice.status === 'anulowana' ? 'bg-danger' : 'bg-secondary'
                            }`}>
                              {invoice.status === 'zaplacona' ? 'Zapłacona' : 
                               invoice.status === 'oczekuje' ? 'Oczekuje' : 
                               invoice.status === 'anulowana' ? 'Anulowana' : 'Nowa'}
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-sm btn-primary me-1" title="Podgląd">👁️</button>
                            <button className="btn btn-sm btn-info me-1" title="Edytuj">✏️</button>
                            <button 
                              className="btn btn-sm btn-danger" 
                              title="Usuń"
                              onClick={() => handleDeleteInvoice(invoice.id)}
                            >
                              🗑️
                            </button>
                            <button className="btn btn-sm btn-secondary ms-1" title="Pobierz PDF">📄</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicesPage;
