import React, { useState, useEffect } from 'react';
import { FaMapMarkerAlt, FaEdit, FaTrash, FaCopy, FaHistory, FaPlus, FaStore, FaTag, FaMoneyBill, FaSearch } from 'react-icons/fa';
import locationsService from '../services/locationsService';
import locationPricingService from '../services/locationPricingService';
import { productService } from '../services/productService';

const LocationPricingPageFixed = () => {
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationPrices, setLocationPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [filterTerm, setFilterTerm] = useState('');
  
  // Nowe stany dla zaawansowanych filtrów
  const [advancedFilters, setAdvancedFilters] = useState({
    priceType: 'all', // 'all', 'special', 'default'
    marginFilter: 'all', // 'all', 'below'
    marginThreshold: 15 // próg marży w procentach
  });

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      loadLocationPrices(selectedLocation.id);
      loadAllProducts();
    }
  }, [selectedLocation]);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const response = await locationsService.getLocations();
      if (response.success) {
        setLocations(response.data || []);
        if (response.data && response.data.length > 0) {
          setSelectedLocation(response.data[0]);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLocationPrices = async (locationId) => {
    try {
      setLoading(true);
      const response = await locationPricingService.getLocationPrices(locationId);
      if (response.success) {
        setLocationPrices(response.data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateMargin = (product, useSpecialPrice = false) => {
    const sellPrice = useSpecialPrice && product.hasSpecialPrice ? 
      product.specialPriceNetto : product.cena_sprzedazy_netto;
    const buyPrice = product.cena_zakupu || 0;
    
    if (!buyPrice || buyPrice <= 0) return { percent: 0, amount: 0 };
    
    const marginAmount = sellPrice - buyPrice;
    const marginPercent = Math.round((marginAmount / buyPrice) * 100);
    
    return {
      percent: marginPercent,
      amount: marginAmount
    };
  };

  const loadAllProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getProducts(1000);
      const products = response || [];
      
      const productsWithPrices = products.map(product => {
        const locationPrice = locationPrices.find(lp => lp.product_id === product.id);
        const hasSpecialPrice = !!locationPrice;
        
        const defaultMargin = calculateMargin(product, false);
        const specialMargin = hasSpecialPrice ? calculateMargin({
          ...product,
          hasSpecialPrice: true,
          specialPriceNetto: locationPrice.cena_sprzedazy_netto
        }, true) : null;
        
        return {
          ...product,
          hasSpecialPrice,
          specialPriceNetto: locationPrice?.cena_sprzedazy_netto || null,
          specialPriceBrutto: locationPrice?.cena_sprzedazy_brutto || null,
          priceDiffPercent: hasSpecialPrice ? 
            Math.round(((locationPrice.cena_sprzedazy_brutto - product.cena_sprzedazy_brutto) / product.cena_sprzedazy_brutto) * 100) : 0,
          defaultMargin,
          specialMargin
        };
      });
      
      setAllProducts(productsWithPrices);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredProducts = () => {
    return allProducts.filter(product => {
      const searchMatch = !filterTerm || 
        product.nazwa?.toLowerCase().includes(filterTerm.toLowerCase()) ||
        product.kod_produktu?.toLowerCase().includes(filterTerm.toLowerCase()) ||
        product.ean?.toLowerCase().includes(filterTerm.toLowerCase());
      
      if (!searchMatch) return false;

      if (advancedFilters.priceType === 'special' && !product.hasSpecialPrice) {
        return false;
      }
      if (advancedFilters.priceType === 'default' && product.hasSpecialPrice) {
        return false;
      }

      if (advancedFilters.marginFilter === 'below') {
        const currentMargin = product.hasSpecialPrice ? 
          product.specialMargin?.percent : 
          product.defaultMargin?.percent;
        
        if (!currentMargin || currentMargin >= advancedFilters.marginThreshold) {
          return false;
        }
      }
      
      return true;
    });
  };

  const handleSelectProduct = (productId) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    const filteredProducts = getFilteredProducts();
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  if (loading && !selectedLocation) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Ładowanie...</span>
          </div>
          <p className="mt-2">Ładowanie lokalizacji...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col">
          <h2>
            <FaTag className="me-2" style={{ color: '#007bff' }} />
            Cennik Lokalizacyjny - Naprawiona Wersja
          </h2>
          <p className="text-muted">
            Zarządzanie różnymi cenami sprzedaży dla każdej lokalizacji
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      <div className="row mb-3">
        <div className="col-12">
          <div className="d-flex align-items-center gap-3 bg-light p-3 rounded">
            <div className="d-flex align-items-center">
              <FaStore className="me-2 text-primary" />
              <label className="form-label mb-0 fw-bold me-2">Lokalizacja:</label>
            </div>
            <div className="flex-grow-1" style={{ maxWidth: '300px' }}>
              <select
                className="form-select form-select-sm"
                value={selectedLocation?.id || ''}
                onChange={(e) => {
                  const locationId = parseInt(e.target.value);
                  const location = locations.find(l => l.id === locationId);
                  setSelectedLocation(location || null);
                }}
              >
                <option value="">-- Wybierz lokalizację --</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.nazwa} ({location.kod_lokalizacji})
                  </option>
                ))}
              </select>
            </div>
            {selectedLocation && (
              <div className="text-muted small">
                <FaMapMarkerAlt className="me-1" />
                {selectedLocation.typ}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          {selectedLocation ? (
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h6 className="mb-0">
                  <FaStore className="me-2" />
                  Magazyn produktów: {selectedLocation.nazwa}
                </h6>
                <div className="d-flex gap-2">
                  {selectedProducts.size > 0 && (
                    <span className="badge bg-info">
                      Zaznaczonych: {selectedProducts.size}
                    </span>
                  )}
                </div>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <div className="input-group">
                      <span className="input-group-text">
                        <FaSearch />
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Szukaj produktu (nazwa, kod, EAN)..."
                        value={filterTerm}
                        onChange={(e) => setFilterTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-6 text-end">
                    <span className="text-muted me-3">
                      Produktów: {getFilteredProducts().length} | Zaznaczonych: {selectedProducts.size}
                    </span>
                    {getFilteredProducts().length > 0 && (
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={handleSelectAll}
                      >
                        {selectedProducts.size === getFilteredProducts().length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-12">
                    <div className="card border-0 bg-light">
                      <div className="card-body p-3">
                        <div className="row g-3">
                          <div className="col-md-4">
                            <label className="form-label small">Typ ceny:</label>
                            <select 
                              className="form-select form-select-sm"
                              value={advancedFilters.priceType}
                              onChange={(e) => setAdvancedFilters(prev => ({
                                ...prev,
                                priceType: e.target.value
                              }))}
                            >
                              <option value="all">Wszystkie produkty</option>
                              <option value="special">Tylko z cenami specjalnymi</option>
                              <option value="default">Tylko z cenami domyślnymi</option>
                            </select>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small">Filtr marży:</label>
                            <select 
                              className="form-select form-select-sm"
                              value={advancedFilters.marginFilter}
                              onChange={(e) => setAdvancedFilters(prev => ({
                                ...prev,
                                marginFilter: e.target.value
                              }))}
                            >
                              <option value="all">Wszystkie marże</option>
                              <option value="below">Marża niższa niż</option>
                            </select>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small">Próg marży (%):</label>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              min="0"
                              max="100"
                              step="0.1"
                              value={advancedFilters.marginThreshold}
                              onChange={(e) => setAdvancedFilters(prev => ({
                                ...prev,
                                marginThreshold: parseFloat(e.target.value) || 0
                              }))}
                              disabled={advancedFilters.marginFilter === 'all'}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {getFilteredProducts().length === 0 ? (
                  <div className="text-center py-5">
                    <FaStore className="fa-3x text-muted mb-3" />
                    <h5 className="text-muted">Brak produktów</h5>
                    <p className="text-muted">
                      {filterTerm ? 'Brak produktów spełniających kryteria wyszukiwania' : 'Magazyn jest pusty'}
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover w-100">
                      <thead>
                        <tr>
                          <th width="40">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={selectedProducts.size === getFilteredProducts().length && getFilteredProducts().length > 0}
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th>Produkt</th>
                          <th>Kod</th>
                          <th>Cena domyślna</th>
                          <th>Cena specjalna</th>
                          <th>Marża</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredProducts().map((product) => (
                          <tr key={product.id} className={selectedProducts.has(product.id) ? 'table-primary' : ''}>
                            <td>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={selectedProducts.has(product.id)}
                                onChange={() => handleSelectProduct(product.id)}
                              />
                            </td>
                            <td>
                              <div>
                                <div className="fw-bold">{product.nazwa}</div>
                                <small className="text-muted">
                                  EAN: {product.ean || 'Brak'} | VAT: {product.stawka_vat || 23}%
                                </small>
                              </div>
                            </td>
                            <td>
                              <code>{product.kod_produktu}</code>
                            </td>
                            <td>
                              <div>
                                <span className="fw-bold">{product.cena_sprzedazy_brutto?.toFixed(2) || '0.00'} zł</span>
                                <br />
                                <small className="text-muted">netto: {product.cena_sprzedazy_netto?.toFixed(2) || '0.00'} zł</small>
                              </div>
                            </td>
                            <td>
                              {product.hasSpecialPrice ? (
                                <div>
                                  <span className="fw-bold text-warning">{product.specialPriceBrutto?.toFixed(2)} zł</span>
                                  <br />
                                  <small className="text-muted">netto: {product.specialPriceNetto?.toFixed(2)} zł</small>
                                </div>
                              ) : (
                                <span className="text-muted">Cena domyślna</span>
                              )}
                            </td>
                            <td>
                              <div>
                                {product.hasSpecialPrice && product.specialMargin ? (
                                  <div>
                                    <span className={`fw-bold ${product.specialMargin.percent >= 0 ? 'text-success' : 'text-danger'}`}>
                                      {product.specialMargin.percent}%
                                    </span>
                                    <br />
                                    <small className="text-muted">
                                      {product.specialMargin.amount >= 0 ? '+' : ''}{product.specialMargin.amount.toFixed(2)} zł
                                    </small>
                                  </div>
                                ) : (
                                  <div>
                                    <span className={`fw-bold ${product.defaultMargin.percent >= 0 ? 'text-success' : 'text-danger'}`}>
                                      {product.defaultMargin.percent}%
                                    </span>
                                    <br />
                                    <small className="text-muted">
                                      {product.defaultMargin.amount >= 0 ? '+' : ''}{product.defaultMargin.amount.toFixed(2)} zł
                                    </small>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              {product.hasSpecialPrice ? (
                                <span className="badge bg-warning">
                                  <FaTag className="me-1" />
                                  Specjalna
                                </span>
                              ) : (
                                <span className="badge bg-secondary">Domyślna</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body text-center py-5">
                <FaStore className="fa-3x text-muted mb-3" />
                <h5 className="text-muted">Wybierz lokalizację</h5>
                <p className="text-muted">Wybierz lokalizację z listy powyżej</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationPricingPageFixed;
