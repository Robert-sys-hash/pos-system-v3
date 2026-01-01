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
      zIndex: 1050,
      overflow: 'auto'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '0.375rem',
        width: '500px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        fontSize: '12px'
      }}>
        {/* Header - styl jak w modalu zamknięcia zmiany */}
        <div style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          backgroundColor: '#0d6efd',
          color: 'white',
          borderRadius: '0.375rem 0.375rem 0 0'
        }}>
          <span style={{ fontSize: '1.1rem' }}>✏️</span>
          <div style={{ flex: 1 }}>
            <h5 style={{ margin: 0, fontWeight: '600', fontSize: '13px' }}>
              Edytuj operację
            </h5>
            <p style={{ margin: 0, fontSize: '10px', opacity: 0.9 }}>
              Zmień dane operacji {isKP ? 'KP' : 'KW'}
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

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1rem' }}>
          
          {/* Sekcja główna */}
          <div style={{ 
            marginBottom: '0.75rem', 
            padding: '0.75rem', 
            background: '#f8f9fa', 
            borderRadius: '5px',
            border: '1px solid #dee2e6'
          }}>
            <h6 style={{ margin: '0 0 0.75rem 0', fontWeight: '600', color: '#495057', fontSize: '12px' }}>
              💰 Dane operacji
            </h6>

            {/* Typ operacji (tylko do odczytu) */}
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: '500',
                color: '#6c757d',
                marginBottom: '3px'
              }}>
                Typ operacji
              </label>
              <div style={{
                padding: '0.4rem 0.5rem',
                background: isKP ? '#d4edda' : '#f8d7da',
                border: '1px solid #e9ecef',
                borderRadius: '4px',
                color: isKP ? '#155724' : '#721c24',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {isKP ? '📥 KP - Kasa Przyjmie (Wpływ)' : '📤 KW - Kasa Wydaje (Wydatek)'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              {/* Typ płatności */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#6c757d',
                  marginBottom: '3px'
                }}>
                  Typ płatności *
                </label>
                <select
                  value={formData.typ_platnosci}
                  onChange={(e) => handleChange('typ_platnosci', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                  required
                >
                  <option value="">-- Wybierz --</option>
                  {paymentTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data operacji */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#6c757d',
                  marginBottom: '3px'
                }}>
                  Data operacji
                </label>
                <input
                  type="date"
                  value={formData.data_operacji}
                  onChange={(e) => handleChange('data_operacji', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                />
              </div>
            </div>

            {/* Kwota */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: '500',
                color: '#6c757d',
                marginBottom: '3px'
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
                  padding: '0.4rem 0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
                required
              />
            </div>
          </div>

          {/* Sekcja opisu */}
          <div style={{ 
            marginBottom: '0.75rem', 
            padding: '0.75rem', 
            background: '#f8f9fa', 
            borderRadius: '5px',
            border: '1px solid #dee2e6'
          }}>
            <h6 style={{ margin: '0 0 0.75rem 0', fontWeight: '600', color: '#495057', fontSize: '12px' }}>
              📝 Opis operacji
            </h6>

            {/* Opis */}
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: '500',
                color: '#6c757d',
                marginBottom: '3px'
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
                  padding: '0.4rem 0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {/* Kategoria */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#6c757d',
                  marginBottom: '3px'
                }}>
                  Kategoria
                </label>
                <select
                  value={formData.kategoria}
                  onChange={(e) => handleChange('kategoria', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                >
                  <option value="">-- Wybierz --</option>
                  {currentKategorie.map(kat => (
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
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#6c757d',
                  marginBottom: '3px'
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
                    padding: '0.4rem 0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Sekcja kontrahenta */}
          <div style={{ 
            marginBottom: '0.75rem', 
            padding: '0.75rem', 
            background: '#f8f9fa', 
            borderRadius: '5px',
            border: '1px solid #dee2e6'
          }}>
            <h6 style={{ margin: '0 0 0.75rem 0', fontWeight: '600', color: '#495057', fontSize: '12px' }}>
              👤 Kontrahent i uwagi
            </h6>

            {/* Kontrahent */}
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: '500',
                color: '#6c757d',
                marginBottom: '3px'
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
                  padding: '0.4rem 0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              />
            </div>

            {/* Uwagi */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: '500',
                color: '#6c757d',
                marginBottom: '3px'
              }}>
                Uwagi
              </label>
              <textarea
                value={formData.uwagi}
                onChange={(e) => handleChange('uwagi', e.target.value)}
                rows="2"
                placeholder="Dodatkowe informacje..."
                style={{
                  width: '100%',
                  padding: '0.4rem 0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '12px',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          {/* Błąd */}
          {error && (
            <div style={{
              color: '#721c24',
              background: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              padding: '0.5rem 0.75rem',
              marginBottom: '0.75rem',
              fontSize: '11px'
            }}>
              <i className="fas fa-exclamation-circle" style={{ marginRight: '0.5rem' }}></i>
              {error}
            </div>
          )}

          {/* Przyciski */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                background: '#6c757d',
                color: 'white',
                border: 'none',
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
                background: loading ? '#a5b4fc' : '#0d6efd',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: '600',
                fontSize: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Zapisywanie...' : '💾 Zapisz zmiany'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditOperationModal;
