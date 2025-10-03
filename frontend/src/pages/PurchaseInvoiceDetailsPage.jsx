import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft,
  FaFileInvoice,
  FaEdit,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaInfo,
  FaClock,
  FaMapMarkerAlt,
  FaBarcode,
  FaTag,
  FaCalculator,
  FaLink,
  FaUnlink,
  FaSearch,
  FaMagic
} from 'react-icons/fa';

const PurchaseInvoiceDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [mappingItem, setMappingItem] = useState(null);
  const [autoMappingLoading, setAutoMappingLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadInvoiceDetails();
    }
  }, [id]);

  const loadInvoiceDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Ładowanie faktury ID:', id);
      
      const response = await fetch(`http://localhost:5002/api/purchase-invoices/${id}`);
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 Response data:', data);
      
      if (data.success) {
        setInvoice(data.data);
      } else {
        setError(data.message || 'Błąd ładowania faktury');
      }
    } catch (err) {
      console.error('❌ Błąd ładowania faktury:', err);
      setError('Błąd połączenia z serwerem');
    } finally {
      setLoading(false);
    }
  };

  const autoMapInvoiceItems = async () => {
    try {
      setAutoMappingLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:5002/api/purchase-invoices/${id}/auto-map`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Odśwież szczegóły faktury po mapowaniu
        await loadInvoiceDetails();
        
        // Pokaż komunikat o sukcesie
        alert(`Mapowanie zakończone!\nZmapowano po EAN: ${data.data.mapped_by_ean}\nZmapowano po kodzie: ${data.data.mapped_by_code}\nZaktualizowano nazw: ${data.data.updated_names}\nPrzetworzono: ${data.data.total_processed} pozycji`);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Błąd podczas automatycznego mapowania');
      console.error('Błąd auto-mapowania:', err);
    } finally {
      setAutoMappingLoading(false);
    }
  };

  const generateWarehouseReceipt = async () => {
    try {
      setAutoMappingLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:5002/api/warehouse/external-receipt/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`PZ zostało wygenerowane pomyślnie!\nNumer dokumentu: PZ-${id}-${new Date().toISOString().slice(0,10).replace(/-/g,'')}\nID dokumentu: ${data.data.receipt_id}\n\nProdukty zostały dodane do stanu magazynowego.`);
        // Opcjonalnie: przekieruj do strony magazynu lub odśwież dane
      } else {
        alert(`Błąd: ${data.error}`);
      }
    } catch (err) {
      alert('Błąd podczas generowania PZ');
      console.error('Błąd generowania PZ:', err);
    } finally {
      setAutoMappingLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'nowa': { bg: '#cfe2ff', color: '#084298', text: 'Nowa', icon: FaInfo },
      'oczekujaca': { bg: '#fff3cd', color: '#664d03', text: 'Oczekująca', icon: FaClock },
      'weryfikacja': { bg: '#d1ecf1', color: '#0c5460', text: 'Weryfikacja', icon: FaExclamationTriangle },
      'zatwierdzona': { bg: '#d1e7dd', color: '#0a3622', text: 'Zatwierdzona', icon: FaCheck },
      'odrzucona': { bg: '#f8d7da', color: '#721c24', text: 'Odrzucona', icon: FaTimes }
    };
    
    const config = statusConfig[status] || { bg: '#e2e3e5', color: '#41464b', text: status, icon: FaInfo };
    const IconComponent = config.icon;
    
    return (
      <span style={{
        padding: '0.25rem 0.5rem',
        backgroundColor: config.bg,
        color: config.color,
        borderRadius: '0.25rem',
        fontSize: '0.8rem',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem'
      }}>
        <IconComponent style={{ fontSize: '0.75rem' }} />
        {config.text}
      </span>
    );
  };

  const getMappingStatusBadge = (status) => {
    const statusConfig = {
      'zmapowany': { bg: '#d1e7dd', color: '#0a3622', text: 'Zmapowany', icon: FaCheck },
      'niezmapowany': { bg: '#f8d7da', color: '#721c24', text: 'Niezmapowany', icon: FaTimes },
      'wymaga_weryfikacji': { bg: '#fff3cd', color: '#664d03', text: 'Wymaga weryfikacji', icon: FaExclamationTriangle }
    };
    
    const config = statusConfig[status] || { bg: '#e2e3e5', color: '#41464b', text: status, icon: FaInfo };
    const IconComponent = config.icon;
    
    return (
      <span style={{
        padding: '0.25rem 0.5rem',
        backgroundColor: config.bg,
        color: config.color,
        borderRadius: '0.25rem',
        fontSize: '0.8rem',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem'
      }}>
        <IconComponent style={{ fontSize: '0.75rem' }} />
        {config.text}
      </span>
    );
  };

  const handleItemSelection = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAllItems = () => {
    if (!invoice?.items || invoice.items.length === 0) return;
    
    if (selectedItems.length === invoice.items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(invoice.items.map(item => item.id));
    }
  };

  const openMappingModal = (item) => {
    setMappingItem(item);
    setShowMappingModal(true);
  };

  if (loading) {
    return (
      <div style={{ 
        width: '100%', 
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        padding: '1.5rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e9ecef',
          borderTop: '4px solid #0d6efd',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ 
          marginTop: '1rem',
          color: '#6c757d',
          fontSize: '0.875rem'
        }}>
          Ładowanie szczegółów faktury...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        width: '100%', 
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        padding: '1.5rem' 
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{
            padding: '1rem',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '0.375rem',
            color: '#721c24',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            <FaExclamationTriangle />
            {error}
          </div>
          <button 
            onClick={() => navigate('/purchase-invoices/list')}
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
              fontWeight: '500'
            }}
          >
            <FaArrowLeft />
            Powrót do listy
          </button>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{ 
        width: '100%', 
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        padding: '1.5rem' 
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{
            padding: '1rem',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '0.375rem',
            color: '#664d03',
            textAlign: 'center'
          }}>
            Faktura nie została znaleziona
          </div>
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
                Faktura {invoice?.numer_faktury || `FZ-${id}`}
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
                Szczegóły faktury zakupowej
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={() => navigate(`/purchase-invoices/${id}/edit`)}
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
              <FaEdit />
              Edytuj
            </button>
            <button
              onClick={autoMapInvoiceItems}
              disabled={autoMappingLoading}
              style={{ 
                padding: '0.625rem 1.125rem',
                fontSize: '0.875rem',
                border: '1px solid #28a745',
                borderRadius: '0.375rem',
                backgroundColor: autoMappingLoading ? '#a5d6a7' : '#28a745',
                color: '#fff',
                cursor: autoMappingLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '500',
                transition: 'all 0.15s ease-in-out',
                opacity: autoMappingLoading ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!autoMappingLoading) {
                  e.target.style.backgroundColor = '#218838';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 0.25rem 0.5rem rgba(40, 167, 69, 0.25)';
                }
              }}
              onMouseLeave={(e) => {
                if (!autoMappingLoading) {
                  e.target.style.backgroundColor = '#28a745';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }
              }}
            >
              <FaMagic />
              {autoMappingLoading ? 'Mapowanie...' : 'Auto-mapuj'}
            </button>
            <button
              onClick={generateWarehouseReceipt}
              disabled={autoMappingLoading}
              style={{ 
                padding: '0.625rem 1.125rem',
                fontSize: '0.875rem',
                border: '1px solid #007bff',
                borderRadius: '0.375rem',
                backgroundColor: autoMappingLoading ? '#87ceeb' : '#007bff',
                color: '#fff',
                cursor: autoMappingLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '500',
                transition: 'all 0.15s ease-in-out',
                opacity: autoMappingLoading ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!autoMappingLoading) {
                  e.target.style.backgroundColor = '#0056b3';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 0.25rem 0.5rem rgba(0, 123, 255, 0.25)';
                }
              }}
              onMouseLeave={(e) => {
                if (!autoMappingLoading) {
                  e.target.style.backgroundColor = '#007bff';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }
              }}
            >
              <FaCheck />
              Potwierdź przyjęcie
            </button>
            <button
              onClick={() => navigate('/purchase-invoices/list')}
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
              Powrót do listy
            </button>
          </div>
        </div>

        {/* Podstawowe informacje */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '2fr 1fr', 
          gap: '1rem', 
          marginBottom: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e9ecef',
            borderRadius: '0.375rem',
            boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
          }}>
            <div style={{ 
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #e9ecef',
              backgroundColor: '#f8f9fa'
            }}>
              <h6 style={{ 
                margin: 0, 
                color: '#495057', 
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                Dane faktury
              </h6>
            </div>
            <div style={{ padding: '1rem' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '1rem'
              }}>
                <div>
                  <table style={{ 
                    width: '100%', 
                    fontSize: '0.875rem',
                    borderCollapse: 'collapse'
                  }}>
                    <tbody>
                      <tr>
                        <th style={{ 
                          padding: '0.5rem 0',
                          textAlign: 'left',
                          fontWeight: '500',
                          color: '#6c757d',
                          width: '40%'
                        }}>
                          Numer faktury:
                        </th>
                        <td style={{ 
                          padding: '0.5rem 0',
                          fontWeight: '600',
                          color: '#212529'
                        }}>
                          {invoice?.numer_faktury || `FZ-${id}`}
                        </td>
                      </tr>
                      <tr>
                        <th style={{ 
                          padding: '0.5rem 0',
                          textAlign: 'left',
                          fontWeight: '500',
                          color: '#6c757d'
                        }}>
                          Data faktury:
                        </th>
                        <td style={{ 
                          padding: '0.5rem 0',
                          color: '#212529'
                        }}>
                          {invoice?.data_faktury ? new Date(invoice.data_faktury).toLocaleDateString('pl-PL') : '-'}
                        </td>
                      </tr>
                      <tr>
                        <th style={{ 
                          padding: '0.5rem 0',
                          textAlign: 'left',
                          fontWeight: '500',
                          color: '#6c757d'
                        }}>
                          Dostawca:
                        </th>
                        <td style={{ 
                          padding: '0.5rem 0',
                          color: '#212529'
                        }}>
                          {invoice?.nazwa_dostawcy || 'Nieznany dostawca'}
                        </td>
                      </tr>
                      <tr>
                        <th style={{ 
                          padding: '0.5rem 0',
                          textAlign: 'left',
                          fontWeight: '500',
                          color: '#6c757d'
                        }}>
                          NIP dostawcy:
                        </th>
                        <td style={{ 
                          padding: '0.5rem 0',
                          color: '#212529'
                        }}>
                          {invoice?.nip_dostawcy || '-'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <table style={{ 
                    width: '100%', 
                    fontSize: '0.875rem',
                    borderCollapse: 'collapse'
                  }}>
                    <tbody>
                      <tr>
                        <th style={{ 
                          padding: '0.5rem 0',
                          textAlign: 'left',
                          fontWeight: '500',
                          color: '#6c757d',
                          width: '40%'
                        }}>
                          Suma netto:
                        </th>
                        <td style={{ 
                          padding: '0.5rem 0',
                          fontWeight: '600',
                          color: '#0d6efd'
                        }}>
                          {invoice?.suma_netto ? `${parseFloat(invoice.suma_netto).toFixed(2)} zł` : '-'}
                        </td>
                      </tr>
                      <tr>
                        <th style={{ 
                          padding: '0.5rem 0',
                          textAlign: 'left',
                          fontWeight: '500',
                          color: '#6c757d'
                        }}>
                          Suma VAT:
                        </th>
                        <td style={{ 
                          padding: '0.5rem 0',
                          fontWeight: '600',
                          color: '#dc3545'
                        }}>
                          {invoice?.suma_vat ? `${parseFloat(invoice.suma_vat).toFixed(2)} zł` : '-'}
                        </td>
                      </tr>
                      <tr>
                        <th style={{ 
                          padding: '0.5rem 0',
                          textAlign: 'left',
                          fontWeight: '500',
                          color: '#6c757d'
                        }}>
                          Suma brutto:
                        </th>
                        <td style={{ 
                          padding: '0.5rem 0',
                          fontWeight: '700',
                          color: '#28a745',
                          fontSize: '1rem'
                        }}>
                          {invoice?.suma_brutto ? `${parseFloat(invoice.suma_brutto).toFixed(2)} zł` : '-'}
                        </td>
                      </tr>
                      <tr>
                        <th style={{ 
                          padding: '0.5rem 0',
                          textAlign: 'left',
                          fontWeight: '500',
                          color: '#6c757d'
                        }}>
                          Status:
                        </th>
                        <td style={{ 
                          padding: '0.5rem 0'
                        }}>
                          {getStatusBadge(invoice?.status)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Panel statystyk */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e9ecef',
            borderRadius: '0.375rem',
            boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
          }}>
            <div style={{ 
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #e9ecef',
              backgroundColor: '#f8f9fa'
            }}>
              <h6 style={{ 
                margin: 0, 
                color: '#495057', 
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                Statystyki
              </h6>
            </div>
            <div style={{ padding: '1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ fontSize: '0.875rem', color: '#6c757d' }}>Pozycje na fakturze:</span>
                  <span style={{ 
                    fontWeight: '600', 
                    color: '#0d6efd',
                    fontSize: '1.1rem'
                  }}>
                    {invoice?.items?.length || 0}
                  </span>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ fontSize: '0.875rem', color: '#6c757d' }}>Pozycje zmapowane:</span>
                  <span style={{ 
                    fontWeight: '600', 
                    color: '#28a745',
                    fontSize: '1.1rem'
                  }}>
                    {invoice?.items?.filter(p => p.mapped_product_id).length || 0}
                  </span>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem'
                }}>
                  <span style={{ fontSize: '0.875rem', color: '#6c757d' }}>Niezmapowane:</span>
                  <span style={{ 
                    fontWeight: '600', 
                    color: '#dc3545',
                    fontSize: '1.1rem'
                  }}>
                    {invoice?.items?.filter(p => !p.mapped_product_id).length || 0}
                  </span>
                </div>
                
                {invoice?.items?.length > 0 && (
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    borderRadius: '0.375rem',
                    padding: '0.75rem',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ 
                      fontSize: '0.8rem', 
                      color: '#6c757d',
                      marginBottom: '0.5rem'
                    }}>
                      Postęp mapowania:
                    </div>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#e9ecef',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${invoice?.items?.length > 0 ? ((invoice.items.filter(p => p.mapped_product_id).length / invoice.items.length) * 100) : 0}%`,
                        height: '100%',
                        backgroundColor: '#28a745',
                        transition: 'width 0.3s ease'
                      }}></div>
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#6c757d',
                      marginTop: '0.25rem',
                      textAlign: 'center'
                    }}>
                      {invoice?.items?.length > 0 ? Math.round((invoice.items.filter(p => p.mapped_product_id).length / invoice.items.length) * 100) : 0}% zmapowane
                    </div>
                  </div>
                )}
              </div>
              
              <div style={{
                padding: '0.75rem',
                backgroundColor: invoice?.status === 'zatwierdzona' ? '#d1e7dd' : '#fff3cd',
                border: `1px solid ${invoice?.status === 'zatwierdzona' ? '#badbcc' : '#ffeaa7'}`,
                borderRadius: '0.375rem',
                textAlign: 'center'
              }}>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: invoice?.status === 'zatwierdzona' ? '#0a3622' : '#664d03',
                  marginBottom: '0.25rem'
                }}>
                  Status faktury:
                </div>
                {getStatusBadge(invoice?.status)}
              </div>
            </div>
          </div>
        </div>

        {/* Pozycje faktury - używamy stylów inline podobnych do panelu statystyk */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
          marginTop: '1rem'
        }}>
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h6 style={{ 
              margin: 0, 
              color: '#495057', 
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              Pozycje faktury ({invoice?.items?.length || 0})
            </h6>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={handleSelectAllItems}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.8rem',
                  border: '1px solid #0d6efd',
                  borderRadius: '0.25rem',
                  backgroundColor: 'transparent',
                  color: '#0d6efd',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                {selectedItems.length === invoice?.items?.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
              </button>
              <button 
                disabled={selectedItems.length === 0}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.8rem',
                  border: '1px solid #ffc107',
                  borderRadius: '0.25rem',
                  backgroundColor: selectedItems.length === 0 ? '#e9ecef' : '#ffc107',
                  color: selectedItems.length === 0 ? '#6c757d' : '#000',
                  cursor: selectedItems.length === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <FaLink />
                Mapuj zaznaczone ({selectedItems.length})
              </button>
            </div>
          </div>
          <div style={{ padding: '0' }}>
            {!invoice?.items || invoice.items.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                color: '#6c757d'
              }}>
                <FaTag style={{ fontSize: '3rem', marginBottom: '1rem', color: '#dee2e6' }} />
                <p style={{ margin: 0, fontSize: '0.875rem' }}>Brak pozycji na fakturze</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  fontSize: '0.875rem'
                }}>
                  <thead style={{ backgroundColor: '#343a40', color: 'white' }}>
                    <tr>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', width: '50px' }}>
                        <input 
                          type="checkbox"
                          checked={invoice?.items?.length > 0 && selectedItems.length === invoice.items.length}
                          onChange={handleSelectAllItems}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>Lp</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>Nazwa produktu</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>Kod / EAN</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>J.m.</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Ilość</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Cena netto</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>VAT%</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Wartość brutto</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Status mapowania</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>Mapowany produkt</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, index) => (
                      <tr 
                        key={item.id || index} 
                        style={{ 
                          backgroundColor: selectedItems.includes(item.id) ? '#e7f1ff' : (index % 2 === 0 ? '#ffffff' : '#f8f9fa'),
                          borderBottom: '1px solid #dee2e6'
                        }}
                      >
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <input 
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={() => handleItemSelection(item.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{item.lp}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div>
                            <div style={{ fontWeight: '600' }}>{item.nazwa_produktu}</div>
                            {item.opis && (
                              <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.25rem' }}>
                                {item.opis}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div>
                            {item.kod_produktu && (
                              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                                <FaTag style={{ marginRight: '0.25rem', fontSize: '0.75rem' }} />
                                {item.kod_produktu}
                              </div>
                            )}
                            {item.ean && (
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <FaBarcode style={{ marginRight: '0.25rem', fontSize: '0.75rem' }} />
                                {item.ean}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{item.jednostka}</td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>{item.ilosc}</td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                          {item.cena_netto ? `${parseFloat(item.cena_netto).toFixed(2)} zł` : '-'}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>{item.stawka_vat}%</td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: '600' }}>
                          {item.wartosc_brutto ? `${parseFloat(item.wartosc_brutto).toFixed(2)} zł` : '-'}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          {getMappingStatusBadge(item.status_mapowania)}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          {item.mapped_product_id ? (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <FaLink style={{ color: '#28a745', marginRight: '0.5rem' }} />
                              <div>
                                <div style={{ fontSize: '0.8rem' }}>{item.produkt_nazwa}</div>
                                {item.mapping_score && (
                                  <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                                    Podobieństwo: {Math.round(item.mapping_score * 100)}%
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', color: '#6c757d' }}>
                              <FaUnlink style={{ marginRight: '0.5rem' }} />
                              Niezmapowany
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                            <button 
                              onClick={() => openMappingModal(item)}
                              title="Mapuj produkt"
                              style={{
                                padding: '0.25rem 0.5rem',
                                border: '1px solid #0d6efd',
                                borderRadius: '0.25rem',
                                backgroundColor: 'transparent',
                                color: '#0d6efd',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
                            >
                              <FaSearch />
                            </button>
                            <button 
                              onClick={() => navigate(`/purchase-invoices/${invoice.id}/items/${item.id}/edit`)}
                              title="Edytuj pozycję"
                              style={{
                                padding: '0.25rem 0.5rem',
                                border: '1px solid #ffc107',
                                borderRadius: '0.25rem',
                                backgroundColor: 'transparent',
                                color: '#ffc107',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
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
        </div>

        {/* Uwagi */}
        {invoice?.uwagi && (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e9ecef',
            borderRadius: '0.375rem',
            boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
            marginTop: '1rem'
          }}>
            <div style={{ 
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #e9ecef',
              backgroundColor: '#f8f9fa'
            }}>
              <h6 style={{ 
                margin: 0, 
                color: '#495057', 
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                Uwagi
              </h6>
            </div>
            <div style={{ padding: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#212529' }}>
                {invoice.uwagi}
              </p>
            </div>
          </div>
        )}

        {/* Modal mapowania produktu */}
        {showMappingModal && mappingItem && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1050
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.375rem',
              boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e9ecef',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h5 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
                  Mapowanie produktu
                </h5>
                <button 
                  onClick={() => setShowMappingModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#6c757d'
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#d1ecf1',
                  border: '1px solid #bee5eb',
                  borderRadius: '0.375rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                    Pozycja faktury: {mappingItem.nazwa_produktu}
                  </div>
                  {mappingItem.kod_produktu && (
                    <div style={{ fontSize: '0.875rem' }}>Kod: {mappingItem.kod_produktu}</div>
                  )}
                  {mappingItem.ean && (
                    <div style={{ fontSize: '0.875rem' }}>EAN: {mappingItem.ean}</div>
                  )}
                </div>
                <p style={{ color: '#6c757d', fontSize: '0.875rem' }}>
                  Tutaj będzie komponent wyszukiwania i mapowania produktów
                </p>
              </div>
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #e9ecef',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.5rem'
              }}>
                <button 
                  onClick={() => setShowMappingModal(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #6c757d',
                    borderRadius: '0.375rem',
                    backgroundColor: '#f8f9fa',
                    color: '#495057',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Anuluj
                </button>
                <button 
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #0d6efd',
                    borderRadius: '0.375rem',
                    backgroundColor: '#0d6efd',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Zapisz mapowanie
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseInvoiceDetailsPage;
