import React, { useState, useEffect } from 'react';
import { useWarehouse } from '../../contexts/WarehouseContext';
import './WarehouseSelector.css';

const WarehouseSelector = ({ onWarehouseChange }) => {
  const { selectedWarehouse, setSelectedWarehouse } = useWarehouse();
  const [availableWarehouses, setAvailableWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchAvailableWarehouses();
  }, []);

  const fetchAvailableWarehouses = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://panelv3.pl/warehouses', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setAvailableWarehouses(data.data);
          // Ustaw pierwszy magazyn jako domyślny jeśli nie ma wybranego
          if (data.data.length > 0 && !selectedWarehouse) {
            setSelectedWarehouse(data.data[0]);
            if (onWarehouseChange) {
              onWarehouseChange(data.data[0]);
            }
          }
        }
      }
    } catch (error) {
      console.error('Błąd pobierania magazynów:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWarehouseChange = (warehouse) => {
    setSelectedWarehouse(warehouse); // Używaj kontekstu
    setShowDropdown(false);
    if (onWarehouseChange) {
      onWarehouseChange(warehouse);
    }
  };

  if (loading) {
    return (
      <div className="warehouse-selector">
        <i className="fas fa-spinner fa-spin"></i>
        <span>Ładowanie magazynów...</span>
      </div>
    );
  }

  if (availableWarehouses.length === 0) {
    return (
      <div className="warehouse-selector">
        <i className="fas fa-exclamation-triangle text-warning"></i>
        <span>Brak dostępnych magazynów</span>
      </div>
    );
  }

  return (
    <div className="warehouse-selector" style={{ position: 'relative' }}>
      <button
        className="warehouse-selector-toggle"
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          border: '1px solid #dee2e6',
          borderRadius: '0.375rem',
          backgroundColor: 'white',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: '500',
          transition: 'all 0.15s ease-in-out'
        }}
        onMouseEnter={(e) => {
          e.target.style.borderColor = '#0d6efd';
          e.target.style.boxShadow = '0 0 0 0.2rem rgba(13, 110, 253, 0.25)';
        }}
        onMouseLeave={(e) => {
          e.target.style.borderColor = '#dee2e6';
          e.target.style.boxShadow = 'none';
        }}
      >
        <i className="fas fa-warehouse" style={{ color: '#6c757d' }}></i>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.75rem', color: '#6c757d' }}>Magazyn:</span>
          <span style={{ color: '#212529', fontWeight: '600' }}>
            {selectedWarehouse ? selectedWarehouse.nazwa : 'Wybierz magazyn'}
          </span>
        </div>
        <i 
          className={`fas fa-chevron-${showDropdown ? 'up' : 'down'}`} 
          style={{ 
            color: '#6c757d', 
            marginLeft: 'auto',
            transition: 'transform 0.15s ease-in-out'
          }}
        ></i>
      </button>

      {showDropdown && (
        <div 
          className="warehouse-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #dee2e6',
            borderRadius: '0.375rem',
            boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            maxHeight: '300px',
            overflowY: 'auto',
            marginTop: '0.25rem'
          }}
        >
          {availableWarehouses.map((warehouse) => (
            <button
              key={warehouse.id}
              onClick={() => handleWarehouseChange(warehouse)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: 'none',
                backgroundColor: selectedWarehouse?.id === warehouse.id ? '#f8f9fa' : 'white',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.875rem',
                transition: 'background-color 0.15s ease-in-out',
                borderBottom: '1px solid #f0f0f0'
              }}
              onMouseEnter={(e) => {
                if (selectedWarehouse?.id !== warehouse.id) {
                  e.target.style.backgroundColor = '#f8f9fa';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedWarehouse?.id !== warehouse.id) {
                  e.target.style.backgroundColor = 'white';
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '600', color: '#212529' }}>
                    {warehouse.nazwa}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                    Kod: {warehouse.kod_magazynu}
                  </div>
                </div>
                {selectedWarehouse?.id === warehouse.id && (
                  <i className="fas fa-check" style={{ color: '#28a745' }}></i>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default WarehouseSelector;
