import React, { useState } from 'react';

const OrdersList = ({
  orders = [],
  loading = false,
  pagination = { page: 1, limit: 20, total: 0, pages: 0 },
  filters = {},
  onFilterChange,
  onPageChange,
  onViewOrder,
  onEditOrder,
  onDeleteOrder,
  onStatusChange,
  getStatusColor,
  getStatusLabel
}) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    onFilterChange(localFilters);
  };

  const handleFilterChange = (field, value) => {
    setLocalFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    const emptyFilters = { status: '', search: '', customer_id: '', location_id: '', page: 1 };
    setLocalFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    if (!price) return '0,00 zł';
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN'
    }).format(price);
  };

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e9ecef', overflow: 'hidden' }}>
      {/* Filtry */}
      <div style={{ padding: '1rem', borderBottom: '1px solid #e9ecef', backgroundColor: '#f8f9fa' }}>
        <form onSubmit={handleFilterSubmit} className="row g-3">
          <div className="col-md-3">
            <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: '500' }}>
              <i className="fas fa-search me-1"></i>
              Szukaj
            </label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Numer zamówienia, klient..."
              value={localFilters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          
          <div className="col-md-2">
            <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: '500' }}>
              <i className="fas fa-flag me-1"></i>
              Status
            </label>
            <select
              className="form-select form-select-sm"
              value={localFilters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">Wszystkie</option>
              <option value="pending">Oczekujące</option>
              <option value="processing">W realizacji</option>
              <option value="completed">Zrealizowane</option>
              <option value="cancelled">Anulowane</option>
            </select>
          </div>

          <div className="col-md-2">
            <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: '500' }}>
              <i className="fas fa-map-marker-alt me-1"></i>
              Lokalizacja
            </label>
            <select
              className="form-select form-select-sm"
              value={localFilters.location_id || ''}
              onChange={(e) => handleFilterChange('location_id', e.target.value)}
            >
              <option value="">Wszystkie</option>
              <option value="1">Główna</option>
              <option value="2">Filia 1</option>
              <option value="3">Filia 2</option>
            </select>
          </div>

          <div className="col-md-3 d-flex align-items-end gap-2">
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              <i className="fas fa-search me-1"></i>
              Filtruj
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={clearFilters}>
              <i className="fas fa-times me-1"></i>
              Wyczyść
            </button>
          </div>

          <div className="col-md-2 d-flex align-items-end">
            <small className="text-muted">
              Znaleziono: <strong>{pagination.total}</strong> zamówień
            </small>
          </div>
        </form>
      </div>

      {/* Tabela zamówień */}
      <div style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Ładowanie...</span>
            </div>
            <p className="mt-2 text-muted">Ładowanie zamówień...</p>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', color: '#e9ecef', marginBottom: '1rem' }}>
              <i className="fas fa-shopping-cart"></i>
            </div>
            <h5 style={{ color: '#6c757d' }}>Brak zamówień</h5>
            <p style={{ color: '#6c757d' }}>Nie znaleziono zamówień spełniających kryteria</p>
          </div>
        ) : (
          <table className="table table-hover mb-0">
            <thead style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
              <tr>
                <th style={{ fontSize: '0.875rem', fontWeight: '600', padding: '0.75rem' }}>
                  <i className="fas fa-hashtag me-1"></i>
                  Numer
                </th>
                <th style={{ fontSize: '0.875rem', fontWeight: '600', padding: '0.75rem' }}>
                  <i className="fas fa-user me-1"></i>
                  Klient
                </th>
                <th style={{ fontSize: '0.875rem', fontWeight: '600', padding: '0.75rem' }}>
                  <i className="fas fa-calendar me-1"></i>
                  Data
                </th>
                <th style={{ fontSize: '0.875rem', fontWeight: '600', padding: '0.75rem' }}>
                  <i className="fas fa-flag me-1"></i>
                  Status
                </th>
                <th style={{ fontSize: '0.875rem', fontWeight: '600', padding: '0.75rem' }}>
                  <i className="fas fa-box me-1"></i>
                  Pozycje
                </th>
                <th style={{ fontSize: '0.875rem', fontWeight: '600', padding: '0.75rem' }}>
                  <i className="fas fa-money-bill me-1"></i>
                  Wartość
                </th>
                <th style={{ fontSize: '0.875rem', fontWeight: '600', padding: '0.75rem' }}>
                  <i className="fas fa-cogs me-1"></i>
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                  <td style={{ padding: '0.75rem', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: '600', color: '#495057' }}>
                      {order.numer_zamowienia}
                    </div>
                    <small style={{ color: '#6c757d' }}>ID: {order.id}</small>
                  </td>
                  
                  <td style={{ padding: '0.75rem', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: '500' }}>
                      {order.nazwa_firmy || `${order.imie || ''} ${order.nazwisko || ''}`.trim() || 'Nieznany klient'}
                    </div>
                    {order.email && (
                      <small style={{ color: '#6c757d' }}>
                        <i className="fas fa-envelope me-1"></i>
                        {order.email}
                      </small>
                    )}
                    {order.telefon && (
                      <div>
                        <small style={{ color: '#6c757d' }}>
                          <i className="fas fa-phone me-1"></i>
                          {order.telefon}
                        </small>
                      </div>
                    )}
                  </td>
                  
                  <td style={{ padding: '0.75rem', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: '0.875rem' }}>{formatDate(order.data_zamowienia)}</div>
                    {order.data_realizacji && (
                      <small style={{ color: '#28a745' }}>
                        <i className="fas fa-check me-1"></i>
                        Zrealizowano: {formatDate(order.data_realizacji)}
                      </small>
                    )}
                  </td>
                  
                  <td style={{ padding: '0.75rem', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <select
                        className="form-select form-select-sm"
                        style={{
                          backgroundColor: getStatusColor(order.status),
                          color: 'white',
                          border: 'none',
                          fontWeight: '500',
                          fontSize: '0.8rem'
                        }}
                        value={order.status}
                        onChange={(e) => onStatusChange(order.id, e.target.value)}
                      >
                        <option value="pending">Oczekujące</option>
                        <option value="processing">W realizacji</option>
                        <option value="completed">Zrealizowane</option>
                        <option value="cancelled">Anulowane</option>
                      </select>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem' }}>
                      {order.typ_realizacji === 'do_odbioru' && <><i className="fas fa-store me-1"></i>Do odbioru</>}
                      {order.typ_realizacji === 'dostawa' && <><i className="fas fa-truck me-1"></i>Dostawa</>}
                      {order.typ_realizacji === 'na_miejscu' && <><i className="fas fa-utensils me-1"></i>Na miejscu</>}
                    </div>
                  </td>
                  
                  <td style={{ padding: '0.75rem', verticalAlign: 'middle' }}>
                    <div style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#e7f1ff',
                      color: '#0d6efd',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}>
                      {order.liczba_pozycji || 0}
                    </div>
                  </td>
                  
                  <td style={{ padding: '0.75rem', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                      {formatPrice(order.wartosc_brutto)}
                    </div>
                    <small style={{ color: '#6c757d' }}>
                      netto: {formatPrice(order.wartosc_netto)}
                    </small>
                  </td>
                  
                  <td style={{ padding: '0.75rem', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => onViewOrder(order)}
                        title="Zobacz szczegóły"
                        style={{ fontSize: '0.75rem' }}
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                      
                      <button
                        className="btn btn-outline-warning btn-sm"
                        onClick={() => onEditOrder(order)}
                        title="Edytuj"
                        style={{ fontSize: '0.75rem' }}
                        disabled={order.status === 'completed'}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => onDeleteOrder(order.id)}
                        title="Usuń"
                        style={{ fontSize: '0.75rem' }}
                        disabled={order.status === 'completed'}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginacja */}
      {pagination.pages > 1 && (
        <div style={{ padding: '1rem', borderTop: '1px solid #e9ecef', backgroundColor: '#f8f9fa' }}>
          <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
              Strona {pagination.page} z {pagination.pages} 
              ({pagination.total} zamówień)
            </div>
            
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${pagination.page <= 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => onPageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                </li>
                
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  const page = Math.max(1, pagination.page - 2) + i;
                  if (page > pagination.pages) return null;
                  
                  return (
                    <li key={page} className={`page-item ${page === pagination.page ? 'active' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => onPageChange(page)}
                      >
                        {page}
                      </button>
                    </li>
                  );
                })}
                
                <li className={`page-item ${pagination.page >= pagination.pages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => onPageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersList;
