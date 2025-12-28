import React, { useState, useEffect } from 'react';
import categoryService from '../../services/categoryService';
import { warehouseService } from '../../services/warehouseService';

const InlineProductEdit = ({ product, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    product_code: '',
    description: '',
    cena_sprzedazy_netto: 0,
    cena_sprzedazy_brutto: 0,
    cena_zakupu_netto: 0,
    cena_zakupu_brutto: 0,
    category: '',
    category_id: '', // Dodano category_id
    unit: '',
    tax_rate: 23
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [vatRates, setVatRates] = useState([]);
  const [categories, setCategories] = useState([]); // Dodano categories statete, useEffect } from 'react';
import categoryService from '../../services/categoryService';
import { warehouseService } from '../../services/warehouseService';

const InlineProductEdit = ({ product, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    product_code: '',
    description: '',
    cena_sprzedazy_netto: 0,
    cena_sprzedazy_brutto: 0,
    cena_zakupu_netto: 0,
    cena_zakupu_brutto: 0,
    category: '',
    unit: '',
    tax_rate: 23
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [vatRates, setVatRates] = useState([]);

  // Załaduj stawki VAT i kategorie przy inicjalizacji
  useEffect(() => {
    const loadVatRates = async () => {
      try {
        const result = await warehouseService.getVatRates();
        if (result.success) {
          setVatRates(result.data);
        }
      } catch (error) {
        console.error('Błąd ładowania stawek VAT:', error);
      }
    };

    const loadCategories = async () => {
      try {
        const categoriesData = await categoryService.getCategoriesFlat();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Błąd ładowania kategorii:', error);
      }
    };

    loadVatRates();
    loadCategories();
  }, []);  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        barcode: product.barcode || '',
        product_code: product.product_code || '',
        description: product.description || '',
        cena_sprzedazy_netto: product.cena_sprzedazy_netto || product.price_net || 0,
        cena_sprzedazy_brutto: product.cena_sprzedazy_brutto || product.price || 0,
        cena_zakupu_netto: product.cena_zakupu_netto || 0,
        cena_zakupu_brutto: product.cena_zakupu_brutto || product.purchase_price || 0,
        category: product.category || '',
        category_id: product.category_id || '', // Dodano category_id
        unit: product.unit || 'szt',
        tax_rate: product.tax_rate || 23
      });
      setErrors({});
    }
  }, [product]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Dla pól cenowych automatycznie oblicz odpowiadające pole netto/brutto
    if (name.includes('cena_') && name.includes('_netto')) {
      const brutoName = name.replace('_netto', '_brutto');
      const netValue = parseFloat(value) || 0;
      const bruttoValue = netValue * (1 + (formData.tax_rate / 100));
      
      setFormData(prev => ({
        ...prev,
        [name]: netValue,
        [brutoName]: Math.round(bruttoValue * 100) / 100
      }));
    } else if (name.includes('cena_') && name.includes('_brutto')) {
      const nettoName = name.replace('_brutto', '_netto');
      const bruttoValue = parseFloat(value) || 0;
      const netValue = bruttoValue / (1 + (formData.tax_rate / 100));
      
      setFormData(prev => ({
        ...prev,
        [name]: bruttoValue,
        [nettoName]: Math.round(netValue * 100) / 100
      }));
    } else if (name === 'tax_rate') {
      // Przy zmianie VAT przelicz ceny brutto na podstawie netto
      const newTaxRate = parseFloat(value) || 0;
      const vat_multiplier = 1 + (newTaxRate / 100);
      
      setFormData(prev => ({
        ...prev,
        [name]: newTaxRate,
        cena_sprzedazy_brutto: Math.round(prev.cena_sprzedazy_netto * vat_multiplier * 100) / 100,
        cena_zakupu_brutto: Math.round(prev.cena_zakupu_netto * vat_multiplier * 100) / 100
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
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
    
    if (formData.cena_sprzedazy_brutto < 0) {
      newErrors.cena_sprzedazy_brutto = 'Cena sprzedaży brutto nie może być ujemna';
    }
    
    if (formData.cena_sprzedazy_netto < 0) {
      newErrors.cena_sprzedazy_netto = 'Cena sprzedaży netto nie może być ujemna';
    }
    
    if (formData.cena_zakupu_brutto < 0) {
      newErrors.cena_zakupu_brutto = 'Cena zakupu brutto nie może być ujemna';
    }
    
    if (formData.cena_zakupu_netto < 0) {
      newErrors.cena_zakupu_netto = 'Cena zakupu netto nie może być ujemna';
    }
    
    if (formData.tax_rate < 0 || formData.tax_rate > 100) {
      newErrors.tax_rate = 'Stawka VAT musi być między 0% a 100%';
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
      cena_sprzedazy_netto: product.cena_sprzedazy_netto || product.price_net || 0,
      cena_sprzedazy_brutto: product.cena_sprzedazy_brutto || product.price || 0,
      cena_zakupu_netto: product.cena_zakupu_netto || 0,
      cena_zakupu_brutto: product.cena_zakupu_brutto || product.purchase_price || 0,
      category: product.category || '',
      category_id: product.category_id || '', // Dodano category_id
      unit: product.unit || 'szt',
      tax_rate: product.tax_rate || 23
    });
    setErrors({});
    onCancel();
  };

  return (
    <div style={{ 
      width: '100%', 
      backgroundColor: 'white',
      border: '1px solid #0d6efd',
      borderRadius: '0.375rem',
      padding: '0.75rem',
      margin: '0.25rem 0',
      boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
      overflowX: 'visible'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '0.5rem',
        width: '100%'
      }}>
        <h6 className="mb-0 text-primary fw-bold" style={{ fontSize: '0.85rem' }}>
          <i className="fas fa-edit me-1"></i>
          Edytuj produkt #{product?.id}
        </h6>
        <div style={{ 
          display: 'flex', 
          gap: '0.25rem', 
          alignItems: 'center'
        }}>
          <button 
            type="submit" 
            form="product-edit-form"
            className="btn btn-primary btn-sm"
            disabled={loading}
            style={{ fontSize: '0.7rem', padding: '4px 8px' }}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" style={{ width: '0.8rem', height: '0.8rem' }}></span>
                Zapisz...
              </>
            ) : (
              <>
                <i className="fas fa-save me-1"></i>
                Zapisz
              </>
            )}
          </button>
          <button 
            type="button" 
            className="btn btn-outline-secondary btn-sm"
            onClick={handleCancel}
            disabled={loading}
            style={{ fontSize: '0.7rem', padding: '4px 8px' }}
          >
            <i className="fas fa-times me-1"></i>
            Anuluj
          </button>
        </div>
      </div>
      
      {errors.general && (
        <div className="alert alert-danger alert-sm mb-2" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
          {errors.general}
        </div>
      )}
      
      <form id="product-edit-form" onSubmit={handleSubmit}>
        {/* Rząd 1: Nazwa produktu i opis obok siebie (70% / 30%) */}
        <div className="row g-2 mb-2" style={{ width: '100%', margin: 0 }}>
          <div style={{ 
            width: '70%', 
            paddingLeft: '0.5rem', 
            paddingRight: '0.5rem',
            boxSizing: 'border-box'
          }}>
            <label style={{ 
              fontSize: '0.75rem', 
              fontWeight: '600',
              color: '#0d6efd',
              display: 'block',
              marginBottom: '0.25rem'
            }}>
              <i className="fas fa-tag me-1"></i>
              Nazwa produktu *
            </label>
            
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Wprowadź pełną nazwę produktu..."
              disabled={loading}
              required
              style={{ 
                fontSize: '0.85rem',
                fontWeight: '500',
                padding: '8px 12px',
                minHeight: '36px',
                width: '100%',
                border: '1px solid #ced4da',
                borderRadius: '0.375rem',
                boxSizing: 'border-box',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#86b7fe'}
              onBlur={(e) => e.target.style.borderColor = '#ced4da'}
            />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <div style={{ fontSize: '0.65rem', color: '#6c757d' }}>
                Długość: {formData.name.length} znaków
              </div>
              {errors.name && (
                <div style={{ fontSize: '0.7rem', color: '#dc3545' }}>{errors.name}</div>
              )}
            </div>
          </div>

          <div style={{ 
            width: '30%', 
            paddingLeft: '0.5rem', 
            paddingRight: '0.5rem',
            boxSizing: 'border-box'
          }}>
            <label style={{ 
              fontSize: '0.75rem', 
              fontWeight: '600',
              color: '#6c757d',
              display: 'block',
              marginBottom: '0.25rem'
            }}>
              <i className="fas fa-align-left me-1"></i>Opis
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Opis produktu..."
              rows="2"
              disabled={loading}
              style={{ 
                fontSize: '0.75rem', 
                padding: '8px 12px', 
                resize: 'vertical', 
                minHeight: '36px',
                width: '100%',
                border: '1px solid #ced4da',
                borderRadius: '0.375rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Rząd 2: Kody i kategoria - lepsze proporcje */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          marginBottom: '0.5rem',
          width: '100%',
          alignItems: 'end'
        }}>
          <div style={{ flex: '0 0 18%' }}>
            <label style={{ 
              fontSize: '0.65rem', 
              fontWeight: '600',
              color: '#17a2b8',
              display: 'block',
              marginBottom: '0.25rem'
            }}>
              <i className="fas fa-barcode me-1"></i>EAN
            </label>
            <input
              type="text"
              name="barcode"
              value={formData.barcode}
              onChange={handleChange}
              placeholder="EAN"
              disabled={loading}
              style={{ 
                fontSize: '0.7rem', 
                padding: '3px 5px', 
                minHeight: '26px',
                width: '100%',
                border: '1px solid #ced4da',
                borderRadius: '0.25rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ flex: '0 0 18%' }}>
            <label style={{ 
              fontSize: '0.65rem', 
              fontWeight: '600',
              color: '#17a2b8',
              display: 'block',
              marginBottom: '0.25rem'
            }}>
              <i className="fas fa-qrcode me-1"></i>Kod
            </label>
            <input
              type="text"
              name="product_code"
              value={formData.product_code}
              onChange={handleChange}
              placeholder="Kod"
              disabled={loading}
              style={{ 
                fontSize: '0.7rem', 
                padding: '3px 5px', 
                minHeight: '26px',
                width: '100%',
                border: '1px solid #ced4da',
                borderRadius: '0.25rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ flex: '0 0 22%' }}>
            <label style={{ 
              fontSize: '0.65rem', 
              fontWeight: '600',
              color: '#ffc107',
              display: 'block',
              marginBottom: '0.25rem'
            }}>
              <i className="fas fa-tags me-1"></i>Kategoria
            </label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              disabled={loading}
              style={{ 
                fontSize: '0.7rem', 
                padding: '3px 5px', 
                minHeight: '26px',
                width: '100%',
                border: '1px solid #ced4da',
                borderRadius: '0.25rem',
                boxSizing: 'border-box'
              }}
            >
              <option value="">-- Wybierz kategorię --</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.display_name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: '0 0 10%' }}>
            <label style={{ 
              fontSize: '0.65rem', 
              fontWeight: '600',
              color: '#6c757d',
              display: 'block',
              marginBottom: '0.25rem'
            }}>
              <i className="fas fa-ruler me-1"></i>Jedn
            </label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              disabled={loading}
              style={{ 
                fontSize: '0.7rem', 
                padding: '3px 5px', 
                minHeight: '26px',
                width: '100%',
                border: '1px solid #ced4da',
                borderRadius: '0.25rem',
                boxSizing: 'border-box'
              }}
            >
              <option value="szt">szt</option>
              <option value="kg">kg</option>
              <option value="l">l</option>
              <option value="m">m</option>
              <option value="opak">opak</option>
            </select>
          </div>

          <div style={{ flex: '0 0 18%' }}>
            <label style={{ 
              fontSize: '0.65rem', 
              fontWeight: '600',
              color: '#0d6efd',
              display: 'block',
              marginBottom: '0.25rem'
            }}>
              <i className="fas fa-percentage me-1"></i>Marża
            </label>
            <div style={{ 
              border: '1px solid #e9ecef',
              borderRadius: '0.25rem',
              backgroundColor: '#f8f9fa',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              minHeight: '26px',
              padding: '2px 4px'
            }}>
              {formData.cena_sprzedazy_brutto > 0 && formData.cena_zakupu_brutto > 0 ? (
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                  <span style={{ 
                    fontSize: '0.6rem', 
                    padding: '1px 3px',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    borderRadius: '0.25rem'
                  }}>
                    {(((formData.cena_sprzedazy_brutto - formData.cena_zakupu_brutto) / formData.cena_zakupu_brutto) * 100).toFixed(1)}%
                  </span>
                  <span style={{ 
                    fontSize: '0.6rem', 
                    padding: '1px 3px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    borderRadius: '0.25rem'
                  }}>
                    {(formData.cena_sprzedazy_brutto - formData.cena_zakupu_brutto).toFixed(2)}zł
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: '0.6rem', color: '#6c757d' }}>Uzupełnij</span>
              )}
            </div>
          </div>

          <div style={{ flex: '0 0 8%' }}>
            <label style={{ 
              fontSize: '0.65rem', 
              fontWeight: '600',
              color: '#ffc107',
              display: 'block',
              marginBottom: '0.25rem'
            }}>
              <i className="fas fa-receipt me-1"></i>VAT
            </label>
            <select
              name="tax_rate"
              value={formData.tax_rate}
              onChange={handleChange}
              disabled={loading}
              style={{ 
                fontSize: '0.6rem', 
                padding: '1px 2px', 
                minHeight: '26px',
                width: '100%',
                border: '1px solid #ced4da',
                borderRadius: '0.25rem',
                boxSizing: 'border-box'
              }}
            >
              {vatRates.map(rate => (
                <option key={rate.id} value={rate.rate} title={rate.description}>
                  {rate.rate}%
                </option>
              ))}
              {/* Fallback jeśli nie ma stawek z bazy */}
              {vatRates.length === 0 && (
                <>
                  <option value="23">23%</option>
                  <option value="8">8%</option>
                  <option value="5">5%</option>
                  <option value="0">0%</option>
                </>
              )}
            </select>
            {errors.tax_rate && (
              <div style={{ fontSize: '0.6rem', color: '#dc3545', marginTop: '2px' }}>
                {errors.tax_rate}
              </div>
            )}
          </div>
        </div>

        {/* Rząd 3: Ceny sprzedaży, zakupu i marża obok siebie - 33/33/33 */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '0.5rem',
          width: '100%'
        }}>
          <div style={{ flex: '1' }}>
            <label style={{ 
              fontSize: '0.7rem', 
              fontWeight: '600',
              color: '#28a745',
              display: 'block',
              marginBottom: '0.5rem'
            }}>
              <i className="fas fa-money-bill me-1"></i>Ceny sprzedaży
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: '1' }}>
                <label style={{ 
                  fontSize: '0.65rem', 
                  color: '#6c757d',
                  display: 'block',
                  marginBottom: '0.25rem'
                }}>Netto</label>
                <input
                  type="number"
                  name="cena_sprzedazy_netto"
                  value={formData.cena_sprzedazy_netto}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  disabled={loading}
                  style={{ 
                    fontSize: '0.75rem', 
                    padding: '4px 6px', 
                    minHeight: '28px',
                    width: '100%',
                    border: '1px solid #ced4da',
                    borderRadius: '0.25rem',
                    boxSizing: 'border-box'
                  }}
                />
                {errors.cena_sprzedazy_netto && (
                  <div style={{ fontSize: '0.6rem', color: '#dc3545', marginTop: '2px' }}>
                    {errors.cena_sprzedazy_netto}
                  </div>
                )}
              </div>
              <div style={{ flex: '1' }}>
                <label style={{ 
                  fontSize: '0.65rem', 
                  color: '#6c757d',
                  display: 'block',
                  marginBottom: '0.25rem'
                }}>Brutto</label>
                <input
                  type="number"
                  name="cena_sprzedazy_brutto"
                  value={formData.cena_sprzedazy_brutto}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  disabled={loading}
                  style={{ 
                    fontSize: '0.75rem', 
                    padding: '4px 6px', 
                    minHeight: '28px',
                    width: '100%',
                    border: '1px solid #ced4da',
                    borderRadius: '0.25rem',
                    boxSizing: 'border-box'
                  }}
                />
                {errors.cena_sprzedazy_brutto && (
                  <div style={{ fontSize: '0.6rem', color: '#dc3545', marginTop: '2px' }}>
                    {errors.cena_sprzedazy_brutto}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ flex: '1' }}>
            <label style={{ 
              fontSize: '0.7rem', 
              fontWeight: '600',
              color: '#17a2b8',
              display: 'block',
              marginBottom: '0.5rem'
            }}>
              <i className="fas fa-shopping-cart me-1"></i>Ceny zakupu
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: '1' }}>
                <label style={{ 
                  fontSize: '0.65rem', 
                  color: '#6c757d',
                  display: 'block',
                  marginBottom: '0.25rem'
                }}>Netto</label>
                <input
                  type="number"
                  name="cena_zakupu_netto"
                  value={formData.cena_zakupu_netto}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  disabled={loading}
                  style={{ 
                    fontSize: '0.75rem', 
                    padding: '4px 6px', 
                    minHeight: '28px',
                    width: '100%',
                    border: '1px solid #ced4da',
                    borderRadius: '0.25rem',
                    boxSizing: 'border-box'
                  }}
                />
                {errors.cena_zakupu_netto && (
                  <div style={{ fontSize: '0.6rem', color: '#dc3545', marginTop: '2px' }}>
                    {errors.cena_zakupu_netto}
                  </div>
                )}
              </div>
              <div style={{ flex: '1' }}>
                <label style={{ 
                  fontSize: '0.65rem', 
                  color: '#6c757d',
                  display: 'block',
                  marginBottom: '0.25rem'
                }}>Brutto</label>
                <input
                  type="number"
                  name="cena_zakupu_brutto"
                  value={formData.cena_zakupu_brutto}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  disabled={loading}
                  style={{ 
                    fontSize: '0.75rem', 
                    padding: '4px 6px', 
                    minHeight: '28px',
                    width: '100%',
                    border: '1px solid #ced4da',
                    borderRadius: '0.25rem',
                    boxSizing: 'border-box'
                  }}
                />
                {errors.cena_zakupu_brutto && (
                  <div style={{ fontSize: '0.6rem', color: '#dc3545', marginTop: '2px' }}>
                    {errors.cena_zakupu_brutto}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ flex: '1' }}>
            <label style={{ 
              fontSize: '0.7rem', 
              fontWeight: '600',
              color: '#6f42c1',
              display: 'block',
              marginBottom: '0.5rem'
            }}>
              <i className="fas fa-chart-line me-1"></i>Marża
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: '1' }}>
                <label style={{ 
                  fontSize: '0.65rem', 
                  color: '#6c757d',
                  display: 'block',
                  marginBottom: '0.25rem'
                }}>Procent</label>
                <div style={{ 
                  fontSize: '0.75rem', 
                  padding: '4px 6px', 
                  minHeight: '28px',
                  width: '100%',
                  border: '1px solid #e9ecef',
                  borderRadius: '0.25rem',
                  boxSizing: 'border-box',
                  backgroundColor: '#f8f9fa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {(() => {
                    const salePrice = parseFloat(formData.cena_sprzedazy_brutto || 0);
                    const purchasePrice = parseFloat(formData.cena_zakupu_brutto || 0);
                    
                    if (salePrice > 0 && purchasePrice > 0) {
                      const marginPercent = (((salePrice - purchasePrice) / purchasePrice) * 100);
                      return (
                        <span style={{
                          padding: '0.125rem 0.375rem',
                          fontSize: '0.65rem',
                          backgroundColor: marginPercent > 20 ? '#28a745' : marginPercent > 10 ? '#ffc107' : '#dc3545',
                          color: marginPercent > 10 ? 'white' : '#212529',
                          borderRadius: '0.25rem',
                          fontWeight: '600'
                        }}>
                          {marginPercent.toFixed(1)}%
                        </span>
                      );
                    }
                    return <span style={{ color: '#6c757d', fontSize: '0.7rem' }}>-</span>;
                  })()}
                </div>
              </div>
              <div style={{ flex: '1' }}>
                <label style={{ 
                  fontSize: '0.65rem', 
                  color: '#6c757d',
                  display: 'block',
                  marginBottom: '0.25rem'
                }}>Kwota</label>
                <div style={{ 
                  fontSize: '0.75rem', 
                  padding: '4px 6px', 
                  minHeight: '28px',
                  width: '100%',
                  border: '1px solid #e9ecef',
                  borderRadius: '0.25rem',
                  boxSizing: 'border-box',
                  backgroundColor: '#f8f9fa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {(() => {
                    const salePrice = parseFloat(formData.cena_sprzedazy_brutto || 0);
                    const purchasePrice = parseFloat(formData.cena_zakupu_brutto || 0);
                    
                    if (salePrice > 0 && purchasePrice > 0) {
                      const marginAmount = (salePrice - purchasePrice);
                      return (
                        <span style={{
                          padding: '0.125rem 0.375rem',
                          fontSize: '0.65rem',
                          backgroundColor: '#f8f9fa',
                          color: '#495057',
                          border: '1px solid #dee2e6',
                          borderRadius: '0.25rem'
                        }}>
                          {marginAmount.toFixed(2)}zł
                        </span>
                      );
                    }
                    return <span style={{ color: '#6c757d', fontSize: '0.7rem' }}>-</span>;
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rząd 4: Przyciski akcji */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '0.5rem', 
          marginTop: '1rem',
          borderTop: '1px solid #e9ecef',
          paddingTop: '0.75rem'
        }}>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            style={{ 
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              border: '1px solid #6c757d',
              borderRadius: '0.25rem',
              backgroundColor: 'white',
              color: '#6c757d',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            <i className="fas fa-times me-1"></i>
            Anuluj
          </button>
          
          <button
            type="submit"
            disabled={loading}
            style={{ 
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              border: '1px solid #0d6efd',
              borderRadius: '0.25rem',
              backgroundColor: '#0d6efd',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-check'} me-1`}></i>
            {loading ? 'Zapisz...' : 'Zapisz'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InlineProductEdit;
