import React, { useState, useEffect } from 'react';
import { customerService } from '../services/customerService';
// Klienci są globalni - nie potrzebujemy kontekstu lokalizacji

const CustomersPage = () => {
  // Klienci są globalni - ten sam klient może robić zakupy w różnych lokalizacjach
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCustomer, setNewCustomer] = useState({
    typ_klienta: 'osoba_fizyczna',
    imie: '',
    nazwisko: '',
    email: '',
    telefon: '',
    adres: '',
    miasto: '',
    kod_pocztowy: '',
    nip: '',
    nazwa_firmy: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await customerService.getCustomers();
      setCustomers(data || []);
    } catch (err) {
      setError('Błąd podczas pobierania klientów: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      await customerService.addCustomer(newCustomer);
      setNewCustomer({
        typ_klienta: 'osoba_fizyczna',
        imie: '',
        nazwisko: '',
        email: '',
        telefon: '',
        adres: '',
        miasto: '',
        kod_pocztowy: '',
        nip: '',
        nazwa_firmy: ''
      });
      setShowAddForm(false);
      fetchCustomers();
    } catch (err) {
      setError('Błąd podczas dodawania klienta: ' + err.message);
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (window.confirm('Czy na pewno chcesz usunąć tego klienta?')) {
      try {
        await customerService.deleteCustomer(id);
        fetchCustomers();
      } catch (err) {
        setError('Błąd podczas usuwania klienta: ' + err.message);
      }
    }
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer({
      ...customer,
      typ_klienta: customer.nazwa_firmy ? 'firma' : 'osoba_fizyczna',
      adres: customer.ulica || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    try {
      await customerService.updateCustomer(editingCustomer.id, editingCustomer);
      setShowEditModal(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err) {
      setError('Błąd podczas aktualizacji klienta: ' + err.message);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    `${customer.imie} ${customer.nazwisko}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.telefon?.includes(searchTerm) ||
    customer.nazwa_firmy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.nip?.includes(searchTerm)
  );

  if (loading) return <div className="container mt-4"><div className="text-center">Ładowanie...</div></div>;

  const stats = {
    total_customers: customers.length,
    individual_customers: customers.filter(c => !c.nazwa_firmy || c.nazwa_firmy === '').length,
    company_customers: customers.filter(c => c.nazwa_firmy && c.nazwa_firmy !== '').length,
    with_email: customers.filter(c => c.email && c.email !== '').length
  };

  return (
    <div style={{ 
      width: '100%', 
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      padding: '1.5rem' 
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Nagłówek - identyczny ze stylem magazynu */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1.5rem',
          padding: '1.25rem 1.5rem',
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.5rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '3rem',
              height: '3rem',
              backgroundColor: '#e7f1ff',
              borderRadius: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #0d6efd'
            }}>
              <i className="fas fa-users" style={{ 
                color: '#0d6efd', 
                fontSize: '1.25rem' 
              }}></i>
            </div>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: '1.4rem', 
                fontWeight: '700',
                color: '#212529',
                letterSpacing: '-0.025em'
              }}>
                Zarządzanie Klientami
              </h1>
              <p style={{ 
                margin: '0.25rem 0 0 0', 
                fontSize: '0.875rem', 
                color: '#6c757d',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem'
              }}>
                <i className="fas fa-info-circle" style={{ fontSize: '0.8rem' }}></i>
                Baza danych klientów indywidualnych i firmowych
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={{ 
                padding: '0.625rem 1.125rem',
                fontSize: '0.875rem',
                border: '1px solid #198754',
                borderRadius: '0.375rem',
                backgroundColor: '#d1e7dd',
                color: '#0a3622',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '500',
                transition: 'all 0.15s ease-in-out'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#a3cfbb';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 0.25rem 0.5rem rgba(25, 135, 84, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#d1e7dd';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <i className="fas fa-user-plus"></i>
              Dodaj Klienta
            </button>
            <button
              onClick={fetchCustomers}
              disabled={loading}
              style={{ 
                padding: '0.625rem 1.125rem',
                fontSize: '0.875rem',
                border: '1px solid #0d6efd',
                borderRadius: '0.375rem',
                backgroundColor: '#0d6efd',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '500',
                transition: 'all 0.15s ease-in-out'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#0b5ed7';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 0.25rem 0.5rem rgba(13, 110, 253, 0.25)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#0d6efd';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }
              }}
            >
              <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
              {loading ? 'Ładowanie...' : 'Odśwież'}
            </button>
          </div>
        </div>

        {/* Statystyki - na wzór magazynu */}
        {stats && (
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginBottom: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ 
              flex: '1', 
              minWidth: '200px',
              padding: '1rem',
              backgroundColor: 'white',
              border: '1px solid #e9ecef',
              borderLeft: '4px solid #0d6efd',
              borderRadius: '0.375rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.5rem', 
                    fontWeight: '700',
                    color: '#0d6efd'
                  }}>
                    {stats.total_customers}
                  </h3>
                  <p style={{ 
                    margin: '0.25rem 0 0 0', 
                    fontSize: '0.8rem', 
                    color: '#6c757d'
                  }}>
                    Wszyscy klienci
                  </p>
                </div>
                <i className="fas fa-users fa-2x" style={{ color: '#0d6efd', opacity: 0.3 }}></i>
              </div>
            </div>
            
            <div style={{ 
              flex: '1', 
              minWidth: '200px',
              padding: '1rem',
              backgroundColor: 'white',
              border: '1px solid #e9ecef',
              borderLeft: '4px solid #28a745',
              borderRadius: '0.375rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.5rem', 
                    fontWeight: '700',
                    color: '#28a745'
                  }}>
                    {stats.individual_customers}
                  </h3>
                  <p style={{ 
                    margin: '0.25rem 0 0 0', 
                    fontSize: '0.8rem', 
                    color: '#6c757d'
                  }}>
                    Osoby fizyczne
                  </p>
                </div>
                <i className="fas fa-user fa-2x" style={{ color: '#28a745', opacity: 0.3 }}></i>
              </div>
            </div>

            <div style={{ 
              flex: '1', 
              minWidth: '200px',
              padding: '1rem',
              backgroundColor: 'white',
              border: '1px solid #e9ecef',
              borderLeft: '4px solid #6c757d',
              borderRadius: '0.375rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.5rem', 
                    fontWeight: '700',
                    color: '#6c757d'
                  }}>
                    {stats.company_customers}
                  </h3>
                  <p style={{ 
                    margin: '0.25rem 0 0 0', 
                    fontSize: '0.8rem', 
                    color: '#6c757d'
                  }}>
                    Firmy
                  </p>
                </div>
                <i className="fas fa-building fa-2x" style={{ color: '#6c757d', opacity: 0.3 }}></i>
              </div>
            </div>

            <div style={{ 
              flex: '1', 
              minWidth: '200px',
              padding: '1rem',
              backgroundColor: 'white',
              border: '1px solid #e9ecef',
              borderLeft: '4px solid #17a2b8',
              borderRadius: '0.375rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.5rem', 
                    fontWeight: '700',
                    color: '#17a2b8'
                  }}>
                    {stats.with_email}
                  </h3>
                  <p style={{ 
                    margin: '0.25rem 0 0 0', 
                    fontSize: '0.8rem', 
                    color: '#6c757d'
                  }}>
                    Z adresem email
                  </p>
                </div>
                <i className="fas fa-envelope fa-2x" style={{ color: '#17a2b8', opacity: 0.3 }}></i>
              </div>
            </div>
          </div>
        )}

        {/* Alert błędów */}
        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '0.375rem',
            color: '#721c24',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <i className="fas fa-exclamation-circle"></i>
            {error}
            <button 
              onClick={() => setError(null)}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: '#721c24',
                cursor: 'pointer',
                fontSize: '1.25rem'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Filtry i wyszukiwanie - na wzór magazynu */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
          marginBottom: '1rem'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef'
          }}>
            <h6 style={{ 
              margin: 0, 
              color: '#495057', 
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              <i className="fas fa-search me-2" style={{ color: '#6c757d' }}></i>
              Wyszukiwanie i filtry
            </h6>
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#6c757d',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <i className="fas fa-list"></i>
              <span>Klienci: <strong>{filteredCustomers.length}</strong></span>
            </div>
          </div>
          <div style={{ padding: '1rem' }}>
            <div className="input-group">
              <span className="input-group-text" style={{ backgroundColor: '#f8f9fa', border: '1px solid #ced4da' }}>
                🔍
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Szukaj po imieniu, nazwisku, nazwie firmy, emailu, telefonie lub NIP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: '1px solid #ced4da' }}
              />
            </div>
          </div>
        </div>

        {/* Formularz dodawania */}
        {showAddForm && (
          <div className="card mb-3">
            <div className="card-header">
              <h5>➕ Dodaj Nowego Klienta</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleAddCustomer}>
                {/* Typ klienta */}
                <div className="row">
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label">Typ klienta *</label>
                      <div className="form-check form-check-inline">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="typ_klienta"
                          id="osoba_fizyczna"
                          value="osoba_fizyczna"
                          checked={newCustomer.typ_klienta === 'osoba_fizyczna'}
                          onChange={(e) => setNewCustomer({...newCustomer, typ_klienta: e.target.value})}
                        />
                        <label className="form-check-label" htmlFor="osoba_fizyczna">
                          👤 Osoba fizyczna
                        </label>
                      </div>
                      <div className="form-check form-check-inline">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="typ_klienta"
                          id="firma"
                          value="firma"
                          checked={newCustomer.typ_klienta === 'firma'}
                          onChange={(e) => setNewCustomer({...newCustomer, typ_klienta: e.target.value})}
                        />
                        <label className="form-check-label" htmlFor="firma">
                          🏢 Firma
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dane podstawowe - zależne od typu */}
                {newCustomer.typ_klienta === 'osoba_fizyczna' ? (
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Imię *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newCustomer.imie}
                          onChange={(e) => setNewCustomer({...newCustomer, imie: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Nazwisko *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newCustomer.nazwisko}
                          onChange={(e) => setNewCustomer({...newCustomer, nazwisko: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Nazwa firmy *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newCustomer.nazwa_firmy}
                          onChange={(e) => setNewCustomer({...newCustomer, nazwa_firmy: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">NIP</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newCustomer.nip}
                          onChange={(e) => setNewCustomer({...newCustomer, nip: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Kontakt */}
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Telefon</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={newCustomer.telefon}
                        onChange={(e) => setNewCustomer({...newCustomer, telefon: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Adres */}
                <div className="row">
                  <div className="col-md-8">
                    <div className="mb-3">
                      <label className="form-label">Adres (ulica i numer)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newCustomer.adres}
                        onChange={(e) => setNewCustomer({...newCustomer, adres: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label">Kod pocztowy</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newCustomer.kod_pocztowy}
                        onChange={(e) => setNewCustomer({...newCustomer, kod_pocztowy: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label">Miasto</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newCustomer.miasto}
                        onChange={(e) => setNewCustomer({...newCustomer, miasto: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-success">Zapisz</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
                    Anuluj
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lista klientów - na wzór tabeli z magazynu */}
        <div style={{ 
          width: '100%', 
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
          overflowX: 'auto'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef'
          }}>
            <h6 style={{ 
              margin: 0, 
              color: '#495057', 
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              <i className="fas fa-table me-2" style={{ color: '#6c757d' }}></i>
              Lista klientów
            </h6>
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#6c757d',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <i className="fas fa-users"></i>
              <span>Klienci: <strong>{filteredCustomers.length}</strong></span>
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            {filteredCustomers.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div style={{ color: '#6c757d' }}>
                  <i className="fas fa-user-slash" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
                  <h5>Brak klientów</h5>
                  <p>Nie znaleziono klientów spełniających kryteria wyszukiwania</p>
                </div>
              </div>
            ) : (
              <table style={{ 
                width: '100%',
                minWidth: '850px',
                fontSize: '0.8rem',
                borderCollapse: 'separate',
                borderSpacing: 0
              }}>
                <thead style={{ 
                  backgroundColor: '#f8f9fa',
                  borderBottom: '2px solid #dee2e6'
                }}>
                  <tr style={{ fontSize: '0.75rem' }}>
                    <th style={{ 
                      width: '40px', 
                      padding: '0.5rem 0.25rem',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#495057'
                    }}>ID</th>
                    <th style={{ 
                      width: '80px', 
                      padding: '0.5rem 0.25rem',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#495057'
                    }}>Typ</th>
                    <th style={{ 
                      minWidth: '250px', 
                      width: '30%', 
                      padding: '0.5rem 0.5rem',
                      fontWeight: '600',
                      color: '#495057'
                    }}>Nazwa/Klient</th>
                    <th style={{ 
                      width: '180px', 
                      padding: '0.5rem 0.25rem',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#495057'
                    }}>Kontakt</th>
                    <th style={{ 
                      width: '150px', 
                      padding: '0.5rem 0.25rem',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#495057'
                    }}>Adres</th>
                    <th style={{ 
                      width: '100px', 
                      padding: '0.5rem 0.25rem',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#495057'
                    }}>Data dodania</th>
                    <th style={{ 
                      width: '80px', 
                      padding: '0.5rem 0.25rem',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#495057'
                    }}>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer, index) => (
                    <tr key={customer.id} style={{ 
                      backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                      borderBottom: '1px solid #e9ecef'
                    }}>
                      <td style={{ 
                        padding: '0.5rem 0.25rem',
                        textAlign: 'center'
                      }}>
                        <span style={{ 
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.65rem',
                          backgroundColor: '#0d6efd',
                          color: 'white',
                          borderRadius: '0.25rem',
                          fontWeight: '600'
                        }}>
                          #{customer.id}
                        </span>
                      </td>
                      <td style={{ 
                        padding: '0.5rem 0.25rem',
                        textAlign: 'center'
                      }}>
                        {customer.nazwa_firmy ? (
                          <span style={{ 
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.65rem',
                            backgroundColor: '#6f42c1',
                            color: 'white',
                            borderRadius: '0.25rem',
                            fontWeight: '600'
                          }}>
                            🏢 Firma
                          </span>
                        ) : (
                          <span style={{ 
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.65rem',
                            backgroundColor: '#198754',
                            color: 'white',
                            borderRadius: '0.25rem',
                            fontWeight: '600'
                          }}>
                            👤 Osoba
                          </span>
                        )}
                      </td>
                      <td style={{ 
                        minWidth: '250px', 
                        width: '30%', 
                        padding: '0.5rem'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ color: '#212529' }}>
                            {customer.nazwa_firmy || `${customer.imie} ${customer.nazwisko}`}
                          </strong>
                          {customer.nazwa_firmy && (
                            <small style={{ color: '#6c757d' }}>
                              {customer.imie} {customer.nazwisko}
                            </small>
                          )}
                          {customer.nip && (
                            <small style={{ color: '#6c757d' }}>
                              NIP: {customer.nip}
                            </small>
                          )}
                        </div>
                      </td>
                      <td style={{ 
                        width: '180px', 
                        padding: '0.5rem 0.25rem',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '0.7rem' }}>
                          {customer.email && (
                            <div style={{ marginBottom: '0.25rem' }}>
                              <i className="fas fa-envelope" style={{ color: '#6c757d', marginRight: '0.25rem' }}></i>
                              {customer.email}
                            </div>
                          )}
                          {customer.telefon && (
                            <div>
                              <i className="fas fa-phone" style={{ color: '#6c757d', marginRight: '0.25rem' }}></i>
                              {customer.telefon}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ 
                        width: '150px', 
                        padding: '0.5rem 0.25rem',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>
                          {customer.ulica && <div>{customer.ulica}</div>}
                          {customer.miasto && (
                            <div>
                              {customer.kod_pocztowy} {customer.miasto}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ 
                        width: '100px', 
                        padding: '0.5rem 0.25rem',
                        textAlign: 'center',
                        fontSize: '0.7rem',
                        color: '#6c757d'
                      }}>
                        {customer.created_at ? new Date(customer.created_at).toLocaleDateString('pl-PL') : '-'}
                      </td>
                      <td style={{ 
                        width: '80px', 
                        padding: '0.5rem 0.25rem',
                        textAlign: 'center'
                      }}>
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleEditCustomer(customer)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.65rem',
                              border: 'none',
                              borderRadius: '0.25rem',
                              backgroundColor: '#0d6efd',
                              color: 'white',
                              cursor: 'pointer'
                            }}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(customer.id)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.65rem',
                              border: 'none',
                              borderRadius: '0.25rem',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              cursor: 'pointer'
                            }}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal edycji klienta */}
        {showEditModal && editingCustomer && (
          <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">✏️ Edytuj Klienta</h5>
                  <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={handleUpdateCustomer}>
                    {/* Typ klienta */}
                    <div className="row">
                      <div className="col-12">
                        <div className="mb-3">
                          <label className="form-label">Typ klienta *</label>
                          <div className="form-check form-check-inline">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="edit_typ_klienta"
                              id="edit_osoba_fizyczna"
                              value="osoba_fizyczna"
                              checked={editingCustomer.typ_klienta === 'osoba_fizyczna'}
                              onChange={(e) => setEditingCustomer({...editingCustomer, typ_klienta: e.target.value})}
                            />
                            <label className="form-check-label" htmlFor="edit_osoba_fizyczna">
                              👤 Osoba fizyczna
                            </label>
                          </div>
                          <div className="form-check form-check-inline">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="edit_typ_klienta"
                              id="edit_firma"
                              value="firma"
                              checked={editingCustomer.typ_klienta === 'firma'}
                              onChange={(e) => setEditingCustomer({...editingCustomer, typ_klienta: e.target.value})}
                            />
                            <label className="form-check-label" htmlFor="edit_firma">
                              🏢 Firma
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dane podstawowe */}
                    {editingCustomer.typ_klienta === 'osoba_fizyczna' ? (
                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">Imię *</label>
                            <input
                              type="text"
                              className="form-control"
                              value={editingCustomer.imie || ''}
                              onChange={(e) => setEditingCustomer({...editingCustomer, imie: e.target.value})}
                              required
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">Nazwisko *</label>
                            <input
                              type="text"
                              className="form-control"
                              value={editingCustomer.nazwisko || ''}
                              onChange={(e) => setEditingCustomer({...editingCustomer, nazwisko: e.target.value})}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">Nazwa firmy *</label>
                            <input
                              type="text"
                              className="form-control"
                              value={editingCustomer.nazwa_firmy || ''}
                              onChange={(e) => setEditingCustomer({...editingCustomer, nazwa_firmy: e.target.value})}
                              required
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">NIP</label>
                            <input
                              type="text"
                              className="form-control"
                              value={editingCustomer.nip || ''}
                              onChange={(e) => setEditingCustomer({...editingCustomer, nip: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Kontakt */}
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Email</label>
                          <input
                            type="email"
                            className="form-control"
                            value={editingCustomer.email || ''}
                            onChange={(e) => setEditingCustomer({...editingCustomer, email: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Telefon</label>
                          <input
                            type="tel"
                            className="form-control"
                            value={editingCustomer.telefon || ''}
                            onChange={(e) => setEditingCustomer({...editingCustomer, telefon: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Adres */}
                    <div className="row">
                      <div className="col-md-8">
                        <div className="mb-3">
                          <label className="form-label">Adres (ulica i numer)</label>
                          <input
                            type="text"
                            className="form-control"
                            value={editingCustomer.adres || ''}
                            onChange={(e) => setEditingCustomer({...editingCustomer, adres: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="mb-3">
                          <label className="form-label">Kod pocztowy</label>
                          <input
                            type="text"
                            className="form-control"
                            value={editingCustomer.kod_pocztowy || ''}
                            onChange={(e) => setEditingCustomer({...editingCustomer, kod_pocztowy: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-4">
                        <div className="mb-3">
                          <label className="form-label">Miasto</label>
                          <input
                            type="text"
                            className="form-control"
                            value={editingCustomer.miasto || ''}
                            onChange={(e) => setEditingCustomer({...editingCustomer, miasto: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="d-flex gap-2">
                      <button type="submit" className="btn btn-success">Zapisz zmiany</button>
                      <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                        Anuluj
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomersPage;
