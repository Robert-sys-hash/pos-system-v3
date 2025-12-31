import React, { useState, useEffect } from 'react';

const FiscalPrinterTab = () => {
  const [printerStatus, setPrinterStatus] = useState(null);
  const [fiscalConfig, setFiscalConfig] = useState(null);
  const [testModeStatus, setTestModeStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastTest, setLastTest] = useState(null);

  // Pobieranie statusu drukarki fiskalnej
  const fetchPrinterStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/fiscal/status');
      const data = await response.json();
      
      if (data.success) {
        setPrinterStatus(data.message);
      } else {
        setError('Błąd pobierania statusu drukarki');
      }
    } catch (err) {
      setError('Błąd komunikacji z serwerem');
    } finally {
      setLoading(false);
    }
  };

  // Pobieranie konfiguracji fiskalnej
  const fetchFiscalConfig = async () => {
    try {
      const response = await fetch('/api/fiscal/config');
      const data = await response.json();
      
      if (data.success) {
        setFiscalConfig(data.message);
      }
    } catch (err) {
      console.error('Błąd pobierania konfiguracji fiskalnej:', err);
    }
  };

  // Test połączenia z drukarką
  const testPrinterConnection = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/fiscal/test', { method: 'POST' });
      const data = await response.json();
      
      setLastTest({
        success: data.success,
        message: typeof data.message === 'string' ? data.message : (data.success ? 'Test pomyślny' : 'Test nieudany'),
        timestamp: new Date()
      });
      
      // Odśwież status po teście
      await fetchPrinterStatus();
    } catch (err) {
      setLastTest({
        success: false,
        message: 'Błąd komunikacji z serwerem',
        timestamp: new Date()
      });
    } finally {
      setLoading(false);
    }
  };

  // Automatyczna fiskalizacja nieskalizowanych transakcji
  const runAutoFiscalization = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/fiscal/auto-fiscalize', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        alert(`Automatyczna fiskalizacja zakończona!\nPrzetworzono: ${data.message.processed_count}\nPomyślne: ${data.message.success_count}\nBłędy: ${data.message.failed_count}`);
      } else {
        alert(`Błąd automatycznej fiskalizacji: ${data.message}`);
      }
    } catch (err) {
      alert('Błąd komunikacji z serwerem');
    } finally {
      setLoading(false);
    }
  };

  // Otwarcie szuflady kasowej
  const openCashDrawer = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/fiscal/drawer/open', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        alert('Szuflada kasowa została otwarta');
      } else {
        alert(`Błąd: ${data.message}`);
      }
    } catch (err) {
      alert('Błąd komunikacji z serwerem');
    } finally {
      setLoading(false);
    }
  };

  // Raport dobowy
  const generateDailyReport = async () => {
    if (!window.confirm('Czy na pewno chcesz wykonać raport dobowy (Z)? Ta operacja zamknie dzień fiskalny.')) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch('/api/fiscal/daily-report', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        alert('Raport dobowy (Z) został wykonany pomyślnie');
      } else {
        alert(`Błąd raportu dobowego: ${data.message}`);
      }
    } catch (err) {
      alert('Błąd komunikacji z serwerem');
    } finally {
      setLoading(false);
    }
  };

  // Pobieranie statusu trybu testowego
  const fetchTestModeStatus = async () => {
    try {
      const response = await fetch('/api/fiscal/test-mode/status');
      const data = await response.json();
      
      if (data.success) {
        // Backend zwraca dane w polu 'message', nie 'data'
        setTestModeStatus(data.message.test_mode || false);
      }
    } catch (err) {
      console.error('Błąd pobierania statusu trybu testowego:', err);
    }
  };

  // Włączenie trybu testowego
  const enableTestMode = async () => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Czy na pewno chcesz włączyć tryb testowy?\n\nW tym trybie fiskalizacja będzie symulowana bez rzeczywistej drukarki fiskalnej. To pozwoli na testowanie systemu wystawiania faktur do paragonów.')) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch('/api/fiscal/test-mode/enable', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        alert('Tryb testowy został włączony!\n\nFiskalizacja będzie teraz symulowana.');
        // Odśwież wszystkie statusy
        await Promise.all([
          fetchTestModeStatus(),
          fetchPrinterStatus()
        ]);
      } else {
        alert(`Błąd włączania trybu testowego: ${data.message}`);
      }
    } catch (err) {
      alert('Błąd komunikacji z serwerem');
    } finally {
      setLoading(false);
    }
  };

  // Wyłączenie trybu testowego
  const disableTestMode = async () => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Czy na pewno chcesz wyłączyć tryb testowy?\n\nSystem przywróci normalną komunikację z drukarką fiskalną.')) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch('/api/fiscal/test-mode/disable', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        alert('Tryb testowy został wyłączony!\n\nPrzywrócono normalną komunikację z drukarką.');
        // Odśwież wszystkie statusy
        await Promise.all([
          fetchTestModeStatus(),
          fetchPrinterStatus()
        ]);
      } else {
        alert(`Błąd wyłączania trybu testowego: ${data.message}`);
      }
    } catch (err) {
      alert('Błąd komunikacji z serwerem');
    } finally {
      setLoading(false);
    }
  };

  // Test fiskalizacji w trybie testowym
  const testFiscalization = async () => {
    const transactionId = prompt('Podaj ID transakcji do testowej fiskalizacji:');
    if (!transactionId || isNaN(transactionId)) {
      alert('Nieprawidłowe ID transakcji');
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`/api/fiscal/test-fiscalize/${transactionId}`, { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        alert(`Testowa fiskalizacja zakończona pomyślnie!\n\nNumer fiskalny: ${data.data.fiscal_number}\nTryb testowy: ${data.data.test_mode ? 'TAK' : 'NIE'}`);
      } else {
        alert(`Błąd testowej fiskalizacji: ${data.message}`);
      }
    } catch (err) {
      alert('Błąd komunikacji z serwerem');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrinterStatus();
    fetchFiscalConfig();
    fetchTestModeStatus();
  }, []); // Pusty array dependency - uruchom tylko raz przy mount

  const getStatusColor = (status) => {
    if (!printerStatus) return '#6c757d';
    if (printerStatus.connected && printerStatus.status === 'ready') return '#28a745';
    if (printerStatus.connected) return '#ffc107';
    return '#dc3545';
  };

  const getStatusText = () => {
    if (!printerStatus) return 'Sprawdzanie...';
    if (printerStatus.connected && printerStatus.status === 'ready') return 'Podłączona i gotowa';
    if (printerStatus.connected) return 'Podłączona (problemy)';
    return 'Niepodłączona';
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <h4 style={{ marginBottom: '2rem', color: '#495057' }}>🖨️ Drukarka Fiskalna Novitus Deon</h4>
      
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '0.75rem',
          borderRadius: '0.375rem',
          marginBottom: '1rem',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}

      {/* Status drukarki */}
      <div style={{
        backgroundColor: '#fff',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem'
      }}>
        <h5 style={{ marginBottom: '1rem', color: '#495057' }}>Status Drukarki</h5>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <strong>Status połączenia:</strong>
            <div style={{
              display: 'inline-block',
              marginLeft: '0.5rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              backgroundColor: getStatusColor(),
              color: 'white',
              fontSize: '0.875rem'
            }}>
              {getStatusText()}
            </div>
          </div>
          
          {printerStatus && (
            <>
              <div>
                <strong>Fiskalizacja włączona:</strong>
                <span style={{ marginLeft: '0.5rem', color: printerStatus.fiscal_enabled ? '#28a745' : '#dc3545' }}>
                  {printerStatus.fiscal_enabled ? 'TAK' : 'NIE'}
                </span>
              </div>
              
              <div>
                <strong>Wymagana fiskalizacja:</strong>
                <span style={{ marginLeft: '0.5rem', color: printerStatus.require_fiscal ? '#dc3545' : '#28a745' }}>
                  {printerStatus.require_fiscal ? 'TAK' : 'NIE'}
                </span>
              </div>
            </>
          )}
        </div>

        {lastTest && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '0.375rem' }}>
            <strong>Ostatni test połączenia:</strong>
            <div style={{ marginTop: '0.25rem' }}>
              <span style={{ color: lastTest.success ? '#28a745' : '#dc3545' }}>
                {lastTest.success ? '✅' : '❌'} {lastTest.message}
              </span>
              <small style={{ marginLeft: '1rem', color: '#6c757d' }}>
                ({lastTest.timestamp.toLocaleString()})
              </small>
            </div>
          </div>
        )}
      </div>

      {/* Tryb Testowy */}
      <div style={{
        backgroundColor: '#fff',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem',
        border: testModeStatus?.test_mode ? '2px solid #ffc107' : '1px solid #dee2e6'
      }}>
        <h5 style={{ 
          marginBottom: '1rem', 
          color: '#495057',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          🧪 Tryb Testowy
          {testModeStatus?.test_mode && (
            <span style={{
              backgroundColor: '#ffc107',
              color: '#212529',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              fontWeight: 'bold'
            }}>
              AKTYWNY
            </span>
          )}
        </h5>
        
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ marginBottom: '0.5rem', color: '#6c757d' }}>
            Tryb testowy pozwala na symulację fiskalizacji bez rzeczywistej drukarki fiskalnej. 
            Idealny do testowania systemu wystawiania faktur do paragonów.
          </p>
        </div>

        {testModeStatus && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <strong>Status trybu testowego:</strong>
              <div style={{
                color: testModeStatus.test_mode ? '#ffc107' : '#28a745',
                fontWeight: 'bold'
              }}>
                {testModeStatus.test_mode ? '🧪 TRYB TESTOWY' : '🖨️ NORMALNA PRACA'}
              </div>
            </div>
            
            <div>
              <strong>Drukarka dostępna:</strong>
              <span style={{ 
                marginLeft: '0.5rem', 
                color: testModeStatus.printer_available ? '#28a745' : '#dc3545' 
              }}>
                {testModeStatus.printer_available ? 'TAK' : 'NIE'}
              </span>
            </div>
            
            <div>
              <strong>Fiskalizacja włączona:</strong>
              <span style={{ 
                marginLeft: '0.5rem', 
                color: testModeStatus.enabled ? '#28a745' : '#dc3545' 
              }}>
                {testModeStatus.enabled ? 'TAK' : 'NIE'}
              </span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {testModeStatus?.test_mode ? (
            <>
              <button
                onClick={disableTestMode}
                disabled={loading}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                🖨️ Wyłącz tryb testowy
              </button>
              
              <button
                onClick={testFiscalization}
                disabled={loading}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                🧪 Test fiskalizacji
              </button>
            </>
          ) : (
            <button
              onClick={enableTestMode}
              disabled={loading}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#ffc107',
                color: '#212529',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 'bold'
              }}
            >
              🧪 Włącz tryb testowy
            </button>
          )}
        </div>
      </div>

      {/* Konfiguracja */}
      {fiscalConfig && (
        <div style={{
          backgroundColor: '#fff',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem'
        }}>
          <h5 style={{ marginBottom: '1rem', color: '#495057' }}>Konfiguracja</h5>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div>
              <strong>Port komunikacyjny:</strong>
              <div>{fiscalConfig.printer_config?.port || 'Nie skonfigurowany'}</div>
            </div>
            <div>
              <strong>Prędkość transmisji:</strong>
              <div>{fiscalConfig.printer_config?.baudrate || 'Nie skonfigurowana'}</div>
            </div>
            <div>
              <strong>Automatyczna fiskalizacja:</strong>
              <div style={{ color: fiscalConfig.fiscal_config?.auto_fiscalize ? '#28a745' : '#dc3545' }}>
                {fiscalConfig.fiscal_config?.auto_fiscalize ? 'Włączona' : 'Wyłączona'}
              </div>
            </div>
            <div>
              <strong>Domyślna stawka VAT:</strong>
              <div>{fiscalConfig.fiscal_config?.default_vat_rate || 23}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Akcje */}
      <div style={{
        backgroundColor: '#fff',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h5 style={{ marginBottom: '1rem', color: '#495057' }}>Akcje</h5>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <button
            onClick={testPrinterConnection}
            disabled={loading}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            🔄 Test Połączenia
          </button>

          <button
            onClick={fetchPrinterStatus}
            disabled={loading}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            🔄 Odśwież Status
          </button>

          <button
            onClick={runAutoFiscalization}
            disabled={loading}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#ffc107',
              color: '#212529',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            ⚡ Auto-fiskalizacja
          </button>

          <button
            onClick={openCashDrawer}
            disabled={loading}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            💰 Otwórz Szufladę
          </button>

          <button
            onClick={generateDailyReport}
            disabled={loading}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            📊 Raport Dobowy (Z)
          </button>

          {/* Przycisk trybu testowego */}
          {testModeStatus !== null && (
            testModeStatus ? (
              <button
                onClick={disableTestMode}
                disabled={loading}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fd7e14',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                🧪 Wyłącz Tryb Testowy
              </button>
            ) : (
              <button
                onClick={enableTestMode}
                disabled={loading}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#20c997',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                🧪 Włącz Tryb Testowy
              </button>
            )
          )}

          {/* Test fiskalizacji - tylko gdy tryb testowy jest aktywny */}
          {testModeStatus && (
            <button
              onClick={testFiscalization}
              disabled={loading}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              🔬 Test Fiskalizacji
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '0.5rem',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '1rem' }}>⏳ Przetwarzanie...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiscalPrinterTab;
