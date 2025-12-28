import api from './api';

// Flaga debug
const DEBUG_MARGIN = false;
const debugLog = (...args) => { if (DEBUG_MARGIN) console.log(...args); };

export const marginService = {
  /**
   * Oblicza marżę dla produktu
   * @param {Object} params - Parametry
   * @param {number} params.product_id - ID produktu
   * @param {number} params.sell_price_brutto - Cena sprzedaży brutto
   * @param {number} params.warehouse_id - ID magazynu
   * @returns {Promise<Object>} Wynik obliczenia marży
   */
  async calculateMargin(params) {
    try {
      debugLog('🔢 MarginService: Obliczanie marży:', params);
      
      const response = await api.post('/margins/calculate-pos', {
        product_id: params.product_id,
        sell_price_brutto: params.sell_price_brutto,
        warehouse_id: params.warehouse_id || 5
      });
      
      if (response.data.success) {
        debugLog('✅ MarginService: Marża obliczona:', response.data.data);
        return {
          success: true,
          ...response.data.data
        };
      } else {
        console.error('❌ MarginService: Błąd API:', response.data.error);
        return {
          success: false,
          error: response.data.error,
          margin_percent: 0,
          margin_amount: 0,
          can_calculate: false
        };
      }
    } catch (error) {
      console.error('❌ MarginService: Błąd sieci:', error);
      return {
        success: false,
        error: error.message,
        margin_percent: 0,
        margin_amount: 0,
        can_calculate: false
      };
    }
  }
};

export default marginService;
