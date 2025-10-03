import api from './api';

export const customerService = {
  /**
   * Pobierz wszystkich klientów
   * @returns {Promise} Lista klientów
   */
  async getCustomers() {
    try {
      const response = await api.get('/api/customers');
      console.log('✅ Klienci pobrani:', response.data);
      // Backend zwraca: { success: true, data: [...], message: "..." }
      return response.data.data || response.data;
    } catch (error) {
      console.error('❌ Błąd pobierania klientów:', error);
      throw error;
    }
  },

  /**
   * Dodaj nowego klienta
   * @param {Object} customerData - Dane klienta
   * @returns {Promise} Utworzony klient
   */
  async createCustomer(customerData) {
    try {
      const response = await api.post('/api/customers', customerData);
      console.log('✅ Klient utworzony:', response.data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('❌ Błąd tworzenia klienta:', error);
      throw error;
    }
  },

  /**
   * Aktualizuj klienta
   * @param {number} customerId - ID klienta
   * @param {Object} customerData - Dane klienta
   * @returns {Promise} Zaktualizowany klient
   */
  async updateCustomer(customerId, customerData) {
    try {
      const response = await api.put(`/api/customers/${customerId}`, customerData);
      console.log('✅ Klient zaktualizowany:', response.data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('❌ Błąd aktualizacji klienta:', error);
      throw error;
    }
  },

  /**
   * Usuń klienta
   * @param {number} customerId - ID klienta
   * @returns {Promise} Wynik operacji
   */
  async deleteCustomer(customerId) {
    try {
      const response = await api.delete(`/api/customers/${customerId}`);
      console.log('✅ Klient usunięty:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Błąd usuwania klienta:', error);
      throw error;
    }
  },

  /**
   * Wyszukaj klientów
   * @param {string} query - Zapytanie wyszukiwania
   * @param {number} limit - Limit wyników (default: 10)
   * @returns {Promise} Wyniki wyszukiwania
   */
  async searchCustomers(query, limit = 10) {
    try {
      const response = await api.get('/api/customers/search', {
        params: { query, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Błąd wyszukiwania klientów:', error);
      throw error;
    }
  },

  /**
   * Pobierz szczegóły klienta
   * @param {number} customerId - ID klienta
   * @returns {Promise} Dane klienta
   */
  async getCustomer(customerId) {
    try {
      const response = await api.get(`/api/customers/${customerId}`);
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania klienta:', error);
      throw error;
    }
  },

  /**
   * Pobierz statystyki klientów
   * @returns {Promise} Statystyki
   */
  async getCustomersStats() {
    try {
      const response = await api.get('/api/customers/stats');
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania statystyk klientów:', error);
      throw error;
    }
  }
};

// Aliasy dla kompatybilności
customerService.addCustomer = customerService.createCustomer;
