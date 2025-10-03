/**
 * Serwis API dla modułu Magazyny
 * Zarządzanie magazynami
 */

import api from './api';

export const warehousesService = {
  // Pobierz wszystkie magazyny
  getWarehouses: async () => {
    try {
      const response = await api.get('/api/warehouses');
      return response.data.data || response.data; // Zwróć tablicę magazynów
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd pobierania magazynów');
    }
  },

  // Pobierz magazyny dla lokalizacji
  getWarehousesByLocation: async (locationId) => {
    try {
      const response = await api.get(`/api/warehouses/location/${locationId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd pobierania magazynów dla lokalizacji');
    }
  },

  // Pobierz szczegóły magazynu
  getWarehouseDetails: async (warehouseId) => {
    try {
      const response = await api.get(`/api/warehouses/${warehouseId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd pobierania szczegółów magazynu');
    }
  },

  // Dodaj nowy magazyn
  addWarehouse: async (warehouseData) => {
    try {
      const response = await api.post('/api/warehouses', warehouseData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd dodawania magazynu');
    }
  },

  // Zaktualizuj magazyn
  updateWarehouse: async (warehouseId, warehouseData) => {
    try {
      const response = await api.put(`/api/warehouses/${warehouseId}`, warehouseData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd aktualizacji magazynu');
    }
  },

  // Usuń magazyn
  deleteWarehouse: async (warehouseId) => {
    try {
      const response = await api.delete(`/api/warehouses/${warehouseId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd usuwania magazynu');
    }
  }
};

export default warehousesService;
