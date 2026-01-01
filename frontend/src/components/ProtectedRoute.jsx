import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../contexts/LocationContext';

const LocationSelector = ({ locations, onSelect, loading }) => {
  const [selectedId, setSelectedId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedId) {
      onSelect(parseInt(selectedId));
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f5f7fa',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        maxWidth: '450px',
        width: '90%',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📍</div>
        <h2 style={{ 
          margin: '0 0 10px 0', 
          color: '#2c3e50',
          fontSize: '24px'
        }}>
          Wybierz lokalizację
        </h2>
        <p style={{ 
          color: '#7f8c8d', 
          marginBottom: '30px',
          fontSize: '14px'
        }}>
          Aby kontynuować, musisz wybrać lokalizację/sklep, w którym pracujesz.
        </p>

        {loading ? (
          <div style={{ padding: '20px', color: '#666' }}>
            ⏳ Ładowanie lokalizacji...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '16px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                marginBottom: '20px',
                backgroundColor: 'white',
                cursor: 'pointer',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3498db'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
            >
              <option value="">-- Wybierz lokalizację --</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.nazwa} {loc.miasto ? `(${loc.miasto})` : ''}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={!selectedId}
              style={{
                width: '100%',
                padding: '14px 24px',
                fontSize: '16px',
                fontWeight: '600',
                color: 'white',
                backgroundColor: selectedId ? '#3498db' : '#bdc3c7',
                border: 'none',
                borderRadius: '8px',
                cursor: selectedId ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => selectedId && (e.target.style.backgroundColor = '#2980b9')}
              onMouseOut={(e) => selectedId && (e.target.style.backgroundColor = '#3498db')}
            >
              ✓ Potwierdź wybór
            </button>
          </form>
        )}

        <div style={{
          marginTop: '30px',
          paddingTop: '20px',
          borderTop: '1px solid #eee',
          fontSize: '12px',
          color: '#95a5a6'
        }}>
          💡 Lokalizacja zostanie zapamiętana do następnej sesji
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children, requireLocation = true }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { selectedLocation, availableLocations, loading: locationLoading, changeLocation } = useLocation();

  // Pokazuj loader podczas sprawdzania autoryzacji
  if (authLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Sprawdzanie autoryzacji...
      </div>
    );
  }

  // Jeśli nie jest zalogowany, przekieruj na stronę logowania
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Jeśli wymagana lokalizacja i nie jest wybrana, pokaż ekran wyboru
  if (requireLocation && !selectedLocation) {
    return (
      <LocationSelector 
        locations={availableLocations}
        loading={locationLoading}
        onSelect={changeLocation}
      />
    );
  }

  // Jeśli jest zalogowany i ma lokalizację, pokaż zawartość
  return children;
};

export default ProtectedRoute;
