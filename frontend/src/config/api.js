/**
 * Konfiguracja API dla POS System V3
 * Automatycznie wybiera odpowiedni URL na podstawie środowiska
 */

// Sprawdź czy jesteśmy w trybie produkcyjnym
const isProduction = process.env.NODE_ENV === 'production';

// Konfiguracja URL-i API
const API_CONFIG = {
  // URL bazowy API
  BASE_URL: isProduction 
    ? '/api'  // Względny URL dla produkcji (obsługiwany przez .htaccess)
    : 'http://localhost:5002/api',  // Bezpośredni URL dla developmentu
    
  // Pełny URL (jeśli potrzebny)
  FULL_URL: isProduction
    ? `${window.location.origin}/api`
    : 'http://localhost:5002/api'
};

// Funkcja pomocnicza do budowania URL-i API
export const buildApiUrl = (endpoint) => {
  // Usuń początkowy slash jeśli istnieje
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  return `${API_CONFIG.BASE_URL}/${cleanEndpoint}`;
};

// Funkcja pomocnicza do wykonywania requestów API
export const apiRequest = async (endpoint, options = {}) => {
  const url = buildApiUrl(endpoint);
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };
  
  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  return response;
};

// Eksportuj konfigurację
export default API_CONFIG;

// Debug info (tylko w developmencie)
if (!isProduction) {
  console.log('🔧 API Configuration:', API_CONFIG);
}
