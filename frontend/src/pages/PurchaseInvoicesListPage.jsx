import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaSearch, 
  FaEye, 
  FaEdit, 
  FaTrash, 
  FaCheck, 
  FaTimes,
  FaFileInvoice,
  FaArrowLeft,
  FaChevronLeft,
  FaChevronRight,
  FaCheckSquare,
  FaFilePdf,
  FaFileCode,
  FaClock,
  FaExclamationTriangle
} from 'react-icons/fa';

const PurchaseInvoicesListPage = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  
  // Filtry i wyszukiwanie
  const [filters, setFilters] = useState({
    search: '',
    date_from: '',
    date_to: '',
    status: '',
    supplier: ''
  });
  
  // Paginacja
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 30,
    total: 0,
    pages: 0,
    has_prev: false,
    has_next: false
  });

  useEffect(() => {
    loadInvoices();
  }, [filters, pagination.page]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: pagination.page,
        per_page: pagination.per_page,
        ...filters
      });
      
      const response = await fetch(`http://localhost:5002/api/purchase-invoices?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setInvoices(data.data.invoices);
        setPagination(prev => ({
          ...prev,
          ...data.data.pagination
        }));
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem');
      console.error('Błąd ładowania faktur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadInvoices();
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      date_from: '',
      date_to: '',
      status: '',
      supplier: ''
    });
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const toggleInvoiceSelection = (invoiceId) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices.map(inv => inv.id));
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'nowa': { bg: '#cfe2ff', color: '#084298', text: 'Nowa' },
      'oczekujaca': { bg: '#fff3cd', color: '#664d03', text: 'Oczekująca' },
      'weryfikacja': { bg: '#d1ecf1', color: '#0c5460', text: 'Weryfikacja' },
      'zatwierdzona': { bg: '#d1e7dd', color: '#0a3622', text: 'Zatwierdzona' },
      'odrzucona': { bg: '#f8d7da', color: '#721c24', text: 'Odrzucona' }
    };
    
    const config = statusConfig[status] || { bg: '#e2e3e5', color: '#41464b', text: status };
    
    return (
      <span style={{
        padding: '0.25rem 0.5rem',
        backgroundColor: config.bg,
        color: config.color,
        borderRadius: '0.25rem',
        fontSize: '0.8rem',
        fontWeight: '500'
      }}>
        {config.text}
      </span>
    );
  };

  const getImportTypeBadge = (invoice) => {
    if (invoice.zaimportowana_xml) {
      return <FaFileCode className="text-success me-1" title="Zaimportowana z XML" />;
    }
    if (invoice.zaimportowana_pdf) {
      return <FaFilePdf className="text-danger me-1" title="Zaimportowana z PDF" />;
    }
    return <FaEdit className="text-primary me-1" title="Wprowadzona ręcznie" />;
  };

  const getMappingStatus = (invoice) => {
    const total = invoice.pozycje_count || 0;
    const mapped = invoice.pozycje_mapped || 0;
    const unmapped = invoice.pozycje_unmapped || 0;
    
    if (total === 0) return <span className="text-muted">Brak pozycji</span>;
    if (unmapped === 0) return <FaCheck className="text-success" title="Wszystkie pozycje zmapowane" />;
    if (mapped === 0) return <FaTimes className="text-danger" title="Brak mapowań" />;
    return <FaClock className="text-warning" title={`${mapped}/${total} zmapowane`} />;
  };

  if (loading && invoices.length === 0) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Ładowanie...</span>
          </div>
          <p className="mt-2">Ładowanie faktur zakupowych...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      width: '100%', 
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      padding: '1.5rem' 
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Nagłówek - identyczny ze stylem magazynu */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1.5rem',
          padding: '1.25rem 1.5rem',
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.5rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '3rem',
              height: '3rem',
              backgroundColor: '#e7f1ff',
              borderRadius: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #0d6efd'
            }}>
              <FaFileInvoice style={{ 
                color: '#0d6efd', 
                fontSize: '1.25rem' 
              }} />
            </div>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: '1.4rem', 
                fontWeight: '700',
                color: '#212529',
                letterSpacing: '-0.025em'
              }}>
                Lista Faktur Zakupowych
              </h1>
              <p style={{ 
                margin: '0.25rem 0 0 0', 
                fontSize: '0.875rem', 
                color: '#6c757d',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem'
              }}>
                <i className="fas fa-info-circle" style={{ fontSize: '0.8rem' }}></i>
                Przeglądaj i zarządzaj fakturami zakupowymi
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={() => navigate('/purchase-invoices')}
              style={{ 
                padding: '0.625rem 1.125rem',
                fontSize: '0.875rem',
                border: '1px solid #6c757d',
                borderRadius: '0.375rem',
                backgroundColor: '#f8f9fa',
                color: '#495057',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '500',
                transition: 'all 0.15s ease-in-out'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#e9ecef';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 0.25rem 0.5rem rgba(108, 117, 125, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#f8f9fa';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <FaArrowLeft />
              Powrót do menu
            </button>
            <button
              onClick={loadInvoices}
              disabled={loading}
              style={{ 
                padding: '0.625rem 1.125rem',
                fontSize: '0.875rem',
                border: '1px solid #0d6efd',
                borderRadius: '0.375rem',
                backgroundColor: '#0d6efd',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '500',
                transition: 'all 0.15s ease-in-out'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#0b5ed7';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 0.25rem 0.5rem rgba(13, 110, 253, 0.25)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#0d6efd';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }
              }}
            >
              <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
              {loading ? 'Ładowanie...' : 'Odśwież'}
            </button>
          </div>
        </div>

        {/* Alert błędów */}
        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '0.375rem',
            color: '#721c24',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <FaExclamationTriangle />
            {error}
            <button 
              onClick={() => setError(null)}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: '#721c24',
                cursor: 'pointer',
                fontSize: '1.25rem'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Filtry i wyszukiwanie - na wzór magazynu */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
          marginBottom: '1rem'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef'
          }}>
            <h6 style={{ 
              margin: 0, 
              color: '#495057', 
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              <FaSearch style={{ marginRight: '0.5rem', color: '#6c757d' }} />
              Wyszukiwanie i filtry
            </h6>
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#6c757d',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <i className="fas fa-list"></i>
              <span>Faktury: <strong>{pagination.total}</strong></span>
              {(filters.search || filters.date_from || filters.date_to || filters.status) && 
                <span>/ Wyników: <strong>{invoices.length}</strong></span>
              }
            </div>
          </div>
          <div style={{ padding: '1rem' }}>
            <form onSubmit={handleSearch}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '1rem', 
                marginBottom: '1rem'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#495057' 
                  }}>
                    Numer faktury / Dostawca
                  </label>
                  <input 
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Wpisz numer faktury lub nazwę dostawcy..."
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      outline: 'none',
                      transition: 'border-color 0.15s ease-in-out'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#495057' 
                  }}>
                    Data od
                  </label>
                  <input 
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      outline: 'none',
                      transition: 'border-color 0.15s ease-in-out'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#495057' 
                  }}>
                    Data do
                  </label>
                  <input 
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      outline: 'none',
                      transition: 'border-color 0.15s ease-in-out'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#495057' 
                  }}>
                    Status
                  </label>
                  <select 
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      outline: 'none',
                      backgroundColor: 'white',
                      transition: 'border-color 0.15s ease-in-out'
                    }}
                  >
                    <option value="">Wszystkie</option>
                    <option value="nowa">Nowa</option>
                    <option value="oczekujaca">Oczekująca</option>
                    <option value="weryfikacja">Weryfikacja</option>
                    <option value="zatwierdzona">Zatwierdzona</option>
                    <option value="odrzucona">Odrzucona</option>
                  </select>
                </div>
              </div>
              
              <div style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                <button 
                  type="submit" 
                  style={{ 
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    border: '1px solid #0d6efd',
                    borderRadius: '0.375rem',
                    backgroundColor: '#0d6efd',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: '500',
                    transition: 'all 0.15s ease-in-out'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#0b5ed7';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 0.25rem 0.5rem rgba(13, 110, 253, 0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#0d6efd';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <FaSearch />
                  Szukaj
                </button>
                <button 
                  type="button" 
                  onClick={clearFilters}
                  style={{ 
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    border: '1px solid #6c757d',
                    borderRadius: '0.375rem',
                    backgroundColor: '#f8f9fa',
                    color: '#495057',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: '500',
                    transition: 'all 0.15s ease-in-out'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#e9ecef';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 0.25rem 0.5rem rgba(108, 117, 125, 0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#f8f9fa';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <FaTimes />
                  Wyczyść
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Lista faktur */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
          marginBottom: '1rem'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef'
          }}>
            <h6 style={{ 
              margin: 0, 
              color: '#495057', 
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              <i className="fas fa-list me-2" style={{ color: '#6c757d' }}></i>
              Faktury ({pagination.total})
              {(filters.search || filters.date_from || filters.date_to || filters.status) && 
                <span style={{ color: '#6c757d', fontWeight: '400' }}> - wyników: {invoices.length}</span>
              }
            </h6>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={toggleSelectAll}
                style={{ 
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.8rem',
                  border: '1px solid #0d6efd',
                  borderRadius: '0.375rem',
                  backgroundColor: selectedInvoices.length === invoices.length ? '#0d6efd' : 'white',
                  color: selectedInvoices.length === invoices.length ? 'white' : '#0d6efd',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontWeight: '500',
                  transition: 'all 0.15s ease-in-out'
                }}
              >
                <FaCheckSquare />
                {selectedInvoices.length === invoices.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
              </button>
              <button 
                disabled={selectedInvoices.length === 0}
                style={{ 
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.8rem',
                  border: selectedInvoices.length === 0 ? '1px solid #6c757d' : '1px solid #28a745',
                  borderRadius: '0.375rem',
                  backgroundColor: selectedInvoices.length === 0 ? '#f8f9fa' : '#28a745',
                  color: selectedInvoices.length === 0 ? '#6c757d' : 'white',
                  cursor: selectedInvoices.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontWeight: '500',
                  opacity: selectedInvoices.length === 0 ? 0.6 : 1,
                  transition: 'all 0.15s ease-in-out'
                }}
              >
                <FaFilePdf />
                Eksportuj zaznaczone ({selectedInvoices.length})
              </button>
            </div>
          </div>
          
          <div style={{ padding: invoices.length === 0 ? '3rem 1rem' : '0' }}>
            {invoices.length === 0 ? (
              <div style={{ 
                textAlign: 'center',
                color: '#6c757d'
              }}>
                <FaFileInvoice style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: '1rem' }}>Brak faktur spełniających kryteria wyszukiwania</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  fontSize: '0.875rem'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
                      <th style={{ 
                        padding: '0.75rem 0.5rem',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#495057',
                        width: '50px'
                      }}>
                        <input 
                          type="checkbox"
                          checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                          onChange={toggleSelectAll}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th style={{ 
                        padding: '0.75rem 0.5rem',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#495057'
                      }}>ID</th>
                      <th style={{ 
                        padding: '0.75rem 0.5rem',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#495057'
                      }}>Numer faktury</th>
                      <th style={{ 
                        padding: '0.75rem 0.5rem',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#495057'
                      }}>Data faktury</th>
                      <th style={{ 
                        padding: '0.75rem 0.5rem',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#495057'
                      }}>Dostawca</th>
                      <th style={{ 
                        padding: '0.75rem 0.5rem',
                        textAlign: 'right',
                        fontWeight: '600',
                        color: '#495057'
                      }}>Suma netto</th>
                      <th style={{ 
                        padding: '0.75rem 0.5rem',
                        textAlign: 'right',
                        fontWeight: '600',
                        color: '#495057'
                      }}>Suma brutto</th>
                      <th style={{ 
                        padding: '0.75rem 0.5rem',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#495057'
                      }}>Status</th>
                      <th style={{ 
                        padding: '0.75rem 0.5rem',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#495057'
                      }}>Typ</th>
                      <th style={{ 
                        padding: '0.75rem 0.5rem',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#495057'
                      }}>Pozycje</th>
                      <th style={{ 
                        padding: '0.75rem 0.5rem',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#495057'
                      }}>Mapowanie</th>
                      <th style={{ 
                        padding: '0.75rem 0.5rem',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#495057'
                      }}>Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice, index) => (
                      <tr 
                        key={invoice.id} 
                        style={{ 
                          backgroundColor: selectedInvoices.includes(invoice.id) ? '#e7f1ff' : index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                          borderBottom: '1px solid #e9ecef',
                          transition: 'background-color 0.15s ease-in-out'
                        }}
                        onMouseEnter={(e) => {
                          if (!selectedInvoices.includes(invoice.id)) {
                            e.target.style.backgroundColor = '#f1f3f4';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!selectedInvoices.includes(invoice.id)) {
                            e.target.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
                          }
                        }}
                      >
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <input 
                            type="checkbox"
                            checked={selectedInvoices.includes(invoice.id)}
                            onChange={() => toggleInvoiceSelection(invoice.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <strong style={{ color: '#0d6efd' }}>{invoice.id}</strong>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            {getImportTypeBadge(invoice)}
                            <span style={{ fontWeight: '500' }}>{invoice.numer_faktury || `FZ-${invoice.id}`}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          {invoice.data_faktury ? new Date(invoice.data_faktury).toLocaleDateString('pl-PL') : '-'}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {invoice.nazwa_dostawcy || 'Nieznany dostawca'}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                          <span style={{ fontWeight: '500' }}>
                            {invoice.suma_netto ? `${parseFloat(invoice.suma_netto).toFixed(2)} zł` : '-'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                          <span style={{ fontWeight: '600', color: '#28a745' }}>
                            {invoice.suma_brutto ? `${parseFloat(invoice.suma_brutto).toFixed(2)} zł` : '-'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          {getStatusBadge(invoice.status)}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          {getImportTypeBadge(invoice)}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          <span style={{ 
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#e9ecef',
                            borderRadius: '0.25rem',
                            fontSize: '0.8rem',
                            fontWeight: '500'
                          }}>
                            {invoice.pozycje_count || 0}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          {getMappingStatus(invoice)}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                            <button
                              onClick={() => navigate(`/purchase-invoices/${invoice.id}`)}
                              style={{ 
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.8rem',
                                border: '1px solid #17a2b8',
                                borderRadius: '0.25rem',
                                backgroundColor: '#17a2b8',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                transition: 'all 0.15s ease-in-out'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#138496';
                                e.target.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = '#17a2b8';
                                e.target.style.transform = 'translateY(0)';
                              }}
                              title="Zobacz szczegóły"
                            >
                              <FaEye />
                            </button>
                            <button
                              onClick={() => navigate(`/purchase-invoices/${invoice.id}/edit`)}
                              style={{ 
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.8rem',
                                border: '1px solid #ffc107',
                                borderRadius: '0.25rem',
                                backgroundColor: '#ffc107',
                                color: '#000',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                transition: 'all 0.15s ease-in-out'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#e0a800';
                                e.target.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = '#ffc107';
                                e.target.style.transform = 'translateY(0)';
                              }}
                              title="Edytuj"
                            >
                              <FaEdit />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Paginacja */}
          {pagination.pages > 1 && (
            <div style={{ 
              padding: '1rem',
              borderTop: '1px solid #e9ecef',
              backgroundColor: '#f8f9fa'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <button 
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.has_prev}
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    backgroundColor: !pagination.has_prev ? '#f8f9fa' : 'white',
                    color: !pagination.has_prev ? '#6c757d' : '#495057',
                    cursor: !pagination.has_prev ? 'not-allowed' : 'pointer',
                    opacity: !pagination.has_prev ? 0.6 : 1,
                    transition: 'all 0.15s ease-in-out'
                  }}
                >
                  <FaChevronLeft />
                </button>
                
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  let pageNum;
                  if (pagination.pages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.pages - 2) {
                    pageNum = pagination.pages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  
                  return (
                    <button 
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      style={{
                        padding: '0.375rem 0.75rem',
                        fontSize: '0.875rem',
                        border: '1px solid #ced4da',
                        borderRadius: '0.375rem',
                        backgroundColor: pagination.page === pageNum ? '#0d6efd' : 'white',
                        color: pagination.page === pageNum ? 'white' : '#495057',
                        cursor: 'pointer',
                        fontWeight: pagination.page === pageNum ? '600' : '400',
                        minWidth: '40px',
                        transition: 'all 0.15s ease-in-out'
                      }}
                      onMouseEnter={(e) => {
                        if (pagination.page !== pageNum) {
                          e.target.style.backgroundColor = '#e9ecef';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (pagination.page !== pageNum) {
                          e.target.style.backgroundColor = 'white';
                        }
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button 
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.has_next}
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    backgroundColor: !pagination.has_next ? '#f8f9fa' : 'white',
                    color: !pagination.has_next ? '#6c757d' : '#495057',
                    cursor: !pagination.has_next ? 'not-allowed' : 'pointer',
                    opacity: !pagination.has_next ? 0.6 : 1,
                    transition: 'all 0.15s ease-in-out'
                  }}
                >
                  <FaChevronRight />
                </button>
              </div>
              <div style={{ 
                textAlign: 'center',
                fontSize: '0.8rem',
                color: '#6c757d'
              }}>
                Strona {pagination.page} z {pagination.pages} 
                (łącznie {pagination.total} faktur)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseInvoicesListPage;
