import React, { useState, useEffect } from 'react';
import { productHistoryService } from '../services/productHistoryService';
import { useLocation } from '../contexts/LocationContext';
import { useWarehouse } from '../contexts/WarehouseContext';

const ProductHistoryModal = ({ productId, productName, isOpen, onClose }) => {
  const { selectedLocation, locationId } = useLocation();
  const { selectedWarehouse, warehouseId } = useWarehouse();
  
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    limit: 50
  });

  useEffect(() => {
    if (isOpen && productId) {
      fetchHistory();
    }
  }, [isOpen, productId, locationId, warehouseId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError('');
      
      const filterParams = {
        ...filters
        // TYMCZASOWO: usuń filtry lokalizacji aby zobaczyć WSZYSTKIE transakcje
        // ...(locationId && { location_id: locationId }),
        // ...(warehouseId && { warehouse_id: warehouseId })
      };
      
      console.log('🔍 ProductHistoryModal - filterParams (bez lokalizacji):', filterParams);
      
      const response = await productHistoryService.getProductHistory(productId, filterParams);
      
      console.log('🔍 ProductHistoryModal - pełna odpowiedź API:', response);
      console.log('🔍 ProductHistoryModal - response.success:', response.success);
      console.log('🔍 ProductHistoryModal - response.data:', response.data);
      console.log('🔍 ProductHistoryModal - response.data.history:', response.data?.history);
      console.log('🔍 ProductHistoryModal - response.data.stats:', response.data?.stats);
      console.log('🔍 ProductHistoryModal - response.data.filters:', response.data?.filters);
      console.log('🔍 ProductHistoryModal - response.data.history:', response.data.history);
      console.log('🔍 ProductHistoryModal - response.data.stats:', response.data.stats);
      
      if (response.success) {
        const historyData = response.data.history || [];
        const statsData = response.data.stats || {};
        console.log('🔍 ProductHistoryModal - historia:', historyData.length, 'operacji');
        console.log('🔍 ProductHistoryModal - statystyki:', statsData);
        setHistory(historyData);
        setStats(statsData);
      } else {
        console.error('❌ ProductHistoryModal - API error:', response.message);
        setError('Nie udało się pobrać historii produktu');
      }
    } catch (err) {
      console.error('Błąd pobierania historii:', err);
      setError('Błąd podczas pobierania historii produktu');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (date, time) => {
    if (!date) return '-';
    const dateStr = new Date(date).toLocaleDateString('pl-PL');
    const timeStr = time ? time.substring(0, 5) : '';
    return `${dateStr} ${timeStr}`.trim();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN'
    }).format(amount || 0);
  };

  const getOperationIcon = (type) => {
    switch (type) {
      case 'sprzedaz': return '🛒';
      case 'ruch_magazynowy': return '📦';
      case 'zmiana_ceny': return '💰';
      default: return '📋';
    }
  };

  const getOperationName = (type) => {
    switch (type) {
      case 'sprzedaz': return 'Sprzedaż';
      case 'ruch_magazynowy': return 'Ruch magazynowy';
      case 'zmiana_ceny': return 'Zmiana ceny';
      default: return 'Operacja';
    }
  };

  const getOperationColor = (type) => {
    switch (type) {
      case 'sprzedaz': return '#28a745';
      case 'ruch_magazynowy': return '#17a2b8';
      case 'zmiana_ceny': return '#ffc107';
      default: return '#6c757d';
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        width: '95%',
        maxWidth: '1200px',
        height: '90%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8f9fa'
        }}>
          <div>
            <h3 style={{ margin: 0, color: '#2c3e50' }}>
              📊 Historia produktu: {productName}
            </h3>
            {(selectedLocation || selectedWarehouse) && (
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                📍 {selectedLocation?.nazwa || selectedWarehouse?.nazwa} 
                {locationId || warehouseId ? ` (ID: ${locationId || warehouseId})` : ''}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6c757d'
            }}
          >
            ×
          </button>
        </div>

        {/* Stats */}
        {!loading && Object.keys(stats).length > 0 && (
          <div style={{
            padding: '16px 20px',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #e9ecef'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>
                  {stats.total_sold_quantity || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Sprzedano szt.</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#28a745' }}>
                  {formatCurrency(stats.total_revenue)}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Łączny przychód</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#17a2b8' }}>
                  {formatCurrency(stats.average_sale_price)}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Średnia cena</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#6c757d' }}>
                  {stats.total_operations || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Operacje</div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
          {loading && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Ładowanie historii...
            </div>
          )}

          {error && (
            <div style={{
              padding: '20px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              border: '1px solid #f5c6cb',
              margin: '20px'
            }}>
              {error}
            </div>
          )}

          {!loading && !error && history.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Brak historii operacji dla tego produktu
            </div>
          )}

          {!loading && !error && history.length > 0 && (
            <div style={{ padding: '0' }}>
              {history.map((item, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa'
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: getOperationColor(item.operation_type) + '20',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px'
                  }}>
                    {getOperationIcon(item.operation_type)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontWeight: 'bold',
                        color: getOperationColor(item.operation_type)
                      }}>
                        {getOperationName(item.operation_type)}
                      </span>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        {formatDateTime(item.operation_date, item.operation_time)}
                      </span>
                      {item.transaction_id && (
                        <span style={{
                          fontSize: '10px',
                          backgroundColor: '#e9ecef',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          color: '#495057'
                        }}>
                          Trans: {item.transaction_id}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                      {item.operation_type === 'sprzedaz' && (
                        <>
                          Ilość: <strong>{item.quantity}</strong> × {formatCurrency(item.unit_price)} = 
                          <strong> {formatCurrency(item.total_value)}</strong>
                          {item.payment_method && ` • ${item.payment_method}`}
                        </>
                      )}
                      {item.operation_type === 'ruch_magazynowy' && (
                        <>
                          Zmiana stanu: <strong>{item.quantity > 0 ? '+' : ''}{item.quantity}</strong>
                          {item.customer_info && ` • ${item.customer_info}`}
                        </>
                      )}
                      {item.operation_type === 'zmiana_ceny' && (
                        <>
                          {item.payment_method}
                          {item.customer_info && ` • ${item.customer_info}`}
                        </>
                      )}
                    </div>

                    {(item.location_name || item.warehouse_name) && (
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                        📍 {item.location_name}
                        {item.warehouse_name && item.warehouse_name !== item.location_name && 
                          ` • 📦 ${item.warehouse_name}`
                        }
                        {item.operator_name && ` • 👤 ${item.operator_name}`}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #e9ecef',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Wyświetlono {history.length} z maksymalnie {filters.limit} operacji
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductHistoryModal;
