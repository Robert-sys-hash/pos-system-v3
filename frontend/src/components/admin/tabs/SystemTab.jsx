import React from 'react';

const SystemTab = () => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
      {/* Informacje o systemie */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e9ecef',
        borderRadius: '0.375rem',
        overflow: 'hidden'
      }}>
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '1rem',
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '1.25rem' }}>💻</span>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
            Informacje o systemie
          </h3>
        </div>
        <div style={{ padding: '1rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Wersja systemu:</strong> 3.0.0
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Backend:</strong> Flask + SQLite
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Frontend:</strong> React.js
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Baza danych:</strong> SQLite
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Status:</strong> 
            <span style={{ 
              color: '#28a745', 
              fontWeight: '600',
              marginLeft: '0.5rem'
            }}>
              🟢 Aktywny
            </span>
          </div>
        </div>
      </div>

      {/* Statystyki */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e9ecef',
        borderRadius: '0.375rem',
        overflow: 'hidden'
      }}>
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '1rem',
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '1.25rem' }}>📊</span>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
            Statystyki systemu
          </h3>
        </div>
        <div style={{ padding: '1rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Aktywne sesje:</strong> 1
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Użytkownicy online:</strong> 1
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Ostatni restart:</strong> Dzisiaj
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Czas działania:</strong> 2h 15m
          </div>
        </div>
      </div>

      {/* Narzędzia systemowe */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e9ecef',
        borderRadius: '0.375rem',
        overflow: 'hidden'
      }}>
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '1rem',
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '1.25rem' }}>🔧</span>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
            Narzędzia
          </h3>
        </div>
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              style={{
                padding: '0.75rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
              onClick={() => alert('Funkcja w trakcie implementacji')}
            >
              🔄 Restart systemu
            </button>
            <button
              style={{
                padding: '0.75rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
              onClick={() => alert('Funkcja w trakcie implementacji')}
            >
              💾 Backup bazy danych
            </button>
            <button
              style={{
                padding: '0.75rem',
                backgroundColor: '#ffc107',
                color: '#212529',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
              onClick={() => alert('Funkcja w trakcie implementacji')}
            >
              🧹 Wyczyść cache
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemTab;
