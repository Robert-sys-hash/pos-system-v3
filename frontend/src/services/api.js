import axios from 'axios';

// Konfiguracja axios - używamy proxy z package.json
const API_BASE_URL = process.env.REACT_APP_API_URL || ''; // Pusty string oznacza użycie proxy

console.log('🔗 API Base URL:', API_BASE_URL || 'Using proxy from package.json');
console.log('🔗 Environment API URL:', process.env.REACT_APP_API_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
