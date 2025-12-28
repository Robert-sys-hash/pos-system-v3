/**
 * Serwis API dla modułu Warehouse Pricing
 * Zarządzanie cenami produktów per magazyn
 */

import api from './api';

export const warehousePricingService = {
  // Pobierz wszystkie ceny dla magazynu
  getWarehousePrices: async (warehouseId) => {
    try {
      const response = await api.get(`/warehouses/${warehouseId}/prices`);
      return response.data; // Zwróć pełną strukturę z success i data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Błąd pobierania cen magazynu');
    }
  },

  // Pobierz ceny produktu we wszystkich magazynach
  getProductPrices: async (productId) => {
    try {
      const response = await api.get(`/products/${productId}/prices`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Błąd pobierania cen produktu');
    }
  },

  // Ustaw cenę produktu dla magazynu
  setWarehousePrice: async (warehouseId, productId, priceData) => {
    try {
      const response = await api.put(`/warehouses/${warehouseId}/products/${productId}/price`, priceData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Błąd ustawiania ceny');
    }
  },

  // Pobierz aktualną cenę produktu dla magazynu
  getCurrentPrice: async (warehouseId, productId) => {
    try {
      const response = await api.get(`/warehouses/${warehouseId}/products/${productId}/price`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Błąd pobierania aktualnej ceny');
    }
  },

  // Usuń cenę specjalną dla magazynu (powrót do ceny domyślnej)
  removeWarehousePrice: async (warehouseId, productId, dataOd) => {
    try {
      const response = await api.delete(`/warehouses/${warehouseId}/products/${productId}/price`, {
        data: { data_od: dataOd }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Błąd usuwania ceny specjalnej');
    }
  },

  // Pobierz historię cen produktu dla magazynu
  getPriceHistory: async (warehouseId, productId) => {
    try {
      const response = await api.get(`/warehouses/${warehouseId}/products/${productId}/price-history`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Błąd pobierania historii cen');
    }
  },

  // Kopiuj ceny między magazynami
  copyPricesBetweenWarehouses: async (sourceWarehouseId, targetWarehouseId) => {
    try {
      const response = await api.post(`/warehouses/${sourceWarehouseId}/copy-prices-to/${targetWarehouseId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Błąd kopiowania cen między magazynami');
    }
  },

  // Sprawdź status API
  healthCheck: async () => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Błąd sprawdzania statusu API');
    }
  }
};

export default warehousePricingService;
