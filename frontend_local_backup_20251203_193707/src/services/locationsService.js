/**
 * Serwis API dla modułu Lokalizacje
 * Zarządzanie sklepami i magazynami
 */

import api from './api';

export const locationsService = {
  // Pobierz wszystkie lokalizacje
  getLocations: async () => {
    try {
      console.log('🔄 locationsService: Making API call to locations');
      const response = await api.get('locations');
      console.log('📊 locationsService: API response:', response);
      console.log('📊 locationsService: Response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ locationsService: Error:', error);
      throw new Error(error.response?.data?.message || 'Błąd pobierania lokalizacji');
    }
  },

  // Wyszukaj lokalizacje
  searchLocations: async (query) => {
    try {
      const response = await api.get(`locations/search?query=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd wyszukiwania lokalizacji');
    }
  },

  // Pobierz szczegóły lokalizacji
  getLocationDetails: async (locationId) => {
    try {
      const response = await api.get(`locations/${locationId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd pobierania szczegółów lokalizacji');
    }
  },

  // Dodaj nową lokalizację
  addLocation: async (locationData) => {
    try {
      const response = await api.post('locations/', locationData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd dodawania lokalizacji');
    }
  },

  // Zaktualizuj lokalizację
  updateLocation: async (locationId, locationData) => {
    try {
      const response = await api.put(`locations/${locationId}`, locationData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd aktualizacji lokalizacji');
    }
  }
};

export default locationsService;
