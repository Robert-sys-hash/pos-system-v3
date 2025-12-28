import React, { useState, useEffect } from 'react';
import { couponService } from '../../services/couponService';

function SimpleHistoryModal({ couponId, isOpen, onClose }) {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Zamknięcie ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && couponId) {
      fetchCouponHistory();
    } else if (!isOpen) {
      setHistory(null);
      setError('');
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

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.32)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 18,
        minWidth: 340,
        maxWidth: 480,
        width: '95vw',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        position: 'relative',
        fontFamily: 'inherit',
        padding: '0 0 24px 0',
        overflow: 'hidden',
        maxHeight: '90vh',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)',
          color: 'white',
          padding: '22px 28px 18px 28px',
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
          <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: 0.2 }}>Historia kuponu</span>
          <button
            onClick={onClose}
            aria-label="Zamknij"
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              fontSize: 26,
              color: 'white',
              cursor: 'pointer',
              lineHeight: 1,
              padding: 0
            }}
          >×</button>
        </div>
        <div style={{ padding: '28px 28px 0 28px', maxHeight: '60vh', overflowY: 'auto' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div>Ładowanie...</div>
            </div>
          )}
          {error && (
            <div style={{ color: '#b91c1c', background: '#fee2e2', borderRadius: 5, padding: '8px 12px', marginBottom: 14, fontSize: 15 }}>{error}</div>
          )}
          {history && (
            <div>
              <div style={{ marginBottom: '20px', padding: '15px', border: '1.5px solid #d1d5db', borderRadius: 7, background: '#f8fafc' }}>
                <h4 style={{ margin: 0, fontWeight: 600, fontSize: 17, color: '#222' }}>Informacje o kuponie</h4>
                <div style={{ fontSize: 15, marginTop: 8 }}>
                  <div><strong>Kod:</strong> {history.coupon.kod}</div>
                  <div><strong>Wartość:</strong> {formatCurrency(history.coupon.wartosc)}</div>
                  <div><strong>Status:</strong> {history.coupon.status}</div>
                  <div><strong>Data ważności:</strong> {history.coupon.data_waznosci}</div>
                  {history.coupon.numer_telefonu && (
                    <div><strong>Telefon:</strong> {history.coupon.numer_telefonu}</div>
                  )}
                  {history.coupon.numer_paragonu && (
                    <div><strong>Paragon:</strong> {history.coupon.numer_paragonu}</div>
                  )}
                </div>
              </div>
              <div>
                <h4 style={{ margin: '18px 0 10px 0', fontWeight: 600, fontSize: 17, color: '#222' }}>Historia wydarzeń</h4>
                {history.history && history.history.length > 0 ? (
                  history.history.map((event, index) => (
                    <div key={index} style={{
                      padding: '12px 14px',
                      marginBottom: '12px',
                      border: '1.5px solid #e5e7eb',
                      borderRadius: 7,
                      background: '#f1f5f9',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{event.description}</div>
                      <div style={{ fontSize: '0.97em', color: '#555', marginTop: 2 }}>
                        {formatDate(event.date)}
                      </div>
                      {event.details && (
                        <div style={{ fontSize: '0.97em', marginTop: '7px' }}>
                          {Object.entries(event.details).map(([key, value]) => (
                            <div key={key}>
                              <strong>{key}:</strong> {value}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#888', fontSize: 15, textAlign: 'center', margin: '18px 0' }}>Brak historii dla tego kuponu</div>
                )}
              </div>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', marginTop: '20px', padding: '0 28px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 22px',
              background: '#f3f4f6',
              color: '#222',
              border: 'none',
              borderRadius: 7,
              fontWeight: 500,
              fontSize: 16,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}

export default SimpleHistoryModal;
