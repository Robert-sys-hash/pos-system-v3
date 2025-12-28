import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../contexts/LocationContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loading, isAuthenticated } = useAuth();
  const { refreshLocations, setSelectedLocation } = useLocation();
  const [credentials, setCredentials] = useState({
    login: '',
    password: ''
  });
  const [error, setError] = useState(null);

  // Jeśli już zalogowany, przekieruj na dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!credentials.login || !credentials.password) {
      setError('Login i hasło są wymagane');
      return;
    }

    try {
      const result = await login(credentials);
      
      if (result.success) {
        // Wyczyść poprzednią lokalizację i odśwież dla nowego użytkownika
        setSelectedLocation(null);
        localStorage.removeItem('selectedLocation');
        await refreshLocations();
        // Przekierowanie zostanie obsłużone przez useEffect
        navigate('/');
      } else {
        setError(result.error || 'Nieprawidłowy login lub hasło');
      }
    } catch (err) {
      console.error('Błąd logowania:', err);
      setError('Błąd połączenia z serwerem');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div 
      className="login-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        padding: '20px'
      }}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <div className="card shadow">
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <h2>🔐 Logowanie</h2>
                  <p className="text-muted">POS System V3</p>
                </div>

                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="login" className="form-label">Login</label>
                    <input
                      type="text"
                      className="form-control"
                      id="login"
                      name="login"
                      value={credentials.login}
                      onChange={handleInputChange}
                      required
                      autoComplete="username"
                      placeholder="Wprowadź login"
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">Hasło</label>
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      name="password"
                      value={credentials.password}
                      onChange={handleInputChange}
                      required
                      autoComplete="current-password"
                      placeholder="Wprowadź hasło"
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary w-100 mb-3"
                    disabled={loading}
                  >
                    {loading ? 'Logowanie...' : 'Zaloguj się'}
                  </button>
                </form>

                <div className="text-center">
                  <small className="text-muted">
                    Użyj: test / test lub admin2 / admin123
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
