/**
 * Serwis zarządzania szablonami faktur
 */

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'https://panelv3.pl';

export const invoiceTemplatesService = {
  /**
   * Pobierz listę dostępnych szablonów
   */
  async getTemplates() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/templates`);
      if (!response.ok) {
        throw new Error('Błąd podczas pobierania szablonów');
      }
      return await response.json();
    } catch (error) {
      console.error('Błąd pobierania szablonów:', error);
      throw error;
    }
  },

  /**
   * Pobierz podgląd szablonu z przykładowymi danymi
   */
  async getTemplatePreview(templateName) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/template-preview/${templateName}`);
      if (!response.ok) {
        throw new Error('Błąd podczas pobierania podglądu szablonu');
      }
      return response.blob();
    } catch (error) {
      console.error('Błąd podglądu szablonu:', error);
      throw error;
    }
  },

  /**
   * Pobierz PDF faktury z wybranym szablonem
   */
  async getInvoicePdfWithTemplate(invoiceId, templateName) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/invoice/${invoiceId}/pdf/${templateName}`);
      if (!response.ok) {
        throw new Error('Błąd podczas generowania PDF faktury');
      }
      return response.blob();
    } catch (error) {
      console.error('Błąd generowania PDF faktury:', error);
      throw error;
    }
  },

  /**
   * Pobierz standardowy PDF faktury (bez szablonu)
   */
  async getInvoicePdf(invoiceId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sales-invoices/${invoiceId}/pdf`);
      if (!response.ok) {
        throw new Error('Błąd podczas pobierania PDF faktury');
      }
      return response.blob();
    } catch (error) {
      console.error('Błąd pobierania PDF faktury:', error);
      throw error;
    }
  },

  /**
   * Pobierz URL do podglądu szablonu
   */
  getTemplatePreviewUrl(templateName) {
    return `${API_BASE_URL}/api/template-preview/${templateName}`;
  },

  /**
   * Pobierz URL do PDF faktury z szablonem
   */
  getInvoicePdfUrl(invoiceId, templateName) {
    return `${API_BASE_URL}/api/invoice/${invoiceId}/pdf/${templateName}`;
  }
};
