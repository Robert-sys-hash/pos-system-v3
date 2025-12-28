import React, { useState, useEffect } from 'react';
import { kasaBankService } from '../../services/kasaBankService';

function AddOperationModal({ isOpen, onClose, onSuccess, operationType = 'KP', locationId = null }) {
  const [formData, setFormData] = useState({
    typ_operacji: operationType,
    typ_platnosci: 'gotowka',
    kwota: '',
    opis: '',
    kategoria: 'inne',
    numer_dokumentu: '',
    kontrahent: '',
    data_operacji: new Date().toISOString().split('T')[0],
    uwagi: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [kategorie, setKategorie] = useState([]);

  // Opcje typów płatności
  const paymentTypes = [
    { value: 'gotowka', label: 'Gotówka', icon: 'fas fa-money-bill' },
    { value: 'karta', label: 'Karta', icon: 'fas fa-credit-card' },
    { value: 'blik', label: 'BLIK', icon: 'fas fa-mobile-alt' },
    { value: 'przelew', label: 'Przelew', icon: 'fas fa-university' },
    { value: 'kupon', label: 'Kupon', icon: 'fas fa-ticket-alt' }
  ];

  // Kategorie dla różnych typów operacji
  const kategorieKP = [
    { value: 'sprzedaz', label: 'Sprzedaż' },
    { value: 'zwrot', label: 'Zwrot' },
    { value: 'kupony', label: 'Kupony' },
    { value: 'inne_przychody', label: 'Inne przychody' },
    { value: 'inne', label: 'Inne' }
  ];

  const kategorieKW = [
    { value: 'zakupy', label: 'Zakupy' },
    { value: 'materialy', label: 'Materiały biurowe' },
    { value: 'dostawa', label: 'Dostawa' },
    { value: 'oplaty', label: 'Opłaty' },
    { value: 'wynagrodzenia', label: 'Wynagrodzenia' },
    { value: 'inne_wydatki', label: 'Inne wydatki' },
    { value: 'inne', label: 'Inne' }
  ];

  // Zamknięcie ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset formularza przy otwarciu
  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        typ_operacji: operationType,
        data_operacji: new Date().toISOString().split('T')[0]
      }));
      setError('');
    }
  }, [isOpen, operationType]);

  if (!isOpen) return null;

  const getCurrentKategorie = () => {
    return formData.typ_operacji === 'KP' ? kategorieKP : kategorieKW;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Walidacja
      if (!formData.kwota || parseFloat(formData.kwota) <= 0) {
        throw new Error('Kwota musi być większa od 0');
      }

      if (!formData.opis.trim()) {
        throw new Error('Opis jest wymagany');
      }

      const operacjaData = {
        ...formData,
        kwota: parseFloat(formData.kwota),
        location_id: locationId
      };

      await kasaBankService.createOperacja(operacjaData);
      
      onSuccess && onSuccess();
      onClose();
      
      // Reset formularza
      setFormData({
        typ_operacji: operationType,
        typ_platnosci: 'gotowka',
        kwota: '',
        opis: '',
        kategoria: 'inne',
        numer_dokumentu: '',
        kontrahent: '',
        data_operacji: new Date().toISOString().split('T')[0],
        uwagi: ''
      });
    } catch (err) {
      setError(err.message || 'Błąd podczas dodawania operacji');
    } finally {
      setLoading(false);
    }
  };

  const isKP = formData.typ_operacji === 'KP';

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
      zIndex: 1000
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '0.5rem',
        minWidth: '500px',
        maxWidth: '600px',
        width: '95vw',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }}>
        {/* Nagłówek */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.5rem',
          borderBottom: '1px solid #e9ecef',
          background: isKP ? '#d4edda' : '#f8d7da'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <i className={`fas ${isKP ? 'fa-plus-circle' : 'fa-minus-circle'}`} 
               style={{ 
                 color: isKP ? '#28a745' : '#dc3545', 
                 fontSize: '1.5rem' 
               }}></i>
            <h3 style={{ 
              margin: 0, 
              fontSize: '1.25rem', 
              fontWeight: '600',
              color: isKP ? '#155724' : '#721c24'
            }}>
              {isKP ? 'Dodaj wpływ (KP)' : 'Dodaj wydatek (KW)'}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              color: '#6c757d',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >×</button>
        </div>

        {/* Formularz */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            {/* Typ operacji */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '500',
                color: '#374151'
              }}>
                Typ operacji
              </label>
              <select
                value={formData.typ_operacji}
                onChange={(e) => handleChange('typ_operacji', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem'
                }}
              >
                <option value="KP">KP - Kasa Przyjmie (Wpływ)</option>
                <option value="KW">KW - Kasa Wydaje (Wydatek)</option>
              </select>
            </div>

            {/* Typ płatności */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '500',
                color: '#374151'
              }}>
                Typ płatności
              </label>
              <select
                value={formData.typ_platnosci}
                onChange={(e) => handleChange('typ_platnosci', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem'
                }}
              >
                {paymentTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            {/* Kwota */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '500',
                color: '#374151'
              }}>
                Kwota (zł) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.kwota}
                onChange={(e) => handleChange('kwota', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem'
                }}
                required
              />
            </div>

            {/* Data operacji */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '500',
                color: '#374151'
              }}>
                Data operacji
              </label>
              <input
                type="date"
                value={formData.data_operacji}
                onChange={(e) => handleChange('data_operacji', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>

          {/* Opis */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '500',
              color: '#374151'
            }}>
              Opis operacji *
            </label>
            <input
              type="text"
              value={formData.opis}
              onChange={(e) => handleChange('opis', e.target.value)}
              placeholder={isKP ? 'np. Sprzedaż produktów' : 'np. Zakup materiałów biurowych'}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '1rem'
              }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            {/* Kategoria */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '500',
                color: '#374151'
              }}>
                Kategoria
              </label>
              <select
                value={formData.kategoria}
                onChange={(e) => handleChange('kategoria', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem'
                }}
              >
                {getCurrentKategorie().map(kat => (
                  <option key={kat.value} value={kat.value}>
                    {kat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Numer dokumentu */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '500',
                color: '#374151'
              }}>
                Nr dokumentu
              </label>
              <input
                type="text"
                value={formData.numer_dokumentu}
                onChange={(e) => handleChange('numer_dokumentu', e.target.value)}
                placeholder="np. FV001/2025"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>

          {/* Kontrahent */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '500',
              color: '#374151'
            }}>
              Kontrahent
            </label>
            <input
              type="text"
              value={formData.kontrahent}
              onChange={(e) => handleChange('kontrahent', e.target.value)}
              placeholder={isKP ? 'np. Jan Kowalski' : 'np. Firma XYZ Sp. z o.o.'}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '1rem'
              }}
            />
          </div>

          {/* Uwagi */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '500',
              color: '#374151'
            }}>
              Uwagi
            </label>
            <textarea
              value={formData.uwagi}
              onChange={(e) => handleChange('uwagi', e.target.value)}
              rows="3"
              placeholder="Dodatkowe informacje..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '1rem',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Błąd */}
          {error && (
            <div style={{
              color: '#dc3545',
              background: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '0.375rem',
              padding: '0.75rem',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              <i className="fas fa-exclamation-circle" style={{ marginRight: '0.5rem' }}></i>
              {error}
            </div>
          )}

          {/* Przyciski */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#f8f9fa',
                color: '#6c757d',
                border: '1px solid #dee2e6',
                borderRadius: '0.375rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                background: loading ? '#a5b4fc' : (isKP ? '#28a745' : '#dc3545'),
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Zapisywanie...' : (isKP ? 'Dodaj wpływ' : 'Dodaj wydatek')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddOperationModal;
