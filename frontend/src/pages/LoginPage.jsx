import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    login: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5002/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: credentials.login,
          password: credentials.password
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Przekieruj na dashboard
        navigate('/');
      } else {
        setError(data.message || 'Błąd podczas logowania');
      }
    } catch (err) {
      console.error('Błąd logowania:', err);
      setError('Błąd połączenia z serwerem');
    } finally {
      setLoading(false);
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
    <div className="container mt-5">
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

                <div className="mb-3 form-check">
                  <input type="checkbox" className="form-check-input" id="remember" />
                  <label className="form-check-label" htmlFor="remember">
                    Zapamiętaj mnie
                  </label>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary w-100 mb-3"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Logowanie...
                    </>
                  ) : (
                    'Zaloguj się'
                  )}
                </button>
              </form>

              <div className="text-center">
                <small className="text-muted">
                  Demo: admin / admin
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
