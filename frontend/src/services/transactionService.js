import api from './api';

export const transactionService = {
  /**
   * Utwórz nową transakcję (koszyk) używając nowego API POS
   * @param {Object} transactionData - Dane transakcji
   * @returns {Promise} Utworzona transakcja
   */
  async createTransaction(transactionData) {
    try {
      // 1. Utwórz nowy koszyk
      const cartResponse = await api.post('/pos/cart/new', {
        kasjer_id: transactionData.cashier || 'admin',
        location_id: transactionData.location_id
      });
      
      if (!cartResponse.data.success) {
        throw new Error(cartResponse.data.message || 'Błąd tworzenia koszyka');
      }
      
      const transactionId = cartResponse.data.message.transakcja_id;
      
      // 2. Dodaj produkty do koszyka
      for (const item of transactionData.items) {
        const itemResponse = await api.post(`/pos/cart/${transactionId}/items`, {
          product_id: item.product_id,
          ilosc: item.quantity
        });
        
        if (!itemResponse.data.success) {
          throw new Error(`Błąd dodawania produktu: ${itemResponse.data.message}`);
        }
      }
      
      // 3. Dodaj klienta jeśli podany - używamy finalizacji z customer_id
      // Klient zostanie dodany w kroku finalizacji
      
      // 4. Finalizuj transakcję jeśli status to 'zakonczony'
      if (transactionData.status === 'zakonczony') {
        const finalizePayload = {
          payment_method: transactionData.payment_method || 'gotowka',
          customer_id: transactionData.customer_id
        };
        
        // Dodaj split_payments jeśli istnieją
        if (transactionData.split_payments && transactionData.split_payments.length > 0) {
          finalizePayload.split_payments = transactionData.split_payments;
        }
        
        // Dodaj coupon_code jeśli istnieje
        if (transactionData.coupon_code) {
          finalizePayload.coupon_code = transactionData.coupon_code;
        }
        
        const finalizeResponse = await api.post(`/pos/cart/${transactionId}/finalize`, finalizePayload);
        
        if (!finalizeResponse.data.success) {
          throw new Error(`Błąd finalizacji: ${finalizeResponse.data.message}`);
        }
      }
      
      return {
        success: true,
        data: {
          transaction_id: transactionId,
          status: transactionData.status || 'w_trakcie'
        }
      };
      
    } catch (error) {
      console.error('Błąd tworzenia transakcji:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Pobierz szczegóły transakcji/koszyka używając nowego API POS
   * @param {number} transactionId - ID transakcji
   * @returns {Promise} Dane transakcji
   */
  async getTransaction(transactionId) {
    try {
      const response = await api.get(`/pos/cart/${transactionId}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Błąd pobierania transakcji');
      }
      
      // Mapuj dane z API na strukturę oczekiwaną przez frontend
      const transactionData = response.data.message;
      
      return {
        success: true,
        data: {
          ...transactionData.transakcja,
          receipt_number: transactionData.transakcja.numer_paragonu,
          transaction_date: transactionData.transakcja.data_transakcji,
          transaction_time: transactionData.transakcja.czas_transakcji,
          cashier: transactionData.transakcja.kasjer_login,
          items: transactionData.pozycje || [],
          discounts: transactionData.rabaty || []
        }
      };
    } catch (error) {
      console.error('Błąd pobierania transakcji:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Dodaj lub usuń produkt z koszyka używając nowego API POS
   * @param {number} transactionId - ID transakcji
   * @param {Object} updateData - Dane do aktualizacji {action: 'add'|'remove', product_id, quantity, position_id}
   * @returns {Promise} Zaktualizowana transakcja
   */
  async updateTransaction(transactionId, updateData) {
    try {
      if (updateData.action === 'add') {
        // Dodaj nowy produkt do koszyka
        const response = await api.post(`/pos/cart/${transactionId}/items`, {
          product_id: updateData.product_id,
          ilosc: updateData.quantity || 1
        });
        
        if (!response.data.success) {
          throw new Error(response.data.message || 'Błąd dodawania produktu');
        }
        
        return {
          success: true,
          data: response.data
        };
        
      } else if (updateData.action === 'remove') {
        // Usuń pozycję z koszyka
        const response = await api.delete(`/pos/cart/${transactionId}/items/${updateData.position_id}`);
        
        if (!response.data.success) {
          throw new Error(response.data.message || 'Błąd usuwania pozycji');
        }
        
        return {
          success: true,
          data: response.data
        };
        
      } else if (updateData.action === 'update') {
        // Aktualizuj ilość pozycji
        const response = await api.put(`/pos/cart/${transactionId}/items/${updateData.position_id}`, {
          ilosc: updateData.quantity
        });
        
        if (!response.data.success) {
          throw new Error(response.data.message || 'Błąd aktualizacji pozycji');
        }
        
        return {
          success: true,
          data: response.data
        };
      }
      
      throw new Error('Nieznana akcja: ' + updateData.action);
      
    } catch (error) {
      console.error('Błąd aktualizacji transakcji:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Finalizuj transakcję (płatność) używając nowego API POS z automatycznym odejmowaniem stanów
   * @param {number} transactionId - ID transakcji
   * @param {Object} paymentData - Dane płatności {payment_method, customer_id}
   * @returns {Promise} Zakończona transakcja
   */
  async completeTransaction(transactionId, paymentData) {
    try {
      const requestBody = {
        payment_method: paymentData.payment_method || 'gotowka',
        customer_id: paymentData.customer_id || null,
        kwota_otrzymana: paymentData.kwota_otrzymana || paymentData.amount_paid,
        amount_change: paymentData.amount_change || 0,
        notatka: paymentData.note || ''
      };
      
      // Dodaj split_payments jeśli istnieją (płatność dzielona)
      if (paymentData.split_payments && paymentData.split_payments.length > 0) {
        requestBody.split_payments = paymentData.split_payments;
        requestBody.payment_method = 'dzielona'; // Nadpisz metodę na "dzielona"
      }
      
      // Dodaj coupon_code jeśli istnieje
      if (paymentData.coupon_code) {
        requestBody.coupon_code = paymentData.coupon_code;
      }
      
      const response = await api.post(`/pos/cart/${transactionId}/finalize`, requestBody);
      
      return {
        success: response.data.success !== false,
        data: response.data,
        message: response.data.message,
        error: response.data.error
      };
    } catch (error) {
      console.error('Błąd finalizacji transakcji:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  /**
   * Pobierz niezakończone transakcje (koszyki) używając nowego API POS
   * @param {string} cashier - Kasjer (opcjonalnie)
   * @param {number} limit - Limit wyników
   * @returns {Promise} Lista roboczych transakcji
   */
  async getDrafts(cashier = null, limit = 20) {
    try {
      const params = { limit };
      if (cashier) params.kasjer_id = cashier;
      
      const response = await api.get('/pos/carts', { params });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Błąd pobierania koszyków');
      }
      
      return {
        success: true,
        data: response.data.carts || []
      };
    } catch (error) {
      console.error('Błąd pobierania roboczych transakcji:', error);
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  },

  /**
   * Pobierz statystyki dzienne
   * @param {number} locationId - ID lokalizacji (opcjonalne)
   * @returns {Promise} Statystyki dnia
   */
  async getDailyStats(locationId = null) {
    try {
      const url = locationId ? `/pos/stats?location_id=${locationId}` : '/pos/stats';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania statystyk dziennych:', error);
      return {
        success: false,
        data: {
          transactions_count: 0,
          total_revenue: 0,
          average_transaction: 0,
          today_average_transaction: 0,
          month_average_transaction: 0
        }
      };
    }
  },

  /**
   * Pobierz cel sprzedaży dla lokalizacji
   * @param {number} locationId - ID lokalizacji
   * @returns {Promise} Cel sprzedaży z postępem
   */
  async getSalesTarget(locationId) {
    try {
      const response = await api.get(`/pos/sales-target?location_id=${locationId}`);
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania celu sprzedaży:', error);
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
   * Pobierz statystyki miesięczne
   * @param {number|string} locationId - ID lokalizacji (opcjonalne)
   * @returns {Promise} Statystyki miesięczne
   */
  async getMonthlyStats(locationId = null) {
    try {
      const url = locationId ? `/pos/monthly-stats?location_id=${locationId}` : '/pos/monthly-stats';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania statystyk miesięcznych:', error);
      return {
        success: false,
        data: []
      };
    }
  },

  /**
   * Pobierz listę transakcji/paragonów używając nowego API POS
   * @param {Object} filters - Filtry (limit, status, date_from, date_to, cashier)
   * @returns {Promise} Lista transakcji
   */
  async getTransactions(filters = {}) {
    try {
      const params = {
        limit: filters.limit || 20,
        status: filters.status || 'completed',
        ...filters
      };
      
      // Używamy nowego endpointu POS dla listy transakcji
      const response = await api.get('/pos/transactions', { params });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Błąd pobierania transakcji');
      }
      
      // Mapuj pola z API na oczekiwane nazwy w frontend
      const rawTransactions = response.data.data?.transactions || response.data.transactions || [];
      const mappedTransactions = rawTransactions.map(transaction => ({
        ...transaction,
        receipt_number: transaction.numer_paragonu,
        transaction_date: transaction.data_transakcji || transaction.created_at,
        transaction_time: transaction.czas_transakcji || (transaction.created_at?.split('T')[1]?.split('.')[0]) || '',
        cashier: transaction.kasjer_id,
        items_count: transaction.items_count || 0,
        fiscal_status: transaction.fiskalizacja === 1 ? 'F' : 
                      transaction.fiskalizacja === 0 ? 'N' : '-'
      }));
      
      return {
        success: true,
        data: {
          transactions: mappedTransactions,
          total: response.data.data?.total || response.data.total || 0,
          limit: response.data.data?.limit || response.data.limit || 20
        }
      };
    } catch (error) {
      console.error('Błąd pobierania transakcji:', error);
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  },

  /**
   * Usuń transakcję/koszyk używając nowego API POS (tylko szkice i w toku)
   * @param {number} transactionId - ID transakcji
   * @returns {Promise} Wynik operacji
   */
  async deleteTransaction(transactionId) {
    try {
      const response = await api.delete(`/pos/cart/${transactionId}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Błąd usuwania koszyka');
      }
      
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      console.error('Błąd usuwania transakcji:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Zmień status transakcji/koszyka używając nowego API POS
   * @param {number} transactionId - ID transakcji
   * @param {string} status - Nowy status (draft|w_trakcie)
   * @returns {Promise} Wynik operacji
   */
  async updateTransactionStatus(transactionId, status) {
    try {
      const response = await api.put(`/pos/cart/${transactionId}/status`, {
        status
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Błąd zmiany statusu');
      }
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Błąd zmiany statusu transakcji:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};
