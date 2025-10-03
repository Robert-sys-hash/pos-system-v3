import React, { useState, useEffect } from 'react';
import { kasaBankService } from '../../services/kasaBankService';

function EditOperationModal({ isOpen, onClose, onSuccess, operation }) {
  const [formData, setFormData] = useState({
    typ_operacji: '',
    typ_platnosci: '',
    kwota: '',
    opis: '',
    kategoria: '',
    numer_dokumentu: '',
    kontrahent: '',
    data_operacji: '',
    uwagi: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  // Załaduj dane operacji do formularza
  useEffect(() => {
    if (operation && isOpen) {
      setFormData({
        typ_operacji: operation.typ_operacji || '',
        typ_platnosci: operation.typ_platnosci || '',
        kwota: operation.kwota?.toString() || '',
        opis: operation.opis || '',
        kategoria: operation.kategoria || '',
        numer_dokumentu: operation.numer_dokumentu || '',
        kontrahent: operation.kontrahent || '',
        data_operacji: operation.data_operacji ? operation.data_operacji.split('T')[0] : '',
        uwagi: operation.uwagi || ''
      });
      setError('');
    }
  }, [operation, isOpen]);

  // Zamknięcie ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !operation) return null;

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
      if (!formData.typ_platnosci) {
        throw new Error('Typ płatności jest wymagany');
      }
      if (!formData.kwota || parseFloat(formData.kwota) <= 0) {
        throw new Error('Kwota musi być większa od 0');
      }
      if (!formData.opis.trim()) {
        throw new Error('Opis jest wymagany');
      }

      // Przygotuj dane do wysłania
      const updateData = {
        typ_operacji: formData.typ_operacji,
        typ_platnosci: formData.typ_platnosci,
        kwota: parseFloat(formData.kwota),
        opis: formData.opis.trim(),
        kategoria: formData.kategoria,
        numer_dokumentu: formData.numer_dokumentu.trim(),
        kontrahent: formData.kontrahent.trim(),
        data_operacji: formData.data_operacji,
        uwagi: formData.uwagi.trim()
      };

      await kasaBankService.updateOperacja(operation.id, updateData);
      
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      console.error('Błąd podczas edycji operacji:', err);
      setError(err.message || 'Błąd podczas edycji operacji');
    } finally {
      setLoading(false);
    }
  };

  const isKP = formData.typ_operacji === 'KP';
  const currentKategorie = isKP ? kategorieKP : kategorieKW;

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
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '0.5rem',
        minWidth: '600px',
        maxWidth: '800px',
        width: '95vw',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.5rem',
          borderBottom: '1px solid #e9ecef',
          background: '#f8f9fa'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              backgroundColor: '#e7f1ff',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-edit" style={{ color: '#0d6efd', fontSize: '1rem' }}></i>
            </div>
            <div>
              <h4 style={{ margin: 0, fontWeight: '600', color: '#212529' }}>
                Edytuj operację
              </h4>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6c757d' }}>
                Zmień typ płatności lub inne dane operacji
              </p>
            </div>
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
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {/* Typ operacji (tylko do odczytu) */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '500',
              color: '#374151'
            }}>
              Typ operacji
            </label>
            <div style={{
              padding: '0.75rem',
              background: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '0.375rem',
              color: '#6c757d',
              fontSize: '1rem'
            }}>
              {isKP ? 'KP - Kasa Przyjmie (Wpływ)' : 'KW - Kasa Wydaje (Wydatek)'}
            </div>
          </div>

          {/* Typ płatności */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '500',
              color: '#374151'
            }}>
              Typ płatności *
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
              required
            >
              <option value="">-- Wybierz typ płatności --</option>
              {paymentTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Kwota i Data */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
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
                placeholder="0.00"
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
              Opis *
            </label>
            <input
              type="text"
              value={formData.opis}
              onChange={(e) => handleChange('opis', e.target.value)}
              placeholder="Opis operacji"
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

          {/* Kategoria i Numer dokumentu */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
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
                <option value="">-- Wybierz kategorię --</option>
                {currentKategorie.map(kat => (
                  <option key={kat.value} value={kat.value}>
                    {kat.label}
                  </option>
                ))}
              </select>
            </div>

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
                background: loading ? '#a5b4fc' : '#0d6efd',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditOperationModal;
