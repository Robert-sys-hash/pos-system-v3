import React, { useState, useEffect } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { useWarehouse } from '../contexts/WarehouseContext';

const SalesInvoicesPage = () => {
  const { selectedLocation, locationId } = useLocation();
  const { selectedWarehouse, warehouseId } = useWarehouse();
  
  // Użyj location_id dla adminów, warehouse_id dla pracowników
  const currentLocationId = locationId || warehouseId;
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [totalReceipts, setTotalReceipts] = useState(0);
  const [receiptsLimit, setReceiptsLimit] = useState(25);
  const [receiptsOffset, setReceiptsOffset] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterDate, setFilterDate] = useState('all'); // 'today', 'month', 'all'
  const [filterDateValue, setFilterDateValue] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('invoices');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receiptEligibility, setReceiptEligibility] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Pobierz faktury sprzedaży
  const fetchInvoices = async () => {
    try {
      const params = currentLocationId ? `?location_id=${currentLocationId}` : '';
      const response = await fetch(`http://localhost:8000/api/sales-invoices${params}`);
      const data = await response.json();
      
      if (data.success) {
        setInvoices(data.data.faktury || []);
      } else {
        setError('Błąd pobierania faktur: ' + data.error);
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem: ' + err.message);
    }
  };

  // Pobierz paragony do fakturowania
  const fetchReceipts = async () => {
    try {
      let url = `http://localhost:8000/api/receipts-for-invoicing?limit=${receiptsLimit}&offset=${receiptsOffset}`;
      
      // Dodaj filtrowanie po lokalizacji
      if (currentLocationId) {
        url += `&location_id=${currentLocationId}`;
      }
      
      // Dodaj filtrowanie daty
      if (filterDate === 'today') {
        const today = new Date().toISOString().split('T')[0];
        url += `&date=${today}`;
      } else if (filterDate === 'month') {
        const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
        url += `&month=${currentMonth}`;
      } else if (filterDate === 'custom' && filterDateValue) {
        url += `&date=${filterDateValue}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setReceipts(data.data.paragony || []);
        setTotalReceipts(data.data.total || 0);
      } else {
        setError('Błąd pobierania paragonów: ' + data.error);
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem: ' + err.message);
    }
  };

  // Pobierz szczegóły paragonu
  const fetchReceiptDetails = async (receiptId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/receipt-details/${receiptId}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedReceipt(data.data);
        // Sprawdź uprawnienia do wystawienia faktury
        await checkReceiptEligibility(receiptId);
        setShowCreateModal(true);
      } else {
        setError('Błąd pobierania szczegółów paragonu: ' + data.error);
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem: ' + err.message);
    }
  };

  // Sprawdź możliwość wystawienia faktury dla paragonu
  const checkReceiptEligibility = async (receiptId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/receipt-invoice-eligibility/${receiptId}`);
      const data = await response.json();
      
      if (data.success) {
        setReceiptEligibility(data.data);
      }
    } catch (err) {
      console.error('Błąd sprawdzania uprawnień:', err);
    }
  };

  // Pobierz listę klientów
  const fetchCustomers = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/customers');
      const data = await response.json();
      
      if (data.success) {
        setCustomers(data.data || []);
      } else {
        setError('Błąd pobierania klientów: ' + data.error);
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem: ' + err.message);
    }
  };

  // Pobierz podgląd faktury
  const previewInvoice = async (invoiceId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/sales-invoices/${invoiceId}`);
      const data = await response.json();
      
      if (data.success) {
        alert(`Podgląd faktury ${data.data.numer_faktury}\nSuma: ${data.data.suma_brutto} zł`);
      } else {
        setError('Błąd pobierania faktury: ' + data.error);
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem: ' + err.message);
    }
  };

  // Pobierz PDF faktury
  const downloadInvoicePDF = async (invoiceId, invoiceNumber) => {
    try {
      const response = await fetch(`http://localhost:8000/api/sales-invoices/${invoiceId}/pdf`);
      
      if (response.ok) {
        const blob = await response.blob();
        
        // Sprawdź czy to rzeczywiście PDF
        if (blob.type === 'application/pdf' || blob.size > 100) {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `faktura_${invoiceNumber}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          // Jeśli to nie jest prawidłowy PDF, pokaż treść jako tekst
          const text = await blob.text();
          console.log('Odpowiedź serwera:', text);
          setError('Plik PDF nie został wygenerowany poprawnie. Sprawdź logi serwera.');
        }
      } else {
        const errorText = await response.text();
        setError('Błąd pobierania PDF: ' + errorText);
      }
    } catch (err) {
      setError('Błąd pobierania PDF: ' + err.message);
    }
  };

  // Utwórz korektę faktury
  const createInvoiceCorrection = async (invoiceId) => {
    const reason = prompt('Podaj powód korekty:');
    if (!reason) return;

    try {
      const response = await fetch(`http://localhost:8000/api/sales-invoices/${invoiceId}/correction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ powod_korekty: reason })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Korekta utworzona pomyślnie!');
        fetchInvoices();
      } else {
        setError('Błąd tworzenia korekty: ' + data.error);
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem: ' + err.message);
    }
  };

  // Utwórz fakturę z paragonu
  const createInvoiceFromReceipt = async (receiptId, invoiceData) => {
    try {
      const response = await fetch(`http://localhost:8000/api/sales-invoices/from-receipt/${receiptId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invoiceData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Faktura utworzona pomyślnie!');
        setShowCreateModal(false);
        setSelectedReceipt(null);
        setReceiptEligibility(null);
        fetchInvoices();
        fetchReceipts();
      } else {
        setError('Błąd tworzenia faktury: ' + data.error);
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem: ' + err.message);
    }
  };

  // Funkcje paginacji
  const totalPages = Math.ceil(totalReceipts / receiptsLimit);
  
  const goToPage = (page) => {
    const newOffset = (page - 1) * receiptsLimit;
    setCurrentPage(page);
    setReceiptsOffset(newOffset);
  };

  const handleFilterChange = (newFilter) => {
    setFilterDate(newFilter);
    setCurrentPage(1);
    setReceiptsOffset(0);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchInvoices(), fetchReceipts(), fetchCustomers()])
      .finally(() => setLoading(false));
  }, [receiptsLimit, receiptsOffset, filterDate, filterDateValue, currentLocationId]);

  if (loading) {
    return (
      <div className="container-fluid mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Ładowanie...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        <div className="col-12">
          <h2>📧 Faktury Sprzedaży</h2>
          
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
              <button 
                type="button" 
                className="btn-close float-end" 
                onClick={() => setError('')}
              ></button>
            </div>
          )}

          {/* Tabs */}
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'invoices' ? 'active' : ''}`}
                onClick={() => setActiveTab('invoices')}
              >
                📄 Faktury wystawione ({invoices.length})
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'receipts' ? 'active' : ''}`}
                onClick={() => setActiveTab('receipts')}
              >
                🧾 Paragony do fakturowania ({totalReceipts})
              </button>
            </li>
          </ul>

          {/* Faktury wystawione */}
          {activeTab === 'invoices' && (
            <div className="card">
              <div className="card-header">
                <h5>📄 Faktury wystawione</h5>
              </div>
              <div className="card-body">
                {invoices.length === 0 ? (
                  <p className="text-muted">Brak faktur do wyświetlenia</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped table-hover">
                      <thead>
                        <tr>
                          <th>Numer faktury</th>
                          <th>Data wystawienia</th>
                          <th>Nabywca</th>
                          <th>Suma brutto</th>
                          <th>Status</th>
                          <th>Akcje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice) => (
                          <tr key={invoice.id}>
                            <td>
                              <strong>{invoice.numer_faktury}</strong>
                              {invoice.typ_faktury === 'korekta' && (
                                <span className="badge bg-warning ms-2">Korekta</span>
                              )}
                            </td>
                            <td>{invoice.data_wystawienia}</td>
                            <td>
                              {invoice.nabywca_nazwa}
                              {invoice.nabywca_nip && (
                                <small className="text-muted d-block">
                                  NIP: {invoice.nabywca_nip}
                                </small>
                              )}
                            </td>
                            <td>{parseFloat(invoice.suma_brutto).toFixed(2)} zł</td>
                            <td>
                              <span className={`badge ${invoice.status === 'wystawiona' ? 'bg-success' : 'bg-secondary'}`}>
                                {invoice.status}
                              </span>
                            </td>
                            <td>
                              <div className="btn-group btn-group-sm" role="group">
                                <button 
                                  className="btn btn-outline-primary"
                                  onClick={() => previewInvoice(invoice.id)}
                                  title="Podgląd"
                                >
                                  👁️
                                </button>
                                <button 
                                  className="btn btn-outline-success"
                                  onClick={() => downloadInvoicePDF(invoice.id, invoice.numer_faktury)}
                                  title="Pobierz PDF"
                                >
                                  📄
                                </button>
                                {invoice.typ_faktury !== 'korekta' && (
                                  <button 
                                    className="btn btn-outline-warning"
                                    onClick={() => createInvoiceCorrection(invoice.id)}
                                    title="Utwórz korektę"
                                  >
                                    📝
                                  </button>
                                )}
                              </div>
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

          {/* Paragony do fakturowania */}
          {activeTab === 'receipts' && (
            <div className="card">
              <div className="card-header">
                <div className="row align-items-center">
                  <div className="col-md-6">
                    <h5>Paragony do fakturowania</h5>
                    <small className="text-muted">
                      Kliknij na paragon, aby utworzyć z niego fakturę
                    </small>
                  </div>
                  <div className="col-md-6">
                    {/* Filtry */}
                    <div className="d-flex align-items-center gap-3 justify-content-end">
                      <div className="d-flex align-items-center">
                        <label className="form-label me-2 mb-0">Filtr:</label>
                        <select 
                          className="form-select form-select-sm" 
                          style={{width: 'auto'}}
                          value={filterDate}
                          onChange={(e) => handleFilterChange(e.target.value)}
                        >
                          <option value="all">Wszystkie</option>
                          <option value="today">Dzisiaj</option>
                          <option value="month">Ten miesiąc</option>
                          <option value="custom">Wybierz datę</option>
                        </select>
                        {filterDate === 'custom' && (
                          <input
                            type="date"
                            className="form-control form-control-sm ms-2"
                            style={{width: 'auto'}}
                            value={filterDateValue}
                            onChange={(e) => setFilterDateValue(e.target.value)}
                          />
                        )}
                      </div>
                      <div className="text-muted">
                        <small>
                          Strona {currentPage} z {totalPages} | {receipts.length} z {totalReceipts}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-body">
                {receipts.length === 0 ? (
                  <p className="text-muted">Brak paragonów do wyświetlenia</p>
                ) : (
                  <>
                    <div className="table-responsive">
                      <table className="table table-striped table-hover">
                        <thead>
                          <tr>
                            <th>Numer transakcji</th>
                            <th>Data</th>
                            <th>Kasjer</th>
                            <th>Suma brutto</th>
                            <th>Czy ma fakturę</th>
                            <th>Akcje</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receipts.map((receipt) => (
                            <tr key={receipt.id}>
                              <td>
                                <strong>{receipt.numer_transakcji}</strong>
                                <small className="text-muted d-block">
                                  ID: {receipt.id}
                                </small>
                              </td>
                              <td>
                                {receipt.data_transakcji}
                                <small className="text-muted d-block">
                                  {receipt.czas_transakcji}
                                </small>
                              </td>
                              <td>{receipt.kasjer_login}</td>
                              <td>{parseFloat(receipt.suma_brutto).toFixed(2)} zł</td>
                              <td>
                                {receipt.ma_fakture ? (
                                  <span className="badge bg-success">
                                    ✅ Tak ({receipt.numer_faktury})
                                  </span>
                                ) : (
                                  <span className="badge bg-secondary">
                                    ❌ Nie
                                  </span>
                                )}
                              </td>
                              <td>
                                {!receipt.ma_fakture && (
                                  <button 
                                    className="btn btn-sm btn-primary"
                                    onClick={() => fetchReceiptDetails(receipt.id)}
                                  >
                                    📧 Utwórz fakturę
                                  </button>
                                )}
                                {receipt.ma_fakture && (
                                  <button className="btn btn-sm btn-secondary" disabled>
                                    ✅ Ma fakturę
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Paginacja */}
                    {totalPages > 1 && (
                      <nav aria-label="Nawigacja paragonów">
                        <ul className="pagination justify-content-center">
                          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => goToPage(currentPage - 1)}
                              disabled={currentPage === 1}
                            >
                              Poprzednia
                            </button>
                          </li>
                          
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            
                            return (
                              <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                                <button 
                                  className="page-link" 
                                  onClick={() => goToPage(pageNum)}
                                >
                                  {pageNum}
                                </button>
                              </li>
                            );
                          })}
                          
                          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => goToPage(currentPage + 1)}
                              disabled={currentPage === totalPages}
                            >
                              Następna
                            </button>
                          </li>
                        </ul>
                      </nav>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal tworzenia faktury */}
      {showCreateModal && selectedReceipt && (
        <CreateInvoiceModal 
          receipt={selectedReceipt}
          customers={customers}
          eligibility={receiptEligibility}
          currentLocationId={currentLocationId}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedReceipt(null);
            setReceiptEligibility(null);
            setSelectedCustomer(null);
          }}
          onSubmit={createInvoiceFromReceipt}
        />
      )}
    </div>
  );
};

// Modal tworzenia faktury
const CreateInvoiceModal = ({ receipt, customers, eligibility, currentLocationId, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    nabywca_nazwa: '',
    nabywca_nip: '',
    nabywca_adres: '',
    nabywca_miasto: '',
    nabywca_kod_pocztowy: '',
    nabywca_telefon: '',
    nabywca_email: '',
    data_wystawienia: new Date().toISOString().split('T')[0],
    termin_platnosci: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    location_id: currentLocationId || 1,
    typ_faktury: 'imienna' // 'imienna' lub 'firmowa'
  });

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  
  // Filtruj klientów na podstawie wyszukiwania
  const filteredCustomers = customers.filter(customer => {
    if (!customerSearchTerm) return false;
    
    const searchLower = customerSearchTerm.toLowerCase();
    const customerName = customer.name || `${customer.imie || ''} ${customer.nazwisko || ''}`.trim();
    
    return customerName.toLowerCase().includes(searchLower) || 
           (customer.nip && customer.nip.includes(searchLower)) ||
           (customer.phone && customer.phone.includes(searchLower)) ||
           (customer.telefon && customer.telefon.includes(searchLower));
  });

  const handleCustomerSelect = (customer) => {
    const customerName = customer.name || `${customer.imie || ''} ${customer.nazwisko || ''}`.trim();
    
    setCustomerSearchTerm(customerName);
    setSelectedCustomerId(customer.id);
    setShowCustomerDropdown(false);
    
    // Mapuj dane klienta bezpośrednio z obiektu customer
    setFormData(prev => ({
      ...prev,
      nabywca_nazwa: customerName,
      nabywca_nip: customer.nip || '',
      nabywca_adres: customer.address || `${customer.ulica || ''} ${customer.numer_domu || ''}`.trim(),
      nabywca_miasto: customer.miasto || customer.city || '',
      nabywca_kod_pocztowy: customer.kod_pocztowy || customer.postal_code || '',
      nabywca_telefon: customer.phone || customer.telefon || '',
      nabywca_email: customer.email || ''
    }));
  };

  const handleCustomerSearchChange = (e) => {
    const value = e.target.value;
    setCustomerSearchTerm(value);
    setShowCustomerDropdown(value.length > 0);
    
    if (value.length === 0) {
      setSelectedCustomerId('');
      // Wyczyść formularz gdy usuwamy wyszukiwanie
      setFormData(prev => ({
        ...prev,
        nabywca_nazwa: '',
        nabywca_nip: '',
        nabywca_adres: '',
        nabywca_miasto: '',
        nabywca_kod_pocztowy: '',
        nabywca_telefon: '',
        nabywca_email: ''
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.nabywca_nazwa.trim()) {
      alert('Nazwa nabywcy jest wymagana');
      return;
    }

    // Sprawdź zgodność z prawem polskim
    if (formData.typ_faktury === 'firmowa') {
      if (!eligibility?.mozna_fakture_firmowa) {
        alert('Nie można wystawić faktury firmowej dla tego paragonu.\nParagon nie zawiera danych NIP klienta.');
        return;
      }
      if (!formData.nabywca_nip.trim()) {
        alert('NIP jest wymagany dla faktury firmowej');
        return;
      }
    }
    
    onSubmit(receipt.id, formData);
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              📧 Utwórz fakturę z paragonu {receipt.numer_transakcji}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          <div className="modal-body">
            {/* Szczegóły paragonu */}
            <div className="card mb-4">
              <div className="card-header">
                <h6>📋 Szczegóły paragonu</h6>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <p><strong>Numer:</strong> {receipt.numer_transakcji}</p>
                    <p><strong>Data:</strong> {receipt.data_transakcji} {receipt.czas_transakcji}</p>
                    <p><strong>Kasjer:</strong> {receipt.kasjer_login}</p>
                  </div>
                  <div className="col-md-6">
                    <p><strong>Suma brutto:</strong> {parseFloat(receipt.suma_brutto).toFixed(2)} zł</p>
                    <p><strong>Suma netto:</strong> {parseFloat(receipt.suma_netto).toFixed(2)} zł</p>
                    <p><strong>VAT:</strong> {parseFloat(receipt.suma_vat).toFixed(2)} zł</p>
                  </div>
                </div>
                
                {receipt.pozycje && receipt.pozycje.length > 0 && (
                  <div className="mt-3">
                    <h6>Pozycje:</h6>
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Produkt</th>
                            <th>Ilość</th>
                            <th>Cena</th>
                            <th>Wartość</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receipt.pozycje.map((item, index) => (
                            <tr key={index}>
                              <td>{item.nazwa_produktu}</td>
                              <td>{item.ilosc}</td>
                              <td>{parseFloat(item.cena_jednostkowa_brutto).toFixed(2)} zł</td>
                              <td>{parseFloat(item.wartosc_brutto).toFixed(2)} zł</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Formularz faktury */}
            <form onSubmit={handleSubmit}>
              {/* Informacje o uprawnieniach */}
              {eligibility && (
                <div className="alert alert-info mb-3">
                  <h6>📋 Uprawnienia do wystawienia faktury:</h6>
                  <ul className="mb-0">
                    <li>
                      <strong>Faktura imienna:</strong> 
                      <span className="badge bg-success ms-2">✓ Dozwolona</span>
                    </li>
                    <li>
                      <strong>Faktura firmowa:</strong> 
                      {eligibility.mozna_fakture_firmowa ? (
                        <span className="badge bg-success ms-2">✓ Dozwolona</span>
                      ) : (
                        <span className="badge bg-danger ms-2">✗ Niedozwolona - brak NIP w paragonie</span>
                      )}
                    </li>
                  </ul>
                </div>
              )}

              {/* Wybór klienta */}
              <div className="card mb-3">
                <div className="card-header">
                  <h6>📇 Wybór klienta z kartoteki</h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-8">
                      <div className="position-relative">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="🔍 Wyszukaj klienta (nazwa, NIP, telefon) lub wprowadź dane ręcznie..."
                          value={customerSearchTerm}
                          onChange={handleCustomerSearchChange}
                          onFocus={() => customerSearchTerm && setShowCustomerDropdown(true)}
                          onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                        />
                        
                        {showCustomerDropdown && filteredCustomers.length > 0 && (
                          <div className="dropdown-menu show w-100" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {filteredCustomers.slice(0, 10).map(customer => {
                              const customerName = customer.name || `${customer.imie || ''} ${customer.nazwisko || ''}`.trim();
                              
                              return (
                                <button
                                  key={customer.id}
                                  type="button"
                                  className="dropdown-item d-flex justify-content-between"
                                  onClick={() => handleCustomerSelect(customer)}
                                >
                                  <span>
                                    <strong>{customerName}</strong>
                                    {customer.nip && <small className="text-muted"> (NIP: {customer.nip})</small>}
                                    {(customer.phone || customer.telefon) && (
                                      <small className="text-muted"> • {customer.phone || customer.telefon}</small>
                                    )}
                                  </span>
                                  <small className="text-muted">
                                    {customer.typ_klienta === 'firma' || customer.name?.includes('Sp.') ? '🏢' : '👤'}
                                  </small>
                                </button>
                              );
                            })}
                            {filteredCustomers.length > 10 && (
                              <div className="dropdown-item text-muted text-center">
                                <small>... i {filteredCustomers.length - 10} więcej. Zawęź wyszukiwanie.</small>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {showCustomerDropdown && customerSearchTerm && filteredCustomers.length === 0 && (
                          <div className="dropdown-menu show w-100">
                            <div className="dropdown-item text-muted text-center">
                              <small>Brak wyników. Wprowadź dane ręcznie poniżej.</small>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {selectedCustomerId && (
                        <div className="mt-2">
                          <small className="text-success">
                            ✅ Wybrano klienta z kartoteki
                            <button 
                              type="button" 
                              className="btn btn-sm btn-outline-secondary ms-2"
                              onClick={() => {
                                setSelectedCustomerId('');
                                setCustomerSearchTerm('');
                                // Wyczyść formularz
                                setFormData(prev => ({
                                  ...prev,
                                  nabywca_nazwa: '',
                                  nabywca_nip: '',
                                  nabywca_adres: '',
                                  nabywca_miasto: '',
                                  nabywca_kod_pocztowy: '',
                                  nabywca_telefon: '',
                                  nabywca_email: ''
                                }));
                              }}
                            >
                              Wyczyść
                            </button>
                          </small>
                        </div>
                      )}
                    </div>
                    <div className="col-md-4">
                      <select 
                        className="form-select"
                        value={formData.typ_faktury}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          typ_faktury: e.target.value
                        }))}
                      >
                        <option value="imienna">Faktura imienna</option>
                        <option 
                          value="firmowa" 
                          disabled={!eligibility?.mozna_fakture_firmowa}
                        >
                          Faktura firmowa
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h6>👤 Dane nabywcy</h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Nazwa / Firma *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.nabywca_nazwa}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            nabywca_nazwa: e.target.value
                          }))}
                          required
                        />
                      </div>
                      
                      <div className="mb-3">
                        <label className="form-label">NIP</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.nabywca_nip}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            nabywca_nip: e.target.value
                          }))}
                        />
                      </div>
                      
                      <div className="mb-3">
                        <label className="form-label">Adres</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.nabywca_adres}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            nabywca_adres: e.target.value
                          }))}
                        />
                      </div>
                    </div>
                    
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Miasto</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.nabywca_miasto}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            nabywca_miasto: e.target.value
                          }))}
                        />
                      </div>
                      
                      <div className="mb-3">
                        <label className="form-label">Kod pocztowy</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.nabywca_kod_pocztowy}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            nabywca_kod_pocztowy: e.target.value
                          }))}
                        />
                      </div>
                      
                      <div className="mb-3">
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          className="form-control"
                          value={formData.nabywca_email}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            nabywca_email: e.target.value
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Data wystawienia</label>
                        <input
                          type="date"
                          className="form-control"
                          value={formData.data_wystawienia}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            data_wystawienia: e.target.value
                          }))}
                        />
                      </div>
                    </div>
                    
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Termin płatności</label>
                        <input
                          type="date"
                          className="form-control"
                          value={formData.termin_platnosci}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            termin_platnosci: e.target.value
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Anuluj
                </button>
                <button type="submit" className="btn btn-primary">
                  📧 Utwórz fakturę
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesInvoicesPage;
