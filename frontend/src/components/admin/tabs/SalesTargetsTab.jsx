import React, { useState, useEffect } from 'react';
import { salesTargetService } from '../../../services/salesTargetService';
import { locationsService } from '../../../services/locationsService';
import { FaPlus, FaEdit, FaTrash, FaBullseye, FaSave, FaTimes } from 'react-icons/fa';

const SalesTargetsTab = () => {
  const [targets, setTargets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);
  const [formData, setFormData] = useState({
    location_id: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    target_amount: ''
  });

  useEffect(() => {
    loadTargets();
    loadLocations();
  }, []);

  const loadTargets = async () => {
    try {
      const response = await salesTargetService.getSalesTargetsWithStats();
      if (response.success) {
        setTargets(response.data.targets);
      }
    } catch (error) {
      console.error('Błąd ładowania celów:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await locationsService.getLocations();
      if (response.success && response.data) {
        setLocations(response.data);
      }
    } catch (error) {
      console.error('Błąd ładowania lokalizacji:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const response = await salesTargetService.setSalesTarget(formData);
      
      if (response.success) {
        alert('Cel sprzedaży został zapisany pomyślnie!');
        setShowAddForm(false);
        setEditingTarget(null);
        setFormData({
          location_id: '',
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
          target_amount: ''
        });
        await loadTargets();
      } else {
        alert('Błąd zapisywania celu: ' + response.error);
      }
    } catch (error) {
      alert('Wystąpił błąd podczas zapisywania celu');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (targetId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten cel sprzedaży?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await salesTargetService.deleteSalesTarget(targetId);
      
      if (response.success) {
        alert('Cel sprzedaży został usunięty');
        await loadTargets();
      } else {
        alert('Błąd usuwania celu: ' + response.error);
      }
    } catch (error) {
      alert('Wystąpił błąd podczas usuwania celu');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (target) => {
    setEditingTarget(target.id);
    setFormData({
      location_id: target.location_id,
      year: target.year,
      month: target.month,
      target_amount: target.target_amount
    });
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setShowAddForm(false);
    setEditingTarget(null);
    setFormData({
      location_id: '',
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      target_amount: ''
    });
  };

  const getMonthName = (month) => {
    const months = [
      'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
      'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
    ];
    return months[month - 1];
  };

  if (loading) {
    return <div className="text-center p-4">Ładowanie...</div>;
  }

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4><FaBullseye className="me-2" />Cele Sprzedaży</h4>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddForm(true)}
          disabled={loading}
        >
          <FaPlus className="me-1" />
          Dodaj Cel
        </button>
      </div>

      {showAddForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h5>{editingTarget ? 'Edytuj Cel Sprzedaży' : 'Dodaj Nowy Cel Sprzedaży'}</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-3 mb-3">
                  <label className="form-label">Lokalizacja</label>
                  <select
                    className="form-control"
                    value={formData.location_id}
                    onChange={(e) => setFormData({...formData, location_id: e.target.value})}
                    required
                  >
                    <option value="">Wybierz lokalizację</option>
                    {locations.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.nazwa}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-2 mb-3">
                  <label className="form-label">Rok</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.year}
                    onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                    min="2020"
                    max="2030"
                    required
                  />
                </div>

                <div className="col-md-2 mb-3">
                  <label className="form-label">Miesiąc</label>
                  <select
                    className="form-control"
                    value={formData.month}
                    onChange={(e) => setFormData({...formData, month: parseInt(e.target.value)})}
                    required
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(month => (
                      <option key={month} value={month}>
                        {getMonthName(month)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3 mb-3">
                  <label className="form-label">Cel sprzedaży (zł)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={formData.target_amount}
                    onChange={(e) => setFormData({...formData, target_amount: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="col-md-2 mb-3 d-flex align-items-end">
                  <button
                    type="submit"
                    className="btn btn-success me-2"
                    disabled={loading}
                  >
                    <FaSave className="me-1" />
                    Zapisz
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={cancelEdit}
                    disabled={loading}
                  >
                    <FaTimes className="me-1" />
                    Anuluj
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h5>Lista Celów Sprzedaży</h5>
        </div>
        <div className="card-body">
          {targets.length === 0 ? (
            <p className="text-muted text-center">Brak zdefiniowanych celów sprzedaży</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Lokalizacja</th>
                    <th>Rok</th>
                    <th>Miesiąc</th>
                    <th>Cel (zł)</th>
                    <th>Obecny obrót (zł)</th>
                    <th>Postęp</th>
                    <th>Do celu (zł)</th>
                    <th>Data utworzenia</th>
                    <th>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {targets.map(target => {
                    const progressPercentage = target.current_revenue > 0 ? 
                      Math.min((target.current_revenue / target.target_amount) * 100, 100) : 0;
                    const remaining = Math.max(target.target_amount - (target.current_revenue || 0), 0);
                    
                    return (
                      <tr key={target.id}>
                        <td>{target.location_name || 'Nieznana'}</td>
                        <td>{target.year}</td>
                        <td>{getMonthName(target.month)}</td>
                        <td className="fw-bold text-primary">
                          {parseFloat(target.target_amount).toLocaleString()} zł
                        </td>
                        <td className="fw-bold text-success">
                          {parseFloat(target.current_revenue || 0).toLocaleString()} zł
                        </td>
                        <td>
                          <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                            <div style={{
                              width: '100px',
                              height: '20px',
                              backgroundColor: '#e0e0e0',
                              borderRadius: '10px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${progressPercentage}%`,
                                height: '100%',
                                backgroundColor: progressPercentage >= 100 ? '#4caf50' : 
                                                progressPercentage >= 75 ? '#ff9800' : '#2196f3',
                                transition: 'width 0.3s ease'
                              }}></div>
                            </div>
                            <span style={{
                              color: progressPercentage >= 100 ? '#4caf50' : 
                                     progressPercentage >= 75 ? '#ff9800' : '#2196f3',
                              fontWeight: 'bold',
                              fontSize: '12px'
                            }}>
                              {progressPercentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td style={{
                          color: remaining === 0 ? '#4caf50' : '#666',
                          fontWeight: remaining === 0 ? 'bold' : 'normal'
                        }}>
                          {parseFloat(remaining).toLocaleString()} zł
                        </td>
                        <td>{new Date(target.created_at).toLocaleString('pl-PL')}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={() => startEdit(target)}
                            disabled={loading}
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(target.id)}
                            disabled={loading}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesTargetsTab;
