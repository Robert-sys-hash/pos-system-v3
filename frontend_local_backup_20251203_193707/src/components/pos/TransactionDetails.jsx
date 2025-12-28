import React, { useState, useEffect } from 'react';
import { transactionService } from '../../services/transactionService';

const TransactionDetails = ({ transactionId, onClose }) => {
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (transactionId) {
      loadTransaction();
    }
  }, [transactionId]);

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

  if (!transactionId) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px', 
        color: '#666',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        📄 Wybierz transakcję z listy, aby wyświetlić szczegóły
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: '8px', 
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px' 
      }}>
        <h3 style={{ margin: 0, color: '#2c3e50' }}>
          📄 Szczegóły Transakcji #{transactionId}
        </h3>
        <button 
          onClick={onClose}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ✕ Zamknij
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          padding: '15px', 
          borderRadius: '6px', 
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#666' 
        }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
          <div>Ładowanie szczegółów transakcji...</div>
        </div>
      )}

      {/* Szczegóły transakcji */}
      {!loading && transaction && (
        <div>
          {/* Informacje podstawowe */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            <div style={{ 
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #dee2e6'
            }}>
              <h5 style={{ margin: '0 0 10px 0', color: '#495057' }}>Podstawowe</h5>
              <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                <div><strong>ID:</strong> #{transaction.id}</div>
                <div><strong>Nr Paragonu:</strong> {transaction.numer_paragonu || 'N/A'}</div>
                <div><strong>Data:</strong> {formatDate(transaction.data_transakcji)}</div>
                <div><strong>Czas:</strong> {formatTime(transaction.czas_transakcji)}</div>
                <div><strong>Status:</strong> 
                  <span style={{
                    marginLeft: '5px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    backgroundColor: transaction.status === 'zakonczony' ? '#d4edda' : '#fff3cd',
                    color: transaction.status === 'zakonczony' ? '#155724' : '#856404'
                  }}>
                    {transaction.status === 'zakonczony' ? 'Sfinalizowana' : transaction.status}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ 
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #dee2e6'
            }}>
              <h5 style={{ margin: '0 0 10px 0', color: '#495057' }}>Kasjer & Klient</h5>
              <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                <div><strong>Kasjer:</strong> {transaction.kasjer_login || 'N/A'}</div>
                <div><strong>Klient:</strong> {transaction.customer_name || 'Klient detaliczny'}</div>
                <div><strong>Telefon:</strong> {transaction.customer_phone || 'N/A'}</div>
              </div>
            </div>

            <div style={{ 
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #dee2e6'
            }}>
              <h5 style={{ margin: '0 0 10px 0', color: '#495057' }}>Płatność</h5>
              <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                <div><strong>Metoda:</strong> 
                  <span style={{
                    marginLeft: '5px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
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

            <div style={{ 
              padding: '15px',
              backgroundColor: '#e8f5e8',
              borderRadius: '6px',
              border: '1px solid #c3e6c3'
            }}>
              <h5 style={{ margin: '0 0 10px 0', color: '#155724' }}>Kwoty</h5>
              <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                <div><strong>Netto:</strong> {formatCurrency(transaction.suma_netto)}</div>
                <div><strong>VAT:</strong> {formatCurrency(transaction.suma_vat)}</div>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: '#155724',
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid #c3e6c3'
                }}>
                  <strong>BRUTTO:</strong> {formatCurrency(transaction.suma_brutto)}
                </div>
              </div>
            </div>
          </div>

          {/* Pozycje transakcji */}
          <div style={{ marginTop: '30px' }}>
            <h5 style={{ margin: '0 0 15px 0', color: '#495057' }}>
              📦 Pozycje ({transaction.items?.length || 0})
            </h5>
            
            {transaction.items && transaction.items.length > 0 ? (
              <div>
                {/* Header tabeli pozycji */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '50px 1fr 100px 80px 80px 80px 100px',
                  gap: '10px',
                  padding: '12px 15px',
                  backgroundColor: '#f1f3f4',
                  borderRadius: '6px 6px 0 0',
                  border: '1px solid #dee2e6',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#495057'
                }}>
                  <div>Lp.</div>
                  <div>Produkt</div>
                  <div>Kod</div>
                  <div>Ilość</div>
                  <div>Cena jedn.</div>
                  <div>VAT</div>
                  <div>Wartość</div>
                </div>

                {/* Wiersze pozycji */}
                <div style={{ border: '1px solid #dee2e6', borderTop: 'none' }}>
                  {transaction.items.map((item, index) => (
                    <div 
                      key={index}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '50px 1fr 100px 80px 80px 80px 100px',
                        gap: '10px',
                        padding: '12px 15px',
                        borderBottom: index < transaction.items.length - 1 ? '1px solid #dee2e6' : 'none',
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                        fontSize: '13px',
                        alignItems: 'center'
                      }}
                    >
                      <div>{index + 1}</div>
                      <div style={{ fontWeight: '500' }}>
                        {item.product_name || item.nazwa_produktu || item.nazwa}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                        {item.barcode || item.kod_produktu || '-'}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        {item.ilosc || item.quantity} {item.jednostka || item.unit || 'szt'}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {formatCurrency(item.cena_jednostkowa || item.unit_price)}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        {(item.stawka_vat || 23)}%
                      </div>
                      <div style={{ textAlign: 'right', fontWeight: '600' }}>
                        {formatCurrency(item.wartosc_brutto || item.cena_calkowita || item.total_price)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer z podsumowaniem pozycji */}
                <div style={{
                  padding: '10px 15px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '0 0 6px 6px',
                  border: '1px solid #dee2e6',
                  borderTop: 'none',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  Pozycji: <strong>{transaction.items.length}</strong> |
                  Łączna ilość: <strong>
                    {transaction.items.reduce((sum, item) => sum + (item.ilosc || item.quantity || 0), 0)}
                  </strong>
                </div>
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '30px', 
                color: '#666',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px'
              }}>
                📭 Brak pozycji w transakcji
              </div>
            )}
          </div>

          {/* Akcje */}
          <div style={{ 
            marginTop: '30px', 
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <button
              onClick={() => window.open(`/pos/receipt/${transactionId}`, '_blank')}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              🖨️ Drukuj paragon
            </button>
            
            <button
              onClick={loadTransaction}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              🔄 Odśwież
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionDetails;
