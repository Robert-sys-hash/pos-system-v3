import api from './api';

export const categoryService = {
  /**
   * Pobierz wszystkie kategorie
   * @returns {Promise} Lista kategorii
   */
  async getCategories() {
    try {
      console.log('🏷️ CategoryService: Fetching categories from categories (no slash)');
      console.log('🏷️ CategoryService: Full URL will be:', api.defaults.baseURL + '/categories');
      console.log('🏷️ CategoryService: Stack trace:', new Error().stack);
      const response = await api.get('categories'); // Bez początkowego slasha
      console.log('🏷️ CategoryService: Response received:', response.data);
      const categories = response.data.data.categories || [];
      console.log('🏷️ CategoryService: Extracted categories:', categories.length, categories);
      return categories;
    } catch (error) {
      console.error('❌ CategoryService: Błąd pobierania kategorii:', error);
      throw error;
    }
  },

  /**
   * Pobierz kategorie w formie płaskiej listy do selectów
   * @returns {Promise} Płaska lista kategorii z wcięciami
   */
  async getCategoriesFlat() {
    try {
      const response = await api.get('categories/flat'); // Bez początkowego slasha
      return response.data.data.categories || [];
    } catch (error) {
      console.error('Błąd pobierania płaskich kategorii:', error);
      throw error;
    }
  },

  /**
   * Utwórz nową kategorię
   * @param {Object} categoryData - Dane kategorii {name, description}
   * @returns {Promise} Utworzona kategoria
   */
  async createCategory(categoryData) {
    try {
      const response = await api.post('categories', categoryData); // Bez początkowego slasha
      return response.data.data.category;
    } catch (error) {
      console.error('Błąd tworzenia kategorii:', error);
      throw error;
    }
  },

  /**
   * Aktualizuj kategorię
   * @param {number} categoryId - ID kategorii
   * @param {Object} categoryData - Dane kategorii
   * @returns {Promise} Zaktualizowana kategoria
   */
  async updateCategory(categoryId, categoryData) {
    try {
      const response = await api.put(`categories/${categoryId}`, categoryData);
      return response.data.data.category;
    } catch (error) {
      console.error('Błąd aktualizacji kategorii:', error);
      throw error;
    }
  },

  /**
   * Usuń kategorię
   * @param {number} categoryId - ID kategorii
   * @returns {Promise}
   */
  async deleteCategory(categoryId) {
    try {
      const response = await api.delete(`categories/${categoryId}`);
      return response.data;
    } catch (error) {
      console.error('Błąd usuwania kategorii:', error);
      throw error;
    }
  },

  /**
   * Przypisz kategorię do wybranych produktów
   * @param {Array} productIds - Lista ID produktów
   * @param {string} categoryName - Nazwa kategorii
   * @returns {Promise} Wynik operacji
   */
  async assignCategoryToProducts(productIds, categoryName) {
    try {
      const response = await api.post('categories/assign', {
        product_ids: productIds,
        category_name: categoryName
      });
      return response.data;
    } catch (error) {
      console.error('Błąd przypisywania kategorii:', error);
      throw error;
    }
  }
};

export default categoryService;
