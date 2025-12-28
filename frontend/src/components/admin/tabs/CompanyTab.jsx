import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const CompanyTab = () => {
  const [companyData, setCompanyData] = useState({
    nazwa: '',
    adres_ulica: '',
    adres_kod: '',
    adres_miasto: '',
    nip: '',
    regon: '',
    krs: '',
    telefon: '',
    email: '',
    www: '',
    kapital_zakladowy: '',
    prezes: '',
    bank_nazwa: '',
    bank_numer_konta: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/admin/company`);
      const data = await response.json();
      
      console.log('Odpowiedź z API:', data);
      
      if (data.success && data.data.company) {
        console.log('Ustawiam dane firmy:', data.data.company);
        setCompanyData(data.data.company);
      }
    } catch (error) {
      console.error('Błąd ładowania danych firmy:', error);
      setMessage({ type: 'error', text: 'Błąd ładowania danych firmy' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setCompanyData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      
      console.log('Zapisuję dane:', companyData);
      
      const response = await fetch(`${API_BASE}/admin/company`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(companyData)
      });
      
      const data = await response.json();
      
      console.log('Odpowiedź zapisu:', data);
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Dane firmy zostały zapisane' });
        // Odśwież dane po zapisie
        await loadCompanyData();
      } else {
        setMessage({ type: 'error', text: data.message || 'Błąd zapisywania danych' });
      }
    } catch (error) {
      console.error('Błąd zapisywania danych firmy:', error);
      setMessage({ type: 'error', text: 'Błąd zapisywania danych firmy' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Ładowanie danych firmy...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1.5rem' 
      }}>
        <h5 style={{ margin: 0, color: '#333' }}>🏢 Dane Firmy</h5>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: saving ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}
        >
          {saving ? '💾 Zapisywanie...' : '💾 Zapisz'}
        </button>
      </div>

      {message && (
        <div style={{
          padding: '0.75rem',
          marginBottom: '1rem',
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '0.375rem'
        }}>
          {message.text}
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '1.5rem' 
      }}>
        {/* Podstawowe dane firmy */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          padding: '1.5rem'
        }}>
          <h6 style={{ 
            margin: '0 0 1rem 0', 
            fontWeight: '600', 
            color: '#495057',
            fontSize: '1rem' 
          }}>
            📋 Podstawowe informacje
          </h6>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                marginBottom: '0.25rem', 
                display: 'block',
                color: '#495057'
              }}>
                Nazwa firmy *
              </label>
              <input
                type="text"
                value={companyData.nazwa}
                onChange={(e) => handleInputChange('nazwa', e.target.value)}
                placeholder="np. Moja Firma Sp. z o.o."
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                marginBottom: '0.25rem', 
                display: 'block',
                color: '#495057'
              }}>
                Ulica i numer
              </label>
              <input
                type="text"
                value={companyData.adres_ulica}
                onChange={(e) => handleInputChange('adres_ulica', e.target.value)}
                placeholder="ul. Przykładowa 123"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
              <div>
                <label style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  marginBottom: '0.25rem', 
                  display: 'block',
                  color: '#495057'
                }}>
                  Kod pocztowy
                </label>
                <input
                  type="text"
                  value={companyData.adres_kod}
                  onChange={(e) => handleInputChange('adres_kod', e.target.value)}
                  placeholder="00-000"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  marginBottom: '0.25rem', 
                  display: 'block',
                  color: '#495057'
                }}>
                  Miasto
                </label>
                <input
                  type="text"
                  value={companyData.adres_miasto}
                  onChange={(e) => handleInputChange('adres_miasto', e.target.value)}
                  placeholder="Warszawa"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dane prawne */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          padding: '1.5rem'
        }}>
          <h6 style={{ 
            margin: '0 0 1rem 0', 
            fontWeight: '600', 
            color: '#495057',
            fontSize: '1rem' 
          }}>
            ⚖️ Dane prawne
          </h6>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                marginBottom: '0.25rem', 
                display: 'block',
                color: '#495057'
              }}>
                NIP *
              </label>
              <input
                type="text"
                value={companyData.nip}
                onChange={(e) => handleInputChange('nip', e.target.value)}
                placeholder="1234567890"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                marginBottom: '0.25rem', 
                display: 'block',
                color: '#495057'
              }}>
                REGON
              </label>
              <input
                type="text"
                value={companyData.regon}
                onChange={(e) => handleInputChange('regon', e.target.value)}
                placeholder="123456789"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                marginBottom: '0.25rem', 
                display: 'block',
                color: '#495057'
              }}>
                KRS
              </label>
              <input
                type="text"
                value={companyData.krs}
                onChange={(e) => handleInputChange('krs', e.target.value)}
                placeholder="0000123456"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                marginBottom: '0.25rem', 
                display: 'block',
                color: '#495057'
              }}>
                Kapitał zakładowy
              </label>
              <input
                type="text"
                value={companyData.kapital_zakladowy}
                onChange={(e) => handleInputChange('kapital_zakladowy', e.target.value)}
                placeholder="50.000,00 zł"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                marginBottom: '0.25rem', 
                display: 'block',
                color: '#495057'
              }}>
                Prezes/Zarząd
              </label>
              <input
                type="text"
                value={companyData.prezes}
                onChange={(e) => handleInputChange('prezes', e.target.value)}
                placeholder="Jan Kowalski"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* Kontakt */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          padding: '1.5rem'
        }}>
          <h6 style={{ 
            margin: '0 0 1rem 0', 
            fontWeight: '600', 
            color: '#495057',
            fontSize: '1rem' 
          }}>
            📞 Kontakt
          </h6>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                marginBottom: '0.25rem', 
                display: 'block',
                color: '#495057'
              }}>
                Telefon
              </label>
              <input
                type="text"
                value={companyData.telefon}
                onChange={(e) => handleInputChange('telefon', e.target.value)}
                placeholder="+48 22 123 45 67"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                marginBottom: '0.25rem', 
                display: 'block',
                color: '#495057'
              }}>
                Email
              </label>
              <input
                type="email"
                value={companyData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="kontakt@mojafirma.pl"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                marginBottom: '0.25rem', 
                display: 'block',
                color: '#495057'
              }}>
                Strona WWW
              </label>
              <input
                type="url"
                value={companyData.www}
                onChange={(e) => handleInputChange('www', e.target.value)}
                placeholder="www.mojafirma.pl"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* Dane bankowe */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          padding: '1.5rem'
        }}>
          <h6 style={{ 
            margin: '0 0 1rem 0', 
            fontWeight: '600', 
            color: '#495057',
            fontSize: '1rem' 
          }}>
            🏦 Dane bankowe
          </h6>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                marginBottom: '0.25rem', 
                display: 'block',
                color: '#495057'
              }}>
                Nazwa banku
              </label>
              <input
                type="text"
                value={companyData.bank_nazwa}
                onChange={(e) => handleInputChange('bank_nazwa', e.target.value)}
                placeholder="Bank Przykładowy S.A."
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                marginBottom: '0.25rem', 
                display: 'block',
                color: '#495057'
              }}>
                Numer konta
              </label>
              <input
                type="text"
                value={companyData.bank_numer_konta}
                onChange={(e) => handleInputChange('bank_numer_konta', e.target.value)}
                placeholder="PL 12 3456 7890 1234 5678 9012 3456"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '0.375rem',
        fontSize: '0.875rem',
        color: '#6c757d'
      }}>
        <strong>ℹ️ Informacja:</strong> Te dane są używane w generowanych fakturach sprzedaży jako dane sprzedawcy. 
        Pola oznaczone gwiazdką (*) są wymagane do poprawnego wystawienia faktury.
      </div>
    </div>
  );
};

export default CompanyTab;
