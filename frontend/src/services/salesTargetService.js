import api from './api';

export const salesTargetService = {
  /**
   * Pobierz cele sprzedaży z panelu admina
   * @returns {Promise} Lista celów sprzedaży
   */
  async getSalesTargets() {
    try {
      const response = await api.get('/admin/sales-targets');
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania celów sprzedaży:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Ustaw cel sprzedaży dla lokalizacji
   * @param {Object} targetData - Dane celu sprzedaży
   * @returns {Promise} Wynik operacji
   */
  async setSalesTarget(targetData) {
    try {
      const response = await api.post('/admin/sales-targets', targetData);
      return response.data;
    } catch (error) {
      console.error('Błąd zapisywania celu sprzedaży:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Usuń cel sprzedaży
   * @param {number} targetId - ID celu do usunięcia
   * @returns {Promise} Wynik operacji
   */
  async deleteSalesTarget(targetId) {
    try {
      const response = await api.delete(`/admin/sales-targets/${targetId}`);
      return response.data;
    } catch (error) {
      console.error('Błąd usuwania celu sprzedaży:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Pobierz cel sprzedaży dla POS (bieżąca lokalizacja)
   * @param {number} locationId - ID lokalizacji
   * @returns {Promise} Cel sprzedaży z postępem
   */
  async getSalesTargetForLocation(locationId) {
    try {
      const response = await api.get(`/pos/sales-target?location_id=${locationId}`);
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania celu sprzedaży dla POS:', error);
      return {
        success: false,
        data: {
          target_amount: 0,
          current_revenue: 0,
          remaining_amount: 0,
          progress_percentage: 0,
          has_target: false
        }
      };
    }
  },

  /**
   * Pobierz statystyki dla wszystkich celów sprzedaży (używane w adminie)
   * @returns {Promise} Cele z postępem i statystykami
   */
  async getSalesTargetsWithStats() {
    try {
      const targetsResponse = await this.getSalesTargets();
      if (!targetsResponse.success) {
        return targetsResponse;
      }

      const targets = targetsResponse.data.targets;
      const targetsWithStats = [];

      // Dla każdego celu pobierz statystyki
      for (const target of targets) {
        const statsResponse = await this.getSalesTargetForLocation(target.location_id);
        
        targetsWithStats.push({
          ...target,
          current_revenue: statsResponse.success ? statsResponse.data.current_revenue : 0,
          progress_percentage: statsResponse.success ? statsResponse.data.progress_percentage : 0,
          remaining_amount: statsResponse.success ? statsResponse.data.remaining_amount : target.target_amount
        });
      }

      return {
        success: true,
        data: {
          ...targetsResponse.data,
          targets: targetsWithStats
        }
      };
    } catch (error) {
      console.error('Błąd pobierania celów ze statystykami:', error);
      throw error;
    }
  }
};
