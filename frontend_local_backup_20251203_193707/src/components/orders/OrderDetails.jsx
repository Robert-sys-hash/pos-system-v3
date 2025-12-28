import React, { useState, useEffect } from 'react';
import { orderService } from '../../services/orderService';
import { useLocation } from '../../contexts/LocationContext';

const OrderDetails = ({ 
  order, 
  onClose, 
  onEdit, 
  onStatusChange, 
  getStatusColor, 
  getStatusLabel 
}) => {
  const { availableLocations } = useLocation();
  const [loading, setLoading] = useState(false);
  const [generatingReceipt, setGeneratingReceipt] = useState(false);
  const [fullOrderData, setFullOrderData] = useState(order);

  // Debug log
  console.log('🏷️ OrderDetails received order:', order);
  console.log('📋 Order pozycje:', order?.pozycje);
  console.log('📊 Pozycje length:', order?.pozycje?.length);

  // Pobierz pełne szczegóły zamówienia jeśli nie ma pozycji
  useEffect(() => {
    const loadFullOrderData = async () => {
      if (!order?.pozycje || order.pozycje.length === 0) {
        console.log('🔄 Loading full order data for ID:', order.id);
        try {
          setLoading(true);
          const result = await orderService.getOrder(order.id);
          if (result.success) {
            console.log('✅ Full order data loaded:', result.data);
            setFullOrderData(result.data);
          } else {
            console.error('❌ Failed to load order data:', result.error);
          }
        } catch (error) {
          console.error('❌ Error loading order data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    if (order?.id) {
      loadFullOrderData();
    }
  }, [order?.id]);

  // Użyj pełnych danych jeśli są dostępne
  const orderData = fullOrderData || order;

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

  const handleStatusChange = async (newStatus) => {
    try {
      setLoading(true);
      await onStatusChange(orderData.id, newStatus);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReceipt = async () => {
    try {
      setGeneratingReceipt(true);
      
      // Konwertuj zamówienie na transakcję POS
      const response = await fetch(`/api/orders/${orderData.id}/convert-to-pos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Pokaż komunikat sukcesu
        alert(`✅ ${result.message}\n\nTransakcja ID: ${result.data.transaction_id}\nPozycje: ${result.data.items_converted}\nKwota: ${result.data.suma_brutto.toFixed(2)} zł`);
        
        // Przekieruj do systemu POS z nową transakcją
        window.location.href = `/pos?transaction_id=${result.data.transaction_id}`;
        
      } else {
        alert('❌ Błąd konwersji zamówienia: ' + result.error);
      }
    } catch (error) {
      alert('❌ Wystąpił błąd podczas konwersji zamówienia');
      console.error('Error converting order to POS:', error);
    } finally {
      setGeneratingReceipt(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fas fa-shopping-cart me-2"></i>
              Szczegóły zamówienia {orderData.numer_zamowienia}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          <div className="modal-body">
            <div className="row g-4">
              {/* Informacje podstawowe */}
              <div className="col-md-6">
                <div className="card h-100">
                  <div className="card-header">
                    <h6 className="card-title mb-0">
                      <i className="fas fa-info-circle me-2"></i>
                      Informacje podstawowe
                    </h6>
                  </div>
                  <div className="card-body">
                    <dl className="row">
                      <dt className="col-sm-4">Numer:</dt>
                      <dd className="col-sm-8">
                        <span className="badge bg-primary">{orderData.numer_zamowienia}</span>
                      </dd>
                      
                      <dt className="col-sm-4">Status:</dt>
                      <dd className="col-sm-8">
                        <select
                          className="form-select form-select-sm"
                          style={{
                            backgroundColor: getStatusColor(orderData.status),
                            color: 'white'
                          }}
                          value={orderData.status}
                          onChange={(e) => handleStatusChange(e.target.value)}
                          disabled={loading}
                        >
                          <option value="pending">Oczekujące</option>
                          <option value="processing">W realizacji</option>
                          <option value="completed">Zrealizowane</option>
                          <option value="cancelled">Anulowane</option>
                        </select>
                      </dd>
                      
                      <dt className="col-sm-4">Data zamówienia:</dt>
                      <dd className="col-sm-8">{formatDate(orderData.data_zamowienia)}</dd>
                      
                      {order.data_realizacji && (
                        <>
                          <dt className="col-sm-4">Data realizacji:</dt>
                          <dd className="col-sm-8">
                            <span className="text-success">
                              <i className="fas fa-check me-1"></i>
                              {formatDate(order.data_realizacji)}
                            </span>
                          </dd>
                        </>
                      )}
                      
                      <dt className="col-sm-4">Typ realizacji:</dt>
                      <dd className="col-sm-8">
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
                      </dd>
                      
                      <dt className="col-sm-4">Lokalizacja:</dt>
                      <dd className="col-sm-8">
                        <i className="fas fa-map-marker-alt me-1"></i>
                        {availableLocations.find(loc => loc.id === order.location_id)?.nazwa || `Lokalizacja ID: ${order.location_id}`}
                      </dd>
                    </dl>
                    
                    {order.uwagi && (
                      <div className="mt-3">
                        <h6>Uwagi:</h6>
                        <div className="alert alert-light">
                          <i className="fas fa-comment me-2"></i>
                          {order.uwagi}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dane klienta */}
              <div className="col-md-6">
                <div className="card h-100">
                  <div className="card-header">
                    <h6 className="card-title mb-0">
                      <i className="fas fa-user me-2"></i>
                      Dane klienta
                    </h6>
                  </div>
                  <div className="card-body">
                    <dl className="row">
                      <dt className="col-sm-4">Nazwa/Imię:</dt>
                      <dd className="col-sm-8">
                        <strong>
                          {order.nazwa_firmy || 
                           `${order.imie || ''} ${order.nazwisko || ''}`.trim() || 
                           'Nieznany klient'}
                        </strong>
                      </dd>
                      
                      <dt className="col-sm-4">Typ klienta:</dt>
                      <dd className="col-sm-8">
                        <span className="badge bg-secondary">
                          {order.typ_klienta === 'osoba_fizyczna' ? 'Osoba fizyczna' : 'Firma'}
                        </span>
                      </dd>
                      
                      {order.email && (
                        <>
                          <dt className="col-sm-4">Email:</dt>
                          <dd className="col-sm-8">
                            <a href={`mailto:${order.email}`} className="text-decoration-none">
                              <i className="fas fa-envelope me-1"></i>
                              {order.email}
                            </a>
                          </dd>
                        </>
                      )}
                      
                      {order.telefon && (
                        <>
                          <dt className="col-sm-4">Telefon:</dt>
                          <dd className="col-sm-8">
                            <a href={`tel:${order.telefon}`} className="text-decoration-none">
                              <i className="fas fa-phone me-1"></i>
                              {order.telefon}
                            </a>
                          </dd>
                        </>
                      )}
                      
                      {(order.adres || order.miasto || order.kod_pocztowy) && (
                        <>
                          <dt className="col-sm-4">Adres:</dt>
                          <dd className="col-sm-8">
                            <i className="fas fa-map-marker-alt me-1"></i>
                            {[order.adres, order.kod_pocztowy, order.miasto]
                              .filter(Boolean)
                              .join(', ')}
                          </dd>
                        </>
                      )}
                      
                      {order.nip && (
                        <>
                          <dt className="col-sm-4">NIP:</dt>
                          <dd className="col-sm-8">{order.nip}</dd>
                        </>
                      )}
                    </dl>
                  </div>
                </div>
              </div>

              {/* Pozycje zamówienia */}
              <div className="col-12">
                <div className="card">
                  <div className="card-header">
                    <h6 className="card-title mb-0">
                      <i className="fas fa-box me-2"></i>
                      Pozycje zamówienia ({orderData.pozycje?.length || 0})
                    </h6>
                  </div>
                  <div className="card-body p-0">
                    {!orderData.pozycje || orderData.pozycje.length === 0 ? (
                      <div className="text-center py-4 text-muted">
                        <i className="fas fa-box-open fa-2x mb-2"></i>
                        <p>Brak pozycji w zamówieniu</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead className="table-light">
                            <tr>
                              <th style={{ width: '5%' }}>#</th>
                              <th style={{ width: '45%' }}>Produkt</th>
                              <th style={{ width: '10%' }}>Ilość</th>
                              <th style={{ width: '15%' }}>Cena jedn.</th>
                              <th style={{ width: '15%' }}>Wartość</th>
                              <th style={{ width: '10%' }}>VAT</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orderData.pozycje.map((pozycja, index) => (
                              <tr key={index}>
                                <td className="text-muted">
                                  {pozycja.pozycja || (index + 1)}
                                </td>
                                <td>
                                  <div>
                                    <strong>{pozycja.produkt_nazwa}</strong>
                                    {pozycja.ean && (
                                      <div>
                                        <small className="text-muted">EAN: {pozycja.ean}</small>
                                      </div>
                                    )}
                                    {pozycja.kod_produktu && (
                                      <div>
                                        <small className="text-muted">Kod: {pozycja.kod_produktu}</small>
                                      </div>
                                    )}
                                    {pozycja.uwagi && (
                                      <div>
                                        <small className="text-info">
                                          <i className="fas fa-comment me-1"></i>
                                          {pozycja.uwagi}
                                        </small>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <span className="badge bg-light text-dark">
                                    {pozycja.ilosc} {pozycja.jednostka || 'szt'}
                                  </span>
                                </td>
                                <td>
                                  <div>{formatPrice(pozycja.cena_jednostkowa)}</div>
                                  <small className="text-muted">
                                    netto: {formatPrice((pozycja.cena_jednostkowa || 0) / (1 + ((pozycja.stawka_vat || 23) / 100)))}
                                  </small>
                                </td>
                                <td>
                                  <div className="fw-bold">{formatPrice(pozycja.wartosc_brutto)}</div>
                                  <small className="text-muted">
                                    netto: {formatPrice(pozycja.wartosc_netto)}
                                  </small>
                                </td>
                                <td>
                                  <span className="badge bg-warning text-dark">
                                    {pozycja.stawka_vat || 23}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="table-light">
                            <tr>
                              <th colSpan="4">RAZEM:</th>
                              <th>
                                <div className="fw-bold text-primary">
                                  {formatPrice(orderData.wartosc_brutto)}
                                </div>
                                <small className="text-muted">
                                  netto: {formatPrice(orderData.wartosc_netto)}
                                </small>
                              </th>
                              <th>
                                <small className="text-muted">
                                  VAT: {formatPrice(orderData.wartosc_brutto - orderData.wartosc_netto)}
                                </small>
                              </th>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Historia */}
              <div className="col-12">
                <div className="card">
                  <div className="card-header">
                    <h6 className="card-title mb-0">
                      <i className="fas fa-history me-2"></i>
                      Historia zamówienia
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="timeline">
                      <div className="timeline-item">
                        <div className="timeline-marker bg-primary"></div>
                        <div className="timeline-content">
                          <h6 className="timeline-title">Zamówienie utworzone</h6>
                          <p className="timeline-time">
                            <i className="fas fa-clock me-1"></i>
                            {formatDate(order.data_utworzenia)}
                          </p>
                          <p className="text-muted">
                            Utworzył: {order.utworzony_przez || 'System'}
                          </p>
                        </div>
                      </div>
                      
                      {order.data_modyfikacji && order.data_modyfikacji !== order.data_utworzenia && (
                        <div className="timeline-item">
                          <div className="timeline-marker bg-warning"></div>
                          <div className="timeline-content">
                            <h6 className="timeline-title">Zamówienie zmodyfikowane</h6>
                            <p className="timeline-time">
                              <i className="fas fa-clock me-1"></i>
                              {formatDate(order.data_modyfikacji)}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {order.data_realizacji && (
                        <div className="timeline-item">
                          <div className="timeline-marker bg-success"></div>
                          <div className="timeline-content">
                            <h6 className="timeline-title">Zamówienie zrealizowane</h6>
                            <p className="timeline-time">
                              <i className="fas fa-clock me-1"></i>
                              {formatDate(order.data_realizacji)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              <i className="fas fa-times me-1"></i>
              Zamknij
            </button>
            
            <button
              type="button"
              className="btn btn-info"
              onClick={handleGenerateReceipt}
              disabled={generatingReceipt}
            >
              {generatingReceipt ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Generowanie...
                </>
              ) : (
                <>
                  <i className="fas fa-receipt me-1"></i>
                  Paragon
                </>
              )}
            </button>
            
            {order.status !== 'completed' && (
              <button type="button" className="btn btn-warning" onClick={onEdit}>
                <i className="fas fa-edit me-1"></i>
                Edytuj
              </button>
            )}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .timeline {
          position: relative;
          padding-left: 30px;
        }
        
        .timeline::before {
          content: '';
          position: absolute;
          left: 15px;
          top: 0;
          bottom: 0;
          width: 2px;
          background-color: #e9ecef;
        }
        
        .timeline-item {
          position: relative;
          margin-bottom: 20px;
        }
        
        .timeline-marker {
          position: absolute;
          left: -22px;
          top: 0;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid white;
        }
        
        .timeline-content {
          padding-left: 20px;
        }
        
        .timeline-title {
          margin-bottom: 5px;
          font-size: 0.9rem;
        }
        
        .timeline-time {
          margin-bottom: 5px;
          font-size: 0.8rem;
          color: #6c757d;
        }
      `}</style>
    </div>
  );
};

export default OrderDetails;
