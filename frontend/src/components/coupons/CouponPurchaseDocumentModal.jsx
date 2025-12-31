import React, { useState, useEffect, useRef } from 'react';
import { couponService } from '../../services/couponService';

const CouponPurchaseDocumentModal = ({ couponId, isOpen, onClose }) => {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const printRef = useRef();

  useEffect(() => {
    if (isOpen && couponId) {
      fetchDocument();
    }
  }, [isOpen, couponId]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await couponService.getCouponDocument(couponId);
      console.log('📄 Dokument zakupu:', response);
      if (response.success && response.data) {
        setDocument(response.data);
      } else {
        setError(response.message || 'Nie znaleziono dokumentu');
      }
    } catch (err) {
      console.error('Błąd pobierania dokumentu:', err);
      setError('Błąd pobierania dokumentu zakupu');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    const windowPrint = window.open('', '', 'width=400,height=600');
    
    windowPrint.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Dokument zakupu kuponu</title>
        <style>
          @page { 
            size: 80mm auto; 
            margin: 5mm; 
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            max-width: 80mm;
            margin: 0 auto;
            padding: 10px;
          }
          .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .doc-number {
            font-size: 14px;
            font-weight: bold;
          }
          .section {
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px dashed #000;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .label {
            color: #666;
          }
          .value {
            font-weight: bold;
            text-align: right;
          }
          .coupon-code {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 3px;
            padding: 15px;
            background: #f5f5f5;
            border: 2px dashed #000;
            margin: 15px 0;
          }
          .amount {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin: 10px 0;
          }
          .footer {
            text-align: center;
            font-size: 10px;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px dashed #000;
          }
          .terms {
            font-size: 9px;
            color: #666;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    
    windowPrint.document.close();
    windowPrint.focus();
    
    setTimeout(() => {
      windowPrint.print();
      windowPrint.close();
    }, 250);
  };

  if (!isOpen) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPaymentMethod = (method) => {
    const methods = {
      'gotowka': 'Gotówka',
      'karta': 'Karta płatnicza',
      'przelew': 'Przelew bankowy',
      'blik': 'BLIK'
    };
    return methods[method] || method || '-';
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: 10,
        width: '90%',
        maxWidth: 450,
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        {/* Nagłówek modala */}
        <div style={{
          padding: '15px 20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8f9fa'
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            📄 Dokument zakupu kuponu
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 22,
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        {/* Zawartość */}
        <div style={{ padding: 20 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 30, color: '#666' }}>
              Ładowanie dokumentu...
            </div>
          )}

          {error && (
            <div style={{
              padding: 15,
              background: '#fef2f2',
              color: '#dc2626',
              borderRadius: 6,
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {document && !loading && (
            <>
              {/* Podgląd dokumentu do wydruku */}
              <div 
                ref={printRef}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 20,
                  fontFamily: "'Courier New', monospace"
                }}
              >
                {/* Nagłówek dokumentu */}
                <div className="header" style={{ textAlign: 'center', borderBottom: '1px dashed #ccc', paddingBottom: 10, marginBottom: 10 }}>
                  <div className="title" style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 5 }}>
                    POTWIERDZENIE ZAKUPU KUPONU
                  </div>
                  <div className="doc-number" style={{ fontSize: 14, fontWeight: 'bold', color: '#2563eb' }}>
                    {document.document_number}
                  </div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 5 }}>
                    {formatDate(document.created_at)}
                  </div>
                </div>

                {/* Kod kuponu */}
                <div className="coupon-code" style={{
                  textAlign: 'center',
                  fontSize: 28,
                  fontWeight: 'bold',
                  letterSpacing: 4,
                  padding: 15,
                  background: '#f0f9ff',
                  border: '2px dashed #2563eb',
                  borderRadius: 8,
                  margin: '15px 0',
                  color: '#1e40af'
                }}>
                  {document.coupon?.code}
                </div>

                {/* Wartość */}
                <div className="amount" style={{
                  textAlign: 'center',
                  fontSize: 22,
                  fontWeight: 'bold',
                  color: '#16a34a',
                  margin: '15px 0'
                }}>
                  Wartość: {(document.coupon?.value || 0).toFixed(2)} zł
                </div>

                {/* Szczegóły */}
                <div className="section" style={{ margin: '15px 0', padding: '10px 0', borderTop: '1px dashed #ccc', borderBottom: '1px dashed #ccc' }}>
                  <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '5px 0' }}>
                    <span className="label" style={{ color: '#666' }}>Ważny do:</span>
                    <span className="value" style={{ fontWeight: 'bold' }}>{document.coupon?.expiry_date}</span>
                  </div>
                  <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '5px 0' }}>
                    <span className="label" style={{ color: '#666' }}>Status:</span>
                    <span className="value" style={{ fontWeight: 'bold', color: document.coupon?.status === 'aktywny' ? '#16a34a' : '#dc2626' }}>
                      {document.coupon?.status?.toUpperCase()}
                    </span>
                  </div>
                  <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '5px 0' }}>
                    <span className="label" style={{ color: '#666' }}>Płatność:</span>
                    <span className="value" style={{ fontWeight: 'bold' }}>{formatPaymentMethod(document.payment?.method)}</span>
                  </div>
                </div>

                {/* Dane klienta */}
                {(document.customer?.name || document.customer?.phone) && (
                  <div className="section" style={{ margin: '10px 0', padding: '10px 0', borderBottom: '1px dashed #ccc' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 5, fontSize: 12 }}>Dane klienta:</div>
                    {document.customer?.name && (
                      <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                        <span className="label" style={{ color: '#666' }}>Imię:</span>
                        <span className="value">{document.customer.name}</span>
                      </div>
                    )}
                    {document.customer?.phone && (
                      <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                        <span className="label" style={{ color: '#666' }}>Telefon:</span>
                        <span className="value">{document.customer.phone}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Lokalizacja */}
                {document.location?.name && (
                  <div style={{ fontSize: 11, color: '#666', textAlign: 'center', marginTop: 10 }}>
                    Punkt sprzedaży: {document.location.name}
                  </div>
                )}

                {/* Sprzedawca */}
                {document.seller && (
                  <div style={{ fontSize: 11, color: '#666', textAlign: 'center' }}>
                    Sprzedawca: {document.seller}
                  </div>
                )}

                {/* Stopka */}
                <div className="footer" style={{ 
                  textAlign: 'center', 
                  fontSize: 10, 
                  marginTop: 15, 
                  paddingTop: 10, 
                  borderTop: '1px dashed #ccc',
                  color: '#666'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 5 }}>Dziękujemy za zakup!</div>
                  <div className="terms" style={{ fontSize: 9 }}>
                    Kupon jest ważny do daty wskazanej powyżej.<br/>
                    Prosimy zachować ten dokument jako potwierdzenie zakupu.
                  </div>
                </div>
              </div>

              {/* Przyciski */}
              <div style={{ 
                display: 'flex', 
                gap: 10, 
                marginTop: 20, 
                justifyContent: 'center' 
              }}>
                <button
                  onClick={handlePrint}
                  style={{
                    padding: '10px 25px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  🖨️ Drukuj dokument
                </button>
                <button
                  onClick={onClose}
                  style={{
                    padding: '10px 25px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 500,
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  Zamknij
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CouponPurchaseDocumentModal;
