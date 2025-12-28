import React, { useState, useEffect } from 'react';
import { locationsService } from '../services/locationsService';

const LocationsPage = () => {
  const [locations, setLocations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = locations.filter(location => 
        (location.name || location.nazwa || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (location.address || location.adres || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (location.type || location.typ || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredLocations(filtered);
    } else {
      setFilteredLocations(locations);
    }
  }, [searchQuery, locations]);

  const loadLocations = async () => {
    setLoading(true);
    try {
      console.log('🔄 LocationsPage: Loading locations...');
      const response = await locationsService.getLocations();
      console.log('📊 LocationsPage: Response:', response);
      
      if (response.success) {
        console.log('✅ LocationsPage: Success, locations count:', response.data?.length);
        setLocations(response.data || []);
        setFilteredLocations(response.data || []);
      } else {
        console.error('❌ LocationsPage: Response not successful:', response);
        setError(response.message || 'Błąd ładowania lokalizacji');
      }
    } catch (err) {
      console.error('❌ LocationsPage: Error loading locations:', err);
      setError('Błąd ładowania lokalizacji: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getLocationTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'sklep': return 'bg-primary';
      case 'magazyn': return 'bg-success';
      case 'outlet': return 'bg-warning';
      case 'biuro': return 'bg-info';
      default: return 'bg-secondary';
    }
  };

  const getLocationStatusColor = (active) => {
    return active ? 'text-success' : 'text-danger';
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Ładowanie...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col">
          <h2>
            <i className="fas fa-map-marker-alt me-2"></i>
            Lokalizacje - Zarządzanie Sklepami
          </h2>
          <p className="text-muted">System zarządzania lokalizacjami sklepów i magazynów</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {/* Wyszukiwanie */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="input-group">
            <span className="input-group-text">
              <i className="fas fa-search"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Wyszukaj lokalizację..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-6 text-end">
          <button className="btn btn-primary">
            <i className="fas fa-plus me-2"></i>
            Dodaj lokalizację
          </button>
        </div>
      </div>

      {/* Statystyki */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6>Wszystkie</h6>
                  <h4>{locations.length}</h4>
                </div>
                <i className="fas fa-building fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6>Sklepy</h6>
                  <h4>{locations.filter(l => (l.type || l.typ) === 'sklep').length}</h4>
                </div>
                <i className="fas fa-store fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6>Magazyny</h6>
                  <h4>{locations.filter(l => (l.type || l.typ) === 'magazyn').length}</h4>
                </div>
                <i className="fas fa-warehouse fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-info text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6>Aktywne</h6>
                  <h4>{locations.filter(l => l.active || l.aktywny).length}</h4>
                </div>
                <i className="fas fa-check-circle fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista lokalizacji */}
      <div className="row">
        <div className="col">
          <div className="card">
            <div className="card-header">
              <h5>
                <i className="fas fa-list me-2"></i>
                Lista Lokalizacji ({filteredLocations.length})
              </h5>
            </div>
            <div className="card-body">
              {filteredLocations.length > 0 ? (
                <div className="row">
                  {filteredLocations.map((location, index) => (
                    <div key={location.id || index} className="col-md-6 col-lg-4 mb-3">
                      <div className="card h-100 border-start border-4 border-primary">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="card-title mb-0">
                              {location.name || location.nazwa || `Lokalizacja ${index + 1}`}
                            </h6>
                            <div className="d-flex align-items-center gap-2">
                              <span className={`badge ${getLocationTypeColor(location.type || location.typ)}`}>
                                {location.type || location.typ || 'brak'}
                              </span>
                              <i className={`fas fa-circle ${getLocationStatusColor(location.active || location.aktywny)}`}></i>
                            </div>
                          </div>
                          
                          <div className="text-muted small mb-2">
                            <i className="fas fa-map-marker-alt me-1"></i>
                            {location.address || location.adres || 'Brak adresu'}
                          </div>
                          
                          {(location.phone || location.telefon) && (
                            <div className="text-muted small mb-2">
                              <i className="fas fa-phone me-1"></i>
                              {location.phone || location.telefon}
                            </div>
                          )}
                          
                          {(location.email || location.email) && (
                            <div className="text-muted small mb-2">
                              <i className="fas fa-envelope me-1"></i>
                              {location.email}
                            </div>
                          )}

                          <div className="mt-3">
                            <div className="btn-group w-100" role="group">
                              <button 
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => setSelectedLocation(location)}
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                              <button className="btn btn-outline-secondary btn-sm">
                                <i className="fas fa-edit"></i>
                              </button>
                              <button className="btn btn-outline-danger btn-sm">
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5 text-muted">
                  <i className="fas fa-map-marker-alt fa-3x mb-3"></i>
                  <h5>Brak lokalizacji</h5>
                  <p>Nie znaleziono lokalizacji spełniających kryteria wyszukiwania</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal szczegółów lokalizacji */}
      {selectedLocation && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-map-marker-alt me-2"></i>
                  {selectedLocation.name || selectedLocation.nazwa}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setSelectedLocation(null)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Informacje podstawowe</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Nazwa:</strong></td>
                          <td>{selectedLocation.name || selectedLocation.nazwa}</td>
                        </tr>
                        <tr>
                          <td><strong>Typ:</strong></td>
                          <td>
                            <span className={`badge ${getLocationTypeColor(selectedLocation.type || selectedLocation.typ)}`}>
                              {selectedLocation.type || selectedLocation.typ}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Status:</strong></td>
                          <td>
                            <span className={getLocationStatusColor(selectedLocation.active || selectedLocation.aktywny)}>
                              {(selectedLocation.active || selectedLocation.aktywny) ? 'Aktywny' : 'Nieaktywny'}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Adres:</strong></td>
                          <td>{selectedLocation.address || selectedLocation.adres}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6>Kontakt</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Telefon:</strong></td>
                          <td>{selectedLocation.phone || selectedLocation.telefon || 'Brak'}</td>
                        </tr>
                        <tr>
                          <td><strong>Email:</strong></td>
                          <td>{selectedLocation.email || 'Brak'}</td>
                        </tr>
                        <tr>
                          <td><strong>Manager:</strong></td>
                          <td>{selectedLocation.manager || selectedLocation.kierownik || 'Brak'}</td>
                        </tr>
                        <tr>
                          <td><strong>Godziny:</strong></td>
                          <td>{selectedLocation.hours || selectedLocation.godziny || 'Brak'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setSelectedLocation(null)}
                >
                  Zamknij
                </button>
                <button type="button" className="btn btn-primary">
                  Edytuj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationsPage;
