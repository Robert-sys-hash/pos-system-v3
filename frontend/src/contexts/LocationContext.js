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
      const response = await fetch('https://panelv3.pl/api/locations/');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 LocationContext: Response data:', data);
      
      // API zwraca {success: true, count: 6, data: [...]}
      const locationsArray = data.data || [];
      console.log('📍 LocationContext: Locations array:', locationsArray);
      setAvailableLocations(locationsArray);
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
  }, []); // Pusty dependency array - tylko przy mount

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
