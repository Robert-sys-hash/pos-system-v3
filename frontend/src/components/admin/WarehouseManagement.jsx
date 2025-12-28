import React, { useState, useEffect } from 'react';
import multiWarehouseService from '../../services/multiWarehouseService';

const WarehouseManagement = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('warehouses'); // 'warehouses' lub 'employees'
  
  // Modals
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);

  // Dodaj CSS animację
  const spinKeyframes = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  
  // Form data
  const [warehouseForm, setWarehouseForm] = useState({
    nazwa: '',
    kod: '',
    location_id: '',
    adres: '',
    telefon: '',
    email: '',
    nip: '',
    miasto: '',
    kod_pocztowy: '',
    wojewodztwo: '',
    typ_magazynu: 'sklep',
    opis: '',
    kierownik_id: ''
  });
  
  const [employeeForm, setEmployeeForm] = useState({
    warehouse_id: '',
    user_login: '',
    rola: 'pracownik',
    uprawnienia: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [warehousesRes, usersRes, locationsRes] = await Promise.all([
        multiWarehouseService.getWarehouses(),
        fetch('http://localhost:8000/api/admin/users'),
        fetch('http://localhost:8000/api/locations/')
      ]);

      if (warehousesRes.success) {
        const warehouses = warehousesRes.data || [];
        setWarehouses(warehouses);
        
        // Utwórz listę wszystkich przypisanych pracowników
        const allEmployees = [];
        warehouses.forEach(warehouse => {
          if (warehouse.assigned_users) {
            warehouse.assigned_users.forEach(assignment => {
              allEmployees.push({
                id: `${warehouse.id}-${assignment.user_login}`,
                login: assignment.user_login,
                rola: assignment.rola,
                warehouseId: warehouse.id,
                warehouseName: warehouse.nazwa,
                data_od: assignment.data_od,
                data_do: assignment.data_do,
                aktywny: assignment.aktywny
              });
            });
          }
        });
        setEmployees(allEmployees);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.data?.users || []);
      }

      if (locationsRes.ok) {
        const locationsData = await locationsRes.json();
        setLocations(locationsData.data?.locations || []);
      }
    } catch (err) {
      setError('Błąd podczas ładowania danych');
    } finally {
      setLoading(false);
    }
  };  const handleWarehouseSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Przygotuj dane z poprawnym mapowaniem pól
      const warehouseData = {
        ...warehouseForm,
        kod_magazynu: warehouseForm.kod // Zmapuj kod na kod_magazynu dla backendu
      };
      delete warehouseData.kod; // Usuń niepotrzebne pole

      let result;
      if (editingWarehouse) {
        result = await multiWarehouseService.updateWarehouse(editingWarehouse.id, warehouseData);
      } else {
        result = await multiWarehouseService.createWarehouse(warehouseData);
      }
      
      if (result.success) {
        setSuccess(result.message);
        setShowWarehouseModal(false);
        resetWarehouseForm();
        loadData();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Błąd podczas zapisywania magazynu');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await multiWarehouseService.assignEmployee(
        employeeForm.warehouse_id,
        employeeForm.user_login,
        employeeForm.rola,
        employeeForm.uprawnienia
      );
      
      if (result.success) {
        setSuccess(result.message);
        setShowEmployeeModal(false);
        resetEmployeeForm();
        loadData();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Błąd podczas przypisywania pracownika');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWarehouse = async (warehouseId) => {
    if (window.confirm('Czy na pewno chcesz usunąć ten magazyn?')) {
      try {
        const result = await multiWarehouseService.deleteWarehouse(warehouseId);
        if (result.success) {
          setSuccess(result.message);
          loadData();
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError('Błąd podczas usuwania magazynu');
      }
    }
  };

  const handleRemoveEmployee = async (assignmentId) => {
    if (window.confirm('Czy na pewno chcesz usunąć to przypisanie?')) {
      try {
        const result = await multiWarehouseService.removeEmployeeAssignment(assignmentId);
        if (result.success) {
          setSuccess(result.message);
          loadData();
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError('Błąd podczas usuwania przypisania');
      }
    }
  };

  const editWarehouse = (warehouse) => {
    setEditingWarehouse(warehouse);
    setWarehouseForm({
      nazwa: warehouse.nazwa || '',
      kod: warehouse.kod_magazynu || warehouse.kod || '',
      location_id: warehouse.location_id || '',
      adres: warehouse.adres || '',
      telefon: warehouse.telefon || '',
      email: warehouse.email || '',
      nip: warehouse.nip || '',
      miasto: warehouse.miasto || '',
      kod_pocztowy: warehouse.kod_pocztowy || '',
      wojewodztwo: warehouse.wojewodztwo || '',
      typ_magazynu: warehouse.typ_magazynu || 'sklep',
      opis: warehouse.opis || '',
      kierownik_id: warehouse.kierownik_id || ''
    });
    setShowWarehouseModal(true);
  };

  const resetWarehouseForm = () => {
    setWarehouseForm({
      nazwa: '',
      kod: '',
      location_id: '',
      adres: '',
      telefon: '',
      email: '',
      nip: '',
      miasto: '',
      kod_pocztowy: '',
      wojewodztwo: '',
      typ_magazynu: 'sklep',
      opis: '',
      kierownik_id: ''
    });
    setEditingWarehouse(null);
  };

  const resetEmployeeForm = () => {
    setEmployeeForm({
      warehouse_id: '',
      user_login: '',
      rola: 'pracownik',
      uprawnienia: ''
    });
  };

  const getWarehouseName = (warehouseId) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse ? warehouse.nazwa : 'Nieznany magazyn';
  };

  const getUserLogin = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.login : 'Nieznany użytkownik';
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'kierownik': return 'bg-danger';
      case 'zastepca': return 'bg-warning';
      case 'pracownik': return 'bg-primary';
      default: return 'bg-secondary';
    }
  };

  return (
    <>
      <style>{spinKeyframes}</style>
      <div style={{ fontFamily: 'Arial, sans-serif' }}>
        {error && (
        <div style={{ 
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '0.375rem',
          color: '#721c24',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {error}
          <button 
            style={{
              background: 'none',
              border: 'none',
              color: '#721c24',
              fontSize: '18px',
              cursor: 'pointer'
            }}
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {success && (
        <div style={{ 
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '0.375rem',
          color: '#155724',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {success}
          <button 
            style={{
              background: 'none',
              border: 'none',
              color: '#155724',
              fontSize: '18px',
              cursor: 'pointer'
            }}
            onClick={() => setSuccess(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Zakładki */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ 
          display: 'flex', 
          borderBottom: '2px solid #e9ecef',
          marginBottom: '1rem'
        }}>
          <button
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: activeTab === 'warehouses' ? '#007bff' : 'transparent',
              color: activeTab === 'warehouses' ? 'white' : '#007bff',
              borderBottom: activeTab === 'warehouses' ? '3px solid #007bff' : '3px solid transparent',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
            onClick={() => setActiveTab('warehouses')}
            onMouseOver={(e) => {
              if (activeTab !== 'warehouses') {
                e.target.style.backgroundColor = '#f8f9fa';
              }
            }}
            onMouseOut={(e) => {
              if (activeTab !== 'warehouses') {
                e.target.style.backgroundColor = 'transparent';
              }
            }}
          >
            📦 Magazyny
          </button>
          <button
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: activeTab === 'employees' ? '#007bff' : 'transparent',
              color: activeTab === 'employees' ? 'white' : '#007bff',
              borderBottom: activeTab === 'employees' ? '3px solid #007bff' : '3px solid transparent',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
            onClick={() => setActiveTab('employees')}
            onMouseOver={(e) => {
              if (activeTab !== 'employees') {
                e.target.style.backgroundColor = '#f8f9fa';
              }
            }}
            onMouseOut={(e) => {
              if (activeTab !== 'employees') {
                e.target.style.backgroundColor = 'transparent';
              }
            }}
          >
            👥 Przypisania pracowników
          </button>
        </div>
      </div>

      {/* Zawartość zakładek */}
      {activeTab === 'warehouses' && (
        <div style={{ width: '100%' }}>
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e9ecef',
            borderRadius: '0.375rem',
            boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
          }}>
            <div style={{ 
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #e9ecef',
              backgroundColor: '#f8f9fa',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h5 style={{ margin: 0, fontWeight: '600', color: '#495057', fontSize: '1rem' }}>
                🏪 Magazyny / Sklepy
              </h5>
              <button 
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'white',
                  backgroundColor: '#28a745',
                  border: '1px solid #28a745',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  resetWarehouseForm();
                  setShowWarehouseModal(true);
                }}
              >
                ➕ Dodaj magazyn
              </button>
            </div>
            <div style={{ padding: '1rem' }}>
              {loading ? (
                <div style={{ 
                  textAlign: 'center',
                  padding: '2rem',
                  color: '#6c757d'
                }}>
                  <div style={{
                    display: 'inline-block',
                    width: '2rem',
                    height: '2rem',
                    border: '3px solid #f8f9fa',
                    borderTop: '3px solid #007bff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '1rem'
                  }}></div>
                  <div>Ładowanie...</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem', fontWeight: '600' }}>Nazwa</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem', fontWeight: '600' }}>Kod</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem', fontWeight: '600' }}>Lokalizacja</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem', fontWeight: '600' }}>Typ</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem', fontWeight: '600' }}>Miasto</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem', fontWeight: '600' }}>Kierownik</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem', fontWeight: '600' }}>Pracownicy</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem', fontWeight: '600' }}>Produkty</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem', fontWeight: '600' }}>Akcje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouses.map(warehouse => (
                        <tr key={warehouse.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                          <td style={{ padding: '0.75rem', fontWeight: '600' }}>{warehouse.nazwa}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{
                              backgroundColor: '#f8f9fa',
                              color: '#495057',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontFamily: 'monospace'
                            }}>
                              {warehouse.kod_magazynu}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{
                              backgroundColor: '#e7f1ff',
                              color: '#0d6efd',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}>
                              {locations.find(loc => loc.id === warehouse.location_id)?.nazwa || 'Brak przypisania'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{
                              backgroundColor: warehouse.typ_magazynu === 'sklep' ? '#007bff' : '#6c757d',
                              color: 'white',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}>
                              {warehouse.typ_magazynu}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem' }}>{warehouse.miasto || '-'}</td>
                          <td style={{ padding: '0.75rem' }}>{warehouse.kierownik_login || '-'}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{
                              backgroundColor: '#17a2b8',
                              color: 'white',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}>
                              {warehouse.assigned_users ? warehouse.assigned_users.length : 0}
                            </span>
                            {warehouse.assigned_users && warehouse.assigned_users.length > 0 && (
                              <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6c757d' }}>
                                {warehouse.assigned_users.map(user => user.user_login).join(', ')}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{
                              backgroundColor: '#28a745',
                              color: 'white',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}>
                              {warehouse.liczba_produktow || 0}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button 
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  color: 'white',
                                  backgroundColor: '#007bff',
                                  border: '1px solid #007bff',
                                  borderRadius: '0.25rem',
                                  cursor: 'pointer'
                                }}
                                onClick={() => editWarehouse(warehouse)}
                              >
                                ✏️
                              </button>
                              <button 
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  color: 'white',
                                  backgroundColor: '#dc3545',
                                  border: '1px solid #dc3545',
                                  borderRadius: '0.25rem',
                                  cursor: 'pointer'
                                }}
                                onClick={() => handleDeleteWarehouse(warehouse.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'employees' && (
        <div style={{ width: '100%' }}>
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e9ecef',
            borderRadius: '0.375rem',
            boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
            marginBottom: '1rem'
          }}>
            <div style={{ 
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #e9ecef',
              backgroundColor: '#f8f9fa',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h5 style={{ margin: 0, fontWeight: '600', color: '#495057', fontSize: '1rem' }}>
                👥 Przypisania pracowników
              </h5>
              <button 
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'white',
                  backgroundColor: '#28a745',
                  border: '1px solid #28a745',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  resetEmployeeForm();
                  setShowEmployeeModal(true);
                }}
              >
                ➕ Przypisz
              </button>
            </div>
            <div style={{ padding: '1rem' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.8rem', fontWeight: '600' }}>Użytkownik</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.8rem', fontWeight: '600' }}>Magazyn</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.8rem', fontWeight: '600' }}>Rola</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.8rem', fontWeight: '600' }}>Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(employee => (
                      <tr key={employee.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <td style={{ padding: '0.5rem', fontSize: '0.875rem' }}>{employee.login}</td>
                        <td style={{ padding: '0.5rem' }}>
                          <small style={{ color: '#6c757d' }}>{employee.warehouseName || 'Nieznany magazyn'}</small>
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <span style={{
                            backgroundColor: employee.rola === 'kierownik' ? '#dc3545' : employee.rola === 'zastepca' ? '#ffc107' : employee.rola === 'pracownik' ? '#007bff' : '#6c757d',
                            color: 'white',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            {employee.rola}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <button 
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              color: 'white',
                              backgroundColor: '#dc3545',
                              border: '1px solid #dc3545',
                              borderRadius: '0.25rem',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleRemoveEmployee(employee.id)}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal dodawania/edycji magazynu */}
      {showWarehouseModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1050
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.375rem',
            padding: '1.5rem',
            minWidth: '600px',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)'
          }}>
            <h5 style={{ marginBottom: '1rem', fontWeight: '600' }}>
              {editingWarehouse ? 'Edytuj magazyn' : 'Dodaj nowy magazyn'}
            </h5>
            
            <form onSubmit={handleWarehouseSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    Nazwa magazynu *
                  </label>
                  <input
                    type="text"
                    required
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      outline: 'none'
                    }}
                    value={warehouseForm.nazwa}
                    onChange={(e) => setWarehouseForm({...warehouseForm, nazwa: e.target.value})}
                    placeholder="Nazwa magazynu"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    Kod magazynu *
                  </label>
                  <input
                    type="text"
                    required
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      outline: 'none'
                    }}
                    value={warehouseForm.kod}
                    onChange={(e) => setWarehouseForm({...warehouseForm, kod: e.target.value})}
                    placeholder="MAG001"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Lokalizacja *
                </label>
                <select
                  required
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                  value={warehouseForm.location_id}
                  onChange={(e) => setWarehouseForm({...warehouseForm, location_id: e.target.value})}
                >
                  <option value="">Wybierz lokalizację</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.nazwa || location.name} {location.miasto ? `(${location.miasto})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Adres
                </label>
                <input
                  type="text"
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    outline: 'none'
                  }}
                  value={warehouseForm.adres}
                  onChange={(e) => setWarehouseForm({...warehouseForm, adres: e.target.value})}
                  placeholder="Ulica i numer"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    Miasto
                  </label>
                  <input
                    type="text"
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      outline: 'none'
                    }}
                    value={warehouseForm.miasto}
                    onChange={(e) => setWarehouseForm({...warehouseForm, miasto: e.target.value})}
                    placeholder="Miasto"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    Kod pocztowy
                  </label>
                  <input
                    type="text"
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      outline: 'none'
                    }}
                    value={warehouseForm.kod_pocztowy}
                    onChange={(e) => setWarehouseForm({...warehouseForm, kod_pocztowy: e.target.value})}
                    placeholder="00-000"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    Województwo
                  </label>
                  <input
                    type="text"
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      outline: 'none'
                    }}
                    value={warehouseForm.wojewodztwo}
                    onChange={(e) => setWarehouseForm({...warehouseForm, wojewodztwo: e.target.value})}
                    placeholder="Województwo"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    Telefon
                  </label>
                  <input
                    type="tel"
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      outline: 'none'
                    }}
                    value={warehouseForm.telefon}
                    onChange={(e) => setWarehouseForm({...warehouseForm, telefon: e.target.value})}
                    placeholder="+48 123 456 789"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      outline: 'none'
                    }}
                    value={warehouseForm.email}
                    onChange={(e) => setWarehouseForm({...warehouseForm, email: e.target.value})}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    Typ magazynu
                  </label>
                  <select
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                    value={warehouseForm.typ_magazynu}
                    onChange={(e) => setWarehouseForm({...warehouseForm, typ_magazynu: e.target.value})}
                  >
                    <option value="sklep">Sklep</option>
                    <option value="magazyn">Magazyn</option>
                    <option value="hurtownia">Hurtownia</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    Kierownik
                  </label>
                  <select
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                    value={warehouseForm.kierownik_id}
                    onChange={(e) => setWarehouseForm({...warehouseForm, kierownik_id: e.target.value})}
                  >
                    <option value="">Wybierz kierownika</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.login} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Opis
                </label>
                <textarea
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    outline: 'none',
                    resize: 'vertical',
                    minHeight: '80px'
                  }}
                  value={warehouseForm.opis}
                  onChange={(e) => setWarehouseForm({...warehouseForm, opis: e.target.value})}
                  placeholder="Dodatkowe informacje o magazynie"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#6c757d',
                    backgroundColor: 'white',
                    border: '1px solid #6c757d',
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setShowWarehouseModal(false);
                    resetWarehouseForm();
                    setEditingWarehouse(null);
                  }}
                >
                  Anuluj
                </button>
                <button 
                  type="submit"
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: 'white',
                    backgroundColor: '#28a745',
                    border: '1px solid #28a745',
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                  }}
                  disabled={loading}
                >
                  {loading ? '⏳ Zapisywanie...' : (editingWarehouse ? '💾 Zapisz zmiany' : '➕ Dodaj magazyn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal przypisywania pracownika */}
      {showEmployeeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1050
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.375rem',
            padding: '1.5rem',
            minWidth: '400px',
            maxWidth: '500px',
            boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)'
          }}>
            <h5 style={{ marginBottom: '1rem', fontWeight: '600' }}>
              Przypisz pracownika do magazynu
            </h5>
            
            <form onSubmit={handleEmployeeSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Magazyn *
                </label>
                <select
                  required
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                  value={employeeForm.warehouse_id}
                  onChange={(e) => setEmployeeForm({...employeeForm, warehouse_id: e.target.value})}
                >
                  <option value="">Wybierz magazyn</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.nazwa} ({warehouse.kod})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Użytkownik *
                </label>
                <select
                  required
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                  value={employeeForm.user_login}
                  onChange={(e) => setEmployeeForm({...employeeForm, user_login: e.target.value})}
                >
                  <option value="">Wybierz użytkownika</option>
                  {users.map(user => (
                    <option key={user.id} value={user.login}>
                      {user.login} ({user.role})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Rola w magazynie
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                  value={employeeForm.rola}
                  onChange={(e) => setEmployeeForm({...employeeForm, rola: e.target.value})}
                >
                  <option value="pracownik">Pracownik</option>
                  <option value="kierownik">Kierownik</option>
                  <option value="zastepca">Zastępca</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Uprawnienia (opcjonalne)
                </label>
                <textarea
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    outline: 'none',
                    resize: 'vertical',
                    minHeight: '60px'
                  }}
                  value={employeeForm.uprawnienia}
                  onChange={(e) => setEmployeeForm({...employeeForm, uprawnienia: e.target.value})}
                  placeholder="Dodatkowe uprawnienia lub opis"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#6c757d',
                    backgroundColor: 'white',
                    border: '1px solid #6c757d',
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setShowEmployeeModal(false);
                    resetEmployeeForm();
                  }}
                >
                  Anuluj
                </button>
                <button 
                  type="submit"
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: 'white',
                    backgroundColor: '#28a745',
                    border: '1px solid #28a745',
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                  }}
                  disabled={loading}
                >
                  {loading ? '⏳ Przypisywanie...' : '👥 Przypisz pracownika'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default WarehouseManagement;
