import React, { useState, useEffect } from 'react';
import { customerService } from '../../services/customerService';

const CustomerSearch = ({ onCustomerSelect, selectedCustomer }) => {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setCustomers([]);
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchCustomers();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const searchCustomers = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🔍 Rozpoczynam wyszukiwanie klientów:', query);
      const response = await customerService.searchCustomers(query, 10);
      console.log('📊 Odpowiedź z serwera:', response);
      
      if (response.success) {
        const customers = response.data.customers || [];
        console.log('✅ Znaleziono klientów:', customers.length);
        setCustomers(customers);
        setShowResults(true);
      } else {
        console.log('❌ Błąd odpowiedzi:', response.message);
        setError(response.message || 'Błąd wyszukiwania');
        setCustomers([]);
      }
    } catch (err) {
      console.error('💥 Błąd wyszukiwania klientów:', err);
      setError(err.message || 'Błąd wyszukiwania klientów');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSelect = (customer) => {
    onCustomerSelect(customer);
    setQuery(customer.name);
    setShowResults(false);
  };

  const clearSelection = () => {
    setQuery('');
    setCustomers([]);
    setShowResults(false);
    onCustomerSelect(null);
  };

  return (
    <div className="customer-search">
      <div className="form-group">
        <label className="form-label">
          👤 Wyszukaj klienta
        </label>
        
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Wprowadź nazwę, telefon lub email klienta..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length >= 2 && setShowResults(true)}
          />
          
          {selectedCustomer && (
            <button
              type="button"
              onClick={clearSelection}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error">
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div className="loading">
          🔍 Wyszukiwanie klientów...
        </div>
      )}

      {showResults && customers.length > 0 && (
        <div className="search-results" style={{
          position: 'absolute',
          top: '100%',
          left: '0',
          right: '0',
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 1000,
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {customers.map((customer) => (
            <div
              key={customer.id}
              onClick={() => handleCustomerSelect(customer)}
              style={{
                padding: '12px',
                borderBottom: '1px solid #eee',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
            >
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                {customer.name}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                {customer.phone && `📞 ${customer.phone}`}
                {customer.phone && customer.email && ' • '}
                {customer.email && `📧 ${customer.email}`}
              </div>
              {customer.address && (
                <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                  📍 {customer.address}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showResults && customers.length === 0 && !loading && query.length >= 2 && (
        <div className="search-results" style={{
          position: 'absolute',
          top: '100%',
          left: '0',
          right: '0',
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 1000,
          padding: '12px',
          textAlign: 'center',
          color: '#666'
        }}>
          🔍 Nie znaleziono klientów dla zapytania "{query}"
        </div>
      )}

      {selectedCustomer && (
        <div className="selected-customer" style={{
          marginTop: '10px',
          padding: '12px',
          background: '#e8f5e8',
          border: '1px solid #c3e6cb',
          borderRadius: '4px'
        }}>
          <div style={{ fontWeight: '500', color: '#155724' }}>
            ✅ Wybrany klient: {selectedCustomer.name}
          </div>
          {selectedCustomer.phone && (
            <div style={{ fontSize: '14px', color: '#155724' }}>
              📞 {selectedCustomer.phone}
            </div>
          )}
          {selectedCustomer.email && (
            <div style={{ fontSize: '14px', color: '#155724' }}>
              📧 {selectedCustomer.email}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerSearch;
