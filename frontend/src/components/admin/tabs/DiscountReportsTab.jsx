import React, { useState } from 'react';

const DiscountReportsTab = ({
  discountReports,
  discountStats,
  reportFilters,
  setReportFilters,
  reportType,
  setReportType,
  loadDiscountReports,
  loadDiscountStats
}) => {
  const [loading, setLoading] = useState(false);

  const handleDateChange = (field, value) => {
    setReportFilters({
      ...reportFilters,
      [field]: value
    });
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      await loadDiscountReports();
      await loadDiscountStats();
    } catch (error) {
      console.error('Błąd generowania raportu:', error);
    } finally {
      setLoading(false);
    }
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
              🔍 Filtry raportu
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
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
                  value={reportFilters?.data_od || ''}
                  onChange={(e) => handleDateChange('data_od', e.target.value)}
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
                  value={reportFilters?.data_do || ''}
                  onChange={(e) => handleDateChange('data_do', e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
                  Typ raportu
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem'
                  }}
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <option value="dzienne">Raport dzienny</option>
                  <option value="miesięczne">Raport miesięczny</option>
                  <option value="szczegółowy">Raport szczegółowy</option>
                </select>
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
                  value={reportFilters?.user_id || ''}
                  onChange={(e) => handleDateChange('user_id', e.target.value)}
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
              {loading ? 'Generowanie...' : 'Generuj raport'}
            </button>
          </div>
        </div>

        {/* Wyniki raportu */}
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
              📊 Wyniki raportu rabatów
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            {discountReports && discountReports.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ 
                        padding: '0.75rem', 
                        textAlign: 'left', 
                        borderBottom: '1px solid #e9ecef',
                        fontSize: '0.875rem',
                        fontWeight: '600'
                      }}>
                        Data
                      </th>
                      <th style={{ 
                        padding: '0.75rem', 
                        textAlign: 'left', 
                        borderBottom: '1px solid #e9ecef',
                        fontSize: '0.875rem',
                        fontWeight: '600'
                      }}>
                        Rabat
                      </th>
                      <th style={{ 
                        padding: '0.75rem', 
                        textAlign: 'right', 
                        borderBottom: '1px solid #e9ecef',
                        fontSize: '0.875rem',
                        fontWeight: '600'
                      }}>
                        Kwota
                      </th>
                      <th style={{ 
                        padding: '0.75rem', 
                        textAlign: 'left', 
                        borderBottom: '1px solid #e9ecef',
                        fontSize: '0.875rem',
                        fontWeight: '600'
                      }}>
                        Kasjer
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {discountReports.map((report, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #f1f3f4' }}>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                          {new Date(report.data).toLocaleDateString('pl-PL')}
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                          {report.rabat_nazwa}
                        </td>
                        <td style={{ 
                          padding: '0.75rem', 
                          fontSize: '0.875rem',
                          textAlign: 'right',
                          fontWeight: '600',
                          color: '#dc3545'
                        }}>
                          -{report.kwota_rabatu} zł
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                          {report.kasjer_login}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#6c757d',
                fontStyle: 'italic'
              }}>
                Brak danych do wyświetlenia. Wygeneruj raport, aby zobaczyć wyniki.
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div>
        {/* Statystyki */}
        {discountStats && Object.keys(discountStats).length > 0 && (
          <>
            <div style={{
              backgroundColor: '#dc3545',
              color: 'white',
              borderRadius: '0.375rem',
              padding: '1rem',
              textAlign: 'center',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                💰 {discountStats.total_discount_amount || 0} zł
              </div>
              <div>Łączna kwota rabatów</div>
            </div>

            <div style={{
              backgroundColor: '#ffc107',
              color: '#000',
              borderRadius: '0.375rem',
              padding: '1rem',
              textAlign: 'center',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                📈 {discountStats.total_transactions || 0}
              </div>
              <div>Transakcji z rabatem</div>
            </div>

            <div style={{
              backgroundColor: '#17a2b8',
              color: 'white',
              borderRadius: '0.375rem',
              padding: '1rem',
              textAlign: 'center',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                📊 {discountStats.average_discount || 0} zł
              </div>
              <div>Średnia kwota rabatu</div>
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
              📋 Popularne rabaty
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            {discountStats?.popular_discounts && discountStats.popular_discounts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {discountStats.popular_discounts.map((discount, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '0.25rem'
                    }}
                  >
                    <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                      {discount.nazwa}
                    </span>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      color: '#6c757d',
                      backgroundColor: '#e9ecef',
                      padding: '0.125rem 0.375rem',
                      borderRadius: '0.25rem'
                    }}>
                      {discount.ilosc_uzyc} użyć
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                padding: '1rem',
                textAlign: 'center',
                color: '#6c757d',
                fontSize: '0.875rem',
                fontStyle: 'italic'
              }}>
                Brak danych o popularnych rabatach
              </div>
            )}
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
              Generuj szczegółowe raporty wykorzystania rabatów w różnych okresach.
              Sprawdzaj statystyki, popularne rabaty i ich wpływ na sprzedaż.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscountReportsTab;
