import React, { useState, useEffect } from 'react';
import { couponService } from '../../services/couponService';

function SimpleUseCouponModal({ coupon, isOpen, onClose, onSuccess }) {
  const [receiptNumber, setReceiptNumber] = useState('');
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

  if (!isOpen || !coupon) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🔄 Wykorzystywanie kuponu:', coupon.id, 'z numerem paragonu:', receiptNumber);
    setLoading(true);
    setError('');
    
    try {
      const result = await couponService.useCoupon(coupon.id, {
        receipt_number: receiptNumber
      });
      console.log('✅ Kupon pomyślnie wykorzystany:', result);
      
      onSuccess && onSuccess();
      onClose();
      setReceiptNumber('');
    } catch (err) {
      console.error('❌ Błąd wykorzystywania kuponu:', err);
      setError(err.response?.data?.message || 'Błąd podczas wykorzystywania kuponu');
    } finally {
      setLoading(false);
    }
  };

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
        maxWidth: 420,
        width: '95vw',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        position: 'relative',
        fontFamily: 'inherit',
        padding: '0 0 24px 0',
        overflow: 'hidden',
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
          <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: 0.2 }}>Wykorzystaj kupon</span>
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
        <form onSubmit={handleSubmit} autoComplete="off" style={{ padding: '28px 28px 0 28px' }}>
          <div style={{ fontWeight: 500, fontSize: 15, color: '#222', marginBottom: 6 }}>Kod kuponu: <span style={{ fontWeight: 600 }}>{coupon.kod}</span></div>
          <div style={{ fontWeight: 500, fontSize: 15, color: '#222', marginBottom: 14 }}>Wartość: <span style={{ fontWeight: 600 }}>{coupon.wartosc} zł</span></div>
          <label htmlFor="receiptNumber" style={{ fontWeight: 500, fontSize: 15, color: '#222', marginBottom: 6, display: 'block' }}>Numer paragonu</label>
          <input
            id="receiptNumber"
            type="text"
            value={receiptNumber}
            onChange={e => setReceiptNumber(e.target.value)}
            placeholder="Wpisz numer paragonu"
            style={{
              width: '100%',
              padding: '12px 14px',
              margin: '8px 0 18px 0',
              border: '1.5px solid #d1d5db',
              borderRadius: 7,
              fontSize: 17,
              outline: 'none',
              boxSizing: 'border-box',
              background: '#f8fafc',
              transition: 'border 0.2s',
              fontWeight: 500
            }}
            required
          />
          {error && <div style={{ color: '#b91c1c', background: '#fee2e2', borderRadius: 5, padding: '8px 12px', marginBottom: 14, fontSize: 15 }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <button
              type="button"
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
              Anuluj
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 22px',
                background: loading ? '#a5b4fc' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: 7,
                fontWeight: 600,
                fontSize: 16,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'background 0.2s, opacity 0.2s',
              }}
            >
              {loading ? 'Wykorzystywanie...' : 'Wykorzystaj'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SimpleUseCouponModal;
