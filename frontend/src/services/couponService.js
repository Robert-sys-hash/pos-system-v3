import api from './api';

export const couponService = {
  async testConnection() {
    try {
      const response = await api.get('/health');
      console.log('✅ Połączenie z backend OK:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Brak połączenia z backend:', error.message);
      throw error;
    }
  },

  async getCoupons(locationId = null) {
    try {
      const params = locationId ? { location_id: locationId } : {};
      const response = await api.get('/coupons', { params });
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania kuponów:', error);
      throw error;
    }
  },

  async addCoupon(couponData) {
    try {
      console.log('🎟️ Serwis dodawania kuponu - dane wejściowe:', couponData);
      
      // Użyj przekazanego location_id, a jeśli nie ma, domyślna lokalizacja
      const dataWithLocation = {
        ...couponData,
        location_id: couponData.location_id || 1  // Domyślna lokalizacja tylko jeśli nie ma
      };
      
      console.log('🎟️ Serwis dodawania kuponu - dane wysyłane:', dataWithLocation);
      const response = await api.post('/coupons/create', dataWithLocation);
      return response.data;
    } catch (error) {
      console.error('Błąd dodawania kuponu:', error);
      throw error;
    }
  },

  async useCoupon(couponId, receiptData = {}) {
    try {
      console.log('🔗 Wykorzystanie kuponu:', couponId, receiptData);
      const response = await api.post(`/coupons/${couponId}/use`, receiptData);
      console.log('✅ Kupon wykorzystany:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Błąd wykorzystywania kuponu:', error);
      console.error('❌ Szczegóły błędu:', error.response?.data);
      throw error;
    }
  },

  async deleteCoupon(couponId) {
    try {
      const response = await api.delete(`/coupons/${couponId}`);
      return response.data;
    } catch (error) {
      console.error('Błąd usuwania kuponu:', error);
      throw error;
    }
  },

  async validateCoupon(code) {
    try {
      const response = await api.get(`/coupons/validate/${code}`);
      return response.data;
    } catch (error) {
      console.error('Błąd walidacji kuponu:', error);
      throw error;
    }
  },

  async getCouponHistory(couponId) {
    try {
      const response = await api.get(`/coupons/${couponId}/history`);
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania historii kuponu:', error);
      throw error;
    }
  },

  async updateCouponReceipt(couponId, receiptNumber) {
    try {
      const response = await api.post(`/coupons/${couponId}/receipt`, {
        receipt_number: receiptNumber
      });
      return response.data;
    } catch (error) {
      console.error('Błąd aktualizacji numeru paragonu:', error);
      throw error;
    }
  },

  async updateReceiptNumber(couponId, receiptNumber) {
    return this.updateCouponReceipt(couponId, receiptNumber);
  },

  // Dokumenty zakupu kuponów
  async getPurchaseDocument(documentNumber) {
    try {
      const response = await api.get(`/coupons/documents/${documentNumber}`);
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania dokumentu zakupu:', error);
      throw error;
    }
  },

  async getCouponDocument(couponId) {
    try {
      const response = await api.get(`/coupons/${couponId}/document`);
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania dokumentu dla kuponu:', error);
      throw error;
    }
  },

  async getPurchaseDocuments(locationId = null) {
    try {
      const params = locationId ? { location_id: locationId } : {};
      const response = await api.get('/coupons/documents', { params });
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania dokumentów zakupu:', error);
      throw error;
    }
  }
};
