import React, { useState, useEffect } from 'react';
import { kasaBankService } from '../services/kasaBankService';

const KasaBankPage = () => {
  const [saldo, setSaldo] = useState(null);
  const [operacje, setOperacje] = useState([]);
  const [dailySummary, setDailySummary] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [paymentsByType, setPaymentsByType] = useState(null);
  const [kpDocuments, setKpDocuments] = useState([]);
  const [kwDocuments, setKwDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview, payments, all-operations, kp, kw
  const [paymentFilters, setPaymentFilters] = useState({
    gotowka: true,
    karta: true,
    blik: true,
    przelew: true,
    kupon: true
  });
  const [filteredOperations, setFilteredOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [saldoRes, operacjeRes, dailyRes, monthlyRes, paymentsRes, kpRes, kwRes] = await Promise.all([
        kasaBankService.getSaldo(),
        kasaBankService.getOperacje(20),
        kasaBankService.getDailySummary(),
        kasaBankService.getMonthlyStats(),
        kasaBankService.getPaymentsByType(),
        kasaBankService.getKPDocuments(20),
        kasaBankService.getKWDocuments(20)
      ]);

      console.log('📊 Dane z API:', { saldoRes, operacjeRes, dailyRes, monthlyRes, paymentsRes, kpRes, kwRes });

      if (saldoRes.success) setSaldo(saldoRes.data);
      if (operacjeRes.success) setOperacje(operacjeRes.data || []);
      if (paymentsRes.success) setPaymentsByType(paymentsRes.data || {});
      if (kpRes.success) setKpDocuments(kpRes.data || []);
      if (kwRes.success) setKwDocuments(kwRes.data || []);
      
      if (dailyRes.success) {
        // Mapuj dane z backendu na format oczekiwany przez frontend
        setDailySummary({
          total_in: dailyRes.data.total_income || 0,
          total_out: dailyRes.data.total_expense || 0,
          balance: (dailyRes.data.total_income || 0) - (dailyRes.data.total_expense || 0)
        });
      }
      if (monthlyRes.success) {
        // Mapuj dane z backendu na format oczekiwany przez frontend
        setMonthlyStats({
          total_transactions: Object.keys(monthlyRes.data.daily_data || {}).length,
          total_amount: (monthlyRes.data.total_income || 0) + (monthlyRes.data.total_expense || 0),
          avg_transaction: Object.keys(monthlyRes.data.daily_data || {}).length > 0 
            ? ((monthlyRes.data.total_income || 0) + (monthlyRes.data.total_expense || 0)) / Object.keys(monthlyRes.data.daily_data || {}).length
            : 0
        });
      }

    } catch (err) {
      console.error('❌ Błąd ładowania danych:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Funkcja do filtrowania operacji
  const filterOperations = () => {
    if (!operacje || operacje.length === 0) {
      setFilteredOperations([]);
      return;
    }

    const filtered = operacje.filter(operacja => {
      return paymentFilters[operacja.typ_platnosci] === true;
    });

    setFilteredOperations(filtered);
  };

  // Efekt do filtrowania operacji gdy zmienią się dane lub filtry
  useEffect(() => {
    filterOperations();
  }, [operacje, paymentFilters]);

  // Funkcja do przełączania filtrów
  const togglePaymentFilter = (paymentType) => {
    setPaymentFilters(prev => ({
      ...prev,
      [paymentType]: !prev[paymentType]
    }));
  };

  // Funkcja do zaznaczania/odznaczania wszystkich filtrów
  const toggleAllFilters = (checked) => {
    setPaymentFilters({
      gotowka: checked,
      karta: checked,
      blik: checked,
      przelew: checked,
      kupon: checked
    });
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Ładowanie...</span>
          </div>
        </div>
      </div>
    );
  }

  const totalBalance = saldo ? Object.values(saldo).reduce((sum, val) => sum + val, 0) : 0;

  // Funkcje pomocnicze do formatowania
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN'
    }).format(amount || 0);
  };

  const getPaymentTypeIcon = (type) => {
    const icons = {
      'gotowka': 'fas fa-money-bill-wave',
      'karta': 'fas fa-credit-card',
      'blik': 'fas fa-mobile-alt',
      'przelew': 'fas fa-university',
      'kupon': 'fas fa-ticket-alt'
    };
    return icons[type] || 'fas fa-money-check';
  };

  const getPaymentTypeColor = (type) => {
    const colors = {
      'gotowka': '#28a745',
      'karta': '#0d6efd', 
      'blik': '#17a2b8',
      'przelew': '#6f42c1',
      'kupon': '#fd7e14'
    };
    return colors[type] || '#6c757d';
  };

  const getOperationTypeBadge = (type) => {
    if (type === 'KP') {
      return { text: 'KP', color: '#28a745', bg: '#d4edda' };
    } else {
      return { text: 'KW', color: '#dc3545', bg: '#f8d7da' };
    }
  };

  return (
    <div style={{ 
      width: '100%', 
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      padding: '1.5rem' 
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Nagłówek - na wzór magazynu */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1.5rem',
          padding: '1.25rem 1.5rem',
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.5rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '3rem',
              height: '3rem',
              backgroundColor: '#e7f1ff',
              borderRadius: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #28a745'
            }}>
              <i className="fas fa-money-bill-wave" style={{ 
                color: '#28a745', 
                fontSize: '1.25rem' 
              }}></i>
            </div>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: '1.4rem', 
                fontWeight: '700',
                color: '#212529',
                letterSpacing: '-0.025em'
              }}>
                Kasa & Bank - Finanse
              </h1>
              <p style={{ 
                margin: '0.25rem 0 0 0', 
                fontSize: '0.875rem', 
                color: '#6c757d',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem'
              }}>
                <i className="fas fa-info-circle" style={{ fontSize: '0.8rem' }}></i>
                System zarządzania operacjami finansowymi i saldami
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={loadData}
              disabled={loading}
              style={{ 
                padding: '0.625rem 1.125rem',
                fontSize: '0.875rem',
                border: '1px solid #0d6efd',
                borderRadius: '0.375rem',
                backgroundColor: '#0d6efd',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '500',
                transition: 'all 0.15s ease-in-out'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#0b5ed7';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 0.25rem 0.5rem rgba(13, 110, 253, 0.25)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#0d6efd';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }
              }}
            >
              <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
              {loading ? 'Ładowanie...' : 'Odśwież'}
            </button>
          </div>
        </div>

        {/* Alert błędów */}
        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '0.375rem',
            color: '#721c24',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <i className="fas fa-exclamation-circle"></i>
            {error}
            <button 
              onClick={() => setError('')}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: '#721c24',
                cursor: 'pointer',
                fontSize: '1.25rem'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Statystyki sald - na wzór magazynu */}
        {saldo && (
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginBottom: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ 
              flex: '1', 
              minWidth: '200px',
              padding: '1rem',
              backgroundColor: 'white',
              border: '1px solid #e9ecef',
              borderLeft: '4px solid #28a745',
              borderRadius: '0.375rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.5rem', 
                    fontWeight: '700',
                    color: '#28a745'
                  }}>
                    {saldo.gotowka?.toFixed(2) || '0.00'} zł
                  </h3>
                  <p style={{ 
                    margin: '0.25rem 0 0 0', 
                    fontSize: '0.8rem', 
                    color: '#6c757d'
                  }}>
                    Gotówka
                  </p>
                </div>
                <i className="fas fa-money-bill fa-2x" style={{ color: '#28a745', opacity: 0.3 }}></i>
              </div>
            </div>
            
            <div style={{ 
              flex: '1', 
              minWidth: '200px',
              padding: '1rem',
              backgroundColor: 'white',
              border: '1px solid #e9ecef',
              borderLeft: '4px solid #0d6efd',
              borderRadius: '0.375rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.5rem', 
                    fontWeight: '700',
                    color: '#0d6efd'
                  }}>
                    {saldo.karta?.toFixed(2) || '0.00'} zł
                  </h3>
                  <p style={{ 
                    margin: '0.25rem 0 0 0', 
                    fontSize: '0.8rem', 
                    color: '#6c757d'
                  }}>
                    Karta
                  </p>
                </div>
                <i className="fas fa-credit-card fa-2x" style={{ color: '#0d6efd', opacity: 0.3 }}></i>
              </div>
            </div>

            <div style={{ 
              flex: '1', 
              minWidth: '200px',
              padding: '1rem',
              backgroundColor: 'white',
              border: '1px solid #e9ecef',
              borderLeft: '4px solid #17a2b8',
              borderRadius: '0.375rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.5rem', 
                    fontWeight: '700',
                    color: '#17a2b8'
                  }}>
                    {saldo.blik?.toFixed(2) || '0.00'} zł
                  </h3>
                  <p style={{ 
                    margin: '0.25rem 0 0 0', 
                    fontSize: '0.8rem', 
                    color: '#6c757d'
                  }}>
                    BLIK
                  </p>
                </div>
                <i className="fas fa-mobile-alt fa-2x" style={{ color: '#17a2b8', opacity: 0.3 }}></i>
              </div>
            </div>

            <div style={{ 
              flex: '1', 
              minWidth: '200px',
              padding: '1rem',
              backgroundColor: 'white',
              border: '1px solid #e9ecef',
              borderLeft: '4px solid #ffc107',
              borderRadius: '0.375rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.5rem', 
                    fontWeight: '700',
                    color: '#ffc107'
                  }}>
                    {saldo.przelew?.toFixed(2) || '0.00'} zł
                  </h3>
                  <p style={{ 
                    margin: '0.25rem 0 0 0', 
                    fontSize: '0.8rem', 
                    color: '#6c757d'
                  }}>
                    Przelew
                  </p>
                </div>
                <i className="fas fa-university fa-2x" style={{ color: '#ffc107', opacity: 0.3 }}></i>
              </div>
            </div>
          </div>
        )}

        {/* Podsumowanie dzienne i miesięczne - nowoczesny styl */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '1rem',
          flexWrap: 'wrap'
        }}>
          {dailySummary && (
            <div style={{ 
              flex: '1', 
              minWidth: '300px',
              padding: '1.5rem',
              backgroundColor: 'white',
              border: '1px solid #e9ecef',
              borderRadius: '0.5rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '1rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid #e9ecef'
              }}>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  backgroundColor: '#e7f1ff',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '0.75rem'
                }}>
                  <i className="fas fa-calendar-day" style={{ color: '#0d6efd', fontSize: '1rem' }}></i>
                </div>
                <h5 style={{ margin: 0, fontWeight: '600', color: '#212529' }}>
                  Podsumowanie Dzienne
                </h5>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.5rem', 
                    fontWeight: '700',
                    color: '#28a745'
                  }}>
                    {dailySummary.total_in?.toFixed(2) || '0.00'} zł
                  </h3>
                  <p style={{ 
                    margin: '0.25rem 0 0 0', 
                    fontSize: '0.8rem', 
                    color: '#6c757d'
                  }}>
                    Wpływy
                  </p>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.5rem', 
                    fontWeight: '700',
                    color: '#dc3545'
                  }}>
                    {dailySummary.total_out?.toFixed(2) || '0.00'} zł
                  </h3>
                  <p style={{ 
                    margin: '0.25rem 0 0 0', 
                    fontSize: '0.8rem', 
                    color: '#6c757d'
                  }}>
                    Wydatki
                  </p>
                </div>
              </div>
              <div style={{ 
                textAlign: 'center', 
                paddingTop: '0.75rem',
                borderTop: '1px solid #e9ecef'
              }}>
                <h4 style={{ 
                  margin: 0, 
                  fontSize: '1.25rem', 
                  fontWeight: '700',
                  color: (dailySummary.balance || 0) >= 0 ? '#28a745' : '#dc3545'
                }}>
                  {dailySummary.balance?.toFixed(2) || '0.00'} zł
                </h4>
                <p style={{ 
                  margin: '0.25rem 0 0 0', 
                  fontSize: '0.8rem', 
                  color: '#6c757d'
                }}>
                  Bilans dnia
                </p>
              </div>
            </div>
          )}

          {monthlyStats && (
            <div style={{ 
              flex: '1', 
              minWidth: '300px',
              padding: '1.5rem',
              backgroundColor: 'white',
              border: '1px solid #e9ecef',
              borderRadius: '0.5rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '1rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid #e9ecef'
              }}>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  backgroundColor: '#fff3cd',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '0.75rem'
                }}>
                  <i className="fas fa-calendar-alt" style={{ color: '#ffc107', fontSize: '1rem' }}></i>
                </div>
                <h5 style={{ margin: 0, fontWeight: '600', color: '#212529' }}>
                  Statystyki Miesięczne
                </h5>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.5rem', 
                    fontWeight: '700',
                    color: '#0d6efd'
                  }}>
                    {monthlyStats.total_transactions || 0}
                  </h3>
                  <p style={{ 
                    margin: '0.25rem 0 0 0', 
                    fontSize: '0.8rem', 
                    color: '#6c757d'
                  }}>
                    Transakcji
                  </p>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.5rem', 
                    fontWeight: '700',
                    color: '#28a745'
                  }}>
                    {monthlyStats.total_amount?.toFixed(2) || '0.00'} zł
                  </h3>
                  <p style={{ 
                    margin: '0.25rem 0 0 0', 
                    fontSize: '0.8rem', 
                    color: '#6c757d'
                  }}>
                    Obrót
                  </p>
                </div>
              </div>
              <div style={{ 
                textAlign: 'center', 
                paddingTop: '0.75rem',
                borderTop: '1px solid #e9ecef'
              }}>
                <h4 style={{ 
                  margin: 0, 
                  fontSize: '1.25rem', 
                  fontWeight: '700',
                  color: '#17a2b8'
                }}>
                  {monthlyStats.avg_transaction?.toFixed(2) || '0.00'} zł
                </h4>
                <p style={{ 
                  margin: '0.25rem 0 0 0', 
                  fontSize: '0.8rem', 
                  color: '#6c757d'
                }}>
                  Średnia transakcja
                </p>
              </div>
            </div>
          )}
        </div>

        {/* System tabs dla różnych widoków */}
        <div style={{ 
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.5rem',
          overflow: 'hidden',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
        }}>
          {/* Tab navigation */}
          <div style={{ 
            display: 'flex',
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa'
          }}>
            {[
              { id: 'overview', label: 'Przegląd', icon: 'fas fa-chart-line' },
              { id: 'payments', label: 'Płatności', icon: 'fas fa-credit-card' },
              { id: 'all-operations', label: 'Wszystkie operacje', icon: 'fas fa-list-ul' },
              { id: 'kp', label: 'Dokumenty KP', icon: 'fas fa-plus-circle' },
              { id: 'kw', label: 'Dokumenty KW', icon: 'fas fa-minus-circle' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.875rem 1.25rem',
                  border: 'none',
                  backgroundColor: activeTab === tab.id ? 'white' : 'transparent',
                  borderBottom: activeTab === tab.id ? '2px solid #0d6efd' : '2px solid transparent',
                  color: activeTab === tab.id ? '#0d6efd' : '#6c757d',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: activeTab === tab.id ? '600' : '400',
                  fontSize: '0.875rem',
                  transition: 'all 0.15s ease-in-out'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.color = '#495057';
                    e.target.style.backgroundColor = '#f8f9fa';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.color = '#6c757d';
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <i className={tab.icon} style={{ fontSize: '0.875rem' }}></i>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: '1.5rem' }}>
            {activeTab === 'overview' && (
              <div>
                <h5 style={{ margin: '0 0 1rem 0', fontWeight: '600', color: '#212529' }}>
                  Ostatnie Operacje
                </h5>
                {operacje.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse',
                      fontSize: '0.875rem'
                    }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                          <th style={{ 
                            padding: '0.75rem 0.5rem', 
                            textAlign: 'left', 
                            fontWeight: '600',
                            color: '#495057'
                          }}>Data</th>
                          <th style={{ 
                            padding: '0.75rem 0.5rem', 
                            textAlign: 'left', 
                            fontWeight: '600',
                            color: '#495057'
                          }}>Typ</th>
                          <th style={{ 
                            padding: '0.75rem 0.5rem', 
                            textAlign: 'left', 
                            fontWeight: '600',
                            color: '#495057'
                          }}>Płatność</th>
                          <th style={{ 
                            padding: '0.75rem 0.5rem', 
                            textAlign: 'left', 
                            fontWeight: '600',
                            color: '#495057'
                          }}>Opis</th>
                          <th style={{ 
                            padding: '0.75rem 0.5rem', 
                            textAlign: 'right', 
                            fontWeight: '600',
                            color: '#495057'
                          }}>Kwota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {operacje.map((operacja, index) => {
                          const badge = getOperationTypeBadge(operacja.typ_operacji);
                          return (
                            <tr key={index} style={{ borderBottom: '1px solid #f8f9fa' }}>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                {operacja.data_operacji}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  color: badge.color,
                                  backgroundColor: badge.bg
                                }}>
                                  {badge.text}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <i className={getPaymentTypeIcon(operacja.typ_platnosci)} 
                                     style={{ color: getPaymentTypeColor(operacja.typ_platnosci) }}></i>
                                  <span style={{ textTransform: 'capitalize' }}>
                                    {operacja.typ_platnosci}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                {operacja.opis || '-'}
                              </td>
                              <td style={{ 
                                padding: '0.75rem 0.5rem', 
                                textAlign: 'right',
                                fontWeight: '600',
                                color: operacja.typ_operacji === 'KP' ? '#28a745' : '#dc3545'
                              }}>
                                {operacja.typ_operacji === 'KP' ? '+' : '-'}{formatCurrency(operacja.kwota)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '2rem',
                    color: '#6c757d'
                  }}>
                    <i className="fas fa-inbox fa-3x" style={{ marginBottom: '1rem', opacity: 0.3 }}></i>
                    <p style={{ margin: 0 }}>Brak operacji do wyświetlenia</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'payments' && paymentsByType && (
              <div>
                <h5 style={{ margin: '0 0 1.5rem 0', fontWeight: '600', color: '#212529' }}>
                  Płatności według typu
                </h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {Object.entries(paymentsByType).map(([typ, dane]) => (
                    <div key={typ} style={{
                      padding: '1.25rem',
                      border: '1px solid #e9ecef',
                      borderLeft: `4px solid ${getPaymentTypeColor(typ)}`,
                      borderRadius: '0.375rem',
                      backgroundColor: 'white'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{
                          width: '2.5rem',
                          height: '2.5rem',
                          backgroundColor: `${getPaymentTypeColor(typ)}15`,
                          borderRadius: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '0.75rem'
                        }}>
                          <i className={getPaymentTypeIcon(typ)} 
                             style={{ color: getPaymentTypeColor(typ), fontSize: '1.1rem' }}></i>
                        </div>
                        <div>
                          <h6 style={{ margin: 0, fontWeight: '600', textTransform: 'capitalize' }}>
                            {typ}
                          </h6>
                          <p style={{ margin: 0, fontSize: '0.875rem', color: '#6c757d' }}>
                            Saldo: {formatCurrency(dane.saldo)}
                          </p>
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#d4edda', borderRadius: '0.25rem' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#28a745' }}>
                            {formatCurrency(dane.kp.suma)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                            KP ({dane.kp.liczba})
                          </div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#f8d7da', borderRadius: '0.25rem' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#dc3545' }}>
                            {formatCurrency(dane.kw.suma)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                            KW ({dane.kw.liczba})
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'all-operations' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h5 style={{ margin: 0, fontWeight: '600', color: '#212529' }}>
                    <i className="fas fa-list-ul" style={{ color: '#6c757d', marginRight: '0.5rem' }}></i>
                    Wszystkie operacje ({filteredOperations.length})
                  </h5>
                  
                  {/* Przycisk zaznacz/odznacz wszystkie */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => toggleAllFilters(true)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.75rem',
                        border: '1px solid #28a745',
                        borderRadius: '0.25rem',
                        backgroundColor: '#f8f9fa',
                        color: '#28a745',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Zaznacz wszystkie
                    </button>
                    <button
                      onClick={() => toggleAllFilters(false)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.75rem',
                        border: '1px solid #dc3545',
                        borderRadius: '0.25rem',
                        backgroundColor: '#f8f9fa',
                        color: '#dc3545',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Odznacz wszystkie
                    </button>
                  </div>
                </div>

                {/* Filtry płatności */}
                <div style={{ 
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '0.5rem',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ marginBottom: '0.75rem', fontWeight: '600', color: '#495057', fontSize: '0.875rem' }}>
                    <i className="fas fa-filter" style={{ marginRight: '0.5rem' }}></i>
                    Filtruj według typu płatności:
                  </div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                    gap: '0.75rem'
                  }}>
                    {Object.entries(paymentFilters).map(([paymentType, isChecked]) => (
                      <label 
                        key={paymentType}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem',
                          cursor: 'pointer',
                          padding: '0.5rem',
                          borderRadius: '0.25rem',
                          backgroundColor: isChecked ? getPaymentTypeColor(paymentType) + '15' : 'white',
                          border: `1px solid ${isChecked ? getPaymentTypeColor(paymentType) : '#e9ecef'}`,
                          transition: 'all 0.15s ease-in-out'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePaymentFilter(paymentType)}
                          style={{ 
                            accentColor: getPaymentTypeColor(paymentType),
                            cursor: 'pointer'
                          }}
                        />
                        <i className={getPaymentTypeIcon(paymentType)} 
                           style={{ 
                             color: getPaymentTypeColor(paymentType),
                             fontSize: '0.875rem'
                           }}></i>
                        <span style={{ 
                          textTransform: 'capitalize', 
                          fontSize: '0.875rem',
                          fontWeight: isChecked ? '600' : '400',
                          color: isChecked ? getPaymentTypeColor(paymentType) : '#6c757d'
                        }}>
                          {paymentType}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Tabela z filtrowanymi operacjami */}
                {filteredOperations.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse',
                      fontSize: '0.875rem'
                    }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                          <th style={{ 
                            padding: '0.75rem 0.5rem', 
                            textAlign: 'left', 
                            fontWeight: '600',
                            color: '#495057'
                          }}>Data</th>
                          <th style={{ 
                            padding: '0.75rem 0.5rem', 
                            textAlign: 'left', 
                            fontWeight: '600',
                            color: '#495057'
                          }}>Typ</th>
                          <th style={{ 
                            padding: '0.75rem 0.5rem', 
                            textAlign: 'left', 
                            fontWeight: '600',
                            color: '#495057'
                          }}>Płatność</th>
                          <th style={{ 
                            padding: '0.75rem 0.5rem', 
                            textAlign: 'left', 
                            fontWeight: '600',
                            color: '#495057'
                          }}>Nr dok.</th>
                          <th style={{ 
                            padding: '0.75rem 0.5rem', 
                            textAlign: 'left', 
                            fontWeight: '600',
                            color: '#495057'
                          }}>Kontrahent</th>
                          <th style={{ 
                            padding: '0.75rem 0.5rem', 
                            textAlign: 'left', 
                            fontWeight: '600',
                            color: '#495057'
                          }}>Opis</th>
                          <th style={{ 
                            padding: '0.75rem 0.5rem', 
                            textAlign: 'right', 
                            fontWeight: '600',
                            color: '#495057'
                          }}>Kwota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOperations.map((operacja, index) => {
                          const badge = getOperationTypeBadge(operacja.typ_operacji);
                          return (
                            <tr key={index} style={{ borderBottom: '1px solid #f8f9fa' }}>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                {operacja.data_operacji}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  color: badge.color,
                                  backgroundColor: badge.bg
                                }}>
                                  {badge.text}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <i className={getPaymentTypeIcon(operacja.typ_platnosci)} 
                                     style={{ color: getPaymentTypeColor(operacja.typ_platnosci) }}></i>
                                  <span style={{ textTransform: 'capitalize' }}>
                                    {operacja.typ_platnosci}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                <span style={{ 
                                  fontFamily: 'monospace', 
                                  fontSize: '0.8rem',
                                  backgroundColor: '#f8f9fa',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '0.25rem'
                                }}>
                                  {operacja.numer_dokumentu || '-'}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                {operacja.kontrahent || '-'}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                {operacja.opis || '-'}
                              </td>
                              <td style={{ 
                                padding: '0.75rem 0.5rem', 
                                textAlign: 'right',
                                fontWeight: '600',
                                color: operacja.typ_operacji === 'KP' ? '#28a745' : '#dc3545'
                              }}>
                                {operacja.typ_operacji === 'KP' ? '+' : '-'}{formatCurrency(operacja.kwota)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '2rem',
                    color: '#6c757d'
                  }}>
                    <i className="fas fa-filter fa-3x" style={{ marginBottom: '1rem', opacity: 0.3 }}></i>
                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: '500' }}>
                      {Object.values(paymentFilters).every(v => !v) 
                        ? 'Zaznacz co najmniej jeden typ płatności' 
                        : 'Brak operacji pasujących do wybranych filtrów'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'kp' && (
              <div>
                <h5 style={{ margin: '0 0 1rem 0', fontWeight: '600', color: '#212529' }}>
                  <i className="fas fa-plus-circle" style={{ color: '#28a745', marginRight: '0.5rem' }}></i>
                  Dokumenty KP (Kasa Przyjmie)
                </h5>
                {kpDocuments.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse',
                      fontSize: '0.875rem'
                    }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600', color: '#495057' }}>
                            Data
                          </th>
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600', color: '#495057' }}>
                            Nr dokumentu
                          </th>
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600', color: '#495057' }}>
                            Płatność
                          </th>
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600', color: '#495057' }}>
                            Kontrahent
                          </th>
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600', color: '#495057' }}>
                            Opis
                          </th>
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: '600', color: '#495057' }}>
                            Kwota
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {kpDocuments.map((doc, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #f8f9fa' }}>
                            <td style={{ padding: '0.75rem 0.5rem' }}>
                              {doc.data_operacji}
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem' }}>
                              <span style={{ 
                                fontFamily: 'monospace', 
                                fontSize: '0.8rem',
                                backgroundColor: '#f8f9fa',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem'
                              }}>
                                {doc.numer_dokumentu || '-'}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <i className={getPaymentTypeIcon(doc.typ_platnosci)} 
                                   style={{ color: getPaymentTypeColor(doc.typ_platnosci) }}></i>
                                <span style={{ textTransform: 'capitalize' }}>
                                  {doc.typ_platnosci}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem' }}>
                              {doc.kontrahent || '-'}
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem' }}>
                              {doc.opis || '-'}
                            </td>
                            <td style={{ 
                              padding: '0.75rem 0.5rem', 
                              textAlign: 'right',
                              fontWeight: '600',
                              color: '#28a745'
                            }}>
                              +{formatCurrency(doc.kwota)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '2rem',
                    color: '#6c757d'
                  }}>
                    <i className="fas fa-plus-circle fa-3x" style={{ marginBottom: '1rem', opacity: 0.3, color: '#28a745' }}></i>
                    <p style={{ margin: 0 }}>Brak dokumentów KP do wyświetlenia</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'kw' && (
              <div>
                <h5 style={{ margin: '0 0 1rem 0', fontWeight: '600', color: '#212529' }}>
                  <i className="fas fa-minus-circle" style={{ color: '#dc3545', marginRight: '0.5rem' }}></i>
                  Dokumenty KW (Kasa Wydaje)
                </h5>
                {kwDocuments.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse',
                      fontSize: '0.875rem'
                    }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600', color: '#495057' }}>
                            Data
                          </th>
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600', color: '#495057' }}>
                            Nr dokumentu
                          </th>
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600', color: '#495057' }}>
                            Płatność
                          </th>
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600', color: '#495057' }}>
                            Kontrahent
                          </th>
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600', color: '#495057' }}>
                            Opis
                          </th>
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: '600', color: '#495057' }}>
                            Kwota
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {kwDocuments.map((doc, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #f8f9fa' }}>
                            <td style={{ padding: '0.75rem 0.5rem' }}>
                              {doc.data_operacji}
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem' }}>
                              <span style={{ 
                                fontFamily: 'monospace', 
                                fontSize: '0.8rem',
                                backgroundColor: '#f8f9fa',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem'
                              }}>
                                {doc.numer_dokumentu || '-'}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <i className={getPaymentTypeIcon(doc.typ_platnosci)} 
                                   style={{ color: getPaymentTypeColor(doc.typ_platnosci) }}></i>
                                <span style={{ textTransform: 'capitalize' }}>
                                  {doc.typ_platnosci}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem' }}>
                              {doc.kontrahent || '-'}
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem' }}>
                              {doc.opis || '-'}
                            </td>
                            <td style={{ 
                              padding: '0.75rem 0.5rem', 
                              textAlign: 'right',
                              fontWeight: '600',
                              color: '#dc3545'
                            }}>
                              -{formatCurrency(doc.kwota)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '2rem',
                    color: '#6c757d'
                  }}>
                    <i className="fas fa-minus-circle fa-3x" style={{ marginBottom: '1rem', opacity: 0.3, color: '#dc3545' }}></i>
                    <p style={{ margin: 0 }}>Brak dokumentów KW do wyświetlenia</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KasaBankPage;
