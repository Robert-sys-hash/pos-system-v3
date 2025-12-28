import React, { useState, useEffect } from 'react';
import './MessengerButton.css';

const MessengerButton = ({ onToggle }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Załaduj liczbę nieprzeczytanych wiadomości
    loadUnreadCount();
    
    // Odświeżaj co 30 sekund
    const interval = setInterval(loadUnreadCount, 30000);
    
    // Pokaż przycisk po krótkiej chwili
    setTimeout(() => setIsVisible(true), 500);
    
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const response = await fetch('https://panelv3.pl/messenger/stats');
      const data = await response.json();
      
      if (data.success) {
        setUnreadCount(data.data.unread_messages || 0);
      }
    } catch (err) {
      console.error('Błąd ładowania statystyk:', err);
    }
  };

  const handleClick = () => {
    setUnreadCount(0); // Zeruj licznik przy otwarciu
    onToggle();
  };

  return (
    <button 
      className={`messenger-button ${isVisible ? 'visible' : ''}`}
      onClick={handleClick}
      title="Komunikator pracowników"
    >
      <i className="fas fa-comments"></i>
      <span className="button-text">Chat</span>
      {unreadCount > 0 && (
        <div className="notification-badge">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}
    </button>
  );
};

export default MessengerButton;
