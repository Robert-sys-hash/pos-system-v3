import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import AnnouncementsList from '../components/announcements/AnnouncementsList';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    customers: null,
    products: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError('');

    try {
      const [customersResponse, productsResponse] = await Promise.all([
        customerService.getCustomersStats(),
        productService.getProductsStats()
      ]);

      setStats({
        customers: customersResponse.success ? customersResponse.data : null,
        products: productsResponse.success ? productsResponse.data : null
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        📊 Ładowanie statystyk...
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        ⚠️ Błąd ładowania danych: {error}
        <button onClick={loadStats} className="btn btn-primary" style={{ marginLeft: '10px' }}>
          🔄 Spróbuj ponownie
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="row">
        <div className="col">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">🏠 Dashboard POS System V3</h2>
              <p style={{ color: '#666', marginTop: '0.5rem' }}>
                Witaj w nowym systemie kasowym! Sprawdź najnowsze ogłoszenia i informacje.
              </p>
            </div>

            {/* Status API */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                background: '#d4edda', 
                color: '#155724',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '14px'
              }}>
                🟢 API Backend działa poprawnie
              </div>
            </div>

            {/* Szybkie akcje */}
            <div className="row" style={{ marginBottom: '2rem' }}>
              <div className="col-2">
                <Link to="/pos" className="btn btn-primary" style={{ 
                  width: '100%', 
                  textDecoration: 'none',
                  padding: '1rem',
                  fontSize: '16px'
                }}>
                  💰 Otwórz POS
                </Link>
              </div>
              <div className="col-2">
                <Link to="/admin" className="btn btn-secondary" style={{ 
                  width: '100%',
                  textDecoration: 'none',
                  padding: '1rem',
                  fontSize: '16px'
                }}>
                  ⚙️ Panel Admin
                </Link>
              </div>
            </div>

            {/* Ogłoszenia - główna sekcja dashboardu */}
            <AnnouncementsList />

          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
