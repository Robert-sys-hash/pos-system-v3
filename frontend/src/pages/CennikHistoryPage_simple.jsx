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
  console.log('🚀 CennikHistoryPage loading...');
  
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCennikHistory = async () => {
    try {
      console.log('📡 Loading history data...');
      setLoading(true);
      setError(null);
      
      const response = await fetch('https://panelv3.pl/api/purchase-invoices/cennik-history');
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 API Response:', data);
      
      if (data.success) {
        const historyData = Array.isArray(data.data) ? data.data : [];
        console.log('✅ Setting history:', historyData);
        setHistory(historyData);
      } else {
        throw new Error(data.message || 'API error');
      }
    } catch (err) {
      console.error('❌ Error loading history:', err);
      setError(`Błąd ładowania: ${err.message}`);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 useEffect triggered');
    loadCennikHistory();
  }, []);

  console.log('📊 Current state:', { loading, error, historyLength: history.length });

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
          {error}
        </div>
        <button 
          className="btn btn-primary" 
          onClick={loadCennikHistory}
        >
          Spróbuj ponownie
        </button>
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

          {/* Podstawowa tabela */}
          <div className="card">
            <div className="card-header bg-light">
              <h5 className="mb-0">
                <FaFileCode className="me-2" />
                Importy cenników ({Array.isArray(history) ? history.length : 0})
              </h5>
            </div>
            <div className="card-body">
              {!Array.isArray(history) || history.length === 0 ? (
                <div className="text-center py-5">
                  <FaHistory className="text-muted mb-3" style={{ fontSize: '3rem' }} />
                  <h5 className="text-muted">Brak historii importów</h5>
                  <p className="text-muted">Nie wykonano jeszcze żadnych importów cennika.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Nazwa pliku</th>
                        <th>Data importu</th>
                        <th>Status</th>
                        <th>Utworzone</th>
                        <th>Zaktualizowane</th>
                        <th>Błędy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((item, index) => (
                        <tr key={item?.id || index}>
                          <td>{item?.id || 'N/A'}</td>
                          <td>{item?.nazwa_pliku || 'N/A'}</td>
                          <td>{item?.data_importu_formatted || item?.data_importu || 'N/A'}</td>
                          <td>
                            <span className={`badge ${item?.status === 'zakonczone' ? 'bg-success' : 'bg-secondary'}`}>
                              {item?.status || 'nieznany'}
                            </span>
                          </td>
                          <td className="text-success">{item?.produkty_utworzone || 0}</td>
                          <td className="text-warning">{item?.produkty_zaktualizowane || 0}</td>
                          <td>
                            {(item?.błędy_count || 0) > 0 ? (
                              <span className="badge bg-danger">
                                {item.błędy_count} błędów
                              </span>
                            ) : (
                              <span className="text-success">Brak</span>
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
        </div>
      </div>
    </div>
  );
};

export default CennikHistoryPage;
