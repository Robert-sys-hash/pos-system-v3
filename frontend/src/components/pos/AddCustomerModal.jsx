import React, { useState, useEffect } from 'react';
import { customerService } from '../../services/customerService';

function AddCustomerModal({ isOpen, onClose, onSuccess, initialData = {} }) {
  const [customer, setCustomer] = useState({
    typ_klienta: 'osoba_fizyczna',
    imie: '',
    nazwisko: '',
    email: '',
    telefon: '',
    adres: '',
    miasto: '',
    kod_pocztowy: '',
    nip: '',
    nazwa_firmy: '',
    ...initialData
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Aktualizuj dane gdy modal się otwiera z nowymi initialData
  useEffect(() => {
    if (isOpen) {
      setCustomer(prev => ({
        typ_klienta: 'osoba_fizyczna',
        imie: '',
        nazwisko: '',
        email: '',
        telefon: '',
        adres: '',
        miasto: '',
        kod_pocztowy: '',
        nip: '',
        nazwa_firmy: '',
        ...initialData
      }));
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const newCustomer = await customerService.createCustomer(customer);
      onSuccess && onSuccess(newCustomer);
      onClose();
      // Reset form
      setCustomer({
        typ_klienta: 'osoba_fizyczna',
        imie: '',
        nazwisko: '',
        email: '',
        telefon: '',
        adres: '',
        miasto: '',
        kod_pocztowy: '',
        nip: '',
        nazwa_firmy: ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Błąd podczas tworzenia klienta');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setCustomer(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        minWidth: 480,
        maxWidth: 600,
        width: '95vw',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        position: 'relative',
        fontFamily: 'inherit'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'linear-gradient(90deg, #0f766e 0%, #059669 100%)',
          color: 'white',
          padding: '20px 24px',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span style={{ fontSize: 18, fontWeight: 600 }}>Dodaj nowego klienta</span>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              fontSize: 22,
              color: 'white',
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4
            }}
            aria-label="Zamknij"
          >×</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Typ klienta */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#374151' }}>
              Typ klienta
            </label>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="osoba_fizyczna"
                  checked={customer.typ_klienta === 'osoba_fizyczna'}
                  onChange={(e) => handleInputChange('typ_klienta', e.target.value)}
                  style={{ margin: 0 }}
                />
                <span style={{ fontSize: 14 }}>Osoba fizyczna</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="firma"
                  checked={customer.typ_klienta === 'firma'}
                  onChange={(e) => handleInputChange('typ_klienta', e.target.value)}
                  style={{ margin: 0 }}
                />
                <span style={{ fontSize: 14 }}>Firma</span>
              </label>
            </div>
          </div>

          {/* Pola dynamiczne w zależności od typu */}
          {customer.typ_klienta === 'osoba_fizyczna' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: '#374151', fontSize: 14 }}>
                  Imię *
                </label>
                <input
                  type="text"
                  value={customer.imie}
                  onChange={(e) => handleInputChange('imie', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: '#374151', fontSize: 14 }}>
                  Nazwisko *
                </label>
                <input
                  type="text"
                  value={customer.nazwisko}
                  onChange={(e) => handleInputChange('nazwisko', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: '#374151', fontSize: 14 }}>
                Nazwa firmy *
              </label>
              <input
                type="text"
                value={customer.nazwa_firmy}
                onChange={(e) => handleInputChange('nazwa_firmy', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
          )}

          {/* Kontakt */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: '#374151', fontSize: 14 }}>
                Email
              </label>
              <input
                type="email"
                value={customer.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: '#374151', fontSize: 14 }}>
                Telefon
              </label>
              <input
                type="tel"
                value={customer.telefon}
                onChange={(e) => handleInputChange('telefon', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Adres */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: '#374151', fontSize: 14 }}>
              Adres
            </label>
            <input
              type="text"
              value={customer.adres}
              onChange={(e) => handleInputChange('adres', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: '#374151', fontSize: 14 }}>
                Miasto
              </label>
              <input
                type="text"
                value={customer.miasto}
                onChange={(e) => handleInputChange('miasto', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: '#374151', fontSize: 14 }}>
                Kod pocztowy
              </label>
              <input
                type="text"
                value={customer.kod_pocztowy}
                onChange={(e) => handleInputChange('kod_pocztowy', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* NIP dla firm */}
          {customer.typ_klienta === 'firma' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: '#374151', fontSize: 14 }}>
                NIP
              </label>
              <input
                type="text"
                value={customer.nip}
                onChange={(e) => handleInputChange('nip', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <div style={{
              color: '#dc2626',
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              padding: '10px 12px',
              marginBottom: 16,
              fontSize: 14
            }}>
              {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: 6,
                fontWeight: 500,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: loading ? '#9ca3af' : '#0f766e',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'background 0.2s, opacity 0.2s',
              }}
            >
              {loading ? 'Dodawanie...' : 'Dodaj klienta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddCustomerModal;
