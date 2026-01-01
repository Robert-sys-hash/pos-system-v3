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

  useEffect(() => {
    if (isOpen) {
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
        nazwa_firmy: '',
        ...initialData
      });
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
    setCustomer(prev => ({ ...prev, [field]: value }));
  };

  const inputStyle = {
    width: '100%',
    padding: '6px 8px',
    border: '1px solid #ced4da',
    borderRadius: '3px',
    fontSize: '12px',
    height: '30px',
    boxSizing: 'border-box',
    outline: 'none'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    fontWeight: '500',
    color: '#6c757d',
    marginBottom: '3px'
  };

  return (
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
      zIndex: 1050,
      overflow: 'auto'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '0.375rem',
        width: '450px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        fontSize: '12px'
      }}>
        {/* Header */}
        <div style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)',
          color: 'white',
          borderRadius: '0.375rem 0.375rem 0 0'
        }}>
          <span style={{ fontSize: '1.1rem' }}>👤</span>
          <div style={{ flex: 1 }}>
            <h5 style={{ margin: 0, fontWeight: '600', fontSize: '13px' }}>
              Dodaj nowego klienta
            </h5>
            <p style={{ margin: 0, fontSize: '10px', opacity: 0.9 }}>
              Szybkie dodawanie klienta
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
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
        <form onSubmit={handleSubmit} style={{ padding: '1rem' }}>
          {/* Typ klienta */}
          <div style={{ 
            marginBottom: '0.75rem',
            padding: '0.5rem',
            background: '#f8f9fa',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <span style={{ fontSize: '11px', fontWeight: '500', color: '#6c757d' }}>Typ:</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '11px' }}>
              <input
                type="radio"
                value="osoba_fizyczna"
                checked={customer.typ_klienta === 'osoba_fizyczna'}
                onChange={(e) => handleInputChange('typ_klienta', e.target.value)}
                style={{ margin: 0, width: '14px', height: '14px' }}
              />
              Osoba fizyczna
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '11px' }}>
              <input
                type="radio"
                value="firma"
                checked={customer.typ_klienta === 'firma'}
                onChange={(e) => handleInputChange('typ_klienta', e.target.value)}
                style={{ margin: 0, width: '14px', height: '14px' }}
              />
              Firma
            </label>
          </div>

          {/* Pola w zależności od typu */}
          {customer.typ_klienta === 'osoba_fizyczna' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div>
                <label style={labelStyle}>Imię *</label>
                <input
                  type="text"
                  value={customer.imie}
                  onChange={(e) => handleInputChange('imie', e.target.value)}
                  style={inputStyle}
                  required
                  placeholder="Jan"
                />
              </div>
              <div>
                <label style={labelStyle}>Nazwisko *</label>
                <input
                  type="text"
                  value={customer.nazwisko}
                  onChange={(e) => handleInputChange('nazwisko', e.target.value)}
                  style={inputStyle}
                  required
                  placeholder="Kowalski"
                />
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={labelStyle}>Nazwa firmy *</label>
              <input
                type="text"
                value={customer.nazwa_firmy}
                onChange={(e) => handleInputChange('nazwa_firmy', e.target.value)}
                style={inputStyle}
                required
                placeholder="Firma Sp. z o.o."
              />
            </div>
          )}

          {/* Kontakt */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div>
              <label style={labelStyle}>📞 Telefon</label>
              <input
                type="tel"
                value={customer.telefon}
                onChange={(e) => handleInputChange('telefon', e.target.value)}
                style={inputStyle}
                placeholder="600 123 456"
              />
            </div>
            <div>
              <label style={labelStyle}>📧 Email</label>
              <input
                type="email"
                value={customer.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                style={inputStyle}
                placeholder="jan@example.com"
              />
            </div>
          </div>

          {/* Adres - zwinięty */}
          <details style={{ marginBottom: '0.5rem' }}>
            <summary style={{ 
              fontSize: '11px', 
              color: '#6c757d', 
              cursor: 'pointer',
              padding: '0.25rem 0',
              fontWeight: '500'
            }}>
              📍 Dane adresowe (opcjonalne)
            </summary>
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={labelStyle}>Adres</label>
                <input
                  type="text"
                  value={customer.adres}
                  onChange={(e) => handleInputChange('adres', e.target.value)}
                  style={inputStyle}
                  placeholder="ul. Przykładowa 1/2"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={labelStyle}>Miasto</label>
                  <input
                    type="text"
                    value={customer.miasto}
                    onChange={(e) => handleInputChange('miasto', e.target.value)}
                    style={inputStyle}
                    placeholder="Warszawa"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Kod pocztowy</label>
                  <input
                    type="text"
                    value={customer.kod_pocztowy}
                    onChange={(e) => handleInputChange('kod_pocztowy', e.target.value)}
                    style={inputStyle}
                    placeholder="00-000"
                  />
                </div>
              </div>
            </div>
          </details>

          {/* NIP dla firm */}
          {customer.typ_klienta === 'firma' && (
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={labelStyle}>🏢 NIP</label>
              <input
                type="text"
                value={customer.nip}
                onChange={(e) => handleInputChange('nip', e.target.value)}
                style={inputStyle}
                placeholder="1234567890"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: '#f8d7da',
              color: '#721c24',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              padding: '0.5rem',
              marginBottom: '0.5rem',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Footer */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '0.5rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid #e9ecef',
            marginTop: '0.75rem'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                background: '#f8f9fa',
                color: '#495057',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontWeight: '500',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.5rem 1rem',
                background: loading ? '#6c757d' : '#0d6efd',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: '600',
                fontSize: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              {loading ? '⏳ Dodawanie...' : '✓ Dodaj klienta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddCustomerModal;
