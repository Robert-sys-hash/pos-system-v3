import axios from 'axios';

// Konfiguracja axios - API endpointy z routing przez .htaccess  
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

console.log('🔗 API Base URL:', API_BASE_URL);
console.log('🔗 Environment API URL:', process.env.REACT_APP_API_URL);
console.log('🔗 Build timestamp:', new Date().toISOString());

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: false, // Wyłączone dla development - CORS nie działa z credentials + wildcard
  headers: {
    'Content-Type': 'application/json',
  },
});

// Debug interceptor
api.interceptors.request.use(
  (config) => {
    // Oblicz poprawny finalURL tak jak to robi axios
    const finalURL = config.baseURL + (config.url.startsWith('/') ? config.url : '/' + config.url);
    console.log('🔍 DEBUG Axios Request:', {
      baseURL: config.baseURL,
      url: config.url,
      finalURL: finalURL
    });
    return config;
  }
);

// Interceptor do obsługi błędów
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      console.error('🔴 Brak połączenia z serwerem backend!');
      console.error('👉 Sprawdź czy backend działa na:', API_BASE_URL);
    }
    
    if (error.response) {
      // Serwer odpowiedział z kodem błędu
      const message = error.response.data?.message || 'Wystąpił błąd serwera';
      throw new Error(message);
    } else if (error.request) {
      // Żądanie zostało wysłane, ale nie otrzymano odpowiedzi
      throw new Error('Brak połączenia z serwerem');
    } else {
      // Błąd w konfiguracji żądania
      throw new Error('Błąd konfiguracji żądania');
    }
  }
);

export default api;
// Build Tue Dec  2 21:17:01 CET 2025
