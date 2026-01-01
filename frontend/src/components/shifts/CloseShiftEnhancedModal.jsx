import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const CloseShiftEnhancedModal = ({ isOpen, onClose, onSuccess, currentShift, locationId }) => {
  const [formData, setFormData] = useState({
    cashier: 'admin',
    ending_cash: 0,
    ending_cash_physical: 0,
    safebag_amount: 0,
    card_terminal_system: 0,
    card_terminal_actual: 0,
    fiscal_printer_report: 0,
    social_media: {
      tiktok: '',
      facebook: '',
      instagram: '',
      google_business: ''
    },
    daily_achievements: {
      sales_description: '',
      work_description: ''
    },
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
    handleChange('ending_cash_physical', total);
    setShowCashCalculator(false);
  };

  // Pobierz stan gotówki przy otwarciu modala
  useEffect(() => {
    if (isOpen && locationId) {
      loadCashStatus();
    }
    // Ustaw cashier z currentShift
    if (currentShift?.kasjer_login) {
      setFormData(prev => ({
        ...prev,
        cashier: currentShift.kasjer_login
      }));
    }
  }, [isOpen, locationId, currentShift]);

  const loadCashStatus = async () => {
    setCashStatusLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get(`${API_URL}/shifts/cash-status`, {
        params: { 
          location_id: locationId, 
          date: today,
          shift_id: currentShift?.id  // Przekaż ID bieżącej zmiany
        }
      });
      if (response.data.success) {
        setCashStatus(response.data.data);
        // Ustaw oczekiwaną gotówkę jako domyślną wartość ending_cash
        setFormData(prev => ({
          ...prev,
          ending_cash: response.data.data.expected_drawer_cash || 0
        }));
      }
    } catch (err) {
      console.error('Błąd pobierania stanu gotówki:', err);
    } finally {
      setCashStatusLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.ending_cash_physical < 0) {
      setError('Kwota fizycznej gotówki nie może być ujemna');
      return;
    }

    // Walidacja zgodności gotówki - musi być dokładna co do grosza
    const cashValidation = validateCash();
    if (!cashValidation.isValid) {
      const confirm = window.confirm(
        `⚠️ BŁĄD WALIDACJI GOTÓWKI!\n\n` +
        `Różnica: ${cashValidation.difference.toFixed(2)} zł\n\n` +
        `Oczekiwana gotówka w kasie: ${(cashStatus?.expected_drawer_cash || 0).toFixed(2)} zł\n` +
        `Fizyczna gotówka + Safebag: ${(formData.ending_cash_physical + formData.safebag_amount).toFixed(2)} zł\n\n` +
        `Kwoty muszą się zgadzać co do grosza!\n` +
        `Czy mimo to chcesz kontynuować?`
      );
      if (!confirm) return;
    }

    // Walidacja zgodności terminala - musi być dokładna co do grosza
    const terminalVal = validateTerminal();
    if (!terminalVal.isValid) {
      const confirm = window.confirm(
        `⚠️ BŁĄD WALIDACJI TERMINALA!\n\n` +
        `Różnica: ${terminalVal.difference.toFixed(2)} zł\n\n` +
        `Suma w systemie (karta + BLIK): ${(cashStatus?.terminal?.total || 0).toFixed(2)} zł\n` +
        `Kwota z wydruku terminala: ${formData.card_terminal_actual.toFixed(2)} zł\n\n` +
        `Kwoty muszą się zgadzać co do grosza!\n` +
        `Czy mimo to chcesz kontynuować?`
      );
      if (!confirm) return;
    }

    // Walidacja zgodności raportu fiskalnego - musi być dokładna co do grosza
    const fiscalVal = validateFiscal();
    if (!fiscalVal.isValid) {
      const confirm = window.confirm(
        `⚠️ BŁĄD WALIDACJI RAPORTU FISKALNEGO!\n\n` +
        `Różnica: ${fiscalVal.difference.toFixed(2)} zł\n\n` +
        `Oczekiwana wartość (sprzedaż - zwroty): ${(cashStatus?.fiscal?.expected_total || 0).toFixed(2)} zł\n` +
        `Kwota z wydruku raportu: ${formData.fiscal_printer_report.toFixed(2)} zł\n\n` +
        `Kwoty muszą się zgadzać co do grosza!\n` +
        `Czy mimo to chcesz kontynuować?`
      );
      if (!confirm) return;
    }

    setLoading(true);
    setError('');

    try {
      // Jeśli jest wpłata do safebaga, zapisz ją
      if (formData.safebag_amount > 0) {
        await axios.post(`${API_URL}/shifts/safebag`, {
          location_id: locationId,
          kwota: formData.safebag_amount,
          kasjer_login: formData.cashier,
          uwagi: 'Wpłata przy zamknięciu zmiany',
          shift_id: currentShift?.id
        });
      }

      const shiftEnhancedService = (await import('../../services/shiftEnhancedService')).default;
      const response = await shiftEnhancedService.closeShiftEnhanced({
        ...formData,
        location_id: locationId,
        cash_status: cashStatus,
        cash_validation: validateCash(),
        terminal_validation: validateTerminal(),
        fiscal_validation: validateFiscal()
      });
      
      if (response.success) {
        onSuccess && onSuccess(response.data);
        onClose();
      } else {
        setError(response.message || 'Błąd zamykania zmiany');
      }
    } catch (err) {
      setError('Błąd zamykania zmiany: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const validateCash = () => {
    if (!cashStatus) return { isValid: true, difference: 0 };
    
    const expectedCash = cashStatus.expected_drawer_cash || 0;
    const actualTotal = (parseFloat(formData.ending_cash_physical) || 0) + (parseFloat(formData.safebag_amount) || 0);
    const difference = Math.round((actualTotal - expectedCash) * 100) / 100; // Zaokrąglij do groszy
    
    return {
      isValid: Math.abs(difference) < 0.01, // Ścisła walidacja - musi się zgadzać co do grosza
      difference: difference,
      expectedCash,
      actualTotal
    };
  };

  const validateTerminal = () => {
    if (!cashStatus?.terminal) return { isValid: true, difference: 0 };
    
    const systemTotal = cashStatus.terminal.total || 0;
    const actualTotal = parseFloat(formData.card_terminal_actual) || 0;
    const difference = Math.round((actualTotal - systemTotal) * 100) / 100; // Zaokrąglij do groszy
    
    return {
      isValid: Math.abs(difference) < 0.01, // Ścisła walidacja - musi się zgadzać co do grosza
      difference,
      systemTotal,
      actualTotal
    };
  };

  const validateFiscal = () => {
    if (!cashStatus?.fiscal) return { isValid: true, difference: 0 };
    
    const expectedTotal = cashStatus.fiscal.expected_total || 0;
    const actualTotal = parseFloat(formData.fiscal_printer_report) || 0;
    const difference = Math.round((actualTotal - expectedTotal) * 100) / 100; // Zaokrąglij do groszy
    
    return {
      isValid: Math.abs(difference) < 0.01, // Ścisła walidacja - musi się zgadzać co do grosza
      difference,
      expectedTotal,
      actualTotal
    };
  };

  const calculateDifferences = () => {
    const cashValidation = validateCash();
    const terminalValidation = validateTerminal();
    const fiscalValidation = validateFiscal();
    
    return { 
      cashDifference: cashValidation.difference, 
      terminalDifference: terminalValidation.difference,
      fiscalDifference: fiscalValidation.difference,
      cashValidation,
      terminalValidation,
      fiscalValidation
    };
  };

  if (!isOpen) return null;

  const { cashDifference, terminalDifference, fiscalDifference, terminalValidation, fiscalValidation } = calculateDifferences();

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
        width: '600px',
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
          backgroundColor: '#dc3545',
          color: 'white',
          borderRadius: '0.375rem 0.375rem 0 0'
        }}>
          <span style={{ fontSize: '1.1rem' }}>🔒</span>
          <div style={{ flex: 1 }}>
            <h5 style={{ margin: 0, fontWeight: '600', fontSize: '13px' }}>
              Zamknij zmianę kasową
            </h5>
            <p style={{ margin: 0, fontSize: '10px', opacity: 0.9 }}>
              Raport zamknięcia dnia
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
          
          {/* Sekcja weryfikacji gotówki - na górze, pełna szerokość */}
          <div style={{ 
            marginBottom: '1rem', 
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {/* Stan w systemie */}
                <div style={{ 
                  padding: '0.5rem', 
                  background: '#e7f1ff', 
                  borderRadius: '4px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '10px', color: '#6c757d', marginBottom: '2px' }}>Gotówka w systemie</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#0d6efd' }}>
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
                  <div style={{ fontSize: '10px', color: '#6c757d', marginBottom: '2px' }}>Safebag (miesiąc)</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#856404' }}>
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
                  <div style={{ fontSize: '10px', color: '#6c757d', marginBottom: '2px' }}>Oczekiwana w kasie</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#155724' }}>
                    {cashStatus.expected_drawer_cash.toFixed(2)} zł
                  </div>
                </div>
              </div>
            )}

            {/* Pola do wprowadzenia */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
                  <span>Fizyczna gotówka w kasie (zł)</span>
                  <button
                    type="button"
                    onClick={() => setShowCashCalculator(!showCashCalculator)}
                    style={{
                      background: showCashCalculator ? '#0d6efd' : '#f8f9fa',
                      color: showCashCalculator ? 'white' : '#495057',
                      border: '1px solid #ced4da',
                      borderRadius: '3px',
                      padding: '2px 6px',
                      fontSize: '10px',
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
                  value={formData.ending_cash_physical}
                  onChange={(e) => handleChange('ending_cash_physical', parseFloat(e.target.value) || 0)}
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

              {/* Wpłata do safebaga */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#6c757d',
                  marginBottom: '3px'
                }}>
                  Wpłata do safebaga (zł)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.safebag_amount}
                  onChange={(e) => handleChange('safebag_amount', parseFloat(e.target.value) || 0)}
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
            </div>

            {/* Kalkulator nominałów */}
            {showCashCalculator && (
              <div style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                background: '#fff',
                border: '2px solid #0d6efd',
                borderRadius: '5px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#495057' }}>🧮 Kalkulator nominałów</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#0d6efd' }}>
                    Suma: {calculateDenominationsTotal().toFixed(2)} zł
                  </span>
                </div>
                
                {/* Grosze */}
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '10px', color: '#6c757d', marginBottom: '3px' }}>Grosze:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                    {[
                      { key: 'gr1', label: '1gr' },
                      { key: 'gr2', label: '2gr' },
                      { key: 'gr5', label: '5gr' },
                      { key: 'gr10', label: '10gr' },
                      { key: 'gr20', label: '20gr' },
                      { key: 'gr50', label: '50gr' }
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

                {/* Złotówki */}
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '10px', color: '#6c757d', marginBottom: '3px' }}>Złotówki:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                    {[
                      { key: 'zl1', label: '1zł' },
                      { key: 'zl2', label: '2zł' },
                      { key: 'zl5', label: '5zł' },
                      { key: 'zl10', label: '10zł' },
                      { key: 'zl20', label: '20zł' }
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

                {/* Banknoty */}
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '10px', color: '#6c757d', marginBottom: '3px' }}>Banknoty:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                    {[
                      { key: 'zl50', label: '50zł' },
                      { key: 'zl100', label: '100zł' },
                      { key: 'zl200', label: '200zł' },
                      { key: 'zl500', label: '500zł' }
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

                {/* Przyciski */}
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setDenominations({
                      gr1: 0, gr2: 0, gr5: 0, gr10: 0, gr20: 0, gr50: 0,
                      zl1: 0, zl2: 0, zl5: 0, zl10: 0, zl20: 0, zl50: 0, zl100: 0, zl200: 0, zl500: 0
                    })}
                    style={{
                      padding: '4px 10px',
                      background: '#f8f9fa',
                      color: '#6c757d',
                      border: '1px solid #ced4da',
                      borderRadius: '3px',
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    Wyczyść
                  </button>
                  <button
                    type="button"
                    onClick={applyDenominationsTotal}
                    style={{
                      padding: '4px 10px',
                      background: '#0d6efd',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      fontSize: '10px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    ✓ Zastosuj {calculateDenominationsTotal().toFixed(2)} zł
                  </button>
                </div>
              </div>
            )}

            {/* Podsumowanie i walidacja */}
            {cashStatus && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '0.5rem',
                  background: calculateDifferences().cashValidation?.isValid ? '#d4edda' : '#f8d7da',
                  border: `1px solid ${calculateDifferences().cashValidation?.isValid ? '#c3e6cb' : '#f5c6cb'}`,
                  borderRadius: '4px'
                }}>
                  <div style={{ fontSize: '11px' }}>
                    <strong>Suma (kasa + safebag):</strong>{' '}
                    {((parseFloat(formData.ending_cash_physical) || 0) + (parseFloat(formData.safebag_amount) || 0)).toFixed(2)} zł
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    fontWeight: '700',
                    color: calculateDifferences().cashValidation?.isValid ? '#155724' : '#721c24'
                  }}>
                    {calculateDifferences().cashValidation?.isValid ? (
                      <>✅ OK</>
                    ) : (
                      <>❌ Różnica: {calculateDifferences().cashDifference > 0 ? '+' : ''}{calculateDifferences().cashDifference.toFixed(2)} zł</>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            
            {/* Lewa kolumna - Terminal kartowy */}
            <div>
              {/* Terminal kartowy */}
              <h6 style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#495057', fontSize: '12px' }}>
                💳 Terminal kartowy
              </h6>

              {/* Podsumowanie z systemu - ZMIANA + DZIEŃ */}
              {cashStatus?.terminal && (
                <div style={{ 
                  marginBottom: '0.75rem', 
                  padding: '0.5rem', 
                  background: '#e7f1ff', 
                  borderRadius: '4px',
                  fontSize: '11px'
                }}>
                  {/* Dane bieżącej zmiany */}
                  {cashStatus.shift_data?.terminal && (
                    <>
                      <div style={{ fontSize: '10px', fontWeight: '600', color: '#0056b3', marginBottom: '4px', borderBottom: '1px solid #b8daff', paddingBottom: '3px' }}>
                        📍 BIEŻĄCA ZMIANA:
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span>Karta (zmiana):</span>
                        <strong>{cashStatus.shift_data.terminal.card_sales.toFixed(2)} zł</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span>BLIK (zmiana):</span>
                        <strong>{cashStatus.shift_data.terminal.blik_sales.toFixed(2)} zł</strong>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        backgroundColor: 'rgba(0,86,179,0.1)',
                        padding: '3px 4px',
                        borderRadius: '3px',
                        marginBottom: '6px'
                      }}>
                        <span style={{ fontWeight: '600' }}>SUMA ZMIANA:</span>
                        <strong style={{ color: '#0d6efd' }}>{cashStatus.shift_data.terminal.total.toFixed(2)} zł</strong>
                      </div>
                    </>
                  )}
                  
                  {/* Poprzednie zmiany tego dnia */}
                  {cashStatus.day_previous_shifts?.terminal_total > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', color: '#6c757d', fontSize: '10px' }}>
                      <span>Poprz. zmiany dnia:</span>
                      <span>{cashStatus.day_previous_shifts.terminal_total.toFixed(2)} zł</span>
                    </div>
                  )}
                  
                  {/* Suma dzienna - całkowita */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    borderTop: '1px solid #b8daff',
                    paddingTop: '3px',
                    marginTop: '3px'
                  }}>
                    <span style={{ fontWeight: '600', fontSize: '10px' }}>📅 CAŁY DZIEŃ:</span>
                    <strong style={{ color: '#495057', fontSize: '11px' }}>{cashStatus.terminal.total.toFixed(2)} zł</strong>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#6c757d',
                  marginBottom: '3px'
                }}>
                  Kwota z wydruku terminala - ZMIANA (zł)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.card_terminal_actual}
                  onChange={(e) => handleChange('card_terminal_actual', parseFloat(e.target.value) || 0)}
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

              {/* Walidacja terminala - porównanie z bieżącą zmianą */}
              {cashStatus?.current_shift?.terminal && (
                <div style={{
                  padding: '0.5rem',
                  background: Math.abs(formData.card_terminal_actual - cashStatus.current_shift.terminal.total) <= 1 ? '#d4edda' : '#f8d7da',
                  border: `1px solid ${Math.abs(formData.card_terminal_actual - cashStatus.current_shift.terminal.total) <= 1 ? '#c3e6cb' : '#f5c6cb'}`,
                  borderRadius: '3px',
                  marginBottom: '0.75rem',
                  fontSize: '11px'
                }}>
                  {Math.abs(formData.card_terminal_actual - cashStatus.current_shift.terminal.total) <= 1 ? (
                    <strong style={{ color: '#155724' }}>✅ Terminal OK (zgodny ze zmianą)</strong>
                  ) : (
                    <strong style={{ color: '#721c24' }}>
                      ❌ Różnica ze zmianą: {(formData.card_terminal_actual - cashStatus.current_shift.terminal.total) > 0 ? '+' : ''}
                      {(formData.card_terminal_actual - cashStatus.current_shift.terminal.total).toFixed(2)} zł
                    </strong>
                  )}
                </div>
              )}

              {/* Kasa fiskalna */}
              <h6 style={{ margin: '1rem 0 0.5rem 0', fontWeight: '600', color: '#495057', fontSize: '12px' }}>
                🧾 Raport fiskalny
              </h6>

              {/* Dane BIEŻĄCEJ ZMIANY - fiskalny */}
              {cashStatus?.current_shift?.fiscal && (
                <div style={{ marginBottom: '0.5rem', padding: '0.4rem', background: '#e7f1ff', borderRadius: '4px', fontSize: '10px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: '#0056b3', marginBottom: '4px' }}>
                    📊 ZMIANA (bieżąca):
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Sprzedaż fiskalna:</span>
                    <strong style={{ color: '#0d6efd' }}>{cashStatus.current_shift.fiscal.sales?.toFixed(2) || '0.00'} zł</strong>
                  </div>
                  {cashStatus.current_shift.fiscal.returns > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc3545' }}>
                      <span>Zwroty:</span>
                      <span>-{cashStatus.current_shift.fiscal.returns.toFixed(2)} zł</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px', paddingTop: '3px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                    <span style={{ fontWeight: '600' }}>Oczekiwany raport:</span>
                    <strong style={{ color: '#0d6efd' }}>{cashStatus.current_shift.fiscal.expected_total?.toFixed(2) || '0.00'} zł</strong>
                  </div>
                </div>
              )}

              {/* Dane z POPRZEDNICH ZMIAN dzisiejszych - fiskalny */}
              {cashStatus?.previous_shifts?.fiscal && cashStatus.previous_shifts.fiscal.total > 0 && (
                <div style={{ marginBottom: '0.5rem', padding: '0.4rem', background: '#fff3cd', borderRadius: '4px', fontSize: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '600' }}>📅 DZIEŃ (poprzednie zmiany):</span>
                    <strong style={{ color: '#856404' }}>{cashStatus.previous_shifts.fiscal.total.toFixed(2)} zł</strong>
                  </div>
                </div>
              )}

              {/* Suma dzienna fiskalna - tylko jeśli były poprzednie zmiany */}
              {cashStatus?.fiscal && cashStatus?.previous_shifts?.fiscal?.total > 0 && (
                <div style={{ marginBottom: '0.5rem', padding: '0.4rem', background: '#f8f9fa', borderRadius: '4px', fontSize: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '600' }}>📆 SUMA DZIENNA:</span>
                    <strong style={{ color: '#495057' }}>{cashStatus.fiscal.expected_total.toFixed(2)} zł</strong>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#6c757d',
                  marginBottom: '3px'
                }}>
                  Kwota z wydruku raportu zmianowego (zł)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.fiscal_printer_report}
                  onChange={(e) => handleChange('fiscal_printer_report', parseFloat(e.target.value) || 0)}
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

              {/* Walidacja raportu fiskalnego - porównanie z bieżącą zmianą */}
              {cashStatus?.current_shift?.fiscal && (
                <div style={{
                  padding: '0.5rem',
                  background: Math.abs(formData.fiscal_printer_report - cashStatus.current_shift.fiscal.expected_total) <= 1 ? '#d4edda' : '#f8d7da',
                  border: `1px solid ${Math.abs(formData.fiscal_printer_report - cashStatus.current_shift.fiscal.expected_total) <= 1 ? '#c3e6cb' : '#f5c6cb'}`,
                  borderRadius: '3px',
                  marginBottom: '0.75rem',
                  fontSize: '11px'
                }}>
                  {Math.abs(formData.fiscal_printer_report - cashStatus.current_shift.fiscal.expected_total) <= 1 ? (
                    <strong style={{ color: '#155724' }}>✅ Raport fiskalny OK (zgodny ze zmianą)</strong>
                  ) : (
                    <strong style={{ color: '#721c24' }}>
                      ❌ Różnica ze zmianą: {(formData.fiscal_printer_report - cashStatus.current_shift.fiscal.expected_total) > 0 ? '+' : ''}
                      {(formData.fiscal_printer_report - cashStatus.current_shift.fiscal.expected_total).toFixed(2)} zł
                    </strong>
                  )}
                </div>
              )}
            </div>

            {/* Prawa kolumna - Social media i osiągnięcia */}
            <div>
              <h6 style={{ margin: '0 0 0.75rem 0', fontWeight: '600', color: '#495057', fontSize: '12px' }}>
                📱 Social Media
              </h6>

              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#6c757d',
                  marginBottom: '3px'
                }}>
                  TikTok
                </label>
                <textarea
                  value={formData.social_media.tiktok}
                  onChange={(e) => handleChange('social_media.tiktok', e.target.value)}
                  rows="1"
                  placeholder="Co zrobiłeś na TikToku?"
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    border: '1px solid #ced4da',
                    borderRadius: '3px',
                    fontSize: '11px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#6c757d',
                  marginBottom: '3px'
                }}>
                  Facebook
                </label>
                <textarea
                  value={formData.social_media.facebook}
                  onChange={(e) => handleChange('social_media.facebook', e.target.value)}
                  rows="1"
                  placeholder="Aktywność na Facebooku..."
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    border: '1px solid #ced4da',
                    borderRadius: '3px',
                    fontSize: '11px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#6c757d',
                  marginBottom: '3px'
                }}>
                  Instagram
                </label>
                <textarea
                  value={formData.social_media.instagram}
                  onChange={(e) => handleChange('social_media.instagram', e.target.value)}
                  rows="1"
                  placeholder="Posty, stories..."
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    border: '1px solid #ced4da',
                    borderRadius: '3px',
                    fontSize: '11px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#6c757d',
                  marginBottom: '3px'
                }}>
                  Wizytówka Google
                </label>
                <textarea
                  value={formData.social_media.google_business}
                  onChange={(e) => handleChange('social_media.google_business', e.target.value)}
                  rows="1"
                  placeholder="Google My Business..."
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    border: '1px solid #ced4da',
                    borderRadius: '3px',
                    fontSize: '11px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <h6 style={{ margin: '0.75rem 0 0.5rem 0', fontWeight: '600', color: '#495057', fontSize: '12px' }}>
                🎯 Osiągnięcia dnia
              </h6>

              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#6c757d',
                  marginBottom: '3px'
                }}>
                  Osiągnięcia - sprzedaż
                </label>
                <textarea
                  value={formData.daily_achievements.sales_description}
                  onChange={(e) => handleChange('daily_achievements.sales_description', e.target.value)}
                  rows="2"
                  placeholder="Co sprzedawałeś? Sukcesy?"
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    border: '1px solid #ced4da',
                    borderRadius: '3px',
                    fontSize: '11px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#6c757d',
                  marginBottom: '3px'
                }}>
                  Osiągnięcia - praca
                </label>
                <textarea
                  value={formData.daily_achievements.work_description}
                  onChange={(e) => handleChange('daily_achievements.work_description', e.target.value)}
                  rows="2"
                  placeholder="Praca w sklepie?"
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    border: '1px solid #ced4da',
                    borderRadius: '3px',
                    fontSize: '11px',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Uwagi - pełna szerokość */}
          <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '500',
              color: '#6c757d',
              marginBottom: '3px'
            }}>
              Dodatkowe uwagi (opcjonalne)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows="2"
              placeholder="Dodatkowe informacje..."
              style={{
                width: '100%',
                padding: '5px 8px',
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
              color: '#dc3545',
              background: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '3px',
              padding: '6px 10px',
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
                padding: '6px 14px',
                background: '#f8f9fa',
                color: '#6c757d',
                border: '1px solid #dee2e6',
                borderRadius: '3px',
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
                padding: '6px 14px',
                background: loading ? '#a5b4fc' : '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                fontWeight: '600',
                fontSize: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Zamykanie...' : 'Zamknij zmianę'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CloseShiftEnhancedModal;
