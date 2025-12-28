import api from './api';

export const productReportsService = {
  /**
   * Pobierz najbardziej rotujące produkty
   * @param {Object} params - Parametry: limit, days, location_id
   * @returns {Promise} Lista produktów
   */
  async getHighestRotationProducts(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.days) queryParams.append('days', params.days);
      if (params.location_id) queryParams.append('location_id', params.location_id);
      
      const response = await api.get(`reports/products/rotation/highest?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania najbardziej rotujących produktów:', error);
      throw new Error(error.response?.data?.message || 'Błąd pobierania raportów rotacji');
    }
  },

  /**
   * Pobierz najmniej rotujące produkty
   * @param {Object} params - Parametry: limit, days, location_id
   * @returns {Promise} Lista produktów
   */
  async getLowestRotationProducts(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.days) queryParams.append('days', params.days);
      if (params.location_id) queryParams.append('location_id', params.location_id);
      
      const response = await api.get(`reports/products/rotation/lowest?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania najmniej rotujących produktów:', error);
      throw new Error(error.response?.data?.message || 'Błąd pobierania raportów rotacji');
    }
  },

  /**
   * Pobierz bestsellery (top produkty)
   * @param {Object} params - Parametry: limit, days, metric, location_id
   * @returns {Promise} Lista bestsellerów
   */
  async getBestsellingProducts(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.days) queryParams.append('days', params.days);
      if (params.metric) queryParams.append('metric', params.metric);
      if (params.location_id) queryParams.append('location_id', params.location_id);
      
      const response = await api.get(`reports/products/bestsellers?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania bestsellerów:', error);
      throw new Error(error.response?.data?.message || 'Błąd pobierania bestsellerów');
    }
  },

  /**
   * Pobierz prognozę sprzedaży
   * @param {Object} params - Parametry: product_id, location_id, forecast_days, analysis_days
   * @returns {Promise} Prognoza sprzedaży
   */
  async getSalesForecast(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.product_id) queryParams.append('product_id', params.product_id);
      if (params.location_id) queryParams.append('location_id', params.location_id);
      if (params.forecast_days) queryParams.append('forecast_days', params.forecast_days);
      if (params.analysis_days) queryParams.append('analysis_days', params.analysis_days);
      
      const response = await api.get(`reports/products/forecast?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania prognozy sprzedaży:', error);
      throw new Error(error.response?.data?.message || 'Błąd pobierania prognozy sprzedaży');
    }
  },

  /**
   * Pobierz podsumowanie raportów produktowych
   * @param {Object} params - Parametry: days, location_id
   * @returns {Promise} Podsumowanie
   */
  async getProductsSummary(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.days) queryParams.append('days', params.days);
      if (params.location_id) queryParams.append('location_id', params.location_id);
      
      const response = await api.get(`reports/products/summary?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania podsumowania produktów:', error);
      throw new Error(error.response?.data?.message || 'Błąd pobierania podsumowania');
    }
  }
};
