import api from './api';

// Mapowanie danych z API na format frontendu
const mapProductFromAPI = (product) => {
  return {
    ...product,
    nazwa: product.name || product.nazwa,
    nazwa_uproszczona: product.nazwa_uproszczona, // Dodane mapowanie nazwy uproszczonej
    kod_produktu: product.barcode || product.kod_produktu,
    kod_kreskowy: product.barcode || product.ean || product.kod_kreskowy,
    barcode: product.barcode || product.ean || product.kod_kreskowy,
    ean: product.barcode || product.ean || null,
    cena_sprzedazy_brutto: product.price || product.cena_sprzedazy_brutto || 0,
    cena_sprzedazy_netto: product.price_net || product.cena_sprzedazy_netto || ((product.price || 0) / (1 + (product.tax_rate || 23) / 100)),
    cena_zakupu: product.purchase_price || product.cena_zakupu || product.cena_zakupu_netto || 0,
    stawka_vat: product.tax_rate || product.stawka_vat || 23,
    kategoria: product.category || product.kategoria,
    // Mapowanie stanu magazynowego
    stock_quantity: product.stock_quantity ?? product.stan_magazynowy ?? 0,
    stan_magazynowy: product.stock_quantity ?? product.stan_magazynowy ?? 0,
    // Dodane pola jednostek
    gramatura: product.gramatura,
    ilosc_jednostek: product.ilosc_jednostek,
    jednostka_wagi: product.jednostka_wagi
  };
};

// Mapowanie danych z frontendu na format API
const mapProductToAPI = (product) => {
  console.log('🔍 mapProductToAPI - wejście:', product);
  const mapped = {
    ...product,
    name: product.nazwa || product.name,
    barcode: product.kod_produktu || product.barcode
  };
  console.log('🔍 mapProductToAPI - wyjście:', mapped);
  return mapped;
};

