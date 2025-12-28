import React, { useState, useEffect } from 'react';
import { orderService } from '../../services/orderService';

const OrderStats = () => {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    cancelled: 0,
    revenue: 0,
    averageValue: 0,
    topProducts: [],
    recentOrders: [],
    monthlyTrend: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('today');

  useEffect(() => {
    loadStats();
  }, [timeframe]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await orderService.getStats(timeframe);
      if (response.success) {
        setStats(response.data);
      } else {
        setError(response.error || 'Nie udało się załadować statystyk');
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      setError('Wystąpił błąd podczas ładowania statystyk');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    if (!price) return '0,00 zł';
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN'
    }).format(price);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      processing: '#17a2b8',
      completed: '#28a745',
      cancelled: '#dc3545'
    };
    return colors[status] || '#6c757d';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: 'fa-clock',
      processing: 'fa-cog fa-spin',
      completed: 'fa-check-circle',
      cancelled: 'fa-times-circle'
    };
    return icons[status] || 'fa-question-circle';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Oczekujące',
      processing: 'W realizacji',
      completed: 'Zrealizowane',
      cancelled: 'Anulowane'
    };
    return labels[status] || 'Nieznany';
  };

  const calculatePercentage = (value, total) => {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  };

  const getTimeframeLabel = (tf) => {
    const labels = {
      today: 'Dzisiaj',
      week: 'Ten tydzień',
      month: 'Ten miesiąc',
      quarter: 'Ten kwartał',
      year: 'Ten rok'
    };
    return labels[tf] || tf;
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Ładowanie...</span>
        </div>
        <p className="mt-2">Ładowanie statystyk...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <i className="fas fa-exclamation-triangle me-2"></i>
        {error}
        <button className="btn btn-outline-danger btn-sm ms-2" onClick={loadStats}>
          <i className="fas fa-redo me-1"></i>
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  return (
    <div className="orders-stats">
      {/* Filtry czasowe */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h6 className="card-title mb-3">
                <i className="fas fa-calendar-alt me-2"></i>
                Okres
              </h6>
              <div className="btn-group" role="group">
                {['today', 'week', 'month', 'quarter', 'year'].map(tf => (
                  <button
                    key={tf}
                    type="button"
                    className={`btn btn-sm ${timeframe === tf ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setTimeframe(tf)}
                  >
                    {getTimeframeLabel(tf)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h6 className="card-title mb-3">
                <i className="fas fa-refresh me-2"></i>
                Aktualizacja
              </h6>
              <button className="btn btn-outline-primary btn-sm" onClick={loadStats}>
                <i className="fas fa-sync-alt me-1"></i>
                Odśwież dane
              </button>
              <small className="text-muted ms-3">
                Ostatnia aktualizacja: {new Date().toLocaleTimeString('pl-PL')}
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Główne statystyki */}
      <div className="row g-3 mb-4">
        <div className="col-lg-3 col-md-6">
          <div className="card stats-card bg-primary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h3 className="mb-0">{stats.total}</h3>
                  <p className="mb-0">Łącznie zamówień</p>
                </div>
                <div className="stats-icon">
                  <i className="fas fa-shopping-cart fa-2x"></i>
                </div>
              </div>
              <div className="mt-2">
                <small>
                  <i className="fas fa-chart-line me-1"></i>
                  {getTimeframeLabel(timeframe)}
                </small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6">
          <div className="card stats-card bg-success text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h3 className="mb-0">{formatPrice(stats.revenue)}</h3>
                  <p className="mb-0">Przychód</p>
                </div>
                <div className="stats-icon">
                  <i className="fas fa-money-bill-wave fa-2x"></i>
                </div>
              </div>
              <div className="mt-2">
                <small>
                  <i className="fas fa-calculator me-1"></i>
                  Średnia: {formatPrice(stats.averageValue)}
                </small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6">
          <div className="card stats-card bg-info text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h3 className="mb-0">{stats.processing}</h3>
                  <p className="mb-0">W realizacji</p>
                </div>
                <div className="stats-icon">
                  <i className="fas fa-cog fa-2x fa-spin"></i>
                </div>
              </div>
              <div className="mt-2">
                <small>
                  <i className="fas fa-percentage me-1"></i>
                  {calculatePercentage(stats.processing, stats.total)}% z wszystkich
                </small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6">
          <div className="card stats-card bg-warning text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h3 className="mb-0">{stats.pending}</h3>
                  <p className="mb-0">Oczekujące</p>
                </div>
                <div className="stats-icon">
                  <i className="fas fa-clock fa-2x"></i>
                </div>
              </div>
              <div className="mt-2">
                <small>
                  <i className="fas fa-exclamation-triangle me-1"></i>
                  Wymagają uwagi
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Rozkład statusów */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header">
              <h6 className="card-title mb-0">
                <i className="fas fa-chart-pie me-2"></i>
                Rozkład statusów
              </h6>
            </div>
            <div className="card-body">
              {stats.total === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="fas fa-chart-pie fa-3x mb-3"></i>
                  <p>Brak zamówień w wybranym okresie</p>
                </div>
              ) : (
                <div className="status-breakdown">
                  {['pending', 'processing', 'completed', 'cancelled'].map(status => {
                    const count = stats[status] || 0;
                    const percentage = calculatePercentage(count, stats.total);
                    
                    return (
                      <div key={status} className="status-item mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span>
                            <i className={`fas ${getStatusIcon(status)} me-2`} 
                               style={{ color: getStatusColor(status) }}></i>
                            {getStatusLabel(status)}
                          </span>
                          <span className="fw-bold">{count} ({percentage}%)</span>
                        </div>
                        <div className="progress" style={{ height: '6px' }}>
                          <div
                            className="progress-bar"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: getStatusColor(status)
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Najlepsze produkty */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header">
              <h6 className="card-title mb-0">
                <i className="fas fa-trophy me-2"></i>
                Najczęściej zamawiane produkty
              </h6>
            </div>
            <div className="card-body">
              {!stats.topProducts || stats.topProducts.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="fas fa-trophy fa-3x mb-3"></i>
                  <p>Brak danych o produktach</p>
                </div>
              ) : (
                <div className="top-products">
                  {stats.topProducts.slice(0, 5).map((product, index) => (
                    <div key={index} className="product-item d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <div className="fw-bold">{product.nazwa}</div>
                        <small className="text-muted">
                          {product.total_quantity} szt. • {formatPrice(product.total_value)}
                        </small>
                      </div>
                      <div className="text-end">
                        <span className="badge bg-primary">{index + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ostatnie zamówienia */}
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title mb-0">
                <i className="fas fa-history me-2"></i>
                Ostatnie zamówienia
              </h6>
            </div>
            <div className="card-body">
              {!stats.recentOrders || stats.recentOrders.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="fas fa-history fa-3x mb-3"></i>
                  <p>Brak ostatnich zamówień</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Numer</th>
                        <th>Klient</th>
                        <th>Data</th>
                        <th>Status</th>
                        <th>Wartość</th>
                        <th>Typ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentOrders.slice(0, 10).map((order, index) => (
                        <tr key={index}>
                          <td>
                            <span className="badge bg-primary">{order.numer_zamowienia}</span>
                          </td>
                          <td>
                            <div>
                              <strong>
                                {order.nazwa_firmy || 
                                 `${order.imie || ''} ${order.nazwisko || ''}`.trim() || 
                                 'Nieznany klient'}
                              </strong>
                              {order.email && (
                                <div>
                                  <small className="text-muted">{order.email}</small>
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="text-muted">{formatDate(order.data_zamowienia)}</span>
                          </td>
                          <td>
                            <span
                              className="badge"
                              style={{
                                backgroundColor: getStatusColor(order.status),
                                color: 'white'
                              }}
                            >
                              <i className={`fas ${getStatusIcon(order.status)} me-1`}></i>
                              {getStatusLabel(order.status)}
                            </span>
                          </td>
                          <td>
                            <strong>{formatPrice(order.wartosc_brutto)}</strong>
                          </td>
                          <td>
                            {order.typ_realizacji === 'do_odbioru' && (
                              <span className="badge bg-info">
                                <i className="fas fa-store me-1"></i>Do odbioru
                              </span>
                            )}
                            {order.typ_realizacji === 'dostawa' && (
                              <span className="badge bg-warning">
                                <i className="fas fa-truck me-1"></i>Dostawa
                              </span>
                            )}
                            {order.typ_realizacji === 'na_miejscu' && (
                              <span className="badge bg-success">
                                <i className="fas fa-utensils me-1"></i>Na miejscu
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .stats-card {
          transition: transform 0.2s;
        }
        
        .stats-card:hover {
          transform: translateY(-2px);
        }
        
        .stats-icon {
          opacity: 0.8;
        }
        
        .status-breakdown .progress {
          border-radius: 10px;
        }
        
        .product-item {
          padding: 10px;
          border-radius: 8px;
          background-color: #f8f9fa;
        }
        
        .product-item:hover {
          background-color: #e9ecef;
        }
      `}</style>
    </div>
  );
};

export default OrderStats;
