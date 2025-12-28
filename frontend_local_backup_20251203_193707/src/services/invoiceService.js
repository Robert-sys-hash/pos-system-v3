const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://panelv3.pl';

export const invoiceService = {
  async getInvoices(params = {}) {
    try {
      const queryParams = new URLSearchParams({
        limit: params.limit || 50,
        offset: params.offset || 0
      });
      
      // Dodaj location_id jeśli jest dostępne
      if (params.location_id) {
        queryParams.append('location_id', params.location_id);
      }
      
      const response = await fetch(`${API_BASE_URL}/purchase-invoices?${queryParams}`);
      if (!response.ok) {
        throw new Error('Błąd podczas pobierania faktur');
      }
      return await response.json();
    } catch (error) {
      console.error('Błąd pobierania faktur:', error);
      throw error;
    }
  },

  async searchInvoices(searchParams = {}) {
    try {
      const queryParams = new URLSearchParams({
        query: searchParams.query || '',
        date_from: searchParams.date_from || '',
        date_to: searchParams.date_to || '',
        supplier: searchParams.supplier || '',
        limit: searchParams.limit || 20
      });
      
      const response = await fetch(`${API_BASE_URL}/purchase-invoices/search?${queryParams}`);
      if (!response.ok) {
        throw new Error('Błąd podczas wyszukiwania faktur');
      }
      return await response.json();
    } catch (error) {
      console.error('Błąd wyszukiwania faktur:', error);
      throw error;
    }
  },

  async getInvoiceDetails(invoiceId) {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-invoices/${invoiceId}`);
      if (!response.ok) {
        throw new Error('Błąd podczas pobierania szczegółów faktury');
      }
      return await response.json();
    } catch (error) {
      console.error('Błąd pobierania szczegółów faktury:', error);
      throw error;
    }
  },

  async createInvoice(invoiceData) {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Błąd podczas tworzenia faktury');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Błąd tworzenia faktury:', error);
      throw error;
    }
  },

  async deleteInvoice(invoiceId) {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-invoices/${invoiceId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Błąd podczas usuwania faktury');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Błąd usuwania faktury:', error);
      throw error;
    }
  },

  async getInvoiceStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-invoices/menu`);
      if (!response.ok) {
        throw new Error('Błąd podczas pobierania statystyk faktur');
      }
      return await response.json();
    } catch (error) {
      console.error('Błąd pobierania statystyk faktur:', error);
      throw error;
    }
  },

  async getSuppliers() {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-invoices/suppliers`);
      if (!response.ok) {
        throw new Error('Błąd podczas pobierania dostawców');
      }
      return await response.json();
    } catch (error) {
      console.error('Błąd pobierania dostawców:', error);
      throw error;
    }
  },

  async getRecentInvoices(limit = 10) {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-invoices/recent?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Błąd podczas pobierania ostatnich faktur');
      }
      return await response.json();
    } catch (error) {
      console.error('Błąd pobierania ostatnich faktur:', error);
      throw error;
    }
  }
};
