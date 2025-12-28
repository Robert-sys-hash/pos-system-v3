import React, { useState, useEffect } from 'react';
import { transactionService } from '../services/transactionService';
import { productService } from '../services/productService';
import { shiftService } from '../services/shiftService';
import { productReportsService } from '../services/productReportsService';
import { useLocation } from '../contexts/LocationContext';

const ReportsPage = () => {
  const { locationId, selectedLocation } = useLocation();
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
  }, [locationId]); // Przeładuj dane przy zmianie lokalizacji

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
      const stats = await transactionService.getDailyStats(locationId);
      setDailyStats(stats);
    } catch (err) {
      console.error('Błąd podczas pobierania statystyk dziennych:', err);
    }
  };

  const loadMonthlyStats = async () => {
    try {
      const stats = await transactionService.getMonthlyStats(locationId);
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
      <div>
        <div style={{ border: '1px solid #e9ecef', borderRadius: '0.375rem', backgroundColor: 'white' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
            <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>📊 Statystyki dzienne i miesięczne</h5>
          </div>
          <div style={{ padding: '0.75rem' }}>
            {dailyStats ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ border: '1px solid #e9ecef', padding: '0.5rem', textAlign: 'center', borderRadius: '0.25rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#28a745' }}>{dailyStats?.data?.today_transactions || 0}</h4>
                    <small style={{ fontSize: '0.75rem' }}>Transakcje dzisiaj</small>
                  </div>
                  <div style={{ border: '1px solid #e9ecef', padding: '0.5rem', textAlign: 'center', borderRadius: '0.25rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#007bff' }}>{(dailyStats?.data?.today_revenue || 0).toFixed(2)} zł</h4>
                    <small style={{ fontSize: '0.75rem' }}>Przychód dzienny</small>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ border: '1px solid #e9ecef', padding: '0.5rem', textAlign: 'center', borderRadius: '0.25rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#17a2b8' }}>{(dailyStats?.data?.today_average_transaction || 0).toFixed(2)} zł</h4>
                    <small style={{ fontSize: '0.75rem' }}>Średnia dzienna</small>
                  </div>
                  <div style={{ border: '1px solid #e9ecef', padding: '0.5rem', textAlign: 'center', borderRadius: '0.25rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#ffc107' }}>{(dailyStats?.data?.month_average_transaction || 0).toFixed(2)} zł</h4>
                    <small style={{ fontSize: '0.75rem' }}>Średnia miesięczna</small>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ border: '1px solid #e9ecef', padding: '0.5rem', textAlign: 'center', borderRadius: '0.25rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#6c757d' }}>{dailyStats?.data?.month_transactions || 0}</h4>
                    <small style={{ fontSize: '0.75rem' }}>Transakcje w miesiącu</small>
                  </div>
                  <div style={{ border: '1px solid #e9ecef', padding: '0.5rem', textAlign: 'center', borderRadius: '0.25rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#343a40' }}>{(dailyStats?.data?.month_revenue || 0).toFixed(2)} zł</h4>
                    <small style={{ fontSize: '0.75rem' }}>Przychód miesięczny</small>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6c757d' }}>Brak danych</div>
            )}
          </div>
        </div>
      </div>
      
      <div>
        <div style={{ border: '1px solid #e9ecef', borderRadius: '0.375rem', backgroundColor: 'white' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
            <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>🏆 Top produkty</h5>
          </div>
          <div style={{ padding: '0.75rem' }}>
            {topProducts.length > 0 ? (
              <div>
                {topProducts.slice(0, 5).map((product, index) => (
                  <div key={product.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: index < 4 ? '1px solid #f8f9fa' : 'none', fontSize: '0.8rem' }}>
                    <span>#{index + 1} {product.nazwa}</span>
                    <span style={{ backgroundColor: '#007bff', color: 'white', padding: '0.2rem 0.4rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>{product.cena_sprzedazy} zł</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6c757d' }}>Brak danych</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderMonthlyReport = () => (
    <div>
      <div>
        <div style={{ border: '1px solid #e9ecef', borderRadius: '0.375rem', backgroundColor: 'white' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
            <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>📅 Statystyki miesięczne</h5>
          </div>
          <div style={{ padding: '0.75rem' }}>
            {monthlyStats?.data && monthlyStats.data.length > 0 ? (
              <div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '0.4rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.75rem' }}>Miesiąc</th>
                        <th style={{ padding: '0.4rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.75rem' }}>Liczba transakcji</th>
                        <th style={{ padding: '0.4rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.75rem' }}>Przychód</th>
                        <th style={{ padding: '0.4rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.75rem' }}>Średnia paragonu</th>
                        <th style={{ padding: '0.4rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.75rem' }}>Sprzedane produkty</th>
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
                            <td style={{ padding: '0.4rem', borderBottom: '1px solid #f8f9fa', fontWeight: '600' }}>{monthName} {month.year}</td>
                            <td style={{ padding: '0.4rem', borderBottom: '1px solid #f8f9fa' }}>{month.transactions_count}</td>
                            <td style={{ padding: '0.4rem', borderBottom: '1px solid #f8f9fa' }}>{month.total_revenue.toFixed(2)} zł</td>
                            <td style={{ padding: '0.4rem', borderBottom: '1px solid #f8f9fa', color: '#17a2b8', fontWeight: '600' }}>{month.average_transaction.toFixed(2)} zł</td>
                            <td style={{ padding: '0.4rem', borderBottom: '1px solid #f8f9fa' }}>{month.items_sold}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Wykres lub podsumowanie */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <div style={{ border: '1px solid #e9ecef', padding: '0.5rem', textAlign: 'center', borderRadius: '0.25rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#28a745' }}>
                      {monthlyStats.data.reduce((sum, month) => sum + month.transactions_count, 0)}
                    </h4>
                    <small style={{ fontSize: '0.75rem' }}>Wszystkie transakcje</small>
                  </div>
                  <div style={{ border: '1px solid #e9ecef', padding: '0.5rem', textAlign: 'center', borderRadius: '0.25rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#007bff' }}>
                      {monthlyStats.data.reduce((sum, month) => sum + month.total_revenue, 0).toFixed(2)} zł
                    </h4>
                    <small style={{ fontSize: '0.75rem' }}>Całkowity przychód</small>
                  </div>
                  <div style={{ border: '1px solid #e9ecef', padding: '0.5rem', textAlign: 'center', borderRadius: '0.25rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#17a2b8' }}>
                      {monthlyStats.data.length > 0 ? 
                        (monthlyStats.data.reduce((sum, month) => sum + month.average_transaction, 0) / monthlyStats.data.length).toFixed(2) 
                        : 0} zł
                    </h4>
                    <small style={{ fontSize: '0.75rem' }}>Średnia wszystkich miesięcy</small>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6c757d' }}>Brak danych miesięcznych</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderShiftReport = () => (
    <div style={{ border: '1px solid #e9ecef', borderRadius: '0.375rem', backgroundColor: 'white' }}>
      <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
        <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>📋 Historia zmian kasowych</h5>
      </div>
      <div style={{ padding: '0.75rem' }}>
        {shiftHistory.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.4rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.7rem' }}>Data</th>
                  <th style={{ padding: '0.4rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.7rem' }}>Kasjer</th>
                  <th style={{ padding: '0.4rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.7rem' }}>Start</th>
                  <th style={{ padding: '0.4rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.7rem' }}>Koniec</th>
                  <th style={{ padding: '0.4rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.7rem' }}>Saldo pocz.</th>
                  <th style={{ padding: '0.4rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.7rem' }}>Saldo końc.</th>
                  <th style={{ padding: '0.4rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.7rem' }}>Różnica</th>
                  <th style={{ padding: '0.4rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.7rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {shiftHistory.map((shift) => (
                  <tr key={shift.id}>
                    <td style={{ padding: '0.3rem', borderBottom: '1px solid #f8f9fa' }}>{new Date(shift.data_otwarcia).toLocaleDateString('pl-PL')}</td>
                    <td style={{ padding: '0.3rem', borderBottom: '1px solid #f8f9fa' }}>{shift.kasjer_login}</td>
                    <td style={{ padding: '0.3rem', borderBottom: '1px solid #f8f9fa' }}>{new Date(shift.data_otwarcia).toLocaleTimeString('pl-PL')}</td>
                    <td style={{ padding: '0.3rem', borderBottom: '1px solid #f8f9fa' }}>{shift.data_zamkniecia ? new Date(shift.data_zamkniecia).toLocaleTimeString('pl-PL') : '-'}</td>
                    <td style={{ padding: '0.3rem', borderBottom: '1px solid #f8f9fa' }}>{shift.saldo_poczatkowe} zł</td>
                    <td style={{ padding: '0.3rem', borderBottom: '1px solid #f8f9fa' }}>{shift.saldo_koncowe || '-'} zł</td>
                    <td style={{ padding: '0.3rem', borderBottom: '1px solid #f8f9fa' }}>
                      {shift.saldo_koncowe ? 
                        <span style={{ color: shift.saldo_koncowe > shift.saldo_poczatkowe ? '#28a745' : '#dc3545' }}>
                          {(shift.saldo_koncowe - shift.saldo_poczatkowe).toFixed(2)} zł
                        </span> : '-'
                      }
                    </td>
                    <td style={{ padding: '0.3rem', borderBottom: '1px solid #f8f9fa' }}>
                      <span style={{ 
                        backgroundColor: shift.data_zamkniecia ? '#28a745' : '#ffc107', 
                        color: 'white', 
                        padding: '0.15rem 0.3rem', 
                        borderRadius: '0.25rem', 
                        fontSize: '0.65rem' 
                      }}>
                        {shift.data_zamkniecia ? 'Zamknięta' : 'Otwarta'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6c757d' }}>Brak danych</div>
        )}
      </div>
    </div>
  );

  const renderMarginReport = () => (
    <div style={{ border: '1px solid #e9ecef', borderRadius: '0.375rem', backgroundColor: 'white' }}>
      <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
        <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>⚠️ Produkty z niską marżą</h5>
      </div>
      <div style={{ padding: '0.75rem' }}>
        {lowMarginProducts.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.4rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.7rem' }}>Produkt</th>
                  <th style={{ padding: '0.4rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.7rem' }}>Cena zakupu</th>
                  <th style={{ padding: '0.4rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.7rem' }}>Cena sprzedaży</th>
                  <th style={{ padding: '0.4rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.7rem' }}>Marża</th>
                  <th style={{ padding: '0.4rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.7rem' }}>Zysk</th>
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
                      <td style={{ padding: '0.3rem', borderBottom: '1px solid #f8f9fa' }}>{product.nazwa}</td>
                      <td style={{ padding: '0.3rem', borderBottom: '1px solid #f8f9fa' }}>{cenaZakupu.toFixed(2)} zł</td>
                      <td style={{ padding: '0.3rem', borderBottom: '1px solid #f8f9fa' }}>{cenaSprzedazy.toFixed(2)} zł</td>
                      <td style={{ padding: '0.3rem', borderBottom: '1px solid #f8f9fa' }}>
                        <span style={{ 
                          backgroundColor: marza < 10 ? '#dc3545' : marza < 20 ? '#ffc107' : '#28a745',
                          color: 'white',
                          padding: '0.15rem 0.3rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.65rem'
                        }}>
                          {marza.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ 
                        padding: '0.3rem', 
                        borderBottom: '1px solid #f8f9fa',
                        color: zysk >= 0 ? '#28a745' : '#dc3545'
                      }}>
                        {zysk.toFixed(2)} zł
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6c757d' }}>Brak produktów z niską marżą</div>
        )}
      </div>
    </div>
  );

  // Nowe funkcje renderujące dla raportów produktowych
  const renderRotationReport = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
      <div>
        <div style={{ border: '1px solid #e9ecef', borderRadius: '0.375rem', backgroundColor: 'white' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>🔄 Najbardziej rotujące produkty</h5>
            <small style={{ fontSize: '0.7rem', color: '#6c757d' }}>Top {reportParams.limit}</small>
          </div>
          <div style={{ padding: '0.75rem' }}>
            {highestRotationProducts.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>Ranking</th>
                      <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>Produkt</th>
                      <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>Sprzedano</th>
                      <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>Dziennie</th>
                      <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {highestRotationProducts.map((product) => (
                      <tr key={product.id}>
                        <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>
                          <span style={{ backgroundColor: '#007bff', color: 'white', padding: '0.1rem 0.2rem', borderRadius: '0.2rem', fontSize: '0.6rem' }}>#{product.ranking}</span>
                        </td>
                        <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '0.65rem' }}>{product.nazwa}</div>
                            <div style={{ color: '#6c757d', fontSize: '0.6rem' }}>{product.kategoria_nazwa}</div>
                          </div>
                        </td>
                        <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>{product.total_quantity_sold}</td>
                        <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>{product.rotation_index}</td>
                        <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>
                          <span style={{ backgroundColor: '#28a745', color: 'white', padding: '0.1rem 0.2rem', borderRadius: '0.2rem', fontSize: '0.6rem' }}>
                            {product.percentage_of_total_sales?.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#6c757d', fontSize: '0.8rem' }}>Brak danych</div>
            )}
          </div>
        </div>
      </div>

      <div>
        <div style={{ border: '1px solid #e9ecef', borderRadius: '0.375rem', backgroundColor: 'white' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>🐌 Najmniej rotujące produkty</h5>
            <small style={{ fontSize: '0.7rem', color: '#6c757d' }}>Top {reportParams.limit}</small>
          </div>
          <div style={{ padding: '0.75rem' }}>
            {lowestRotationProducts.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>Produkt</th>
                      <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>Problem</th>
                      <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>Stan</th>
                      <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>Sprzedano</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowestRotationProducts.map((product) => (
                      <tr key={product.id}>
                        <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '0.65rem' }}>{product.nazwa}</div>
                            <div style={{ color: '#6c757d', fontSize: '0.6rem' }}>{product.kod_produktu}</div>
                          </div>
                        </td>
                        <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>
                          <span style={{ 
                            backgroundColor: product.issue === 'Brak sprzedaży' ? '#dc3545' :
                              product.issue === 'Bardzo niska rotacja' ? '#ffc107' : '#6c757d',
                            color: 'white',
                            padding: '0.1rem 0.2rem',
                            borderRadius: '0.2rem',
                            fontSize: '0.6rem'
                          }}>
                            {product.issue}
                          </span>
                        </td>
                        <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>{product.stan_magazynowy || 0}</td>
                        <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>{product.total_quantity_sold || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#6c757d', fontSize: '0.8rem' }}>Brak danych</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderBestsellersReport = () => (
    <div>
      <div>
        <div style={{ border: '1px solid #e9ecef', borderRadius: '0.375rem', backgroundColor: 'white' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>🏆 Bestsellery - Top {reportParams.limit} produktów</h5>
              <select 
                style={{ 
                  padding: '0.25rem', 
                  fontSize: '0.75rem', 
                  border: '1px solid #e9ecef', 
                  borderRadius: '0.25rem',
                  backgroundColor: 'white'
                }}
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
          <div style={{ padding: '0.75rem' }}>
            {bestsellingProducts.products?.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>Ranking</th>
                      <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>Produkt</th>
                      <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>Producent</th>
                      <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>Ilość</th>
                      <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>Przychód</th>
                      <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>Śr. cena</th>
                      <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>Trans.</th>
                      <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>%</th>
                      <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bestsellingProducts.products.map((product) => (
                      <tr key={product.id}>
                        <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>
                          <span style={{ 
                            backgroundColor: product.ranking <= 3 ? '#ffc107' :
                              product.ranking <= 10 ? '#007bff' : '#6c757d',
                            color: 'white',
                            padding: '0.1rem 0.25rem',
                            borderRadius: '0.2rem',
                            fontSize: '0.6rem'
                          }}>
                            #{product.ranking}
                          </span>
                        </td>
                        <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '0.65rem' }}>{product.nazwa}</div>
                            <div style={{ color: '#6c757d', fontSize: '0.6rem' }}>{product.kod_produktu}</div>
                          </div>
                        </td>
                        <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>{product.producent_nazwa || '-'}</td>
                        <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>{product.total_quantity_sold}</td>
                        <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>{product.total_revenue?.toFixed(2)} zł</td>
                        <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>{product.avg_price?.toFixed(2)} zł</td>
                        <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>{product.transactions_count}</td>
                        <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>
                          <span style={{ 
                            backgroundColor: '#17a2b8',
                            color: 'white',
                            padding: '0.1rem 0.2rem',
                            borderRadius: '0.2rem',
                            fontSize: '0.6rem'
                          }}>
                            {reportParams.metric === 'quantity' 
                              ? product.percentage_of_total_quantity?.toFixed(1)
                              : product.percentage_of_total_revenue?.toFixed(1)
                            }%
                          </span>
                        </td>
                        <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>
                          <span style={{ 
                            backgroundColor: product.trend === 'Wysoka' ? '#28a745' :
                              product.trend === 'Średnia' ? '#ffc107' : '#6c757d',
                            color: 'white',
                            padding: '0.1rem 0.2rem',
                            borderRadius: '0.2rem',
                            fontSize: '0.6rem'
                          }}>
                            {product.trend}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#6c757d', fontSize: '0.8rem' }}>Brak danych</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderForecastReport = () => (
    <div>
      <div>
        <div style={{ border: '1px solid #e9ecef', borderRadius: '0.375rem', backgroundColor: 'white' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>📈 Prognoza sprzedaży na {reportParams.forecast_days} dni</h5>
              <input
                type="number"
                style={{
                  width: '80px',
                  padding: '0.25rem',
                  fontSize: '0.75rem',
                  border: '1px solid #e9ecef',
                  borderRadius: '0.25rem'
                }}
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
          <div style={{ padding: '0.75rem' }}>
            {salesForecast.forecasts?.length > 0 ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '0.25rem', padding: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>Produkty analizowane</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#007bff' }}>{salesForecast.total_products}</div>
                  </div>
                  <div style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '0.25rem', padding: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>Okres analizy</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#17a2b8' }}>{salesForecast.analysis_period} dni</div>
                  </div>
                  <div style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '0.25rem', padding: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>Prognoza łączna</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#28a745' }}>
                      {salesForecast.forecasts.reduce((sum, f) => sum + f.forecast.total_forecast, 0).toFixed(0)} szt.
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '0.25rem', padding: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>Wartość prognoza</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#ffc107' }}>
                      {salesForecast.forecasts.reduce((sum, f) => sum + f.revenue_forecast.estimated_revenue, 0).toFixed(2)} zł
                    </div>
                  </div>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>Produkt</th>
                        <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>Stan</th>
                        <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>Śr. dzienna</th>
                        <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>Prognoza ({reportParams.forecast_days}d)</th>
                        <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>Trend</th>
                        <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>Akcja</th>
                        <th style={{ padding: '0.3rem', borderBottom: '1px solid #e9ecef', textAlign: 'left', fontSize: '0.65rem' }}>Wartość</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesForecast.forecasts.slice(0, 15).map((forecast) => (
                        <tr key={forecast.product_id}>
                          <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>
                            <div>
                              <div style={{ fontWeight: '600', fontSize: '0.65rem' }}>{forecast.product_name}</div>
                              <div style={{ color: '#6c757d', fontSize: '0.6rem' }}>{forecast.product_code}</div>
                            </div>
                          </td>
                          <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>
                            <span style={{
                              backgroundColor: forecast.current_stock < forecast.forecast.total_forecast ? '#dc3545' : '#28a745',
                              color: 'white',
                              padding: '0.1rem 0.2rem',
                              borderRadius: '0.2rem',
                              fontSize: '0.6rem'
                            }}>
                              {forecast.current_stock}
                            </span>
                          </td>
                          <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>{forecast.forecast.daily_forecast}</td>
                          <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>
                            <div style={{ fontWeight: '600' }}>{forecast.forecast.total_forecast}</div>
                            <div style={{ color: '#6c757d', fontSize: '0.6rem' }}>
                              ±{forecast.forecast.confidence_level}
                            </div>
                          </td>
                          <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>
                            <span style={{
                              backgroundColor: forecast.historical_data.sales_trend === 'wzrostowy' ? '#28a745' :
                                forecast.historical_data.sales_trend === 'spadkowy' ? '#dc3545' : '#6c757d',
                              color: 'white',
                              padding: '0.1rem 0.2rem',
                              borderRadius: '0.2rem',
                              fontSize: '0.6rem'
                            }}>
                              {forecast.historical_data.sales_trend}
                            </span>
                          </td>
                          <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>
                            {forecast.inventory_recommendations.reorder_needed ? (
                              <div>
                                <span style={{ backgroundColor: '#ffc107', color: 'white', padding: '0.1rem 0.2rem', borderRadius: '0.2rem', fontSize: '0.6rem' }}>Zamów</span>
                                <div style={{ fontSize: '0.6rem', color: '#6c757d' }}>
                                  {forecast.inventory_recommendations.suggested_order_quantity} szt.
                                </div>
                              </div>
                            ) : (
                              <span style={{ backgroundColor: '#28a745', color: 'white', padding: '0.1rem 0.2rem', borderRadius: '0.2rem', fontSize: '0.6rem' }}>OK</span>
                            )}
                          </td>
                          <td style={{ padding: '0.25rem', borderBottom: '1px solid #f8f9fa' }}>
                            {forecast.revenue_forecast.estimated_revenue.toFixed(2)} zł
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#6c757d', fontSize: '0.8rem' }}>Brak danych do prognozy</div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>📈 Raporty i Statystyki</h2>
            {selectedLocation && (
              <span style={{ 
                backgroundColor: '#e3f2fd', 
                color: '#1565c0', 
                padding: '0.25rem 0.75rem', 
                borderRadius: '0.25rem',
                fontSize: '0.8rem',
                fontWeight: '500'
              }}>
                📍 {selectedLocation.nazwa}
              </span>
            )}
          </div>
          
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              {error}
              <button type="button" className="btn-close" onClick={() => setError(null)}></button>
            </div>
          )}

          {/* Zakładki */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '1rem', borderBottom: '1px solid #e9ecef' }}>
            <button 
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.8rem',
                backgroundColor: activeTab === 'daily' ? '#007bff' : 'transparent',
                color: activeTab === 'daily' ? 'white' : '#007bff',
                border: activeTab === 'daily' ? '1px solid #007bff' : '1px solid transparent',
                borderRadius: '0.25rem 0.25rem 0 0',
                cursor: 'pointer',
                borderBottom: activeTab === 'daily' ? 'none' : '1px solid #e9ecef'
              }}
              onClick={() => setActiveTab('daily')}
            >
              📊 Statystyki
            </button>
            <button 
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.8rem',
                backgroundColor: activeTab === 'monthly' ? '#007bff' : 'transparent',
                color: activeTab === 'monthly' ? 'white' : '#007bff',
                border: activeTab === 'monthly' ? '1px solid #007bff' : '1px solid transparent',
                borderRadius: '0.25rem 0.25rem 0 0',
                cursor: 'pointer',
                borderBottom: activeTab === 'monthly' ? 'none' : '1px solid #e9ecef'
              }}
              onClick={() => setActiveTab('monthly')}
            >
              📅 Miesięczne
            </button>
            <button 
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.8rem',
                backgroundColor: activeTab === 'shifts' ? '#007bff' : 'transparent',
                color: activeTab === 'shifts' ? 'white' : '#007bff',
                border: activeTab === 'shifts' ? '1px solid #007bff' : '1px solid transparent',
                borderRadius: '0.25rem 0.25rem 0 0',
                cursor: 'pointer',
                borderBottom: activeTab === 'shifts' ? 'none' : '1px solid #e9ecef'
              }}
              onClick={() => setActiveTab('shifts')}
            >
              📋 Zmiany
            </button>
            <button 
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.8rem',
                backgroundColor: activeTab === 'margin' ? '#007bff' : 'transparent',
                color: activeTab === 'margin' ? 'white' : '#007bff',
                border: activeTab === 'margin' ? '1px solid #007bff' : '1px solid transparent',
                borderRadius: '0.25rem 0.25rem 0 0',
                cursor: 'pointer',
                borderBottom: activeTab === 'margin' ? 'none' : '1px solid #e9ecef'
              }}
              onClick={() => setActiveTab('margin')}
            >
              ⚠️ Marże
            </button>
            <button 
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.8rem',
                backgroundColor: activeTab === 'rotation' ? '#007bff' : 'transparent',
                color: activeTab === 'rotation' ? 'white' : '#007bff',
                border: activeTab === 'rotation' ? '1px solid #007bff' : '1px solid transparent',
                borderRadius: '0.25rem 0.25rem 0 0',
                cursor: 'pointer',
                borderBottom: activeTab === 'rotation' ? 'none' : '1px solid #e9ecef'
              }}
              onClick={() => setActiveTab('rotation')}
            >
              🔄 Rotacja
            </button>
            <button 
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.8rem',
                backgroundColor: activeTab === 'bestsellers' ? '#007bff' : 'transparent',
                color: activeTab === 'bestsellers' ? 'white' : '#007bff',
                border: activeTab === 'bestsellers' ? '1px solid #007bff' : '1px solid transparent',
                borderRadius: '0.25rem 0.25rem 0 0',
                cursor: 'pointer',
                borderBottom: activeTab === 'bestsellers' ? 'none' : '1px solid #e9ecef'
              }}
              onClick={() => setActiveTab('bestsellers')}
            >
              🏆 Bestsellery
            </button>
            <button 
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.8rem',
                backgroundColor: activeTab === 'forecast' ? '#007bff' : 'transparent',
                color: activeTab === 'forecast' ? 'white' : '#007bff',
                border: activeTab === 'forecast' ? '1px solid #007bff' : '1px solid transparent',
                borderRadius: '0.25rem 0.25rem 0 0',
                cursor: 'pointer',
                borderBottom: activeTab === 'forecast' ? 'none' : '1px solid #e9ecef'
              }}
              onClick={() => setActiveTab('forecast')}
            >
              📈 Prognoza
            </button>
          </div>

          {/* Filtry */}
          <div style={{ border: '1px solid #e9ecef', borderRadius: '0.375rem', backgroundColor: 'white', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '500', color: '#6c757d', marginBottom: '0.25rem', display: 'block' }}>Data od:</label>
                  <input
                    type="date"
                    style={{ 
                      width: '100%', 
                      padding: '0.5rem', 
                      fontSize: '0.8rem', 
                      border: '1px solid #e9ecef', 
                      borderRadius: '0.25rem'
                    }}
                    value={dateFilter.startDate}
                    onChange={(e) => setDateFilter({...dateFilter, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '500', color: '#6c757d', marginBottom: '0.25rem', display: 'block' }}>Data do:</label>
                  <input
                    type="date"
                    style={{ 
                      width: '100%', 
                      padding: '0.5rem', 
                      fontSize: '0.8rem', 
                      border: '1px solid #e9ecef', 
                      borderRadius: '0.25rem'
                    }}
                    value={dateFilter.endDate}
                    onChange={(e) => setDateFilter({...dateFilter, endDate: e.target.value})}
                  />
                </div>
                
                {/* Dodatkowe filtry dla raportów produktowych */}
                {(['rotation', 'bestsellers', 'forecast'].includes(activeTab)) && (
                  <>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: '500', color: '#6c757d', marginBottom: '0.25rem', display: 'block' }}>Okres (dni):</label>
                      <input
                        type="number"
                        style={{ 
                          width: '100%', 
                          padding: '0.5rem', 
                          fontSize: '0.8rem', 
                          border: '1px solid #e9ecef', 
                          borderRadius: '0.25rem'
                        }}
                        value={reportParams.days}
                        onChange={(e) => setReportParams({...reportParams, days: parseInt(e.target.value) || 30})}
                        min="1"
                        max="365"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: '500', color: '#6c757d', marginBottom: '0.25rem', display: 'block' }}>Limit:</label>
                      <select
                        style={{ 
                          width: '100%', 
                          padding: '0.5rem', 
                          fontSize: '0.8rem', 
                          border: '1px solid #e9ecef', 
                          borderRadius: '0.25rem',
                          backgroundColor: 'white'
                        }}
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
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    style={{
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.8rem',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.25rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      loadInitialData();
                      if (['rotation', 'bestsellers', 'forecast'].includes(activeTab)) {
                        loadProductReports();
                      }
                    }}
                  >
                    🔄 Odśwież
                  </button>
                  <button style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer'
                  }}>
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
