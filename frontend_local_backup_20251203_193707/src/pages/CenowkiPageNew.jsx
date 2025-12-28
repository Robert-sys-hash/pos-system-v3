import React, { useState, useEffect, useCallback } from 'react';
import productsService from '../services/productsService';
import categoriesService from '../services/categoriesService';
import locationsService from '../services/locationsService';
import warehousePricingService from '../services/warehousePricingService';
import { useLocation } from '../contexts/LocationContext';
import { FaTag, FaSearch, FaList, FaFilter, FaBoxes, FaPrint, FaCopy, FaTimes, FaTrash, FaSyncAlt, FaEye } from 'react-icons/fa';

const CenowkiPageNew = () => {
  const { selectedLocation, availableLocations, changeLocation } = useLocation();
  const [products, setProducts] = useState([]);
  const [locationPrices, setLocationPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Stany dla wyszukiwania i filtrów
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  
  // Stany dla podglądu etykiet
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [previewProducts, setPreviewProducts] = useState([]);
  
  // Ustawienia etykiet
  const [labelSettings, setLabelSettings] = useState({
    includeManufacturer: true,
    includeSimplifiedName: true,
    includeQuantity: true,
    includePrice: true,
    includeSpecialPrice: true,
    includeWeight: true,
    fontSize: 'medium',
    layout: 'compact'
  });

  // Opcje powielania cenówek
  const [copyMultiplier, setCopyMultiplier] = useState(1);
  const [selectedForCopy, setSelectedForCopy] = useState(new Set());

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      loadLocationPrices();
    }
  }, [selectedLocation]);

  useEffect(() => {
    if (selectedLocation && locationPrices.length >= 0) {
      loadProducts();
    }
  }, [selectedLocation, locationPrices, searchTerm, selectedCategory]);

  // Nasłuchuj na zmiany focus okna - odśwież dane gdy użytkownik wraca do strony
  useEffect(() => {
    const handleFocus = () => {
      if (selectedLocation) {
        console.log('Okno uzyskało focus - odświeżam dane cenówek');
        refreshData();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && selectedLocation) {
        console.log('Strona stała się widoczna - odświeżam dane cenówek');
        refreshData();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Dodaj periodic check co 30 sekund jeśli strona jest aktywna
    const intervalId = setInterval(() => {
      if (!document.hidden && selectedLocation) {
        console.log('Periodic refresh - odświeżam dane cenówek');
        refreshData();
      }
    }, 30000); // 30 sekund

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [selectedLocation, refreshData]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      // Lokalizacje są już ładowane przez LocationContext
      // Nie trzeba ładować ich tutaj
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLocationPrices = async () => {
    if (!selectedLocation) return;
    
    try {
      const response = await warehousePricingService.getWarehousePrices(selectedLocation.id);
      if (response.success) {
        setLocationPrices(response.data || []);
        console.log('Załadowano ceny magazynowe:', response.data?.length || 0);
      }
    } catch (err) {
      console.error('Błąd ładowania cen magazynowych:', err);
      setLocationPrices([]);
    }
  };

  // Funkcja do manualnego odświeżania danych
  const refreshData = useCallback(async () => {
    if (!selectedLocation) return;
    
    try {
      setLoading(true);
      
      // Najpierw załaduj ceny magazynowe
      const response = await warehousePricingService.getWarehousePrices(selectedLocation.id);
      if (response.success) {
        const newLocationPrices = response.data || [];
        setLocationPrices(newLocationPrices);
        console.log('🔄 Odświeżono ceny magazynowe:', newLocationPrices.length);
        
        // Teraz załaduj produkty z nowymi cenami
        const productResponse = await productService.getProducts(1000);
        const allProducts = productResponse || [];
        
        // Filtrowanie produktów
        let filteredProducts = allProducts;
        
        if (searchTerm) {
          filteredProducts = filteredProducts.filter(product =>
            product.nazwa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.kod_produktu?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.ean?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.producent?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        
        if (selectedCategory) {
          filteredProducts = filteredProducts.filter(product =>
            product.kategoria === selectedCategory
          );
        }
        
        // Dodaj informacje o cenach specjalnych - używaj świeżych cen
        const productsWithPrices = filteredProducts.map(product => {
          const locationPrice = newLocationPrices.find(lp => lp.product_id === product.id);
          
          if (locationPrice) {
            console.log(`✅ Produkt ${product.nazwa} (ID: ${product.id}) MA cenę specjalną: ${locationPrice.cena_sprzedazy_brutto} zł`);
          }
          
          return {
            ...product,
            hasSpecialPrice: !!locationPrice,
            specialPriceNetto: locationPrice?.cena_sprzedazy_netto || null,
            specialPriceBrutto: locationPrice?.cena_sprzedazy_brutto || null,
            // Dodaj informacje potrzebne do etykiet
            simplifiedName: simplifyProductName(product.nazwa),
            packageQuantity: extractPackageQuantity(product.nazwa, product.opis),
            weight: extractWeight(product.nazwa, product.opis),
            manufacturer: product.producent || extractManufacturer(product.nazwa)
          };
        });
        
        setProducts(productsWithPrices);
        console.log('✅ Odświeżono produkty:', productsWithPrices.length, 'z cenami specjalnymi:', productsWithPrices.filter(p => p.hasSpecialPrice).length);
        
        // Ekstraktuj unikalne kategorie
        const uniqueCategories = [...new Set(allProducts.map(p => p.kategoria).filter(Boolean))];
        setCategories(uniqueCategories.sort());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedLocation, searchTerm, selectedCategory]);

  // Nowa funkcja ładująca produkty z przekazanymi cenami
  const loadProductsWithPrices = async (currentLocationPrices = locationPrices) => {
    try {
      setLoading(true);
      const response = await productService.getProducts(1000);
      const allProducts = response || [];
      
      // Filtrowanie produktów
      let filteredProducts = allProducts;
      
      if (searchTerm) {
        filteredProducts = filteredProducts.filter(product =>
          product.nazwa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.kod_produktu?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.ean?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.producent?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      if (selectedCategory) {
        filteredProducts = filteredProducts.filter(product =>
          product.kategoria === selectedCategory
        );
      }
      
      // Dodaj informacje o cenach specjalnych - używaj przekazanych cen
      const productsWithPrices = filteredProducts.map(product => {
        const locationPrice = currentLocationPrices.find(lp => lp.product_id === product.id);
        
        console.log(`Produkt ${product.nazwa} (ID: ${product.id}):`, locationPrice ? 'MA cenę specjalną' : 'BRAK ceny specjalnej');
        
        return {
          ...product,
          hasSpecialPrice: !!locationPrice,
          specialPriceNetto: locationPrice?.cena_sprzedazy_netto || null,
          specialPriceBrutto: locationPrice?.cena_sprzedazy_brutto || null,
          // Dodaj informacje potrzebne do etykiet
          simplifiedName: simplifyProductName(product.nazwa),
          packageQuantity: extractPackageQuantity(product.nazwa, product.opis),
          weight: extractWeight(product.nazwa, product.opis),
          manufacturer: product.producent || extractManufacturer(product.nazwa)
        };
      });
      
      setProducts(productsWithPrices);
      console.log('Załadowano produkty:', productsWithPrices.length, 'z cenami specjalnymi:', productsWithPrices.filter(p => p.hasSpecialPrice).length);
      
      // Ekstraktuj unikalne kategorie
      const uniqueCategories = [...new Set(allProducts.map(p => p.kategoria).filter(Boolean))];
      setCategories(uniqueCategories.sort());
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    // Używaj nowej funkcji z aktualnymi cenami ze stanu
    await loadProductsWithPrices(locationPrices);
  };

  // Pomocnicze funkcje do ekstrakcji danych
  const simplifyProductName = (fullName) => {
    if (!fullName) return '';
    
    // Usuń dozę i formę leku, zostaw główną nazwę
    return fullName
      .replace(/\s*\d+\s*mg.*$/i, '')
      .replace(/\s*\d+\s*ml.*$/i, '')
      .replace(/\s*\d+\s*g.*$/i, '')
      .replace(/\s*tabl\..*$/i, '')
      .replace(/\s*kaps\..*$/i, '')
      .replace(/\s*sasz\..*$/i, '')
      .trim();
  };

  const extractPackageQuantity = (name, description) => {
    if (!name && !description) return '';
    
    const text = `${name || ''} ${description || ''}`;
    
    // Szukaj wzorców: "30 tabl", "20 kaps", "100 ml", itp.
    const patterns = [
      /(\d+)\s*tabl/i,
      /(\d+)\s*kaps/i,
      /(\d+)\s*sasz/i,
      /(\d+)\s*ml/i,
      /(\d+)\s*g(?!\s*mg)/i,
      /(\d+)\s*szt/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    return '';
  };

  const extractWeight = (name, description) => {
    if (!name && !description) return '';
    
    const text = `${name || ''} ${description || ''}`;
    
    // Szukaj wzorców wagi
    const weightPatterns = [
      /(\d+(?:\.\d+)?)\s*kg/i,
      /(\d+(?:\.\d+)?)\s*g(?!\s*mg)/i,
      /(\d+(?:\.\d+)?)\s*mg/i
    ];
    
    for (const pattern of weightPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    return '';
  };

  const extractManufacturer = (name) => {
    if (!name) return '';
    
    // Często producent jest na początku nazwy przed pierwszym spacem lub myślnikiem
    const parts = name.split(/[\s\-]/);
    if (parts.length > 1) {
      return parts[0];
    }
    
    return '';
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
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  };

  const handlePreviewLabels = () => {
    const selectedProductsList = products.filter(p => selectedProducts.has(p.id));
    setPreviewProducts(selectedProductsList);
    setSelectedForCopy(new Set()); // Resetuj zaznaczenia do powielania
    setShowPreview(true);
  };

  // Funkcje dla selektywnego powielania cenówek
  const handleToggleCopySelection = (productId) => {
    const newSelected = new Set(selectedForCopy);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedForCopy(newSelected);
  };

  const handleSelectAllForCopy = () => {
    setSelectedForCopy(new Set(previewProducts.map(p => p.id)));
  };

  const handleDeselectAllForCopy = () => {
    setSelectedForCopy(new Set());
  };

  const handlePrintLabels = () => {
    console.log('handlePrintLabels wywołana - CenowkiPageNew');
    console.log('showPreview:', showPreview);
    console.log('products:', products);
    console.log('previewProducts:', previewProducts);
    console.log('selectedProducts:', selectedProducts);
    
    // Wybierz odpowiednią listę produktów w zależności od kontekstu
    const currentProducts = showPreview ? previewProducts : products;
    console.log('currentProducts:', currentProducts);
    
    // Sprawdź czy produkty są dostępne
    if (!currentProducts || currentProducts.length === 0) {
      alert('Brak produktów do druku. Sprawdź czy produkty zostały załadowane.');
      return;
    }
    
    // Sprawdź czy wybrano jakieś produkty
    if (!selectedProducts || selectedProducts.size === 0) {
      alert('Nie wybrano żadnych produktów do druku!');
      return;
    }
    
    // Zbierz wszystkie wybrane cenówki do druku
    const labelsToShow = [];
    
    selectedProducts.forEach(productId => {
      const product = currentProducts.find(p => p.id === productId);
      if (product) {
        try {
          const quantity = extractPackageQuantity(product.nazwa, product.opis);
          const weight = extractWeight(product.nazwa, product.opis);
          const manufacturer = extractManufacturer(product.nazwa);
          const units = [quantity, weight].filter(Boolean).join(' - ');
          const displayPriceInfo = getDisplayPrice(product);
          
          // Dodaj tyle kopii ile wybrano
          const copies = selectedForCopy.has(productId) ? copyMultiplier : 1;
          for (let i = 0; i < copies; i++) {
            labelsToShow.push({
              price: `${parseFloat(displayPriceInfo.price).toFixed(2)} zł`,
              productName: product.nazwa || 'Brak nazwy',
              manufacturer: manufacturer,
              units: units
            });
          }
        } catch (error) {
          console.error('Błąd podczas przetwarzania produktu:', error);
        }
      }
    });

    if (labelsToShow.length === 0) {
      alert('Nie udało się przygotować cenówek do druku!');
      return;
    }

    try {
      // Utworz nowe okno tylko z cenówkami
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        alert('Nie można otworzyć okna drukowania. Sprawdź czy popup nie jest zablokowany.');
        return;
      }
      
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Cenówki do druku</title>
          <style>
            @page {
              size: A4;
              margin: 5mm;
            }
            
            body {
              margin: 0;
              padding: 5mm;
              font-family: Arial, sans-serif;
              background: white;
            }
            
            .labels-container {
              display: flex;
              flex-wrap: wrap;
              gap: 2mm;
              justify-content: flex-start;
            }
            
            .price-label {
              width: 4cm;
              height: 2cm;
              border: 1px solid #000;
              padding: 1.5mm;
              display: flex;
              flex-direction: column;
              justify-content: center;
              text-align: center;
              background: white;
              box-sizing: border-box;
              page-break-inside: avoid;
            }
            
            .price {
              font-size: 12px;
              font-weight: bold;
              color: #000;
              margin-bottom: 1mm;
            }
            
            .product-name {
              font-size: 7px;
              color: #000;
              margin-bottom: 1mm;
              line-height: 1.1;
              max-height: 3em;
              overflow: hidden;
            }
            
            .manufacturer {
              font-size: 6px;
              color: #666;
              margin-bottom: 1mm;
            }
            
            .units {
              font-size: 6px;
              color: #333;
              font-style: italic;
            }
            
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="labels-container">
            ${labelsToShow.map(label => `
              <div class="price-label">
                <div class="price">${label.price}</div>
                <div class="product-name">${label.productName}</div>
                ${label.manufacturer ? `<div class="manufacturer">${label.manufacturer}</div>` : ''}
                ${label.units ? `<div class="units">${label.units}</div>` : ''}
              </div>
            `).join('')}
          </div>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
        </html>
      `;
      
      printWindow.document.write(printContent);
      printWindow.document.close();
      
    } catch (error) {
      console.error('Błąd podczas tworzenia okna drukowania:', error);
      alert('Błąd podczas tworzenia okna drukowania: ' + error.message);
    }
  };

  const getDisplayPrice = (product) => {
    // Jeśli wybrano lokalizację, sprawdź czy są ceny specjalne dla tej lokalizacji
    if (selectedLocation && locationPrices.length > 0) {
      const locationPrice = locationPrices.find(lp => lp.product_id === product.id);
      if (locationPrice && locationPrice.has_special_price) {
        return {
          price: locationPrice.special_price_brutto,
          type: 'special',
          oldPrice: locationPrice.default_price_brutto || product.cena_sprzedazy_brutto
        };
      }
      // Jeśli nie ma ceny specjalnej dla lokalizacji, użyj domyślnej ceny z lokalizacji
      if (locationPrice && locationPrice.default_price_brutto) {
        return {
          price: locationPrice.default_price_brutto,
          type: 'normal',
          oldPrice: null
        };
      }
    }
    
    // Fallback na standardową cenę produktu
    if (product.hasSpecialPrice) {
      return {
        price: product.specialPriceBrutto,
        type: 'special',
        oldPrice: product.cena_sprzedazy_brutto
      };
    }
    return {
      price: product.cena_sprzedazy_brutto,
      type: 'normal',
      oldPrice: null
    };
  };

  if (loading && products.length === 0) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Ładowanie...</span>
          </div>
          <p className="mt-2">Ładowanie produktów...</p>
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
            Cenówki - Etykiety Cenowe
          </h2>
          <p className="text-muted">
            Wyszukaj produkty i wygeneruj etykiety cenowe z cenami specjalnymi
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

      {/* Sekcja wyboru lokalizacji */}
      <div className="row mb-3">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-4">
                  <label className="form-label fw-bold">
                    <FaBox className="me-2" />
                    Lokalizacja:
                  </label>
                  <select
                    className="form-select"
                    value={selectedLocation?.id || ''}
                    onChange={(e) => {
                      const locationId = parseInt(e.target.value);
                      changeLocation(locationId);
                    }}
                  >
                    <option value="">-- Wybierz lokalizację --</option>
                    {availableLocations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.nazwa} ({location.kod_lokalizacji})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-8 text-end">
                  {selectedLocation && (
                    <div className="d-flex align-items-center justify-content-end">
                      <div className="text-muted me-3">
                        <small>
                          Typ: {selectedLocation.typ} | 
                          Produktów: {products.length} | 
                          Ze specjalnymi cenami: {products.filter(p => p.hasSpecialPrice).length}
                        </small>
                      </div>
                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={refreshData}
                        disabled={loading}
                        title="Odśwież dane cenówek"
                      >
                        <FaSync className={`me-1 ${loading ? 'fa-spin' : ''}`} />
                        Odśwież
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedLocation && (
        <>
          {/* Sekcja wyszukiwania i filtrów */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">
                    <FaSearch className="me-2" />
                    Wyszukiwanie i filtry
                  </h6>
                  {selectedProducts.size > 0 && (
                    <div className="d-flex gap-2">
                      <span className="badge bg-info">
                        Zaznaczonych: {selectedProducts.size}
                      </span>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={handlePreviewLabels}
                      >
                        <FaEye className="me-1" />
                        Podgląd etykiet
                      </button>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={handlePrintLabels}
                      >
                        <FaPrint className="me-1" />
                        Drukuj
                      </button>
                    </div>
                  )}
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="input-group">
                        <span className="input-group-text">
                          <FaSearch />
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Szukaj produktu (nazwa, kod, EAN, producent)..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <select
                        className="form-select"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                      >
                        <option value="">Wszystkie kategorie</option>
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-2 text-end">
                      <button
                        className="btn btn-outline-secondary"
                        onClick={handleSelectAll}
                        disabled={products.length === 0}
                      >
                        {selectedProducts.size === products.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lista produktów */}
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h6 className="mb-0">
                    <FaBox className="me-2" />
                    Lista produktów ({products.length})
                  </h6>
                </div>
                <div className="card-body">
                  {products.length === 0 ? (
                    <div className="text-center py-5">
                      <FaBox className="fa-3x text-muted mb-3" />
                      <h5 className="text-muted">Brak produktów</h5>
                      <p className="text-muted">
                        {searchTerm || selectedCategory ? 
                          'Brak produktów spełniających kryteria wyszukiwania' : 
                          'Brak produktów w wybranej lokalizacji'
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th width="40">
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={selectedProducts.size === products.length && products.length > 0}
                                onChange={handleSelectAll}
                              />
                            </th>
                            <th>Producent</th>
                            <th>Produkt</th>
                            <th>Kod/EAN</th>
                            <th>Opakowanie</th>
                            <th>Waga</th>
                            <th>Cena</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map((product) => {
                            const priceInfo = getDisplayPrice(product);
                            
                            return (
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
                                  <div className="fw-bold text-primary">
                                    {product.manufacturer || 'Brak'}
                                  </div>
                                </td>
                                <td>
                                  <div>
                                    <div className="fw-bold">{product.simplifiedName}</div>
                                    <small className="text-muted">{product.nazwa}</small>
                                  </div>
                                </td>
                                <td>
                                  <div>
                                    <code className="small">{product.kod_produktu}</code>
                                    {product.ean && (
                                      <>
                                        <br />
                                        <small className="text-muted">
                                          <FaBarcode className="me-1" />
                                          {product.ean}
                                        </small>
                                      </>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <span className="badge bg-light text-dark">
                                    {product.packageQuantity || 'Brak danych'}
                                  </span>
                                </td>
                                <td>
                                  {product.weight ? (
                                    <span className="badge bg-secondary">
                                      <FaWeightHanging className="me-1" />
                                      {product.weight}
                                    </span>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                                <td>
                                  <div>
                                    {priceInfo.type === 'special' && priceInfo.oldPrice && (
                                      <small className="text-decoration-line-through text-muted">
                                        {priceInfo.oldPrice?.toFixed(2)} zł
                                      </small>
                                    )}
                                    <div className={`fw-bold ${priceInfo.type === 'special' ? 'text-warning' : 'text-success'}`}>
                                      {priceInfo.price?.toFixed(2)} zł
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  {product.hasSpecialPrice ? (
                                    <span className="badge bg-warning">
                                      <FaTag className="me-1" />
                                      Cena specjalna
                                    </span>
                                  ) : (
                                    <span className="badge bg-secondary">Cena standardowa</span>
                                  )}
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
          </div>
        </>
      )}

      {/* Modal podglądu etykiet */}
      {showPreview && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <FaEye className="me-2" />
                  Podgląd etykiet cenowych ({previewProducts.length} produktów)
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowPreview(false)}
                ></button>
              </div>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {/* Ustawienia etykiet */}
                <div className="row mb-4">
                  <div className="col-12">
                    <div className="card bg-light">
                      <div className="card-header">
                        <h6 className="mb-0">
                          <FaCog className="me-2" />
                          Ustawienia etykiet
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="row g-3">
                          <div className="col-md-6">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="includeManufacturer"
                                checked={labelSettings.includeManufacturer}
                                onChange={(e) => setLabelSettings({...labelSettings, includeManufacturer: e.target.checked})}
                              />
                              <label className="form-check-label" htmlFor="includeManufacturer">
                                Nazwa producenta
                              </label>
                            </div>
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="includeSimplifiedName"
                                checked={labelSettings.includeSimplifiedName}
                                onChange={(e) => setLabelSettings({...labelSettings, includeSimplifiedName: e.target.checked})}
                              />
                              <label className="form-check-label" htmlFor="includeSimplifiedName">
                                Nazwa produktu uproszczona
                              </label>
                            </div>
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="includeQuantity"
                                checked={labelSettings.includeQuantity}
                                onChange={(e) => setLabelSettings({...labelSettings, includeQuantity: e.target.checked})}
                              />
                              <label className="form-check-label" htmlFor="includeQuantity">
                                Ilość w opakowaniu
                              </label>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="includePrice"
                                checked={labelSettings.includePrice}
                                onChange={(e) => setLabelSettings({...labelSettings, includePrice: e.target.checked})}
                              />
                              <label className="form-check-label" htmlFor="includePrice">
                                Cena aktualna
                              </label>
                            </div>
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="includeSpecialPrice"
                                checked={labelSettings.includeSpecialPrice}
                                onChange={(e) => setLabelSettings({...labelSettings, includeSpecialPrice: e.target.checked})}
                              />
                              <label className="form-check-label" htmlFor="includeSpecialPrice">
                                Cena specjalna (przekreślona stara)
                              </label>
                            </div>
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="includeWeight"
                                checked={labelSettings.includeWeight}
                                onChange={(e) => setLabelSettings({...labelSettings, includeWeight: e.target.checked})}
                              />
                              <label className="form-check-label" htmlFor="includeWeight">
                                Waga produktu
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Opcje powielania cenówek */}
                <div className="row mb-4">
                  <div className="col-12">
                    <div className="card bg-warning bg-opacity-10 border-warning">
                      <div className="card-header bg-warning bg-opacity-25">
                        <h6 className="mb-0">
                          <FaBox className="me-2" />
                          Opcje powielania cenówek
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="row g-3 align-items-center">
                          <div className="col-md-4">
                            <label className="form-label fw-bold">Ilość kopii każdej cenówki:</label>
                            <select 
                              className="form-select form-select-lg"
                              value={copyMultiplier}
                              onChange={(e) => setCopyMultiplier(parseInt(e.target.value))}
                            >
                              <option value={1}>1x (pojedyncza cenówka)</option>
                              <option value={2}>2x (podwójna cenówka)</option>
                              <option value={4}>4x (poczwórna cenówka)</option>
                              <option value={6}>6x (sześciokrotna cenówka)</option>
                              <option value={8}>8x (ośmiokrotna cenówka)</option>
                              <option value={10}>10x (dziesięciokrotna cenówka)</option>
                            </select>
                          </div>
                          <div className="col-md-8">
                            <div className="alert alert-info mb-2">
                              <small>
                                <FaBox className="me-1" />
                                <strong>Wybrana opcja:</strong> Zaznaczone cenówki zostaną powtórzone <strong>{copyMultiplier}x</strong>
                                {copyMultiplier > 1 && selectedForCopy.size > 0 && (
                                  <span> - łącznie zostanie wydrukowanych <strong>{selectedForCopy.size * copyMultiplier}</strong> dodatkowych etykiet</span>
                                )}
                              </small>
                            </div>
                            <div className="d-flex gap-2">
                              <button 
                                className="btn btn-sm btn-outline-success" 
                                onClick={handleSelectAllForCopy}
                                disabled={previewProducts.length === 0}
                              >
                                Zaznacz wszystkie ({previewProducts.length})
                              </button>
                              <button 
                                className="btn btn-sm btn-outline-warning" 
                                onClick={handleDeselectAllForCopy}
                                disabled={selectedForCopy.size === 0}
                              >
                                Odznacz wszystkie
                              </button>
                              <span className="badge bg-primary ms-2 align-self-center">
                                Zaznaczono: {selectedForCopy.size}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Podgląd etykiet */}
                <div className="row" id="labelsToPrint">
                  {previewProducts.flatMap((product, productIndex) => {
                    const priceInfo = getDisplayPrice(product);
                    const unitPrice = product.packageQuantity && product.packageQuantity !== '1' ? 
                      (priceInfo.price / parseFloat(product.packageQuantity)).toFixed(2) : null;
                    
                    // Sprawdzamy czy ten produkt jest zaznaczony do powielania
                    const isSelectedForCopy = selectedForCopy.has(product.id);
                    const multiplier = isSelectedForCopy ? copyMultiplier : 1;
                    
                    // Tworzymy tablicę z kopiami cenówki (tylko dla zaznaczonych produktów)
                    return Array.from({ length: multiplier }, (_, copyIndex) => (
                      <div key={`${product.id}-${copyIndex}`} className="col-md-6 col-lg-4 mb-3">
                        {/* Checkbox do powielania - tylko przy pierwszej kopii */}
                        {copyIndex === 0 && (
                          <div className="form-check mb-2">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`copy-${product.id}`}
                              checked={selectedForCopy.has(product.id)}
                              onChange={() => handleToggleCopySelection(product.id)}
                            />
                            <label className="form-check-label small text-primary fw-bold" htmlFor={`copy-${product.id}`}>
                              Podwój tę cenówkę {copyMultiplier}x
                              {isSelectedForCopy && copyMultiplier > 1 && (
                                <span className="badge bg-warning text-dark ms-1">+{copyMultiplier - 1} kopii</span>
                              )}
                            </label>
                          </div> 
                        )}
                        
                        <div className="price-label border border-dark" style={{ 
                          width: '4cm',
                          height: '2cm',
                          fontSize: labelSettings.fontSize === 'small' ? '6px' : 
                                    labelSettings.fontSize === 'large' ? '9px' : '7px',
                          display: 'flex',
                          flexDirection: 'column',
                          padding: '1.5mm',
                          boxSizing: 'border-box',
                          justifyContent: 'center',
                          textAlign: 'center',
                          opacity: copyIndex > 0 ? 0.7 : 1 // Kopie będą lekko przezroczyste
                        }}>
                          {/* Cena na górze - znacznie większa */}
                          {labelSettings.includePrice && (
                            <div style={{ 
                              fontSize: labelSettings.fontSize === 'small' ? '16px' : 
                                        labelSettings.fontSize === 'large' ? '22px' : '19px',
                              fontWeight: 'bold',
                              color: priceInfo.type === 'special' ? '#ff6b35' : '#28a745',
                              lineHeight: '1',
                              marginBottom: '1mm'
                            }}>
                              {priceInfo.price?.toFixed(2)} zł
                            </div>
                          )}

                          {/* Nazwa produktu - jeszcze większa */}
                          {labelSettings.includeSimplifiedName && (
                            <div style={{ 
                              fontWeight: 'bold',
                              fontSize: labelSettings.fontSize === 'small' ? '9px' : 
                                        labelSettings.fontSize === 'large' ? '12px' : '10px',
                              lineHeight: '1.1',
                              marginBottom: '0.5mm',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              color: '#333'
                            }}>
                              {product.simplifiedName || product.nazwa}
                            </div>
                          )}

                          {/* Marka pod nazwą */}
                          {labelSettings.includeManufacturer && product.manufacturer && (
                            <div style={{ 
                              fontWeight: 'bold',
                              fontSize: labelSettings.fontSize === 'small' ? '7px' : 
                                        labelSettings.fontSize === 'large' ? '9px' : '8px',
                              color: '#007bff',
                              lineHeight: '1.1',
                              marginBottom: '0.5mm'
                            }}>
                              {product.manufacturer}
                            </div>
                          )}

                          {/* Jednostki oddzielone kreską */}
                          <div style={{ 
                            fontSize: labelSettings.fontSize === 'small' ? '6px' : 
                                      labelSettings.fontSize === 'large' ? '8px' : '7px',
                            color: '#666',
                            lineHeight: '1.1',
                            marginTop: 'auto'
                          }}>
                            {[
                              unitPrice && `${unitPrice} zł/szt`,
                              labelSettings.includeQuantity && product.packageQuantity && product.packageQuantity !== '1' && `${product.packageQuantity} szt`,
                              labelSettings.includeWeight && product.weight && (!product.packageQuantity || product.packageQuantity === '1') && product.weight
                            ].filter(Boolean).join(' - ')}
                          </div>
                        </div>
                      </div>
                    ));
                  })}
                </div>
              </div>
              <div className="modal-footer">
                <div className="me-auto">
                  <select
                    className="form-select form-select-sm"
                    value={labelSettings.fontSize}
                    onChange={(e) => setLabelSettings({...labelSettings, fontSize: e.target.value})}
                  >
                    <option value="small">Mała czcionka</option>
                    <option value="medium">Średnia czcionka</option>
                    <option value="large">Duża czcionka</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPreview(false)}
                >
                  Zamknij
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handlePrintLabels}
                >
                  <FaPrint className="me-1" />
                  Drukuj etykiety
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CenowkiPage;
