import React, { useState, useContext, createContext } from 'react';
import api from '../../services/api';

// Context dla autoryzacji
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider autoryzacji
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', credentials);
      const userData = response.data.data;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return { success: true, user: userData };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.post('/auth/logout');
      setUser(null);
      localStorage.removeItem('user');
      return { success: true };
    } catch (error) {
      // Logout zawsze udany lokalnie, nawet jeśli serwer nie odpowiada
      setUser(null);
      localStorage.removeItem('user');
      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = async () => {
    setLoading(true);
    try {
      const response = await api.get('/auth/check');
      const authData = response.data.data;
      
      if (authData.authenticated) {
        setUser({
          user_id: authData.user_id,
          login: authData.login,
          user_type: authData.user_type,
          logged_in_at: authData.logged_in_at
        });
        return true;
      } else {
        setUser(null);
        localStorage.removeItem('user');
        return false;
      }
    } catch (error) {
      setUser(null);
      localStorage.removeItem('user');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Sprawdź autoryzację przy załadowaniu
  React.useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        // Sprawdź czy sesja jest wciąż aktywna
        checkAuth();
      } catch (error) {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    checkAuth,
    isAuthenticated: !!user,
    isAdmin: user?.user_type === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
