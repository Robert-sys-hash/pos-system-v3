/**
 * Service for managing customer orders
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

class OrderService {
  /**
   * Get list of orders with filtering
   */
  async getOrders(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.status) params.append('status', filters.status);
      if (filters.customer_id) params.append('customer_id', filters.customer_id);
      if (filters.location_id) params.append('location_id', filters.location_id);
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      
      const response = await fetch(`${API_BASE_URL}/api/orders?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data,
        message: data.message
      };
    } catch (error) {
      console.error('Error fetching orders:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get specific order details
   */
  async getOrder(orderId) {
    try {
      console.log(`🔍 Fetching order details for ID: ${orderId}`);
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`📦 Order data received:`, data);
      console.log(`📋 Order pozycje:`, data.data?.pozycje);
      return {
        success: true,
        data: data.data,
        message: data.message
      };
    } catch (error) {
      console.error('Error fetching order:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create new order
   */
  async createOrder(orderData) {
    try {
      console.log('🔗 Creating order:', orderData);
      
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data,
        message: data.message
      };
    } catch (error) {
      console.error('Error creating order:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update order
   */
  async updateOrder(orderId, updateData) {
    try {
      console.log('🔗 Updating order:', orderId, updateData);
      
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data,
        message: data.message
      };
    } catch (error) {
      console.error('Error updating order:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete order
   */
  async deleteOrder(orderId) {
    try {
      console.log('🔗 Deleting order:', orderId);
      
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data,
        message: data.message
      };
    } catch (error) {
      console.error('Error deleting order:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate receipt for order
   */
  async generateReceipt(orderId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/receipt`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data,
        message: data.message
      };
    } catch (error) {
      console.error('Error generating receipt:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get orders statistics
   */
  async getOrdersStats(locationId = null) {
    try {
      const params = new URLSearchParams();
      if (locationId) params.append('location_id', locationId);
      
      const response = await fetch(`${API_BASE_URL}/api/orders/stats?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data,
        message: data.message
      };
    } catch (error) {
      console.error('Error fetching orders stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search products for adding to order
   */
  async searchProducts(query, limit = 20) {
    try {
      const params = new URLSearchParams();
      params.append('query', query);
      params.append('limit', limit);
      
      const response = await fetch(`${API_BASE_URL}/api/products/search?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data?.products || [],
        message: data.message
      };
    } catch (error) {
      console.error('Error searching products:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }
}

export const orderService = new OrderService();
export default orderService;
