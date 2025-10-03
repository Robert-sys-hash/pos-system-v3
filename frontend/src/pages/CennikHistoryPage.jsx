import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaHistory, 
  FaFileCode, 
  FaCheckCircle, 
  FaExclamationTriangle,
  FaInfoCircle,
  FaClock,
  FaUser
} from 'react-icons/fa';

const CennikHistoryPage = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCennikHistory();
    
    // Auto-refresh co 30 sekund
    const interval = setInterval(loadCennikHistory, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadCennikHistory = async () => {
    try {
      setLoading(true);
      // Dodaj timestamp aby uniknąć cache
      const timestamp = new Date().getTime();
      const response = await fetch(`http://localhost:5002/api/purchase-invoices/cennik-history?_t=${timestamp}`);
      const data = await response.json();
      
      if (data.success) {
        setHistory(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem');
      console.error('Błąd ładowania historii cennika:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'zakonczone':
      case 'completed':
        return <FaCheckCircle className="text-success" />;
      case 'w_trakcie':
      case 'processing':
        return <FaClock className="text-warning" />;
      case 'blad':
      case 'error':
        return <FaExclamationTriangle className="text-danger" />;
      default:
        return <FaInfoCircle className="text-info" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'zakonczone':
      case 'completed':
        return 'Zakończone';
      case 'w_trakcie':
      case 'processing':
        return 'W trakcie';
      case 'blad':
      case 'error':
        return 'Błąd';
      default:
        return status || 'Nieznany';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'zakonczone':
      case 'completed':
        return 'badge bg-success';
      case 'w_trakcie':
      case 'processing':
        return 'badge bg-warning';
      case 'blad':
      case 'error':
        return 'badge bg-danger';
      default:
        return 'badge bg-secondary';
    }
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Ładowanie...</span>
          </div>
          <p className="mt-2">Ładowanie historii importów cennika...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid py-4">
        <div className="row">
          <div className="col-12">
            <button 
              onClick={() => navigate('/purchase-invoices')}
              className="btn btn-outline-secondary mb-3"
            >
              <FaArrowLeft className="me-2" />
              Powrót do faktur zakupowych
            </button>
            <div className="alert alert-danger" role="alert">
              <FaExclamationTriangle className="me-2" />
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          {/* Header */}
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div className="d-flex align-items-center">
              <button 
                onClick={() => navigate('/purchase-invoices')}
                className="btn btn-outline-secondary me-3"
              >
                <FaArrowLeft className="me-2" />
                Powrót
              </button>
              <h2 className="mb-0">
                <FaHistory className="me-2 text-primary" />
                Historia importów cennika
              </h2>
            </div>
            <button 
              onClick={loadCennikHistory}
              className="btn btn-outline-primary"
            >
              Odśwież
            </button>
          </div>

          {/* Historia importów */}
          <div className="card">
            <div className="card-header bg-light">
              <h5 className="mb-0">
                <FaFileCode className="me-2" />
                Importy cenników ({history.length})
              </h5>
            </div>
            <div className="card-body p-0">
              {history.length === 0 ? (
                <div className="text-center py-5">
                  <FaHistory className="text-muted mb-3" style={{ fontSize: '3rem' }} />
                  <h5 className="text-muted">Brak historii importów</h5>
                  <p className="text-muted">Nie wykonano jeszcze żadnych importów cennika.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Data importu</th>
                        <th>Nazwa pliku</th>
                        <th>Status</th>
                        <th>Produkty</th>
                        <th>Błędy</th>
                        <th>Użytkownik</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <FaClock className="text-muted me-2" />
                              {item.data_importu_formatted || item.data_importu}
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <FaFileCode className="text-primary me-2" />
                              <span className="fw-medium">{item.nazwa_pliku}</span>
                            </div>
                          </td>
                          <td>
                            <span className={getStatusBadgeClass(item.status)}>
                              {getStatusIcon(item.status)}
                              <span className="ms-2">{getStatusText(item.status)}</span>
                            </span>
                          </td>
                          <td>
                            <div className="small">
                              <div className="text-success">
                                <strong>+{item.produkty_utworzone || 0}</strong> utworzone
                              </div>
                              <div className="text-warning">
                                <strong>~{item.produkty_zaktualizowane || 0}</strong> zaktualizowane
                              </div>
                              {item.produkty_pominięte > 0 && (
                                <div className="text-muted">
                                  <strong>-{item.produkty_pominięte}</strong> pominięte
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            {item.błędy_count > 0 ? (
                              <span className="badge bg-danger">
                                {item.błędy_count} błędów
                              </span>
                            ) : (
                              <span className="text-success small">Brak błędów</span>
                            )}
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <FaUser className="text-muted me-2" />
                              {item.user_login || 'system'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Statystyki podsumowujące */}
          {history.length > 0 && (
            <div className="row mt-4">
              <div className="col-md-3">
                <div className="card text-center">
                  <div className="card-body">
                    <h3 className="text-success">
                      {history.reduce((sum, item) => sum + (item.produkty_utworzone || 0), 0)}
                    </h3>
                    <p className="text-muted mb-0">Łącznie utworzonych produktów</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-center">
                  <div className="card-body">
                    <h3 className="text-warning">
                      {history.reduce((sum, item) => sum + (item.produkty_zaktualizowane || 0), 0)}
                    </h3>
                    <p className="text-muted mb-0">Łącznie zaktualizowanych produktów</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-center">
                  <div className="card-body">
                    <h3 className="text-primary">
                      {history.filter(item => item.status === 'zakonczone' || item.status === 'completed').length}
                    </h3>
                    <p className="text-muted mb-0">Udanych importów</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-center">
                  <div className="card-body">
                    <h3 className="text-danger">
                      {history.reduce((sum, item) => sum + (item.błędy_count || 0), 0)}
                    </h3>
                    <p className="text-muted mb-0">Łącznie błędów</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CennikHistoryPage;
