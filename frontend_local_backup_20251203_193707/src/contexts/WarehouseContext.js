import React, { createContext, useContext, useState, useEffect } from 'react';

const WarehouseContext = createContext();

export const useWarehouse = () => {
  const context = useContext(WarehouseContext);
  if (!context) {
    throw new Error('useWarehouse must be used within a WarehouseProvider');
  }
  return context;
};

export const WarehouseProvider = ({ children }) => {
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [availableWarehouses, setAvailableWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const response = await fetch('https://panelv3.pl/api/warehouses', {
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
          if (!selectedWarehouse && data.data.length > 0) {
            setSelectedWarehouse(data.data[0]);
          }
        }
      }
    } catch (error) {
      console.error('Błąd pobierania magazynów:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeWarehouse = (warehouse) => {
    setSelectedWarehouse(warehouse);
    // Zapisz w localStorage dla trwałości
    localStorage.setItem('selectedWarehouse', JSON.stringify(warehouse));
  };

  // Wczytaj z localStorage przy starcie
  useEffect(() => {
    const saved = localStorage.getItem('selectedWarehouse');
    if (saved) {
      try {
        const warehouse = JSON.parse(saved);
        setSelectedWarehouse(warehouse);
      } catch (error) {
        console.error('Błąd parsowania zapisanego magazynu:', error);
      }
    }
  }, []);

  const value = {
    selectedWarehouse,
    setSelectedWarehouse,
    warehouseId: selectedWarehouse?.id || null,
    availableWarehouses,
    loading,
    changeWarehouse,
    refreshWarehouses: fetchWarehouses
  };

  return (
    <WarehouseContext.Provider value={value}>
      {children}
    </WarehouseContext.Provider>
  );
};

export default WarehouseContext;
