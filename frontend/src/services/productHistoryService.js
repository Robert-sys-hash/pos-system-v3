import api from './api';

export const productHistoryService = {
  async getProductHistory(productId, filters = {}) {
    try {
      console.log('📊 Pobieranie historii produktu:', productId, filters);
      
      const params = {
        limit: filters.limit || 100,
        ...(filters.location_id && { location_id: filters.location_id }),
        ...(filters.warehouse_id && { warehouse_id: filters.warehouse_id })
      };
      
      const response = await api.get(`/products/${productId}/history`, { params });
      console.log('✅ Historia produktu pobrana:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Błąd pobierania historii produktu:', error);
      throw error;
    }
  }
};
