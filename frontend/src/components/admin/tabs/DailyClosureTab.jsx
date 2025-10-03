import React, { useState } from 'react';

const DailyClosureTab = ({
  dailyClosureReports,
  dailyClosureSummary,
  dailyClosureFilters,
  setDailyClosureFilters,
  selectedClosureReport,
  setSelectedClosureReport,
  showClosureReportModal,
  setShowClosureReportModal,
  loadDailyClosureReports,
  loadDailyClosureSummary
}) => {
  const [loading, setLoading] = useState(false);

  const handleDateChange = (field, value) => {
    setDailyClosureFilters({
      ...dailyClosureFilters,
      [field]: value
    });
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      await loadDailyClosureReports();
      await loadDailyClosureSummary();
    } catch (error) {
      console.error('Błąd generowania raportu:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewClosureDetails = (report) => {
    setSelectedClosureReport(report);
    setShowClosureReportModal(true);
  };

  const closeModal = () => {
    setShowClosureReportModal(false);
    setSelectedClosureReport(null);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
      <div>
        {/* Filtry raportu */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
          marginBottom: '1rem'
        }}>
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa'
          }}>
            <h6 style={{ margin: 0, fontWeight: '600', color: '#495057' }}>
              🔍 Filtry raportu zamknięć
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
                  Data od
                </label>
                <input
                  type="date"
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem'
                  }}
                  value={dailyClosureFilters?.date_from || ''}
                  onChange={(e) => handleDateChange('date_from', e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
                  Data do
                </label>
                <input
                  type="date"
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem'
                  }}
                  value={dailyClosureFilters?.date_to || ''}
                  onChange={(e) => handleDateChange('date_to', e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
                  Kasjer
                </label>
                <input
                  type="text"
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem'
                  }}
                  placeholder="Login kasjera (opcjonalnie)"
                  value={dailyClosureFilters?.cashier || ''}
                  onChange={(e) => handleDateChange('cashier', e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: loading ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Generowanie...' : 'Generuj raport zamknięć'}
            </button>
          </div>
        </div>

        {/* Lista zamknięć */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
        }}>
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa'
          }}>
            <h6 style={{ margin: 0, fontWeight: '600', color: '#495057' }}>
              🔒 Historia zamknięć dnia
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            {dailyClosureReports && dailyClosureReports.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {dailyClosureReports.map((closure, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '1rem',
                      border: '1px solid #e9ecef',
                      borderRadius: '0.375rem',
                      backgroundColor: '#fff'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontWeight: '600', 
                          fontSize: '0.875rem',
                          color: '#495057',
                          marginBottom: '0.25rem'
                        }}>
                          {new Date(closure.data).toLocaleDateString('pl-PL')} - {closure.kasjer_login}
                        </div>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: '#6c757d',
                          marginBottom: '0.5rem'
                        }}>
                          Zamknięcie o {new Date(closure.czas_zamkniecia).toLocaleTimeString('pl-PL')}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>Obrót</div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#28a745' }}>
                              {closure.obrot_gotowka} zł
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>Transakcje</div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                              {closure.liczba_transakcji}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>Różnica</div>
                            <div style={{ 
                              fontSize: '0.875rem', 
                              fontWeight: '600',
                              color: closure.roznica >= 0 ? '#28a745' : '#dc3545'
                            }}>
                              {closure.roznica >= 0 ? '+' : ''}{closure.roznica} zł
                            </div>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginLeft: '1rem' }}>
                        <button
                          onClick={() => viewClosureDetails(closure)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            fontSize: '0.75rem',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer'
                          }}
                        >
                          Szczegóły
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#6c757d',
                fontStyle: 'italic'
              }}>
                Brak danych do wyświetlenia. Wygeneruj raport, aby zobaczyć zamknięcia.
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div>
        {/* Statystyki */}
        {dailyClosureSummary && Object.keys(dailyClosureSummary).length > 0 && (
          <>
            <div style={{
              backgroundColor: '#28a745',
              color: 'white',
              borderRadius: '0.375rem',
              padding: '1rem',
              textAlign: 'center',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                💰 {dailyClosureSummary.total_revenue || 0} zł
              </div>
              <div>Łączny obrót</div>
            </div>

            <div style={{
              backgroundColor: '#007bff',
              color: 'white',
              borderRadius: '0.375rem',
              padding: '1rem',
              textAlign: 'center',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                📊 {dailyClosureSummary.total_transactions || 0}
              </div>
              <div>Łączne transakcje</div>
            </div>

            <div style={{
              backgroundColor: dailyClosureSummary.average_difference >= 0 ? '#28a745' : '#dc3545',
              color: 'white',
              borderRadius: '0.375rem',
              padding: '1rem',
              textAlign: 'center',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                📈 {dailyClosureSummary.average_difference >= 0 ? '+' : ''}{dailyClosureSummary.average_difference || 0} zł
              </div>
              <div>Średnia różnica</div>
            </div>
          </>
        )}

        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
          marginBottom: '1rem'
        }}>
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa'
          }}>
            <h6 style={{ margin: 0, fontWeight: '600', color: '#495057' }}>
              🎯 Nowe zamknięcie
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            <button
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Wykonaj zamknięcie dnia
            </button>
            <div style={{ 
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              color: '#6c757d',
              textAlign: 'center'
            }}>
              Ostatnie zamknięcie: {dailyClosureReports?.[0]?.data ? 
                new Date(dailyClosureReports[0].data).toLocaleDateString('pl-PL') : 
                'Brak danych'
              }
            </div>
          </div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
        }}>
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa'
          }}>
            <h6 style={{ margin: 0, fontWeight: '600', color: '#495057' }}>
              💡 Informacje
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            <p style={{ color: '#6c757d', lineHeight: '1.5', margin: '0', fontSize: '0.875rem' }}>
              Zarządzaj zamknięciami dnia, sprawdzaj raporty kasowe i monitoruj 
              dokładność rozliczeń poszczególnych kasjerów.
            </p>
          </div>
        </div>
      </div>

      {/* Modal szczegółów zamknięcia */}
      {showClosureReportModal && selectedClosureReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h5 style={{ margin: 0, fontWeight: '600' }}>
                Szczegóły zamknięcia - {new Date(selectedClosureReport.data).toLocaleDateString('pl-PL')}
              </h5>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6c757d'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <strong>Kasjer:</strong> {selectedClosureReport.kasjer_login}
              </div>
              <div>
                <strong>Czas zamknięcia:</strong> {new Date(selectedClosureReport.czas_zamkniecia).toLocaleString('pl-PL')}
              </div>
              <div>
                <strong>Obrót gotówka:</strong> {selectedClosureReport.obrot_gotowka} zł
              </div>
              <div>
                <strong>Obrót karta:</strong> {selectedClosureReport.obrot_karta} zł
              </div>
              <div>
                <strong>Liczba transakcji:</strong> {selectedClosureReport.liczba_transakcji}
              </div>
              <div>
                <strong>Różnica:</strong> 
                <span style={{ 
                  color: selectedClosureReport.roznica >= 0 ? '#28a745' : '#dc3545',
                  fontWeight: '600'
                }}>
                  {selectedClosureReport.roznica >= 0 ? '+' : ''}{selectedClosureReport.roznica} zł
                </span>
              </div>
            </div>

            {selectedClosureReport.uwagi && (
              <div style={{ marginTop: '1rem' }}>
                <strong>Uwagi:</strong>
                <div style={{ 
                  padding: '0.5rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '0.25rem',
                  marginTop: '0.25rem'
                }}>
                  {selectedClosureReport.uwagi}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyClosureTab;
