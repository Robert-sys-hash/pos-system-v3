/**
 * Service dla edytora customowych szablonów faktur
 * Komunikacja z backend API dla zarządzania custom template
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

class TemplateEditorService {
  
  // ===============================
  // CRUD dla customowych szablonów
  // ===============================
  
  async getCustomTemplates() {
    try {
      const response = await fetch(`${API_BASE_URL}/custom-templates`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Błąd pobierania customowych szablonów');
      }
      
      return data.data;
    } catch (error) {
      console.error('❌ Błąd pobierania customowych szablonów:', error);
      throw error;
    }
  }
  
  async saveCustomTemplate(templateData) {
    try {
      const response = await fetch(`${API_BASE_URL}/custom-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Błąd zapisywania szablonu');
      }
      
      return data.data;
    } catch (error) {
      console.error('❌ Błąd zapisywania customowego szablonu:', error);
      throw error;
    }
  }
  
  async updateCustomTemplate(templateId, templateData) {
    try {
      const response = await fetch(`${API_BASE_URL}/custom-templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Błąd aktualizacji szablonu');
      }
      
      return data;
    } catch (error) {
      console.error('❌ Błąd aktualizacji customowego szablonu:', error);
      throw error;
    }
  }
  
  async deleteCustomTemplate(templateId) {
    try {
      const response = await fetch(`${API_BASE_URL}/custom-templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Błąd usuwania szablonu');
      }
      
      return data;
    } catch (error) {
      console.error('❌ Błąd usuwania customowego szablonu:', error);
      throw error;
    }
  }
  
  // ===============================
  // Podgląd i generowanie PDF
  // ===============================
  
  async generatePreview(templateConfig) {
    try {
      const response = await fetch(`${API_BASE_URL}/custom-template-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateConfig),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Odpowiedź to PDF blob
      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('❌ Błąd generowania podglądu:', error);
      throw error;
    }
  }
  
  async generateInvoicePdfWithCustomTemplate(invoiceId, templateConfig) {
    try {
      const response = await fetch(`${API_BASE_URL}/invoice/${invoiceId}/pdf/custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateConfig),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Odpowiedź to PDF blob
      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('❌ Błąd generowania PDF faktury:', error);
      throw error;
    }
  }
  
  // ===============================
  // Utility functions
  // ===============================
  
  getDefaultTemplateConfig() {
    return {
      name: '',
      description: '',
      config: {
        elements: {
          showInvoiceNumber: true,
          showDates: true,
          showSellerBuyer: true,
          showItemsTable: true,
          showSummary: true,
          showSignatures: true
        },
        fonts: {
          main: 'Helvetica',
          size: {
            title: 20,
            section: 14,
            normal: 10,
            small: 8
          }
        },
        colors: {
          primary: '#007bff',
          border: '#dee2e6',
          headerBg: '#f8f9fa'
        },
        spacing: {
          margin: 20,
          lineHeight: 1.2
        },
        tableConfig: {
          showRowNumbers: true,
          alternateRowColors: false
        },
        customFields: []
      }
    };
  }
  
  validateTemplateConfig(config) {
    const errors = [];
    
    if (!config.name || config.name.trim() === '') {
      errors.push('Nazwa szablonu jest wymagana');
    }
    
    if (!config.config) {
      errors.push('Konfiguracja szablonu jest wymagana');
    }
    
    if (config.config && !config.config.elements) {
      errors.push('Elementy szablonu są wymagane');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  // ===============================
  // Obsługa plików PDF
  // ===============================
  
  downloadPdf(blob, filename = 'szablon.pdf') {
    try {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('❌ Błąd pobierania PDF:', error);
      throw error;
    }
  }
  
  openPdfInNewTab(blob) {
    try {
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Uwaga: URL nie jest zwalniany automatycznie
      // ale przeglądarka powinna to zrobić po zamknięciu karty
    } catch (error) {
      console.error('❌ Błąd otwierania PDF:', error);
      throw error;
    }
  }
}

export default new TemplateEditorService();
