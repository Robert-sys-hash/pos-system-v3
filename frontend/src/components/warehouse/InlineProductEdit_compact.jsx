import React, { useState, useEffect } from 'react';

const InlineProductEdit = ({ product, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    product_code: '',
    description: '',
    price: 0,
    purchase_price: 0,
    category: '',
    unit: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        barcode: product.barcode || '',
        product_code: product.product_code || '',
        description: product.description || '',
        price: product.price || 0,
        purchase_price: product.purchase_price || 0,
        category: product.category || '',
        unit: product.unit || 'szt'
      });
      setErrors({});
    }
  }, [product]);

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
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Nazwa produktu jest wymagana';
    }
    
    if (formData.price < 0) {
      newErrors.price = 'Cena sprzedaży nie może być ujemna';
    }
    
    if (formData.purchase_price < 0) {
      newErrors.purchase_price = 'Cena zakupu nie może być ujemna';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      await onSave(product.id, formData);
    } catch (error) {
      console.error('Błąd podczas zapisywania produktu:', error);
      setErrors({
        general: error.message || 'Wystąpił błąd podczas zapisywania produktu'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: product.name || '',
      barcode: product.barcode || '',
      product_code: product.product_code || '',
      description: product.description || '',
      price: product.price || 0,
      purchase_price: product.purchase_price || 0,
      category: product.category || '',
      unit: product.unit || 'szt'
    });
    setErrors({});
    onCancel();
  };

  return (
    <div className="bg-white border rounded p-3 mb-2 shadow-sm" style={{ minWidth: '100%' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0 text-primary" style={{ fontSize: '0.95rem' }}>
          <i className="fas fa-edit me-2"></i>
          Edytuj produkt #{product?.id}
        </h6>
        <button 
          type="button" 
          className="btn btn-sm btn-outline-secondary"
          onClick={handleCancel}
          disabled={loading}
          style={{ fontSize: '0.8rem' }}
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      {errors.general && (
        <div className="alert alert-danger alert-sm mb-3" style={{ fontSize: '0.85rem' }}>
          {errors.general}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          {/* Nazwa produktu */}
          <div className="col-12">
            <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.85rem' }}>
              <i className="fas fa-tag text-primary me-1"></i>
              Nazwa produktu *
            </label>
            <textarea
              className={`form-control ${errors.name ? 'is-invalid' : ''}`}
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Wprowadź pełną nazwę produktu..."
              disabled={loading}
              required
              rows="2"
              style={{ 
                fontSize: '0.9rem',
                fontWeight: '500',
                lineHeight: '1.3',
                resize: 'vertical',
                minHeight: '60px'
              }}
            />
            {errors.name && (
              <div className="invalid-feedback">{errors.name}</div>
            )}
            <div className="form-text" style={{ fontSize: '0.7rem' }}>
              Długość: <span className="badge bg-info">{formData.name.length}</span> znaków
            </div>
          </div>

          {/* Kody i kategoria */}
          <div className="col-md-4">
            <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.85rem' }}>
              <i className="fas fa-barcode text-info me-1"></i>
              Kod EAN
            </label>
            <input
              type="text"
              className={`form-control ${errors.barcode ? 'is-invalid' : ''}`}
              name="barcode"
              value={formData.barcode}
              onChange={handleChange}
              placeholder="np. 5901234567890"
              disabled={loading}
              style={{ fontSize: '0.85rem' }}
            />
            {errors.barcode && (
              <div className="invalid-feedback">{errors.barcode}</div>
            )}
          </div>

          <div className="col-md-4">
            <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.85rem' }}>
              <i className="fas fa-qrcode text-info me-1"></i>
              Kod produktu
            </label>
            <input
              type="text"
              className={`form-control ${errors.product_code ? 'is-invalid' : ''}`}
              name="product_code"
              value={formData.product_code}
              onChange={handleChange}
              placeholder="np. PROD-001"
              disabled={loading}
              style={{ fontSize: '0.85rem' }}
            />
            {errors.product_code && (
              <div className="invalid-feedback">{errors.product_code}</div>
            )}
          </div>

          <div className="col-md-4">
            <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.85rem' }}>
              <i className="fas fa-tags text-warning me-1"></i>
              Kategoria
            </label>
            <input
              type="text"
              className="form-control"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="Kategoria produktu"
              disabled={loading}
              style={{ fontSize: '0.85rem' }}
            />
          </div>

          {/* Ceny */}
          <div className="col-md-4">
            <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.85rem' }}>
              <i className="fas fa-money-bill text-success me-1"></i>
              Cena sprzedaży
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
                style={{ fontSize: '0.85rem' }}
              />
              <span className="input-group-text" style={{ fontSize: '0.8rem' }}>zł</span>
              {errors.price && (
                <div className="invalid-feedback">{errors.price}</div>
              )}
            </div>
          </div>

          <div className="col-md-4">
            <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.85rem' }}>
              <i className="fas fa-shopping-cart text-info me-1"></i>
              Cena zakupu
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
                style={{ fontSize: '0.85rem' }}
              />
              <span className="input-group-text" style={{ fontSize: '0.8rem' }}>zł</span>
              {errors.purchase_price && (
                <div className="invalid-feedback">{errors.purchase_price}</div>
              )}
            </div>
          </div>

          <div className="col-md-4">
            <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.85rem' }}>
              <i className="fas fa-ruler text-secondary me-1"></i>
              Jednostka
            </label>
            <select
              className="form-select"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              disabled={loading}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="szt">szt.</option>
              <option value="kg">kg</option>
              <option value="l">l</option>
              <option value="m">m</option>
              <option value="opak">opak.</option>
            </select>
          </div>

          {/* Marża */}
          {formData.price > 0 && formData.purchase_price > 0 && (
            <div className="col-12">
              <div className="alert alert-info py-2 mb-2" style={{ fontSize: '0.8rem' }}>
                <i className="fas fa-calculator me-2"></i>
                <strong>Marża:</strong> {(((formData.price - formData.purchase_price) / formData.purchase_price) * 100).toFixed(1)}%
                <span className="ms-3">
                  <strong>Zysk:</strong> {(formData.price - formData.purchase_price).toFixed(2)} zł
                </span>
              </div>
            </div>
          )}

          {/* Opis */}
          <div className="col-12">
            <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.85rem' }}>
              <i className="fas fa-align-left text-secondary me-1"></i>
              Opis produktu
            </label>
            <textarea
              className="form-control"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Dodatkowy opis produktu..."
              rows="2"
              disabled={loading}
              style={{ fontSize: '0.85rem', resize: 'vertical' }}
            />
          </div>
        </div>
        
        <div className="d-flex justify-content-end gap-2 mt-3 pt-2 border-top">
          <button 
            type="button" 
            className="btn btn-secondary btn-sm px-3"
            onClick={handleCancel}
            disabled={loading}
            style={{ fontSize: '0.85rem' }}
          >
            <i className="fas fa-times me-1"></i>
            Anuluj
          </button>
          <button 
            type="submit" 
            className="btn btn-primary btn-sm px-3"
            disabled={loading}
            style={{ fontSize: '0.85rem' }}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
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
  );
};

export default InlineProductEdit;
