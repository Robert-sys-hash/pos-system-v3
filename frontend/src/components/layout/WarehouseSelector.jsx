import React, { useState, useEffect } from 'react';
import './WarehouseSelector.css';

const WarehouseSelector = ({ user, onWarehouseChange }) => {
  const [availableWarehouses, setAvailableWarehouses] = useState([]);
  const [currentWarehouse, setCurrentWarehouse] = useState(null);
  const [canChangeWarehouse, setCanChangeWarehouse] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchAvailableWarehouses();
    fetchCurrentWarehouse();
  }, []);

  const fetchCurrentWarehouse = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/current-warehouse', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.warehouse) {
          setCurrentWarehouse(data.data.warehouse);
        }
      }
    } catch (error) {
      console.error('Błąd pobierania aktualnego magazynu:', error);
    }
  };

  const fetchAvailableWarehouses = async () => {
    try {
      setLoading(true);
      // Pobierz wszystkie magazyny zamiast tylko dostępne dla użytkownika
      const response = await fetch('http://localhost:8000/api/warehouses', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setAvailableWarehouses(data.data);
          // Ustaw pierwszy magazyn jako domyślny jeśli nie ma aktualnego
          if (!currentWarehouse && data.data.length > 0) {
            setCurrentWarehouse(data.data[0]);
          }
        }
      }
    } catch (error) {
      console.error('Błąd pobierania magazynów:', error);
    } finally {
      setLoading(false);
    }
  };
          setAvailableWarehouses(data.data.warehouses || []);
          setCanChangeWarehouse(data.data.can_change_warehouse);
          setIsAdmin(data.data.is_admin);
        }
      }
    } catch (error) {
      console.error('Błąd pobierania dostępnych magazynów:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWarehouseChange = async (warehouseId) => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/current-warehouse', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ warehouse_id: warehouseId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCurrentWarehouse(data.data.warehouse);
          setShowDropdown(false);
          
          // Powiadom parent component o zmianie
          if (onWarehouseChange) {
            onWarehouseChange(data.data.warehouse);
          }

          // Odśwież stronę aby zaktualizować wszystkie komponenty
          window.location.reload();
        } else {
          alert(data.message || 'Błąd zmiany magazynu');
        }
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Błąd zmiany magazynu');
      }
    } catch (error) {
      console.error('Błąd zmiany magazynu:', error);
      alert('Błąd połączenia z serwerem');
    }
  };

  if (loading) {
    return (
      <div className="warehouse-selector loading">
        <span className="loading-text">Ładowanie...</span>
      </div>
    );
  }

  if (!currentWarehouse || availableWarehouses.length === 0) {
    return (
      <div className="warehouse-selector error">
        <i className="fas fa-exclamation-triangle"></i>
        <span>Brak dostępu do magazynów</span>
      </div>
    );
  }

  return (
    <div className="warehouse-selector">
      <div className="warehouse-info">
        <i className="fas fa-warehouse text-primary"></i>
        <span className="warehouse-label">Magazyn:</span>
      </div>
      
      <div className={`warehouse-dropdown ${showDropdown ? 'open' : ''}`}>
        <button
          className={`warehouse-current ${!canChangeWarehouse ? 'disabled' : ''}`}
          onClick={() => canChangeWarehouse && setShowDropdown(!showDropdown)}
          disabled={!canChangeWarehouse}
          title={!canChangeWarehouse ? 'Nie można zmienić magazynu podczas otwartej zmiany' : 'Kliknij aby zmienić magazyn'}
        >
          <div className="warehouse-details">
            <span className="warehouse-name">{currentWarehouse.nazwa}</span>
            <span className="warehouse-code">({currentWarehouse.kod_magazynu})</span>
          </div>
          {canChangeWarehouse && availableWarehouses.length > 1 && (
            <i className={`fas fa-chevron-down ${showDropdown ? 'rotated' : ''}`}></i>
          )}
          {!canChangeWarehouse && (
            <i className="fas fa-lock text-warning" title="Zablokowane podczas zmiany"></i>
          )}
        </button>

        {showDropdown && canChangeWarehouse && (
          <div className="warehouse-dropdown-menu">
            {availableWarehouses.map((warehouse) => (
              <button
                key={warehouse.id}
                className={`warehouse-option ${warehouse.is_current ? 'current' : ''}`}
                onClick={() => handleWarehouseChange(warehouse.id)}
              >
                <div className="warehouse-option-details">
                  <span className="warehouse-option-name">{warehouse.nazwa}</span>
                  <span className="warehouse-option-code">({warehouse.kod_magazynu})</span>
                  {warehouse.rola && (
                    <span className={`warehouse-role role-${warehouse.rola}`}>
                      {warehouse.rola}
                    </span>
                  )}
                </div>
                {warehouse.is_current && (
                  <i className="fas fa-check text-success"></i>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="admin-badge">
          <i className="fas fa-crown text-warning" title="Administrator - dostęp do wszystkich magazynów"></i>
        </div>
      )}
    </div>
  );
};

export default WarehouseSelector;
