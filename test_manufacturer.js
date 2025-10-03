// Test dodawania producenta
// Uruchom ten kod w konsoli przeglądarki na stronie http://localhost:3002/admin

console.log('🧪 Test dodawania producenta');

// Sprawdź czy jesteśmy na odpowiedniej stronie
if (window.location.pathname !== '/admin') {
  console.error('❌ Nie jesteś na stronie administratora!');
  console.log('🔗 Przejdź na: http://localhost:3002/admin');
} else {
  console.log('✅ Jesteś na stronie administratora');
  
  // Test API endpoint
  fetch('http://localhost:5002/api/manufacturers')
    .then(response => response.json())
    .then(data => {
      console.log('✅ API manufacturers działa:', data);
      
      // Test dodawania producenta
      const testManufacturer = {
        nazwa: 'TEST PRODUCENT JS',
        opis: 'Test z konsoli przeglądarki',
        aktywny: true
      };
      
      return fetch('http://localhost:5002/api/manufacturers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testManufacturer),
      });
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        console.log('✅ Producent dodany pomyślnie:', data);
      } else {
        console.error('❌ Błąd dodawania producenta:', data);
      }
    })
    .catch(error => {
      console.error('❌ Błąd testu:', error);
    });
}
