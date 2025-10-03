import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

const Login = () => {
  const [credentials, setCredentials] = useState({
    login: '',
    password: ''
  });
  const [error, setError] = useState('');
  const { login, loading } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!credentials.login || !credentials.password) {
      setError('Login i hasło są wymagane');
      return;
    }

    const result = await login(credentials);
    
    if (!result.success) {
      setError(result.error || 'Błąd logowania');
    }
    // Sukces jest obsługiwany przez AuthContext i przekierowanie
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>POS System V3</h1>
          <p>Zaloguj się do systemu</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="login">Login:</label>
            <input
              type="text"
              id="login"
              name="login"
              value={credentials.login}
              onChange={handleChange}
              placeholder="Wprowadź login"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Hasło:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              placeholder="Wprowadź hasło"
              disabled={loading}
              required
            />
          </div>

          <button 
            type="submit" 
            className={`login-button ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? 'Logowanie...' : 'Zaloguj się'}
          </button>
        </form>

        <div className="login-footer">
          <p>© 2025 POS System V3</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
