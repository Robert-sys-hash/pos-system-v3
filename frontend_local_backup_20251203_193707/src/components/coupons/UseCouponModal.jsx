import React, { useState } from 'react';
import { couponService } from '../../services/couponService';

const UseCouponModal = ({ coupon, isOpen, onClose, onSuccess }) => {
  const [receiptNumber, setReceiptNumber] = useState('');
  const [amountUsed, setAmountUsed] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!receiptNumber.trim()) {
      setError('Numer paragonu jest wymagany');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const receiptData = {
        receipt_number: receiptNumber.trim(),
        amount_used: amountUsed ? parseFloat(amountUsed) : null
      };
      
      await couponService.useCoupon(coupon.id, receiptData);
      
      setReceiptNumber('');
      setAmountUsed('');
      onSuccess();
      onClose();
    } catch (err) {
      setError('Błąd podczas wykorzystywania kuponu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateReceiptNumber = () => {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const receiptNo = `PAR${timestamp}`;
    setReceiptNumber(receiptNo);
  };

  if (!isOpen || !coupon) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fas fa-check-circle me-2"></i>
              Wykorzystaj kupon
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              {/* Informacje o kuponie */}
              <div className="card mb-3">
                <div className="card-header">
                  <h6 className="mb-0">Szczegóły kuponu</h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-6">
                      <small className="text-muted">Kod kuponu:</small>
                      <div><code className="fs-6">{coupon.kod}</code></div>
                    </div>
                    <div className="col-6">
                      <small className="text-muted">Wartość:</small>
                      <div><strong>{parseFloat(coupon.wartosc).toFixed(2)} zł</strong></div>
                    </div>
                  </div>
                  <div className="row mt-2">
                    <div className="col-6">
                      <small className="text-muted">Telefon:</small>
                      <div>{coupon.numer_telefonu || '-'}</div>
                    </div>
                    <div className="col-6">
                      <small className="text-muted">Ważny do:</small>
                      <div>{coupon.data_waznosci}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Formularz wykorzystania */}
              <div className="mb-3">
                <label htmlFor="receiptNumber" className="form-label">
                  <i className="fas fa-receipt me-2"></i>
                  Numer paragonu *
                </label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    id="receiptNumber"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="np. PAR20250709123456"
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={generateReceiptNumber}
                    title="Wygeneruj automatyczny numer paragonu"
                  >
                    <i className="fas fa-magic"></i>
                  </button>
                </div>
                <div className="form-text">
                  Numer paragonu z kasy fiskalnej lub systemu sprzedaży
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="amountUsed" className="form-label">
                  <i className="fas fa-coins me-2"></i>
                  Wykorzystana kwota
                </label>
                <div className="input-group">
                  <input
                    type="number"
                    className="form-control"
                    id="amountUsed"
                    value={amountUsed}
                    onChange={(e) => setAmountUsed(e.target.value)}
                    placeholder={`Maksymalnie ${parseFloat(coupon.wartosc).toFixed(2)}`}
                    min="0"
                    max={coupon.wartosc}
                    step="0.01"
                  />
                  <span className="input-group-text">zł</span>
                </div>
                <div className="form-text">
                  Pozostaw puste, aby wykorzystać całą wartość kuponu
                </div>
              </div>

              <div className="alert alert-info">
                <i className="fas fa-info-circle me-2"></i>
                <strong>Uwaga:</strong> Po wykorzystaniu kupon nie będzie mógł być ponownie użyty.
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onClose}
                disabled={loading}
              >
                Anuluj
              </button>
              <button 
                type="submit" 
                className="btn btn-success"
                disabled={loading || !receiptNumber.trim()}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Wykorzystuję...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check me-2"></i>
                    Wykorzystaj kupon
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UseCouponModal;
