/**
 * Serwis API dla modułu Location Pricing
 * Zarządzanie cenami produktów per lokalizacja
 */

import api from './api';

export const locationPricingService = {
  // Pobierz wszystkie ceny dla lokalizacji
  getLocationPrices: async (locationId) => {
    try {
      const response = await api.get(`/api/locations/${locationId}/prices`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Błąd pobierania cen lokalizacji');
    }
  },

  // Pobierz ceny produktu we wszystkich lokalizacjach
  getProductPrices: async (productId) => {
    try {
      const response = await api.get(`/api/products/${productId}/prices`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Błąd pobierania cen produktu');
    }
  },

  // Ustaw cenę produktu dla lokalizacji
  setLocationPrice: async (locationId, productId, priceData) => {
    try {
      const response = await api.put(`/api/locations/${locationId}/products/${productId}/price`, priceData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Błąd ustawiania ceny');
    }
  },

  // Pobierz aktualną cenę produktu dla lokalizacji
  getCurrentPrice: async (locationId, productId) => {
    try {
      const response = await api.get(`/api/locations/${locationId}/products/${productId}/price`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Błąd pobierania aktualnej ceny');
    }
  },

  // Usuń cenę specjalną dla lokalizacji (powrót do ceny domyślnej)
  removeLocationPrice: async (locationId, productId) => {
    try {
      const response = await api.delete(`/api/locations/${locationId}/products/${productId}/price`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Błąd usuwania ceny specjalnej');
    }
  },

  // Skopiuj ceny z jednej lokalizacji do drugiej
  copyPricesToLocation: async (sourceLocationId, targetLocationId, overwrite = false) => {
    try {
      const response = await api.post(`/api/locations/${sourceLocationId}/copy-prices-to/${targetLocationId}`, {
        overwrite
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Błąd kopiowania cen');
    }
  },

  // Pobierz historię cen produktu dla lokalizacji
  getPriceHistory: async (locationId, productId) => {
    try {
      const response = await api.get(`/api/locations/${locationId}/products/${productId}/price/history`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Błąd pobierania historii cen');
    }
  },

  // Sprawdzenie zdrowia modułu
  healthCheck: async () => {
    try {
      const response = await api.get('/api/health');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Błąd sprawdzania stanu systemu');
    }
  }
};

export default locationPricingService;
