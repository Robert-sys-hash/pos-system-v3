/**
 * Serwis API dla modułu Cenowki
 * Zarządzanie cenami produktów i kategoriami
 */

import api from './api';

export const cenowkiService = {
  // Pobierz wszystkie produkty z cenami
  getProducts: async (limit = 50) => {
    try {
      const response = await api.get(`/api/cenowki/products?limit=${limit}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd pobierania produktów');
    }
  },

  // Pobierz kategorie produktów
  getCategories: async () => {
    try {
      const response = await api.get('/cenowki/categories');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd pobierania kategorii');
    }
  },

  // Pobierz statystyki cenowe
  getStats: async () => {
    try {
      const response = await api.get('/cenowki/stats');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd pobierania statystyk');
    }
  },

  // Zaktualizuj cenę produktu
  updateProductPrice: async (productId, newPrice) => {
    try {
      const response = await api.put(`/api/cenowki/products/${productId}/price`, {
        price: newPrice
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd aktualizacji ceny');
    }
  },

  // Utwórz lub zaktualizuj cenówkę
  createOrUpdateCenowka: async (cenowkaData) => {
    try {
      const response = await api.post('/api/cenowki', cenowkaData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd zapisywania cenówki');
    }
  },

  // Pobierz cenówkę dla produktu
  getCenowkaByProduct: async (productId, locationId = null) => {
    try {
      const url = locationId 
        ? `/api/cenowki/product/${productId}?location_id=${locationId}`
        : `/api/cenowki/product/${productId}`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd pobierania cenówki');
    }
  }
};

export default cenowkiService;
