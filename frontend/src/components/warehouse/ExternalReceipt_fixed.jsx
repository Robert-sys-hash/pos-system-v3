import React, { useState, useEffect } from 'react';
import { warehouseService } from '../../services/warehouseService';
import { productService } from '../../services/productService';

const ExternalReceipt = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Historia PZ
  const [receipts, setReceipts] = useState([]);
  const [activeTab, setActiveTab] = useState('new'); // 'new' lub 'history'
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (activeTab === 'new') {
      loadInvoices();
    } else if (activeTab === 'history') {
      loadReceipts();
    }
  }, [activeTab]);

  const loadReceipts = async () => {
    try {
      const result = await warehouseService.getExternalReceipts({
        date: dateFilter,
        status: statusFilter
      });
      if (result.success) {
        setReceipts(result.data || []);
      }
    } catch (err) {
      console.error('Błąd ładowania historii PZ:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadReceipts();
    }
  }, [dateFilter, statusFilter]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      // Pobieramy faktury zakupu, które mogą generować PZ
      const result = await warehouseService.getPurchaseInvoices();
      if (result.success) {
        setInvoices(result.data || []);
      } else {
        setError(result.error || 'Błąd podczas ładowania faktur');
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem');
    } finally {
      setLoading(false);
    }
  };

  const generatePZ = async (invoiceId) => {
    setLoading(true);
    try {
      const result = await warehouseService.generateExternalReceipt(invoiceId);
      if (result.success) {
        setSuccess('PZ został wygenerowany pomyślnie');
        setTimeout(() => setSuccess(''), 3000);
        loadInvoices(); // Odśwież listę
        loadReceipts(); // Odśwież historię
      } else {
        setError(result.error || 'Błąd podczas generowania PZ');
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>📥 Przyjęcie Zewnętrzne (PZ)</h3>
        <div className="btn-group" role="group">
          <button 
            className={`btn ${activeTab === 'new' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab('new')}
          >
            <i className="fas fa-file-invoice me-2"></i>
            Generowanie PZ
          </button>
          <button 
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab('history')}
          >
            <i className="fas fa-history me-2"></i>
            Historia PZ
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {success}
          <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
        </div>
      )}

      {/* Zawartość zakładek */}
      {activeTab === 'new' && (
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">Faktury zakupu dostępne do przyjęcia</h5>
                <small className="text-muted">
                  PZ generuje się automatycznie na podstawie faktury zakupu produktów
                </small>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Ładowanie...</span>
                    </div>
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="text-muted">
                      <i className="fas fa-inbox fa-2x mb-2"></i>
                      <p>Brak faktur zakupu do przetworzenia</p>
                    </div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Numer faktury</th>
                          <th>Dostawca</th>
                          <th>Data faktury</th>
                          <th>Wartość</th>
                          <th>Status PZ</th>
                          <th>Akcje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice) => (
                          <tr key={invoice.id}>
                            <td>
                              <strong>{invoice.invoice_number}</strong>
                            </td>
                            <td>
                              {invoice.supplier_name}
                            </td>
                            <td>
                              {new Date(invoice.invoice_date).toLocaleDateString('pl-PL')}
                            </td>
                            <td>
                              <strong>{invoice.total_amount.toFixed(2)} zł</strong>
                            </td>
                            <td>
                              {invoice.pz_generated ? (
                                <span className="badge bg-success">
                                  <i className="fas fa-check me-1"></i>
                                  PZ wygenerowane
                                </span>
                              ) : (
                                <span className="badge bg-warning">
                                  <i className="fas fa-clock me-1"></i>
                                  Oczekuje na PZ
                                </span>
                              )}
                            </td>
                            <td>
                              {!invoice.pz_generated ? (
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => generatePZ(invoice.id)}
                                  disabled={loading}
                                >
                                  <i className="fas fa-plus me-1"></i>
                                  Generuj PZ
                                </button>
                              ) : (
                                <button
                                  className="btn btn-outline-secondary btn-sm"
                                  disabled
                                >
                                  <i className="fas fa-check me-1"></i>
                                  Zakończone
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
          </div>
        </div>
      )}

      {/* Zakładka Historia PZ */}
      {activeTab === 'history' && (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">Historia Przyjęć Zewnętrznych</h5>
            <div className="d-flex gap-2">
              <input
                type="date"
                className="form-control form-control-sm"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{ width: '150px' }}
              />
              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '120px' }}
              >
                <option value="all">Wszystkie</option>
                <option value="completed">Zakończone</option>
                <option value="pending">Oczekujące</option>
              </select>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={loadReceipts}
              >
                <i className="fas fa-refresh"></i>
              </button>
            </div>
          </div>
          <div className="card-body">
            {receipts.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-muted">
                  <i className="fas fa-inbox fa-2x mb-2"></i>
                  <p>Brak przyjęć zewnętrznych</p>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Numer dokumentu</th>
                      <th>Faktura źródłowa</th>
                      <th>Dostawca</th>
                      <th>Data</th>
                      <th>Produkty</th>
                      <th>Wartość</th>
                      <th>Status</th>
                      <th>Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((receipt) => (
                      <tr key={receipt.id}>
                        <td>
                          <strong>{receipt.document_number}</strong>
                        </td>
                        <td>
                          <small className="text-muted">{receipt.source_invoice_number}</small>
                        </td>
                        <td>
                          {receipt.supplier_name}
                        </td>
                        <td>
                          {new Date(receipt.receipt_date).toLocaleDateString('pl-PL')}
                        </td>
                        <td>
                          <span className="badge bg-info">
                            {receipt.items_count || 0} pozycji
                          </span>
                        </td>
                        <td>
                          <strong>{receipt.total_amount ? `${receipt.total_amount.toFixed(2)} zł` : '-'}</strong>
                        </td>
                        <td>
                          <span className={`badge ${
                            receipt.status === 'completed' ? 'bg-success' : 'bg-warning'
                          }`}>
                            {receipt.status === 'completed' ? 'Zakończone' : 'Oczekujące'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-outline-primary btn-sm me-1"
                            onClick={() => {/* TODO: Zobacz szczegóły */}}
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => {/* TODO: Drukuj */}}
                          >
                            <i className="fas fa-print"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExternalReceipt;
