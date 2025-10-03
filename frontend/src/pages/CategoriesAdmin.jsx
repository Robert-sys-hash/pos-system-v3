import React, { useState, useEffect } from 'react';
import categoryService from '../services/categoryService';

const CategoriesAdmin = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const categoriesData = await categoryService.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      setError('Błąd podczas ładowania kategorii');
      console.error('Błąd:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Nazwa kategorii jest wymagana');
      return;
    }

    try {
      setError('');
      setSuccess('');

      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, formData);
        setSuccess('Kategoria została zaktualizowana');
      } else {
        await categoryService.createCategory(formData);
        setSuccess('Kategoria została utworzona');
      }

      await loadCategories();
      resetForm();
    } catch (error) {
      setError(error.response?.data?.message || 'Wystąpił błąd');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (categoryId, categoryName) => {
    if (!window.confirm(`Czy na pewno chcesz usunąć kategorię "${categoryName}"?`)) {
      return;
    }

    try {
      await categoryService.deleteCategory(categoryId);
      setSuccess('Kategoria została usunięta');
      await loadCategories();
    } catch (error) {
      setError(error.response?.data?.message || 'Błąd podczas usuwania kategorii');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setEditingCategory(null);
    setShowAddForm(false);
    setError('');
  };

  if (loading) {
    return (
      <div className="container-fluid mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Ładowanie...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="bi bi-tags me-2"></i>
          Zarządzanie kategoriami
        </h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <i className="bi bi-plus-circle me-2"></i>
          {showAddForm ? 'Anuluj' : 'Dodaj kategorię'}
        </button>
      </div>

      {/* Komunikaty */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {success}
          <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
        </div>
      )}

      {/* Formularz dodawania/edycji */}
      {showAddForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">
              {editingCategory ? 'Edycja kategorii' : 'Dodaj nową kategorię'}
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">
                      Nazwa kategorii *
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Np. Napoje, Nabiał, Pieczywo..."
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">
                      Opis (opcjonalny)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Krótki opis kategorii..."
                    />
                  </div>
                </div>
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-check-circle me-2"></i>
                  {editingCategory ? 'Zaktualizuj' : 'Dodaj'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  <i className="bi bi-x-circle me-2"></i>
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista kategorii */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">
            Lista kategorii ({categories.length})
          </h5>
        </div>
        <div className="card-body">
          {categories.length === 0 ? (
            <div className="text-center text-muted py-4">
              <i className="bi bi-tags fs-1 mb-3"></i>
              <p>Brak kategorii</p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowAddForm(true)}
              >
                Dodaj pierwszą kategorię
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-striped">
                <thead className="table-dark">
                  <tr>
                    <th>ID</th>
                    <th>Nazwa</th>
                    <th>Opis</th>
                    <th>Data utworzenia</th>
                    <th>Utworzył</th>
                    <th className="text-center">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td>
                        <span className="badge bg-secondary">#{category.id}</span>
                      </td>
                      <td>
                        <strong>{category.name}</strong>
                      </td>
                      <td>
                        <span className="text-muted">
                          {category.description || '—'}
                        </span>
                      </td>
                      <td>
                        <small className="text-muted">
                          {new Date(category.created_at).toLocaleDateString('pl-PL')}
                        </small>
                      </td>
                      <td>
                        <small className="text-muted">
                          {category.created_by}
                        </small>
                      </td>
                      <td className="text-center">
                        <div className="btn-group" role="group">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleEdit(category)}
                            title="Edytuj kategorię"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(category.id, category.name)}
                            title="Usuń kategorię"
                          >
                            <i className="bi bi-trash"></i>
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
  );
};

export default CategoriesAdmin;
