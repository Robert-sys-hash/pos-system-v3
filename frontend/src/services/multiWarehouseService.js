/**
 * Serwis do zarządzania wielomagazynową strukturą
 * Obsługa magazynów, przypisań pracowników i transferów
 */

import api from './api';

export const multiWarehouseService = {
  /**
   * Pobiera wszystkie magazyny
   */
  async getWarehouses() {
    try {
      const response = await api.get('/api/warehouses');
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
   * Tworzy nowy magazyn
   */
  async createWarehouse(warehouseData) {
    try {
      const response = await api.post('/api/warehouses', warehouseData);
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
   * Aktualizuje magazyn
   */
  async updateWarehouse(warehouseId, warehouseData) {
    try {
      const response = await api.put(`/api/warehouses/${warehouseId}`, warehouseData);
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
   * Usuwa magazyn (soft delete)
   */
  async deleteWarehouse(warehouseId) {
    try {
      const response = await api.delete(`/api/warehouses/${warehouseId}`);
      return {
        success: true,
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
   * Pobiera przypisania pracowników do magazynów
   */
  async getEmployeeAssignments(warehouseId = null) {
    try {
      const url = warehouseId 
        ? `/api/warehouses/${warehouseId}/employees`
        : '/api/warehouses/employees';
      
      const response = await api.get(url);
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
   * Przypisuje pracownika do magazynu
   */
  async assignEmployee(warehouseId, userId, role = 'pracownik', permissions = '') {
    try {
      const response = await api.post(`/api/warehouses/${warehouseId}/employees`, {
        user_id: userId,
        rola: role,
        uprawnienia: permissions
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
   * Usuwa przypisanie pracownika do magazynu
   */
  async removeEmployeeAssignment(assignmentId) {
    try {
      const response = await api.delete(`/api/warehouses/employees/${assignmentId}`);
      return {
        success: true,
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
   * Pobiera stany magazynowe dla konkretnego magazynu
   */
  async getWarehouseInventory(warehouseId, params = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = ''
      } = params;

      const response = await api.get(`/api/warehouses/${warehouseId}/inventory`, {
        params: { page, limit, search }
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
   * Aktualizuje stan magazynowy dla konkretnego magazynu
   */
  async updateWarehouseStock(warehouseId, productId, stockData) {
    try {
      const response = await api.put(`/api/warehouses/${warehouseId}/inventory/${productId}`, stockData);
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
   * Pobiera przesunięcia międzymagazynowe
   */
  async getTransfers(params = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status = '',
        warehouse_id = ''
      } = params;

      const response = await api.get('/api/warehouses/transfers', {
        params: { page, limit, status, warehouse_id }
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
   * Tworzy nowe przesunięcie międzymagazynowe
   */
  async createTransfer(transferData) {
    try {
      const response = await api.post('/api/warehouses/transfers', transferData);
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
   * Aktualizuje status przesunięcia
   */
  async updateTransferStatus(transferId, action, items = []) {
    try {
      const response = await api.put(`/api/warehouses/transfers/${transferId}/${action}`, {
        items
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
   * Pobiera szczegóły przesunięcia
   */
  async getTransferDetails(transferId) {
    try {
      const response = await api.get(`/api/warehouses/transfers/${transferId}`);
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
   * Pobiera użytkowników dostępnych do przypisania
   */
  async getAvailableUsers() {
    try {
      // Endpoint dla użytkowników z modułu admin
      const response = await api.get('/api/admin/users');
      return {
        success: true,
        data: response.data.data?.users || response.data.data || response.data,
        message: response.data.message || 'Pobrano użytkowników'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }
};

export default multiWarehouseService;
