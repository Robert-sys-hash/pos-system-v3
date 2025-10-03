/**
 * Service dla zarządzania producentami
 */

import api from './api';

class ManufacturerService {
  /**
   * Pobierz wszystkich producentów
   */
  async getManufacturers() {
    try {
      const response = await api.get('/api/manufacturers');
      return response.data.data.manufacturers;
    } catch (error) {
      console.error('Błąd pobierania producentów:', error);
      throw error;
    }
  }

  /**
   * Pobierz tylko aktywnych producentów
   */
  async getActiveManufacturers() {
    try {
      const response = await api.get('/api/manufacturers/active');
      return response.data.data.manufacturers;
    } catch (error) {
      console.error('Błąd pobierania aktywnych producentów:', error);
      throw error;
    }
  }

  /**
   * Dodaj nowego producenta
   */
  async addManufacturer(manufacturerData) {
    console.log('🔧 ManufacturerService.addManufacturer called with:', manufacturerData);
    
    try {
      const response = await api.post('/api/manufacturers', manufacturerData);
      console.log('✅ Success response:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ Błąd dodawania producenta:', error);
      throw error;
    }
  }

  /**
   * Aktualizuj producenta
   */
  async updateManufacturer(manufacturerId, manufacturerData) {
    try {
      const response = await api.put(`/api/manufacturers/${manufacturerId}`, manufacturerData);
      return response.data.data;
    } catch (error) {
      console.error('Błąd aktualizacji producenta:', error);
      throw error;
    }
  }

  /**
   * Usuń producenta
   */
  async deleteManufacturer(manufacturerId) {
    try {
      await api.delete(`/api/manufacturers/${manufacturerId}`);
      return true;
    } catch (error) {
      console.error('Błąd usuwania producenta:', error);
      throw error;
    }
  }

  /**
   * Masowa aktualizacja producenta dla produktów
   */
  async bulkUpdateProductManufacturer(productIds, manufacturerId) {
    try {
      const response = await api.post('/api/products/bulk-update-manufacturer', {
        product_ids: productIds,
        manufacturer_id: manufacturerId
      });
      return response.data.data;
    } catch (error) {
      console.error('Błąd masowej aktualizacji producenta:', error);
      throw error;
    }
  }

  /**
   * Aktualizuj producenta dla pojedynczego produktu
   */
  async updateProductManufacturer(productId, manufacturerId) {
    try {
      const response = await api.put(`/api/products/${productId}/manufacturer`, {
        manufacturer_id: manufacturerId
      });
      return response.data.data;
    } catch (error) {
      console.error('Błąd aktualizacji producenta produktu:', error);
      throw error;
    }
  }

  /**
   * Aktualizuj uproszczoną nazwę produktu
   */
  async updateProductSimplifiedName(productId, simplifiedName) {
    try {
      const response = await api.put(`/api/products/${productId}/simplified-name`, {
        simplified_name: simplifiedName
      });
      return response.data.data;
    } catch (error) {
      console.error('Błąd aktualizacji uproszczonej nazwy:', error);
      throw error;
    }
  }
}

const manufacturerService = new ManufacturerService();
export default manufacturerService;
