import React, { useState, useEffect } from 'react';
import announcementService from '../../services/announcementService';

const AnnouncementAdmin = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  
  const [newAnnouncement, setNewAnnouncement] = useState({
    tytul: '',
    tresc: '',
    autor: 'Administrator',
    wazne_do: '',
    priorytet: 0
  });

  const loadAnnouncements = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await announcementService.getAnnouncements();
      if (response.success) {
        setAnnouncements(response.data);
      } else {
        setError(response.message || 'Błąd pobierania ogłoszeń');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    
    if (!newAnnouncement.tytul.trim() || !newAnnouncement.tresc.trim()) {
      setError('Tytuł i treść są wymagane');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const announcementData = {
        ...newAnnouncement,
        tytul: newAnnouncement.tytul.trim(),
        tresc: newAnnouncement.tresc.trim(),
        wazne_do: newAnnouncement.wazne_do || null,
        priorytet: parseInt(newAnnouncement.priorytet) || 0
      };

      const response = await announcementService.createAnnouncement(announcementData);
      
      if (response.success) {
        setNewAnnouncement({
          tytul: '',
          tresc: '',
          autor: 'Administrator',
          wazne_do: '',
          priorytet: 0
        });
        setShowForm(false);
        await loadAnnouncements();
      } else {
        setError(response.message || 'Błąd tworzenia ogłoszenia');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Czy na pewno chcesz usunąć to ogłoszenie?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await announcementService.deleteAnnouncement(id);
      
      if (response.success) {
        await loadAnnouncements();
      } else {
        setError(response.message || 'Błąd usuwania ogłoszenia');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  return (
    <div className="announcement-admin">
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h3 style={{ margin: 0 }}>📢 Zarządzanie ogłoszeniami</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showForm ? '❌ Anuluj' : '➕ Nowe ogłoszenie'}
          </button>
        </div>

        {error && (
          <div style={{ 
            color: '#dc3545', 
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Formularz dodawania ogłoszenia */}
        {showForm && (
          <form onSubmit={handleCreateAnnouncement} style={{
            backgroundColor: '#f8f9fa',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            marginBottom: '2rem'
          }}>
            <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>✏️ Nowe ogłoszenie</h4>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Tytuł *
              </label>
              <input
                type="text"
                value={newAnnouncement.tytul}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, tytul: e.target.value})}
                placeholder="Wprowadź tytuł ogłoszenia"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
                disabled={loading}
                required
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Treść *
              </label>
              <textarea
                value={newAnnouncement.tresc}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, tresc: e.target.value})}
                placeholder="Wprowadź treść ogłoszenia"
                rows={5}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  resize: 'vertical'
                }}
                disabled={loading}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Autor
                </label>
                <input
                  type="text"
                  value={newAnnouncement.autor}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, autor: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                  disabled={loading}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Priorytet
                </label>
                <select
                  value={newAnnouncement.priorytet}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, priorytet: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                  disabled={loading}
                >
                  <option value="0">Normalny</option>
                  <option value="1">Ważny</option>
                  <option value="2">Pilny</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Ważne do (opcjonalne)
              </label>
              <input
                type="datetime-local"
                value={newAnnouncement.wazne_do}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, wazne_do: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
                disabled={loading}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? '⏳ Tworzenie...' : '✅ Utwórz ogłoszenie'}
              </button>
              
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={loading}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ❌ Anuluj
              </button>
            </div>
          </form>
        )}

        {/* Lista istniejących ogłoszeń */}
        <div>
          <h4>📋 Istniejące ogłoszenia ({announcements.length})</h4>
          
          {loading && announcements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              Ładowanie ogłoszeń...
            </div>
          ) : announcements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              Brak ogłoszeń
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {announcements.map((announcement) => {
                const isPriority = announcement.priorytet > 0;
                const priorityText = announcement.priorytet === 2 ? 'Pilny' : announcement.priorytet === 1 ? 'Ważny' : 'Normalny';
                
                return (
                  <div key={announcement.id} style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    padding: '1rem',
                    backgroundColor: isPriority ? '#fff3cd' : '#ffffff',
                    borderColor: isPriority ? '#ffc107' : '#e0e0e0'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h5 style={{ margin: 0, color: '#333' }}>
                        {isPriority && '📌 '}
                        {announcement.tytul}
                      </h5>
                      <button
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                        disabled={loading}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        🗑️ Usuń
                      </button>
                    </div>
                    
                    <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
                      👤 {announcement.autor} • 
                      📅 {formatDate(announcement.data_utworzenia)} • 
                      🏷️ {priorityText} •
                      💬 {announcement.liczba_komentarzy} komentarzy
                      {announcement.wazne_do && (
                        <span style={{ color: '#dc3545' }}>
                          {' • ⏰ Ważne do: '}
                          {formatDate(announcement.wazne_do)}
                        </span>
                      )}
                    </div>
                    
                    <div style={{ 
                      fontSize: '0.9rem',
                      lineHeight: '1.4',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '100px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {announcement.tresc.length > 200 
                        ? announcement.tresc.substring(0, 200) + '...'
                        : announcement.tresc
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementAdmin;
