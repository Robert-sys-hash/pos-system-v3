import React, { useState, useEffect, useCallback } from 'react';
import categoryService from '../../services/categoryService';
import { warehouseService } from '../../services/warehouseService';
import { useMarginCalculation } from '../../utils/marginService';

const InlineProductEdit = ({ product, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    product_code: '',
    description: '',
    price: 0,
    purchase_price: 0,
    cena_sprzedazy_netto: 0,
    cena_sprzedazy_brutto: 0,
    cena_zakupu_netto: 0,
    cena_zakupu_brutto: 0,
    category: '',
    category_id: '',
    unit: '',
    tax_rate: 23
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [vatRates, setVatRates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [marginData, setMarginData] = useState(null);
  
  // Hook do obliczania marży
  const { calculateMargin, calculateProductMargin } = useMarginCalculation();

  // Załaduj stawki VAT i kategorie przy inicjalizacji
  useEffect(() => {
    const loadVatRates = async () => {
      try {
        const result = await warehouseService.getVatRates();
        if (result.success && result.data && result.data.rates) {
          setVatRates(result.data.rates);
        } else {
          // Fallback - podstawowe stawki VAT
          console.warn('Nie udało się załadować stawek VAT z API, używam domyślnych');
          setVatRates([
            { id: 1, rate: 23, description: 'Stawka standardowa VAT' },
            { id: 2, rate: 8, description: 'Stawka obniżona VAT' },
            { id: 3, rate: 5, description: 'Stawka preferencyjna VAT' },
            { id: 4, rate: 0, description: 'Zwolnienie z VAT' }
          ]);
        }
      } catch (error) {
        console.error('Błąd ładowania stawek VAT:', error);
        // Fallback - podstawowe stawki VAT
        setVatRates([
          { id: 1, rate: 23, description: 'Stawka standardowa VAT' },
          { id: 2, rate: 8, description: 'Stawka obniżona VAT' },
          { id: 3, rate: 5, description: 'Stawka preferencyjna VAT' },
          { id: 4, rate: 0, description: 'Zwolnienie z VAT' }
        ]);
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
  }, []);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        barcode: product.barcode || '',
        product_code: product.product_code || '',
        description: product.description || '',
        price: product.price || 0,
        purchase_price: product.purchase_price || 0,
        cena_sprzedazy_netto: product.cena_sprzedazy_netto || product.price_net || 0,
        cena_sprzedazy_brutto: product.cena_sprzedazy_brutto || product.price || 0,
        cena_zakupu_netto: product.cena_zakupu_netto || 0,
        cena_zakupu_brutto: product.cena_zakupu_brutto || product.purchase_price || 0,
        category: product.category || '',
        category_id: product.category_id || '',
        unit: product.unit || 'szt',
        tax_rate: product.tax_rate || 23
      });
      setErrors({});
    }
  }, [product]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    console.log('handleChange:', name, value, 'currentTaxRate:', formData.tax_rate);
    
    // Dla pól cenowych automatycznie oblicz odpowiadające pole netto/brutto
    if (name.includes('cena_') && name.includes('_netto')) {
      const brutoName = name.replace('_netto', '_brutto');
      const netValue = parseFloat(value) || 0;
      const currentTaxRate = parseFloat(formData.tax_rate) || 0;
      
      // Tylko jeśli podana wartość jest > 0, oblicz automatycznie
      if (netValue > 0) {
        const bruttoValue = netValue * (1 + (currentTaxRate / 100));
        
        console.log('Kalkulacja netto->brutto:', netValue, 'VAT:', currentTaxRate, 'brutto:', bruttoValue);
        
        setFormData(prev => ({
          ...prev,
          [name]: netValue,
          [brutoName]: Math.round(bruttoValue * 100) / 100
        }));
      } else {
        // Dla wartości 0 lub ujemnych, ustaw tylko podstawową wartość
        setFormData(prev => ({
          ...prev,
          [name]: netValue
        }));
      }
    } else if (name.includes('cena_') && name.includes('_brutto')) {
      const nettoName = name.replace('_brutto', '_netto');
      const bruttoValue = parseFloat(value) || 0;
      const currentTaxRate = parseFloat(formData.tax_rate) || 0;
      
      // Tylko jeśli podana wartość jest > 0, oblicz automatycznie
      if (bruttoValue > 0) {
        const netValue = currentTaxRate > 0 ? bruttoValue / (1 + (currentTaxRate / 100)) : bruttoValue;
        
        console.log('Kalkulacja brutto->netto:', bruttoValue, 'VAT:', currentTaxRate, 'netto:', netValue);
        
        setFormData(prev => ({
          ...prev,
          [name]: bruttoValue,
          [nettoName]: Math.round(netValue * 100) / 100
        }));
      } else {
        // Dla wartości 0 lub ujemnych, ustaw tylko podstawową wartość
        setFormData(prev => ({
          ...prev,
          [name]: bruttoValue
        }));
      }
    } else if (name === 'tax_rate') {
      // Przy zmianie VAT przelicz ceny brutto na podstawie netto
      const newTaxRate = parseFloat(value) || 0;
      const vat_multiplier = 1 + (newTaxRate / 100);
      
      console.log('Zmiana VAT:', newTaxRate, 'multiplier:', vat_multiplier);
      
      setFormData(prev => {
        const newData = {
          ...prev,
          [name]: newTaxRate,
          cena_sprzedazy_brutto: Math.round((prev.cena_sprzedazy_netto || 0) * vat_multiplier * 100) / 100,
          cena_zakupu_brutto: Math.round((prev.cena_zakupu_netto || 0) * vat_multiplier * 100) / 100
        };
        console.log('Nowe dane po zmianie VAT:', newData);
        return newData;
      });
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
  }, [formData.tax_rate, errors]);

  // Funkcja do aktualizacji marży w czasie rzeczywistym
  const updateMarginData = useCallback(async () => {
    const sellPrice = parseFloat(formData.cena_sprzedazy_netto) || parseFloat(formData.cena_sprzedazy_brutto);
    const buyPrice = parseFloat(formData.cena_zakupu_netto) || parseFloat(formData.cena_zakupu_brutto);
    
    if (sellPrice > 0 && buyPrice > 0) {
      try {
        // Jeśli mamy ID produktu, użyj calculate produktowego
        if (product?.id) {
          const result = await calculateProductMargin(product.id, sellPrice);
          setMarginData(result);
        } else {
          // Jeśli to nowy produkt, użyj podstawowego obliczenia
          const result = await calculateMargin(sellPrice, buyPrice);
          setMarginData(result);
        }
      } catch (error) {
        console.error('Błąd aktualizacji marży:', error);
        setMarginData(null);
      }
    } else {
      setMarginData(null);
    }
  }, [formData.cena_sprzedazy_netto, formData.cena_sprzedazy_brutto, 
      formData.cena_zakupu_netto, formData.cena_zakupu_brutto, 
      product?.id, calculateMargin, calculateProductMargin]);

  // Aktualizuj marżę gdy zmieniają się ceny
  useEffect(() => {
    updateMarginData();
  }, [updateMarginData]);

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
      cena_sprzedazy_netto: product.cena_sprzedazy_netto || product.price_net || 0,
      cena_sprzedazy_brutto: product.cena_sprzedazy_brutto || product.price || 0,
      cena_zakupu_netto: product.cena_zakupu_netto || 0,
      cena_zakupu_brutto: product.cena_zakupu_brutto || product.purchase_price || 0,
      category: product.category || '',
      category_id: product.category_id || '',
      unit: product.unit || 'szt',
      tax_rate: product.tax_rate || 23
    });
    setErrors({});
    onCancel();
  };

  return (
    <div className="bg-white border rounded p-2 mb-2 shadow-sm" style={{ minWidth: '100%' }}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0 text-primary" style={{ fontSize: '0.9rem' }}>
          <i className="fas fa-edit me-2"></i>
          Edytuj produkt #{product?.id}
        </h6>
        <button 
          type="button" 
          className="btn btn-sm btn-outline-secondary"
          onClick={handleCancel}
          disabled={loading}
          style={{ fontSize: '0.75rem' }}
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      {errors.general && (
        <div className="alert alert-danger alert-sm mb-2" style={{ fontSize: '0.8rem' }}>
          {errors.general}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="row g-1">
          {/* Nazwa produktu - bardziej kompaktowa */}
          <div className="col-12">
            <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.75rem' }}>
              <i className="fas fa-tag text-primary me-1"></i>
              Nazwa produktu *
            </label>
            <textarea
              className={`form-control form-control-sm ${errors.name ? 'is-invalid' : ''}`}
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Wprowadź pełną nazwę produktu..."
              disabled={loading}
              required
              rows="1"
              style={{ 
                fontSize: '0.8rem',
                fontWeight: '500',
                lineHeight: '1.2',
                resize: 'vertical',
                minHeight: '32px',
                padding: '0.25rem 0.5rem'
              }}
            />
            {errors.name && (
              <div className="invalid-feedback">{errors.name}</div>
            )}
          </div>

          {/* Kody i kategoria - jeszcze mniejsze */}
          <div className="col-md-2">
            <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.75rem' }}>
              <i className="fas fa-barcode text-info me-1"></i>
              EAN
            </label>
            <input
              type="text"
              className={`form-control form-control-sm ${errors.barcode ? 'is-invalid' : ''}`}
              name="barcode"
              value={formData.barcode}
              onChange={handleChange}
              placeholder="EAN 13"
              maxLength="13"
              disabled={loading}
              style={{ fontSize: '0.75rem' }}
            />
            {errors.barcode && (
              <div className="invalid-feedback">{errors.barcode}</div>
            )}
          </div>

          <div className="col-md-2">
            <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.75rem' }}>
              <i className="fas fa-qrcode text-info me-1"></i>
              Kod
            </label>
            <input
              type="text"
              className={`form-control form-control-sm ${errors.product_code ? 'is-invalid' : ''}`}
              name="product_code"
              value={formData.product_code}
              onChange={handleChange}
              placeholder="Kod"
              disabled={loading}
              style={{ fontSize: '0.75rem' }}
            />
            {errors.product_code && (
              <div className="invalid-feedback">{errors.product_code}</div>
            )}
          </div>

          <div className="col-md-3">
            <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.75rem' }}>
              <i className="fas fa-tags text-warning me-1"></i>
              Kategoria
            </label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              disabled={loading}
              className="form-select form-select-sm"
              style={{ fontSize: '0.75rem' }}
            >
              <option value="">-- Wybierz --</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Stawka VAT i jednostka - jeszcze mniejsze */}
          <div className="col-md-2">
            <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.75rem' }}>
              <i className="fas fa-percentage text-warning me-1"></i>
              VAT
            </label>
            <select
              name="tax_rate"
              value={formData.tax_rate}
              onChange={handleChange}
              disabled={loading}
              className={`form-select form-select-sm ${errors.tax_rate ? 'is-invalid' : ''}`}
              style={{ fontSize: '0.75rem' }}
            >
              {vatRates.map(rate => (
                <option key={rate.id} value={rate.rate} title={rate.description}>
                  {rate.rate}%
                </option>
              ))}
              {/* Zawsze pokazuj podstawowe stawki VAT dla pewności */}
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
              <div className="invalid-feedback">{errors.tax_rate}</div>
            )}
          </div>

          <div className="col-md-3">
            <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.75rem' }}>
              <i className="fas fa-ruler text-secondary me-1"></i>
              Jednostka
            </label>
            <select
              className="form-select form-select-sm"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              disabled={loading}
              style={{ fontSize: '0.75rem' }}
            >
              <option value="szt">szt.</option>
              <option value="kg">kg</option>
              <option value="l">l</option>
              <option value="m">m</option>
              <option value="opak">opak.</option>
            </select>
          </div>

          {/* Ceny - jeszcze bardziej kompaktowe */}
          <div className="col-md-3">
            <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.7rem' }}>
              <i className="fas fa-money-bill text-success me-1"></i>
              Sprzedaż netto
            </label>
            <div className="input-group input-group-sm">
              <input
                type="number"
                className={`form-control ${errors.cena_sprzedazy_netto ? 'is-invalid' : ''}`}
                name="cena_sprzedazy_netto"
                value={formData.cena_sprzedazy_netto}
                onChange={handleChange}
                step="0.01"
                min="0"
                disabled={loading}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              />
              <span className="input-group-text" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}>zł</span>
              {errors.cena_sprzedazy_netto && (
                <div className="invalid-feedback">{errors.cena_sprzedazy_netto}</div>
              )}
            </div>
          </div>

          <div className="col-md-3">
            <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.7rem' }}>
              <i className="fas fa-money-bill text-success me-1"></i>
              Sprzedaż brutto
            </label>
            <div className="input-group input-group-sm">
              <input
                type="number"
                className={`form-control ${errors.cena_sprzedazy_brutto ? 'is-invalid' : ''}`}
                name="cena_sprzedazy_brutto"
                value={formData.cena_sprzedazy_brutto}
                onChange={handleChange}
                step="0.01"
                min="0"
                disabled={loading}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              />
              <span className="input-group-text" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}>zł</span>
              {errors.cena_sprzedazy_brutto && (
                <div className="invalid-feedback">{errors.cena_sprzedazy_brutto}</div>
              )}
            </div>
          </div>

          <div className="col-md-3">
            <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.7rem' }}>
              <i className="fas fa-shopping-cart text-info me-1"></i>
              Zakup netto
            </label>
            <div className="input-group input-group-sm">
              <input
                type="number"
                className={`form-control ${errors.cena_zakupu_netto ? 'is-invalid' : ''}`}
                name="cena_zakupu_netto"
                value={formData.cena_zakupu_netto}
                onChange={handleChange}
                step="0.01"
                min="0"
                disabled={loading}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              />
              <span className="input-group-text" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}>zł</span>
              {errors.cena_zakupu_netto && (
                <div className="invalid-feedback">{errors.cena_zakupu_netto}</div>
              )}
            </div>
          </div>

          <div className="col-md-3">
            <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.7rem' }}>
              <i className="fas fa-shopping-cart text-info me-1"></i>
              Zakup brutto
            </label>
            <div className="input-group input-group-sm">
              <input
                type="number"
                className={`form-control ${errors.cena_zakupu_brutto ? 'is-invalid' : ''}`}
                name="cena_zakupu_brutto"
                value={formData.cena_zakupu_brutto}
                onChange={handleChange}
                step="0.01"
                min="0"
                disabled={loading}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              />
              <span className="input-group-text" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}>zł</span>
              {errors.cena_zakupu_brutto && (
                <div className="invalid-feedback">{errors.cena_zakupu_brutto}</div>
              )}
            </div>
          </div>

          {/* Marża - Używamy centralnego API */}
          {marginData && marginData.margin_percent !== undefined && (
            <div className="col-12">
              <div className="alert alert-success py-2 mb-2" style={{ fontSize: '0.8rem' }}>
                <i className="fas fa-calculator me-2"></i>
                <strong>Marża:</strong> {marginData.margin_percent.toFixed(1)}% 
                <span className="ms-2 small text-muted">({marginData.calculation_method})</span>
                <span className="ms-3">
                  <strong>Narzut:</strong> {marginData.markup_percent.toFixed(1)}%
                </span>
                <span className="ms-3">
                  <strong>Zysk:</strong> {marginData.profit_amount.toFixed(2)} zł
                </span>
                {marginData.error && (
                  <span className="ms-3 text-warning">
                    <i className="fas fa-exclamation-triangle me-1"></i>
                    {marginData.error}
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Fallback - lokalne obliczenia gdy API nie działa */}
          {!marginData && (parseFloat(formData.cena_sprzedazy_brutto) > 0 && parseFloat(formData.cena_zakupu_brutto) > 0) && (
            <div className="col-12">
              <div className="alert alert-warning py-2 mb-2" style={{ fontSize: '0.8rem' }}>
                <i className="fas fa-exclamation-triangle me-2"></i>
                <strong>Marża (lokalnie):</strong> {(((parseFloat(formData.cena_sprzedazy_brutto) - parseFloat(formData.cena_zakupu_brutto)) / parseFloat(formData.cena_sprzedazy_brutto)) * 100).toFixed(1)}%
                <span className="ms-3">
                  <strong>Narzut:</strong> {(((parseFloat(formData.cena_sprzedazy_brutto) - parseFloat(formData.cena_zakupu_brutto)) / parseFloat(formData.cena_zakupu_brutto)) * 100).toFixed(1)}%
                </span>
                <span className="ms-3">
                  <strong>Zysk:</strong> {(parseFloat(formData.cena_sprzedazy_brutto) - parseFloat(formData.cena_zakupu_brutto)).toFixed(2)} zł
                </span>
                <div className="small text-muted mt-1">
                  <i className="fas fa-info-circle me-1"></i>
                  API marży niedostępne - używam lokalnych obliczeń
                </div>
              </div>
            </div>
          )}

          {/* Alternatywna marża dla starych pól price/purchase_price */}
          {(parseFloat(formData.price) > 0 && parseFloat(formData.purchase_price) > 0 && !(parseFloat(formData.cena_sprzedazy_brutto) > 0 && parseFloat(formData.cena_zakupu_brutto) > 0)) && (
            <div className="col-12">
              <div className="alert alert-warning py-2 mb-2" style={{ fontSize: '0.8rem' }}>
                <i className="fas fa-calculator me-2"></i>
                <strong>Marża (stare pola):</strong> {(((parseFloat(formData.price) - parseFloat(formData.purchase_price)) / parseFloat(formData.purchase_price)) * 100).toFixed(1)}%
                <span className="ms-3">
                  <strong>Zysk:</strong> {(parseFloat(formData.price) - parseFloat(formData.purchase_price)).toFixed(2)} zł
                </span>
              </div>
            </div>
          )}

          {/* Opis - jeszcze bardziej kompaktowy */}
          <div className="col-12">
            <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.75rem' }}>
              <i className="fas fa-align-left text-secondary me-1"></i>
              Opis produktu
            </label>
            <textarea
              className="form-control form-control-sm"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Dodatkowy opis produktu..."
              rows="1"
              disabled={loading}
              style={{ 
                fontSize: '0.75rem', 
                resize: 'vertical', 
                minHeight: '32px',
                padding: '0.25rem 0.5rem'
              }}
            />
          </div>
        </div>
        
        <div className="d-flex justify-content-end gap-2 mt-2 pt-1 border-top">
          <button 
            type="button" 
            className="btn btn-secondary btn-sm px-2"
            onClick={handleCancel}
            disabled={loading}
            style={{ fontSize: '0.75rem' }}
          >
            <i className="fas fa-times me-1"></i>
            Anuluj
          </button>
          <button 
            type="submit" 
            className="btn btn-primary btn-sm px-2"
            disabled={loading}
            style={{ fontSize: '0.75rem' }}
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
