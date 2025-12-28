import React, { useState, useEffect } from 'react';

const LogsTab = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const loadLogs = async () => {
    setLoading(true);
    try {
      // Symulacja logów - można później podłączyć do prawdziwego API
      setTimeout(() => {
        const mockLogs = [
          {
            id: 1,
            timestamp: new Date().toISOString(),
            level: 'INFO',
            message: 'System uruchomiony pomyślnie',
            source: 'SYSTEM'
          },
          {
            id: 2,
            timestamp: new Date(Date.now() - 300000).toISOString(),
            level: 'DEBUG',
            message: 'Użytkownik zalogowany: admin',
            source: 'AUTH'
          },
          {
            id: 3,
            timestamp: new Date(Date.now() - 600000).toISOString(),
            level: 'ERROR',
            message: 'Błąd połączenia z bazą danych',
            source: 'DATABASE'
          },
          {
            id: 4,
            timestamp: new Date(Date.now() - 900000).toISOString(),
            level: 'WARN',
            message: 'Niski poziom zapasu produktu ID: 123',
            source: 'INVENTORY'
          },
          {
            id: 5,
            timestamp: new Date(Date.now() - 1200000).toISOString(),
            level: 'INFO',
            message: 'Transakcja zakończona pomyślnie: T-001',
            source: 'POS'
          }
        ];
        setLogs(mockLogs);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Błąd ładowania logów:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getLogLevelColor = (level) => {
    switch (level) {
      case 'ERROR': return '#dc3545';
      case 'WARN': return '#ffc107';
      case 'INFO': return '#007bff';
      case 'DEBUG': return '#6c757d';
      default: return '#495057';
    }
  };

  const getLogLevelIcon = (level) => {
    switch (level) {
      case 'ERROR': return '❌';
      case 'WARN': return '⚠️';
      case 'INFO': return 'ℹ️';
      case 'DEBUG': return '🔍';
      default: return '📝';
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.level.toLowerCase() === filter.toLowerCase();
  });

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('pl-PL');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        marginBottom: '2rem',
        padding: '1.5rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '0.5rem',
        border: '1px solid #e9ecef'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem'
        }}>
          <h3 style={{
            margin: 0,
            color: '#495057',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            📋 Logi systemowe
          </h3>
          <button
            onClick={loadLogs}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            🔄 Odśwież
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all', 'error', 'warn', 'info', 'debug'].map(level => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: '500',
                border: '1px solid #dee2e6',
                borderRadius: '0.25rem',
                backgroundColor: filter === level ? '#007bff' : 'white',
                color: filter === level ? 'white' : '#495057',
                cursor: 'pointer'
              }}
            >
              {level === 'all' ? 'Wszystkie' : level.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        border: '1px solid #e9ecef',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e9ecef',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h4 style={{ margin: 0, color: '#495057' }}>
            Historia logów ({filteredLogs.length})
          </h4>
          <small style={{ color: '#6c757d' }}>
            Ostatnia aktualizacja: {formatTimestamp(new Date().toISOString())}
          </small>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div>Ładowanie logów...</div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
            Brak logów do wyświetlenia
          </div>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #f1f3f4',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem'
                }}
              >
                <div style={{
                  fontSize: '1.25rem',
                  flexShrink: 0
                }}>
                  {getLogLevelIcon(log.level)}
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.25rem'
                  }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: getLogLevelColor(log.level),
                        backgroundColor: getLogLevelColor(log.level) + '20',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '0.25rem'
                      }}
                    >
                      {log.level}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      color: '#6c757d',
                      backgroundColor: '#f8f9fa',
                      padding: '0.125rem 0.375rem',
                      borderRadius: '0.25rem'
                    }}>
                      {log.source}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      color: '#6c757d',
                      marginLeft: 'auto'
                    }}>
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#495057',
                    lineHeight: '1.4'
                  }}>
                    {log.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsTab;
