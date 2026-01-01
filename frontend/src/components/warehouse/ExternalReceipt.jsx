import React, { useState, useEffect } from 'react';
import { warehouseService } from '../../services/warehouseService';
import { useLocation } from '../../contexts/LocationContext';

const ExternalReceipt = () => {
  const { locationId } = useLocation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Historia PZ
  const [receipts, setReceipts] = useState([]);
  const [activeTab, setActiveTab] = useState('new'); // 'new' lub 'history'
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal szczegółów PZ
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'new') {
      loadInvoices();
    } else if (activeTab === 'history' && locationId) {
      loadReceipts();
    }
  }, [activeTab]);
  
  // Osobny useEffect dla zmiany lokalizacji
  useEffect(() => {
    if (locationId && activeTab === 'history') {
      loadReceipts();
    }
  }, [locationId]);

  const loadReceipts = async () => {
    try {
      const result = await warehouseService.getExternalReceipts({
        date: dateFilter,
        status: statusFilter,
        location_id: locationId
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
      const result = await warehouseService.generateExternalReceipt(invoiceId, { location_id: locationId });
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

  // Funkcja do wyświetlania szczegółów PZ
  const viewReceiptDetails = async (receiptId) => {
    setDetailsLoading(true);
    try {
      const result = await warehouseService.getExternalReceiptDetails(receiptId);
      if (result.success) {
        setSelectedReceipt(result.data);
        setShowDetailsModal(true);
      } else {
        setError(result.error || 'Błąd pobierania szczegółów PZ');
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Funkcja do pobierania PDF
  const downloadPDF = async (receiptId) => {
    setLoading(true);
    try {
      const result = await warehouseService.downloadExternalReceiptPDF(receiptId);
      if (result.success) {
        setSuccess('PDF został pobrany');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Błąd pobierania PDF');
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid" style={{ fontSize: '12px' }}>
      <div className="d-flex justify-content-between align-items-center mb-2" style={{ padding: '0.3rem 0' }}>
        <h5 style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>📥 Przyjęcie Zewnętrzne (PZ)</h5>
      </div>

      {/* Zakładki - kompaktowe */}
      <div style={{
        display: 'flex',
        gap: '0.4rem',
        marginBottom: '0.75rem',
        padding: '0.4rem',
        backgroundColor: 'white',
        borderRadius: '4px',
        border: '1px solid #e9ecef'
      }}>
        <button
          style={{
            padding: '0.3rem 0.6rem',
            fontSize: '11px',
            fontWeight: '500',
            border: activeTab === 'new' ? '1px solid #198754' : '1px solid #e9ecef',
            borderRadius: '3px',
            backgroundColor: activeTab === 'new' ? '#198754' : 'white',
            color: activeTab === 'new' ? 'white' : '#495057',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
          onClick={() => setActiveTab('new')}
        >
          <i className="fas fa-file-invoice" style={{ fontSize: '10px' }}></i>
          Generowanie PZ
        </button>
        <button
          style={{
            padding: '0.3rem 0.6rem',
            fontSize: '11px',
            fontWeight: '500',
            border: activeTab === 'history' ? '1px solid #6f42c1' : '1px solid #e9ecef',
            borderRadius: '3px',
            backgroundColor: activeTab === 'history' ? '#6f42c1' : 'white',
            color: activeTab === 'history' ? 'white' : '#495057',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
          onClick={() => setActiveTab('history')}
        >
          <i className="fas fa-history" style={{ fontSize: '10px' }}></i>
          Historia PZ
        </button>
      </div>

      {error && (
        <div style={{ padding: '0.35rem 0.75rem', marginBottom: '0.5rem', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '3px', color: '#721c24', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error}
          <button style={{ background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', color: '#721c24' }} onClick={() => setError('')}>×</button>
        </div>
      )}

      {success && (
        <div style={{ padding: '0.35rem 0.75rem', marginBottom: '0.5rem', backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '3px', color: '#155724', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {success}
          <button style={{ background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', color: '#155724' }} onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      {/* Zawartość zakładek */}
      {activeTab === 'new' && (
        <div className="row">
          <div className="col-12">
            <div className="card" style={{ fontSize: '11px' }}>
              <div className="card-header" style={{ padding: '0.4rem 0.75rem' }}>
                <h6 className="card-title mb-0" style={{ fontSize: '12px', fontWeight: '600' }}>Faktury zakupu dostępne do przyjęcia</h6>
                <small style={{ color: '#6c757d', fontSize: '10px' }}>
                  PZ generuje się automatycznie na podstawie faktury zakupu produktów
                </small>
              </div>
              <div className="card-body" style={{ padding: '0.5rem 0.75rem' }}>
                {loading ? (
                  <div className="text-center py-2">
                    <div className="spinner-border spinner-border-sm" role="status">
                      <span className="visually-hidden">Ładowanie...</span>
                    </div>
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-3">
                    <div style={{ color: '#6c757d' }}>
                      <i className="fas fa-inbox mb-1" style={{ fontSize: '1.5rem' }}></i>
                      <p style={{ fontSize: '11px', margin: 0 }}>Brak faktur zakupu do przetworzenia</p>
                    </div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Numer faktury</th>
                          <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Dostawca</th>
                          <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Data faktury</th>
                          <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Wartość</th>
                          <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Status PZ</th>
                          <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Akcje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice) => (
                          <tr key={invoice.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                            <td style={{ padding: '0.3rem 0.5rem' }}>
                              <strong>{invoice.invoice_number}</strong>
                            </td>
                            <td style={{ padding: '0.3rem 0.5rem' }}>
                              {invoice.supplier_name}
                            </td>
                            <td style={{ padding: '0.3rem 0.5rem' }}>
                              {new Date(invoice.invoice_date).toLocaleDateString('pl-PL')}
                            </td>
                            <td style={{ padding: '0.3rem 0.5rem' }}>
                              <strong>{invoice.total_amount.toFixed(2)} zł</strong>
                            </td>
                            <td style={{ padding: '0.3rem 0.5rem' }}>
                              {invoice.pz_generated ? (
                                <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: '#28a745', color: 'white', borderRadius: '3px' }}>
                                  <i className="fas fa-check me-1"></i>
                                  PZ wygenerowane
                                </span>
                              ) : (
                                <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: '#ffc107', color: '#212529', borderRadius: '3px' }}>
                                  <i className="fas fa-clock me-1"></i>
                                  Oczekuje na PZ
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '0.3rem 0.5rem' }}>
                              {!invoice.pz_generated ? (
                                <button
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '10px', backgroundColor: '#0d6efd', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                                  onClick={() => generatePZ(invoice.id)}
                                  disabled={loading}
                                >
                                  <i className="fas fa-plus me-1"></i>
                                  Generuj PZ
                                </button>
                              ) : (
                                <button
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '10px', backgroundColor: '#e9ecef', color: '#6c757d', border: 'none', borderRadius: '3px' }}
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
        <div className="card" style={{ fontSize: '11px' }}>
          <div className="card-header d-flex justify-content-between align-items-center" style={{ padding: '0.4rem 0.75rem' }}>
            <h6 className="card-title mb-0" style={{ fontSize: '12px', fontWeight: '600' }}>Historia Przyjęć Zewnętrznych</h6>
            <div className="d-flex gap-2">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{ width: '110px', fontSize: '10px', padding: '0.2rem 0.4rem', border: '1px solid #ced4da', borderRadius: '3px' }}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '100px', fontSize: '10px', padding: '0.2rem 0.4rem', border: '1px solid #ced4da', borderRadius: '3px' }}
              >
                <option value="all">Wszystkie</option>
                <option value="completed">Zakończone</option>
                <option value="pending">Oczekujące</option>
              </select>
              <button
                style={{ padding: '0.2rem 0.5rem', fontSize: '10px', backgroundColor: 'white', color: '#6c757d', border: '1px solid #ced4da', borderRadius: '3px', cursor: 'pointer' }}
                onClick={loadReceipts}
              >
                <i className="fas fa-refresh"></i>
              </button>
            </div>
          </div>
          <div className="card-body" style={{ padding: '0.5rem 0.75rem' }}>
            {receipts.length === 0 ? (
              <div className="text-center py-3">
                <div style={{ color: '#6c757d' }}>
                  <i className="fas fa-inbox mb-1" style={{ fontSize: '1.5rem' }}></i>
                  <p style={{ fontSize: '11px', margin: 0 }}>Brak przyjęć zewnętrznych</p>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Numer dokumentu</th>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Faktura źródłowa</th>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Dostawca</th>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Data</th>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Produkty</th>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Wartość</th>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Status</th>
                      <th style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((receipt) => (
                      <tr key={receipt.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <td style={{ padding: '0.3rem 0.5rem' }}>
                          <strong>{receipt.document_number}</strong>
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem' }}>
                          <small style={{ color: '#6c757d' }}>{receipt.source_invoice_number}</small>
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem' }}>
                          {receipt.supplier_name}
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem' }}>
                          {new Date(receipt.receipt_date).toLocaleDateString('pl-PL')}
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem' }}>
                          <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: '#0dcaf0', color: 'white', borderRadius: '3px' }}>
                            {receipt.items_count || 0} pozycji
                          </span>
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem' }}>
                          <strong>{receipt.total_amount ? `${receipt.total_amount.toFixed(2)} zł` : '-'}</strong>
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem' }}>
                          <span style={{ 
                            fontSize: '10px', 
                            padding: '2px 6px', 
                            color: 'white', 
                            borderRadius: '3px',
                            backgroundColor: receipt.status === 'completed' ? '#28a745' : '#ffc107'
                          }}>
                            {receipt.status === 'completed' ? 'Zakończone' : 'Oczekujące'}
                          </span>
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem' }}>
                          <button
                            style={{ padding: '0.2rem 0.4rem', fontSize: '10px', backgroundColor: 'white', color: '#0d6efd', border: '1px solid #0d6efd', borderRadius: '3px', marginRight: '0.25rem', cursor: 'pointer' }}
                            onClick={() => viewReceiptDetails(receipt.id)}
                            disabled={detailsLoading}
                            title="Zobacz szczegóły"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button
                            style={{ padding: '0.2rem 0.4rem', fontSize: '10px', backgroundColor: 'white', color: '#6c757d', border: '1px solid #ced4da', borderRadius: '3px', cursor: 'pointer' }}
                            onClick={() => downloadPDF(receipt.id)}
                            disabled={loading}
                            title="Pobierz PDF"
                          >
                            <i className="fas fa-file-pdf"></i>
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

      {/* Modal szczegółów PZ - styl zgodny z OpenShiftEnhancedModal */}
      {showDetailsModal && selectedReceipt && (
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
              background: 'linear-gradient(135deg, #0d6efd, #0a58ca)',
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
                  Szczegóły PZ: {selectedReceipt.document_number}
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
              {/* Informacje nagłówkowe */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <div>
                  <p style={{ margin: '0.25rem 0' }}><strong>Data przyjęcia:</strong> {selectedReceipt.receipt_date ? new Date(selectedReceipt.receipt_date).toLocaleDateString('pl-PL') : '-'}</p>
                  <p style={{ margin: '0.25rem 0' }}><strong>Dostawca:</strong> {selectedReceipt.supplier_name || '-'}</p>
                </div>
                <div>
                  <p style={{ margin: '0.25rem 0' }}><strong>Faktura źródłowa:</strong> {selectedReceipt.source_invoice_number || '-'}</p>
                  <p style={{ margin: '0.25rem 0' }}><strong>Status:</strong> 
                    <span style={{ 
                      marginLeft: '0.5rem',
                      fontSize: '10px', 
                      padding: '2px 6px', 
                      color: 'white', 
                      borderRadius: '3px',
                      backgroundColor: selectedReceipt.status === 'completed' ? '#28a745' : '#ffc107'
                    }}>
                      {selectedReceipt.status === 'completed' ? 'Zakończone' : 'Oczekujące'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Tabela pozycji */}
              <h6 style={{ fontSize: '11px', fontWeight: '600', marginBottom: '0.5rem' }}>📦 Pozycje dokumentu:</h6>
              {selectedReceipt.items && selectedReceipt.items.length > 0 ? (
                <div className="table-responsive">
                  <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#343a40', color: 'white' }}>
                      <tr>
                        <th style={{ padding: '0.3rem 0.4rem', textAlign: 'left' }}>Lp.</th>
                        <th style={{ padding: '0.3rem 0.4rem', textAlign: 'left' }}>Nazwa produktu</th>
                        <th style={{ padding: '0.3rem 0.4rem', textAlign: 'left' }}>Kod kreskowy</th>
                        <th style={{ padding: '0.3rem 0.4rem', textAlign: 'right' }}>Ilość</th>
                        <th style={{ padding: '0.3rem 0.4rem', textAlign: 'left' }}>J.m.</th>
                        <th style={{ padding: '0.3rem 0.4rem', textAlign: 'right' }}>Cena netto</th>
                        <th style={{ padding: '0.3rem 0.4rem', textAlign: 'right' }}>Wartość</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReceipt.items.map((item, index) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                          <td style={{ padding: '0.3rem 0.4rem' }}>{index + 1}</td>
                          <td style={{ padding: '0.3rem 0.4rem' }}>{item.product_name || '-'}</td>
                          <td style={{ padding: '0.3rem 0.4rem' }}><small style={{ color: '#6c757d' }}>{item.barcode || '-'}</small></td>
                          <td style={{ padding: '0.3rem 0.4rem', textAlign: 'right' }}>{item.quantity?.toFixed(2)}</td>
                          <td style={{ padding: '0.3rem 0.4rem' }}>{item.unit || 'szt'}</td>
                          <td style={{ padding: '0.3rem 0.4rem', textAlign: 'right' }}>{item.unit_price?.toFixed(2)} zł</td>
                          <td style={{ padding: '0.3rem 0.4rem', textAlign: 'right' }}><strong>{item.total_price?.toFixed(2)} zł</strong></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot style={{ backgroundColor: '#f8f9fa' }}>
                      <tr>
                        <td colSpan="6" style={{ padding: '0.3rem 0.4rem', textAlign: 'right' }}><strong>RAZEM:</strong></td>
                        <td style={{ padding: '0.3rem 0.4rem', textAlign: 'right' }}>
                          <strong>
                            {selectedReceipt.items.reduce((sum, item) => sum + (item.total_price || 0), 0).toFixed(2)} zł
                          </strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '0.5rem', backgroundColor: '#cfe2ff', border: '1px solid #b6d4fe', borderRadius: '3px', fontSize: '11px', color: '#084298' }}>
                  Brak pozycji w dokumencie
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid #e9ecef', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button 
                style={{ padding: '0.3rem 0.75rem', fontSize: '11px', backgroundColor: '#0d6efd', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                onClick={() => downloadPDF(selectedReceipt.id)}
                disabled={loading}
              >
                <i className="fas fa-file-pdf me-1"></i>
                Pobierz PDF
              </button>
              <button 
                style={{ padding: '0.3rem 0.75rem', fontSize: '11px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                onClick={() => setShowDetailsModal(false)}
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExternalReceipt;
