import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaExclamationTriangle, 
  FaArrowLeft, 
  FaSync, 
  FaEdit, 
  FaCheck,
  FaInfo,
  FaMapMarkerAlt,
  FaTag,
  FaCalculator,
  FaWrench
} from 'react-icons/fa';

const MarginAlertsPage = () => {
  const [marginData, setMarginData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [threshold, setThreshold] = useState(10);
  const [correcting, setCorrecting] = useState(new Set());
  const [lastUpdated, setLastUpdated] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadMarginData();
  }, [threshold]);

  const loadMarginData = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`https://panelv3.pl/api/margin/products/low-margins?threshold=${threshold}`);
      const data = await response.json();

      if (data.success) {
        setMarginData(data.data);
        setLastUpdated(new Date());
      } else {
        setError(data.message || 'Błąd pobierania danych o marżach');
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem: ' + err.message);
      console.error('Błąd ładowania danych marż:', err);
    } finally {
      setLoading(false);
    }
  };

  const correctProductMargin = async (productId, productName) => {
    setCorrecting(prev => new Set([...prev, productId]));

    try {
      const response = await fetch(`https://panelv3.pl/margin/product/${productId}/correct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          target_margin: 40,
          reason: 'Korekta marży z interfejsu alertów'
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Marża dla "${productName}" została skorygowana na 40%`);
        await loadMarginData(); // Odśwież dane
      } else {
        alert(`❌ Błąd korekty marży: ${data.message}`);
      }
    } catch (err) {
      alert(`❌ Błąd komunikacji: ${err.message}`);
      console.error('Błąd korekty marży:', err);
    } finally {
      setCorrecting(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const formatMargin = (margin) => {
    if (margin == null || margin === undefined) return '0.00%';
    return `${Number(margin).toFixed(2)}%`;
  };

  const formatPrice = (price) => {
    if (price == null || price === undefined) return '0.00';
    return Number(price).toFixed(2);
  };

  const getMarginColor = (margin) => {
    if (margin < 0) return 'text-danger';
    if (margin < 10) return 'text-warning';
    if (margin < 20) return 'text-info';
    return 'text-success';
  };

  const getMarginBadge = (margin) => {
    if (margin < 0) return 'bg-danger';
    if (margin < 10) return 'bg-warning text-dark';
    if (margin < 20) return 'bg-info';
    return 'bg-success';
  };

  if (loading && !marginData) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Ładowanie...</span>
          </div>
          <p className="mt-2">Ładowanie alertów o marżach...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <button 
                onClick={() => navigate('/dashboard')}
                className="btn btn-outline-secondary mb-3"
              >
                <FaArrowLeft className="me-2" />
                Powrót do Dashboard
              </button>
              <h2>
                <FaExclamationTriangle className="me-2 text-warning" />
                Alerty marż - System kontroli rentowności
              </h2>
              <p className="text-muted">
                Produkty z marżą poniżej {threshold}% i zarządzanie cenami specjalnymi
              </p>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <div className="me-3">
                <label className="form-label mb-1">Próg marży:</label>
                <select 
                  className="form-select form-select-sm"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  style={{ width: '120px' }}
                >
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={10}>10%</option>
                  <option value={15}>15%</option>
                  <option value={20}>20%</option>
                  <option value={30}>30%</option>
                </select>
              </div>
              <button 
                onClick={loadMarginData}
                className="btn btn-primary"
                disabled={loading}
              >
                <FaSync className={`me-2 ${loading ? 'fa-spin' : ''}`} />
                Odśwież
              </button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show">
              <FaExclamationTriangle className="me-2" />
              {error}
              <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
          )}

          {/* Last Updated */}
          {lastUpdated && (
            <div className="alert alert-info">
              <FaInfo className="me-2" />
              Ostatnia aktualizacja: {lastUpdated.toLocaleString('pl-PL')}
            </div>
          )}

          {marginData && (
            <>
              {/* Summary Cards */}
              <div className="row mb-4">
                <div className="col-md-3">
                  <div className="card bg-warning text-dark">
                    <div className="card-body text-center">
                      <h5 className="card-title">
                        <FaTag className="me-2" />
                        Ceny standardowe
                      </h5>
                      <h3>{marginData.summary.default_prices_count}</h3>
                      <small>produktów z niską marżą</small>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-danger text-white">
                    <div className="card-body text-center">
                      <h5 className="card-title">
                        <FaMapMarkerAlt className="me-2" />
                        Ceny specjalne
                      </h5>
                      <h3>{marginData.summary.special_prices_count}</h3>
                      <small>lokalizacji z niską marżą</small>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-info text-white">
                    <div className="card-body text-center">
                      <h5 className="card-title">
                        <FaCalculator className="me-2" />
                        Próg alertu
                      </h5>
                      <h3>{threshold}%</h3>
                      <small>marża minimalna</small>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-secondary text-white">
                    <div className="card-body text-center">
                      <h5 className="card-title">
                        <FaWrench className="me-2" />
                        Do korekty
                      </h5>
                      <h3>{marginData.low_margin_products.length + marginData.low_margin_special_prices.length}</h3>
                      <small>pozycji ogółem</small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Default Prices with Low Margins */}
              {marginData.low_margin_products.length > 0 && (
                <div className="card mb-4">
                  <div className="card-header bg-warning text-dark">
                    <h5 className="mb-0">
                      <FaTag className="me-2" />
                      Produkty z cenami standardowymi - niska marża ({marginData.low_margin_products.length})
                    </h5>
                    <small>Produkty bez cen specjalnych z marżą poniżej {threshold}%</small>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-striped table-hover mb-0">
                        <thead className="table-dark">
                          <tr>
                            <th>Produkt</th>
                            <th>Kod EAN</th>
                            <th>Cena zakupu</th>
                            <th>Cena sprzedaży</th>
                            <th>Marża obliczona</th>
                            <th>Marża baza</th>
                            <th>Akcje</th>
                          </tr>
                        </thead>
                        <tbody>
                          {marginData.low_margin_products.map((product) => (
                            <tr key={product.id}>
                              <td>
                                <strong>{product.nazwa}</strong>
                                <br />
                                <small className="text-muted">ID: {product.id}</small>
                              </td>
                              <td>
                                <code>{product.ean || product.kod_produktu || '-'}</code>
                              </td>
                              <td>
                                <span className="badge bg-info">
                                  {formatPrice(product.cena_zakupu_brutto)} zł
                                </span>
                              </td>
                              <td>
                                <span className="badge bg-primary">
                                  {formatPrice(product.cena_sprzedazy_brutto)} zł
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${getMarginBadge(product.calculated_margin)}`}>
                                  {formatMargin(product.calculated_margin)}
                                </span>
                              </td>
                              <td>
                                <span className={getMarginColor(product.marza_procent)}>
                                  {formatMargin(product.marza_procent)}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => correctProductMargin(product.id, product.nazwa)}
                                  disabled={correcting.has(product.id)}
                                >
                                  {correcting.has(product.id) ? (
                                    <>
                                      <div className="spinner-border spinner-border-sm me-1" role="status">
                                        <span className="visually-hidden">Korygowanie...</span>
                                      </div>
                                      Korygowanie...
                                    </>
                                  ) : (
                                    <>
                                      <FaWrench className="me-1" />
                                      Popraw na 40%
                                    </>
                                  )}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Special Prices with Low Margins */}
              {marginData.low_margin_special_prices.length > 0 && (
                <div className="card">
                  <div className="card-header bg-danger text-white">
                    <h5 className="mb-0">
                      <FaMapMarkerAlt className="me-2" />
                      Ceny specjalne lokalizacyjne - niska marża ({marginData.low_margin_special_prices.length})
                    </h5>
                    <small>Produkty z cenami specjalnymi w lokalizacjach z marżą poniżej {threshold}%</small>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-striped table-hover mb-0">
                        <thead className="table-dark">
                          <tr>
                            <th>Produkt</th>
                            <th>Lokalizacja</th>
                            <th>Kod EAN</th>
                            <th>Cena zakupu</th>
                            <th>Cena specjalna</th>
                            <th>Marża</th>
                            <th>Uwagi</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {marginData.low_margin_special_prices.map((item, index) => (
                            <tr key={`${item.id}-${item.kod_lokalizacji}-${index}`}>
                              <td>
                                <strong>{item.nazwa}</strong>
                                <br />
                                <small className="text-muted">ID: {item.id}</small>
                              </td>
                              <td>
                                <span className="badge bg-secondary">
                                  {item.location_name}
                                </span>
                                <br />
                                <small className="text-muted">{item.kod_lokalizacji}</small>
                              </td>
                              <td>
                                <code>{item.kod_produktu || '-'}</code>
                              </td>
                              <td>
                                <span className="badge bg-info">
                                  {formatPrice(item.cena_zakupu_brutto)} zł
                                </span>
                              </td>
                              <td>
                                <span className="badge bg-warning text-dark">
                                  {formatPrice(item.special_price)} zł
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${getMarginBadge(item.margin)}`}>
                                  {formatMargin(item.margin)}
                                </span>
                              </td>
                              <td>
                                <small className="text-muted">
                                  {item.uwagi || 'Brak uwag'}
                                </small>
                              </td>
                              <td>
                                <span className="badge bg-warning text-dark">
                                  <FaExclamationTriangle className="me-1" />
                                  Wymaga uwagi
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="card-footer bg-light">
                    <div className="alert alert-warning mb-0">
                      <FaInfo className="me-2" />
                      <strong>Uwaga:</strong> Ceny specjalne w lokalizacjach nie są automatycznie korygowane, 
                      aby chronić promocje i specjalne układy cenowe. Sprawdź te pozycje ręcznie.
                    </div>
                  </div>
                </div>
              )}

              {/* No Low Margins */}
              {marginData.low_margin_products.length === 0 && marginData.low_margin_special_prices.length === 0 && (
                <div className="card">
                  <div className="card-body text-center py-5">
                    <FaCheck className="fa-3x text-success mb-3" />
                    <h4 className="text-success">Doskonale!</h4>
                    <p className="text-muted">
                      Nie znaleziono produktów z marżą poniżej {threshold}%.
                      <br />
                      Wszystkie produkty mają odpowiednią rentowność.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarginAlertsPage;
