import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import './Messenger.css';

const Messenger = forwardRef(({ onMessageSent }, ref) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const emojis = ['😀', '😊', '😂', '🤔', '👍', '👎', '❤️', '💪', '🎉', '🔥', '💯', '⚡', '🚨', '📋', '💼', '☕', '🍕', '⏰', '✅', '❌'];

  useEffect(() => {
    loadMessages();
    loadOnlineUsers();
    loadStats();
    
    // Ustaw interwały odświeżania
    const messageInterval = setInterval(loadMessages, 5000); // Co 5 sekund
    const usersInterval = setInterval(loadOnlineUsers, 10000); // Co 10 sekund
    const statusInterval = setInterval(updateUserStatus, 30000); // Co 30 sekund
    
    // Pierwszy heartbeat
    updateUserStatus();
    
    return () => {
      clearInterval(messageInterval);
      clearInterval(usersInterval);
      clearInterval(statusInterval);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Eksponuj metodę refreshMessages dla komponentu nadrzędnego
  useImperativeHandle(ref, () => ({
    refreshMessages: () => {
      console.log('🔄 Messenger: Odświeżanie wiadomości na żądanie zewnętrzne');
      loadMessages();
    }
  }));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      console.log('🔍 Messenger: Ładowanie wiadomości...');
      const response = await fetch('http://localhost:8000/api/messenger/messages?limit=50&debug=fullchat');
      console.log('📡 Messenger: Response status:', response.status);
      console.log('📡 Messenger: Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        console.error('❌ Messenger: HTTP error:', response.status, response.statusText);
        return;
      }
      
      const data = await response.json();
      console.log('📦 Messenger: Full response:', data);
      
      if (data.success) {
        const rawMessages = data.data?.messages || [];
        console.log('📝 Messenger: Raw messages:', rawMessages);
        console.log('📊 Messenger: Messages count:', rawMessages.length);
        
        // Sortuj wiadomości po dacie utworzenia (najstarsze na górze, najnowsze na dole)
        const sortedMessages = rawMessages.sort((a, b) => 
          new Date(a.created_at) - new Date(b.created_at)
        );
        console.log('📈 Messenger: Sorted messages:', sortedMessages);
        setMessages(sortedMessages);
      } else {
        console.error('❌ Messenger: API error:', data);
      }
    } catch (err) {
      console.error('❌ Błąd ładowania wiadomości:', err);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/messenger/users/online');
      const data = await response.json();
      
      if (data.success) {
        setOnlineUsers(data.data.users || []);
      }
    } catch (err) {
      console.error('Błąd ładowania użytkowników online:', err);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/messenger/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Błąd ładowania statystyk:', err);
    }
  };

  const updateUserStatus = async () => {
    try {
      await fetch('http://localhost:8000/api/messenger/users/online', {
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
      console.log('📤 Messenger: Wysyłam wiadomość:', newMessage.trim());
      const response = await fetch('http://localhost:8000/api/messenger/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: newMessage.trim(),
          recipient_login: selectedUser?.user_login || null,
          recipient_name: selectedUser?.user_name || null,
          is_urgent: isUrgent,
          is_broadcast: !selectedUser
        })
      });
      
      const data = await response.json();
      console.log('📦 Messenger: Response:', data);
      
      if (data.success) {
        console.log('✅ Messenger: Wiadomość wysłana pomyślnie');
        setNewMessage('');
        setIsUrgent(false);
        setShowEmoji(false);
        loadMessages(); // Odśwież wiadomości
        // Powiadom komponent nadrzędny o wysłaniu wiadomości
        if (onMessageSent) {
          onMessageSent();
        }
      } else {
        console.error('❌ Messenger: API error:', data);
        setError(data.error || 'Błąd wysyłania wiadomości');
      }
    } catch (err) {
      console.error('❌ Messenger: Connection error:', err);
      setError('Błąd połączenia z serwerem');
    } finally {
      setLoading(false);
    }
  };

  const sendBroadcast = async (message, urgent = false) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:8000/api/messenger/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message.trim(),
          is_urgent: urgent
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        loadMessages(); // Odśwież wiadomości
        // Powiadom komponent nadrzędny o wysłaniu wiadomości
        if (onMessageSent) {
          onMessageSent();
        }
      } else {
        setError(data.error || 'Błąd wysyłania ogłoszenia');
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem');
      console.error('Błąd wysyłania ogłoszenia:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await fetch(`/api/messenger/messages/${messageId}/read`, {
        method: 'PUT'
      });
    } catch (err) {
      console.error('Błąd oznaczania jako przeczytane:', err);
    }
  };

  const addEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmoji(false);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return 'Dziś';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Wczoraj';
    }
    
    return date.toLocaleDateString('pl-PL');
  };

  return (
    <div className="messenger-container">
      <div className="messenger-header">
        <h2>
          <i className="fas fa-comments"></i> Komunikator Pracowników
        </h2>
        <div className="messenger-stats">
          <span className="badge badge-primary">
            {stats.users_online || 0} online
          </span>
          {stats.unread_messages > 0 && (
            <span className="badge badge-danger">
              {stats.unread_messages} nieprzeczytanych
            </span>
          )}
        </div>
      </div>

      <div className="messenger-body">
        <div className="messenger-sidebar">
          <div className="online-users">
            <h3>
              <i className="fas fa-users"></i> Online ({onlineUsers.length})
            </h3>
            <div className="users-list">
              <div 
                className={`user-item ${!selectedUser ? 'active' : ''}`}
                onClick={() => setSelectedUser(null)}
              >
                <i className="fas fa-bullhorn"></i>
                <span>Wszyscy (Broadcast)</span>
              </div>
              {onlineUsers.map(user => (
                <div 
                  key={user.user_id}
                  className={`user-item ${selectedUser?.user_id === user.user_id ? 'active' : ''}`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="user-status online"></div>
                  <span>{user.user_name}</span>
                </div>
              ))}
            </div>
          </div>

          {stats.recent_broadcasts && stats.recent_broadcasts.length > 0 && (
            <div className="recent-broadcasts">
              <h4>
                <i className="fas fa-bullhorn"></i> Ostatnie ogłoszenia
              </h4>
              {stats.recent_broadcasts.map((broadcast, index) => (
                <div key={index} className="broadcast-item">
                  <div className="broadcast-sender">{broadcast.sender_name}</div>
                  <div className="broadcast-message">{broadcast.message}</div>
                  <div className="broadcast-time">{formatTime(broadcast.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="messenger-chat">
          <div className="chat-header">
            {selectedUser ? (
              <h3>
                <i className="fas fa-user"></i> Chat z {selectedUser.user_name}
              </h3>
            ) : (
              <h3>
                <i className="fas fa-bullhorn"></i> Ogłoszenia dla wszystkich
              </h3>
            )}
          </div>

          <div className="messages-container">
            {messages.map((message, index) => {
              const showDate = index === 0 || 
                formatDate(message.created_at) !== formatDate(messages[index - 1].created_at);
              
              return (
                <React.Fragment key={message.id}>
                  {showDate && (
                    <div className="date-separator">
                      {formatDate(message.created_at)}
                    </div>
                  )}
                  <div 
                    className={`message ${message.is_broadcast ? 'broadcast' : 'normal'} ${message.is_urgent ? 'urgent' : ''}`}
                    onClick={() => markAsRead(message.id)}
                  >
                    <div className="message-header">
                      <span className="sender">{message.sender_name}</span>
                      {message.is_broadcast && (
                        <span className="broadcast-badge">
                          <i className="fas fa-bullhorn"></i> Ogłoszenie
                        </span>
                      )}
                      {message.is_urgent && (
                        <span className="urgent-badge">
                          <i className="fas fa-exclamation-triangle"></i> Pilne
                        </span>
                      )}
                      <span className="time">{formatTime(message.created_at)}</span>
                    </div>
                    <div className="message-content">
                      {message.message}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="message-input-container">
            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-triangle"></i>
                {error}
              </div>
            )}
            
            {showEmoji && (
              <div className="emoji-panel">
                {emojis.map(emoji => (
                  <button 
                    key={emoji}
                    type="button"
                    className="emoji-btn"
                    onClick={() => addEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={sendMessage} className="message-form">
              <div className="input-group">
                <button 
                  type="button"
                  className="emoji-toggle"
                  onClick={() => setShowEmoji(!showEmoji)}
                  title="Emotikony"
                >
                  😀
                </button>
                
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={selectedUser ? `Napisz do ${selectedUser.user_name}...` : "Napisz ogłoszenie dla wszystkich..."}
                  className="message-input"
                  maxLength="1000"
                  disabled={loading}
                />
                
                <label className="urgent-checkbox">
                  <input
                    type="checkbox"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                  />
                  <span title="Pilne">⚠️</span>
                </label>
                
                <button 
                  type="submit" 
                  className="send-btn"
                  disabled={!newMessage.trim() || loading}
                >
                  {loading ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-paper-plane"></i>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Messenger;
