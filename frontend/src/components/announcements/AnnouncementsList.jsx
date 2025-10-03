import React, { useState, useEffect } from 'react';
import announcementService from '../../services/announcementService';

const AnnouncementCard = ({ announcement, onCommentAdded }) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadComments = async () => {
    if (!showComments) return;
    
    setLoading(true);
    try {
      const response = await announcementService.getComments(announcement.id);
      if (response.success) {
        setComments(response.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const response = await announcementService.addComment(announcement.id, {
        komentarz: newComment.trim(),
        autor: 'Użytkownik' // TODO: pobrać z kontekstu użytkownika
      });

      if (response.success) {
        setNewComment('');
        await loadComments(); // Odśwież komentarze
        if (onCommentAdded) onCommentAdded();
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
    loadComments();
  }, [showComments]);

  const isPriority = announcement.priorytet > 0;

  return (
    <div className={`announcement-card ${isPriority ? 'priority' : ''}`} style={{
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '1rem',
      backgroundColor: isPriority ? '#fff3cd' : '#ffffff',
      borderColor: isPriority ? '#ffc107' : '#e0e0e0'
    }}>
      {/* Nagłówek ogłoszenia */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <h4 style={{ 
          margin: 0, 
          color: isPriority ? '#856404' : '#333',
          fontWeight: 'bold'
        }}>
          {isPriority && '📌 '}
          {announcement.tytul}
        </h4>
        <small style={{ color: '#666', fontSize: '0.85rem' }}>
          {formatDate(announcement.data_utworzenia)}
        </small>
      </div>

      {/* Autor */}
      <div style={{ marginBottom: '0.75rem' }}>
        <small style={{ color: '#666', fontStyle: 'italic' }}>
          👤 {announcement.autor}
        </small>
        {announcement.wazne_do && (
          <small style={{ color: '#dc3545', marginLeft: '1rem' }}>
            ⏰ Ważne do: {formatDate(announcement.wazne_do)}
          </small>
        )}
      </div>

      {/* Treść ogłoszenia */}
      <div style={{ 
        marginBottom: '1rem',
        lineHeight: '1.5',
        whiteSpace: 'pre-wrap'
      }}>
        {announcement.tresc}
      </div>

      {/* Przycisk komentarzy */}
      <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '0.75rem' }}>
        <button
          onClick={() => setShowComments(!showComments)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#007bff',
            cursor: 'pointer',
            padding: '0.25rem 0',
            fontSize: '0.9rem',
            textDecoration: 'underline'
          }}
        >
          💬 {showComments ? 'Ukryj' : 'Pokaż'} komentarze ({announcement.liczba_komentarzy})
        </button>
      </div>

      {/* Sekcja komentarzy */}
      {showComments && (
        <div style={{ 
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px'
        }}>
          {error && (
            <div style={{ color: '#dc3545', marginBottom: '1rem' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Lista komentarzy */}
          {loading && comments.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666' }}>
              Ładowanie komentarzy...
            </div>
          ) : comments.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', marginBottom: '1rem' }}>
              Brak komentarzy
            </div>
          ) : (
            <div style={{ marginBottom: '1rem' }}>
              {comments.map((comment) => (
                <div key={comment.id} style={{
                  backgroundColor: '#ffffff',
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#333' }}>
                      {comment.autor}
                    </strong>
                    <small style={{ color: '#666' }}>
                      {formatDate(comment.data_utworzenia)}
                    </small>
                  </div>
                  <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                    {comment.komentarz}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Formularz dodawania komentarza */}
          <form onSubmit={handleAddComment}>
            <div style={{ marginBottom: '0.75rem' }}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Napisz komentarz..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  resize: 'vertical',
                  fontSize: '0.9rem'
                }}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !newComment.trim()}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: loading || !newComment.trim() ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                opacity: loading || !newComment.trim() ? 0.6 : 1
              }}
            >
              {loading ? '⏳ Dodawanie...' : '💬 Dodaj komentarz'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

const AnnouncementsList = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => {
    loadAnnouncements();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
        <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
          📢 Ładowanie ogłoszeń...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ color: '#dc3545', marginBottom: '1rem' }}>
          ⚠️ {error}
        </div>
        <button
          onClick={loadAnnouncements}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 Spróbuj ponownie
        </button>
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
        <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
          📢 Brak ogłoszeń
        </div>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          Obecnie nie ma żadnych aktywnych ogłoszeń do wyświetlenia.
        </p>
      </div>
    );
  }

  return (
    <div className="announcements-list">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1.5rem',
        paddingBottom: '0.75rem',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <h3 style={{ margin: 0, color: '#333' }}>
          📢 Ogłoszenia ({announcements.length})
        </h3>
        <button
          onClick={loadAnnouncements}
          style={{
            backgroundColor: 'transparent',
            color: '#007bff',
            border: '1px solid #007bff',
            padding: '0.25rem 0.75rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          🔄 Odśwież
        </button>
      </div>

      {announcements.map((announcement) => (
        <AnnouncementCard
          key={announcement.id}
          announcement={announcement}
          onCommentAdded={loadAnnouncements}
        />
      ))}
    </div>
  );
};

export default AnnouncementsList;