export const productService = {
  /**
   * Pobierz wszystkie produkty
   * @param {number} limit - Limit wyników (default: 100)
   * @returns {Promise} Lista produktów
   */
  async getProducts(limit = 100) {
    try {
      const response = await api.get('/products', { 
        params: { 
          limit 
        } 
      });
      const products = response.data.data || [];
      return products.map(mapProductFromAPI);
    } catch (error) {
      console.error('Błąd pobierania produktów:', error);
      throw error;
    }
  },

  /**
   * Wyszukiwanie produktów
   * @param {Object} options - Opcje wyszukiwania
   * @param {string} options.search - Wyszukiwana fraza
   * @param {string} options.query - Wyszukiwana fraza (alternatywna nazwa)
   * @param {string} options.category - Kategoria produktu
   * @param {number} options.limit - Limit wyników (default: 20)
   * @param {number} options.locationId - ID lokalizacji dla stanów magazynowych
   * @param {number} options.warehouseId - ID magazynu dla stanów magazynowych
   * @returns {Promise} Wyniki wyszukiwania
   */
  async searchProducts(options = {}) {
    try {
      const { search, query, category = '', limit = 20, locationId = null, warehouseId = null } = options;
      const searchQuery = search || query || '';
      
      const params = { limit };
      if (searchQuery) params.query = searchQuery;
      if (category) params.category = category;
      if (locationId) params.location_id = locationId;
      if (warehouseId) params.warehouse_id = warehouseId;
      
      console.log('🔍 searchProducts - params:', params);
      
      const response = await api.get('/products/search', { params });
      const data = response.data;
      if (data.products && Array.isArray(data.products)) {
        data.products = data.products.map(mapProductFromAPI);
      }
      return data;
    } catch (error) {
      console.error('Błąd wyszukiwania produktów:', error);
      throw error;
    }
  },

  /**
   * Pobierz szczegóły produktu
   * @param {number} productId - ID produktu
  /**
   * Pobierz pojedynczy produkt
   * @param {number} productId - ID produktu
   * @param {number} locationId - ID lokalizacji dla stanu magazynowego
   * @returns {Promise} Dane produktu
   */
  async getProduct(productId, locationId = 5) {
    try {
      const response = await api.get(`/products/${productId}`, {
        params: { location_id: locationId }
      });
      return {
        success: true,
        data: mapProductFromAPI(response.data.data || response.data)
      };
    } catch (error) {
      console.error('Błąd pobierania produktu:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Pobierz kategorie produktów
   * @returns {Promise} Lista kategorii
   */
  async getCategories() {
    try {
      const response = await api.get('/products/categories');
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania kategorii:', error);
      throw error;
    }
  },

  /**
   * Pobierz statystyki produktów
   * @returns {Promise} Statystyki
   */
  async getProductsStats() {
    try {
      const response = await api.get('/products/stats');
      return response.data;
    } catch (error) {
      console.error('Błąd pobierania statystyk produktów:', error);
      throw error;
    }
  },

  /**
   * Pobierz produkty z niską marżą
   * @param {number} threshold - Próg marży (default: 15)
   * @returns {Promise} Lista produktów z niską marżą
   */
  async getLowMarginProducts(threshold = 15) {
    try {
      const response = await api.get(`/marze/products?low_margin=${threshold}`);
      return {
        success: true,
        data: response.data?.data || []
      };
    } catch (error) {
      console.error('Błąd pobierania produktów z niską marżą:', error);
      return {
        success: false,
        data: []
      };
    }
  },

  /**
   * Pobierz produkt po kodzie kreskowym
   * @param {string} barcode - Kod kreskowy
   * @returns {Promise} Dane produktu
   */
  async getProductByBarcode(barcode) {
    try {
      const response = await api.get(`/products/barcode/${barcode}`);
      return mapProductFromAPI(response.data);
    } catch (error) {
      console.error('Błąd pobierania produktu po kodzie kreskowym:', error);
      throw error;
    }
  },

  /**
   * Dodaj nowy produkt
   * @param {Object} productData - Dane produktu
   * @returns {Promise} Wynik operacji
   */
  async addProduct(productData) {
    try {
      const mappedData = mapProductToAPI(productData);
      const response = await api.post('/products', mappedData);
      return response.data;
    } catch (error) {
      console.error('Błąd dodawania produktu:', error);
      throw error;
    }
  },

  /**
   * Aktualizuj produkt
   * @param {number} productId - ID produktu
   * @param {Object} productData - Dane produktu
   * @returns {Promise} Wynik operacji
   */
  async updateProduct(productId, productData) {
    try {
      const mappedData = mapProductToAPI(productData);
      const response = await api.put(`/products/${productId}`, mappedData);
      return response.data;
    } catch (error) {
      console.error('Błąd aktualizacji produktu:', error);
      throw error;
    }
  },

  /**
   * Wyszukiwanie produktów w magazynie (dla POS)
   * @param {Object} options - Opcje wyszukiwania
   * @param {string} options.search - Wyszukiwana fraza
   * @param {string} options.query - Wyszukiwana fraza (alternatywna nazwa)
   * @param {string} options.category - Kategoria produktu
   * @param {number} options.limit - Limit wyników (default: 50)
   * @param {number} options.locationId - ID lokalizacji dla stanów magazynowych
   * @param {boolean} options.availableOnly - Tylko produkty z dodatnim stanem (default: true)
   * @returns {Promise} Wyniki wyszukiwania z magazynu
   */
  async getInventoryProducts(options = {}) {
    try {
      const { search, query, category = '', limit = 50, locationId = null, availableOnly = true } = options;
      const searchQuery = search || query || '';
      
      const params = { limit };
      if (searchQuery) params.search = searchQuery;
      if (category) params.category = category;
      if (locationId) params.location_id = locationId;
      if (availableOnly) params.available_only = 1;
      
      console.log('🔍 getInventoryProducts - params:', params);
      
      const response = await api.get('/products/inventory', { params });
      const data = response.data;
      
      // API zwraca { success: true, data: { products: [...], pagination: {...} } }
      if (data.success && data.data && data.data.products) {
        const mappedProducts = data.data.products.map(mapProductFromAPI);
        return {
          success: true,
          products: mappedProducts,
          pagination: data.data.pagination
        };
      } else {
        return {
          success: false,
          products: [],
          message: data.message || 'Brak danych'
        };
      }
    } catch (error) {
      console.error('Błąd wyszukiwania produktów w magazynie:', error);
      throw error;
    }
  },

  /**
   * Usuń produkt
   * @param {number} productId - ID produktu
   * @returns {Promise} Wynik operacji
   */
  async deleteProduct(productId) {
    try {
      const response = await api.delete(`/products/${productId}`);
      return response.data;
    } catch (error) {
      console.error('Błąd usuwania produktu:', error);
      throw error;
    }
  }
};
