import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // Pokazuj loader podczas sprawdzania autoryzacji
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Sprawdzanie autoryzacji...
      </div>
    );
  }

  // Jeśli nie jest zalogowany, przekieruj na stronę logowania
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Jeśli jest zalogowany, pokaż zawartość
  return children;
};

export default ProtectedRoute;
