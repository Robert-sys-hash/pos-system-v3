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
  const [selectedErrors, setSelectedErrors] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [loadingErrors, setLoadingErrors] = useState(false);

  // Dodaj debug log
  console.log('CennikHistoryPage component mounted');

  useEffect(() => {
    console.log('useEffect triggered');
    loadCennikHistory();
    
    // Auto-refresh co 30 sekund
    const interval = setInterval(loadCennikHistory, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Sprawdź czy wszystkie wymagane biblioteki są dostępne
  if (!useNavigate || !useState || !useEffect) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger">
          Błąd ładowania bibliotek React. Spróbuj odświeżyć stronę.
        </div>
      </div>
    );
  }

  const loadCennikHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      // Dodaj timestamp aby uniknąć cache
      const timestamp = new Date().getTime();
      const response = await fetch(`http://localhost:8000/api/purchase-invoices/cennik-history?_t=${timestamp}`);
      const data = await response.json();
      
      console.log('Cennik history response:', data);
      
      if (data.success) {
        // Sprawdź czy data.data jest tablicą
        const historyData = Array.isArray(data.data) ? data.data : [];
        console.log('Setting history data:', historyData);
        setHistory(historyData);
      } else {
        console.error('API error:', data.message);
        setError(data.message || 'Nieznany błąd');
        setHistory([]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Błąd połączenia z serwerem');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const loadErrorDetails = async (historyId) => {
    try {
      setLoadingErrors(true);
      const response = await fetch(`http://localhost:8000/api/purchase-invoices/cennik-history/${historyId}/errors`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedErrors(data.data);
        setShowErrorModal(true);
      } else {
        alert('Błąd ładowania szczegółów: ' + data.message);
      }
    } catch (err) {
      alert('Błąd połączenia z serwerem');
      console.error('Błąd ładowania szczegółów błędów:', err);
    } finally {
      setLoadingErrors(false);
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
          <p className="mt-2">Ładowanie historii cennika...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger">
          <FaExclamationTriangle className="me-2" />
          {String(error)}
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => window.location.reload()}
        >
          Odśwież stronę
        </button>
      </div>
    );
  }

  // Dodatkowe zabezpieczenie
  const safeHistory = Array.isArray(history) ? history : [];

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
                Importy cenników ({safeHistory.length})
              </h5>
            </div>
            <div className="card-body p-0">
              {safeHistory.length === 0 ? (
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
                        <th>Akcje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {safeHistory.map((item) => (
                        <tr key={item?.id || Math.random()}>
                          <td>
                            <div className="d-flex align-items-center">
                              <FaClock className="text-muted me-2" />
                              {String(item?.data_importu_formatted || item?.data_importu || 'Brak daty')}
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <FaFileCode className="text-primary me-2" />
                              <span className="fw-medium">{String(item?.nazwa_pliku || 'Brak nazwy')}</span>
                            </div>
                          </td>
                          <td>
                            <span className={getStatusBadgeClass(item?.status)}>
                              {getStatusIcon(item?.status)}
                              <span className="ms-2">{getStatusText(item?.status)}</span>
                            </span>
                          </td>
                          <td>
                            <div className="small">
                              <div className="text-success">
                                <strong>+{Number(item?.produkty_utworzone) || 0}</strong> utworzone
                              </div>
                              <div className="text-warning">
                                <strong>~{Number(item?.produkty_zaktualizowane) || 0}</strong> zaktualizowane
                              </div>
                              {(Number(item?.produkty_pominięte) || 0) > 0 && (
                                <div className="text-muted">
                                  <strong>-{Number(item?.produkty_pominięte) || 0}</strong> pominięte
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            {(Number(item?.błędy_count) || 0) > 0 ? (
                              <span className="badge bg-danger">
                                {Number(item?.błędy_count) || 0} błędów
                              </span>
                            ) : (
                              <span className="text-success small">Brak błędów</span>
                            )}
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <FaUser className="text-muted me-2" />
                              {String(item?.user_login || 'system')}
                            </div>
                          </td>
                          <td>
                            {(Number(item?.błędy_count) || 0) > 0 && (
                              <button 
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => loadErrorDetails(item?.id)}
                                disabled={loadingErrors}
                                title="Pokaż szczegóły błędów"
                              >
                                <FaExclamationTriangle className="me-1" />
                                {loadingErrors ? 'Ładowanie...' : 'Szczegóły błędów'}
                              </button>
                            )}
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
          {safeHistory.length > 0 && (
            <div className="row mt-4">
              <div className="col-md-3">
                <div className="card text-center">
                  <div className="card-body">
                    <h3 className="text-success">
                      {safeHistory.reduce((sum, item) => sum + (Number(item?.produkty_utworzone) || 0), 0)}
                    </h3>
                    <p className="text-muted mb-0">Łącznie utworzonych produktów</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-center">
                  <div className="card-body">
                    <h3 className="text-warning">
                      {safeHistory.reduce((sum, item) => sum + (Number(item?.produkty_zaktualizowane) || 0), 0)}
                    </h3>
                    <p className="text-muted mb-0">Łącznie zaktualizowanych produktów</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-center">
                  <div className="card-body">
                    <h3 className="text-primary">
                      {safeHistory.filter(item => item?.status === 'zakonczone' || item?.status === 'completed').length}
                    </h3>
                    <p className="text-muted mb-0">Udanych importów</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-center">
                  <div className="card-body">
                    <h3 className="text-danger">
                      {safeHistory.reduce((sum, item) => sum + (Number(item?.błędy_count) || 0), 0)}
                    </h3>
                    <p className="text-muted mb-0">Łącznie błędów</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal szczegółów błędów */}
          {showErrorModal && selectedErrors && (
            <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog modal-lg modal-dialog-scrollable">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      <FaExclamationTriangle className="text-danger me-2" />
                      Szczegóły błędów importu
                    </h5>
                    <button 
                      type="button" 
                      className="btn-close" 
                      onClick={() => setShowErrorModal(false)}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <div className="mb-3">
                      <h6 className="text-muted">Informacje o imporcie:</h6>
                      <ul className="list-unstyled">
                        <li><strong>Plik:</strong> {String(selectedErrors?.nazwa_pliku || 'Brak nazwy')}</li>
                        <li><strong>Data:</strong> {String(selectedErrors?.data_importu || 'Brak daty')}</li>
                        <li><strong>Status:</strong> <span className={getStatusBadgeClass(selectedErrors?.status)}>{getStatusText(selectedErrors?.status)}</span></li>
                        <li><strong>Liczba błędów:</strong> <span className="badge bg-danger">{Number(selectedErrors?.błędy_count) || 0}</span></li>
                      </ul>
                    </div>
                    
                    <hr />
                    
                    <div>
                      <h6 className="text-danger mb-3">
                        <FaExclamationTriangle className="me-2" />
                        Lista błędów ({selectedErrors?.errors && Array.isArray(selectedErrors.errors) ? selectedErrors.errors.length : 0} z {Number(selectedErrors?.błędy_count) || 0}):
                      </h6>
                      
                      {selectedErrors?.errors && Array.isArray(selectedErrors.errors) && selectedErrors.errors.length > 0 ? (
                        <div className="list-group">
                          {selectedErrors.errors.map((error, index) => (
                            <div key={index} className="list-group-item list-group-item-danger">
                              <div className="d-flex w-100 justify-content-between">
                                <h6 className="mb-1">Błąd #{index + 1}</h6>
                                <small className="text-danger">
                                  <FaExclamationTriangle />
                                </small>
                              </div>
                              <p className="mb-1 font-monospace small">{String(error || 'Nieznany błąd')}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="alert alert-warning">
                          <FaInfoCircle className="me-2" />
                          <strong>Brak szczegółowych informacji o błędach.</strong>
                          <br />
                          <small className="text-muted">
                            Ten import został wykonany przed implementacją zapisywania szczegółów błędów. 
                            Nowe importy będą zawierać pełne informacje o błędach.
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => setShowErrorModal(false)}
                    >
                      Zamknij
                    </button>
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