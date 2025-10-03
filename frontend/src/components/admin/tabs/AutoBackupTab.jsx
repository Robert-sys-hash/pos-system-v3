import React, { useState } from 'react';

const AutoBackupTab = ({
  backupSchedulerStatus,
  backupList,
  backupLoading,
  loadBackupSchedulerStatus,
  loadBackupList,
  createBackup,
  restoreBackup,
  deleteBackup,
  toggleBackupScheduler
}) => {
  const [restoring, setRestoring] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      await createBackup();
      await loadBackupList();
    } catch (error) {
      console.error('Błąd tworzenia kopii zapasowej:', error);
      alert('Błąd podczas tworzenia kopii zapasowej');
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreBackup = async (backupFile) => {
    if (!window.confirm(`Czy na pewno chcesz przywrócić kopię zapasową "${backupFile}"?\n\nTo działanie zastąpi obecne dane!`)) {
      return;
    }

    setRestoring(true);
    try {
      await restoreBackup(backupFile);
      alert('Kopia zapasowa została przywrócona pomyślnie');
    } catch (error) {
      console.error('Błąd przywracania kopii zapasowej:', error);
      alert('Błąd podczas przywracania kopii zapasowej');
    } finally {
      setRestoring(false);
    }
  };

  const handleDeleteBackup = async (backupFile) => {
    if (!window.confirm(`Czy na pewno chcesz usunąć kopię zapasową "${backupFile}"?`)) {
      return;
    }

    try {
      await deleteBackup(backupFile);
      await loadBackupList();
      alert('Kopia zapasowa została usunięta');
    } catch (error) {
      console.error('Błąd usuwania kopii zapasowej:', error);
      alert('Błąd podczas usuwania kopii zapasowej');
    }
  };

  const handleToggleScheduler = async () => {
    try {
      await toggleBackupScheduler();
      await loadBackupSchedulerStatus();
    } catch (error) {
      console.error('Błąd przełączania harmonogramu:', error);
      alert('Błąd podczas zmiany harmonogramu kopii zapasowych');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString('pl-PL');
    } catch {
      return dateString;
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
      <div>
        {/* Status harmonogramu */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
          marginBottom: '1rem'
        }}>
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa'
          }}>
            <h6 style={{ margin: 0, fontWeight: '600', color: '#495057' }}>
              🕒 Harmonogram automatycznych kopii
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  Status: 
                  <span style={{
                    marginLeft: '0.5rem',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    backgroundColor: backupSchedulerStatus?.enabled ? '#28a745' : '#dc3545',
                    color: 'white'
                  }}>
                    {backupSchedulerStatus?.enabled ? 'WŁĄCZONY' : 'WYŁĄCZONY'}
                  </span>
                </div>
                {backupSchedulerStatus?.enabled && (
                  <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                    Następna kopia: {backupSchedulerStatus?.next_backup ? 
                      formatDate(backupSchedulerStatus.next_backup) : 
                      'Nieznana'
                    }
                  </div>
                )}
              </div>
              <button
                onClick={handleToggleScheduler}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: backupSchedulerStatus?.enabled ? '#dc3545' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {backupSchedulerStatus?.enabled ? 'Wyłącz' : 'Włącz'} harmonogram
              </button>
            </div>
            
            {backupSchedulerStatus?.enabled && (
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#e7f3ff',
                border: '1px solid #b8daff',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}>
                <strong>Ustawienia harmonogramu:</strong>
                <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                  <li>Częstotliwość: {backupSchedulerStatus?.frequency || 'codziennie'}</li>
                  <li>Godzina: {backupSchedulerStatus?.time || '02:00'}</li>
                  <li>Przechowywanie: {backupSchedulerStatus?.retention_days || 30} dni</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Lista kopii zapasowych */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
        }}>
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h6 style={{ margin: 0, fontWeight: '600', color: '#495057' }}>
              💾 Dostępne kopie zapasowe ({backupList?.length || 0})
            </h6>
            <button
              onClick={() => loadBackupList()}
              disabled={backupLoading}
              style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                cursor: backupLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {backupLoading ? '⟳' : '🔄'} Odśwież
            </button>
          </div>
          <div style={{ padding: '1rem' }}>
            {backupLoading ? (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#6c757d'
              }}>
                Ładowanie listy kopii zapasowych...
              </div>
            ) : backupList && backupList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {backupList.map((backup, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '1rem',
                      border: '1px solid #e9ecef',
                      borderRadius: '0.375rem',
                      backgroundColor: '#fff'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontWeight: '600', 
                          fontSize: '0.875rem',
                          color: '#495057',
                          marginBottom: '0.25rem'
                        }}>
                          📁 {backup.filename}
                        </div>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: '#6c757d',
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '1rem'
                        }}>
                          <div>
                            <strong>Data:</strong> {formatDate(backup.created_at)}
                          </div>
                          <div>
                            <strong>Rozmiar:</strong> {formatFileSize(backup.size)}
                          </div>
                          <div>
                            <strong>Typ:</strong> {backup.type === 'auto' ? 'Automatyczna' : 'Manualna'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                        <button
                          onClick={() => handleRestoreBackup(backup.filename)}
                          disabled={restoring}
                          style={{
                            padding: '0.375rem 0.75rem',
                            fontSize: '0.75rem',
                            backgroundColor: restoring ? '#6c757d' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: restoring ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {restoring ? '⟳' : '↺'} Przywróć
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(backup.filename)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            fontSize: '0.75rem',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer'
                          }}
                        >
                          🗑️ Usuń
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#6c757d',
                fontStyle: 'italic'
              }}>
                Brak dostępnych kopii zapasowych
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div>
        {/* Tworzenie nowej kopii */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
          marginBottom: '1rem'
        }}>
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa'
          }}>
            <h6 style={{ margin: 0, fontWeight: '600', color: '#495057' }}>
              ➕ Nowa kopia zapasowa
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            <button
              onClick={handleCreateBackup}
              disabled={creating}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: creating ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: creating ? 'not-allowed' : 'pointer',
                marginBottom: '0.75rem'
              }}
            >
              {creating ? '⟳ Tworzenie...' : '💾 Utwórz kopię teraz'}
            </button>
            <div style={{ 
              fontSize: '0.75rem',
              color: '#6c757d',
              textAlign: 'center',
              lineHeight: '1.4'
            }}>
              Kopia zapasowa obejmuje wszystkie dane systemu, ustawienia i konfigurację.
            </div>
          </div>
        </div>

        {/* Statystyki */}
        <div style={{
          backgroundColor: '#17a2b8',
          color: 'white',
          borderRadius: '0.375rem',
          padding: '1rem',
          textAlign: 'center',
          marginBottom: '1rem'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            💾 {backupList?.length || 0}
          </div>
          <div>Dostępnych kopii</div>
        </div>

        {/* Rozmiar wszystkich kopii */}
        {backupList && backupList.length > 0 && (
          <div style={{
            backgroundColor: '#ffc107',
            color: '#000',
            borderRadius: '0.375rem',
            padding: '1rem',
            textAlign: 'center',
            marginBottom: '1rem'
          }}>
            <div style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              📊 {formatFileSize(backupList.reduce((total, backup) => total + (backup.size || 0), 0))}
            </div>
            <div>Łączny rozmiar kopii</div>
          </div>
        )}
        
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
        }}>
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa'
          }}>
            <h6 style={{ margin: 0, fontWeight: '600', color: '#495057' }}>
              💡 Informacje
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            <p style={{ color: '#6c757d', lineHeight: '1.5', margin: '0', fontSize: '0.875rem' }}>
              Regularne tworzenie kopii zapasowych chroni Twoje dane przed utratą. 
              Zalecamy włączenie automatycznego harmonogramu i sprawdzanie 
              kopii przynajmniej raz w tygodniu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoBackupTab;
