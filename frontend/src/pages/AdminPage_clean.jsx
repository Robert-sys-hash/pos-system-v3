import React, { useState, useEffect } from 'react';
import '../styles/AdminPage.css';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // State dla definicji dokumentów
  const [documentDefinitions, setDocumentDefinitions] = useState([]);
  const [documentDefinitionsLoading, setDocumentDefinitionsLoading] = useState(true);
  const [newDefinition, setNewDefinition] = useState({
    document_type: '',
    symbol: '',
    format_template: '',
    description: ''
  });
  const [previewNumber, setPreviewNumber] = useState('');

  // State dla backupów
  const [backupSchedulerStatus, setBackupSchedulerStatus] = useState(null);
  const [schedulerLoading, setSchedulerLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupList, setBackupList] = useState([]);
  const [backupListLoading, setBackupListLoading] = useState(false);

  // Funkcje zarządzania definicjami dokumentów
  const loadDocumentDefinitions = async () => {
    try {
      setDocumentDefinitionsLoading(true);
      const response = await fetch('http://localhost:5002/api/admin/document-definitions');
      if (response.ok) {
        const data = await response.json();
        setDocumentDefinitions(data.data || []);
      } else {
        console.error('Błąd pobierania definicji dokumentów');
      }
    } catch (error) {
      console.error('Błąd:', error);
    } finally {
      setDocumentDefinitionsLoading(false);
    }
  };

  const handleCreateDefinition = async () => {
    if (!newDefinition.document_type || !newDefinition.symbol || !newDefinition.format_template) {
      alert('Proszę wypełnić wszystkie wymagane pola');
      return;
    }

    try {
      const response = await fetch('http://localhost:5002/api/admin/document-definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDefinition)
      });

      if (response.ok) {
        setNewDefinition({
          document_type: '',
          symbol: '',
          format_template: '',
          description: ''
        });
        loadDocumentDefinitions();
        alert('Definicja dokumentu została utworzona');
      } else {
        alert('Błąd tworzenia definicji dokumentu');
      }
    } catch (error) {
      console.error('Błąd:', error);
      alert('Błąd serwera');
    }
  };

  const handleGeneratePreview = async (docType) => {
    try {
      const response = await fetch(`http://localhost:5002/api/admin/document-definitions/${docType}/preview`);
      if (response.ok) {
        const data = await response.json();
        setPreviewNumber(data.preview_number);
      }
    } catch (error) {
      console.error('Błąd podglądu:', error);
    }
  };

  const handleResetCounter = async (docType) => {
    if (!confirm(`Czy na pewno chcesz zresetować licznik dla typu "${docType}"?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5002/api/admin/document-definitions/${docType}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_number: 1 })
      });

      if (response.ok) {
        loadDocumentDefinitions();
        alert('Licznik został zresetowany');
      } else {
        alert('Błąd resetowania licznika');
      }
    } catch (error) {
      console.error('Błąd:', error);
      alert('Błąd serwera');
    }
  };

  // Funkcje backupów
  const handleGetSchedulerStatus = async () => {
    try {
      setSchedulerLoading(true);
      const response = await fetch('http://localhost:5002/api/admin/backup/scheduler/status');
      if (response.ok) {
        const data = await response.json();
        setBackupSchedulerStatus(data);
      }
    } catch (error) {
      console.error('Błąd:', error);
    } finally {
      setSchedulerLoading(false);
    }
  };

  const handleStartScheduler = async () => {
    try {
      setSchedulerLoading(true);
      const response = await fetch('http://localhost:5002/api/admin/backup/scheduler/start', {
        method: 'POST'
      });
      if (response.ok) {
        alert('Scheduler został uruchomiony');
        handleGetSchedulerStatus();
      }
    } catch (error) {
      console.error('Błąd:', error);
    } finally {
      setSchedulerLoading(false);
    }
  };

  const handleStopScheduler = async () => {
    try {
      setSchedulerLoading(true);
      const response = await fetch('http://localhost:5002/api/admin/backup/scheduler/stop', {
        method: 'POST'
      });
      if (response.ok) {
        alert('Scheduler został zatrzymany');
        handleGetSchedulerStatus();
      }
    } catch (error) {
      console.error('Błąd:', error);
    } finally {
      setSchedulerLoading(false);
    }
  };

  const handleManualBackup = async () => {
    try {
      setBackupLoading(true);
      const response = await fetch('http://localhost:5002/api/admin/backup/create', {
        method: 'POST'
      });
      if (response.ok) {
        alert('Backup został utworzony');
        handleLoadBackupList();
      }
    } catch (error) {
      console.error('Błąd:', error);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleLoadBackupList = async () => {
    try {
      setBackupListLoading(true);
      const response = await fetch('http://localhost:5002/api/admin/backup/list');
      if (response.ok) {
        const data = await response.json();
        setBackupList(data.backups || []);
      }
    } catch (error) {
      console.error('Błąd:', error);
    } finally {
      setBackupListLoading(false);
    }
  };

  // useEffect dla ładowania danych
  useEffect(() => {
    if (activeTab === 'document-definitions') {
      loadDocumentDefinitions();
    } else if (activeTab === 'auto-backup') {
      handleGetSchedulerStatus();
      handleLoadBackupList();
    }
  }, [activeTab]);

  // Funkcje renderujące taby
  const renderUsersTab = () => (
    <div style={{ padding: '20px' }}>
      <h3>Zarządzanie Użytkownikami</h3>
      <p>Tutaj będzie zarządzanie użytkownikami</p>
    </div>
  );

  const renderProductsTab = () => (
    <div style={{ padding: '20px' }}>
      <h3>Zarządzanie Produktami</h3>
      <p>Tutaj będzie zarządzanie produktami</p>
    </div>
  );

  const renderDiscountsTab = () => (
    <div style={{ padding: '20px' }}>
      <h3>Zarządzanie Rabatami</h3>
      <p>Tutaj będzie zarządzanie rabatami</p>
    </div>
  );

  const renderAnnouncementsTab = () => (
    <div style={{ padding: '20px' }}>
      <h3>Zarządzanie Ogłoszeniami</h3>
      <p>Tutaj będzie zarządzanie ogłoszeniami</p>
    </div>
  );

  const renderCouponsTab = () => (
    <div style={{ padding: '20px' }}>
      <h3>Zarządzanie Kuponami</h3>
      <p>Tutaj będzie zarządzanie kuponami</p>
    </div>
  );

  const renderDailyClosureTab = () => (
    <div style={{ padding: '20px' }}>
      <h3>Zamknięcie Dnia</h3>
      <p>Tutaj będzie zamknięcie dnia</p>
    </div>
  );

  const renderDocumentDefinitionsTab = () => {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h3>Definicje Dokumentów</h3>

        {/* Formularz dodawania nowej definicji */}
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px' 
        }}>
          <h4>Dodaj nową definicję dokumentu</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            <div>
              <label>Typ dokumentu:</label>
              <input
                type="text"
                value={newDefinition.document_type}
                onChange={(e) => setNewDefinition({...newDefinition, document_type: e.target.value})}
                placeholder="np. paragon"
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>
            <div>
              <label>Symbol:</label>
              <input
                type="text"
                value={newDefinition.symbol}
                onChange={(e) => setNewDefinition({...newDefinition, symbol: e.target.value})}
                placeholder="np. PA"
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>
            <div>
              <label>Szablon formatu:</label>
              <input
                type="text"
                value={newDefinition.format_template}
                onChange={(e) => setNewDefinition({...newDefinition, format_template: e.target.value})}
                placeholder="np. {symbol}-{number}-{month}-{year}-{warehouse}"
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>
            <div>
              <label>Opis (opcjonalny):</label>
              <input
                type="text"
                value={newDefinition.description}
                onChange={(e) => setNewDefinition({...newDefinition, description: e.target.value})}
                placeholder="Opis definicji"
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>
          </div>
          <button 
            onClick={handleCreateDefinition}
            style={{ 
              marginTop: '15px', 
              padding: '10px 20px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px' 
            }}
          >
            Dodaj definicję
          </button>
        </div>

        {/* Lista istniejących definicji */}
        <div>
          <h4>Istniejące definicje</h4>
          {documentDefinitionsLoading ? (
            <p>Ładowanie...</p>
          ) : documentDefinitions.length === 0 ? (
            <p>Brak definicji dokumentów</p>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {documentDefinitions.map((def) => (
                <div key={def.id} style={{ 
                  border: '1px solid #ddd', 
                  padding: '15px', 
                  borderRadius: '8px',
                  backgroundColor: 'white'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    <div><strong>Typ:</strong> {def.document_type}</div>
                    <div><strong>Symbol:</strong> {def.symbol}</div>
                    <div><strong>Aktualny numer:</strong> {def.current_number}</div>
                    <div><strong>Format:</strong> {def.format_template}</div>
                    <div><strong>Ostatni:</strong> {def.last_generated || 'Brak'}</div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={() => handleGeneratePreview(def.document_type)}
                        style={{ 
                          padding: '5px 10px', 
                          backgroundColor: '#28a745', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '3px',
                          fontSize: '12px'
                        }}
                      >
                        Podgląd
                      </button>
                      <button 
                        onClick={() => handleResetCounter(def.document_type)}
                        style={{ 
                          padding: '5px 10px', 
                          backgroundColor: '#dc3545', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '3px',
                          fontSize: '12px'
                        }}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                  {def.description && (
                    <div style={{ marginTop: '10px', fontStyle: 'italic', color: '#666' }}>
                      {def.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Podgląd numeru */}
        {previewNumber && (
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            backgroundColor: '#e7f3ff', 
            border: '1px solid #007bff', 
            borderRadius: '8px' 
          }}>
            <strong>Podgląd następnego numeru:</strong> {previewNumber}
          </div>
        )}
      </div>
    );
  };

  const renderAutoBackupTab = () => (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        marginBottom: '2rem',
        padding: '1.5rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '0.5rem',
        border: '1px solid #e9ecef'
      }}>
        <h3 style={{ 
          margin: '0 0 1rem 0', 
          color: '#495057',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span>💾</span> Automatyczne kopie zapasowe
        </h3>
        <p style={{ color: '#6c757d', margin: '0 0 1rem 0' }}>
          System automatycznie tworzy kopie zapasowe bazy danych zgodnie z harmonogramem.
        </p>

        {/* Status schedulera */}
        <div style={{
          padding: '1rem',
          backgroundColor: 'white',
          borderRadius: '0.375rem',
          border: '1px solid #e9ecef',
          marginBottom: '1.5rem'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#495057' }}>Status Schedulera</h4>
          
          {backupSchedulerStatus ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span>Status:</span>
                <span style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  backgroundColor: backupSchedulerStatus.is_running ? '#d4edda' : '#f8d7da',
                  color: backupSchedulerStatus.is_running ? '#155724' : '#721c24'
                }}>
                  {backupSchedulerStatus.is_running ? '🟢 AKTYWNY' : '🔴 NIEAKTYWNY'}
                </span>
              </div>
              {backupSchedulerStatus.next_backup && (
                <p style={{ color: '#6c757d', margin: '0', fontSize: '0.875rem' }}>
                  Następny backup: {backupSchedulerStatus.next_backup}
                </p>
              )}
              <p style={{ color: '#6c757d', margin: '0', fontSize: '0.875rem' }}>
                Zaplanowanych zadań: {backupSchedulerStatus.scheduled_jobs}
              </p>
            </div>
          ) : (
            <p style={{ color: '#6c757d', margin: '0' }}>Ładowanie...</p>
          )}
        </div>

        <div style={{
          padding: '1rem',
          backgroundColor: 'white',
          borderRadius: '0.375rem',
          border: '1px solid #e9ecef'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#495057' }}>Kontrola Schedulera</h4>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleStartScheduler}
              disabled={schedulerLoading}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                opacity: schedulerLoading ? 0.6 : 1
              }}
            >
              {schedulerLoading ? 'Ładowanie...' : '▶️ Start Scheduler'}
            </button>
            <button
              onClick={handleStopScheduler}
              disabled={schedulerLoading}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                opacity: schedulerLoading ? 0.6 : 1
              }}
            >
              {schedulerLoading ? 'Ładowanie...' : '⏹️ Stop Scheduler'}
            </button>
            <button
              onClick={handleGetSchedulerStatus}
              disabled={schedulerLoading}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                opacity: schedulerLoading ? 0.6 : 1
              }}
            >
              {schedulerLoading ? 'Ładowanie...' : '🔄 Sprawdź Status'}
            </button>
          </div>
        </div>
      </div>

      {/* Ręczny backup */}
      <div style={{
        padding: '1rem',
        backgroundColor: 'white',
        borderRadius: '0.375rem',
        border: '1px solid #e9ecef',
        marginBottom: '1.5rem'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>Ręczny Backup</h4>
        <p style={{ color: '#6c757d', margin: '0 0 1rem 0', fontSize: '0.875rem' }}>
          Utwórz kopię zapasową natychmiast (niezależnie od automatycznego harmonogramu)
        </p>
        <button
          onClick={handleManualBackup}
          disabled={backupLoading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            opacity: backupLoading ? 0.6 : 1
          }}
        >
          {backupLoading ? 'Tworzenie...' : '💾 Utwórz backup teraz'}
        </button>
      </div>

      {/* Lista backupów */}
      <div style={{
        padding: '1rem',
        backgroundColor: 'white',
        borderRadius: '0.375rem',
        border: '1px solid #e9ecef'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ margin: '0', color: '#495057' }}>Lista kopii zapasowych</h4>
          <button
            onClick={handleLoadBackupList}
            disabled={backupListLoading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              opacity: backupListLoading ? 0.6 : 1
            }}
          >
            🔄 Odśwież
          </button>
        </div>

        {backupList.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid #e9ecef' }}>Nazwa pliku</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid #e9ecef' }}>Rozmiar</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid #e9ecef' }}>Data utworzenia</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid #e9ecef' }}>Typ</th>
                </tr>
              </thead>
              <tbody>
                {backupList.map((backup, index) => (
                  <tr key={index}>
                    <td style={{ padding: '0.5rem', border: '1px solid #e9ecef', fontSize: '0.875rem' }}>
                      {backup.filename}
                    </td>
                    <td style={{ padding: '0.5rem', border: '1px solid #e9ecef', fontSize: '0.875rem' }}>
                      {(backup.size / 1024 / 1024).toFixed(2)} MB
                    </td>
                    <td style={{ padding: '0.5rem', border: '1px solid #e9ecef', fontSize: '0.875rem' }}>
                      {new Date(backup.created).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.5rem', border: '1px solid #e9ecef', fontSize: '0.875rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        backgroundColor: backup.is_automatic ? '#d1ecf1' : '#fff3cd',
                        color: backup.is_automatic ? '#0c5460' : '#856404'
                      }}>
                        {backup.is_automatic ? '🤖 Auto' : '👤 Ręczny'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#6c757d', margin: '0', textAlign: 'center', padding: '2rem' }}>
            Brak kopii zapasowych
          </p>
        )}
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div style={{ padding: '20px' }}>
      <h3>Ustawienia Systemu</h3>
      <p>Tutaj będą ustawienia systemu</p>
    </div>
  );

  const renderLogsTab = () => (
    <div style={{ padding: '20px' }}>
      <h3>Logi Systemu</h3>
      <p>Tutaj będą logi systemu</p>
    </div>
  );

  return (
    <>
      <div className="admin-container">
        <div className="admin-header">
          <h2>Panel Administracyjny</h2>
        </div>
        
        <div className="admin-content">
          <div className="admin-tabs">
            <button 
              className={activeTab === 'users' ? 'active' : ''} 
              onClick={() => setActiveTab('users')}
            >
              👥 Użytkownicy
            </button>
            <button 
              className={activeTab === 'products' ? 'active' : ''} 
              onClick={() => setActiveTab('products')}
            >
              📦 Produkty
            </button>
            <button 
              className={activeTab === 'discounts' ? 'active' : ''} 
              onClick={() => setActiveTab('discounts')}
            >
              💸 Rabaty
            </button>
            <button 
              className={activeTab === 'announcements' ? 'active' : ''} 
              onClick={() => setActiveTab('announcements')}
            >
              📢 Ogłoszenia
            </button>
            <button 
              className={activeTab === 'coupons' ? 'active' : ''} 
              onClick={() => setActiveTab('coupons')}
            >
              🎫 Kupony
            </button>
            <button 
              className={activeTab === 'daily-closure' ? 'active' : ''} 
              onClick={() => setActiveTab('daily-closure')}
            >
              📊 Zamknięcie dnia
            </button>
            <button 
              className={activeTab === 'document-definitions' ? 'active' : ''} 
              onClick={() => setActiveTab('document-definitions')}
            >
              📄 Definicje dokumentów
            </button>
            <button 
              className={activeTab === 'auto-backup' ? 'active' : ''} 
              onClick={() => setActiveTab('auto-backup')}
            >
              💾 Auto Backup
            </button>
            <button 
              className={activeTab === 'settings' ? 'active' : ''} 
              onClick={() => setActiveTab('settings')}
            >
              ⚙️ Ustawienia
            </button>
            <button 
              className={activeTab === 'logs' ? 'active' : ''} 
              onClick={() => setActiveTab('logs')}
            >
              📋 Logi
            </button>
          </div>

          <div className="admin-tab-content">
            {activeTab === 'users' && renderUsersTab()}
            {activeTab === 'products' && renderProductsTab()}
            {activeTab === 'discounts' && renderDiscountsTab()}
            {activeTab === 'announcements' && renderAnnouncementsTab()}
            {activeTab === 'coupons' && renderCouponsTab()}
            {activeTab === 'daily-closure' && renderDailyClosureTab()}
            {activeTab === 'document-definitions' && renderDocumentDefinitionsTab()}
            {activeTab === 'auto-backup' && renderAutoBackupTab()}
            {activeTab === 'settings' && renderSettingsTab()}
            {activeTab === 'logs' && renderLogsTab()}
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminPage;
