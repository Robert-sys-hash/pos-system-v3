import React, { useState, useEffect, useCallback } from 'react';
import { orderService } from '../services/orderService';
import { customerService } from '../services/customerService';
import { useLocation } from '../contexts/LocationContext';
import { useWarehouse } from '../contexts/WarehouseContext';
import OrdersList from '../components/orders/OrdersList';
import OrderForm from '../components/orders/OrderForm';
import OrderDetails from '../components/orders/OrderDetails';
import OrderStats from '../components/orders/OrderStats';

const OrdersPage = () => {
  const { selectedLocation, locationId } = useLocation();
  const { selectedWarehouse, warehouseId } = useWarehouse();
  
  // Użyj location_id dla adminów, warehouse_id dla pracowników
  const currentLocationId = locationId || warehouseId;

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Aktywne zakładki i modalne
  const [activeTab, setActiveTab] = useState('list'); // list, stats, new
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  
  // Filtry
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    customer_id: '',
    location_id: currentLocationId || '',
    page: 1
  });
  
  // Statystyki
  const [stats, setStats] = useState({});

  // Aktualizuj filtry gdy zmieni się lokalizacja
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      location_id: currentLocationId || ''
    }));
  }, [currentLocationId]);

  // Załaduj dane przy starcie
  useEffect(() => {
    loadOrders();
    loadStats();
  }, [filters]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await orderService.getOrders({
        ...filters,
        limit: pagination.limit
      });
      
      if (result.success) {
        setOrders(result.data.orders || []);
        setPagination(result.data.pagination || pagination);
      } else {
        setError(result.error || 'Błąd podczas ładowania zamówień');
      }
    } catch (error) {
      setError('Wystąpił błąd podczas ładowania zamówień');
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  const loadStats = useCallback(async () => {
    try {
      const result = await orderService.getOrdersStats(filters.location_id);
      if (result.success) {
        setStats(result.data || {});
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [filters.location_id]);

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1 // Reset do pierwszej strony przy zmianie filtrów
    }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleCreateOrder = () => {
    setEditingOrder(null);
    setShowOrderForm(true);
  };

  const handleEditOrder = (order) => {
    setEditingOrder(order);
    setShowOrderForm(true);
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć to zamówienie?')) {
      return;
    }

    try {
      setLoading(true);
      const result = await orderService.deleteOrder(orderId);
      
      if (result.success) {
        showSuccess('Zamówienie zostało usunięte');
        loadOrders();
        loadStats();
      } else {
        setError(result.error || 'Nie udało się usunąć zamówienia');
      }
    } catch (error) {
      setError('Wystąpił błąd podczas usuwania zamówienia');
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleOrderSaved = () => {
    setShowOrderForm(false);
    loadOrders();
    loadStats();
    showSuccess(editingOrder ? 'Zamówienie zostało zaktualizowane' : 'Zamówienie zostało utworzone');
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      setLoading(true);
      const result = await orderService.updateOrder(orderId, { status: newStatus });
      
      if (result.success) {
        showSuccess('Status zamówienia został zaktualizowany');
        loadOrders();
        loadStats();
      } else {
        setError(result.error || 'Nie udało się zaktualizować statusu');
      }
    } catch (error) {
      setError('Wystąpił błąd podczas aktualizacji statusu');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  // Mapowanie statusów na kolory
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ffc107';
      case 'processing': return '#17a2b8';
      case 'completed': return '#28a745';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  // Mapowanie statusów na etykiety
  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Oczekujące';
      case 'processing': return 'W realizacji';
      case 'completed': return 'Zrealizowane';
      case 'cancelled': return 'Anulowane';
      default: return status;
    }
  };

  return (
    <div style={{ width: '100%', padding: '1rem' }}>
      {/* Nagłówek */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        padding: '1rem',
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        border: '1px solid #e9ecef',
        boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
      }}>
        <div>
          <h2 style={{ margin: 0, color: '#495057', fontSize: '1.5rem', fontWeight: '600' }}>
            <i className="fas fa-shopping-cart text-primary me-2"></i>
            Zamówienia Klientów
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', color: '#6c757d', fontSize: '0.9rem' }}>
            Zarządzaj zamówieniami od klientów
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-success"
            onClick={handleCreateOrder}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <i className="fas fa-plus"></i>
            Nowe zamówienie
          </button>
          <button
            className="btn btn-outline-primary"
            onClick={() => {
              loadOrders();
              loadStats();
            }}
            disabled={loading}
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
            Odśwież
          </button>
        </div>
      </div>

      {/* Komunikaty */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="fas fa-check-circle me-2"></i>
          {successMessage}
          <button type="button" className="btn-close" onClick={() => setSuccessMessage('')}></button>
        </div>
      )}

      {/* Zakładki główne */}
      <div className="mb-3">
        <ul className="nav nav-tabs">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'list' ? 'active' : ''}`}
              onClick={() => setActiveTab('list')}
              style={{ border: 'none', background: 'none' }}
            >
              <i className="fas fa-list me-2"></i>
              Lista zamówień
              {stats.total_orders > 0 && (
                <span className="badge bg-primary ms-2">{stats.total_orders}</span>
              )}
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
              style={{ border: 'none', background: 'none' }}
            >
              <i className="fas fa-chart-bar me-2"></i>
              Statystyki
            </button>
          </li>
        </ul>
      </div>

      {/* Zawartość zakładek */}
      {activeTab === 'list' && (
        <OrdersList
          orders={orders}
          loading={loading}
          pagination={pagination}
          filters={filters}
          onFilterChange={handleFilterChange}
          onPageChange={handlePageChange}
          onViewOrder={handleViewOrder}
          onEditOrder={handleEditOrder}
          onDeleteOrder={handleDeleteOrder}
          onStatusChange={handleUpdateOrderStatus}
          getStatusColor={getStatusColor}
          getStatusLabel={getStatusLabel}
        />
      )}

      {activeTab === 'stats' && (
        <OrderStats
          stats={stats}
          loading={loading}
          getStatusColor={getStatusColor}
          getStatusLabel={getStatusLabel}
        />
      )}

      {/* Modal formularza zamówienia */}
      {showOrderForm && (
        <OrderForm
          editingOrder={editingOrder}
          onSave={handleOrderSaved}
          onCancel={() => setShowOrderForm(false)}
        />
      )}

      {/* Modal szczegółów zamówienia */}
      {showOrderDetails && selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          onClose={() => {
            setShowOrderDetails(false);
            setSelectedOrder(null);
          }}
          onEdit={() => {
            handleEditOrder(selectedOrder);
            setShowOrderDetails(false);
          }}
          onStatusChange={handleUpdateOrderStatus}
          getStatusColor={getStatusColor}
          getStatusLabel={getStatusLabel}
        />
      )}
    </div>
  );
};

export default OrdersPage;
