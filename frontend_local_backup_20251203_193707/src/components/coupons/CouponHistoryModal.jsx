import React, { useState, useEffect } from 'react';
import { couponService } from '../../services/couponService';

const CouponHistoryModal = ({ couponId, isOpen, onClose }) => {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && couponId) {
      fetchCouponHistory();
    }
  }, [isOpen, couponId]);

  const fetchCouponHistory = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await couponService.getCouponHistory(couponId);
      setHistory(response.data);
    } catch (err) {
      setError('Błąd podczas pobierania historii kuponu');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pl-PL');
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return `${parseFloat(amount).toFixed(2)} zł`;
  };

  const getStatusBadge = (coupon) => {
    if (coupon.status === 'wykorzystany') {
      return <span className="badge bg-success">Wykorzystany</span>;
    }
    if (history?.status_info?.is_expired) {
      return <span className="badge bg-danger">Wygasły</span>;
    }
    return <span className="badge bg-primary">Aktywny</span>;
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'created':
        return <i className="fas fa-plus-circle text-success"></i>;
      case 'used':
        return <i className="fas fa-check-circle text-primary"></i>;
      default:
        return <i className="fas fa-info-circle text-info"></i>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fas fa-history me-2"></i>
              Historia kuponu
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          <div className="modal-body">
            {loading && (
              <div className="text-center py-4">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Ładowanie...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="alert alert-danger">
                <i className="fas fa-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}

            {history && (
              <>
                {/* Szczegóły kuponu */}
                <div className="card mb-4">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <i className="fas fa-ticket-alt me-2"></i>
                      Szczegóły kuponu
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <table className="table table-sm">
                          <tbody>
                            <tr>
                              <td><strong>Kod:</strong></td>
                              <td>
                                <code className="fs-6">{history.coupon.kod}</code>
                              </td>
                            </tr>
                            <tr>
                              <td><strong>Wartość:</strong></td>
                              <td>{formatCurrency(history.coupon.wartosc)}</td>
                            </tr>
                            <tr>
                              <td><strong>Status:</strong></td>
                              <td>{getStatusBadge(history.coupon)}</td>
                            </tr>
                            <tr>
                              <td><strong>Data ważności:</strong></td>
                              <td>
                                {history.coupon.data_waznosci}
                                {history.status_info?.days_to_expiry > 0 && (
                                  <small className="text-muted ms-2">
                                    (za {history.status_info.days_to_expiry} dni)
                                  </small>
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="col-md-6">
                        <table className="table table-sm">
                          <tbody>
                            <tr>
                              <td><strong>Telefon:</strong></td>
                              <td>{history.coupon.numer_telefonu || '-'}</td>
                            </tr>
                            <tr>
                              <td><strong>Płatność:</strong></td>
                              <td>{history.coupon.sposob_platnosci || '-'}</td>
                            </tr>
                            <tr>
                              <td><strong>Sklep:</strong></td>
                              <td>{history.coupon.sklep || '-'}</td>
                            </tr>
                            <tr>
                              <td><strong>Paragon:</strong></td>
                              <td>
                                {history.coupon.numer_paragonu ? (
                                  <code className="fs-6">{history.coupon.numer_paragonu}</code>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Historia wydarzeń */}
                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <i className="fas fa-timeline me-2"></i>
                      Historia wydarzeń
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="timeline">
                      {history.history.map((event, index) => (
                        <div key={index} className="timeline-item mb-3">
                          <div className="d-flex align-items-start">
                            <div className="timeline-marker me-3 mt-1">
                              {getEventIcon(event.type)}
                            </div>
                            <div className="timeline-content flex-grow-1">
                              <div className="d-flex justify-content-between align-items-start">
                                <div>
                                  <h6 className="mb-1">{event.description}</h6>
                                  <small className="text-muted">
                                    {formatDate(event.date)}
                                  </small>
                                </div>
                              </div>
                              
                              {event.details && Object.keys(event.details).length > 0 && (
                                <div className="mt-2">
                                  <div className="bg-light p-2 rounded">
                                    {event.type === 'created' && (
                                      <div className="row">
                                        <div className="col-6">
                                          <small>
                                            <strong>Wartość:</strong> {formatCurrency(event.details.value)}
                                          </small>
                                        </div>
                                        <div className="col-6">
                                          <small>
                                            <strong>Ważny do:</strong> {event.details.expiry_date}
                                          </small>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {event.type === 'used' && (
                                      <div className="row">
                                        <div className="col-6">
                                          <small>
                                            <strong>Wykorzystano:</strong> {formatCurrency(event.details.amount_used)}
                                          </small>
                                        </div>
                                        {event.details.receipt_number && (
                                          <div className="col-6">
                                            <small>
                                              <strong>Paragon:</strong> 
                                              <code className="ms-1">{event.details.receipt_number}</code>
                                            </small>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Zamknij
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CouponHistoryModal;
