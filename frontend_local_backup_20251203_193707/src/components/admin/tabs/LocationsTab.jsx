import React, { useState, useEffect } from 'react';

const LocationsTab = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingLocation, setEditingLocation] = useState(null);
  const [activeTab, setActiveTab] = useState('locations'); // 'locations', 'employees', 'users'
  
  // State dla pracowników
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  
  // State dla zarządzania użytkownikami
  const [newUser, setNewUser] = useState({ login: '', haslo: '', typ: 'kasjer' });
  const [editingUser, setEditingUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  
  const [newLocation, setNewLocation] = useState({
    kod_lokalizacji: '',
    nazwa: '',
    typ: 'sklep',
    adres: '',
    miasto: '',
    kod_pocztowy: '',
    telefon: '',
    email: '',
    manager_login: '',
    aktywny: true,
    godziny_otwarcia: ''
  });
  
  const [employeeForm, setEmployeeForm] = useState({
    user_login: '',
    rola: 'pracownik',
    uprawnienia: ''
  });

  // Pobierz lokalizacje
  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('https://panelv3.pl/api/locations/');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const locationsArray = data.data || data;
      setLocations(locationsArray);
    } catch (error) {
      console.error('❌ Error fetching locations:', error);
      setError('Błąd podczas pobierania lokalizacji');
    } finally {
      setLoading(false);
    }
  };

  // Pobierz użytkowników
  const fetchUsers = async () => {
    try {
      const response = await fetch('https://panelv3.pl/api/admin/users');
      if (response.ok) {
        const usersData = await response.json();
        setUsers(usersData.data?.users || []);
      }
    } catch (error) {
      console.error('❌ Error fetching users:', error);
    }
  };

  // Pobierz pracowników dla lokalizacji
  const fetchLocationEmployees = async (locationId) => {
    if (!locationId) return;
    
    try {
      const response = await fetch(`https://panelv3.pl/locations/${locationId}/employees`);
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.data || []);
      }
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
    }
  };

  // Resetuj formularz pracownika
  const resetEmployeeForm = () => {
    setEmployeeForm({
      user_login: '',
      rola: 'pracownik',
      uprawnienia: ''
    });
    setEditingEmployee(null);
  };

  // Obsługa formularza pracownika
  const handleEmployeeSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedLocationId) {
      alert('Wybierz lokalizację');
      return;
    }

    try {
      const url = editingEmployee 
        ? `https://panelv3.pl/locations/${selectedLocationId}/employees/${editingEmployee.id}`
        : `https://panelv3.pl/locations/${selectedLocationId}/employees`;
      
      const method = editingEmployee ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(employeeForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas zapisywania');
      }

      await fetchLocationEmployees(selectedLocationId);
      setShowEmployeeModal(false);
      resetEmployeeForm();
      
      const action = editingEmployee ? 'zaktualizowany' : 'przypisany';
      alert(`Pracownik został ${action} pomyślnie`);
    } catch (error) {
      console.error('❌ Error saving employee:', error);
      alert('Błąd podczas zapisywania: ' + error.message);
    }
  };

  // Usuń pracownika
  const handleRemoveEmployee = async (employeeId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć to przypisanie?')) {
      return;
    }

    try {
      const response = await fetch(`https://panelv3.pl/locations/${selectedLocationId}/employees/${employeeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas usuwania');
      }

      await fetchLocationEmployees(selectedLocationId);
      alert('Pracownik został usunięty z lokalizacji');
    } catch (error) {
      console.error('❌ Error removing employee:', error);
      alert('Błąd podczas usuwania: ' + error.message);
    }
  };

  // ZARZĄDZANIE UŻYTKOWNIKAMI
  
  // Dodaj nowego użytkownika
  const addUser = async () => {
    if (!newUser.login.trim() || !newUser.haslo.trim()) {
      alert('Login i hasło są wymagane');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('https://panelv3.pl/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas dodawania użytkownika');
      }

      await fetchUsers();
      setNewUser({ login: '', haslo: '', typ: 'kasjer' });
      alert('Użytkownik został dodany pomyślnie');
    } catch (error) {
      console.error('❌ Error adding user:', error);
      alert('Błąd podczas dodawania: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Aktualizuj użytkownika
  const updateUser = async () => {
    if (!editingUser) return;

    try {
      setLoading(true);
      const response = await fetch(`https://panelv3.pl/admin/users/${editingUser.login}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingUser),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas aktualizacji użytkownika');
      }

      await fetchUsers();
      setEditingUser(null);
      alert('Użytkownik został zaktualizowany pomyślnie');
    } catch (error) {
      console.error('❌ Error updating user:', error);
      alert('Błąd podczas aktualizacji: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Usuń użytkownika
  const deleteUser = async (login) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tego użytkownika?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`https://panelv3.pl/admin/users/${login}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas usuwania użytkownika');
      }

      await fetchUsers();
      alert('Użytkownik został usunięty pomyślnie');
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      alert('Błąd podczas usuwania: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Dodaj nową lokalizację
  const addLocation = async () => {
    if (!newLocation.kod_lokalizacji.trim() || !newLocation.nazwa.trim()) {
      alert('Kod lokalizacji i nazwa są wymagane');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('https://panelv3.pl/locations/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newLocation),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas dodawania lokalizacji');
      }

      await fetchLocations();
      setNewLocation({
        kod_lokalizacji: '',
        nazwa: '',
        typ: 'sklep',
        adres: '',
        miasto: '',
        kod_pocztowy: '',
        telefon: '',
        email: '',
        manager_login: '',
        aktywny: true,
        godziny_otwarcia: ''
      });
      alert('Lokalizacja została dodana pomyślnie');
    } catch (error) {
      console.error('❌ Error adding location:', error);
      alert('Błąd podczas dodawania lokalizacji: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Edytuj lokalizację
  const updateLocation = async () => {
    if (!editingLocation.kod_lokalizacji.trim() || !editingLocation.nazwa.trim()) {
      alert('Kod lokalizacji i nazwa są wymagane');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`https://panelv3.pl/locations/${editingLocation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingLocation),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas aktualizacji lokalizacji');
      }

      await fetchLocations();
      setEditingLocation(null);
      alert('Lokalizacja została zaktualizowana pomyślnie');
    } catch (error) {
      console.error('❌ Error updating location:', error);
      alert('Błąd podczas aktualizacji lokalizacji: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Usuń lokalizację
  const deleteLocation = async (locationId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tę lokalizację?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`https://panelv3.pl/locations/${locationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas usuwania lokalizacji');
      }

      await fetchLocations();
      alert('Lokalizacja została usunięta pomyślnie');
    } catch (error) {
      console.error('❌ Error deleting location:', error);
      alert('Błąd podczas usuwania lokalizacji: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedLocationId && activeTab === 'employees') {
      fetchLocationEmployees(selectedLocationId);
    }
  }, [selectedLocationId, activeTab]);

  if (error) {
    return (
      <div style={{ padding: '1rem', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '0.375rem' }}>
        ❌ {error}
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '600' }}>
        🏢 Zarządzanie Lokalizacjami
      </h3>

      {/* Karty nawigacyjne */}
      <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e9ecef' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('locations')}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              borderBottom: activeTab === 'locations' ? '2px solid #007bff' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'locations' ? '#007bff' : '#6c757d',
              cursor: 'pointer',
              fontWeight: activeTab === 'locations' ? '600' : '400',
              fontSize: '0.875rem'
            }}
          >
            🏢 Lokalizacje
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              borderBottom: activeTab === 'employees' ? '2px solid #007bff' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'employees' ? '#007bff' : '#6c757d',
              cursor: 'pointer',
              fontWeight: activeTab === 'employees' ? '600' : '400',
              fontSize: '0.875rem'
            }}
          >
            👥 Pracownicy
          </button>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              borderBottom: activeTab === 'users' ? '2px solid #007bff' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'users' ? '#007bff' : '#6c757d',
              cursor: 'pointer',
              fontWeight: activeTab === 'users' ? '600' : '400',
              fontSize: '0.875rem'
            }}
          >
            👨‍💼 Użytkownicy
          </button>
        </div>
      </div>

      {/* Zawartość karty lokalizacji */}
      {activeTab === 'locations' && (
        <div>
          {/* Formularz dodawania lokalizacji */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '1rem',
            borderRadius: '0.375rem',
            marginBottom: '1.5rem',
            border: '1px solid #e9ecef'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600' }}>
              Dodaj nową lokalizację
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Kod lokalizacji *
                </label>
                <input
                  type="text"
                  value={newLocation.kod_lokalizacji}
                  onChange={(e) => setNewLocation({ ...newLocation, kod_lokalizacji: e.target.value })}
                  placeholder="np. LOK001"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Nazwa *
                </label>
                <input
                  type="text"
                  value={newLocation.nazwa}
                  onChange={(e) => setNewLocation({ ...newLocation, nazwa: e.target.value })}
                  placeholder="np. Sklep Główny"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Typ
                </label>
                <select
                  value={newLocation.typ}
                  onChange={(e) => setNewLocation({ ...newLocation, typ: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="sklep">Sklep</option>
                  <option value="magazyn">Magazyn</option>
                  <option value="hurtownia">Hurtownia</option>
                  <option value="punkt_odbioru">Punkt odbioru</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Miasto
                </label>
                <input
                  type="text"
                  value={newLocation.miasto}
                  onChange={(e) => setNewLocation({ ...newLocation, miasto: e.target.value })}
                  placeholder="np. Warszawa"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Adres
                </label>
                <input
                  type="text"
                  value={newLocation.adres}
                  onChange={(e) => setNewLocation({ ...newLocation, adres: e.target.value })}
                  placeholder="np. ul. Główna 1"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={newLocation.email}
                  onChange={(e) => setNewLocation({ ...newLocation, email: e.target.value })}
                  placeholder="np. sklep@firma.pl"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>

            <button
              onClick={addLocation}
              disabled={loading}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: loading ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              {loading ? 'Dodawanie...' : '➕ Dodaj lokalizację'}
            </button>
          </div>

          {/* Lista lokalizacji */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e9ecef',
            borderRadius: '0.375rem',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid #e9ecef',
              fontWeight: '600'
            }}>
              Lista lokalizacji ({locations.length})
            </div>

            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
                <i className="fas fa-spinner fa-spin"></i> Ładowanie...
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem' }}>ID</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem' }}>Kod</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem' }}>Nazwa</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem' }}>Typ</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem' }}>Miasto</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem' }}>Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem' }}>Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
                          Brak lokalizacji
                        </td>
                      </tr>
                    ) : (
                      locations.map((location) => (
                        <tr key={location.id}>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #f0f0f0' }}>
                            {location.id}
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #f0f0f0' }}>
                            <code style={{ backgroundColor: '#f8f9fa', padding: '0.25rem', borderRadius: '0.25rem' }}>
                              {location.kod_lokalizacji}
                            </code>
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #f0f0f0', fontWeight: '500' }}>
                            {location.nazwa}
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #f0f0f0' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              backgroundColor: location.typ === 'sklep' ? '#d4edda' : 
                                             location.typ === 'magazyn' ? '#d1ecf1' :
                                             location.typ === 'hurtownia' ? '#fff3cd' : '#e2e3e5',
                              color: location.typ === 'sklep' ? '#155724' : 
                                    location.typ === 'magazyn' ? '#0c5460' :
                                    location.typ === 'hurtownia' ? '#856404' : '#383d41'
                            }}>
                              {location.typ}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #f0f0f0' }}>
                            {location.miasto || '-'}
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #f0f0f0' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              backgroundColor: location.aktywny ? '#d4edda' : '#f8d7da',
                              color: location.aktywny ? '#155724' : '#721c24'
                            }}>
                              {location.aktywny ? 'Aktywna' : 'Nieaktywna'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>
                            <button
                              onClick={() => setEditingLocation({ ...location })}
                              style={{
                                padding: '0.25rem 0.5rem',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                marginRight: '0.25rem'
                              }}
                            >
                              ✏️ Edytuj
                            </button>
                            <button
                              onClick={() => deleteLocation(location.id)}
                              style={{
                                padding: '0.25rem 0.5rem',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
                            >
                              🗑️ Usuń
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Zawartość karty pracowników */}
      {activeTab === 'employees' && (
        <div>
          {/* Selektor lokalizacji */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '1rem',
            borderRadius: '0.375rem',
            marginBottom: '1.5rem',
            border: '1px solid #e9ecef'
          }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>
              Wybierz lokalizację:
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: '0.5rem',
                border: '1px solid #ced4da',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            >
              <option value="">-- Wybierz lokalizację --</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.nazwa} ({location.kod_lokalizacji})
                </option>
              ))}
            </select>
          </div>

          {/* Lista pracowników */}
          {selectedLocationId && (
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e9ecef',
              borderRadius: '0.375rem',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '1rem',
                backgroundColor: '#f8f9fa',
                borderBottom: '1px solid #e9ecef',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: '600' }}>
                  Pracownicy lokalizacji: {locations.find(l => l.id == selectedLocationId)?.nazwa} ({employees.length})
                </span>
                <button
                  onClick={() => {
                    resetEmployeeForm();
                    setShowEmployeeModal(true);
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  ➕ Przypisz Pracownika
                </button>
              </div>

              {employees.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
                  Brak przypisanych pracowników do tej lokalizacji
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem' }}>Login</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem' }}>Rola</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem' }}>Uprawnienia</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem' }}>Akcje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((employee) => (
                        <tr key={employee.id}>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #f0f0f0', fontWeight: '500' }}>
                            {employee.user_login}
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #f0f0f0' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              backgroundColor: employee.rola === 'manager' ? '#fff3cd' : 
                                             employee.rola === 'kasjer' ? '#d1ecf1' : '#e2e3e5',
                              color: employee.rola === 'manager' ? '#856404' : 
                                    employee.rola === 'kasjer' ? '#0c5460' : '#383d41'
                            }}>
                              {employee.rola}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #f0f0f0' }}>
                            {employee.uprawnienia || 'Standardowe'}
                          </td>
                          <td style={{ padding: '0.75rem', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>
                            <button
                              onClick={() => {
                                setEditingEmployee(employee);
                                setEmployeeForm({
                                  user_login: employee.user_login,
                                  rola: employee.rola,
                                  uprawnienia: employee.uprawnienia || ''
                                });
                                setShowEmployeeModal(true);
                              }}
                              style={{
                                padding: '0.25rem 0.5rem',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                marginRight: '0.25rem'
                              }}
                            >
                              ✏️ Edytuj
                            </button>
                            <button
                              onClick={() => handleRemoveEmployee(employee.id)}
                              style={{
                                padding: '0.25rem 0.5rem',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
                            >
                              🗑️ Usuń
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Zawartość karty użytkowników */}
      {activeTab === 'users' && (
        <div>
          {/* Formularz dodawania użytkownika */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '1rem',
            borderRadius: '0.375rem',
            marginBottom: '1.5rem',
            border: '1px solid #e9ecef'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600' }}>
              ➕ Dodaj nowego użytkownika
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Login *
                </label>
                <input
                  type="text"
                  value={newUser.login}
                  onChange={(e) => setNewUser({ ...newUser, login: e.target.value })}
                  placeholder="np. kasjer1"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Hasło *
                </label>
                <input
                  type="password"
                  value={newUser.haslo}
                  onChange={(e) => setNewUser({ ...newUser, haslo: e.target.value })}
                  placeholder="Hasło"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Typ
                </label>
                <select
                  value={newUser.typ}
                  onChange={(e) => setNewUser({ ...newUser, typ: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="kasjer">Kasjer</option>
                  <option value="kierownik">Kierownik</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              
              <button
                onClick={addUser}
                disabled={loading || !newUser.login.trim() || !newUser.haslo.trim()}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: loading || !newUser.login.trim() || !newUser.haslo.trim() ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: loading || !newUser.login.trim() || !newUser.haslo.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                {loading ? 'Dodawanie...' : '➕ Dodaj'}
              </button>
            </div>
          </div>

          {/* Lista użytkowników */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e9ecef',
            borderRadius: '0.375rem',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid #e9ecef',
              fontWeight: '600'
            }}>
              Lista użytkowników ({users.length})
            </div>

            {users.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
                Brak użytkowników w systemie
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem' }}>Login</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem' }}>Typ</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem' }}>Rola</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem' }}>Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.login}>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #f0f0f0', fontWeight: '500' }}>
                          {user.login}
                        </td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #f0f0f0' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: user.typ === 'admin' ? '#fff3cd' : 
                                           user.typ === 'kierownik' ? '#d1ecf1' : '#e2e3e5',
                            color: user.typ === 'admin' ? '#856404' : 
                                  user.typ === 'kierownik' ? '#0c5460' : '#383d41'
                          }}>
                            {user.typ}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #f0f0f0' }}>
                          {user.rola || 'Brak'}
                        </td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>
                          <button
                            onClick={() => setEditingUser({ ...user })}
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              marginRight: '0.25rem'
                            }}
                          >
                            ✏️ Edytuj
                          </button>
                          <button
                            onClick={() => deleteUser(user.login)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              cursor: 'pointer',
                              fontSize: '0.75rem'
                            }}
                          >
                            🗑️ Usuń
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal edycji lokalizacji */}
      {editingLocation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: '600' }}>
              ✏️ Edytuj lokalizację
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Kod lokalizacji *
                </label>
                <input
                  type="text"
                  value={editingLocation.kod_lokalizacji}
                  onChange={(e) => setEditingLocation({ ...editingLocation, kod_lokalizacji: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Nazwa *
                </label>
                <input
                  type="text"
                  value={editingLocation.nazwa}
                  onChange={(e) => setEditingLocation({ ...editingLocation, nazwa: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Typ
                </label>
                <select
                  value={editingLocation.typ}
                  onChange={(e) => setEditingLocation({ ...editingLocation, typ: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="sklep">Sklep</option>
                  <option value="magazyn">Magazyn</option>
                  <option value="hurtownia">Hurtownia</option>
                  <option value="punkt_odbioru">Punkt odbioru</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Miasto
                </label>
                <input
                  type="text"
                  value={editingLocation.miasto || ''}
                  onChange={(e) => setEditingLocation({ ...editingLocation, miasto: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Aktywna
                </label>
                <select
                  value={editingLocation.aktywny}
                  onChange={(e) => setEditingLocation({ ...editingLocation, aktywny: e.target.value === 'true' })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="true">Tak</option>
                  <option value="false">Nie</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingLocation(null)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Anuluj
              </button>
              <button
                onClick={updateLocation}
                disabled={loading}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: loading ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {loading ? 'Zapisywanie...' : '💾 Zapisz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pracownika */}
      {showEmployeeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            width: '90%',
            maxWidth: '500px'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: '600' }}>
              {editingEmployee ? '✏️ Edytuj pracownika' : '➕ Przypisz pracownika'}
            </h4>

            <form onSubmit={handleEmployeeSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Login użytkownika *
                </label>
                {editingEmployee ? (
                  <input
                    type="text"
                    value={employeeForm.user_login}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      backgroundColor: '#f8f9fa',
                      color: '#6c757d'
                    }}
                  />
                ) : (
                  <select
                    value={employeeForm.user_login}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, user_login: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">-- Wybierz użytkownika --</option>
                    {users.map(user => (
                      <option key={user.login} value={user.login}>
                        {user.login} ({user.rola})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Rola w lokalizacji *
                </label>
                <select
                  value={employeeForm.rola}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, rola: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="pracownik">Pracownik</option>
                  <option value="kasjer">Kasjer</option>
                  <option value="manager">Manager</option>
                  <option value="administrator">Administrator</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Dodatkowe uprawnienia
                </label>
                <textarea
                  value={employeeForm.uprawnienia}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, uprawnienia: e.target.value })}
                  placeholder="np. Dostęp do raportów, zarządzanie towarami"
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmployeeModal(false);
                    resetEmployeeForm();
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  {editingEmployee ? '💾 Zapisz' : '➕ Przypisz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal edycji użytkownika */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            width: '90%',
            maxWidth: '500px'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: '600' }}>
              ✏️ Edytuj użytkownika
            </h4>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Login
              </label>
              <input
                type="text"
                value={editingUser.login}
                readOnly
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  backgroundColor: '#f8f9fa',
                  color: '#6c757d'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Nowe hasło (pozostaw puste, aby nie zmieniać)
              </label>
              <input
                type="password"
                value={editingUser.haslo || ''}
                onChange={(e) => setEditingUser({ ...editingUser, haslo: e.target.value })}
                placeholder="Nowe hasło"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Typ użytkownika
              </label>
              <select
                value={editingUser.typ}
                onChange={(e) => setEditingUser({ ...editingUser, typ: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              >
                <option value="kasjer">Kasjer</option>
                <option value="kierownik">Kierownik</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingUser(null)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Anuluj
              </button>
              <button
                onClick={updateUser}
                disabled={loading}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: loading ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {loading ? 'Zapisywanie...' : '💾 Zapisz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationsTab;
