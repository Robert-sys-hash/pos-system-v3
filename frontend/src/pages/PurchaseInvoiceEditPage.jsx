import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft,
  FaFileInvoice,
  FaSave,
  FaTimes,
  FaExclamationTriangle,
  FaInfo,
  FaClock,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaEuroSign,
  FaUser,
  FaBuilding
} from 'react-icons/fa';

const PurchaseInvoiceEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      loadInvoiceDetails();
    }
  }, [id]);

  const loadInvoiceDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:8000/api/purchase-invoices/${id}`);
      const data = await response.json();
      
      if (data.success) {
        setInvoice(data.data);
        setFormData({
          numer_faktury: data.data.numer_faktury || '',
          data_faktury: data.data.data_faktury || '',
          data_dostawy: data.data.data_dostawy || '',
          data_platnosci: data.data.data_platnosci || '',
          nazwa_dostawcy: data.data.nazwa_dostawcy || '',
          nip_dostawcy: data.data.nip_dostawcy || '',
          adres_dostawcy: data.data.adres_dostawcy || '',
          telefon_dostawcy: data.data.telefon_dostawcy || '',
          email_dostawcy: data.data.email_dostawcy || '',
          nr_zamowienia: data.data.nr_zamowienia || '',
          sposob_platnosci: data.data.sposob_platnosci || '',
          waluta: data.data.waluta || 'PLN',
          status: data.data.status || 'nowa',
          uwagi: data.data.uwagi || ''
        });
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem');
      console.error('Błąd ładowania faktury:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`http://localhost:8000/api/purchase-invoices/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        navigate(`/purchase-invoices/${id}`);
      } else {
        setError(data.message || 'Błąd podczas zapisywania');
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem');
      console.error('Błąd zapisywania faktury:', err);
    } finally {
      setSaving(false);
    }
  };

  const statusOptions = [
    { value: 'nowa', label: 'Nowa' },
    { value: 'oczekujaca', label: 'Oczekująca' },
    { value: 'weryfikacja', label: 'Weryfikacja' },
    { value: 'zatwierdzona', label: 'Zatwierdzona' },
    { value: 'odrzucona', label: 'Odrzucona' }
  ];

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
          Ładowanie faktury do edycji...
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

  return (
    <div style={{ 
      width: '100%', 
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      padding: '1.5rem' 
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Nagłówek */}
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
              backgroundColor: '#fff3cd',
              borderRadius: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #ffc107'
            }}>
              <FaFileInvoice style={{ 
                color: '#ffc107', 
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
                Edycja faktury {invoice?.numer_faktury || `FZ-${id}`}
              </h1>
              <p style={{ 
                margin: '0.25rem 0 0 0', 
                fontSize: '0.875rem', 
                color: '#6c757d',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem'
              }}>
                <i className="fas fa-edit" style={{ fontSize: '0.8rem' }}></i>
                Edycja danych faktury zakupowej
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ 
                padding: '0.625rem 1.125rem',
                fontSize: '0.875rem',
                border: '1px solid #28a745',
                borderRadius: '0.375rem',
                backgroundColor: saving ? '#6c757d' : '#28a745',
                color: 'white',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '500',
                transition: 'all 0.15s ease-in-out'
              }}
            >
              <FaSave />
              {saving ? 'Zapisywanie...' : 'Zapisz'}
            </button>
            <button
              onClick={() => navigate(`/purchase-invoices/${id}`)}
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
            >
              <FaTimes />
              Anuluj
            </button>
          </div>
        </div>

        {/* Formularz edycji */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '2fr 1fr', 
          gap: '1rem'
        }}>
          {/* Główne dane faktury */}
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
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <FaFileInvoice />
                Dane faktury
              </h6>
            </div>
            <div style={{ padding: '1rem' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
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
                    Numer faktury
                  </label>
                  <input
                    type="text"
                    value={formData.numer_faktury || ''}
                    onChange={(e) => handleInputChange('numer_faktury', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem'
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
                    <FaCalendarAlt style={{ marginRight: '0.25rem' }} />
                    Data faktury
                  </label>
                  <input
                    type="date"
                    value={formData.data_faktury || ''}
                    onChange={(e) => handleInputChange('data_faktury', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
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
                    Data dostawy
                  </label>
                  <input
                    type="date"
                    value={formData.data_dostawy || ''}
                    onChange={(e) => handleInputChange('data_dostawy', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem'
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
                    Data płatności
                  </label>
                  <input
                    type="date"
                    value={formData.data_platnosci || ''}
                    onChange={(e) => handleInputChange('data_platnosci', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
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
                    Nr zamówienia
                  </label>
                  <input
                    type="text"
                    value={formData.nr_zamowienia || ''}
                    onChange={(e) => handleInputChange('nr_zamowienia', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem'
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
                    <FaEuroSign style={{ marginRight: '0.25rem' }} />
                    Waluta
                  </label>
                  <select
                    value={formData.waluta || 'PLN'}
                    onChange={(e) => handleInputChange('waluta', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="PLN">PLN</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ 
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#495057'
                }}>
                  Sposób płatności
                </label>
                <input
                  type="text"
                  value={formData.sposob_platnosci || ''}
                  onChange={(e) => handleInputChange('sposob_platnosci', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem'
                  }}
                  placeholder="np. Przelew, Gotówka, Karta"
                />
              </div>
            </div>
          </div>

          {/* Status i uwagi */}
          <div>
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e9ecef',
              borderRadius: '0.375rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
              marginBottom: '1rem'
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
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <FaInfo />
                  Status
                </h6>
              </div>
              <div style={{ padding: '1rem' }}>
                <label style={{ 
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#495057'
                }}>
                  Status faktury
                </label>
                <select
                  value={formData.status || 'nowa'}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem'
                  }}
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
                  Uwagi
                </h6>
              </div>
              <div style={{ padding: '1rem' }}>
                <textarea
                  value={formData.uwagi || ''}
                  onChange={(e) => handleInputChange('uwagi', e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                  placeholder="Dodatkowe uwagi do faktury..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dane dostawcy */}
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
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FaBuilding />
              Dane dostawcy
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '2fr 1fr', 
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
                  Nazwa dostawcy
                </label>
                <input
                  type="text"
                  value={formData.nazwa_dostawcy || ''}
                  onChange={(e) => handleInputChange('nazwa_dostawcy', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem'
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
                  NIP
                </label>
                <input
                  type="text"
                  value={formData.nip_dostawcy || ''}
                  onChange={(e) => handleInputChange('nip_dostawcy', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#495057'
              }}>
                <FaMapMarkerAlt style={{ marginRight: '0.25rem' }} />
                Adres
              </label>
              <input
                type="text"
                value={formData.adres_dostawcy || ''}
                onChange={(e) => handleInputChange('adres_dostawcy', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '1rem'
            }}>
              <div>
                <label style={{ 
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#495057'
                }}>
                  Telefon
                </label>
                <input
                  type="text"
                  value={formData.telefon_dostawcy || ''}
                  onChange={(e) => handleInputChange('telefon_dostawcy', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem'
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
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email_dostawcy || ''}
                  onChange={(e) => handleInputChange('email_dostawcy', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseInvoiceEditPage;
