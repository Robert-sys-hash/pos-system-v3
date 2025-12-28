import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaFileInvoice, 
  FaUpload, 
  FaList, 
  FaPlus, 
  FaFilePdf, 
  FaFileCode,
  FaTags,
  FaChartBar,
  FaHistory,
  FaCheck,
  FaClock,
  FaExclamationTriangle
} from 'react-icons/fa';

const PurchaseInvoicesPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMenuStats();
  }, []);

  const loadMenuStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/purchase-invoices/menu');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem');
      console.error('Błąd ładowania statystyk:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (type, file) => {
    console.log('🚀 handleFileUpload WYWOŁANA:', { type, file: file?.name });
    
    if (!file) {
      console.log('❌ Brak pliku!');
      return;
    }

    const formData = new FormData();
    const fileKey = type === 'xml' ? 'xml_file' : type === 'pdf' ? 'pdf_file' : 'cennik_file';
    formData.append(fileKey, file);

    try {
      if (type === 'cennik') {
        // Specjalna obsługa dla cennika - dwuetapowy proces
        
        // Krok 1: Parsowanie cennika
        const parseResponse = await fetch('http://localhost:8000/api/purchase-invoices/import-cennik', {
          method: 'POST',
          body: formData
        });

        const parseData = await parseResponse.json();
        
        if (!parseData.success) {
          alert(`Błąd parsowania cennika: ${parseData.message}`);
          return;
        }

        // Debug: sprawdź co zostało sparsowane
        console.log('ParseData:', parseData);
        console.log('Produkty do zapisania:', parseData.data.products);
        console.log('Liczba produktów:', parseData.data.products?.length || 0);

        // Krok 2: Zapisywanie produktów do bazy
        const savePayload = {
          filename: parseData.data.filename,
          products: parseData.data.products
        };
        
        console.log('Payload do zapisania:', savePayload);

        const saveResponse = await fetch('http://localhost:8000/api/purchase-invoices/save-cennik', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(savePayload)
        });

        console.log('Save response status:', saveResponse.status);
        const saveData = await saveResponse.json();
        console.log('Save response data:', saveData);
        
        if (saveData.success) {
          alert(`Import cennika zakończony pomyślnie!\nUtworzono: ${saveData.data.created} produktów\nZaktualizowano: ${saveData.data.updated} produktów`);
          loadMenuStats(); // Odśwież statystyki
        } else {
          alert(`Błąd zapisywania cennika: ${saveData.message}`);
        }
        
      } else {
        // Standardowa obsługa dla XML/PDF faktury
        const endpoint = `http://localhost:8000/api/purchase-invoices/import-${type}`;
          
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        
        if (data.success) {
          alert(`Import ${type.toUpperCase()} zakończony pomyślnie!`);
          loadMenuStats(); // Odśwież statystyki
        } else {
          alert(`Błąd importu: ${data.message}`);
        }
      }
    } catch (err) {
      alert(`Błąd podczas importu: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Ładowanie...</span>
          </div>
          <p className="mt-2">Ładowanie statystyk faktur zakupowych...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger" role="alert">
          <FaExclamationTriangle className="me-2" />
          {error}
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
                Faktury Zakupowe
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
                Import i zarządzanie fakturami zakupowymi
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={() => navigate('/purchase-invoices/list')}
              style={{ 
                padding: '0.625rem 1.125rem',
                fontSize: '0.875rem',
                border: '1px solid #198754',
                borderRadius: '0.375rem',
                backgroundColor: '#d1e7dd',
                color: '#0a3622',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '500',
                transition: 'all 0.15s ease-in-out'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#a3cfbb';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 0.25rem 0.5rem rgba(25, 135, 84, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#d1e7dd';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <FaList />
              Lista Faktur
            </button>
            <button
              onClick={loadMenuStats}
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

        {/* Statystyki - na wzór magazynu */}
        {stats && (
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginBottom: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ 
              flex: '1', 
              minWidth: '200px',
              padding: '1rem',
              backgroundColor: 'white',
              border: '1px solid #e9ecef',
              borderLeft: '4px solid #0d6efd',
              borderRadius: '0.375rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.5rem', 
                    fontWeight: '700',
                    color: '#0d6efd'
                  }}>
                    {stats.invoices?.total || 0}
                  </h3>
                  <p style={{ 
                    margin: '0.25rem 0 0 0', 
                    fontSize: '0.8rem', 
                    color: '#6c757d'
                  }}>
                    Wszystkie faktury
                  </p>
                </div>
                <FaFileInvoice style={{ fontSize: '2rem', color: '#0d6efd', opacity: 0.3 }} />
              </div>
            </div>
            
            <div style={{ 
              flex: '1', 
              minWidth: '200px',
              padding: '1rem',
              backgroundColor: 'white',
              border: '1px solid #e9ecef',
              borderLeft: '4px solid #ffc107',
              borderRadius: '0.375rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.5rem', 
                    fontWeight: '700',
                    color: '#ffc107'
                  }}>
                    {stats.invoices?.pending || 0}
                  </h3>
                  <p style={{ 
                    margin: '0.25rem 0 0 0', 
                    fontSize: '0.8rem', 
                    color: '#6c757d'
                  }}>
                    Oczekujące
                  </p>
                </div>
                <FaClock style={{ fontSize: '2rem', color: '#ffc107', opacity: 0.3 }} />
              </div>
            </div>

            <div style={{ 
              flex: '1', 
              minWidth: '200px',
              padding: '1rem',
              backgroundColor: 'white',
              border: '1px solid #e9ecef',
              borderLeft: '4px solid #28a745',
              borderRadius: '0.375rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.5rem', 
                    fontWeight: '700',
                    color: '#28a745'
                  }}>
                    {(stats.invoices?.approved_value || 0).toLocaleString('pl-PL')} zł
                  </h3>
                  <p style={{ 
                    margin: '0.25rem 0 0 0', 
                    fontSize: '0.8rem', 
                    color: '#6c757d'
                  }}>
                    Wartość zatwierdzona
                  </p>
                </div>
                <FaCheck style={{ fontSize: '2rem', color: '#28a745', opacity: 0.3 }} />
              </div>
            </div>

            <div style={{ 
              flex: '1', 
              minWidth: '200px',
              padding: '1rem',
              backgroundColor: 'white',
              border: '1px solid #e9ecef',
              borderLeft: '4px solid #17a2b8',
              borderRadius: '0.375rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.5rem', 
                    fontWeight: '700',
                    color: '#17a2b8'
                  }}>
                    {stats.suppliers?.active || 0}
                  </h3>
                  <p style={{ 
                    margin: '0.25rem 0 0 0', 
                    fontSize: '0.8rem', 
                    color: '#6c757d'
                  }}>
                    Dostawcy
                  </p>
                </div>
                <FaChartBar style={{ fontSize: '2rem', color: '#17a2b8', opacity: 0.3 }} />
              </div>
            </div>
          </div>
        )}

        {/* Menu główne - na wzór magazynu */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '1rem', 
          marginBottom: '1rem'
        }}>
          {/* Import faktury XML */}
          <div style={{ 
            backgroundColor: 'white',
            border: '1px solid #e9ecef',
            borderRadius: '0.375rem',
            boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '0.75rem 1rem',
              backgroundColor: '#d1e7dd',
              borderBottom: '1px solid #e9ecef',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FaFileCode style={{ color: '#0a3622' }} />
              <h6 style={{ 
                margin: 0, 
                color: '#0a3622', 
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                Import faktury XML
              </h6>
            </div>
            <div style={{ padding: '1rem' }}>
              <p style={{ 
                margin: '0 0 1rem 0', 
                fontSize: '0.875rem', 
                color: '#6c757d'
              }}>
                Zaimportuj fakturę z pliku XML
              </p>
              <input 
                type="file" 
                accept=".xml"
                onChange={(e) => handleFileUpload('xml', e.target.files[0])}
                style={{
                  width: '100%',
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem',
                  marginBottom: '0.5rem'
                }}
              />
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#6c757d'
              }}>
                Formaty: UBL, eFaktura, Optima XML
              </div>
            </div>
          </div>

          {/* Import faktury PDF */}
          <div style={{ 
            backgroundColor: 'white',
            border: '1px solid #e9ecef',
            borderRadius: '0.375rem',
            boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '0.75rem 1rem',
              backgroundColor: '#f8d7da',
              borderBottom: '1px solid #e9ecef',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FaFilePdf style={{ color: '#721c24' }} />
              <h6 style={{ 
                margin: 0, 
                color: '#721c24', 
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                Import faktury PDF
              </h6>
            </div>
            <div style={{ padding: '1rem' }}>
              <p style={{ 
                margin: '0 0 1rem 0', 
                fontSize: '0.875rem', 
                color: '#6c757d'
              }}>
                Zaimportuj fakturę z pliku PDF
              </p>
              <input 
                type="file" 
                accept=".pdf"
                onChange={(e) => handleFileUpload('pdf', e.target.files[0])}
                style={{
                  width: '100%',
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem',
                  marginBottom: '0.5rem'
                }}
              />
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#6c757d'
              }}>
                Automatyczne parsowanie PDF
              </div>
            </div>
          </div>

          {/* Dodaj ręcznie */}
          <div style={{ 
            backgroundColor: 'white',
            border: '1px solid #e9ecef',
            borderRadius: '0.375rem',
            boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '0.75rem 1rem',
              backgroundColor: '#fff3cd',
              borderBottom: '1px solid #e9ecef',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FaPlus style={{ color: '#664d03' }} />
              <h6 style={{ 
                margin: 0, 
                color: '#664d03', 
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                Dodaj ręcznie
              </h6>
            </div>
            <div style={{ padding: '1rem' }}>
              <p style={{ 
                margin: '0 0 1rem 0', 
                fontSize: '0.875rem', 
                color: '#6c757d'
              }}>
                Wprowadź fakturę zakupu ręcznie
              </p>
              <button 
                onClick={() => navigate('/purchase-invoices/new')}
                style={{ 
                  padding: '0.625rem 1.125rem',
                  fontSize: '0.875rem',
                  border: '1px solid #ffc107',
                  borderRadius: '0.375rem',
                  backgroundColor: '#ffc107',
                  color: '#000',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: '500',
                  width: '100%',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease-in-out'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#e0a800';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 0.25rem 0.5rem rgba(255, 193, 7, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#ffc107';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <FaPlus />
                Nowa faktura
              </button>
            </div>
          </div>
        </div>

        {/* Druga sekcja menu */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '1rem', 
          marginBottom: '1rem'
        }}>
          {/* Zarządzanie */}
          <div style={{ 
            backgroundColor: 'white',
            border: '1px solid #e9ecef',
            borderRadius: '0.375rem',
            boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '0.75rem 1rem',
              backgroundColor: '#cfe2ff',
              borderBottom: '1px solid #e9ecef',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FaList style={{ color: '#084298' }} />
              <h6 style={{ 
                margin: 0, 
                color: '#084298', 
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                Zarządzanie
              </h6>
            </div>
            <div style={{ padding: '1rem' }}>
              <p style={{ 
                margin: '0 0 1rem 0', 
                fontSize: '0.875rem', 
                color: '#6c757d'
              }}>
                Przeglądaj i zarządzaj fakturami
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <button 
                  onClick={() => navigate('/purchase-invoices/list')}
                  style={{ 
                    padding: '0.5rem 0.875rem',
                    fontSize: '0.8rem',
                    border: '1px solid #0d6efd',
                    borderRadius: '0.375rem',
                    backgroundColor: '#0d6efd',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    fontWeight: '500',
                    flex: 1,
                    justifyContent: 'center',
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
                  <FaList />
                  Lista faktur
                </button>
              </div>
              <button 
                disabled
                style={{ 
                  padding: '0.5rem 0.875rem',
                  fontSize: '0.8rem',
                  border: '1px solid #6c757d',
                  borderRadius: '0.375rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  cursor: 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontWeight: '500',
                  width: '100%',
                  justifyContent: 'center',
                  opacity: 0.6
                }}
              >
                <FaChartBar />
                Raporty
              </button>
            </div>
          </div>

          {/* Import cennika */}
          <div style={{ 
            backgroundColor: 'white',
            border: '1px solid #e9ecef',
            borderRadius: '0.375rem',
            boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '0.75rem 1rem',
              backgroundColor: '#d3d3d4',
              borderBottom: '1px solid #e9ecef',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FaTags style={{ color: '#41464b' }} />
              <h6 style={{ 
                margin: 0, 
                color: '#41464b', 
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                Import cennika
              </h6>
            </div>
            <div style={{ padding: '1rem' }}>
              <p style={{ 
                margin: '0 0 1rem 0', 
                fontSize: '0.875rem', 
                color: '#6c757d'
              }}>
                Zaimportuj lub zaktualizuj cennik produktów (XML)
              </p>
              <input 
                type="file" 
                accept=".xml"
                onChange={(e) => handleFileUpload('cennik', e.target.files[0])}
                style={{
                  width: '100%',
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem',
                  marginBottom: '0.75rem'
                }}
              />
              <button 
                onClick={() => navigate('/purchase-invoices/cennik-history')}
                style={{ 
                  padding: '0.5rem',
                  fontSize: '0.8rem',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#0d6efd',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  textDecoration: 'underline'
                }}
              >
                <FaHistory />
                Historia importów
              </button>
            </div>
          </div>

          {/* Statystyki cennika */}
          <div style={{ 
            backgroundColor: 'white',
            border: '1px solid #e9ecef',
            borderRadius: '0.375rem',
            boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '0.75rem 1rem',
              backgroundColor: '#ced4da',
              borderBottom: '1px solid #e9ecef',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FaChartBar style={{ color: '#495057' }} />
              <h6 style={{ 
                margin: 0, 
                color: '#495057', 
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                Ostatnie importy cennika
              </h6>
            </div>
            <div style={{ padding: '1rem' }}>
              {stats?.cennik ? (
                <div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem'
                  }}>
                    <span style={{ color: '#6c757d' }}>Importy (30 dni):</span>
                    <strong style={{ color: '#212529' }}>{stats.cennik.recent_imports}</strong>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem'
                  }}>
                    <span style={{ color: '#6c757d' }}>Produkty utworzone:</span>
                    <strong style={{ color: '#212529' }}>{stats.cennik.products_created}</strong>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    fontSize: '0.875rem'
                  }}>
                    <span style={{ color: '#6c757d' }}>Produkty zaktualizowane:</span>
                    <strong style={{ color: '#212529' }}>{stats.cennik.products_updated}</strong>
                  </div>
                </div>
              ) : (
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.875rem', 
                  color: '#6c757d', 
                  fontStyle: 'italic'
                }}>
                  Brak danych
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Instrukcje */}
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
              <i className="fas fa-info-circle me-2" style={{ color: '#6c757d' }}></i>
              Instrukcje obsługi
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '1.5rem'
            }}>
              <div>
                <h6 style={{ 
                  margin: '0 0 0.75rem 0', 
                  fontSize: '0.9rem', 
                  fontWeight: '600',
                  color: '#0d6efd'
                }}>
                  Import faktury XML:
                </h6>
                <ul style={{ 
                  margin: 0, 
                  paddingLeft: '1.25rem', 
                  fontSize: '0.8rem', 
                  color: '#6c757d', 
                  lineHeight: 1.5
                }}>
                  <li>Obsługiwane formaty: UBL Invoice, eFaktura, Optima XML</li>
                  <li>Automatyczne mapowanie produktów z bazy</li>
                  <li>Weryfikacja dostawców i tworzenie nowych</li>
                  <li>Kontrola poprawności sum i stawek VAT</li>
                </ul>
                
                <h6 style={{ 
                  margin: '1rem 0 0.75rem 0', 
                  fontSize: '0.9rem', 
                  fontWeight: '600',
                  color: '#dc3545'
                }}>
                  Import faktury PDF:
                </h6>
                <ul style={{ 
                  margin: 0, 
                  paddingLeft: '1.25rem', 
                  fontSize: '0.8rem', 
                  color: '#6c757d', 
                  lineHeight: 1.5
                }}>
                  <li>Automatyczne rozpoznawanie tekstu (OCR)</li>
                  <li>Parsowanie struktury faktury</li>
                  <li>Wymaga ręcznej weryfikacji pozycji</li>
                </ul>
              </div>
              <div>
                <h6 style={{ 
                  margin: '0 0 0.75rem 0', 
                  fontSize: '0.9rem', 
                  fontWeight: '600',
                  color: '#6c757d'
                }}>
                  Import cennika XML:
                </h6>
                <ul style={{ 
                  margin: 0, 
                  paddingLeft: '1.25rem', 
                  fontSize: '0.8rem', 
                  color: '#6c757d', 
                  lineHeight: 1.5
                }}>
                  <li>Aktualizacja cen produktów w systemie</li>
                  <li>Tworzenie nowych produktów z cennika</li>
                  <li>Historia wszystkich importów</li>
                  <li>Kontrola zmian cen</li>
                </ul>
                
                <h6 style={{ 
                  margin: '1rem 0 0.75rem 0', 
                  fontSize: '0.9rem', 
                  fontWeight: '600',
                  color: '#0d6efd'
                }}>
                  Zarządzanie fakturami:
                </h6>
                <ul style={{ 
                  margin: 0, 
                  paddingLeft: '1.25rem', 
                  fontSize: '0.8rem', 
                  color: '#6c757d', 
                  lineHeight: 1.5
                }}>
                  <li>Lista wszystkich faktur z filtrowaniem</li>
                  <li>Szczegóły faktury z pozycjami</li>
                  <li>Mapowanie produktów</li>
                  <li>Statusy: nowa, weryfikacja, zatwierdzona</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseInvoicesPage;
