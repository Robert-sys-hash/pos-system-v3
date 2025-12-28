import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import './MessengerModal.css';

const MessengerModal = forwardRef(({ isOpen, onClose, onMessageSent }, ref) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);

  const messagesEndRef = useRef(null);

  const emojis = ['😀', '😂', '😍', '🤔', '😢', '😡', '👍', '👎', '❤️', '🎉', '🚀', '💡', '⚠️', '✅', '❌', '🔥'];

  useEffect(() => {
    if (isOpen) {
      loadMessages();
      loadOnlineUsers();
      updateUserStatus();
      
      // Odświeżaj wiadomości co 5 sekund gdy modal jest otwarty
      const interval = setInterval(loadMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Eksponuj metodę refreshMessages dla komponentu nadrzędnego
  useImperativeHandle(ref, () => ({
    refreshMessages: () => {
      console.log('🔄 MessengerModal: Odświeżanie wiadomości na żądanie zewnętrzne');
      if (isOpen) {
        loadMessages();
      }
    }
  }));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      console.log('🔍 MessengerModal: Ładowanie wiadomości...');
      const response = await fetch('https://panelv3.pl/messenger/messages?limit=50&debug=modal');
      console.log('📡 MessengerModal: Response status:', response.status);
      console.log('📡 MessengerModal: Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        console.error('❌ MessengerModal: HTTP error:', response.status, response.statusText);
        return;
      }
      
      const data = await response.json();
      console.log('📦 MessengerModal: Full response:', data);
      
      if (data.success) {
        const messages = data.data?.messages || [];
        console.log('📝 MessengerModal: Raw messages:', messages);
        console.log('📊 MessengerModal: Messages count:', messages.length);
        
        // Sortuj wiadomości po dacie utworzenia (najstarsze na górze, najnowsze na dole)
        const sortedMessages = messages.sort((a, b) => 
          new Date(a.created_at) - new Date(b.created_at)
        );
        console.log('✅ MessengerModal: Sorted messages:', sortedMessages);
        console.log('🆕 MessengerModal: Newest message:', sortedMessages[sortedMessages.length - 1]);
        console.log('🕐 MessengerModal: Last 3 message IDs:', sortedMessages.slice(-3).map(m => `ID:${m.id} ${m.message.substring(0,30)}`));
        setMessages(sortedMessages);
      } else {
        console.error('❌ MessengerModal: API returned success: false', data);
      }
    } catch (err) {
      console.error('❌ MessengerModal: Error loading messages:', err);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const response = await fetch('https://panelv3.pl/messenger/users/online');
      const data = await response.json();
      
      if (data.success) {
        setOnlineUsers(data.data.users || []);
      }
    } catch (err) {
      console.error('Błąd ładowania użytkowników online:', err);
    }
  };

  const updateUserStatus = async () => {
    try {
      await fetch('https://panelv3.pl/messenger/users/online', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'online' })
      });
    } catch (err) {
      console.error('Błąd aktualizacji statusu:', err);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      console.log('📤 MessengerModal: Wysyłam wiadomość:', newMessage.trim());
      const response = await fetch('https://panelv3.pl/messenger/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: newMessage.trim(),
          recipient_login: null, // Modal zawsze wysyła broadcast
          recipient_name: null,
          is_urgent: isUrgent,
          is_broadcast: true
        })
      });
      
      const data = await response.json();
      console.log('📦 MessengerModal: Response:', data);
      
      if (data.success) {
        console.log('✅ MessengerModal: Wiadomość wysłana pomyślnie');
        setNewMessage('');
        setIsUrgent(false);
        setShowEmojis(false);
        // Odśwież wiadomości po krótkim opóźnieniu
        setTimeout(() => {
          loadMessages();
        }, 500);
        // Powiadom komponent nadrzędny o wysłaniu wiadomości
        if (onMessageSent) {
          onMessageSent();
        }
      } else {
        console.error('❌ MessengerModal: API error:', data);
        setError(data.error || 'Błąd wysyłania wiadomości');
      }
    } catch (err) {
      console.error('❌ MessengerModal: Connection error:', err);
      setError('Błąd połączenia z serwerem');
    } finally {
      setLoading(false);
    }
  };

  const addEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojis(false);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openFullMessenger = () => {
    // Tu można zaimplementować otwarcie pełnej wersji komunikatora
    window.open('/messenger', '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="messenger-modal-overlay" onClick={onClose}>
      <div className="messenger-modal" onClick={(e) => e.stopPropagation()}>
        <div className="messenger-modal-header">
          <div className="header-info">
            <h3>
              <i className="fas fa-comments"></i> Komunikator POS
            </h3>
            <span className="online-count">
              {onlineUsers.length} online
            </span>
          </div>
          <div className="header-buttons">
            <button 
              className="expand-btn"
              onClick={openFullMessenger}
              title="Otwórz pełny komunikator"
            >
              <i className="fas fa-expand"></i>
            </button>
            <button 
              className="close-btn"
              onClick={onClose}
              title="Zamknij"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div className="messenger-modal-body">
          <div className="messages-area">
            {messages.length === 0 ? (
              <div className="no-messages">
                <i className="fas fa-comments fa-2x"></i>
                <p>Brak wiadomości</p>
                <small>Napisz pierwszą wiadomość!</small>
              </div>
            ) : (
              messages.map((message, index) => (
                <div 
                  key={message.id || index}
                  className={`message ${message.sender_name === 'Administrator' ? 'message-admin' : 'message-user'}`}
                >
                  <div className="message-header">
                    <span className="sender">{message.sender_name || 'Nieznany'}</span>
                    <span className="time">
                      {new Date(message.created_at).toLocaleString('pl-PL', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="message-content">
                    {message.message || '(brak treści)'}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="messenger-modal-footer">
          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-triangle"></i>
              {error}
            </div>
          )}
          
          <form onSubmit={sendMessage} className="quick-message-form">
            <div className="input-container">
              {showEmojis && (
                <div className="emoji-panel">
                  {emojis.map((emoji, index) => (
                    <button
                      key={index}
                      type="button"
                      className="emoji-btn"
                      onClick={() => addEmoji(emoji)}
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="input-row">
                <button
                  type="button"
                  className="emoji-toggle"
                  onClick={() => setShowEmojis(!showEmojis)}
                  title="Emotikony"
                >
                  😀
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Napisz wiadomość dla wszystkich..."
                  className="message-input"
                  maxLength="500"
                  disabled={loading}
                />
                <label className="urgent-label">
                  <input
                    type="checkbox"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                  />
                  <span title="Pilne">⚠️</span>
                </label>
                <button 
                  type="submit" 
                  className="send-button"
                  disabled={!newMessage.trim() || loading}
                >
                  {loading ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-paper-plane"></i>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
});

export default MessengerModal;
