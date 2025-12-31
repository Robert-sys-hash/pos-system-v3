import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const OpenShiftEnhancedModal = ({ isOpen, onClose, onSuccess, locationId }) => {
  const [formData, setFormData] = useState({
    cashier: 'admin',
    starting_cash: 0,
    starting_cash_physical: 0,
    cash_count_verified: false,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cashStatus, setCashStatus] = useState(null);
  const [cashStatusLoading, setCashStatusLoading] = useState(false);
  const [showCashCalculator, setShowCashCalculator] = useState(false);
  const [denominations, setDenominations] = useState({
    gr1: 0, gr2: 0, gr5: 0, gr10: 0, gr20: 0, gr50: 0,
    zl1: 0, zl2: 0, zl5: 0, zl10: 0, zl20: 0, zl50: 0, zl100: 0, zl200: 0, zl500: 0
  });

  // Oblicz sumę z nominałów
  const calculateDenominationsTotal = () => {
    return (
      denominations.gr1 * 0.01 +
      denominations.gr2 * 0.02 +
      denominations.gr5 * 0.05 +
      denominations.gr10 * 0.10 +
      denominations.gr20 * 0.20 +
      denominations.gr50 * 0.50 +
      denominations.zl1 * 1 +
      denominations.zl2 * 2 +
      denominations.zl5 * 5 +
      denominations.zl10 * 10 +
      denominations.zl20 * 20 +
      denominations.zl50 * 50 +
      denominations.zl100 * 100 +
      denominations.zl200 * 200 +
      denominations.zl500 * 500
    );
  };

  const applyDenominationsTotal = () => {
    const total = calculateDenominationsTotal();
    handleChange('starting_cash_physical', total);
    setShowCashCalculator(false);
  };

  // Pobierz stan gotówki przy otwarciu modala
  useEffect(() => {
    if (isOpen && locationId) {
      loadCashStatus(locationId);
    }
  }, [isOpen, locationId]);

  const loadCashStatus = async (locId) => {
    if (!locId) return;
    setCashStatusLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get(`${API_URL}/shifts/cash-status`, {
        params: { location_id: locId, date: today }
      });
      if (response.data.success) {
        setCashStatus(response.data.data);
        // Ustaw oczekiwaną gotówkę jako domyślną wartość starting_cash
        setFormData(prev => ({
          ...prev,
          starting_cash: response.data.data.expected_drawer_cash || 0
        }));
      }
    } catch (err) {
      console.error('Błąd pobierania stanu gotówki:', err);
    } finally {
      setCashStatusLoading(false);
    }
  };

  // Walidacja gotówki
  const validateCash = () => {
    const difference = formData.starting_cash_physical - formData.starting_cash;
    const isValid = Math.abs(difference) <= 10; // tolerancja 10 zł
    return { isValid, difference };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.cash_count_verified) {
      setError('Musisz potwierdzić policzenie gotówki w kasie');
      return;
    }

    const cashValidation = validateCash();
    if (!cashValidation.isValid) {
      const confirmProceed = window.confirm(
        `⚠️ Różnica gotówki: ${cashValidation.difference.toFixed(2)} zł\n\n` +
        `Oczekiwana: ${formData.starting_cash.toFixed(2)} zł\n` +
        `Fizyczna: ${formData.starting_cash_physical.toFixed(2)} zł\n\n` +
        `Czy na pewno chcesz otworzyć zmianę z tą rozbieżnością?`
      );
      if (!confirmProceed) return;
    }

    setLoading(true);
    setError('');

    try {
      const shiftEnhancedService = (await import('../../services/shiftEnhancedService')).default;
      const response = await shiftEnhancedService.openShiftEnhanced({
        ...formData,
        cash_discrepancy: !validateCash().isValid,
        cash_discrepancy_amount: validateCash().difference,
        location_id: locationId
      });
      
      if (response.success) {
        onSuccess && onSuccess(response.data);
        onClose();
        // Reset form
        setFormData({
          cashier: 'admin',
          starting_cash: 0,
          starting_cash_physical: 0,
          cash_count_verified: false,
          notes: ''
        });
        setDenominations({
          gr1: 0, gr2: 0, gr5: 0, gr10: 0, gr20: 0, gr50: 0,
          zl1: 0, zl2: 0, zl5: 0, zl10: 0, zl20: 0, zl50: 0, zl100: 0, zl200: 0, zl500: 0
        });
      } else {
        setError(response.message || 'Błąd otwierania zmiany');
      }
    } catch (err) {
      setError('Błąd otwierania zmiany: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  // Sprawdź czy lokalizacja jest wybrana
  const hasLocation = !!locationId;
  const cashValidation = validateCash();

  // Jeśli nie ma lokalizacji - pokaż komunikat
  if (!hasLocation) {
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
        padding: '0.5rem'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: '6px',
          width: '400px',
          maxWidth: '95vw',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }}>
          {/* Header */}
          <div style={{
            padding: '0.75rem 1rem',
            background: 'linear-gradient(135deg, #dc3545, #c82333)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            borderRadius: '6px 6px 0 0'
          }}>
            <div style={{
              width: '2rem',
              height: '2rem',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem'
            }}>
              ⚠️
            </div>
            <div style={{ flex: 1 }}>
              <h5 style={{ margin: 0, fontWeight: '600', fontSize: '13px' }}>
                Brak wybranej lokalizacji
              </h5>
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

          <div style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📍</div>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>
              Wybierz lokalizację
            </h4>
            <p style={{ color: '#6c757d', fontSize: '13px', margin: '0 0 1.5rem 0' }}>
              Aby otworzyć zmianę kasową, musisz najpierw wybrać lokalizację w menu głównym.
            </p>
            <button
              onClick={onClose}
              style={{
                padding: '8px 20px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: '500',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Zamknij
            </button>
          </div>
        </div>
      </div>
    );
  }

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
      padding: '0.5rem'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '6px',
        width: '400px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        {/* Header - kompaktowy */}
        <div style={{
          padding: '0.75rem 1rem',
          background: 'linear-gradient(135deg, #28a745, #20c997)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{
            width: '2rem',
            height: '2rem',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem'
          }}>
            🚀
          </div>
          <div style={{ flex: 1 }}>
            <h5 style={{ margin: 0, fontWeight: '600', fontSize: '13px' }}>
              Otwórz zmianę kasową
            </h5>
            <p style={{ margin: 0, fontSize: '10px', opacity: 0.9 }}>
              Weryfikacja gotówki i rozpoczęcie nowej zmiany
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

        <form onSubmit={handleSubmit} style={{ padding: '1rem' }}>
          
          {/* Kasjer */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '500',
              color: '#6c757d',
              marginBottom: '3px'
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
                padding: '6px 8px',
                border: '1px solid #ced4da',
                borderRadius: '3px',
                fontSize: '12px',
                height: '30px'
              }}
            />
          </div>

          {/* Sekcja weryfikacji gotówki */}
          <div style={{ 
            marginBottom: '0.75rem', 
            padding: '0.75rem', 
            background: '#f8f9fa', 
            borderRadius: '5px',
            border: '1px solid #dee2e6'
          }}>
            <h6 style={{ margin: '0 0 0.75rem 0', fontWeight: '600', color: '#495057', fontSize: '12px' }}>
              💵 Weryfikacja gotówki
              {cashStatusLoading && <span style={{ marginLeft: '8px', fontSize: '10px', color: '#6c757d' }}>Ładowanie...</span>}
            </h6>

            {cashStatus && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {/* Stan w systemie */}
                <div style={{ 
                  padding: '0.5rem', 
                  background: '#e7f1ff', 
                  borderRadius: '4px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '9px', color: '#6c757d', marginBottom: '2px' }}>System</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0d6efd' }}>
                    {cashStatus.system_cash.toFixed(2)} zł
                  </div>
                </div>

                {/* Safebag w miesiącu */}
                <div style={{ 
                  padding: '0.5rem', 
                  background: '#fff3cd', 
                  borderRadius: '4px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '9px', color: '#6c757d', marginBottom: '2px' }}>Safebag</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#856404' }}>
                    {cashStatus.safebag_total_month.toFixed(2)} zł
                  </div>
                </div>

                {/* Oczekiwana w kasie */}
                <div style={{ 
                  padding: '0.5rem', 
                  background: '#d4edda', 
                  borderRadius: '4px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '9px', color: '#6c757d', marginBottom: '2px' }}>Oczekiwana</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#155724' }}>
                    {cashStatus.expected_drawer_cash.toFixed(2)} zł
                  </div>
                </div>
              </div>
            )}

            {/* Pola do wprowadzenia */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              {/* Oczekiwana gotówka */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#6c757d',
                  marginBottom: '3px'
                }}>
                  Oczekiwana gotówka (zł)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.starting_cash}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    border: '1px solid #ced4da',
                    borderRadius: '3px',
                    fontSize: '12px',
                    height: '30px',
                    background: '#e9ecef'
                  }}
                />
              </div>

              {/* Fizyczna gotówka w kasie */}
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#6c757d',
                  marginBottom: '3px'
                }}>
                  <span>Fizyczna gotówka (zł)</span>
                  <button
                    type="button"
                    onClick={() => setShowCashCalculator(!showCashCalculator)}
                    style={{
                      background: showCashCalculator ? '#28a745' : '#f8f9fa',
                      color: showCashCalculator ? 'white' : '#495057',
                      border: '1px solid #ced4da',
                      borderRadius: '3px',
                      padding: '2px 6px',
                      fontSize: '9px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title="Kalkulator nominałów"
                  >
                    🧮 Licz
                  </button>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.starting_cash_physical}
                  onChange={(e) => handleChange('starting_cash_physical', parseFloat(e.target.value) || 0)}
                  required
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    border: `2px solid ${formData.starting_cash_physical > 0 ? (cashValidation.isValid ? '#28a745' : '#dc3545') : '#ced4da'}`,
                    borderRadius: '3px',
                    fontSize: '12px',
                    height: '30px'
                  }}
                />
              </div>
            </div>

            {/* Kalkulator nominałów */}
            {showCashCalculator && (
              <div style={{
                marginBottom: '0.75rem',
                padding: '0.75rem',
                background: '#fff',
                border: '1px solid #28a745',
                borderRadius: '4px'
              }}>
                <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '0.5rem', color: '#28a745' }}>
                  🧮 Kalkulator nominałów
                </div>
                
                {/* Banknoty */}
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '10px', color: '#6c757d', marginBottom: '3px' }}>Banknoty</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                    {[
                      { key: 'zl500', label: '500zł' },
                      { key: 'zl200', label: '200zł' },
                      { key: 'zl100', label: '100zł' },
                      { key: 'zl50', label: '50zł' },
                      { key: 'zl20', label: '20zł' },
                      { key: 'zl10', label: '10zł' }
                    ].map(({ key, label }) => (
                      <div key={key} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', color: '#6c757d' }}>{label}</div>
                        <input
                          type="number"
                          min="0"
                          value={denominations[key]}
                          onChange={(e) => setDenominations(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                          style={{
                            width: '100%',
                            padding: '3px',
                            border: '1px solid #ced4da',
                            borderRadius: '2px',
                            fontSize: '11px',
                            textAlign: 'center'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Monety */}
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '10px', color: '#6c757d', marginBottom: '3px' }}>Monety</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                    {[
                      { key: 'zl5', label: '5zł' },
                      { key: 'zl2', label: '2zł' },
                      { key: 'zl1', label: '1zł' },
                      { key: 'gr50', label: '50gr' },
                      { key: 'gr20', label: '20gr' },
                      { key: 'gr10', label: '10gr' },
                      { key: 'gr5', label: '5gr' },
                      { key: 'gr2', label: '2gr' },
                      { key: 'gr1', label: '1gr' }
                    ].map(({ key, label }) => (
                      <div key={key} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', color: '#6c757d' }}>{label}</div>
                        <input
                          type="number"
                          min="0"
                          value={denominations[key]}
                          onChange={(e) => setDenominations(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                          style={{
                            width: '100%',
                            padding: '3px',
                            border: '1px solid #ced4da',
                            borderRadius: '2px',
                            fontSize: '11px',
                            textAlign: 'center'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suma i przycisk */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600' }}>
                    Suma: <span style={{ color: '#28a745' }}>{calculateDenominationsTotal().toFixed(2)} zł</span>
                  </div>
                  <button
                    type="button"
                    onClick={applyDenominationsTotal}
                    style={{
                      padding: '4px 10px',
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    ✓ Zastosuj
                  </button>
                </div>
              </div>
            )}

            {/* Walidacja */}
            {formData.starting_cash_physical > 0 && (
              <div style={{
                padding: '0.5rem',
                borderRadius: '4px',
                background: cashValidation.isValid ? '#d4edda' : '#f8d7da',
                border: `1px solid ${cashValidation.isValid ? '#c3e6cb' : '#f5c6cb'}`,
                marginBottom: '0.5rem'
              }}>
                <div style={{ 
                  fontSize: '11px', 
                  fontWeight: '600',
                  color: cashValidation.isValid ? '#155724' : '#721c24',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  {cashValidation.isValid ? '✅' : '⚠️'}
                  <span>
                    Różnica: {cashValidation.difference >= 0 ? '+' : ''}{cashValidation.difference.toFixed(2)} zł
                    {cashValidation.isValid ? ' (OK)' : ' (Rozbieżność!)'}
                  </span>
                </div>
              </div>
            )}

            {/* Checkbox potwierdzenia */}
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '11px',
              cursor: 'pointer',
              padding: '0.5rem',
              background: formData.cash_count_verified ? '#d4edda' : '#fff',
              border: `1px solid ${formData.cash_count_verified ? '#28a745' : '#ced4da'}`,
              borderRadius: '4px'
            }}>
              <input
                type="checkbox"
                checked={formData.cash_count_verified}
                onChange={(e) => handleChange('cash_count_verified', e.target.checked)}
                style={{ transform: 'scale(1.1)', marginTop: '2px' }}
              />
              <span style={{ fontWeight: '500', color: formData.cash_count_verified ? '#155724' : '#495057' }}>
                Potwierdzam, że policzyłem/am gotówkę w kasie
              </span>
            </label>
          </div>

          {/* Uwagi */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '500',
              color: '#6c757d',
              marginBottom: '3px'
            }}>
              Uwagi (opcjonalne)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows="2"
              placeholder="Dodatkowe informacje..."
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #ced4da',
                borderRadius: '3px',
                fontSize: '11px',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Błąd */}
          {error && (
            <div style={{
              color: '#721c24',
              background: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              padding: '0.5rem',
              marginBottom: '0.75rem',
              fontSize: '11px'
            }}>
              ❌ {error}
            </div>
          )}

          {/* Przyciski */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '6px 14px',
                background: '#f8f9fa',
                color: '#6c757d',
                border: '1px solid #dee2e6',
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
              disabled={loading || !formData.cash_count_verified}
              style={{
                padding: '6px 14px',
                background: loading || !formData.cash_count_verified ? '#a8d5a8' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: '600',
                fontSize: '12px',
                cursor: loading || !formData.cash_count_verified ? 'not-allowed' : 'pointer',
                opacity: loading || !formData.cash_count_verified ? 0.7 : 1
              }}
            >
              {loading ? '⏳ Otwieranie...' : '🚀 Otwórz zmianę'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OpenShiftEnhancedModal;
