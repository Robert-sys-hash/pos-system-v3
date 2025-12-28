import React, { useState, useEffect } from 'react';
import { transactionService } from '../services/transactionService';
import { productService } from '../services/productService';
import { shiftService } from '../services/shiftService';
import { productReportsService } from '../services/productReportsService';

const ReportsPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('daily');
  
  // Dane raportów
  const [dailyStats, setDailyStats] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [shiftHistory, setShiftHistory] = useState([]);
  const [lowMarginProducts, setLowMarginProducts] = useState([]);
  
  // Nowe dane dla raportów produktowych
  const [highestRotationProducts, setHighestRotationProducts] = useState([]);
  const [lowestRotationProducts, setLowestRotationProducts] = useState([]);
  const [bestsellingProducts, setBestsellingProducts] = useState([]);
  const [salesForecast, setSalesForecast] = useState([]);
  const [productsSummary, setProductsSummary] = useState(null);

  // Filtry
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  // Parametry raportów produktowych
  const [reportParams, setReportParams] = useState({
    limit: 10,
    days: 30,
    metric: 'quantity',
    forecast_days: 30,
    analysis_days: 90
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadDailyStats(),
        loadMonthlyStats(),
        loadTopProducts(),
        loadShiftHistory(),
        loadLowMarginProducts(),
        // Dodaj nowe funkcje ładowania
        loadProductReports()
      ]);
    } catch (err) {
      setError('Błąd podczas ładowania danych: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDailyStats = async () => {
    try {
      const stats = await transactionService.getDailyStats();
      setDailyStats(stats);
    } catch (err) {
      console.error('Błąd podczas pobierania statystyk dziennych:', err);
    }
  };

  const loadMonthlyStats = async () => {
    try {
      const stats = await transactionService.getMonthlyStats();
      setMonthlyStats(stats);
    } catch (err) {
      console.error('Błąd podczas pobierania statystyk miesięcznych:', err);
    }
  };

  const loadTopProducts = async () => {
    try {
      const products = await productService.getProducts();
      // Symulacja top produktów (normalnie byłoby z backendu)
      const sorted = products.slice(0, 10);
      setTopProducts(sorted);
    } catch (err) {
      console.error('Błąd podczas pobierania top produktów:', err);
    }
  };

  const loadShiftHistory = async () => {
    try {
      const shifts = await shiftService.getShiftsHistory();
      setShiftHistory(shifts || []);
    } catch (err) {
      console.error('Błąd podczas pobierania historii zmian:', err);
    }
  };

  const loadLowMarginProducts = async () => {
    try {
      const products = await productService.getLowMarginProducts();
      setLowMarginProducts(products || []);
    } catch (err) {
      console.error('Błąd podczas pobierania produktów z niską marżą:', err);
    }
  };

  // Nowe funkcje ładowania raportów produktowych
  const loadProductReports = async () => {
    try {
      await Promise.all([
        loadHighestRotationProducts(),
        loadLowestRotationProducts(),
        loadBestsellingProducts(),
        loadSalesForecast(),
        loadProductsSummary()
      ]);
    } catch (err) {
      console.error('Błąd podczas ładowania raportów produktowych:', err);
    }
  };

  const loadHighestRotationProducts = async () => {
    try {
      const response = await productReportsService.getHighestRotationProducts(reportParams);
      setHighestRotationProducts(response.data || []);
    } catch (err) {
      console.error('Błąd podczas pobierania najbardziej rotujących produktów:', err);
    }
  };

  const loadLowestRotationProducts = async () => {
    try {
      const response = await productReportsService.getLowestRotationProducts(reportParams);
      setLowestRotationProducts(response.data || []);
    } catch (err) {
      console.error('Błąd podczas pobierania najmniej rotujących produktów:', err);
    }
  };

  const loadBestsellingProducts = async () => {
    try {
      const response = await productReportsService.getBestsellingProducts(reportParams);
      setBestsellingProducts(response.data || {});
    } catch (err) {
      console.error('Błąd podczas pobierania bestsellerów:', err);
    }
  };

  const loadSalesForecast = async () => {
    try {
      const response = await productReportsService.getSalesForecast(reportParams);
      setSalesForecast(response.data || {});
    } catch (err) {
      console.error('Błąd podczas pobierania prognozy sprzedaży:', err);
    }
  };

  const loadProductsSummary = async () => {
    try {
      const response = await productReportsService.getProductsSummary(reportParams);
      setProductsSummary(response.data || {});
    } catch (err) {
      console.error('Błąd podczas pobierania podsumowania produktów:', err);
    }
  };

  const renderDailyReport = () => (
    <div className="row">
      <div className="col-md-6">
        <div className="card">
          <div className="card-header">
            <h5>📊 Statystyki dzienne i miesięczne</h5>
          </div>
          <div className="card-body">
            {dailyStats ? (
              <div>
                <div className="row mb-3">
                  <div className="col-6">
                    <div className="border p-3 text-center">
                      <h4 className="text-success">{dailyStats?.data?.today_transactions || 0}</h4>
                      <small>Transakcje dzisiaj</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="border p-3 text-center">
                      <h4 className="text-primary">{(dailyStats?.data?.today_revenue || 0).toFixed(2)} zł</h4>
                      <small>Przychód dzienny</small>
                    </div>
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-6">
                    <div className="border p-3 text-center">
                      <h4 className="text-info">{(dailyStats?.data?.today_average_transaction || 0).toFixed(2)} zł</h4>
                      <small>Średnia dzienna</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="border p-3 text-center">
                      <h4 className="text-warning">{(dailyStats?.data?.month_average_transaction || 0).toFixed(2)} zł</h4>
                      <small>Średnia miesięczna</small>
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-6">
                    <div className="border p-3 text-center">
                      <h4 className="text-secondary">{dailyStats?.data?.month_transactions || 0}</h4>
                      <small>Transakcje w miesiącu</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="border p-3 text-center">
                      <h4 className="text-dark">{(dailyStats?.data?.month_revenue || 0).toFixed(2)} zł</h4>
                      <small>Przychód miesięczny</small>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center">Brak danych</div>
            )}
          </div>
        </div>
      </div>
      
      <div className="col-md-6">
        <div className="card">
          <div className="card-header">
            <h5>🏆 Top produkty</h5>
          </div>
          <div className="card-body">
            {topProducts.length > 0 ? (
              <div className="list-group list-group-flush">
                {topProducts.slice(0, 5).map((product, index) => (
                  <div key={product.id} className="list-group-item d-flex justify-content-between">
                    <span>#{index + 1} {product.nazwa}</span>
                    <span className="badge bg-primary">{product.cena_sprzedazy} zł</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center">Brak danych</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderMonthlyReport = () => (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h5>📅 Statystyki miesięczne</h5>
          </div>
          <div className="card-body">
            {monthlyStats?.data && monthlyStats.data.length > 0 ? (
              <div>
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Miesiąc</th>
                        <th>Liczba transakcji</th>
                        <th>Przychód</th>
                        <th>Średnia paragonu</th>
                        <th>Sprzedane produkty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyStats.data.map((month, index) => {
                        const monthNames = [
                          'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
                          'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
                        ];
                        const monthName = monthNames[month.month_num - 1];
                        
                        return (
                          <tr key={index}>
                            <td><strong>{monthName} {month.year}</strong></td>
                            <td>{month.transactions_count}</td>
                            <td>{month.total_revenue.toFixed(2)} zł</td>
                            <td className="text-info"><strong>{month.average_transaction.toFixed(2)} zł</strong></td>
                            <td>{month.items_sold}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Wykres lub podsumowanie */}
                <div className="row mt-4">
                  <div className="col-md-4">
                    <div className="border p-3 text-center">
                      <h4 className="text-success">
                        {monthlyStats.data.reduce((sum, month) => sum + month.transactions_count, 0)}
                      </h4>
                      <small>Wszystkie transakcje</small>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="border p-3 text-center">
                      <h4 className="text-primary">
                        {monthlyStats.data.reduce((sum, month) => sum + month.total_revenue, 0).toFixed(2)} zł
                      </h4>
                      <small>Całkowity przychód</small>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="border p-3 text-center">
                      <h4 className="text-info">
                        {monthlyStats.data.length > 0 ? 
                          (monthlyStats.data.reduce((sum, month) => sum + month.average_transaction, 0) / monthlyStats.data.length).toFixed(2) 
                          : 0} zł
                      </h4>
                      <small>Średnia wszystkich miesięcy</small>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center">Brak danych miesięcznych</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderShiftReport = () => (
    <div className="card">
      <div className="card-header">
        <h5>📋 Historia zmian kasowych</h5>
      </div>
      <div className="card-body">
        {shiftHistory.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Kasjer</th>
                  <th>Rozpoczęcie</th>
                  <th>Zakończenie</th>
                  <th>Saldo początkowe</th>
                  <th>Saldo końcowe</th>
                  <th>Różnica</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shiftHistory.map((shift) => (
                  <tr key={shift.id}>
                    <td>{new Date(shift.data_otwarcia).toLocaleDateString('pl-PL')}</td>
                    <td>{shift.kasjer_login}</td>
                    <td>{new Date(shift.data_otwarcia).toLocaleTimeString('pl-PL')}</td>
                    <td>{shift.data_zamkniecia ? new Date(shift.data_zamkniecia).toLocaleTimeString('pl-PL') : '-'}</td>
                    <td>{shift.saldo_poczatkowe} zł</td>
                    <td>{shift.saldo_koncowe || '-'} zł</td>
                    <td>
                      {shift.saldo_koncowe ? 
                        <span className={shift.saldo_koncowe > shift.saldo_poczatkowe ? 'text-success' : 'text-danger'}>
                          {(shift.saldo_koncowe - shift.saldo_poczatkowe).toFixed(2)} zł
                        </span> : '-'
                      }
                    </td>
                    <td>
                      <span className={`badge ${shift.data_zamkniecia ? 'bg-success' : 'bg-warning'}`}>
                        {shift.data_zamkniecia ? 'Zamknięta' : 'Otwarta'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center">Brak danych</div>
        )}
      </div>
    </div>
  );

  const renderMarginReport = () => (
    <div className="card">
      <div className="card-header">
        <h5>⚠️ Produkty z niską marżą</h5>
      </div>
      <div className="card-body">
        {lowMarginProducts.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Produkt</th>
                  <th>Cena zakupu</th>
                  <th>Cena sprzedaży</th>
                  <th>Marża</th>
                  <th>Zysk</th>
                </tr>
              </thead>
              <tbody>
                {lowMarginProducts.map((product) => {
                  const cenaZakupu = parseFloat(product.cena_zakupu) || 0;
                  const cenaSprzedazy = parseFloat(product.cena_sprzedazy) || 0;
                  const marza = cenaZakupu > 0 ? (((cenaSprzedazy - cenaZakupu) / cenaZakupu) * 100) : 0;
                  const zysk = cenaSprzedazy - cenaZakupu;
                  
                  return (
                    <tr key={product.id}>
                      <td>{product.nazwa}</td>
                      <td>{cenaZakupu.toFixed(2)} zł</td>
                      <td>{cenaSprzedazy.toFixed(2)} zł</td>
                      <td>
                        <span className={`badge ${marza < 10 ? 'bg-danger' : marza < 20 ? 'bg-warning' : 'bg-success'}`}>
                          {marza.toFixed(1)}%
                        </span>
                      </td>
                      <td className={zysk >= 0 ? 'text-success' : 'text-danger'}>
                        {zysk.toFixed(2)} zł
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center">Brak produktów z niską marżą</div>
        )}
      </div>
    </div>
  );

  // Nowe funkcje renderujące dla raportów produktowych
  const renderRotationReport = () => (
    <div className="row">
      <div className="col-md-6">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5>🔄 Najbardziej rotujące produkty</h5>
            <small className="text-muted">Top {reportParams.limit}</small>
          </div>
          <div className="card-body">
            {highestRotationProducts.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Ranking</th>
                      <th>Produkt</th>
                      <th>Sprzedano</th>
                      <th>Dziennie</th>
                      <th>% całości</th>
                    </tr>
                  </thead>
                  <tbody>
                    {highestRotationProducts.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <span className="badge bg-primary">#{product.ranking}</span>
                        </td>
                        <td>
                          <div>
                            <small className="fw-bold">{product.nazwa}</small>
                            <br />
                            <small className="text-muted">{product.kategoria_nazwa}</small>
                          </div>
                        </td>
                        <td>{product.total_quantity_sold}</td>
                        <td>{product.rotation_index}</td>
                        <td>
                          <span className="badge bg-success">
                            {product.percentage_of_total_sales?.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-muted">Brak danych</div>
            )}
          </div>
        </div>
      </div>

      <div className="col-md-6">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5>🐌 Najmniej rotujące produkty</h5>
            <small className="text-muted">Top {reportParams.limit}</small>
          </div>
          <div className="card-body">
            {lowestRotationProducts.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Produkt</th>
                      <th>Problem</th>
                      <th>Stan</th>
                      <th>Sprzedano</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowestRotationProducts.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <div>
                            <small className="fw-bold">{product.nazwa}</small>
                            <br />
                            <small className="text-muted">{product.kod_produktu}</small>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${
                            product.issue === 'Brak sprzedaży' ? 'bg-danger' :
                            product.issue === 'Bardzo niska rotacja' ? 'bg-warning' :
                            'bg-secondary'
                          }`}>
                            {product.issue}
                          </span>
                        </td>
                        <td>{product.stan_magazynowy || 0}</td>
                        <td>{product.total_quantity_sold || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-muted">Brak danych</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderBestsellersReport = () => (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <div className="row align-items-center">
              <div className="col">
                <h5>🏆 Bestsellery - Top {reportParams.limit} produktów</h5>
              </div>
              <div className="col-auto">
                <select 
                  className="form-select form-select-sm"
                  value={reportParams.metric}
                  onChange={(e) => {
                    setReportParams({...reportParams, metric: e.target.value});
                    loadBestsellingProducts();
                  }}
                >
                  <option value="quantity">Według ilości</option>
                  <option value="revenue">Według przychodu</option>
                </select>
              </div>
            </div>
          </div>
          <div className="card-body">
            {bestsellingProducts.products?.length > 0 ? (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ranking</th>
                      <th>Produkt</th>
                      <th>Producent</th>
                      <th>Ilość</th>
                      <th>Przychód</th>
                      <th>Śr. cena</th>
                      <th>Transakcje</th>
                      <th>% całości</th>
                      <th>Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bestsellingProducts.products.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <span className={`badge ${
                            product.ranking <= 3 ? 'bg-warning' :
                            product.ranking <= 10 ? 'bg-primary' : 'bg-secondary'
                          }`}>
                            #{product.ranking}
                          </span>
                        </td>
                        <td>
                          <div>
                            <div className="fw-bold">{product.nazwa}</div>
                            <small className="text-muted">{product.kod_produktu}</small>
                          </div>
                        </td>
                        <td>{product.producent_nazwa || '-'}</td>
                        <td>{product.total_quantity_sold}</td>
                        <td>{product.total_revenue?.toFixed(2)} zł</td>
                        <td>{product.avg_price?.toFixed(2)} zł</td>
                        <td>{product.transactions_count}</td>
                        <td>
                          <span className="badge bg-info">
                            {reportParams.metric === 'quantity' 
                              ? product.percentage_of_total_quantity?.toFixed(1)
                              : product.percentage_of_total_revenue?.toFixed(1)
                            }%
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${
                            product.trend === 'Wysoka' ? 'bg-success' :
                            product.trend === 'Średnia' ? 'bg-warning' : 'bg-secondary'
                          }`}>
                            {product.trend}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-muted">Brak danych</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderForecastReport = () => (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <div className="row align-items-center">
              <div className="col">
                <h5>📈 Prognoza sprzedaży na {reportParams.forecast_days} dni</h5>
              </div>
              <div className="col-auto">
                <input
                  type="number"
                  className="form-control form-control-sm"
                  style={{width: '100px'}}
                  value={reportParams.forecast_days}
                  onChange={(e) => {
                    setReportParams({...reportParams, forecast_days: parseInt(e.target.value) || 30});
                  }}
                  onBlur={loadSalesForecast}
                  min="1"
                  max="365"
                />
              </div>
            </div>
          </div>
          <div className="card-body">
            {salesForecast.forecasts?.length > 0 ? (
              <div>
                <div className="row mb-3">
                  <div className="col-md-3">
                    <div className="card bg-light">
                      <div className="card-body text-center">
                        <h6>Produkty analizowane</h6>
                        <h4 className="text-primary">{salesForecast.total_products}</h4>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-light">
                      <div className="card-body text-center">
                        <h6>Okres analizy</h6>
                        <h4 className="text-info">{salesForecast.analysis_period} dni</h4>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-light">
                      <div className="card-body text-center">
                        <h6>Prognoza łączna</h6>
                        <h4 className="text-success">
                          {salesForecast.forecasts.reduce((sum, f) => sum + f.forecast.total_forecast, 0).toFixed(0)} szt.
                        </h4>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-light">
                      <div className="card-body text-center">
                        <h6>Wartość prognoza</h6>
                        <h4 className="text-warning">
                          {salesForecast.forecasts.reduce((sum, f) => sum + f.revenue_forecast.estimated_revenue, 0).toFixed(2)} zł
                        </h4>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Produkt</th>
                        <th>Stan magazynu</th>
                        <th>Śr. dzienna</th>
                        <th>Prognoza ({reportParams.forecast_days} dni)</th>
                        <th>Trend</th>
                        <th>Rekomendacje</th>
                        <th>Wartość</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesForecast.forecasts.slice(0, 15).map((forecast) => (
                        <tr key={forecast.product_id}>
                          <td>
                            <div>
                              <div className="fw-bold">{forecast.product_name}</div>
                              <small className="text-muted">{forecast.product_code}</small>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${
                              forecast.current_stock < forecast.forecast.total_forecast ? 'bg-danger' : 'bg-success'
                            }`}>
                              {forecast.current_stock}
                            </span>
                          </td>
                          <td>{forecast.forecast.daily_forecast}</td>
                          <td>
                            <strong>{forecast.forecast.total_forecast}</strong>
                            <small className="text-muted d-block">
                              ±{forecast.forecast.confidence_level}
                            </small>
                          </td>
                          <td>
                            <span className={`badge ${
                              forecast.historical_data.sales_trend === 'wzrostowy' ? 'bg-success' :
                              forecast.historical_data.sales_trend === 'spadkowy' ? 'bg-danger' : 'bg-secondary'
                            }`}>
                              {forecast.historical_data.sales_trend}
                            </span>
                          </td>
                          <td>
                            {forecast.inventory_recommendations.reorder_needed ? (
                              <div>
                                <span className="badge bg-warning">Zamów</span>
                                <small className="d-block">
                                  {forecast.inventory_recommendations.suggested_order_quantity} szt.
                                </small>
                              </div>
                            ) : (
                              <span className="badge bg-success">OK</span>
                            )}
                          </td>
                          <td>
                            {forecast.revenue_forecast.estimated_revenue.toFixed(2)} zł
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted">Brak danych do prognozy</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="container mt-4"><div className="text-center">Ładowanie...</div></div>;

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        <div className="col-12">
          <h2>📈 Raporty i Statystyki</h2>
          
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              {error}
              <button type="button" className="btn-close" onClick={() => setError(null)}></button>
            </div>
          )}

          {/* Zakładki */}
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'daily' ? 'active' : ''}`}
                onClick={() => setActiveTab('daily')}
              >
                📊 Statystyki
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'monthly' ? 'active' : ''}`}
                onClick={() => setActiveTab('monthly')}
              >
                📅 Miesięczne
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'shifts' ? 'active' : ''}`}
                onClick={() => setActiveTab('shifts')}
              >
                📋 Zmiany
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'margin' ? 'active' : ''}`}
                onClick={() => setActiveTab('margin')}
              >
                ⚠️ Marże
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'rotation' ? 'active' : ''}`}
                onClick={() => setActiveTab('rotation')}
              >
                🔄 Rotacja
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'bestsellers' ? 'active' : ''}`}
                onClick={() => setActiveTab('bestsellers')}
              >
                🏆 Bestsellery
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'forecast' ? 'active' : ''}`}
                onClick={() => setActiveTab('forecast')}
              >
                📈 Prognoza
              </button>
            </li>
          </ul>

          {/* Filtry */}
          <div className="card mb-3">
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <label className="form-label">Data od:</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateFilter.startDate}
                    onChange={(e) => setDateFilter({...dateFilter, startDate: e.target.value})}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Data do:</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateFilter.endDate}
                    onChange={(e) => setDateFilter({...dateFilter, endDate: e.target.value})}
                  />
                </div>
                
                {/* Dodatkowe filtry dla raportów produktowych */}
                {(['rotation', 'bestsellers', 'forecast'].includes(activeTab)) && (
                  <>
                    <div className="col-md-2">
                      <label className="form-label">Okres (dni):</label>
                      <input
                        type="number"
                        className="form-control"
                        value={reportParams.days}
                        onChange={(e) => setReportParams({...reportParams, days: parseInt(e.target.value) || 30})}
                        min="1"
                        max="365"
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Limit:</label>
                      <select
                        className="form-control"
                        value={reportParams.limit}
                        onChange={(e) => setReportParams({...reportParams, limit: parseInt(e.target.value)})}
                      >
                        <option value={10}>Top 10</option>
                        <option value={20}>Top 20</option>
                        <option value={30}>Top 30</option>
                        <option value={50}>Top 50</option>
                      </select>
                    </div>
                  </>
                )}
                
                <div className="col-md-2 d-flex align-items-end">
                  <button 
                    className="btn btn-primary me-2"
                    onClick={() => {
                      loadInitialData();
                      if (['rotation', 'bestsellers', 'forecast'].includes(activeTab)) {
                        loadProductReports();
                      }
                    }}
                  >
                    🔄 Odśwież
                  </button>
                  <button className="btn btn-success">
                    📤 Eksportuj
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Zawartość zakładek */}
          <div className="tab-content">
            {activeTab === 'daily' && renderDailyReport()}
            {activeTab === 'monthly' && renderMonthlyReport()}
            {activeTab === 'shifts' && renderShiftReport()}
            {activeTab === 'margin' && renderMarginReport()}
            {activeTab === 'rotation' && renderRotationReport()}
            {activeTab === 'bestsellers' && renderBestsellersReport()}
            {activeTab === 'forecast' && renderForecastReport()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
