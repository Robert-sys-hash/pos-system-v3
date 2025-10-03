import React, { useState, useEffect } from 'react';
import categoryService from '../../services/categoryService';

const ProductEditModal = ({ product, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    product_code: '',
    description: '',
    price: 0,
    purchase_price: 0,
    category: '',
    category_id: '',
    unit: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);

  // Załaduj kategorie przy inicjalizacji
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await categoryService.getCategoriesFlat();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Błąd ładowania kategorii:', error);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        name: product.name || '',
        barcode: product.barcode || '',
        product_code: product.product_code || '',
        description: product.description || '',
        price: product.price || 0,
        purchase_price: product.purchase_price || 0,
        category: product.category || '',
        category_id: product.category_id || '',
        unit: product.unit || 'szt'
      });
      setErrors({});
    }
  }, [product, isOpen]);

  // Keyboard support for ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose, loading]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Wyczyść błąd dla tego pola
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nazwa produktu jest wymagana';
    }
    
    if (formData.price < 0) {
      newErrors.price = 'Cena nie może być ujemna';
    }
    
    if (formData.purchase_price < 0) {
      newErrors.purchase_price = 'Cena zakupu nie może być ujemna';
    }

    // Walidacja EAN (13 cyfr)
    if (formData.barcode && formData.barcode.length > 0) {
      if (!/^\d{13}$/.test(formData.barcode)) {
        newErrors.barcode = 'Kod EAN musi składać się z 13 cyfr';
      }
    }

    // Walidacja kodu produktu
    if (formData.product_code && formData.product_code.length > 0) {
      if (formData.product_code.length < 3) {
        newErrors.product_code = 'Kod produktu musi mieć co najmniej 3 znaki';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(product.id, formData);
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
      <div className="modal-dialog modal-xl" style={{ maxWidth: '90%', margin: '1rem auto' }}>
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fas fa-edit text-primary me-2"></i>
              Edytuj produkt #{product?.id}
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose}
              disabled={loading}
            ></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row g-3">
                {/* Nazwa produktu */}
                <div className="col-12">
                  <label className="form-label fw-semibold">
                    <i className="fas fa-tag text-muted me-1"></i>
                    Nazwa produktu *
                  </label>
                  <input
                    type="text"
                    className={`form-control form-control-lg ${errors.name ? 'is-invalid' : ''}`}
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Wprowadź nazwę produktu"
                    disabled={loading}
                    required
                    style={{ fontSize: '1.1rem' }}
                  />
                  {errors.name && (
                    <div className="invalid-feedback">{errors.name}</div>
                  )}
                </div>

                {/* Kody */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    <i className="fas fa-barcode text-muted me-1"></i>
                    Kod EAN
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.barcode ? 'is-invalid' : ''}`}
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleChange}
                    placeholder="Kod kreskowy EAN (13 cyfr)"
                    maxLength="13"
                    disabled={loading}
                  />
                  {errors.barcode && (
                    <div className="invalid-feedback">{errors.barcode}</div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    <i className="fas fa-qrcode text-muted me-1"></i>
                    Kod produktu
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.product_code ? 'is-invalid' : ''}`}
                    name="product_code"
                    value={formData.product_code}
                    onChange={handleChange}
                    placeholder="Kod wewnętrzny produktu"
                    disabled={loading}
                  />
                  {errors.product_code && (
                    <div className="invalid-feedback">{errors.product_code}</div>
                  )}
                </div>

                {/* Opis */}
                <div className="col-12">
                  <label className="form-label fw-semibold">
                    <i className="fas fa-align-left text-muted me-1"></i>
                    Opis produktu
                  </label>
                  <textarea
                    className="form-control"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Dodatkowy opis produktu"
                    rows="3"
                    disabled={loading}
                  />
                </div>

                {/* Ceny */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    <i className="fas fa-money-bill text-success me-1"></i>
                    Cena sprzedaży (brutto)
                  </label>
                  <div className="input-group">
                    <input
                      type="number"
                      className={`form-control ${errors.price ? 'is-invalid' : ''}`}
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      disabled={loading}
                    />
                    <span className="input-group-text">zł</span>
                    {errors.price && (
                      <div className="invalid-feedback">{errors.price}</div>
                    )}
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    <i className="fas fa-shopping-cart text-info me-1"></i>
                    Cena zakupu (netto)
                  </label>
                  <div className="input-group">
                    <input
                      type="number"
                      className={`form-control ${errors.purchase_price ? 'is-invalid' : ''}`}
                      name="purchase_price"
                      value={formData.purchase_price}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      disabled={loading}
                    />
                    <span className="input-group-text">zł</span>
                    {errors.purchase_price && (
                      <div className="invalid-feedback">{errors.purchase_price}</div>
                    )}
                  </div>
                </div>

                {/* Kategoria i jednostka */}
                <div className="col-md-8">
                  <label className="form-label fw-semibold">
                    <i className="fas fa-tags text-muted me-1"></i>
                    Kategoria
                  </label>
                  <select
                    className="form-select"
                    name="category_id"
                    value={formData.category_id || ''}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">-- Wybierz kategorię --</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.display_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold">
                    <i className="fas fa-ruler text-muted me-1"></i>
                    Jednostka
                  </label>
                  <select
                    className="form-select"
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="szt">szt.</option>
                    <option value="kg">kg</option>
                    <option value="l">l</option>
                    <option value="m">m</option>
                    <option value="opak">opak.</option>
                  </select>
                </div>

                {/* Kalkulacja marży */}
                {formData.price > 0 && formData.purchase_price > 0 && (
                  <div className="col-12">
                    <div className="alert alert-info">
                      <i className="fas fa-calculator me-2"></i>
                      <strong>Marża:</strong> {(((formData.price - formData.purchase_price) / formData.purchase_price) * 100).toFixed(2)}%
                      <span className="ms-3">
                        <strong>Zysk:</strong> {(formData.price - formData.purchase_price).toFixed(2)} zł
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onClose}
                disabled={loading}
              >
                <i className="fas fa-times me-1"></i>
                Anuluj
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Zapisywanie...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save me-1"></i>
                    Zapisz zmiany
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductEditModal;
