import React, { useState, useEffect } from 'react';
import { orderService } from '../../services/orderService';
import { customerService } from '../../services/customerService';
import { useLocation } from '../../contexts/LocationContext';
import './OrderForm.css';

const OrderForm = ({ editingOrder = null, onSave, onCancel }) => {
  // Użyj aktualnej lokalizacji admina
  const { selectedLocation, availableLocations } = useLocation();
  const currentLocationId = selectedLocation?.id || 1;
  
  const [formData, setFormData] = useState({
    klient_id: '',
    location_id: currentLocationId, // Użyj aktualnej lokalizacji
    typ_realizacji: 'do_odbioru',
    uwagi: '',
    pozycje: []
  });

  const [customers, setCustomers] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customersList, setCustomersList] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  
  // Product search states
  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Załaduj dane przy inicjalizacji
  useEffect(() => {
    loadCustomers();
    
    // Zaktualizuj location_id gdy zmieni się lokalizacja (dla nowych zamówień)
    if (!editingOrder && selectedLocation) {
      setFormData(prev => ({ ...prev, location_id: selectedLocation.id }));
    }
    
    if (editingOrder) {
      loadOrderData();
    }
  }, [selectedLocation, editingOrder]);

  const loadCustomers = async () => {
    try {
      const customers = await customerService.getCustomers();
      setCustomers(customers || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadOrderData = async () => {
    if (!editingOrder?.id) return;
    
    try {
      setLoading(true);
      const result = await orderService.getOrder(editingOrder.id);
      
      if (result.success) {
        const order = result.data;
        setFormData({
          klient_id: order.klient_id || '',
          location_id: order.location_id || 1,
          typ_realizacji: order.typ_realizacji || 'do_odbioru',
          uwagi: order.uwagi || '',
          pozycje: order.pozycje || []
        });
        
        // Znajdź klienta
        const customer = customers.find(c => c.id === order.klient_id);
        setSelectedCustomer(customer);
      }
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async (query) => {
    if (!query.trim() || query.length < 2) {
      setProducts([]);
      return;
    }

    try {
      console.log('🏢 Current selectedLocation:', selectedLocation);
      console.log('🏢 Current formData.location_id:', formData.location_id);
      console.log('🔍 Searching for:', query, 'in location:', formData.location_id);
      const result = await orderService.searchProducts(query, formData.location_id, 20);
      console.log('🔍 Search result:', result);
      if (result.success) {
        console.log('📦 Products found:', result.data);
        setProducts(result.data || []);
      } else {
        console.log('❌ Search failed:', result.error);
        setProducts([]);
      }
    } catch (error) {
      console.error('Error searching products:', error);
      setProducts([]);
    }
  };

  const handleProductSearchChange = (value) => {
    setProductSearch(value);
    searchProducts(value);
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({ ...prev, klient_id: customer.id }));
    setShowCustomerSelector(false);
  };

  const handleAddCustomer = async (newCustomer) => {
    try {
      // Przeładuj listę klientów aby pobrać nowego klienta z ID
      await loadCustomers();
      
      // Znajdź nowego klienta po imieniu i nazwisku
      const updatedCustomers = await customerService.getCustomers();
      const foundCustomer = updatedCustomers.find(c => 
        c.imie === newCustomer.imie && 
        c.nazwisko === newCustomer.nazwisko &&
        (c.phone === newCustomer.telefon || c.telefon === newCustomer.telefon)
      );
      
      if (foundCustomer) {
        setSelectedCustomer(foundCustomer);
        setFormData(prev => ({ ...prev, klient_id: foundCustomer.id }));
      } else {
        // Fallback - ustaw dane bezpośrednio
        setSelectedCustomer(newCustomer);
        setFormData(prev => ({ ...prev, klient_id: newCustomer.id }));
      }
    } catch (error) {
      console.error('Error updating customer list:', error);
      // Fallback - użyj przekazanych danych
      setSelectedCustomer(newCustomer);
      setFormData(prev => ({ ...prev, klient_id: newCustomer.id }));
    }
    
    setShowCustomerSelector(false);
  };

  const handleAddProduct = (product) => {
    const existingIndex = formData.pozycje.findIndex(p => p.produkt_id === product.id);
    
    if (existingIndex >= 0) {
      // Zwiększ ilość jeśli produkt już istnieje
      const newPozycje = [...formData.pozycje];
      newPozycje[existingIndex].ilosc += 1;
      setFormData(prev => ({ ...prev, pozycje: newPozycje }));
    } else {
      // Dodaj nowy produkt - preferuj cenę specjalną jeśli dostępna
      console.log('🔍 DEBUG ADD PRODUCT:', {
        name: product.name,
        has_special_price: product.has_special_price,
        special_price_brutto: product.special_price_brutto,
        default_price_brutto: product.default_price_brutto,
        price: product.price
      });
      
      const price = product.has_special_price === 1 && product.special_price_brutto 
        ? product.special_price_brutto 
        : product.price || product.cena_sprzedazy_brutto || product.default_price_brutto || 0;
        
      console.log('💰 SELECTED PRICE:', price, 'from special:', product.special_price_brutto);
        
      const newPosition = {
        produkt_id: product.id,
        produkt_nazwa: product.name || product.nazwa,
        ilosc: 1,
        cena_jednostkowa: parseFloat(price),
        uwagi_pozycja: '',
        // Dodaj informacje o cenach specjalnych
        has_special_price: product.has_special_price || 0,
        special_price_brutto: product.special_price_brutto || null,
        default_price_brutto: product.default_price_brutto || null
      };
      
      setFormData(prev => ({
        ...prev,
        pozycje: [...prev.pozycje, newPosition]
      }));
    }
    
    setProductSearch('');
    setProducts([]);
  };

  const handleRemoveProduct = (index) => {
    const newPozycje = formData.pozycje.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, pozycje: newPozycje }));
  };

  const handleProductChange = (index, field, value) => {
    const newPozycje = [...formData.pozycje];
    newPozycje[index][field] = field === 'ilosc' || field === 'cena_jednostkowa' 
      ? parseFloat(value) || 0 
      : value;
    setFormData(prev => ({ ...prev, pozycje: newPozycje }));
  };

  const calculateTotals = () => {
    let wartoscNetto = 0;
    let wartoscBrutto = 0;
    
    formData.pozycje.forEach(pozycja => {
      const ilosc = parseFloat(pozycja.ilosc) || 0;
      const cenaBrutto = parseFloat(pozycja.cena_jednostkowa) || 0;
      const wartoscPozycjiBrutto = ilosc * cenaBrutto;
      
      // Zakładamy VAT 23% dla uproszczenia
      const wartoscPozycjiNetto = wartoscPozycjiBrutto / 1.23;
      
      wartoscBrutto += wartoscPozycjiBrutto;
      wartoscNetto += wartoscPozycjiNetto;
    });
    
    return { wartoscNetto, wartoscBrutto };
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.klient_id) {
      newErrors.klient_id = 'Wybierz klienta';
    }
    
    if (formData.pozycje.length === 0) {
      newErrors.pozycje = 'Dodaj co najmniej jeden produkt';
    }
    
    formData.pozycje.forEach((pozycja, index) => {
      if (!pozycja.ilosc || pozycja.ilosc <= 0) {
        newErrors[`pozycja_${index}_ilosc`] = 'Ilość musi być większa od 0';
      }
      if (!pozycja.cena_jednostkowa || pozycja.cena_jednostkowa < 0) {
        newErrors[`pozycja_${index}_cena`] = 'Cena nie może być ujemna';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      let result;
      if (editingOrder) {
        result = await orderService.updateOrder(editingOrder.id, formData);
      } else {
        result = await orderService.createOrder(formData);
      }
      
      if (result.success) {
        onSave();
      } else {
        setErrors({ general: result.error || 'Wystąpił błąd podczas zapisywania' });
      }
    } catch (error) {
      console.error('Error saving order:', error);
      setErrors({ general: 'Wystąpił błąd podczas zapisywania zamówienia' });
    } finally {
      setLoading(false);
    }
  };

  const { wartoscNetto, wartoscBrutto } = calculateTotals();

  return (
    <div 
      className="order-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 999999,
        width: '100vw',
        height: '100vh',
        paddingTop: '80px'
      }}
    >
      <div className="modal-dialog modal-xl" style={{ margin: 0, zIndex: 1000000, maxWidth: '90vw', marginTop: 0 }}>
        <div className="modal-content" style={{ zIndex: 1000001, fontSize: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', border: '1px solid #ddd' }}>
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fas fa-shopping-cart me-2"></i>
              {editingOrder ? 'Edytuj zamówienie' : 'Nowe zamówienie'}
            </h5>
            <button type="button" className="btn-close" onClick={onCancel}></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {errors.general && (
                <div className="alert alert-danger">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {errors.general}
                </div>
              )}

              <div className="row g-3">
                {/* Klient */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    <i className="fas fa-user me-1"></i>
                    Klient *
                  </label>
                  
                  {selectedCustomer ? (
                    <div className="card">
                      <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h6 className="card-title mb-1">
                              {selectedCustomer.nazwa_firmy || 
                               `${selectedCustomer.imie || ''} ${selectedCustomer.nazwisko || ''}`.trim()}
                            </h6>
                            {selectedCustomer.email && (
                              <small className="text-muted d-block">
                                <i className="fas fa-envelope me-1"></i>
                                {selectedCustomer.email}
                              </small>
                            )}
                            {(selectedCustomer.phone || selectedCustomer.telefon) && (
                              <small className="text-muted d-block">
                                <i className="fas fa-phone me-1"></i>
                                {selectedCustomer.phone || selectedCustomer.telefon}
                              </small>
                            )}
                          </div>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => {
                              setSelectedCustomer(null);
                              setFormData(prev => ({ ...prev, klient_id: '' }));
                              setShowCustomerSelector(true);
                            }}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <button
                        type="button"
                        className="btn btn-outline-primary w-100"
                        onClick={() => setShowCustomerSelector(true)}
                      >
                        <i className="fas fa-search me-2"></i>
                        Wybierz klienta
                      </button>
                    </div>
                  )}
                  
                  {errors.klient_id && (
                    <div className="text-danger small mt-1">{errors.klient_id}</div>
                  )}
                </div>

                {/* Typ realizacji */}
                <div className="col-md-3">
                  <label className="form-label fw-semibold">
                    <i className="fas fa-truck me-1"></i>
                    Typ realizacji
                  </label>
                  <select
                    className="form-select"
                    value={formData.typ_realizacji}
                    onChange={(e) => setFormData(prev => ({ ...prev, typ_realizacji: e.target.value }))}
                  >
                    <option value="do_odbioru">Do odbioru</option>
                    <option value="dostawa">Dostawa</option>
                    <option value="na_miejscu">Na miejscu</option>
                  </select>
                </div>

                {/* Lokalizacja */}
                <div className="col-md-3">
                  <label className="form-label fw-semibold">
                    <i className="fas fa-map-marker-alt me-1"></i>
                    Lokalizacja
                  </label>
                  <select
                    className="form-select"
                    value={formData.location_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, location_id: parseInt(e.target.value) }))}
                  >
                    {availableLocations.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.nazwa}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Uwagi */}
                <div className="col-12">
                  <label className="form-label fw-semibold">
                    <i className="fas fa-comment me-1"></i>
                    Uwagi
                  </label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={formData.uwagi}
                    onChange={(e) => setFormData(prev => ({ ...prev, uwagi: e.target.value }))}
                    placeholder="Opcjonalne uwagi do zamówienia..."
                  />
                </div>

                {/* Produkty */}
                <div className="col-12">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <label className="form-label fw-semibold mb-0">
                      <i className="fas fa-box me-1"></i>
                      Produkty
                    </label>
                  </div>

                  {/* Inline wyszukiwarka produktów */}
                  <div className="mb-3" style={{ 
                    backgroundColor: 'white',
                    border: '1px solid #e9ecef',
                    borderRadius: '0.375rem',
                    padding: '1rem'
                  }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="mb-0" style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                        <i className="fas fa-search me-2"></i>
                        Wyszukaj produkty
                      </h6>
                      <small className="text-muted">
                        Znaleziono: <strong>{products.length}</strong> produktów
                      </small>
                    </div>
                    
                    <div className="position-relative">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Wpisz nazwę produktu lub kod kreskowy..."
                        value={productSearch}
                        onChange={(e) => handleProductSearchChange(e.target.value)}
                        autoComplete="off"
                        style={{ paddingLeft: '2rem' }}
                      />
                      <i className="fas fa-search position-absolute" style={{ 
                        left: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#6c757d'
                      }}></i>
                    </div>
                    
                    {/* Lista produktów */}
                    {productSearch.length >= 2 && (
                      <div className="mt-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {products.length === 0 ? (
                          <div className="text-center py-3 text-muted">
                            <i className="fas fa-search fa-lg mb-2"></i>
                            <p className="mb-0">Nie znaleziono produktów</p>
                          </div>
                        ) : (
                          <div className="list-group">
                            {products.map(product => (
                              <button
                                key={product.id}
                                className="list-group-item list-group-item-action"
                                onClick={() => handleAddProduct(product)}
                                style={{ cursor: 'pointer', border: 'none', borderBottom: '1px solid #e9ecef' }}
                              >
                                <div className="d-flex justify-content-between align-items-center">
                                  <div className="flex-grow-1">
                                    <div className="fw-semibold">{product.name || product.nazwa}</div>
                                    <small className="text-muted">
                                      {product.barcode && `EAN: ${product.barcode} • `}
                                      ID: {product.id}
                                    </small>
                                  </div>
                                  <div className="text-end">
                                    {(() => {
                                      console.log('🔍 DEBUG PRODUCT:', {
                                        name: product.name,
                                        has_special_price: product.has_special_price,
                                        special_price_brutto: product.special_price_brutto,
                                        default_price_brutto: product.default_price_brutto,
                                        price: product.price
                                      });
                                      return product.has_special_price === 1;
                                    })() ? (
                                      <div>
                                        <div className="fw-bold text-success">
                                          {parseFloat(product.special_price_brutto).toFixed(2)} zł
                                          <small className="text-danger ms-1" title="Cena specjalna">
                                            <i className="fas fa-star"></i>
                                          </small>
                                        </div>
                                        <small className="text-muted text-decoration-line-through">
                                          było: {parseFloat(product.default_price_brutto).toFixed(2)} zł
                                        </small>
                                      </div>
                                    ) : (
                                      <div className="fw-bold text-success">
                                        {parseFloat(product.price || product.default_price_brutto || 0).toFixed(2)} zł
                                      </div>
                                    )}
                                    <small className="text-muted d-block">
                                      {product.unit || product.jednostka || 'szt'}
                                    </small>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {formData.pozycje.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      <i className="fas fa-box-open fa-2x mb-2"></i>
                      <p>Brak produktów w zamówieniu</p>
                      <small>Użyj przycisku "Dodaj produkt" aby dodać pozycje</small>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-bordered">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: '40%' }}>Produkt</th>
                            <th style={{ width: '15%' }}>Ilość</th>
                            <th style={{ width: '15%' }}>Cena</th>
                            <th style={{ width: '15%' }}>Wartość</th>
                            <th style={{ width: '10%' }}>Uwagi</th>
                            <th style={{ width: '5%' }}>Akcje</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.pozycje.map((pozycja, index) => (
                            <tr key={index}>
                              <td>
                                <div>
                                  <strong>{pozycja.produkt_nazwa}</strong>
                                  {pozycja.has_special_price === 1 && (
                                    <div>
                                      <small className="text-success">
                                        <i className="fas fa-star me-1"></i>
                                        Cena specjalna: {parseFloat(pozycja.special_price_brutto).toFixed(2)} zł
                                      </small>
                                      <br />
                                      <small className="text-muted text-decoration-line-through">
                                        Cena regularna: {parseFloat(pozycja.default_price_brutto).toFixed(2)} zł
                                      </small>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className={`form-control form-control-sm ${errors[`pozycja_${index}_ilosc`] ? 'is-invalid' : ''}`}
                                  value={pozycja.ilosc}
                                  onChange={(e) => handleProductChange(index, 'ilosc', e.target.value)}
                                  min="0.01"
                                  step="0.01"
                                />
                                {errors[`pozycja_${index}_ilosc`] && (
                                  <div className="invalid-feedback">{errors[`pozycja_${index}_ilosc`]}</div>
                                )}
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className={`form-control form-control-sm ${errors[`pozycja_${index}_cena`] ? 'is-invalid' : ''}`}
                                  value={pozycja.cena_jednostkowa}
                                  onChange={(e) => handleProductChange(index, 'cena_jednostkowa', e.target.value)}
                                  min="0"
                                  step="0.01"
                                />
                                {errors[`pozycja_${index}_cena`] && (
                                  <div className="invalid-feedback">{errors[`pozycja_${index}_cena`]}</div>
                                )}
                              </td>
                              <td>
                                <strong>
                                  {((pozycja.ilosc || 0) * (pozycja.cena_jednostkowa || 0)).toFixed(2)} zł
                                </strong>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={pozycja.uwagi_pozycja || ''}
                                  onChange={(e) => handleProductChange(index, 'uwagi_pozycja', e.target.value)}
                                  placeholder="Uwagi..."
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => handleRemoveProduct(index)}
                                  title="Usuń"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="table-light">
                          <tr>
                            <th colSpan="3">Razem:</th>
                            <th>
                              <div>{wartoscBrutto.toFixed(2)} zł brutto</div>
                              <small className="text-muted">{wartoscNetto.toFixed(2)} zł netto</small>
                            </th>
                            <th colSpan="2"></th>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {errors.pozycje && (
                    <div className="text-danger small mt-1">{errors.pozycje}</div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onCancel}>
                <i className="fas fa-times me-1"></i>
                Anuluj
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Zapisywanie...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save me-1"></i>
                    {editingOrder ? 'Zapisz zmiany' : 'Utwórz zamówienie'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal wyboru klienta */}
      {showCustomerSelector && (
        <CustomerSelector
          customers={customers}
          onSelect={handleCustomerSelect}
          onAddCustomer={handleAddCustomer}
          onClose={() => setShowCustomerSelector(false)}
        />
      )}
    </div>
  );
};

// Komponent do wyboru klienta
const CustomerSelector = ({ customers, onSelect, onClose, onAddCustomer }) => {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const filteredCustomers = customers.filter(customer => {
    const fullName = `${customer.imie || ''} ${customer.nazwisko || ''}`.toLowerCase();
    const companyName = (customer.nazwa_firmy || '').toLowerCase();
    const email = (customer.email || '').toLowerCase();
    const searchLower = search.toLowerCase();
    
    return fullName.includes(searchLower) || 
           companyName.includes(searchLower) || 
           email.includes(searchLower);
  });

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fas fa-users me-2"></i>
              Wybierz klienta
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          <div className="modal-body">
            <div className="row g-2 mb-3">
              <div className="col">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Szukaj klienta..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="col-auto">
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => setShowAddForm(true)}
                >
                  <i className="fas fa-plus me-1"></i>
                  Dodaj klienta
                </button>
              </div>
            </div>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="fas fa-search fa-2x mb-2"></i>
                  <p>Brak klientów do wyświetlenia</p>
                  {search && (
                    <button
                      className="btn btn-outline-success mt-2"
                      onClick={() => setShowAddForm(true)}
                    >
                      <i className="fas fa-plus me-1"></i>
                      Dodaj nowego klienta
                    </button>
                  )}
                </div>
              ) : (
                <div className="list-group">
                  {filteredCustomers.map(customer => (
                    <button
                      key={customer.id}
                      className="list-group-item list-group-item-action"
                      onClick={() => onSelect(customer)}
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="mb-1">
                            {customer.nazwa_firmy || 
                             `${customer.imie || ''} ${customer.nazwisko || ''}`.trim()}
                          </h6>
                          {customer.email && (
                            <small className="text-muted d-block">
                              <i className="fas fa-envelope me-1"></i>
                              {customer.email}
                            </small>
                          )}
                          {(customer.phone || customer.telefon) && (
                            <small className="text-muted d-block">
                              <i className="fas fa-phone me-1"></i>
                              {customer.phone || customer.telefon}
                            </small>
                          )}
                        </div>
                        <small className="text-muted">ID: {customer.id}</small>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal szybkiego dodawania klienta */}
      {showAddForm && (
        <QuickAddCustomerModal
          onSave={(newCustomer) => {
            setShowAddForm(false);
            onAddCustomer(newCustomer);
          }}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
};

// Komponent szybkiego dodawania klienta
const QuickAddCustomerModal = ({ onSave, onClose }) => {
  const [formData, setFormData] = useState({
    imie: '',
    nazwisko: '',
    telefon: ''
  });
  const [consents, setConsents] = useState({
    przetwarzanie_danych: false,
    zgoda_marketingowa: false
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Walidacja
    const newErrors = {};
    if (!formData.imie.trim()) newErrors.imie = 'Imię jest wymagane';
    if (!formData.nazwisko.trim()) newErrors.nazwisko = 'Nazwisko jest wymagane';
    if (!formData.telefon.trim()) newErrors.telefon = 'Telefon jest wymagany';
    if (!consents.przetwarzanie_danych) newErrors.przetwarzanie_danych = 'Zgoda na przetwarzanie danych jest wymagana';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);
      setErrors({});
      
      // Wywołaj endpoint dodawania klienta
      const response = await fetch('http://localhost:5002/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imie: formData.imie.trim(),
          nazwisko: formData.nazwisko.trim(),
          telefon: formData.telefon.trim(),
          typ_klienta: 'osoba_fizyczna',
          zgoda_marketingowa: consents.zgoda_marketingowa,
          przetwarzanie_danych: consents.przetwarzanie_danych
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        onSave(result.data);
      } else {
        setErrors({ general: result.error || 'Wystąpił błąd podczas dodawania klienta' });
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      setErrors({ general: 'Wystąpił błąd podczas dodawania klienta' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1065 }}>
      <div className="modal-dialog modal-md">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fas fa-user-plus me-2"></i>
              Dodaj nowego klienta
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {errors.general && (
                <div className="alert alert-danger">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {errors.general}
                </div>
              )}

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    <i className="fas fa-user me-1"></i>
                    Imię *
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.imie ? 'is-invalid' : ''}`}
                    value={formData.imie}
                    onChange={(e) => setFormData(prev => ({ ...prev, imie: e.target.value }))}
                    placeholder="Wprowadź imię"
                    autoFocus
                  />
                  {errors.imie && (
                    <div className="invalid-feedback">{errors.imie}</div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    <i className="fas fa-user me-1"></i>
                    Nazwisko *
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.nazwisko ? 'is-invalid' : ''}`}
                    value={formData.nazwisko}
                    onChange={(e) => setFormData(prev => ({ ...prev, nazwisko: e.target.value }))}
                    placeholder="Wprowadź nazwisko"
                  />
                  {errors.nazwisko && (
                    <div className="invalid-feedback">{errors.nazwisko}</div>
                  )}
                </div>

                <div className="col-12">
                  <label className="form-label fw-semibold">
                    <i className="fas fa-phone me-1"></i>
                    Telefon *
                  </label>
                  <input
                    type="tel"
                    className={`form-control ${errors.telefon ? 'is-invalid' : ''}`}
                    value={formData.telefon}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefon: e.target.value }))}
                    placeholder="Wprowadź numer telefonu"
                  />
                  {errors.telefon && (
                    <div className="invalid-feedback">{errors.telefon}</div>
                  )}
                </div>
              </div>

              {/* Zgody */}
              <div className="row g-3 mt-2">
                <div className="col-12">
                  <div className="form-check">
                    <input
                      className={`form-check-input ${errors.przetwarzanie_danych ? 'is-invalid' : ''}`}
                      type="checkbox"
                      id="przetwarzanie_danych"
                      checked={consents.przetwarzanie_danych}
                      onChange={(e) => setConsents(prev => ({ ...prev, przetwarzanie_danych: e.target.checked }))}
                    />
                    <label className="form-check-label" htmlFor="przetwarzanie_danych">
                      <strong>Wyrażam zgodę na przetwarzanie moich danych osobowych *</strong>
                    </label>
                    {errors.przetwarzanie_danych && (
                      <div className="invalid-feedback d-block">{errors.przetwarzanie_danych}</div>
                    )}
                  </div>
                </div>

                <div className="col-12">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="zgoda_marketingowa"
                      checked={consents.zgoda_marketingowa}
                      onChange={(e) => setConsents(prev => ({ ...prev, zgoda_marketingowa: e.target.checked }))}
                    />
                    <label className="form-check-label" htmlFor="zgoda_marketingowa">
                      Wyrażam zgodę na otrzymywanie informacji marketingowych (opcjonalne)
                    </label>
                  </div>
                </div>
              </div>

              <div className="alert alert-info mt-3">
                <i className="fas fa-info-circle me-2"></i>
                <strong>Szybkie dodawanie:</strong> Wprowadź podstawowe dane kontaktowe. 
                Pełne dane można później edytować w module Klientów.
              </div>
            </div>
            
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                <i className="fas fa-times me-1"></i>
                Anuluj
              </button>
              <button type="submit" className="btn btn-success" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Dodawanie...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plus me-1"></i>
                    Dodaj klienta
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

export default OrderForm;
