import React, { useState } from 'react';

const CloseShiftEnhancedModal = ({ isOpen, onClose, onSuccess, currentShift }) => {
  const [formData, setFormData] = useState({
    cashier: 'admin',
    ending_cash: 0,
    ending_cash_physical: 0,
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.ending_cash < 0) {
      setError('Kwota końcowa w kasie nie może być ujemna');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const shiftEnhancedService = (await import('../../services/shiftEnhancedService')).default;
      const response = await shiftEnhancedService.closeShiftEnhanced(formData);
      
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

  const calculateDifferences = () => {
    const cashDifference = formData.ending_cash_physical - formData.ending_cash;
    const terminalDifference = formData.card_terminal_actual - formData.card_terminal_system;
    
    return { cashDifference, terminalDifference };
  };

  if (!isOpen) return null;

  const { cashDifference, terminalDifference } = calculateDifferences();

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
        minWidth: '700px',
        maxWidth: '900px',
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
            background: 'linear-gradient(135deg, #dc3545, #fd7e14)',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <i className="fas fa-door-closed" style={{ color: 'white', fontSize: '1.25rem' }}></i>
          </div>
          <div>
            <h4 style={{ margin: 0, fontWeight: '600', color: '#212529' }}>
              Zamknij zmianę kasową
            </h4>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6c757d' }}>
              Pełny raport zamknięcia dnia z weryfikacją wszystkich systemów
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            
            {/* Lewa kolumna - Raporty kasowe */}
            <div>
              <h5 style={{ margin: '0 0 1rem 0', fontWeight: '600', color: '#495057' }}>
                💰 Raporty kasowe
              </h5>

              {/* Kasa według systemu */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Kasa według systemu (zł)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.ending_cash}
                  onChange={(e) => handleChange('ending_cash', parseFloat(e.target.value) || 0)}
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

              {/* Ilość gotówki fizycznie */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Ilość gotówki fizycznie w kasie (zł)
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
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '1rem'
                  }}
                />
              </div>

              {/* Różnica w kasie */}
              {cashDifference !== 0 && (
                <div style={{
                  padding: '0.75rem',
                  background: cashDifference > 0 ? '#d4edda' : '#f8d7da',
                  border: `1px solid ${cashDifference > 0 ? '#c3e6cb' : '#f5c6cb'}`,
                  borderRadius: '0.375rem',
                  marginBottom: '1rem'
                }}>
                  <strong style={{ color: cashDifference > 0 ? '#155724' : '#721c24' }}>
                    Różnica w kasie: {cashDifference > 0 ? '+' : ''}{cashDifference.toFixed(2)} zł
                  </strong>
                </div>
              )}

              {/* Terminal kartowy */}
              <h6 style={{ margin: '1.5rem 0 1rem 0', fontWeight: '600', color: '#495057' }}>
                💳 Terminal kartowy (Karta + BLIK)
              </h6>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Raport dobowy z terminala - system (zł)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.card_terminal_system}
                  onChange={(e) => handleChange('card_terminal_system', parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Rzeczywista kwota z terminala (zł)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.card_terminal_actual}
                  onChange={(e) => handleChange('card_terminal_actual', parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '1rem'
                  }}
                />
              </div>

              {terminalDifference !== 0 && (
                <div style={{
                  padding: '0.75rem',
                  background: terminalDifference > 0 ? '#d4edda' : '#f8d7da',
                  border: `1px solid ${terminalDifference > 0 ? '#c3e6cb' : '#f5c6cb'}`,
                  borderRadius: '0.375rem',
                  marginBottom: '1rem'
                }}>
                  <strong style={{ color: terminalDifference > 0 ? '#155724' : '#721c24' }}>
                    Różnica w terminalu: {terminalDifference > 0 ? '+' : ''}{terminalDifference.toFixed(2)} zł
                  </strong>
                </div>
              )}

              {/* Kasa fiskalna */}
              <h6 style={{ margin: '1.5rem 0 1rem 0', fontWeight: '600', color: '#495057' }}>
                🧾 Kasa fiskalna
              </h6>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Raport dobowy kasa fiskalna - suma wszystkich płatności (zł)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.fiscal_printer_report}
                  onChange={(e) => handleChange('fiscal_printer_report', parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '1rem'
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: '#6c757d', margin: '0.25rem 0 0 0' }}>
                  Raport dobowy z kasy fiskalnej sumuje wszystkie płatności
                </p>
              </div>
            </div>

            {/* Prawa kolumna - Social media i osiągnięcia */}
            <div>
              <h5 style={{ margin: '0 0 1rem 0', fontWeight: '600', color: '#495057' }}>
                📱 Social Media
              </h5>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  TikTok
                </label>
                <textarea
                  value={formData.social_media.tiktok}
                  onChange={(e) => handleChange('social_media.tiktok', e.target.value)}
                  rows="2"
                  placeholder="Co zrobiłeś na TikToku dzisiaj?"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Facebook
                </label>
                <textarea
                  value={formData.social_media.facebook}
                  onChange={(e) => handleChange('social_media.facebook', e.target.value)}
                  rows="2"
                  placeholder="Aktywność na Facebooku..."
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Instagram
                </label>
                <textarea
                  value={formData.social_media.instagram}
                  onChange={(e) => handleChange('social_media.instagram', e.target.value)}
                  rows="2"
                  placeholder="Posty, stories na Instagramie..."
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Wizytówka Google
                </label>
                <textarea
                  value={formData.social_media.google_business}
                  onChange={(e) => handleChange('social_media.google_business', e.target.value)}
                  rows="2"
                  placeholder="Aktywność w Google My Business..."
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <h6 style={{ margin: '0 0 1rem 0', fontWeight: '600', color: '#495057' }}>
                🎯 Osiągnięcia dnia
              </h6>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Opis dzisiejszych osiągnięć - sprzedaż
                </label>
                <textarea
                  value={formData.daily_achievements.sales_description}
                  onChange={(e) => handleChange('daily_achievements.sales_description', e.target.value)}
                  rows="3"
                  placeholder="Co sprzedawałeś dzisiaj? Jakie były sukcesy?"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Opis dzisiejszych osiągnięć - praca na sklepie
                </label>
                <textarea
                  value={formData.daily_achievements.work_description}
                  onChange={(e) => handleChange('daily_achievements.work_description', e.target.value)}
                  rows="3"
                  placeholder="Jaką pracę wykonałeś w sklepie dzisiaj?"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Uwagi - pełna szerokość */}
          <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Dodatkowe uwagi o zamknięciu zmiany (opcjonalne)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows="3"
              placeholder="Dodatkowe informacje o zamknięciu zmiany..."
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
                background: loading ? '#a5b4fc' : '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Zamykanie...' : 'Zamknij zmianę i wygeneruj raport'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CloseShiftEnhancedModal;
