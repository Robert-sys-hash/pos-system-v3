import api from './api';

export const shiftService = {
  /**
   * Pobierz aktualną otwartą zmianę
   * @param {string} cashier - Login kasjera (opcjonalny)
   * @returns {Promise} Aktualna zmiana
   */
  async getCurrentShift(cashier = 'admin') {
    try {
      const response = await api.get('/api/shifts/current', {
        params: { cashier }
      });
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania aktualnej zmiany:', error);
      return {
        success: false,
        data: {
          kasjer_login: 'admin',
          data_zmiany: new Date().toISOString()
        }
      };
    }
  },

  /**
   * Otwórz nową zmianę kasową
   * @param {Object} shiftData - Dane zmiany (cashier, starting_cash, notes)
   * @returns {Promise} Otwarta zmiana
   */
  async openShift(shiftData) {
    try {
      const response = await api.post('/api/shifts/open', shiftData);
      return response.data;
    } catch (error) {
      console.error('Błąd otwierania zmiany:', error);
      throw error;
    }
  },

  /**
   * Zamknij zmianę kasową
   * @param {Object} closeData - Dane zamknięcia (cashier, ending_cash, notes)
   * @returns {Promise} Zamknięta zmiana
   */
  async closeShift(closeData) {
    try {
      const response = await api.post('/api/shifts/close', closeData);
      return response.data;
    } catch (error) {
      console.error('Błąd zamykania zmiany:', error);
      throw error;
    }
  },

  /**
   * Pobierz raport zmiany kasowej
   * @param {number} shiftId - ID zmiany
   * @returns {Promise} Raport zmiany
   */
  async getShiftReport(shiftId) {
    try {
      const response = await api.get(`/api/shifts/${shiftId}/report`);
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania raportu zmiany:', error);
      throw error;
    }
  },

  /**
   * Pobierz historię zmian kasowych
   * @param {Object} filters - Filtry (cashier, status, limit)
   * @returns {Promise} Historia zmian
   */
  async getShiftsHistory(filters = {}) {
    try {
      const response = await api.get('/api/shifts/history', {
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania historii zmian:', error);
      throw error;
    }
  }
};
