/**
 * Serwis API dla modułu Kasa/Bank
 * Operacje finansowe i zarządzanie saldami
 */

import api from './api';

export const kasaBankService = {
  // Pobierz aktualne saldo
  getSaldo: async (locationId = null) => {
    try {
      console.log('🔍 Pobieranie salda...', locationId ? `dla lokalizacji ${locationId}` : 'globalnie');
      const url = locationId ? `kasa-bank/saldo?location_id=${locationId}` : 'kasa-bank/saldo';
      const response = await api.get(url);
      console.log('✅ Saldo pobrane:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Błąd pobierania salda:', error);
      throw new Error(error.response?.data?.message || 'Błąd pobierania salda');
    }
  },

  // Pobierz operacje finansowe
  getOperacje: async (limit = 50, locationId = null) => {
    try {
      console.log('🔍 Pobieranie operacji...', locationId ? `dla lokalizacji ${locationId}` : 'globalnie');
      let url = `kasa-bank/operacje?limit=${limit}`;
      if (locationId) url += `&location_id=${locationId}`;
      const response = await api.get(url);
      console.log('✅ Operacje pobrane:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Błąd pobierania operacji:', error);
      throw new Error(error.response?.data?.message || 'Błąd pobierania operacji');
    }
  },

  // Pobierz statystyki dzienne
  getDailySummary: async (date = null, locationId = null) => {
    try {
      console.log('🔍 Pobieranie podsumowania dziennego...', locationId ? `dla lokalizacji ${locationId}` : 'globalnie');
      let url = date ? `kasa-bank/summary/daily?date=${date}` : 'kasa-bank/summary/daily';
      if (locationId) {
        url += (url.includes('?') ? '&' : '?') + `location_id=${locationId}`;
      }
      const response = await api.get(url);
      console.log('✅ Podsumowanie dzienny pobrane:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Błąd pobierania podsumowania dziennego:', error);
      throw new Error(error.response?.data?.message || 'Błąd pobierania podsumowania dziennego');
    }
  },

  // Pobierz statystyki miesięczne
  getMonthlyStats: async (month = null, year = null, locationId = null) => {
    try {
      console.log('🔍 Pobieranie statystyk miesięcznych...', locationId ? `dla lokalizacji ${locationId}` : 'globalnie');
      let url = 'kasa-bank/stats/monthly';
      const params = [];
      if (month && year) {
        params.push(`month=${month}&year=${year}`);
      }
      if (locationId) {
        params.push(`location_id=${locationId}`);
      }
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      const response = await api.get(url);
      console.log('✅ Statystyki miesięczne pobrane:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Błąd pobierania statystyk miesięcznych:', error);
      throw new Error(error.response?.data?.message || 'Błąd pobierania statystyk miesięcznych');
    }
  },

  // Dodaj nową operację finansową
  addOperation: async (operationData) => {
    try {
      const response = await api.post('kasa-bank/operacje', operationData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd dodawania operacji');
    }
  },

  // Pobierz płatności pogrupowane według typu
  getPaymentsByType: async (dateFrom = null, dateTo = null, locationId = null) => {
    try {
      console.log('🔍 Pobieranie płatności według typu...', locationId ? `dla lokalizacji ${locationId}` : 'globalnie');
      let url = 'kasa-bank/payments/by-type';
      const params = [];
      if (dateFrom) params.push(`date_from=${dateFrom}`);
      if (dateTo) params.push(`date_to=${dateTo}`);
      if (locationId) params.push(`location_id=${locationId}`);
      if (params.length > 0) url += `?${params.join('&')}`;
      
      const response = await api.get(url);
      console.log('✅ Płatności według typu pobrane:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Błąd pobierania płatności według typu:', error);
      throw new Error(error.response?.data?.message || 'Błąd pobierania płatności według typu');
    }
  },

  // Pobierz dokumenty KP (Kasa Przyjmie)
  getKPDocuments: async (limit = 50, offset = 0, dateFrom = null, dateTo = null, locationId = null) => {
    try {
      console.log('🔍 Pobieranie dokumentów KP...', locationId ? `dla lokalizacji ${locationId}` : 'globalnie');
      let url = `kasa-bank/documents/kp?limit=${limit}&offset=${offset}`;
      if (dateFrom) url += `&date_from=${dateFrom}`;
      if (dateTo) url += `&date_to=${dateTo}`;
      if (locationId) url += `&location_id=${locationId}`;
      
      const response = await api.get(url);
      console.log('✅ Dokumenty KP pobrane:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Błąd pobierania dokumentów KP:', error);
      throw new Error(error.response?.data?.message || 'Błąd pobierania dokumentów KP');
    }
  },

  // Pobierz dokumenty KW (Kasa Wydaje)
  getKWDocuments: async (limit = 50, offset = 0, dateFrom = null, dateTo = null, locationId = null) => {
    try {
      console.log('🔍 Pobieranie dokumentów KW...', locationId ? `dla lokalizacji ${locationId}` : 'globalnie');
      let url = `kasa-bank/documents/kw?limit=${limit}&offset=${offset}`;
      if (dateFrom) url += `&date_from=${dateFrom}`;
      if (dateTo) url += `&date_to=${dateTo}`;
      if (locationId) url += `&location_id=${locationId}`;
      
      const response = await api.get(url);
      console.log('✅ Dokumenty KW pobrane:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Błąd pobierania dokumentów KW:', error);
      throw new Error(error.response?.data?.message || 'Błąd pobierania dokumentów KW');
    }
  },

  // Utwórz nową operację KP/KW
  createOperacja: async (operacjaData) => {
    try {
      console.log('🔍 Tworzenie operacji:', operacjaData);
      const response = await api.post('kasa-bank/operacje', operacjaData);
      console.log('✅ Operacja utworzona:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Błąd tworzenia operacji:', error);
      throw new Error(error.response?.data?.message || 'Błąd tworzenia operacji');
    }
  },

  // Aktualizuj operację
  updateOperacja: async (operacjaId, operacjaData) => {
    try {
      console.log('🔍 Aktualizowanie operacji:', operacjaId, operacjaData);
      const response = await api.put(`kasa-bank/operacje/${operacjaId}`, operacjaData);
      console.log('✅ Operacja zaktualizowana:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Błąd aktualizacji operacji:', error);
      throw new Error(error.response?.data?.message || 'Błąd aktualizacji operacji');
    }
  },

  // Pobierz kategorie operacji
  getKategorie: async () => {
    try {
      console.log('🔍 Pobieranie kategorii...');
      const response = await api.get('kasa-bank/kategorie');
      console.log('✅ Kategorie pobrane:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Błąd pobierania kategorii:', error);
      throw new Error(error.response?.data?.message || 'Błąd pobierania kategorii');
    }
  },
};

export default kasaBankService;
