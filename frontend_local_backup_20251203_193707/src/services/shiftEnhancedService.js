/**
 * Enhanced Shift Service - Rozszerzone funkcjonalności zmian kasowych
 * Otwieranie i zamykanie zmian z dodatkowymi weryfikacjami i raportami
 */
import api from './api';

export const shiftEnhancedService = {
  /**
   * Otwórz zmianę z weryfikacją gotówki
   * @param {Object} shiftData - Dane zmiany
   * @param {string} shiftData.cashier - Login kasjera
   * @param {number} shiftData.starting_cash - Kwota początkowa w kasie
   * @param {boolean} shiftData.cash_count_verified - Czy gotówka została zweryfikowana
   * @param {boolean} shiftData.cash_discrepancy - Czy jest rozbieżność
   * @param {number} shiftData.cash_discrepancy_amount - Kwota rozbieżności
   * @param {string} shiftData.notes - Uwagi
   * @returns {Promise} Otwarta zmiana
   */
  async openShiftEnhanced(shiftData) {
    try {
      const response = await api.post('shifts/open-enhanced', shiftData);
      return response.data;
    } catch (error) {
      console.error('Błąd otwierania rozszerzonej zmiany:', error);
      throw error;
    }
  },

  /**
   * Zamknij zmianę z pełnym raportem
   * @param {Object} closeData - Dane zamknięcia
   * @param {string} closeData.cashier - Login kasjera
   * @param {number} closeData.ending_cash - Kwota końcowa w systemie
   * @param {number} closeData.ending_cash_physical - Faktyczna kwota gotówki
   * @param {number} closeData.card_terminal_system - Kwota z systemu dla kart
   * @param {number} closeData.card_terminal_actual - Rzeczywista kwota z terminala
   * @param {number} closeData.fiscal_printer_report - Raport z kasy fiskalnej
   * @param {Object} closeData.social_media - Działania w social media
   * @param {Object} closeData.daily_achievements - Osiągnięcia dnia
   * @param {string} closeData.notes - Uwagi
   * @returns {Promise} Zamknięta zmiana z raportem
   */
  async closeShiftEnhanced(closeData) {
    try {
      const response = await api.post('shifts/close-enhanced', closeData);
      return response.data;
    } catch (error) {
      console.error('Błąd zamykania rozszerzonej zmiany:', error);
      throw error;
    }
  },

  /**
   * Pobierz raporty zamknięć dnia dla administratora
   * @param {Object} filters - Filtry
   * @param {string} filters.date_from - Data od
   * @param {string} filters.date_to - Data do
   * @param {string} filters.cashier - Kasjer (opcjonalny)
   * @returns {Promise} Lista raportów
   */
  async getDailyClosureReports(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.cashier) params.append('cashier', filters.cashier);

      const response = await api.get(`admin/daily-closure-reports?${params}`);
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania raportów zamknięć:', error);
      throw error;
    }
  },

  /**
   * Pobierz szczegóły raportu zamknięcia dnia
   * @param {number} reportId - ID raportu
   * @returns {Promise} Szczegóły raportu
   */
  async getDailyClosureReportDetails(reportId) {
    try {
      const response = await api.get(`admin/daily-closure-reports/${reportId}`);
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania szczegółów raportu:', error);
      throw error;
    }
  }
};

export default shiftEnhancedService;
