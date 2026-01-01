import React, { useState, useEffect } from 'react';
import { transactionService } from '../../services/transactionService';

const TransactionDetails = ({ transactionId, onClose, isOpen = true }) => {
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (transactionId && isOpen) {
      loadTransaction();
    }
  }, [transactionId, isOpen]);

  const loadTransaction = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await transactionService.getTransaction(transactionId);
      if (response.success) {
        setTransaction(response.data);
      } else {
        setError(response.error || 'Błąd pobierania transakcji');
      }
    } catch (err) {
      setError('Błąd połączenia: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      return timeStr.substring(0, 5); // HH:MM
    } catch {
      return timeStr;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN'
    }).format(amount || 0);
  };

  // Nie renderuj jeśli modal jest zamknięty lub brak ID
  if (!isOpen || !transactionId) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '6px',
        width: '900px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        {/* Header - styl jak w OpenShiftEnhancedModal */}
        <div style={{
          padding: '0.75rem 1rem',
          background: 'linear-gradient(135deg, #007bff, #6f42c1)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{
            width: '2rem',
            height: '2rem',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem'
          }}>
            🧾
          </div>
          <div style={{ flex: 1 }}>
            <h5 style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>
              Szczegóły Paragonu #{transactionId}
            </h5>
            <p style={{ margin: 0, fontSize: '11px', opacity: 0.9 }}>
              {transaction?.numer_paragonu || 'Ładowanie...'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              color: 'white',
              cursor: 'pointer',
              padding: '0.25rem',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1rem', maxHeight: 'calc(90vh - 120px)', overflowY: 'auto' }}>
          {/* Error */}
          {error && (
            <div style={{ 
              backgroundColor: '#f8d7da', 
              color: '#721c24', 
              padding: '10px 12px', 
              borderRadius: '4px', 
              marginBottom: '12px',
              border: '1px solid #f5c6cb',
              fontSize: '12px'
            }}>
              ❌ {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                border: '4px solid #e9ecef',
                borderTop: '4px solid #007bff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto'
              }}></div>
              <p style={{ marginTop: '1rem', color: '#6c757d', fontSize: '12px' }}>Ładowanie szczegółów...</p>
            </div>
          )}

          {/* Szczegóły transakcji */}
          {!loading && transaction && (
            <div>
              {/* Kafelki z podstawowymi informacjami */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '10px',
                marginBottom: '16px'
              }}>
                {/* Podstawowe */}
                <div style={{ 
                  padding: '12px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  border: '1px solid #dee2e6'
                }}>
                  <div style={{ fontSize: '10px', color: '#6c757d', marginBottom: '4px', fontWeight: '500' }}>PODSTAWOWE</div>
                  <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
                    <div><strong>ID:</strong> #{transaction.id}</div>
                    <div><strong>Nr:</strong> {transaction.numer_paragonu || 'N/A'}</div>
                    <div><strong>Data:</strong> {formatDate(transaction.data_transakcji)}</div>
                    <div><strong>Czas:</strong> {formatTime(transaction.czas_transakcji)}</div>
                    <div style={{ marginTop: '4px' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '10px',
                        backgroundColor: transaction.status === 'zakonczony' ? '#d4edda' : '#fff3cd',
                        color: transaction.status === 'zakonczony' ? '#155724' : '#856404',
                        fontWeight: '500'
                      }}>
                        {transaction.status === 'zakonczony' ? '✓ Sfinalizowana' : transaction.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Kasjer & Klient */}
                <div style={{ 
                  padding: '12px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  border: '1px solid #dee2e6'
                }}>
                  <div style={{ fontSize: '10px', color: '#6c757d', marginBottom: '4px', fontWeight: '500' }}>KASJER & KLIENT</div>
                  <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
                    <div><strong>Kasjer:</strong> {transaction.kasjer_login || 'N/A'}</div>
                    <div><strong>Klient:</strong> {transaction.customer_name || 'Klient detaliczny'}</div>
                    <div><strong>Telefon:</strong> {transaction.customer_phone || '-'}</div>
                  </div>
                </div>

                {/* Płatność */}
                <div style={{ 
                  padding: '12px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  border: '1px solid #dee2e6'
                }}>
                  <div style={{ fontSize: '10px', color: '#6c757d', marginBottom: '4px', fontWeight: '500' }}>PŁATNOŚĆ</div>
                  <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
                    <div>
                      <strong>Metoda:</strong>
                      <span style={{
                        marginLeft: '4px',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '10px',
                        backgroundColor: 
                          transaction.forma_platnosci === 'gotowka' ? '#d4edda' :
                          transaction.forma_platnosci === 'karta' ? '#cce5ff' :
                          transaction.forma_platnosci === 'blik' ? '#ffe6cc' : '#f8f9fa',
                        color:
                          transaction.forma_platnosci === 'gotowka' ? '#155724' :
                          transaction.forma_platnosci === 'karta' ? '#004085' :
                          transaction.forma_platnosci === 'blik' ? '#cc6600' : '#666'
                      }}>
                        {transaction.forma_platnosci || 'N/A'}
                      </span>
                    </div>
                    <div><strong>Otrzymano:</strong> {formatCurrency(transaction.kwota_otrzymana)}</div>
                    <div><strong>Reszta:</strong> {formatCurrency(transaction.kwota_reszty)}</div>
                  </div>
                </div>

                {/* Kwoty - wyróżniony */}
                <div style={{ 
                  padding: '12px',
                  backgroundColor: '#d4edda',
                  borderRadius: '4px',
                  border: '1px solid #c3e6cb'
                }}>
                  <div style={{ fontSize: '10px', color: '#155724', marginBottom: '4px', fontWeight: '500' }}>KWOTY</div>
                  <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
                    <div><strong>Netto:</strong> {formatCurrency(transaction.suma_netto)}</div>
                    <div><strong>VAT:</strong> {formatCurrency(transaction.suma_vat)}</div>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '700', 
                      color: '#155724',
                      marginTop: '6px',
                      paddingTop: '6px',
                      borderTop: '1px solid #c3e6cb'
                    }}>
                      {formatCurrency(transaction.suma_brutto)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pozycje transakcji */}
              <div style={{ marginTop: '12px' }}>
                <div style={{ 
                  fontSize: '11px', 
                  fontWeight: '600', 
                  color: '#495057', 
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>📦</span>
                  <span>Pozycje ({transaction.items?.length || 0})</span>
                </div>
                
                {transaction.items && transaction.items.length > 0 ? (
                  <div style={{ 
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    {/* Header tabeli */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 1fr 90px 60px 80px 60px 90px',
                      gap: '8px',
                      padding: '8px 10px',
                      backgroundColor: '#f8f9fa',
                      borderBottom: '2px solid #dee2e6',
                      fontSize: '10px',
                      fontWeight: '600',
                      color: '#495057'
                    }}>
                      <div>Lp.</div>
                      <div>Produkt</div>
                      <div>Kod</div>
                      <div style={{ textAlign: 'center' }}>Ilość</div>
                      <div style={{ textAlign: 'right' }}>Cena jedn.</div>
                      <div style={{ textAlign: 'center' }}>VAT</div>
                      <div style={{ textAlign: 'right' }}>Wartość</div>
                    </div>

                    {/* Wiersze */}
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      {transaction.items.map((item, index) => (
                        <div 
                          key={index}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '40px 1fr 90px 60px 80px 60px 90px',
                            gap: '8px',
                            padding: '8px 10px',
                            borderBottom: index < transaction.items.length - 1 ? '1px solid #f0f0f0' : 'none',
                            backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                            fontSize: '11px',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ color: '#6c757d' }}>{index + 1}</div>
                          <div style={{ fontWeight: '500', color: '#212529' }}>
                            {item.product_name || item.nazwa_produktu || item.nazwa}
                          </div>
                          <div>
                            <code style={{ 
                              fontSize: '10px',
                              backgroundColor: '#e9ecef',
                              padding: '2px 4px',
                              borderRadius: '3px'
                            }}>
                              {item.barcode || item.kod_produktu || '-'}
                            </code>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            {item.ilosc || item.quantity} {item.jednostka || item.unit || 'szt'}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            {formatCurrency(item.cena_jednostkowa || item.unit_price)}
                          </div>
                          <div style={{ textAlign: 'center', fontSize: '10px' }}>
                            {(item.stawka_vat || 23)}%
                          </div>
                          <div style={{ textAlign: 'right', fontWeight: '600', color: '#28a745' }}>
                            {formatCurrency(item.wartosc_brutto || item.cena_calkowita || item.total_price)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div style={{
                      padding: '8px 10px',
                      backgroundColor: '#f8f9fa',
                      borderTop: '1px solid #dee2e6',
                      fontSize: '10px',
                      color: '#6c757d',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span>Pozycji: <strong>{transaction.items.length}</strong></span>
                      <span>Łączna ilość: <strong>
                        {transaction.items.reduce((sum, item) => sum + (item.ilosc || item.quantity || 0), 0)}
                      </strong></span>
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '20px', 
                    color: '#6c757d',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    📭 Brak pozycji w transakcji
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer z akcjami */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #dee2e6',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={loadTransaction}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🔄 Odśwież
          </button>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => window.open(`/pos/receipt/${transactionId}`, '_blank')}
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🖨️ Drukuj paragon
            </button>
            
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Zamknij
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetails;
