import React, { useState } from 'react';

const OpenShiftEnhancedModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    cashier: 'admin',
    starting_cash: 100,
    cash_count_verified: false,
    cash_discrepancy: false,
    cash_discrepancy_amount: 0,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.cash_count_verified) {
      setError('Musisz zweryfikować ilość gotówki w kasie');
      return;
    }

    if (formData.cash_discrepancy && formData.cash_discrepancy_amount === 0) {
      setError('Jeśli jest rozbieżność, podaj kwotę');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const shiftEnhancedService = (await import('../../services/shiftEnhancedService')).default;
      const response = await shiftEnhancedService.openShiftEnhanced(formData);
      
      if (response.success) {
        onSuccess && onSuccess(response.data);
        onClose();
        // Reset form
        setFormData({
          cashier: 'admin',
          starting_cash: 100,
          cash_count_verified: false,
          cash_discrepancy: false,
          cash_discrepancy_amount: 0,
          notes: ''
        });
      } else {
        setError(response.message || 'Błąd otwierania zmiany');
      }
    } catch (err) {
      setError('Błąd otwierania zmiany: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Jeśli user odznacza rozbieżność, wyzeruj kwotę
    if (field === 'cash_discrepancy' && !value) {
      setFormData(prev => ({
        ...prev,
        cash_discrepancy_amount: 0
      }));
    }
  };

  if (!isOpen) return null;

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
        minWidth: '500px',
        maxWidth: '600px',
        width: '95vw',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            background: 'linear-gradient(135deg, #28a745, #20c997)',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <i className="fas fa-door-open" style={{ color: 'white', fontSize: '1.25rem' }}></i>
          </div>
          <div>
            <h4 style={{ margin: 0, fontWeight: '600', color: '#212529' }}>
              Otwórz zmianę kasową
            </h4>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6c757d' }}>
              Weryfikacja gotówki i rozpoczęcie nowej zmiany
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              color: '#6c757d',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {/* Kasjer */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Kasjer
            </label>
            <input
              type="text"
              value={formData.cashier}
              onChange={(e) => handleChange('cashier', e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '1rem'
              }}
            />
          </div>

          {/* Kwota początkowa */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Kwota początkowa w kasie (zł)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.starting_cash}
              onChange={(e) => handleChange('starting_cash', parseFloat(e.target.value) || 0)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '1rem'
              }}
            />
          </div>

          {/* Weryfikacja gotówki */}
          <div style={{ 
            marginBottom: '1rem',
            padding: '1rem',
            background: '#f8f9fa',
            borderRadius: '0.375rem',
            border: '1px solid #e9ecef'
          }}>
            <h6 style={{ margin: '0 0 0.75rem 0', fontWeight: '600', color: '#495057' }}>
              💰 Weryfikacja gotówki w kasie
            </h6>
            
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={formData.cash_count_verified}
                  onChange={(e) => handleChange('cash_count_verified', e.target.checked)}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span style={{ fontWeight: '500' }}>
                  Potwierdzam, że policzyłem/am gotówkę w kasie i zgadza się z kwotą początkową
                </span>
              </label>
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={formData.cash_discrepancy}
                  onChange={(e) => handleChange('cash_discrepancy', e.target.checked)}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span style={{ fontWeight: '500', color: '#dc3545' }}>
                  Gotówka w kasie się NIE zgadza (jest rozbieżność)
                </span>
              </label>
            </div>

            {formData.cash_discrepancy && (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#dc3545',
                  marginBottom: '0.5rem'
                }}>
                  O ile się nie zgadza? (wpisz kwotę różnicy)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cash_discrepancy_amount}
                  onChange={(e) => handleChange('cash_discrepancy_amount', parseFloat(e.target.value) || 0)}
                  placeholder="np. -10.50 (jeśli brakuje) lub +5.20 (jeśli nadwyżka)"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #dc3545',
                    borderRadius: '0.375rem',
                    fontSize: '1rem'
                  }}
                />
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: '#6c757d', 
                  margin: '0.25rem 0 0 0' 
                }}>
                  Użyj wartości ujemnych dla braków, dodatnich dla nadwyżek
                </p>
              </div>
            )}
          </div>

          {/* Uwagi */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Uwagi (opcjonalne)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows="3"
              placeholder="Dodatkowe informacje o rozpoczęciu zmiany..."
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
                background: loading ? '#a5b4fc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Otwieranie...' : 'Otwórz zmianę'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OpenShiftEnhancedModal;
