import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LocationContext = createContext();

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 LocationContext: Fetching locations...');
      
      // Pobierz dane zalogowanego użytkownika
      const savedUser = localStorage.getItem('user');
      let userLogin = null;
      let userType = null;
      
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          userLogin = userData.login;
          userType = userData.user_type || userData.typ;
          console.log('👤 LocationContext: User:', userLogin, 'Type:', userType);
        } catch (e) {
          console.error('❌ Error parsing user data:', e);
        }
      }
      
      let response;
      
      // Jeśli użytkownik jest kasjerem/pracownikiem - pobierz tylko jego lokalizacje
      if (userLogin && userType && !['admin', 'manager', 'kierownik'].includes(userType)) {
        console.log('📍 LocationContext: Fetching user-specific locations for:', userLogin);
        response = await fetch(`http://localhost:8000/api/locations/user/${userLogin}`);
      } else {
        // Admin/manager - pobierz wszystkie lokalizacje
        console.log('📍 LocationContext: Fetching all locations (admin/manager)');
        response = await fetch('http://localhost:8000/api/locations/');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 LocationContext: Response data:', data);
      
      // API zwraca {success: true, data: [...]}
      const locationsArray = data.data || [];
      console.log('📍 LocationContext: Locations array:', locationsArray);
      setAvailableLocations(locationsArray);
      
      // Jeśli kasjer ma tylko jedną lokalizację - automatycznie ją wybierz
      if (locationsArray.length === 1 && userType && !['admin', 'manager', 'kierownik'].includes(userType)) {
        console.log('✅ LocationContext: Auto-selecting single location for cashier');
        setSelectedLocation(locationsArray[0]);
        localStorage.setItem('selectedLocation', JSON.stringify(locationsArray[0]));
      }
    } catch (error) {
      console.error('❌ Error fetching locations:', error);
      setError('Błąd podczas pobierania lokalizacji');
    } finally {
      setLoading(false);
    }
  }, []);

  const changeLocation = useCallback((locationId) => {
    console.log('🔄 LocationContext: changeLocation called with:', locationId);
    const location = availableLocations.find(loc => loc.id === parseInt(locationId));
    console.log('📍 LocationContext: Found location:', location);
    if (location) {
      setSelectedLocation(location);
      localStorage.setItem('selectedLocation', JSON.stringify(location));
      console.log('✅ LocationContext: Location changed to:', location.nazwa);
    } else {
      console.warn('⚠️ LocationContext: Location not found for ID:', locationId);
    }
  }, [availableLocations]);

  useEffect(() => {
    // Najpierw wczytaj z localStorage
    const saved = localStorage.getItem('selectedLocation');
    if (saved) {
      try {
        const location = JSON.parse(saved);
        setSelectedLocation(location);
      } catch (error) {
        console.error('Błąd parsowania zapisanej lokalizacji:', error);
      }
    }
    
    // Potem pobierz aktualne dane z API
    fetchLocations();
    
    // Nasłuchuj na zmiany w localStorage (np. po zalogowaniu)
    const handleStorageChange = (e) => {
      if (e.key === 'user') {
        console.log('🔄 LocationContext: User changed, refreshing locations');
        // Wyczyść poprzedni wybór lokalizacji przy zmianie użytkownika
        setSelectedLocation(null);
        localStorage.removeItem('selectedLocation');
        fetchLocations();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchLocations]);

  const value = {
    selectedLocation,
    setSelectedLocation,
    locationId: selectedLocation?.id || null,
    availableLocations,
    loading,
    error,
    changeLocation,
    refreshLocations: fetchLocations
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export default LocationContext;
