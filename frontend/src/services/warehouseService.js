/**
 * Serwis do zarządzania magazynem
 * Pełna funkcjonalność CRUD dla stanów magazynowych
 */

import api from './api';

export const warehouseService = {
  /**
   * Pobiera wszystkie stany magazynowe z paginacją i filtrami
   */
  async getInventory(params = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        category = '',
        available_only = false,
        warehouse_id = null,
        location_id = null
      } = params;

      const queryParams = {
        page,
        limit,
        search,
        category,
        available_only
      };

      // Dodaj warehouse_id lub location_id tylko jeśli jest podane
      if (warehouse_id) {
        queryParams.warehouse_id = warehouse_id;
      } else if (location_id) {
        queryParams.location_id = location_id;
      }
      
      const response = await api.get('/products/inventory', {
        params: queryParams
      });

      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  /**
   * Aktualizuje dane produktu
   */
  async updateProduct(productId, productData) {
    try {
      console.log('🔗 Sending PUT request to:', `/products/${productId}`);
      console.log('🔗 Request data:', productData);
      
      const response = await api.put(`/products/${productId}`, productData);
      
      console.log('🔗 API Response status:', response.status);
      console.log('🔗 API Response data:', response.data);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('🔗 API Error:', error);
      console.error('🔗 API Error response:', error.response?.data);
      console.error('🔗 API Error status:', error.response?.status);
      
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || error.message
      };
    }
  },

  /**
   * Aktualizuje stan magazynowy pojedynczego produktu
   */
  async updateProductStock(productId, stockData) {
    try {
      const response = await api.put(`/products/${productId}/inventory`, stockData);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  /**
   * Pobiera historię ruchów magazynowych dla produktu
   */
  async getProductHistory(productId, limit = 50) {
    try {
      const response = await api.get(`/products/${productId}/inventory/history`, {
        params: { limit }
      });

      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  /**
   * Masowa aktualizacja stanów magazynowych
   */
  async batchUpdateInventory(updates) {
    try {
      const response = await api.post('/products/inventory/batch-update', {
        updates
      });

      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  /**
   * Pobiera produkty o niskich stanach
   */
  async getLowStockProducts(limit = 20) {
    try {
      const response = await api.get('/products/low-stock', {
        params: { limit }
      });

      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  /**
   * Pobiera statystyki magazynu
   */
  async getStats(warehouseId = null) {
    try {
      const params = {};
      if (warehouseId) {
        params.warehouse_id = warehouseId;
      }
      
      const response = await api.get('/products/stats', { params });

      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  /**
   * Pobiera statystyki magazynu - stara nazwa
   */
  async getWarehouseStats() {
    try {
      const response = await api.get('/products/stats');

      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  /**
   * Ustawia nowy stan magazynowy
   */
  async setStock(productId, quantity, reason = 'Korekta manualna') {
    return this.updateProductStock(productId, {
      operation: 'set',
      stock_quantity: quantity,
      reason
    });
  },

  /**
   * Dodaje do stanu magazynowego
   */
  async addStock(productId, quantity, reason = 'Przyjęcie towaru') {
    return this.updateProductStock(productId, {
      operation: 'add',
      stock_quantity: quantity,
      reason
    });
  },

  /**
   * Odejmuje ze stanu magazynowego
   */
  async subtractStock(productId, quantity, reason = 'Korekta') {
    return this.updateProductStock(productId, {
      operation: 'subtract',
      stock_quantity: quantity,
      reason
    });
  },

  /**
   * Sprawdza czy produkt ma wystarczający stan
   */
  async checkStockAvailability(productId, requiredQuantity) {
    try {
      const response = await api.get(`/products/${productId}`);
      
      if (response.data.success) {
        const product = response.data.data;
        const currentStock = product.stock_quantity || 0;
        
        return {
          success: true,
          available: currentStock >= requiredQuantity,
          currentStock,
          requiredQuantity,
          shortfall: Math.max(0, requiredQuantity - currentStock)
        };
      }
      
      return { success: false, error: 'Nie można pobrać danych produktu' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  /**
   * Operacja sprzedaży - automatyczne odejmowanie stanu
   */
  async processSale(items) {
    try {
      const updates = items.map(item => ({
        product_id: item.product_id || item.id,
        operation: 'subtract',
        stock_quantity: item.quantity,
        reason: `Sprzedaż - ${item.quantity} szt.`
      }));

      return this.batchUpdateInventory(updates);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Pobiera listę dostępnych stawek VAT
   */
  async getVatRates() {
    try {
      const response = await api.get('admin/vat-rates');
      
      if (response.data && response.data.success) {
        // API zwraca strukturę { success: true, data: { rates: [...] } }
        const rates = response.data.data?.rates || response.data.rates || [];
        return {
          success: true,
          data: rates
        };
      } else {
        return {
          success: false,
          error: response.data?.error || 'Błąd pobierania stawek VAT'
        };
      }
    } catch (error) {
      console.error('GetVatRates error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Błąd połączenia z serwerem'
      };
    }
  },

  /**
   * Pobiera faktury zakupu dostępne do generowania PZ
   */
  async getPurchaseInvoices() {
    try {
      const response = await api.get('warehouse/purchase-invoices');
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  /**
   * Generuje PZ (przyjęcie zewnętrzne) na podstawie faktury zakupu
   */
  async generateExternalReceipt(invoiceId, options = {}) {
    try {
      const response = await api.post(`warehouse/external-receipt/${invoiceId}`, {
        location_id: options.location_id,
        warehouse_id: options.warehouse_id
      });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  /**
   * Tworzy przyjęcie wewnętrzne (PW)
   */
  async createInternalReceipt(receiptData) {
    try {
      const response = await api.post('warehouse/internal-receipt', receiptData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  /**
   * Pobiera listę przyjęć wewnętrznych (PW)
   */
  async getInternalReceipts(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.location_id) params.append('location_id', filters.location_id);
      
      const response = await api.get(`warehouse/internal-receipt/list?${params}`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  /**
   * Pobiera szczegóły przyjęcia wewnętrznego (PW)
   */
  async getInternalReceiptDetails(receiptId) {
    try {
      const response = await api.get(`warehouse/internal-receipt/${receiptId}`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  /**
   * Pobiera listę przyjęć zewnętrznych (PZ)
   */
  async getExternalReceipts(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.location_id) params.append('location_id', filters.location_id);
      
      const response = await api.get(`warehouse/external-receipt/list?${params}`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  /**
   * Pobiera szczegóły dokumentu PZ
   */
  async getExternalReceiptDetails(receiptId) {
    try {
      const response = await api.get(`warehouse/external-receipt/${receiptId}`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  /**
   * Pobiera PDF dokumentu PZ
   */
  async downloadExternalReceiptPDF(receiptId) {
    try {
      const response = await api.get(`warehouse/external-receipt/${receiptId}/pdf`, {
        responseType: 'blob'
      });
      
      // Utwórz URL do pobrania
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Utwórz link do pobrania
      const link = document.createElement('a');
      link.href = url;
      link.download = `PZ_${receiptId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Zwolnij URL
      window.URL.revokeObjectURL(url);
      
      return { success: true, message: 'PDF pobrany pomyślnie' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Błąd pobierania PDF'
      };
    }
  },

  /**
   * Pobiera listę rozchodów wewnętrznych (RW)
   */
  async getInternalIssues(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.location_id) params.append('location_id', filters.location_id);
      
      const response = await api.get(`warehouse/internal-issue/list?${params}`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  /**
   * Tworzy rozchód wewnętrzny (RW)
   */
  async createInternalIssue(issueData) {
    try {
      const response = await api.post('warehouse/internal-issue', issueData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  /**
   * Rozpoczyna inwentaryzację
   */
  async startInventory(params = {}) {
    try {
      const response = await api.post('warehouse/inventory/start', params);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  /**
   * Pobiera aktywną inwentaryzację
   */
  async getActiveInventory() {
    try {
      const response = await api.get('warehouse/inventory/active');
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  /**
   * Kończy inwentaryzację
   */
  async finishInventory(inventoryData) {
    try {
      const response = await api.post('warehouse/inventory/finish', inventoryData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  /**
   * Lista sesji inwentaryzacji
   */
  async getInventorySessions(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      if (filters.status) params.append('status', filters.status);

      const response = await api.get(`warehouse/inventory/sessions?${params}`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },
};

export default warehouseService;
