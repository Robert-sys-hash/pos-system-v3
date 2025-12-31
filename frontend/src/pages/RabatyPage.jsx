import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaPercent, FaEuroSign, FaCheck, FaTimes, FaEye, FaCalendarAlt, FaUser } from 'react-icons/fa';

const RabatyPage = () => {
  const [rabaty, setRabaty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRabat, setEditingRabat] = useState(null);
  const [stats, setStats] = useState({});
  const [selectedView, setSelectedView] = useState('lista'); // 'lista', 'raporty', 'stats'
  const [transakcjeZRabatami, setTransakcjeZRabatami] = useState([]);
  const [loadingRaporty, setLoadingRaporty] = useState(false);

  const [formData, setFormData] = useState({
    nazwa: '',
    typ_rabatu: 'procentowy',
    wartosc: '',
    opis: '',
    kod_rabatu: '',
    wymagane_uprawnienie: 'pracownik',
    limit_miesieczny_aktywny: false,
    limit_miesieczny_kwota: '',
    limit_miesieczny_ilosc: '',
    limit_dzienny_aktywny: false,
    limit_dzienny_kwota: '',
    limit_dzienny_ilosc: '',
    minimum_koszyka: '',
    maksimum_koszyka: ''
  });

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

  useEffect(() => {
    loadRabaty();
    loadStats();
  }, []);

  useEffect(() => {
    if (selectedView === 'raporty') {
      loadTransakcjeZRabatami();
    }
  }, [selectedView]);

  const loadTransakcjeZRabatami = async () => {
    setLoadingRaporty(true);
    try {
      const response = await fetch(`${API_BASE}/transactions?status=all&limit=100`);
      if (response.ok) {
        const data = await response.json();
        const transakcje = data.data?.transactions || data.transactions || [];
        setTransakcjeZRabatami(transakcje.filter(t => t.rabat_kwota > 0 || t.rabat_procent > 0));
      }
    } catch (error) {
      console.error('Błąd ładowania transakcji z rabatami:', error);
    } finally {
      setLoadingRaporty(false);
    }
  };

  const loadRabaty = async () => {
    try {
      const response = await fetch(`${API_BASE}/rabaty`);
      if (response.ok) {
        const data = await response.json();
        setRabaty(data.data.rabaty || []);
      } else {
        setError('Błąd podczas ładowania rabatów');
      }
    } catch (error) {
      setError('Błąd połączenia z serwerem');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/rabaty/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.data || {});
      }
    } catch (error) {
      console.error('Błąd ładowania statystyk:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingRabat 
        ? `${API_BASE}/rabaty/${editingRabat.id}`
        : `${API_BASE}/rabaty`;
        
      const method = editingRabat ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowModal(false);
        setEditingRabat(null);
        resetForm();
        loadRabaty();
        loadStats();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Błąd podczas zapisywania rabatu');
      }
    } catch (error) {
      setError('Błąd połączenia z serwerem');
    }
  };

  const handleDelete = async (rabatId) => {
    if (!window.confirm('Czy na pewno chcesz dezaktywować ten rabat?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/rabaty/${rabatId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadRabaty();
        loadStats();
      } else {
        setError('Błąd podczas usuwania rabatu');
      }
    } catch (error) {
      setError('Błąd połączenia z serwerem');
    }
  };

  const resetForm = () => {
    setFormData({
      nazwa: '',
      typ_rabatu: 'procentowy',
      wartosc: '',
      opis: '',
      kod_rabatu: '',
      wymagane_uprawnienie: 'pracownik',
      limit_miesieczny_aktywny: false,
      limit_miesieczny_kwota: '',
      limit_miesieczny_ilosc: '',
      limit_dzienny_aktywny: false,
      limit_dzienny_kwota: '',
      limit_dzienny_ilosc: '',
      minimum_koszyka: '',
      maksimum_koszyka: ''
    });
  };

  const openEditModal = (rabat) => {
    setEditingRabat(rabat);
    setFormData({ ...rabat });
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingRabat(null);
    resetForm();
    setShowModal(true);
  };

  const getRabatStatusIcon = (rabat) => {
    if (rabat.status_dostepnosci === 'DOSTEPNY') {
      return <FaCheck className="text-success" />;
    } else {
      return <FaTimes className="text-danger" />;
    }
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
    <div className="container-fluid py-3">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header py-2">
              <div className="d-flex justify-content-between align-items-center">
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>🏷️ Rabaty</h2>
                <div className="d-flex gap-2">
                  {/* Navigation buttons */}
                  <div className="btn-group btn-group-sm" role="group">
                    <button
                      type="button"
                      className={`btn ${selectedView === 'lista' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setSelectedView('lista')}
                    >
                      Lista
                    </button>
                    <button
                      type="button"
                      className={`btn ${selectedView === 'raporty' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setSelectedView('raporty')}
                    >
                      Raporty
                    </button>
                    <button
                      type="button"
                      className={`btn ${selectedView === 'stats' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setSelectedView('stats')}
                    >
                      Statystyki
                    </button>
                  </div>
                  {selectedView === 'lista' && (
                    <button
                      className="btn btn-success"
                      onClick={openAddModal}
                    >
                      <FaPlus className="me-2" />
                      Dodaj Rabat
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="card-body">
              {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  {error}
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setError('')}
                    aria-label="Close"
                  ></button>
                </div>
              )}

              {/* Lista Rabatów */}
              {selectedView === 'lista' && (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Nazwa</th>
                        <th>Typ</th>
                        <th>Wartość</th>
                        <th>Uprawnienia</th>
                        <th>Limity Miesięczne</th>
                        <th>Status</th>
                        <th>Użycia (Dziś/Miesiąc)</th>
                        <th>Akcje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rabaty.map((rabat) => (
                        <tr key={rabat.id}>
                          <td>
                            <div>
                              <strong>{rabat.nazwa}</strong>
                              {rabat.kod_rabatu && (
                                <div className="text-muted small">Kod: {rabat.kod_rabatu}</div>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${rabat.typ_rabatu === 'procentowy' ? 'bg-info' : 'bg-warning'}`}>
                              {rabat.typ_rabatu === 'procentowy' ? (
                                <><FaPercent className="me-1" />Procentowy</>
                              ) : (
                                <><FaEuroSign className="me-1" />Kwotowy</>
                              )}
                            </span>
                          </td>
                          <td>
                            <strong>
                              {rabat.wartosc}{rabat.typ_rabatu === 'procentowy' ? '%' : ' zł'}
                            </strong>
                            {rabat.minimum_koszyka > 0 && (
                              <div className="text-muted small">Min: {rabat.minimum_koszyka} zł</div>
                            )}
                          </td>
                          <td>
                            <span className="badge bg-secondary">
                              {rabat.wymagane_uprawnienie}
                            </span>
                          </td>
                          <td>
                            {rabat.limit_miesieczny_aktywny ? (
                              <div className="small">
                                {rabat.limit_miesieczny_kwota > 0 && (
                                  <div>Kwota: {rabat.limit_miesieczny_kwota} zł</div>
                                )}
                                {rabat.limit_miesieczny_ilosc > 0 && (
                                  <div>Ilość: {rabat.limit_miesieczny_ilosc}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted">Brak limitów</span>
                            )}
                          </td>
                          <td>
                            {getRabatStatusIcon(rabat)}
                            <span className={`ms-2 ${rabat.aktywny ? 'text-success' : 'text-danger'}`}>
                              {rabat.aktywny ? 'Aktywny' : 'Nieaktywny'}
                            </span>
                          </td>
                          <td>
                            <div className="small">
                              <div>Dziś: {rabat.uzycia_dzisiaj || 0} ({(rabat.kwota_rabatow_dzisiaj || 0).toFixed(2)} zł)</div>
                              <div>Miesiąc: {rabat.uzycia_ten_miesiac || 0} ({(rabat.kwota_rabatow_ten_miesiac || 0).toFixed(2)} zł)</div>
                            </div>
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-outline-primary"
                                onClick={() => openEditModal(rabat)}
                                title="Edytuj"
                              >
                                <FaEdit />
                              </button>
                              <button
                                className="btn btn-outline-danger"
                                onClick={() => handleDelete(rabat.id)}
                                title="Dezaktywuj"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Statystyki */}
              {selectedView === 'stats' && (
                <div className="row">
                  <div className="col-md-3">
                    <div className="card bg-primary text-white">
                      <div className="card-body">
                        <h5 className="card-title">Wszystkie Rabaty</h5>
                        <h3>{stats.rabaty?.total_rabaty || 0}</h3>
                        <small>Aktywne: {stats.rabaty?.aktywne_rabaty || 0}</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-success text-white">
                      <div className="card-body">
                        <h5 className="card-title">Użycia Dziś</h5>
                        <h3>{stats.uzycie?.uzycia_dzisiaj || 0}</h3>
                        <small>{(stats.uzycie?.rabaty_dzisiaj || 0).toFixed(2)} zł</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-info text-white">
                      <div className="card-body">
                        <h5 className="card-title">Użycia Ten Miesiąc</h5>
                        <h3>{stats.uzycie?.uzycia_ten_miesiac || 0}</h3>
                        <small>{(stats.uzycie?.rabaty_ten_miesiac || 0).toFixed(2)} zł</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-warning text-white">
                      <div className="card-body">
                        <h5 className="card-title">Łącznie</h5>
                        <h3>{stats.uzycie?.total_uzyc || 0}</h3>
                        <small>{(stats.uzycie?.suma_rabatow || 0).toFixed(2)} zł</small>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Raporty */}
              {selectedView === 'raporty' && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Historia transakcji z rabatami</h5>
                    <button 
                      className="btn btn-outline-primary btn-sm"
                      onClick={loadTransakcjeZRabatami}
                      disabled={loadingRaporty}
                    >
                      {loadingRaporty ? 'Ładowanie...' : 'Odśwież'}
                    </button>
                  </div>
                  
                  {loadingRaporty ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Ładowanie...</span>
                      </div>
                    </div>
                  ) : transakcjeZRabatami.length === 0 ? (
                    <div className="text-center py-5">
                      <FaCalendarAlt className="fa-3x text-muted mb-3" />
                      <h5 className="text-muted">Brak transakcji z rabatami</h5>
                      <p className="text-muted">Nie znaleziono żadnych transakcji z zastosowanymi rabatami</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-striped table-hover">
                        <thead className="table-dark">
                          <tr>
                            <th>Nr transakcji</th>
                            <th>Data</th>
                            <th>Kasjer</th>
                            <th className="text-end">Wartość brutto</th>
                            <th className="text-center">Rabat %</th>
                            <th className="text-end">Rabat kwota</th>
                            <th className="text-end">Po rabacie</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transakcjeZRabatami.map((t) => (
                            <tr key={t.id}>
                              <td><code>{t.numer_transakcji || t.numer_paragonu || `#${t.id}`}</code></td>
                              <td>{t.data_transakcji || t.created_at?.split('T')[0]}</td>
                              <td>{t.kasjer_login || t.kasjer || '-'}</td>
                              <td className="text-end">{(t.suma_brutto || 0).toFixed(2)} zł</td>
                              <td className="text-center">
                                {t.rabat_procent > 0 && (
                                  <span className="badge bg-info">{t.rabat_procent}%</span>
                                )}
                              </td>
                              <td className="text-end text-danger fw-bold">
                                -{(t.rabat_kwota || 0).toFixed(2)} zł
                              </td>
                              <td className="text-end text-success fw-bold">
                                {((t.suma_brutto || 0) - (t.rabat_kwota || 0)).toFixed(2)} zł
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="table-secondary">
                          <tr>
                            <td colSpan="5" className="text-end fw-bold">Suma rabatów:</td>
                            <td className="text-end text-danger fw-bold">
                              -{transakcjeZRabatami.reduce((sum, t) => sum + (t.rabat_kwota || 0), 0).toFixed(2)} zł
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal do dodawania/edycji rabatu */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingRabat ? 'Edytuj Rabat' : 'Dodaj Nowy Rabat'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Nazwa rabatu *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.nazwa}
                          onChange={(e) => setFormData({ ...formData, nazwa: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Kod rabatu</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.kod_rabatu}
                          onChange={(e) => setFormData({ ...formData, kod_rabatu: e.target.value })}
                          placeholder="Opcjonalny kod"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Typ rabatu *</label>
                        <select
                          className="form-select"
                          value={formData.typ_rabatu}
                          onChange={(e) => setFormData({ ...formData, typ_rabatu: e.target.value })}
                        >
                          <option value="procentowy">Procentowy (%)</option>
                          <option value="kwotowy">Kwotowy (zł)</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Wartość * {formData.typ_rabatu === 'procentowy' ? '(%)' : '(zł)'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-control"
                          value={formData.wartosc}
                          onChange={(e) => setFormData({ ...formData, wartosc: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Opis</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={formData.opis}
                      onChange={(e) => setFormData({ ...formData, opis: e.target.value })}
                    ></textarea>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Wymagane uprawnienia</label>
                        <select
                          className="form-select"
                          value={formData.wymagane_uprawnienie}
                          onChange={(e) => setFormData({ ...formData, wymagane_uprawnienie: e.target.value })}
                        >
                          <option value="pracownik">Pracownik</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Minimalna wartość koszyka (zł)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-control"
                          value={formData.minimum_koszyka}
                          onChange={(e) => setFormData({ ...formData, minimum_koszyka: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Limity miesięczne */}
                  <div className="card mb-3">
                    <div className="card-header">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={formData.limit_miesieczny_aktywny}
                          onChange={(e) => setFormData({ ...formData, limit_miesieczny_aktywny: e.target.checked })}
                        />
                        <label className="form-check-label">
                          Aktywuj limity miesięczne
                        </label>
                      </div>
                    </div>
                    {formData.limit_miesieczny_aktywny && (
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">Limit kwotowy (zł/miesiąc)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="form-control"
                                value={formData.limit_miesieczny_kwota}
                                onChange={(e) => setFormData({ ...formData, limit_miesieczny_kwota: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">Limit ilościowy (użyć/miesiąc)</label>
                              <input
                                type="number"
                                min="0"
                                className="form-control"
                                value={formData.limit_miesieczny_ilosc}
                                onChange={(e) => setFormData({ ...formData, limit_miesieczny_ilosc: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Anuluj
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingRabat ? 'Zaktualizuj' : 'Dodaj'} Rabat
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RabatyPage;
