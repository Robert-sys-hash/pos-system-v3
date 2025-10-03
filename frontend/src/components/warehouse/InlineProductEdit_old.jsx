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
    } catch (error) {
      console.error('Error saving product:', error);
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
    <div className="bg-light border rounded p-3 mb-2" style={{ minWidth: '100%', maxWidth: 'none' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0 text-primary" style={{ fontSize: '1rem' }}>
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
      
      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          {/* Nazwa produktu - pełna szerokość */}
          <div className="col-12">
            <div className="card border-primary border-2">
              <div className="card-header bg-primary text-white py-2">
                <h6 className="mb-0" style={{ fontSize: '0.9rem' }}>
                  <i className="fas fa-tag me-2"></i>
                  Nazwa produktu *
                </h6>
              </div>
              <div className="card-body py-2 bg-light">
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
                    fontSize: '1rem',
                    fontWeight: '500',
                    lineHeight: '1.4',
                    resize: 'vertical',
                    minHeight: '70px',
                    padding: '10px',
                    borderRadius: '6px'
                  }}
                />
                {errors.name && (
                  <div className="invalid-feedback">{errors.name}</div>
                )}
                <div className="form-text mt-1" style={{ fontSize: '0.75rem' }}>
                  <i className="fas fa-info-circle me-1 text-primary"></i>
                  <strong>Długość:</strong> <span className="badge bg-info">{formData.name.length}</span> znaków
                </div>
              </div>
            </div>
          </div>

          {/* Kody w jednym rzędzie */}
          <div className="col-12">
            <div className="card border-info">
              <div className="card-header bg-info text-white py-2">
                <h6 className="mb-0" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-qrcode me-2"></i>
                  Kody identyfikacyjne
                </h6>
              </div>
              <div className="card-body py-2">
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.8rem' }}>
                      <i className="fas fa-barcode text-muted me-1"></i>
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
                      style={{ fontSize: '0.9rem' }}
                    />
                    {errors.barcode && (
                      <div className="invalid-feedback">{errors.barcode}</div>
                    )}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.8rem' }}>
                      <i className="fas fa-qrcode text-muted me-1"></i>
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
                      style={{ fontSize: '0.9rem' }}
                    />
                    {errors.product_code && (
                      <div className="invalid-feedback">{errors.product_code}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
                      value={formData.barcode}
                      onChange={handleChange}
                      placeholder="13-cyfrowy kod EAN"
                      maxLength="13"
                      disabled={loading}
                      style={{ fontSize: '1.1rem' }}
                    />
                    {errors.barcode && (
                      <div className="invalid-feedback">{errors.barcode}</div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-hashtag text-muted me-1"></i>
                      Kod produktu
                    </label>
                    <input
                      type="text"
                      className={`form-control form-control-lg ${errors.product_code ? 'is-invalid' : ''}`}
                      name="product_code"
                      value={formData.product_code}
                      onChange={handleChange}
                      placeholder="Kod wewnętrzny"
                      disabled={loading}
                      style={{ fontSize: '1.1rem' }}
                    />
                    {errors.product_code && (
                      <div className="invalid-feedback">{errors.product_code}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Opis produktu */}
          <div className="col-12">
            <div className="card border-secondary">
              <div className="card-header bg-secondary text-white">
                <h6 className="mb-0">
                  <i className="fas fa-align-left me-2"></i>
                  Opis produktu
                </h6>
              </div>
              <div className="card-body">
                <textarea
                  className="form-control form-control-lg"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Dodatkowy opis produktu..."
                  rows="4"
                  disabled={loading}
                  style={{ fontSize: '1.1rem' }}
                />
              </div>
            </div>
          </div>

          {/* Ceny w jednym rzędzie */}
          <div className="col-12">
            <div className="card border-success">
              <div className="card-header bg-success text-white">
                <h6 className="mb-0">
                  <i className="fas fa-money-bill-wave me-2"></i>
                  Ceny i marża
                </h6>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-money-bill text-success me-1"></i>
                      Cena sprzedaży (brutto)
                    </label>
                    <div className="input-group input-group-lg">
                      <input
                        type="number"
                        className={`form-control ${errors.price ? 'is-invalid' : ''}`}
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        disabled={loading}
                        style={{ fontSize: '1.1rem' }}
                      />
                      <span className="input-group-text">zł</span>
                      {errors.price && (
                        <div className="invalid-feedback">{errors.price}</div>
                      )}
                    </div>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-shopping-cart text-info me-1"></i>
                      Cena zakupu (netto)
                    </label>
                    <div className="input-group input-group-lg">
                      <input
                        type="number"
                        className={`form-control ${errors.purchase_price ? 'is-invalid' : ''}`}
                        name="purchase_price"
                        value={formData.purchase_price}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        disabled={loading}
                        style={{ fontSize: '1.1rem' }}
                      />
                      <span className="input-group-text">zł</span>
                      {errors.purchase_price && (
                        <div className="invalid-feedback">{errors.purchase_price}</div>
                      )}
                    </div>
                  </div>

                  <div className="col-md-4">
                    {/* Kalkulacja marży */}
                    {formData.price > 0 && formData.purchase_price > 0 && (
                      <div className="mt-4">
                        <div className="alert alert-info mb-0">
                          <div className="fw-bold">
                            <i className="fas fa-calculator me-2"></i>
                            Marża: {(((formData.price - formData.purchase_price) / formData.purchase_price) * 100).toFixed(1)}%
                          </div>
                          <div className="small">
                            Zysk: {(formData.price - formData.purchase_price).toFixed(2)} zł
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Kategoria i jednostka */}
          <div className="col-12">
            <div className="card border-warning">
              <div className="card-header bg-warning text-dark">
                <h6 className="mb-0">
                  <i className="fas fa-cogs me-2"></i>
                  Kategoria i jednostka
                </h6>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-tags text-muted me-1"></i>
                      Kategoria
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      placeholder="Kategoria produktu"
                      disabled={loading}
                      style={{ fontSize: '1.1rem' }}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-ruler text-muted me-1"></i>
                      Jednostka
                    </label>
                    <select
                      className="form-select form-select-lg"
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      disabled={loading}
                      style={{ fontSize: '1.1rem' }}
                    >
                      <option value="szt">szt.</option>
                      <option value="kg">kg</option>
                      <option value="l">l</option>
                      <option value="m">m</option>
                      <option value="opak">opak.</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="d-flex justify-content-end gap-3 mt-4 pt-3 border-top">
          <button 
            type="button" 
            className="btn btn-secondary btn-lg px-4"
            onClick={handleCancel}
            disabled={loading}
          >
            <i className="fas fa-times me-2"></i>
            Anuluj
          </button>
          <button 
            type="submit" 
            className="btn btn-primary btn-lg px-4"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Zapisywanie...
              </>
            ) : (
              <>
                <i className="fas fa-save me-2"></i>
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
