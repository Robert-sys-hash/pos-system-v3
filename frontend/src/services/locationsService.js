/**
 * Serwis API dla modułu Lokalizacje
 * Zarządzanie sklepami i magazynami
 */

import api from './api';

export const locationsService = {
  // Pobierz wszystkie lokalizacje
  getLocations: async () => {
    try {
      const response = await api.get('/api/locations/');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd pobierania lokalizacji');
    }
  },

  // Wyszukaj lokalizacje
  searchLocations: async (query) => {
    try {
      const response = await api.get(`/api/locations/search?query=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd wyszukiwania lokalizacji');
    }
  },

  // Pobierz szczegóły lokalizacji
  getLocationDetails: async (locationId) => {
    try {
      const response = await api.get(`/api/locations/${locationId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd pobierania szczegółów lokalizacji');
    }
  },

  // Dodaj nową lokalizację
  addLocation: async (locationData) => {
    try {
      const response = await api.post('/api/locations/', locationData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd dodawania lokalizacji');
    }
  },

  // Zaktualizuj lokalizację
  updateLocation: async (locationId, locationData) => {
    try {
      const response = await api.put(`/api/locations/${locationId}`, locationData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd aktualizacji lokalizacji');
    }
  }
};

export default locationsService;
