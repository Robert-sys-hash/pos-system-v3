import React, { useState, useEffect } from 'react';
import { transactionService } from '../../services/transactionService';

const TransactionsList = ({ onTransactionSelect, onCorrectionClick, isAdmin = false, locationId = null }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [filters, setFilters] = useState({
    limit: 50,
    status: 'completed',
    date_from: '',
    date_to: '',
    location_id: locationId
  });

  useEffect(() => {
    loadTransactions();
  }, [filters]);

  // Aktualizuj location_id w filtrach gdy props się zmieni
  useEffect(() => {
    if (locationId !== filters.location_id) {
      setFilters(prev => ({
        ...prev,
        location_id: locationId
      }));
    }
  }, [locationId]);

  const loadTransactions = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await transactionService.getTransactions(filters);
      if (response.success) {
        setTransactions(response.data.transactions || []);
      } else {
        setError(response.error || 'Błąd pobierania transakcji');
      }
    } catch (err) {
      setError('Błąd połączenia: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDeleteTransaction = async (transaction) => {
    if (!window.confirm(`Czy na pewno chcesz usunąć ${transaction.receipt_number || `transakcję #${transaction.id}`}?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await transactionService.deleteTransaction(transaction.id);
      if (response.success) {
        setSuccessMessage(`Transakcja ${response.data.receipt_number} została usunięta`);
        setTimeout(() => setSuccessMessage(''), 3000);
        loadTransactions(); // Odśwież listę
      } else {
        setError(response.error || 'Błąd usuwania transakcji');
      }
    } catch (err) {
      setError('Błąd połączenia: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (transaction, newStatus) => {
    setLoading(true);
    try {
      const response = await transactionService.updateTransactionStatus(transaction.id, newStatus);
      if (response.success) {
        setSuccessMessage(`Status transakcji zmieniony na: ${newStatus}`);
        setTimeout(() => setSuccessMessage(''), 3000);
        loadTransactions(); // Odśwież listę
      } else {
        setError(response.error || 'Błąd zmiany statusu');
      }
    } catch (err) {
      setError('Błąd połączenia: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = (transaction) => {
    // Jeśli typ transakcji to korekta, wyświetl "KOREKTA"
    if (transaction.transaction_type === 'korekta') {
      return {
        text: 'KOREKTA',
        backgroundColor: '#f8d7da',
        color: '#721c24'
      };
    }
    
    // Standardowe statusy
    switch (transaction.status) {
      case 'zakonczony':
        return {
          text: 'OK',
          backgroundColor: '#d4edda',
          color: '#155724'
        };
      case 'draft':
        return {
          text: 'SZKIC',
          backgroundColor: '#fff3cd',
          color: '#856404'
        };
      case 'w_trakcie':
        return {
          text: 'W TOKU',
          backgroundColor: '#d1ecf1',
          color: '#0c5460'
        };
      default:
        return {
          text: transaction.status?.toUpperCase() || 'NIEZNANY',
          backgroundColor: '#f8f9fa',
          color: '#6c757d'
        };
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
          📄 Lista Paragonów
        </h3>
        <button 
          onClick={loadTransactions}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {loading ? '⟳ Odświeżanie...' : '🔄 Odśwież'}
        </button>
      </div>

      {/* Filtry */}
      <div style={{ 
        display: 'flex', 
        gap: '15px', 
        marginBottom: '20px', 
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        flexWrap: 'wrap'
      }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#666' }}>
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="completed">Sfinalizowane</option>
            <option value="corrections">Korekty</option>
            <option value="draft">Szkice</option>
            <option value="all">Wszystkie</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#666' }}>
            Data od
          </label>
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => handleFilterChange('date_from', e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#666' }}>
            Data do
          </label>
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => handleFilterChange('date_to', e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#666' }}>
            Limit
          </label>
          <select
            value={filters.limit}
            onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
            style={{
              padding: '6px 10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {/* Komunikat błędu */}
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '15px',
          border: '1px solid #f5c6cb'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Komunikat sukcesu */}
      {successMessage && (
        <div style={{
          backgroundColor: '#d4edda',
          color: '#155724',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '15px',
          border: '1px solid #c3e6cb'
        }}>
          ✅ {successMessage}
        </div>
      )}      {/* Loading */}
      {loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#666' 
        }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
          <div>Ładowanie transakcji...</div>
        </div>
      )}

      {/* Lista transakcji */}
      {!loading && transactions.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#666',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px'
        }}>
          📭 Brak transakcji spełniających kryteria
        </div>
      )}

      {!loading && transactions.length > 0 && (
        <div>
          {/* Header tabeli */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '80px 120px 80px 60px 100px 100px 120px 80px 40px 60px auto',
            gap: '10px',
            padding: '12px 15px',
            backgroundColor: '#f1f3f4',
            borderRadius: '6px 6px 0 0',
            border: '1px solid #dee2e6',
            fontSize: '12px',
            fontWeight: '600',
            color: '#495057'
          }}>
            <div>ID</div>
            <div>Nr Paragonu</div>
            <div>Data</div>
            <div>Czas</div>
            <div>Kasjer</div>
            <div>Kwota</div>
            <div>Płatność</div>
            <div>Status</div>
            <div>Fisk</div>
            <div>Pozycje</div>
            <div>Akcje</div>
          </div>

          {/* Wiersze transakcji */}
          <div style={{ border: '1px solid #dee2e6', borderTop: 'none' }}>
            {transactions.map((transaction, index) => (
              <div 
                key={transaction.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 120px 80px 60px 100px 100px 120px 80px 40px 60px auto',
                  gap: '10px',
                  padding: '12px 15px',
                  borderBottom: index < transactions.length - 1 ? '1px solid #dee2e6' : 'none',
                  backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                  fontSize: '13px',
                  alignItems: 'center'
                }}
              >
                <div style={{ fontWeight: '600', color: '#007bff' }}>
                  #{transaction.id}
                </div>
                
                <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                  {transaction.receipt_number || '-'}
                </div>
                
                <div>{formatDate(transaction.transaction_date)}</div>
                <div>{formatTime(transaction.transaction_time)}</div>
                
                <div style={{ fontSize: '12px' }}>
                  {transaction.cashier || '-'}
                </div>
                
                <div style={{ 
                  fontWeight: '600', 
                  color: transaction.transaction_type === 'korekta' || transaction.total_amount < 0 ? '#dc3545' : '#28a745' 
                }}>
                  {formatCurrency(transaction.total_amount)}
                </div>
                
                <div>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    backgroundColor: 
                      transaction.payment_method === 'gotowka' ? '#d4edda' :
                      transaction.payment_method === 'karta' ? '#cce5ff' :
                      transaction.payment_method === 'blik' ? '#ffe6cc' : '#f8f9fa',
                    color:
                      transaction.payment_method === 'gotowka' ? '#155724' :
                      transaction.payment_method === 'karta' ? '#004085' :
                      transaction.payment_method === 'blik' ? '#cc6600' : '#666'
                  }}>
                    {transaction.payment_method || 'N/A'}
                  </span>
                </div>
                
                <div>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    backgroundColor: getStatusDisplay(transaction).backgroundColor,
                    color: getStatusDisplay(transaction).color,
                    fontWeight: 'bold'
                  }}>
                    {getStatusDisplay(transaction).text}
                  </span>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: transaction.fiscal_status === 'F' ? '#28a745' : 
                           transaction.fiscal_status === 'F!' ? '#dc3545' : '#6c757d'
                  }}>
                    {transaction.fiscal_status || '-'}
                  </span>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  {transaction.items_count || 0}
                </div>
                
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button
                    onClick={() => onTransactionSelect && onTransactionSelect(transaction)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                    title="Pokaż szczegóły"
                  >
                    👁️
                  </button>
                  
                  <button
                    onClick={() => window.open(`/pos/receipt/${transaction.id}`, '_blank')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                    title="Drukuj paragon"
                  >
                    🖨️
                  </button>
                  
                  {transaction.status === 'zakonczony' && ['sprzedaz', 'sale'].includes(transaction.transaction_type) && (
                    <button
                      onClick={() => onCorrectionClick && onCorrectionClick(transaction)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        cursor: 'pointer'
                      }}
                      title="Korekta transakcji"
                    >
                      ↩️ Korekta
                    </button>
                  )}

                  {/* Przyciski dla szkiców i transakcji w toku (tylko dla adminów) */}
                  {isAdmin && ['draft', 'w_trakcie'].includes(transaction.status) && (
                    <>
                      {transaction.status === 'w_trakcie' && (
                        <button
                          onClick={() => handleStatusChange(transaction, 'draft')}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            border: 'none',
                            borderRadius: '4px',
                            backgroundColor: '#ffc107',
                            color: '#000',
                            cursor: 'pointer',
                            marginLeft: '5px'
                          }}
                          title="Wstrzymaj transakcję"
                        >
                          ⏸️ Wstrzymaj
                        </button>
                      )}

                      {transaction.status === 'draft' && (
                        <button
                          onClick={() => handleStatusChange(transaction, 'w_trakcie')}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            border: 'none',
                            borderRadius: '4px',
                            backgroundColor: '#17a2b8',
                            color: 'white',
                            cursor: 'pointer',
                            marginLeft: '5px'
                          }}
                          title="Wznów transakcję"
                        >
                          ▶️ Wznów
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteTransaction(transaction)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          border: 'none',
                          borderRadius: '4px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          cursor: 'pointer',
                          marginLeft: '5px'
                        }}
                        title="Usuń transakcję"
                      >
                        🗑️ Usuń
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer z podsumowaniem */}
          <div style={{
            padding: '10px 15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '0 0 6px 6px',
            border: '1px solid #dee2e6',
            borderTop: 'none',
            fontSize: '12px',
            color: '#666'
          }}>
            Znaleziono: <strong>{transactions.length}</strong> transakcji |
            Łączna wartość: <strong>
              {formatCurrency(
                transactions.reduce((sum, t) => sum + (t.total_amount || 0), 0)
              )}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsList;
