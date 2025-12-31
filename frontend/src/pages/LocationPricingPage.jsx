import React, { useState, useEffect } from 'react';
import { FaMapMarkerAlt, FaEdit, FaTrash, FaCopy, FaHistory, FaPlus, FaStore, FaTag, FaMoneyBill, FaSearch, FaPrint, FaEye, FaCog, FaBarcode, FaWeightHanging, FaBox } from 'react-icons/fa';
import { useLocation as useRouterLocation } from 'react-router-dom';
import { useLocation } from '../contexts/LocationContext';
import { warehousesService } from '../services/warehousesService';
import { warehousePricingService } from '../services/warehousePricingService';
import { productService } from '../services/productService';
import manufacturerService from '../services/manufacturerService';
import { cenowkiService } from '../services/cenowkiService';

// Funkcja do inteligentnego formatowania cen - usuwanie zbędnych zer
const formatPrice = (price, maxDecimals = 2) => {
  if (price === null || price === undefined) return '0.00';
  const num = parseFloat(price);
  if (isNaN(num)) return '0.00';
  
  // Formatuj z maksymalną liczbą miejsc dziesiętnych
  const formatted = num.toFixed(maxDecimals);
  
  // Usuń zbędne zera z końca (ale zostaw co najmniej 2 miejsca dla standardowych cen)
  if (maxDecimals > 2) {
    return formatted.replace(/\.?0+$/, '') || '0';
  }
  
  return formatted;
};

// Funkcja do mapowania jednostek na skrócone nazwy
const getUnitDisplayName = (jednostka_wagi) => {
  const unitMap = {
    'gramy': 'gr',
    'tabletki': 'tab',
    'kapsułki': 'kaps',
    'sztuki': 'szt',
    'ml': 'ml',
    'nieustawiono': '—'
  };
  return unitMap[jednostka_wagi] || jednostka_wagi;
};

// Funkcja do pobierania formy jednostkowej dla wyświetlania (np. "tabletk" -> "tab")
const getUnitSingularForm = (jednostka_wagi) => {
  const singularMap = {
    'tabletki': 'tab',
    'kapsułki': 'kaps',
    'sztuki': 'szt',
    'nieustawiono': '—'
  };
  return singularMap[jednostka_wagi] || jednostka_wagi.slice(0, -1);
};

const LocationPricingPage = () => {
  const routerLocation = useRouterLocation();
  const { selectedLocation, availableLocations, changeLocation } = useLocation();
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

  // Stany dla modali i akcji
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDirectPriceModal, setShowDirectPriceModal] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState(null);
  const [selectedProductForDirectEdit, setSelectedProductForDirectEdit] = useState(null);
  const [priceChangeMode, setPriceChangeMode] = useState('amount'); // 'amount', 'percent', 'margin'
  const [priceChangeValue, setPriceChangeValue] = useState('');
  const [priceHistory, setPriceHistory] = useState([]);
  const [roundToPsychological, setRoundToPsychological] = useState(false); // .99 zaokrąglenie
  const [directPriceNetto, setDirectPriceNetto] = useState('');
  const [directPriceBrutto, setDirectPriceBrutto] = useState('');

  // Stały widok - tylko pricing
  const [currentView, setCurrentView] = useState('pricing');
  
  // Usuń stany związane z przełączaniem widoków
  // const [viewSetByUser, setViewSetByUser] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewProducts, setPreviewProducts] = useState([]);
  
  // Stany bufora cenówek
  const [labelBuffer, setLabelBuffer] = useState([]);
  const [showBuffer, setShowBuffer] = useState(false);
  
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Stany dla producentów
  const [manufacturers, setManufacturers] = useState([]);
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [showManufacturerModal, setShowManufacturerModal] = useState(false);
  const [bulkManufacturerChange, setBulkManufacturerChange] = useState('');
  const [editingProductManufacturer, setEditingProductManufacturer] = useState(null);
  
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

  // Stany dla edycji cenowek
  const [selectedProductForCenowka, setSelectedProductForCenowka] = useState(null);
  const [editingCenowkaProductId, setEditingCenowkaProductId] = useState(null);
  const [cenowkaEditData, setCenowkaEditData] = useState({
    nazwa_uproszczona: '',
    cena_cenowkowa: '',
    cena_promocyjna: '',
    typ_cenowki: 'standardowa',
    kategoria_cenowki: '',
    opis_cenowki: '',
    waga: '',
    jednostka_wagi: 'gramy'
  });

  // Stany dla kalkulatora cen per 100g/per kapsułka
  const [showPriceCalculator, setShowPriceCalculator] = useState(true);
  const [calculatedPrices, setCalculatedPrices] = useState({
    per100g: 0,
    perUnit: 0,
    basePrice: 0
  });

  // Funkcje kalkulatora cen per 100g/per kapsułka
  const calculatePricePerUnit = (price, weight, unit) => {
    if (!price || !weight || weight <= 0 || unit === 'nieustawiono') return 0;
    
    const numPrice = parseFloat(price);
    const numWeight = parseFloat(weight);
    
    switch(unit) {
      case 'gramy':
        // Przelicz na 100g
        return (numPrice / numWeight) * 100;
      case 'ml':
        // Przelicz na 100ml
        return (numPrice / numWeight) * 100;
      case 'tabletki':
      case 'kapsułki':
      case 'sztuki':
        // Cena za jedną tabletkę/kapsułkę/sztukę
        return numPrice / numWeight;
      default:
        return 0;
    }
  };

  const calculatePriceFromUnit = (unitPrice, targetWeight, unit) => {
    if (!unitPrice || !targetWeight || targetWeight <= 0 || unit === 'nieustawiono') return 0;
    
    const numUnitPrice = parseFloat(unitPrice);
    const numTargetWeight = parseFloat(targetWeight);
    
    switch(unit) {
      case 'gramy':
      case 'ml':
        // unitPrice to cena za 100g/100ml, przelicz na targetWeight
        return (numUnitPrice / 100) * numTargetWeight;
      case 'tabletki':
      case 'kapsułki':
      case 'sztuki':
        // unitPrice to cena za sztukę, przelicz na ilość
        return numUnitPrice * numTargetWeight;
      default:
        return 0;
    }
  };

  const updateCalculatedPrices = () => {
    const { cena_cenowkowa, waga, jednostka_wagi } = cenowkaEditData;
    
    if (cena_cenowkowa && waga && parseFloat(waga) > 0) {
      const perUnit = calculatePricePerUnit(cena_cenowkowa, waga, jednostka_wagi);
      
      setCalculatedPrices({
        per100g: jednostka_wagi === 'gramy' || jednostka_wagi === 'ml' ? perUnit : 0,
        perUnit: jednostka_wagi === 'tabletki' || jednostka_wagi === 'kapsułki' || jednostka_wagi === 'sztuki' ? perUnit : 0,
        basePrice: parseFloat(cena_cenowkowa)
      });
    } else {
      setCalculatedPrices({
        per100g: 0,
        perUnit: 0,
        basePrice: 0
      });
    }
  };

  // Effect do automatycznego przeliczania cen
  useEffect(() => {
    updateCalculatedPrices();
  }, [cenowkaEditData.cena_cenowkowa, cenowkaEditData.waga, cenowkaEditData.jednostka_wagi]);

  // Funkcja do ustawiania ceny na podstawie ceny per 100g/per kapsułka
  const setPriceFromCalculator = (unitPrice, targetWeight) => {
    if (!targetWeight || parseFloat(targetWeight) <= 0) {
      alert('Wprowadź prawidłową wagę/ilość');
      return;
    }
    
    const newPrice = calculatePriceFromUnit(unitPrice, targetWeight, cenowkaEditData.jednostka_wagi);
    
    setCenowkaEditData(prev => ({
      ...prev,
      cena_cenowkowa: newPrice.toFixed(2),
      waga: targetWeight
    }));
  };

  // Usuń hook do śledzenia zmian URL - nie potrzebny przy stałym widoku
  // useEffect(() => {
  //   if (!viewSetByUser) {
  //     if (location.pathname === '/cenowki' && currentView === 'pricing') {
  //       setCurrentView('labels');
  //     } else if (location.pathname === '/location-pricing' && currentView === 'labels') {
  //       setCurrentView('pricing');
  //     }
  //   }
  // }, []);

  useEffect(() => {
    loadManufacturers();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      loadLocationPrices(selectedLocation.id);
    }
  }, [selectedLocation]);

  useEffect(() => {
    if (selectedLocation && locationPrices.length >= 0) {
      loadAllProducts();
      
      // WYŁĄCZONE: Automatyczna inicjalizacja może nadpisywać ręcznie ustawione ceny specjalne
      // const initializeIfNeeded = async () => {
      //   const response = await productService.getProducts(1000);
      //   const products = response || [];
      //   const coveragePercent = products.length > 0 ? (locationPrices.length / products.length) * 100 : 0;
      //   
      //   console.log(`Pokrycie cen lokalizacyjnych: ${coveragePercent.toFixed(1)}%`);
      //   
      //   // Jeśli mniej niż 10% produktów ma ceny lokalizacyjne, automatycznie inicjalizuj
      //   if (coveragePercent < 10 && products.length > 0) {
      //     console.log('Automatyczna inicjalizacja cen lokalizacyjnych...');
      //     await initializeLocationPrices();
      //   }
      // };
      //
      // initializeIfNeeded().catch(console.error);
    }
  }, [selectedLocation, locationPrices]);

  const loadManufacturers = async () => {
    try {
      const manufacturersData = await manufacturerService.getManufacturers();
      setManufacturers(manufacturersData || []);
    } catch (err) {
      console.error('Błąd ładowania producentów:', err);
    }
  };

  const loadLocationPrices = async (locationId) => {
    try {
      setLoading(true);
      const response = await warehousePricingService.getWarehousePrices(locationId);
      if (response.success) {
        setLocationPrices(response.data || []);
        console.log(`Załadowano ${response.data?.length || 0} cen magazynowych dla magazynu ${locationId}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Funkcja do odświeżania wszystkich danych po zmianie cen
  const refreshAllData = async () => {
    if (!selectedLocation) return;
    
    console.log('Odświeżam wszystkie dane...');
    await loadLocationPrices(selectedLocation.id);
    // loadAllProducts zostanie wywołane automatycznie przez useEffect
  };

  const calculateMargin = (product, useSpecialPrice = false) => {
    // Marża zawsze obliczana od cen NETTO
    const sellPriceNetto = useSpecialPrice && product.hasSpecialPrice ? 
      product.specialPriceNetto : product.cena_sprzedazy_netto;
    const buyPriceNetto = product.cena_zakupu_netto || product.cena_zakupu || product.purchase_price || 0;
    
    console.log(`🔍 MARGIN DEBUG dla produktu ${product.id}:`, {
      sellPriceNetto,
      buyPriceNetto,
      cena_zakupu_netto: product.cena_zakupu_netto,
      cena_zakupu: product.cena_zakupu,
      purchase_price: product.purchase_price,
      useSpecialPrice
    });
    
    if (!buyPriceNetto || buyPriceNetto <= 0) {
      console.log(`❌ Brak ceny zakupu dla produktu ${product.id}`);
      return { percent: 0, amount: 0 };
    }
    
    const marginAmount = sellPriceNetto - buyPriceNetto;
    const marginPercent = Math.round((marginAmount / buyPriceNetto) * 100);
    
    const result = {
      percent: marginPercent,
      amount: parseFloat(marginAmount.toFixed(2))
    };
    
    console.log(`✅ MARGIN RESULT dla produktu ${product.id}:`, result);
    return result;
  };

  // Funkcja do inicjalizacji cen lokalizacyjnych dla wszystkich produktów
  // UWAGA: NIE nadpisuje ręcznie ustawionych cen specjalnych
  const initializeLocationPrices = async () => {
    if (!selectedLocation) return;
    
    try {
      setLoading(true);
      const response = await productService.getProducts(1000);
      const products = response || [];
      
      // Filtruj produkty - tylko te które nie mają ŻADNYCh cen magazynowych
      // lub mają tylko ceny automatyczne (created_by = 'api_user')
      const productsWithoutLocationPrices = products.filter(product => {
        const locationPrice = locationPrices.find(lp => lp.product_id === product.id);
        if (!locationPrice) {
          return true; // Brak ceny - może być zainicjalizowany
        }
        
        // Jeśli cena istnieje, sprawdź czy jest automatyczna czy ręczna
        // NIE inicjalizuj jeśli cena została ustawiona ręcznie
        return locationPrice.created_by === 'api_user';
      });
      
      console.log(`Inicjalizuję ceny dla ${productsWithoutLocationPrices.length} produktów (tylko produkty bez cen lub z cenami automatycznymi)`);
      
      if (productsWithoutLocationPrices.length > 0) {
        // Tworzymy wpisy dla produktów bez cen magazynowych lub z cenami automatycznymi
        const promises = productsWithoutLocationPrices.map(product => 
          warehousePricingService.setWarehousePrice(selectedLocation.id, product.id, {
            cena_sprzedazy_netto: product.cena_sprzedazy_netto,
            cena_sprzedazy_brutto: product.cena_sprzedazy_brutto,
            created_by: 'auto_init' // Oznacz jako automatyczną inicjalizację
          })
        );
        
        await Promise.all(promises);
        console.log(`Zainicjalizowano ${productsWithoutLocationPrices.length} wpisów cenowych (automatycznych)`);
        
        // Przeładuj ceny magazynowe
        await loadLocationPrices(selectedLocation.id);
      }
    } catch (err) {
      console.error('Błąd inicjalizacji cen lokalizacyjnych:', err);
      setError('Błąd inicjalizacji cen lokalizacyjnych');
    } finally {
      setLoading(false);
    }
  };

  const loadAllProducts = async (forceRefreshPrices = false) => {
    if (!selectedLocation) {
      console.log('Brak wybranego magazynu - nie ładuję produktów');
      return;
    }

    try {
      setLoading(true);
      
      // Jeśli wymagane odświeżenie cen, pobierz je na świeżo
      let currentLocationPrices = locationPrices;
      if (forceRefreshPrices) {
        const pricesResponse = await warehousePricingService.getWarehousePrices(selectedLocation.id);
        if (pricesResponse.success) {
          currentLocationPrices = pricesResponse.data || [];
          setLocationPrices(currentLocationPrices);
          console.log(`Odświeżono ${currentLocationPrices.length} cen magazynowych`);
        }
      }
      
      const response = await productService.getProducts(1000);
      const products = response || [];
      
      console.log('🔍 DEBUG - Raw products from API (first 3):', products.slice(0, 3).map(p => ({
        id: p.id,
        nazwa: p.nazwa,
        nazwa_uproszczona: p.nazwa_uproszczona,
        cena_sprzedazy_brutto: p.cena_sprzedazy_brutto
      })));
      console.log('Produkty z API:', products.length);
      console.log('Ceny lokalizacyjne:', currentLocationPrices.length);
      
      const productsWithPrices = products.map(product => {
        const locationPrice = currentLocationPrices.find(lp => lp.product_id === product.id);
        // Zawsze ustawiamy hasSpecialPrice na true jeśli istnieje wpis lokalizacyjny 
        // ALBO false jeśli go nie ma (ale nadal pokazujemy status)
        const hasSpecialPrice = !!locationPrice;
        
        const defaultMargin = calculateMargin(product, false);
        const specialMargin = hasSpecialPrice ? calculateMargin({
          ...product,
          hasSpecialPrice: true,
          specialPriceNetto: locationPrice.cena_sprzedazy_netto
        }, true) : null;
        
        const result = {
          ...product,
          hasSpecialPrice,
          specialPriceNetto: locationPrice?.cena_sprzedazy_netto || null,
          specialPriceBrutto: locationPrice?.cena_sprzedazy_brutto || null,
          priceDiffPercent: hasSpecialPrice ? 
            Math.round(((locationPrice.cena_sprzedazy_brutto - product.cena_sprzedazy_brutto) / product.cena_sprzedazy_brutto) * 100) : 0,
          defaultMargin,
          specialMargin
        };
        
        if (hasSpecialPrice) {
          console.log(`Produkt ${product.nazwa} ma cenę specjalną: netto ${locationPrice.cena_sprzedazy_netto} zł, brutto ${locationPrice.cena_sprzedazy_brutto} zł`);
        }
        
        return result;
      });
      
      setAllProducts(productsWithPrices);
      console.log('Załadowano produkty:', productsWithPrices.length, 'z cenami specjalnymi:', productsWithPrices.filter(p => p.hasSpecialPrice).length);
      
      // Ekstraktuj unikalne kategorie
      const uniqueCategories = [...new Set(productsWithPrices.map(p => p.kategoria).filter(Boolean))];
      setCategories(uniqueCategories.sort());
      
    } catch (err) {
      console.error('Błąd ładowania produktów:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Pomocnicze funkcje do ekstrakcji danych dla etykiet
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

  const getDisplayPrice = (product) => {
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

  const handlePreviewLabels = async () => {
    const selectedProductsList = getFilteredProducts().filter(p => selectedProducts.has(p.id));
    
    if (!selectedLocation) {
      alert('Proszę najpierw wybrać magazyn');
      return;
    }

    const enrichedProducts = await Promise.all(selectedProductsList.map(async (product) => {
      const priceInfo = getDisplayPrice(product);
      
      // Pobierz dane z cenówki
      let finalName = product.nazwa_uproszczona || simplifyProductName(product.nazwa);
      try {
        const locationId = selectedLocation?.location_id || selectedLocation;
        const cenowkaResponse = await cenowkiService.getCenowkaByProduct(product.id, locationId);
        const existingCenowka = cenowkaResponse?.data;
        
        if (existingCenowka && existingCenowka.nazwa_uproszczona) {
          finalName = existingCenowka.nazwa_uproszczona;
        }
      } catch (error) {
        console.warn('Nie udało się pobrać cenówki dla podglądu:', error);
      }

      const enriched = {
        ...product,
        // Używaj nazwy uproszczonej z cenówki
        simplifiedName: finalName,
        finalName: finalName,
        packageQuantity: extractPackageQuantity(product.nazwa, product.opis),
        weight: extractWeight(product.nazwa, product.opis),
        manufacturer: product.producent || extractManufacturer(product.nazwa),
        // Użyj prawidłowej ceny (specjalnej jeśli istnieje)
        displayPrice: priceInfo.price
      };
      
      console.log('🔍 DEBUG - Preview product:', enriched);
      return enriched;
    }));
    
    setPreviewProducts(enrichedProducts);
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
    console.log('handlePrintLabels wywołana - LocationPricingPage');
    console.log('allProducts:', allProducts);
    console.log('selectedProducts:', selectedProducts);
    
    // Sprawdź czy allProducts jest dostępne
    if (!allProducts || allProducts.length === 0) {
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
      const product = allProducts.find(p => p.id === productId);
      if (product) {
        try {
          const quantity = extractPackageQuantity(product.nazwa, product.opis);
          const weight = extractWeight(product.nazwa, product.opis);
          const manufacturer = extractManufacturer(product.nazwa);
          const units = [quantity, weight].filter(Boolean).join(' - ');
          
          // Dodaj tyle kopii ile wybrano
          const copies = selectedForCopy.has(productId) ? copyMultiplier : 1;
          for (let i = 0; i < copies; i++) {
            labelsToShow.push({
              price: `${parseFloat(product.cena_sprzedazy_brutto || 0).toFixed(2)} zł`,
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

  // Funkcje bufora cenówek
  const addToBuffer = async (product, cenowkaData = null) => {
    if (!selectedLocation) {
      alert('Proszę najpierw wybrać magazyn');
      return;
    }

    let finalCenowkaData = cenowkaData;

    // Jeśli nie podano danych cenówki, pobierz je z API
    if (!cenowkaData) {
      try {
        const locationId = selectedLocation?.location_id || selectedLocation;
        const cenowkaResponse = await cenowkiService.getCenowkaByProduct(product.id, locationId);
        const existingCenowka = cenowkaResponse?.data;
        
        if (existingCenowka) {
          finalCenowkaData = {
            nazwa_uproszczona: existingCenowka.nazwa_uproszczona || '',
            cena_cenowkowa: existingCenowka.cena_cenowkowa || '',
            cena_promocyjna: existingCenowka.cena_promocyjna || '',
            typ_cenowki: existingCenowka.typ_cenowki || 'standardowa',
            kategoria_cenowki: existingCenowka.kategoria_cenowki || '',
            opis_cenowki: existingCenowka.opis_cenowki || '',
            waga: existingCenowka.waga || product.gramatura || product.ilosc_jednostek || 0,
            jednostka_wagi: existingCenowka.jednostka_wagi || product.jednostka_wagi || 'gramy'
          };
        }
      } catch (error) {
        console.warn('Nie udało się pobrać cenówki dla bufora:', error);
      }
    }

    // Użyj danych z cenówki lub fallback
    const priceInfo = getDisplayPrice(product);
    const productWithCenowka = {
      ...product,
      // Używaj nazwy uproszczonej z cenówki
      nazwa_uproszczona: finalCenowkaData?.nazwa_uproszczona || product.nazwa_uproszczona || product.nazwa,
      finalName: finalCenowkaData?.nazwa_uproszczona || product.nazwa_uproszczona || product.nazwa,
      cenowka: finalCenowkaData || {
        // Używaj ceny specjalnej jeśli istnieje
        cena_cenowkowa: priceInfo.price,
        waga: product.gramatura || product.ilosc_jednostek || 0,
        jednostka_wagi: product.jednostka_wagi || 'gramy'
      },
      bufferId: Date.now() + Math.random() // Unikalny ID dla bufora
    };

    console.log('🔍 DEBUG - Buffer product:', productWithCenowka);

    setLabelBuffer(prev => {
      // Sprawdź czy produkt już jest w buforze
      const exists = prev.find(item => item.id === product.id);
      if (exists) {
        alert('Ten produkt już jest w buforze cenówek');
        return prev;
      }
      return [...prev, productWithCenowka];
    });
  };

  const removeFromBuffer = (bufferId) => {
    setLabelBuffer(prev => prev.filter(item => item.bufferId !== bufferId));
  };

  const clearBuffer = () => {
    setLabelBuffer([]);
  };

  const printBufferLabels = () => {
    if (labelBuffer.length === 0) {
      alert('Bufor cenówek jest pusty');
      return;
    }

    const printStyles = `
      body * { visibility: hidden; }
      #bufferLabelsToPrint, #bufferLabelsToPrint * { visibility: visible; }
      #bufferLabelsToPrint { 
        position: absolute; 
        left: 0; 
        top: 0; 
        width: 100%; 
        margin: 0;
        padding: 0;
      }
      @page {
        size: A4;
        margin: 5mm;
      }
      .col-md-6, .col-lg-4 { 
        width: auto !important; 
        float: left; 
        margin: 2mm;
        page-break-inside: avoid;
      }
      .price-label { 
        border: 1px solid #000 !important;
        width: 4cm !important;
        height: 2cm !important;
        display: flex !important;
        flex-direction: column !important;
        padding: 1mm !important;
        box-sizing: border-box !important;
        font-family: Arial, sans-serif !important;
        page-break-inside: avoid !important;
      }
      /* Zapobieganie łamaniu etykiet */
      .price-label * {
        color: #000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    `;

    const head = document.head || document.getElementsByTagName('head')[0];
    const style = document.createElement('style');
    style.innerHTML = printStyles;
    head.appendChild(style);
    
    // Drukuj
    setTimeout(() => {
      window.print();
      // Usuń style po drukowaniu
      head.removeChild(style);
    }, 100);
  };

  // Funkcje do zarządzania producentami
  const handleBulkManufacturerChange = async () => {
    if (!bulkManufacturerChange || selectedProducts.size === 0) {
      alert('Wybierz producenta i produkty do zmiany');
      return;
    }

    try {
      const selectedProductIds = Array.from(selectedProducts);
      await manufacturerService.bulkUpdateProductManufacturer(selectedProductIds, bulkManufacturerChange);
      
      // Odśwież produkty
      loadAllProducts();
      setSelectedProducts(new Set());
      setBulkManufacturerChange('');
      setShowManufacturerModal(false);
      alert('Producenci zostali zaktualizowani');
    } catch (err) {
      console.error('Błąd podczas zmiany producentów:', err);
      alert('Błąd podczas zmiany producentów');
    }
  };

  const handleSingleManufacturerChange = async (productId, newManufacturerId) => {
    try {
      await manufacturerService.updateProductManufacturer(productId, newManufacturerId);
      loadAllProducts();
      setEditingProductManufacturer(null);
    } catch (err) {
      console.error('Błąd podczas zmiany producenta:', err);
      alert('Błąd podczas zmiany producenta');
    }
  };

  const getFilteredProducts = () => {
    return allProducts.filter(product => {
      const searchMatch = !filterTerm || 
        product.nazwa?.toLowerCase().includes(filterTerm.toLowerCase()) ||
        product.kod_produktu?.toLowerCase().includes(filterTerm.toLowerCase()) ||
        product.ean?.toLowerCase().includes(filterTerm.toLowerCase()) ||
        product.producent?.toLowerCase().includes(filterTerm.toLowerCase());
      
      if (!searchMatch) return false;

      // Filtr kategorii
      if (selectedCategory && product.kategoria !== selectedCategory) {
        return false;
      }

      // Filtr producenta
      if (selectedManufacturer && product.producent_id !== parseInt(selectedManufacturer)) {
        return false;
      }

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

  // Funkcje do obsługi edycji cenowek
  const handleEditCenowka = async (product) => {
    // Jeśli już edytujemy ten produkt, zamknij edycję
    if (editingCenowkaProductId === product.id) {
      setEditingCenowkaProductId(null);
      setSelectedProductForCenowka(null);
      return;
    }

    // Sprawdź czy selectedLocation jest ustawione
    if (!selectedLocation) {
      alert('Proszę najpierw wybrać magazyn');
      return;
    }

    // Ustaw produkt do edycji
    setEditingCenowkaProductId(product.id);
    setSelectedProductForCenowka(product);
    
    // Pobierz aktualną cenówkę z bazy danych z aktualną ceną specjalną
    try {
      console.log('🔍 DEBUG - Pobieranie cenówki dla produktu:', product.id, 'magazyn:', selectedLocation);
      // Upewnij się, że używamy id z warehouse
      const locationId = selectedLocation?.id || selectedLocation;
      console.log('🔍 DEBUG - Używam location_id:', locationId);
      
      const cenowkaResponse = await cenowkiService.getCenowkaByProduct(product.id, locationId);
      const existingCenowka = cenowkaResponse?.data;
      console.log('🔍 DEBUG - Otrzymana cenówka z unified system:', existingCenowka);
      
      if (existingCenowka) {
        // Użyj danych z połączonych tabel (cenówka + warehouse_product_prices)
        const cenowkaData = {
          nazwa_uproszczona: existingCenowka.nazwa_uproszczona || '',
          cena_cenowkowa: existingCenowka.cena_cenowkowa || '', // już zawiera aktualną cenę z warehouse_product_prices
          cena_promocyjna: existingCenowka.cena_promocyjna || '',
          typ_cenowki: existingCenowka.typ_cenowki || 'standardowa',
          kategoria_cenowki: existingCenowka.kategoria_cenowki || '',
          opis_cenowki: existingCenowka.opis_cenowki || '',
          waga: existingCenowka.waga || '',
          jednostka_wagi: existingCenowka.jednostka_wagi || 'gramy'
        };
        console.log('🔍 DEBUG - Ustawiam dane cenówki z unified system:', cenowkaData);
        setCenowkaEditData(cenowkaData);
      } else {
        // Użyj domyślnych wartości dla nowej cenówki
        setCenowkaEditData({
          nazwa_uproszczona: product.simplifiedName || product.nazwa || '',
          cena_cenowkowa: product.hasSpecialPrice ? product.specialPriceBrutto : product.cena_sprzedazy_brutto || '',
          cena_promocyjna: '',
          typ_cenowki: 'standardowa',
          kategoria_cenowki: '',
          opis_cenowki: '',
          waga: '',
          jednostka_wagi: 'gramy'
        });
      }
    } catch (error) {
      console.warn('Nie udało się pobrać cenówki, używam domyślnych wartości:', error);
      // Fallback do domyślnych wartości
      setCenowkaEditData({
        nazwa_uproszczona: product.simplifiedName || product.nazwa || '',
        cena_cenowkowa: product.specialPrice || product.cena_sprzedazy_brutto || '',
        cena_promocyjna: '',
        typ_cenowki: 'standardowa',
        kategoria_cenowki: '',
        opis_cenowki: '',
        waga: '',
        jednostka_wagi: 'gramy'
      });
    }
  };

  const handleSaveCenowka = async () => {
    if (!selectedProductForCenowka || !cenowkaEditData.nazwa_uproszczona || !cenowkaEditData.cena_cenowkowa) {
      alert('Uzupełnij wymagane pola: nazwę uproszczoną i cenę');
      return;
    }

    if (!selectedLocation) {
      alert('Nie wybrano magazynu');
      return;
    }

    try {
      const cenowkaData = {
        product_id: selectedProductForCenowka.id,
        location_id: selectedLocation.id, // Używaj id zamiast location_id
        nazwa_uproszczona: cenowkaEditData.nazwa_uproszczona,
        cena_cenowkowa: parseFloat(cenowkaEditData.cena_cenowkowa),
        cena_promocyjna: cenowkaEditData.cena_promocyjna ? parseFloat(cenowkaEditData.cena_promocyjna) : null,
        typ_cenowki: cenowkaEditData.typ_cenowki,
        kategoria_cenowki: cenowkaEditData.kategoria_cenowki || null,
        opis_cenowki: cenowkaEditData.opis_cenowki || null,
        waga: cenowkaEditData.waga ? parseFloat(cenowkaEditData.waga) : null,
        jednostka_wagi: cenowkaEditData.jednostka_wagi || 'gramy',
        aktywny: true
      };

      // Zapisz cenówkę przez API
      await cenowkiService.createOrUpdateCenowka(cenowkaData);
      
      // Odśwież listę produktów z wymuszonym odświeżeniem cen lokalizacyjnych
      await loadAllProducts(true);
      
      // Zamknij edycję inline
      setEditingCenowkaProductId(null);
      setSelectedProductForCenowka(null);
      
      alert('Cenówka została zapisana!');
    } catch (error) {
      console.error('Błąd podczas zapisywania cenowki:', error);
      alert('Błąd podczas zapisywania cenowki: ' + error.message);
    }
  };

  const handleCancelCenowkaEdit = () => {
    setEditingCenowkaProductId(null);
    setSelectedProductForCenowka(null);
  };

  // Funkcje do zarządzania cenami
  const handleBulkPriceChange = async () => {
    if (selectedProducts.size === 0) {
      alert('Nie wybrano żadnych produktów');
      return;
    }
    // Reset wartości modala
    setPriceChangeValue('');
    setPriceChangeMode('amount');
    setRoundToPsychological(false);
    setShowPriceModal(true);
  };

  const applyPriceChange = async () => {
    if (!priceChangeValue || isNaN(priceChangeValue)) {
      alert('Podaj prawidłową wartość');
      return;
    }

    const changeValue = parseFloat(priceChangeValue);
    const selectedProductsList = getFilteredProducts().filter(p => selectedProducts.has(p.id));

    if (selectedProductsList.length === 0) {
      alert('Nie znaleziono produktów do aktualizacji');
      return;
    }

    try {
      setLoading(true);
      let successCount = 0;
      let errorCount = 0;
      
      for (const product of selectedProductsList) {
        try {
          let newPriceNetto;
          
          // Pobierz aktualną cenę netto
          const currentPriceNetto = product.hasSpecialPrice ? 
            product.specialPriceNetto : 
            product.cena_sprzedazy_netto;

          switch (priceChangeMode) {
            case 'amount':
              newPriceNetto = currentPriceNetto + changeValue;
              break;
            case 'percent':
              newPriceNetto = currentPriceNetto * (1 + changeValue / 100);
              break;
            case 'margin':
              if (!product.cena_zakupu || product.cena_zakupu <= 0) {
                console.warn(`Produkt ${product.nazwa} nie ma ceny zakupu - pomijam`);
                continue;
              }
              const targetMargin = changeValue / 100;
              newPriceNetto = product.cena_zakupu * (1 + targetMargin);
              break;
            default:
              continue;
          }

          if (newPriceNetto <= 0) {
            console.warn(`Nieprawidłowa cena dla produktu ${product.nazwa} - pomijam`);
            continue;
          }

          // Oblicz cenę brutto
          const vatRate = (product.stawka_vat || 23) / 100;
          let newPriceBrutto = newPriceNetto * (1 + vatRate);

          // Zaokrąglenie psychologiczne do .99
          if (roundToPsychological) {
            newPriceBrutto = Math.floor(newPriceBrutto) + 0.99;
            // Przelicz cenę netto z powrotem
            newPriceNetto = newPriceBrutto / (1 + vatRate);
          }

          // Zaokrąglij do 2 miejsc po przecinku
          newPriceNetto = Math.round(newPriceNetto * 100) / 100;
          newPriceBrutto = Math.round(newPriceBrutto * 100) / 100;
          
          console.log(`Aktualizuję cenę produktu ${product.nazwa}: ${currentPriceNetto} -> ${newPriceNetto}`);
          
          const response = await warehousePricingService.setWarehousePrice(selectedLocation.id, product.id, {
            cena_sprzedazy_netto: newPriceNetto,
            cena_sprzedazy_brutto: newPriceBrutto,
            created_by: "user_bulk"
          });

          if (response.success) {
            successCount++;
          } else {
            console.error(`Błąd aktualizacji ceny dla ${product.nazwa}:`, response);
            errorCount++;
          }
        } catch (productError) {
          console.error(`Błąd podczas aktualizacji produktu ${product.nazwa}:`, productError);
          errorCount++;
        }
      }

      // Odśwież dane
      await refreshAllData();
      
      // Zamknij modal i wyczyść
      setShowPriceModal(false);
      setPriceChangeValue('');
      setSelectedProducts(new Set());
      
      // Pokaż wynik
      if (successCount > 0) {
        alert(`Pomyślnie zaktualizowano ceny ${successCount} produktów${errorCount > 0 ? `, błędów: ${errorCount}` : ''}`);
      } else {
        alert('Nie udało się zaktualizować żadnej ceny');
      }
      
    } catch (err) {
      console.error('Błąd podczas aktualizacji cen:', err);
      setError(`Błąd podczas aktualizacji cen: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSpecialPrices = async () => {
    if (selectedProducts.size === 0) {
      alert('Nie wybrano żadnych produktów');
      return;
    }

    if (!window.confirm(`Czy na pewno chcesz usunąć ceny specjalne dla ${selectedProducts.size} produktów?`)) {
      return;
    }

    try {
      setLoading(true);
      
      for (const productId of selectedProducts) {
        await warehousePricingService.removeWarehousePrice(selectedLocation.id, productId);
      }

      await refreshAllData();
      setSelectedProducts(new Set());
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShowHistory = async (product) => {
    try {
      setSelectedProductForHistory(product);
      setLoading(true);
      
      // Pobieramy prawdziwą historię cen z API
      const response = await warehousePricingService.getPriceHistory(selectedLocation.id, product.id);
      if (response.success) {
        setPriceHistory(response.data || []);
      } else {
        // Jeśli nie ma historii, pokazujemy pustą listę
        setPriceHistory([]);
      }
      
      setShowHistoryModal(true);
      
    } catch (err) {
      // W przypadku błędu (np. endpoint nie istnieje), pokazujemy mock data
      console.warn('Nie można pobrać historii cen, używam danych przykładowych:', err.message);
      const mockHistory = [
        {
          id: 1,
          date: '2024-01-15 10:30:00',
          old_price_netto: 10.00,
          new_price_netto: 12.50,
          old_price_brutto: 12.30,
          new_price_brutto: 15.38,
          change_type: 'manual',
          user: 'Admin',
          reason: 'Aktualizacja cennika'
        },
        {
          id: 2,
          date: '2024-01-10 14:15:00',
          old_price_netto: 8.50,
          new_price_netto: 10.00,
          old_price_brutto: 10.46,
          new_price_brutto: 12.30,
          change_type: 'bulk',
          user: 'Manager',
          reason: 'Wzrost marży o 15%'
        }
      ];
      
      setPriceHistory(mockHistory);
      setShowHistoryModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectPriceEdit = (product) => {
    setSelectedProductForDirectEdit(product);
    
    // Ustaw aktualne ceny jako wartości domyślne
    if (product.hasSpecialPrice) {
      setDirectPriceNetto(product.specialPriceNetto?.toString() || '');
      setDirectPriceBrutto(product.specialPriceBrutto?.toString() || '');
    } else {
      setDirectPriceNetto(product.cena_sprzedazy_netto?.toString() || '');
      setDirectPriceBrutto(product.cena_sprzedazy_brutto?.toString() || '');
    }
    
    setShowDirectPriceModal(true);
  };

  const calculatePriceFromNetto = (netto, vatRate) => {
    if (!netto || isNaN(netto)) return '';
    const brutto = parseFloat(netto) * (1 + vatRate / 100);
    return brutto.toFixed(2);
  };

  const calculatePriceFromBrutto = (brutto, vatRate) => {
    if (!brutto || isNaN(brutto)) return '';
    const netto = parseFloat(brutto) / (1 + vatRate / 100);
    return netto.toFixed(2);
  };

  const applyDirectPriceChange = async () => {
    if (!directPriceNetto || !directPriceBrutto || isNaN(directPriceNetto) || isNaN(directPriceBrutto)) {
      alert('Podaj prawidłowe ceny netto i brutto');
      return;
    }

    const newPriceNetto = parseFloat(directPriceNetto);
    const newPriceBrutto = parseFloat(directPriceBrutto);

    if (newPriceNetto <= 0 || newPriceBrutto <= 0) {
      alert('Ceny muszą być większe od zera');
      return;
    }

    try {
      setLoading(true);
      
      const response = await warehousePricingService.setWarehousePrice(selectedLocation.id, selectedProductForDirectEdit.id, {
        cena_sprzedazy_netto: newPriceNetto,
        cena_sprzedazy_brutto: newPriceBrutto,
        created_by: "user_manual"
      });

      if (response.success) {
        // Odśwież dane
        await refreshAllData();
        
        // Zamknij modal i wyczyść
        setShowDirectPriceModal(false);
        setDirectPriceNetto('');
        setDirectPriceBrutto('');
        setSelectedProductForDirectEdit(null);
        
        alert('Cena została pomyślnie zaktualizowana');
      } else {
        alert(`Błąd aktualizacji ceny: ${response.error || 'Nieznany błąd'}`);
      }
      
    } catch (err) {
      console.error('Błąd podczas aktualizacji ceny:', err);
      setError(`Błąd podczas aktualizacji ceny: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !selectedLocation) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Ładowanie...</span>
          </div>
          <p className="mt-2">Ładowanie magazynów...</p>
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
            Cennik Lokalizacyjny & Etykiety
          </h2>
          <p className="text-muted">
            Zarządzanie cenami lokalizacyjnymi i generowanie etykiet cenowych
          </p>
        </div>
        <div className="col-auto">
        {/* Usuń przełączniki widoków - tylko widok zarządzania cenami */}
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
              <label className="form-label mb-0 fw-bold me-2">Magazyn:</label>
            </div>
            <div className="flex-grow-1" style={{ maxWidth: '300px' }}>
              <select
                className="form-select form-select-sm"
                value={selectedLocation?.id || ''}
                onChange={(e) => {
                  const locationId = parseInt(e.target.value);
                  changeLocation(locationId);
                }}
              >
                <option value="">-- Wybierz magazyn --</option>
                {availableLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.nazwa} ({loc.kod_magazynu})
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
                  Zarządzanie cenami: {selectedLocation.nazwa}
                </h6>
                <div className="d-flex gap-2">
                  {selectedProducts.size > 0 && (
                    <>
                      <span className="badge bg-info">
                        Zaznaczonych: {selectedProducts.size}
                      </span>
                      <button
                        className="btn btn-success btn-sm me-2"
                        onClick={initializeLocationPrices}
                        title="Zainicjalizuj ceny dla wszystkich produktów"
                      >
                        <FaPlus className="me-1" />
                        Inicjalizuj wszystkie ceny
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={handleBulkPriceChange}
                        title="Zmień ceny zaznaczonych produktów"
                      >
                        <FaEdit className="me-1" />
                        Edytuj ceny
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={handleRemoveSpecialPrices}
                        title="Usuń ceny specjalne"
                      >
                        <FaTrash className="me-1" />
                        Usuń specjalne
                      </button>
                      <button
                        className="btn btn-warning btn-sm me-2"
                        onClick={() => setShowManufacturerModal(true)}
                        disabled={selectedProducts.size === 0}
                        title="Zmień producenta zaznaczonych produktów"
                      >
                        <FaEdit className="me-1" />
                        Zmień producenta
                      </button>
                      <button
                        className="btn btn-info btn-sm me-2"
                        onClick={handlePreviewLabels}
                        disabled={selectedProducts.size === 0}
                        title="Podgląd cenówek zaznaczonych produktów"
                      >
                        <FaEye className="me-1" />
                        Podgląd cenówek
                      </button>
                    </>
                  )}
                  <button
                    className="btn btn-outline-secondary btn-sm ms-2"
                    onClick={() => setShowBuffer(true)}
                    title={`Bufor cenówek (${labelBuffer.length})`}
                  >
                    <FaTag className="me-1" />
                    Bufor ({labelBuffer.length})
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div style={{ 
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '0.375rem',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                    {/* Wyszukiwarka */}
                    <div style={{ flex: '1 1 300px', minWidth: '250px' }}>
                      <div style={{ position: 'relative' }}>
                        <FaSearch style={{
                          position: 'absolute',
                          left: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#6c757d',
                          fontSize: '0.875rem'
                        }} />
                        <input
                          type="text"
                          style={{
                            width: '100%',
                            padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                            border: '1px solid #dee2e6',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            backgroundColor: 'white',
                            outline: 'none',
                            transition: 'border-color 0.15s ease-in-out'
                          }}
                          placeholder="Szukaj produktu..."
                          value={filterTerm}
                          onChange={(e) => setFilterTerm(e.target.value)}
                          onFocus={(e) => e.target.style.borderColor = '#86b7fe'}
                          onBlur={(e) => e.target.style.borderColor = '#dee2e6'}
                        />
                      </div>
                    </div>

                    {/* Kategorie */}
                    <div style={{ flex: '0 0 180px' }}>
                      <select
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          border: '1px solid #dee2e6',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          backgroundColor: 'white',
                          outline: 'none'
                        }}
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

                    {/* Producenci */}
                    <div style={{ flex: '0 0 180px' }}>
                      <select
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          border: '1px solid #dee2e6',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          backgroundColor: 'white',
                          outline: 'none'
                        }}
                        value={selectedManufacturer}
                        onChange={(e) => setSelectedManufacturer(e.target.value)}
                      >
                        <option value="">Wszyscy producenci</option>
                        {manufacturers.map((manufacturer) => (
                          <option key={manufacturer.id} value={manufacturer.id}>
                            {manufacturer.nazwa}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Statystyki i przycisk */}
                    <div style={{ 
                      flex: '1 1 auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '0.75rem',
                      minWidth: '200px'
                    }}>
                      <span style={{ 
                        fontSize: '0.75rem',
                        color: '#6c757d',
                        fontWeight: '500'
                      }}>
                        {getFilteredProducts().length} produktów | {selectedProducts.size} zaznaczonych
                      </span>
                      {getFilteredProducts().length > 0 && (
                        <button
                          style={{
                            padding: '0.375rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            border: '1px solid #dee2e6',
                            borderRadius: '0.375rem',
                            backgroundColor: 'white',
                            color: '#495057',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease-in-out'
                          }}
                          onClick={handleSelectAll}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#e9ecef';
                            e.target.style.borderColor = '#adb5bd';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'white';
                            e.target.style.borderColor = '#dee2e6';
                          }}
                        >
                          {selectedProducts.size === getFilteredProducts().length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Zaawansowane filtry */}
                <div style={{ 
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  backgroundColor: 'white',
                  borderRadius: '0.375rem',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'end' }}>
                    <div style={{ flex: '0 0 160px' }}>
                      <label style={{ 
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        color: '#495057',
                        marginBottom: '0.25rem'
                      }}>
                        Typ ceny:
                      </label>
                      <select 
                        style={{
                          width: '100%',
                          padding: '0.375rem 0.5rem',
                          border: '1px solid #dee2e6',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          backgroundColor: 'white',
                          outline: 'none'
                        }}
                        value={advancedFilters.priceType}
                        onChange={(e) => setAdvancedFilters(prev => ({
                          ...prev,
                          priceType: e.target.value
                        }))}
                      >
                        <option value="all">Wszystkie</option>
                        <option value="special">Specjalne</option>
                        <option value="default">Domyślne</option>
                      </select>
                    </div>

                    <div style={{ flex: '0 0 140px' }}>
                      <label style={{ 
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        color: '#495057',
                        marginBottom: '0.25rem'
                      }}>
                        Filtr marży:
                      </label>
                      <select 
                        style={{
                          width: '100%',
                          padding: '0.375rem 0.5rem',
                          border: '1px solid #dee2e6',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          backgroundColor: 'white',
                          outline: 'none'
                        }}
                        value={advancedFilters.marginFilter}
                        onChange={(e) => setAdvancedFilters(prev => ({
                          ...prev,
                          marginFilter: e.target.value
                        }))}
                      >
                        <option value="all">Wszystkie</option>
                        <option value="below">Niższa niż</option>
                      </select>
                    </div>

                    <div style={{ flex: '0 0 100px' }}>
                      <label style={{ 
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        color: '#495057',
                        marginBottom: '0.25rem'
                      }}>
                        Próg (%):
                      </label>
                      <input
                        type="number"
                        style={{
                          width: '100%',
                          padding: '0.375rem 0.5rem',
                          border: '1px solid #dee2e6',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          backgroundColor: advancedFilters.marginFilter === 'all' ? '#f8f9fa' : 'white',
                          outline: 'none',
                          color: advancedFilters.marginFilter === 'all' ? '#6c757d' : '#495057'
                        }}
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

                {getFilteredProducts().length === 0 ? (
                  <div className="text-center py-5">
                    <FaStore className="fa-3x text-muted mb-3" />
                    <h5 className="text-muted">Brak produktów</h5>
                    <p className="text-muted">
                      {filterTerm ? 'Brak produktów spełniających kryteria wyszukiwania' : 'Magazyn jest pusty'}
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ 
                      width: '100%',
                      minWidth: '900px',
                      fontSize: '0.8rem',
                      borderCollapse: 'separate',
                      borderSpacing: 0
                    }}>
                      <thead style={{ 
                        backgroundColor: '#f8f9fa',
                        borderBottom: '2px solid #dee2e6'
                      }}>
                        <tr style={{ fontSize: '0.75rem' }}>
                          <th style={{ 
                            width: '40px',
                            padding: '0.5rem 0.25rem',
                            textAlign: 'center',
                            fontWeight: '600',
                            color: '#495057'
                          }}>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={selectedProducts.size === getFilteredProducts().length && getFilteredProducts().length > 0}
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th style={{ 
                            width: '120px',
                            padding: '0.5rem',
                            fontWeight: '600',
                            color: '#495057'
                          }}>Producent</th>
                          <th style={{ 
                            minWidth: '250px',
                            width: '30%',
                            padding: '0.5rem',
                            fontWeight: '600',
                            color: '#495057'
                          }}>Produkt</th>
                          <th style={{ 
                            width: '140px',
                            padding: '0.5rem',
                            fontWeight: '600',
                            color: '#495057'
                          }}>Kod/EAN</th>
                          <th style={{ 
                            width: '100px',
                            padding: '0.5rem',
                            fontWeight: '600',
                            color: '#495057'
                          }}>Opakowanie</th>
                          <th style={{ 
                            width: '80px',
                            padding: '0.5rem',
                            fontWeight: '600',
                            color: '#495057'
                          }}>Jednostka</th>
                          <th style={{ 
                            width: '120px',
                            padding: '0.5rem',
                            fontWeight: '600',
                            color: '#495057'
                          }}>Cena zakupu</th>
                          <th style={{ 
                            width: '120px',
                            padding: '0.5rem',
                            fontWeight: '600',
                            color: '#495057'
                          }}>Cena domyślna</th>
                          <th style={{ 
                            width: '120px',
                            padding: '0.5rem',
                            fontWeight: '600',
                            color: '#495057'
                          }}>Cena specjalna</th>
                          <th style={{ 
                            width: '80px',
                            padding: '0.5rem',
                            fontWeight: '600',
                            color: '#495057'
                          }}>Marża</th>
                          <th style={{ 
                            width: '80px',
                            padding: '0.5rem',
                            fontWeight: '600',
                            color: '#495057'
                          }}>Status</th>
                          <th style={{ 
                            width: '160px',
                            padding: '0.5rem',
                            fontWeight: '600',
                            color: '#495057'
                          }}>Akcje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredProducts().map((product, index) => {
                          const priceInfo = getDisplayPrice(product);
                          const enrichedProduct = {
                            ...product,
                            simplifiedName: product.nazwa_uproszczona || simplifyProductName(product.nazwa),
                            packageQuantity: extractPackageQuantity(product.nazwa, product.opis),
                            weight: extractWeight(product.nazwa, product.opis),
                            manufacturer: product.producent || extractManufacturer(product.nazwa)
                          };

                          return (
                            <React.Fragment key={product.id}>
                            <tr style={{ 
                              backgroundColor: selectedProducts.has(product.id) 
                                ? '#e7f3ff' 
                                : editingCenowkaProductId === product.id 
                                  ? '#fff3cd' 
                                  : (index % 2 === 0 ? '#f8f9fa' : 'white'),
                              borderBottom: '1px solid #e9ecef',
                              borderLeft: selectedProducts.has(product.id) 
                                ? '3px solid #007bff' 
                                : editingCenowkaProductId === product.id
                                  ? '3px solid #ffc107'
                                  : 'none'
                            }}>
                              <td style={{ 
                                padding: '0.5rem 0.25rem',
                                textAlign: 'center'
                              }}>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={selectedProducts.has(product.id)}
                                  onChange={() => handleSelectProduct(product.id)}
                                />
                              </td>
                              
                              {/* Producent */}
                              <td style={{ 
                                width: '120px',
                                padding: '0.5rem'
                              }}>
                                {editingProductManufacturer === product.id ? (
                                  <select
                                    className="form-select form-select-sm"
                                    value={product.producent_id || ''}
                                    onChange={(e) => handleSingleManufacturerChange(product.id, e.target.value)}
                                    style={{ fontSize: '0.75rem' }}
                                  >
                                    <option value="">Brak</option>
                                    {manufacturers.map((manufacturer) => (
                                      <option key={manufacturer.id} value={manufacturer.id}>
                                        {manufacturer.nazwa}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <div 
                                    style={{ 
                                      fontSize: '0.75rem',
                                      fontWeight: '600',
                                      color: '#0d6efd',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => setEditingProductManufacturer(product.id)}
                                    title="Kliknij aby zmienić producenta"
                                  >
                                    {manufacturers.find(m => m.id === product.producent_id)?.nazwa || 'Brak'}
                                  </div>
                                )}
                              </td>

                              {/* Produkt */}
                              <td style={{ 
                                minWidth: '250px',
                                width: '30%',
                                padding: '0.5rem'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'start' }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ 
                                      fontSize: '0.85rem',
                                      lineHeight: '1.2',
                                      fontWeight: '600',
                                      color: '#212529',
                                      marginBottom: '0.25rem',
                                      wordWrap: 'break-word',
                                      whiteSpace: 'normal',
                                      overflow: 'visible'
                                    }}>
                                      {product.nazwa}
                                    </div>
                                    <div style={{ 
                                      display: 'flex', 
                                      flexWrap: 'wrap', 
                                      gap: '0.25rem',
                                      marginTop: '0.25rem'
                                    }}>
                                      {product.ean && (
                                        <span style={{ 
                                          padding: '0.125rem 0.375rem',
                                          fontSize: '0.65rem',
                                          backgroundColor: '#17a2b8',
                                          color: 'white',
                                          borderRadius: '0.25rem'
                                        }}>
                                          <FaBarcode style={{ marginRight: '0.25rem' }} />
                                          EAN: {product.ean}
                                        </span>
                                      )}
                                      <span style={{ 
                                        padding: '0.125rem 0.375rem',
                                        fontSize: '0.65rem',
                                        backgroundColor: '#6c757d',
                                        color: 'white',
                                        borderRadius: '0.25rem'
                                      }}>
                                        VAT: {product.stawka_vat || 23}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              
                              {/* Kod/EAN */}
                              <td style={{ 
                                width: '140px',
                                padding: '0.5rem'
                              }}>
                                <div>
                                  <span style={{ 
                                    padding: '0.125rem 0.375rem',
                                    fontSize: '0.65rem',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    borderRadius: '0.25rem',
                                    fontFamily: 'monospace'
                                  }}>
                                    {product.kod_produktu}
                                  </span>
                                  {product.ean && (
                                    <div style={{ marginTop: '0.25rem' }}>
                                      <span style={{ 
                                        padding: '0.125rem 0.375rem',
                                        fontSize: '0.6rem',
                                        backgroundColor: '#17a2b8',
                                        color: 'white',
                                        borderRadius: '0.25rem',
                                        fontFamily: 'monospace'
                                      }}>
                                        <FaBarcode style={{ marginRight: '0.25rem' }} />
                                        {product.ean}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              
                              {/* Opakowanie */}
                              <td style={{ 
                                width: '100px',
                                padding: '0.5rem'
                              }}>
                                <span style={{ 
                                  padding: '0.125rem 0.375rem',
                                  fontSize: '0.65rem',
                                  backgroundColor: '#f8f9fa',
                                  color: '#495057',
                                  borderRadius: '0.25rem',
                                  border: '1px solid #dee2e6'
                                }}>
                                  {enrichedProduct.packageQuantity || 'Brak danych'}
                                </span>
                              </td>
                              
                              {/* Jednostka */}
                              <td style={{ 
                                width: '80px',
                                padding: '0.5rem'
                              }}>
                                {product.gramatura && product.jednostka_wagi ? (
                                  <span style={{ 
                                    padding: '0.125rem 0.375rem',
                                    fontSize: '0.65rem',
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    borderRadius: '0.25rem'
                                  }}>
                                    <FaWeightHanging style={{ marginRight: '0.25rem' }} />
                                    {product.gramatura} {getUnitDisplayName(product.jednostka_wagi)}
                                  </span>
                                ) : product.ilosc_jednostek && product.jednostka_wagi ? (
                                  <span style={{ 
                                    padding: '0.125rem 0.375rem',
                                    fontSize: '0.65rem',
                                    backgroundColor: '#17a2b8',
                                    color: 'white',
                                    borderRadius: '0.25rem'
                                  }}>
                                    {product.ilosc_jednostek} {getUnitDisplayName(product.jednostka_wagi)}
                                  </span>
                                ) : (
                                  <span style={{ 
                                    fontSize: '0.7rem',
                                    color: '#6c757d'
                                  }}>—</span>
                                )}
                              </td>
                              
                              {/* Cena zakupu */}
                              <td style={{ 
                                width: '120px',
                                padding: '0.5rem'
                              }}>
                                <div>
                                  {product.cena_zakupu_brutto && product.cena_zakupu_brutto > 0 ? (
                                    <>
                                      <div style={{ 
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        color: '#fd7e14'
                                      }}>
                                        {product.cena_zakupu_brutto.toFixed(2)} zł
                                      </div>
                                      <div style={{ 
                                        fontSize: '0.7rem',
                                        color: '#6c757d'
                                      }}>
                                        netto: {(product.cena_zakupu_netto || 0).toFixed(2)} zł
                                      </div>
                                    </>
                                  ) : (
                                    <span style={{ 
                                      fontSize: '0.7rem',
                                      color: '#6c757d'
                                    }}>Brak danych</span>
                                  )}
                                </div>
                              </td>
                              
                              {/* Cena */}
                              <td style={{ 
                                width: '120px',
                                padding: '0.5rem'
                              }}>
                                <div>
                                  <div style={{ 
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    color: '#212529'
                                  }}>
                                    {product.cena_sprzedazy_brutto?.toFixed(2) || '0.00'} zł
                                  </div>
                                  <div style={{ 
                                    fontSize: '0.7rem',
                                    color: '#6c757d'
                                  }}>
                                    netto: {product.cena_sprzedazy_netto?.toFixed(2) || '0.00'} zł
                                  </div>
                                </div>
                              </td>
                              
                              {/* Cena specjalna */}
                              <td style={{ 
                                width: '120px',
                                padding: '0.5rem'
                              }}>
                                {product.hasSpecialPrice ? (
                                  <div>
                                    <div style={{ 
                                      fontSize: '0.8rem',
                                      fontWeight: '600',
                                      color: '#ffc107'
                                      }}>
                                        {product.specialPriceBrutto?.toFixed(2)} zł
                                      </div>
                                      <div style={{ 
                                        fontSize: '0.7rem',
                                        color: '#6c757d'
                                      }}>
                                        netto: {product.specialPriceNetto?.toFixed(2)} zł
                                      </div>
                                    </div>
                                  ) : (
                                    <span style={{ 
                                      fontSize: '0.7rem',
                                      color: '#6c757d'
                                    }}>Cena domyślna</span>
                                  )}
                                </td>
                              
                              {/* Marża */}
                              <td style={{ 
                                width: '80px',
                                padding: '0.5rem'
                              }}>
                                <div>
                                  {product.hasSpecialPrice && product.specialMargin ? (
                                    <div>
                                      <div style={{ 
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                          color: product.specialMargin.percent >= 0 ? '#28a745' : '#dc3545'
                                        }}>
                                          {product.specialMargin.percent}%
                                        </div>
                                        <div style={{ 
                                          fontSize: '0.65rem',
                                          color: '#6c757d'
                                        }}>
                                          {product.specialMargin.amount >= 0 ? '+' : ''}{product.specialMargin.amount.toFixed(2)} zł
                                        </div>
                                      </div>
                                    ) : (
                                      <div>
                                        <div style={{ 
                                          fontSize: '0.75rem',
                                          fontWeight: '600',
                                          color: product.defaultMargin.percent >= 0 ? '#28a745' : '#dc3545'
                                        }}>
                                          {product.defaultMargin.percent}%
                                        </div>
                                        <div style={{ 
                                          fontSize: '0.65rem',
                                          color: '#6c757d'
                                        }}>
                                          {product.defaultMargin.amount >= 0 ? '+' : ''}{product.defaultMargin.amount.toFixed(2)} zł
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              
                              {/* Status */}
                              <td style={{ 
                                width: '80px',
                                padding: '0.5rem'
                              }}>
                                {product.hasSpecialPrice ? (
                                  <span style={{ 
                                    padding: '0.125rem 0.375rem',
                                    fontSize: '0.65rem',
                                    backgroundColor: '#ffc107',
                                    color: '#212529',
                                    borderRadius: '0.25rem',
                                    fontWeight: '600'
                                  }}>
                                    <FaTag style={{ marginRight: '0.25rem' }} />
                                    Spec.
                                  </span>
                                ) : (
                                  <span style={{ 
                                    padding: '0.125rem 0.375rem',
                                    fontSize: '0.65rem',
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    borderRadius: '0.25rem',
                                    fontWeight: '600'
                                  }}>
                                    Dom.
                                  </span>
                                )}
                              </td>
                              
                              {/* Akcje */}
                              <td style={{ 
                                width: '160px',
                                padding: '0.5rem'
                              }}>
                                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                  <button
                                    className="btn btn-outline-primary"
                                    style={{ 
                                      fontSize: '0.65rem',
                                      padding: '0.25rem 0.5rem'
                                    }}
                                    onClick={() => handleShowHistory(product)}
                                    title="Historia cen"
                                  >
                                    <FaHistory />
                                  </button>
                                  <button
                                    className="btn btn-outline-success"
                                      style={{ 
                                        fontSize: '0.65rem',
                                        padding: '0.25rem 0.5rem'
                                      }}
                                      onClick={() => handleDirectPriceEdit(product)}
                                      title="Wpisz cenę bezpośrednio"
                                    >
                                      <FaMoneyBill />
                                    </button>
                                    <button
                                      className="btn btn-outline-info"
                                      style={{ 
                                        fontSize: '0.65rem',
                                        padding: '0.25rem 0.5rem'
                                      }}
                                      onClick={() => handleEditCenowka(product)}
                                      title="Edytuj cenówkę (skrócona nazwa + ceny)"
                                    >
                                      <FaTag />
                                    </button>
                                    <button
                                      className="btn btn-outline-secondary"
                                      style={{ 
                                        fontSize: '0.65rem',
                                        padding: '0.25rem 0.5rem'
                                      }}
                                      onClick={() => {
                                        setSelectedProducts(new Set([product.id]));
                                        handleBulkPriceChange();
                                      }}
                                      title="Edytuj cenę (kalkulatory)"
                                    >
                                      <FaEdit />
                                    </button>
                                    {product.hasSpecialPrice && (
                                      <button
                                        className="btn btn-outline-danger"
                                        style={{ 
                                          fontSize: '0.65rem',
                                          padding: '0.25rem 0.5rem'
                                        }}
                                        onClick={() => {
                                          setSelectedProducts(new Set([product.id]));
                                          handleRemoveSpecialPrices();
                                        }}
                                        title="Usuń cenę specjalną"
                                      >
                                        <FaTrash />
                                      </button>
                                    )}
                                    <button
                                      className="btn btn-outline-warning"
                                      style={{ 
                                        fontSize: '0.65rem',
                                        padding: '0.25rem 0.5rem'
                                      }}
                                      onClick={() => addToBuffer(product)}
                                      title="Dodaj do bufora cenówek"
                                    >
                                      <FaTag />
                                    </button>
                                  </div>
                                </td>
                            </tr>
                            
                            {/* Inline edycja cenówki */}
                            {editingCenowkaProductId === product.id && (
                              <tr>
                                <td colSpan="8" style={{ padding: '1rem', backgroundColor: '#f8f9fa', border: '1px solid #ffc107' }}>
                                  <div className="row">
                                    <div className="col-md-12">
                                      <h6 className="mb-3">
                                        <FaTag className="me-2 text-warning" />
                                        Edycja cenówki - {product.nazwa_uproszczona || product.nazwa}
                                      </h6>
                                    </div>
                                  </div>
                                  <div className="row">
                                    <div className="col-md-4">
                                      <div className="mb-3">
                                        <label className="form-label">
                                          <strong>Nazwa uproszczona *</strong>
                                        </label>
                                        <input
                                          type="text"
                                          className="form-control form-control-sm"
                                          value={cenowkaEditData.nazwa_uproszczona}
                                          onChange={(e) => setCenowkaEditData({
                                            ...cenowkaEditData,
                                            nazwa_uproszczona: e.target.value
                                          })}
                                          placeholder="Skrócona nazwa"
                                        />
                                      </div>
                                      <div className="mb-3">
                                        <label className="form-label">
                                          <strong>Cena specjalna *</strong>
                                        </label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          className="form-control form-control-sm"
                                          value={cenowkaEditData.cena_cenowkowa}
                                          onChange={(e) => setCenowkaEditData({
                                            ...cenowkaEditData,
                                            cena_cenowkowa: e.target.value
                                          })}
                                          placeholder="0.00"
                                        />
                                      </div>
                                      <div className="mb-3">
                                        <label className="form-label">
                                          <strong>Waga</strong>
                                        </label>
                                        <div className="input-group input-group-sm">
                                          <input
                                            type="number"
                                            step="0.001"
                                            className="form-control"
                                            value={cenowkaEditData.waga || ''}
                                            onChange={(e) => setCenowkaEditData({
                                              ...cenowkaEditData,
                                              waga: e.target.value
                                            })}
                                            placeholder="0"
                                          />
                                          <select
                                            className="form-select"
                                            value={cenowkaEditData.jednostka_wagi || 'nieustawiono'}
                                            onChange={(e) => setCenowkaEditData({
                                              ...cenowkaEditData,
                                              jednostka_wagi: e.target.value
                                            })}
                                            style={{ maxWidth: '120px' }}
                                          >
                                            <option value="nieustawiono">—</option>
                                            <option value="gramy">gr</option>
                                            <option value="ml">ml</option>
                                            <option value="tabletki">tab</option>
                                            <option value="kapsułki">kaps</option>
                                            <option value="sztuki">szt</option>
                                          </select>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="col-md-4">
                                      <div className="mb-3">
                                        <label className="form-label">
                                          <strong>Cena promocyjna</strong>
                                        </label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          className="form-control form-control-sm"
                                          value={cenowkaEditData.cena_promocyjna}
                                          onChange={(e) => setCenowkaEditData({
                                            ...cenowkaEditData,
                                            cena_promocyjna: e.target.value
                                          })}
                                          placeholder="0.00"
                                        />
                                      </div>
                                      <div className="mb-3">
                                        <label className="form-label">
                                          <strong>Typ cenówki</strong>
                                        </label>
                                        <select
                                          className="form-select form-select-sm"
                                          value={cenowkaEditData.typ_cenowki}
                                          onChange={(e) => setCenowkaEditData({
                                            ...cenowkaEditData,
                                            typ_cenowki: e.target.value
                                          })}
                                        >
                                          <option value="standardowa">Standardowa</option>
                                          <option value="promocyjna">Promocyjna</option>
                                          <option value="wyprzedaz">Wyprzedaż</option>
                                        </select>
                                      </div>
                                    </div>
                                    <div className="col-md-4">
                                      <div className="mb-3">
                                        <label className="form-label">
                                          <strong>Kategoria</strong>
                                        </label>
                                        <input
                                          type="text"
                                          className="form-control form-control-sm"
                                          value={cenowkaEditData.kategoria_cenowki}
                                          onChange={(e) => setCenowkaEditData({
                                            ...cenowkaEditData,
                                            kategoria_cenowki: e.target.value
                                          })}
                                          placeholder="Kategoria cenówki"
                                        />
                                      </div>
                                      <div className="mb-3">
                                        <label className="form-label">
                                          <strong>Opis</strong>
                                        </label>
                                        <textarea
                                          className="form-control form-control-sm"
                                          rows="2"
                                          value={cenowkaEditData.opis_cenowki}
                                          onChange={(e) => setCenowkaEditData({
                                            ...cenowkaEditData,
                                            opis_cenowki: e.target.value
                                          })}
                                          placeholder="Opis cenówki"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Sekcja kalkulatora cen per 100g/per kapsułka */}
                                  {cenowkaEditData.waga && parseFloat(cenowkaEditData.waga) > 0 && (
                                    <div className="row mb-3">
                                      <div className="col-12">
                                        <div className="card bg-light">
                                          <div className="card-header py-2">
                                            <h6 className="mb-0 text-info">
                                              <i className="fas fa-calculator me-2"></i>
                                              Kalkulator cen per jednostkę
                                              <button 
                                                type="button" 
                                                className="btn btn-sm btn-outline-info float-end"
                                                onClick={() => setShowPriceCalculator(!showPriceCalculator)}
                                              >
                                                {showPriceCalculator ? 'Ukryj' : 'Pokaż'}
                                              </button>
                                            </h6>
                                          </div>
                                          {showPriceCalculator && (
                                            <div className="card-body py-2">
                                              <div className="row g-2">
                                                <div className="col-md-6">
                                                  <div className="text-center p-2 border rounded bg-white">
                                                    <div className="fw-bold text-primary">Obliczone ceny:</div>
                                                    <div className="mt-2">
                                                      {(cenowkaEditData.jednostka_wagi === 'gramy' || cenowkaEditData.jednostka_wagi === 'ml') && calculatedPrices.per100g > 0 && (
                                                        <div className="mb-1">
                                                          <small className="text-muted">Per 100{cenowkaEditData.jednostka_wagi === 'gramy' ? 'g' : 'ml'}:</small>
                                                          <div className="fw-bold text-success">{calculatedPrices.per100g.toFixed(2)} zł</div>
                                                        </div>
                                                      )}
                                                      {(cenowkaEditData.jednostka_wagi === 'tabletki' || cenowkaEditData.jednostka_wagi === 'kapsułki' || cenowkaEditData.jednostka_wagi === 'sztuki') && calculatedPrices.perUnit > 0 && (
                                                        <div className="mb-1">
                                                          <small className="text-muted">Per {getUnitSingularForm(cenowkaEditData.jednostka_wagi)}:</small>
                                                          <div className="fw-bold text-success">{formatPrice(calculatedPrices.perUnit, 3)} zł</div>
                                                        </div>
                                                      )}
                                                      <div className="mb-1">
                                                        <small className="text-muted">Cena bazowa:</small>
                                                        <div className="fw-bold text-primary">{calculatedPrices.basePrice.toFixed(2)} zł</div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                                <div className="col-md-6">
                                                  <div className="bg-white p-2 border rounded">
                                                    <div className="fw-bold text-warning mb-2">Ustaw cenę z przeliczenia:</div>
                                                    
                                                    {(cenowkaEditData.jednostka_wagi === 'gramy' || cenowkaEditData.jednostka_wagi === 'ml') && (
                                                      <div className="mb-2">
                                                        <label className="form-label mb-1" style={{fontSize: '0.75rem'}}>
                                                          Cena za 100{cenowkaEditData.jednostka_wagi === 'gramy' ? 'g' : 'ml'}:
                                                        </label>
                                                        <div className="input-group input-group-sm">
                                                          <input
                                                            type="number"
                                                            step="0.01"
                                                            className="form-control"
                                                            placeholder="np. 25.00"
                                                            id="price-per-100"
                                                            style={{fontSize: '0.75rem'}}
                                                          />
                                                          <button
                                                            type="button"
                                                            className="btn btn-outline-primary btn-sm"
                                                            onClick={() => {
                                                              const unitPrice = document.getElementById('price-per-100').value;
                                                              const targetWeight = document.getElementById('target-weight-grams').value;
                                                              if (unitPrice && targetWeight) {
                                                                setPriceFromCalculator(unitPrice, targetWeight);
                                                              }
                                                            }}
                                                          >
                                                            Ustaw
                                                          </button>
                                                        </div>
                                                        <input
                                                          type="number"
                                                          step="0.001"
                                                          className="form-control form-control-sm mt-1"
                                                          placeholder={`Docelowa waga (${cenowkaEditData.jednostka_wagi})`}
                                                          id="target-weight-grams"
                                                          style={{fontSize: '0.75rem'}}
                                                        />
                                                      </div>
                                                    )}
                                                    
                                                    {(cenowkaEditData.jednostka_wagi === 'tabletki' || cenowkaEditData.jednostka_wagi === 'kapsułki' || cenowkaEditData.jednostka_wagi === 'sztuki') && (
                                                      <div className="mb-2">
                                                        <label className="form-label mb-1" style={{fontSize: '0.75rem'}}>
                                                          Cena za {getUnitSingularForm(cenowkaEditData.jednostka_wagi)}:
                                                        </label>
                                                        <div className="input-group input-group-sm">
                                                          <input
                                                            type="number"
                                                            step="0.001"
                                                            className="form-control"
                                                            placeholder="np. 0.50"
                                                            id="price-per-unit"
                                                            style={{fontSize: '0.75rem'}}
                                                          />
                                                          <button
                                                            type="button"
                                                            className="btn btn-outline-primary btn-sm"
                                                            onClick={() => {
                                                              const unitPrice = document.getElementById('price-per-unit').value;
                                                              const targetCount = document.getElementById('target-count-units').value;
                                                              if (unitPrice && targetCount) {
                                                                setPriceFromCalculator(unitPrice, targetCount);
                                                              }
                                                            }}
                                                          >
                                                            Ustaw
                                                          </button>
                                                        </div>
                                                        <input
                                                          type="number"
                                                          step="1"
                                                          className="form-control form-control-sm mt-1"
                                                          placeholder={`Docelowa ilość (${cenowkaEditData.jednostka_wagi})`}
                                                          id="target-count-units"
                                                          style={{fontSize: '0.75rem'}}
                                                        />
                                                      </div>
                                                    )}
                                                    
                                                    <div className="text-muted" style={{fontSize: '0.65rem'}}>
                                                      Wprowadź cenę jednostkową i docelową wagę/ilość, aby automatycznie obliczyć cenę produktu.
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="row">
                                    <div className="col-md-12">
                                      <div className="d-flex gap-2">
                                        <button 
                                          type="button" 
                                          className="btn btn-success btn-sm"
                                          onClick={handleSaveCenowka}
                                        >
                                          <FaTag className="me-1" />
                                          Zapisz cenówkę
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-outline-warning btn-sm"
                                          onClick={() => {
                                            const productForBuffer = getFilteredProducts().find(p => p.id === editingCenowkaProductId);
                                            if (productForBuffer) {
                                              addToBuffer(productForBuffer, cenowkaEditData);
                                            }
                                          }}
                                          title="Dodaj do bufora z aktualnymi danymi cenówki"
                                        >
                                          <FaTag className="me-1" />
                                          Dodaj do bufora
                                        </button>
                                        <button 
                                          type="button" 
                                          className="btn btn-secondary btn-sm"
                                          onClick={handleCancelCenowkaEdit}
                                        >
                                          Anuluj
                                        </button>
                                      </div>
                                      
                                      {/* Podgląd */}
                                      <div className="mt-3">
                                        <small className="text-muted">Podgląd:</small>
                                        <div className="border rounded p-2 bg-white">
                                          <div className="fw-bold text-primary">
                                            {cenowkaEditData.nazwa_uproszczona || 'Nazwa uproszczona'}
                                          </div>
                                          <div className="d-flex align-items-center gap-2 flex-wrap">
                                            <span className="h6 mb-0 text-success">
                                              {cenowkaEditData.cena_cenowkowa ? `${parseFloat(cenowkaEditData.cena_cenowkowa).toFixed(2)} zł` : '0.00 zł'}
                                            </span>
                                            {cenowkaEditData.cena_promocyjna && (
                                              <span className="text-danger text-decoration-line-through">
                                                {parseFloat(cenowkaEditData.cena_promocyjna).toFixed(2)} zł
                                              </span>
                                            )}
                                            <span className="badge bg-secondary">
                                              {cenowkaEditData.typ_cenowki}
                                            </span>
                                            {cenowkaEditData.waga && parseFloat(cenowkaEditData.waga) > 0 && (
                                              <span className="badge bg-info">
                                                {cenowkaEditData.waga} {cenowkaEditData.jednostka_wagi}
                                              </span>
                                            )}
                                          </div>
                                          
                                          {/* Dodatkowe informacje o przeliczonych cenach */}
                                          {cenowkaEditData.waga && parseFloat(cenowkaEditData.waga) > 0 && cenowkaEditData.cena_cenowkowa && (
                                            <div className="mt-2 pt-2 border-top">
                                              <small className="text-muted d-block mb-1">Przeliczone ceny:</small>
                                              <div className="d-flex gap-3 flex-wrap">
                                                {(cenowkaEditData.jednostka_wagi === 'gramy' || cenowkaEditData.jednostka_wagi === 'ml') && calculatedPrices.per100g > 0 && (
                                                  <small className="text-info">
                                                    <strong>{calculatedPrices.per100g.toFixed(2)} zł</strong> 
                                                    /100{cenowkaEditData.jednostka_wagi === 'gramy' ? 'g' : 'ml'}
                                                  </small>
                                                )}
                                                {(cenowkaEditData.jednostka_wagi === 'tabletki' || cenowkaEditData.jednostka_wagi === 'kapsułki' || cenowkaEditData.jednostka_wagi === 'sztuki') && calculatedPrices.perUnit > 0 && (
                                                  <small className="text-info">
                                                    <strong>{formatPrice(calculatedPrices.perUnit, 3)} zł</strong> 
                                                    /{getUnitSingularForm(cenowkaEditData.jednostka_wagi)}
                                                  </small>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                            </React.Fragment>
                          );
                        })}
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
                <h5 className="text-muted">Wybierz magazyn</h5>
                <p className="text-muted">Wybierz magazyn z listy powyżej</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal zmiany cen */}
      {showPriceModal && (
        <div 
          className="modal show d-block" 
          tabIndex="-1" 
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.5)',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div className="modal-dialog" style={{ margin: 0 }}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <FaMoneyBill className="me-2" />
                  Zmiana cen - {selectedProducts.size} produktów
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowPriceModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Typ zmiany:</label>
                    <div className="btn-group w-100" role="group">
                      <input
                        type="radio"
                        className="btn-check"
                        name="priceMode"
                        id="amount"
                        checked={priceChangeMode === 'amount'}
                        onChange={() => setPriceChangeMode('amount')}
                      />
                      <label className="btn btn-outline-primary" htmlFor="amount">
                        Kwota (zł)
                      </label>

                      <input
                        type="radio"
                        className="btn-check"
                        name="priceMode"
                        id="percent"
                        checked={priceChangeMode === 'percent'}
                        onChange={() => setPriceChangeMode('percent')}
                      />
                      <label className="btn btn-outline-primary" htmlFor="percent">
                        Procent (%)
                      </label>

                      <input
                        type="radio"
                        className="btn-check"
                        name="priceMode"
                        id="margin"
                        checked={priceChangeMode === 'margin'}
                        onChange={() => setPriceChangeMode('margin')}
                      />
                      <label className="btn btn-outline-primary" htmlFor="margin">
                        Marża (%)
                      </label>
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="form-label">
                      {priceChangeMode === 'amount' && 'Zmiana ceny (zł):'}
                      {priceChangeMode === 'percent' && 'Zmiana procentowa (%):'}
                      {priceChangeMode === 'margin' && 'Docelowa marża (%):'}
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      step="0.01"
                      value={priceChangeValue}
                      onChange={(e) => setPriceChangeValue(e.target.value)}
                      placeholder={
                        priceChangeMode === 'amount' ? 'np. 5.00 lub -2.50' :
                        priceChangeMode === 'percent' ? 'np. 10 lub -15' :
                        'np. 25'
                      }
                    />
                    <div className="form-text">
                      {priceChangeMode === 'amount' && 'Dodaj lub odejmij określoną kwotę od aktualnej ceny'}
                      {priceChangeMode === 'percent' && 'Zwiększ lub zmniejsz cenę o określony procent'}
                      {priceChangeMode === 'margin' && 'Ustaw cenę tak, aby uzyskać określoną marżę'}
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="roundToPsychological"
                        checked={roundToPsychological}
                        onChange={(e) => setRoundToPsychological(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="roundToPsychological">
                        Zaokrąglij do cen psychologicznych (.99)
                      </label>
                      <div className="form-text">
                        Ceny zostaną zaokrąglone w dół do pełnych złotych i dodane 0.99 groszy (np. 12.50 → 12.99)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPriceModal(false)}
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={applyPriceChange}
                  disabled={loading || !priceChangeValue}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Zapisywanie...
                    </>
                  ) : (
                    'Zastosuj zmiany'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal historii cen */}
      {showHistoryModal && selectedProductForHistory && (
        <div 
          className="modal show d-block" 
          tabIndex="-1" 
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.5)',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div className="modal-dialog modal-lg" style={{ margin: 0 }}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <FaHistory className="me-2" />
                  Historia cen - {selectedProductForHistory.nazwa}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowHistoryModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <strong>Kod produktu:</strong> {selectedProductForHistory.kod_produktu}<br />
                  <strong>EAN:</strong> {selectedProductForHistory.ean || 'Brak'}<br />
                  <strong>Aktualna cena:</strong> {
                    selectedProductForHistory.hasSpecialPrice ? 
                      `${selectedProductForHistory.specialPriceBrutto?.toFixed(2)} zł (specjalna)` :
                      `${selectedProductForHistory.cena_sprzedazy_brutto?.toFixed(2)} zł (domyślna)`
                  }
                </div>
                
                {priceHistory.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ 
                      width: '100%',
                      fontSize: '0.75rem',
                      borderCollapse: 'separate',
                      borderSpacing: 0
                    }}>
                      <thead style={{ 
                        backgroundColor: '#f8f9fa',
                        borderBottom: '2px solid #dee2e6'
                      }}>
                        <tr style={{ fontSize: '0.7rem' }}>
                          <th style={{ 
                            padding: '0.5rem',
                            fontWeight: '600',
                            color: '#495057'
                          }}>Data</th>
                          <th style={{ 
                            padding: '0.5rem',
                            fontWeight: '600',
                            color: '#495057'
                          }}>Cena przed</th>
                          <th style={{ 
                            padding: '0.5rem',
                            fontWeight: '600',
                            color: '#495057'
                          }}>Cena po</th>
                          <th style={{ 
                            padding: '0.5rem',
                            fontWeight: '600',
                            color: '#495057'
                          }}>Typ zmiany</th>
                          <th style={{ 
                            padding: '0.5rem',
                            fontWeight: '600',
                            color: '#495057'
                          }}>Użytkownik</th>
                          <th style={{ 
                            padding: '0.5rem',
                            fontWeight: '600',
                            color: '#495057'
                          }}>Powód</th>
                        </tr>
                      </thead>
                      <tbody>
                        {priceHistory.map((entry, index) => (
                          <tr key={entry.id} style={{ 
                            backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                            borderBottom: '1px solid #e9ecef'
                          }}>
                            <td style={{ padding: '0.5rem' }}>
                              <div style={{ fontSize: '0.7rem' }}>
                                {new Date(entry.date).toLocaleString('pl-PL')}
                              </div>
                            </td>
                            <td style={{ padding: '0.5rem' }}>
                              <div style={{ 
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}>
                                {entry.old_price_brutto?.toFixed(2)} zł
                              </div>
                              <div style={{ 
                                fontSize: '0.65rem',
                                color: '#6c757d'
                              }}>
                                netto: {entry.old_price_netto?.toFixed(2)} zł
                              </div>
                            </td>
                            <td style={{ padding: '0.5rem' }}>
                              <div style={{ 
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#28a745'
                              }}>
                                {entry.new_price_brutto?.toFixed(2)} zł
                              </div>
                              <div style={{ 
                                fontSize: '0.65rem',
                                color: '#6c757d'
                              }}>
                                netto: {entry.new_price_netto?.toFixed(2)} zł
                              </div>
                            </td>
                            <td style={{ padding: '0.5rem' }}>
                              <span style={{ 
                                padding: '0.125rem 0.375rem',
                                fontSize: '0.6rem',
                                backgroundColor: entry.change_type === 'manual' ? '#0d6efd' : '#17a2b8',
                                color: 'white',
                                borderRadius: '0.25rem',
                                fontWeight: '600'
                              }}>
                                {entry.change_type === 'manual' ? 'Ręczna' : 'Masowa'}
                              </span>
                            </td>
                            <td style={{ 
                              padding: '0.5rem',
                              fontSize: '0.75rem'
                            }}>{entry.user}</td>
                            <td style={{ 
                              padding: '0.5rem',
                              fontSize: '0.7rem'
                            }}>
                              {entry.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <FaHistory className="fa-2x text-muted mb-2" />
                    <p className="text-muted">Brak historii zmian cen dla tego produktu</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowHistoryModal(false)}
                >
                  Zamknij
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal bezpośredniej edycji ceny */}
      {showDirectPriceModal && selectedProductForDirectEdit && (
        <div 
          className="modal show d-block" 
          tabIndex="-1" 
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.5)',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div className="modal-dialog" style={{ margin: 0 }}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <FaMoneyBill className="me-2" />
                  Edycja ceny - {selectedProductForDirectEdit.nazwa_uproszczona || selectedProductForDirectEdit.nazwa}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDirectPriceModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <div className="row">
                    <div className="col-md-6">
                      <strong>Kod produktu:</strong> {selectedProductForDirectEdit.kod_produktu}
                    </div>
                    <div className="col-md-6">
                      <strong>EAN:</strong> {selectedProductForDirectEdit.ean || 'Brak'}
                    </div>
                  </div>
                  <div className="row mt-2">
                    <div className="col-md-6">
                      <strong>VAT:</strong> {selectedProductForDirectEdit.stawka_vat || 23}%
                    </div>
                    <div className="col-md-6">
                      <strong>Status:</strong> {selectedProductForDirectEdit.hasSpecialPrice ? 
                        <span className="badge bg-warning">Cena specjalna</span> :
                        <span className="badge bg-secondary">Cena domyślna</span>
                      }
                    </div>
                  </div>
                </div>
                
                <hr />
                
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Cena netto (zł):</label>
                    <input
                      type="number"
                      className="form-control"
                      step="0.01"
                      min="0"
                      value={directPriceNetto}
                      onChange={(e) => {
                        setDirectPriceNetto(e.target.value);
                        // Automatycznie przelicz cenę brutto
                        const vatRate = selectedProductForDirectEdit.stawka_vat || 23;
                        const newBrutto = calculatePriceFromNetto(e.target.value, vatRate);
                        if (newBrutto) {
                          setDirectPriceBrutto(newBrutto);
                        }
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Cena brutto (zł):</label>
                    <input
                      type="number"
                      className="form-control"
                      step="0.01"
                      min="0"
                      value={directPriceBrutto}
                      onChange={(e) => {
                        setDirectPriceBrutto(e.target.value);
                        // Automatycznie przelicz cenę netto
                        const vatRate = selectedProductForDirectEdit.stawka_vat || 23;
                        const newNetto = calculatePriceFromBrutto(e.target.value, vatRate);
                        if (newNetto) {
                          setDirectPriceNetto(newNetto);
                        }
                      }}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="form-text">
                    <i className="fas fa-info-circle me-1"></i>
                    Zmieniając jedną cenę, druga zostanie automatycznie przeliczona na podstawie stawki VAT.
                  </div>
                </div>

                {/* Porównanie z aktualną ceną */}
                <div className="mt-3 p-3 bg-light rounded">
                  <h6>Porównanie cen:</h6>
                  <div className="row">
                    <div className="col-md-6">
                      <strong>Aktualna cena:</strong><br />
                      <span className="text-muted">
                        Netto: {selectedProductForDirectEdit.hasSpecialPrice ? 
                          selectedProductForDirectEdit.specialPriceNetto?.toFixed(2) : 
                          selectedProductForDirectEdit.cena_sprzedazy_netto?.toFixed(2)} zł
                      </span><br />
                      <span className="text-muted">
                        Brutto: {selectedProductForDirectEdit.hasSpecialPrice ? 
                          selectedProductForDirectEdit.specialPriceBrutto?.toFixed(2) : 
                          selectedProductForDirectEdit.cena_sprzedazy_brutto?.toFixed(2)} zł
                      </span>
                    </div>
                    <div className="col-md-6">
                      <strong>Nowa cena:</strong><br />
                      <span className="text-success">
                        Netto: {directPriceNetto ? parseFloat(directPriceNetto).toFixed(2) : '0.00'} zł
                      </span><br />
                      <span className="text-success">
                        Brutto: {directPriceBrutto ? parseFloat(directPriceBrutto).toFixed(2) : '0.00'} zł
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDirectPriceModal(false)}
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={applyDirectPriceChange}
                  disabled={loading || !directPriceNetto || !directPriceBrutto}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Zapisywanie...
                    </>
                  ) : (
                    'Zapisz cenę'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal podglądu etykiet */}
      {showPreview && (
        <div 
          className="modal show d-block" 
          tabIndex="-1" 
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.5)',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div className="modal-dialog modal-xl" style={{ margin: 0, maxWidth: '90%', width: '1200px' }}>
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
                      ((product.displayPrice || priceInfo.price) / parseFloat(product.packageQuantity)).toFixed(2) : null;
                    
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
                              {(product.displayPrice || priceInfo.price)?.toFixed(2)} zł
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
                  className="btn btn-secondary me-2"
                  onClick={() => {
                    previewProducts.forEach(product => addToBuffer(product));
                    setShowPreview(false);
                    setShowBuffer(true);
                  }}
                >
                  <FaTag className="me-1" />
                  Dodaj wszystkie do bufora
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

      {/* Modal bufora cenówek */}
      {showBuffer && (
        <div 
          className="modal show d-block" 
          tabIndex="-1" 
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.5)',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div className="modal-dialog modal-xl" style={{ margin: 0, maxWidth: '90%', width: '1200px' }}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <FaTag className="me-2" />
                  Bufor cenówek ({labelBuffer.length} produktów)
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowBuffer(false)}
                ></button>
              </div>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {labelBuffer.length === 0 ? (
                  <div className="text-center text-muted py-4">
                    <FaTag size={48} className="mb-3 opacity-50" />
                    <h6>Bufor cenówek jest pusty</h6>
                    <p className="mb-0">Dodaj produkty do bufora, aby zebrać cenówki przed drukowaniem</p>
                  </div>
                ) : (
                  <div className="row" id="bufferLabelsToPrint">
                    {labelBuffer.map((product, index) => {
                      const priceInfo = getDisplayPrice(product);
                      const unitDisplayName = getUnitDisplayName(product.jednostka_wagi || 'gramy');
                      const pricePerUnit = product.cenowka ? calculatePricePerUnit(
                        product.cenowka.cena_cenowkowa, 
                        product.cenowka.waga, 
                        product.cenowka.jednostka_wagi
                      ) : 0;
                      const unitPrice = product.packageQuantity && product.packageQuantity !== '1' ? 
                        ((product.cenowka?.cena_cenowkowa || product.cena_sprzedazy_brutto) / parseFloat(product.packageQuantity)).toFixed(2) : null;

                      return (
                        <div key={product.bufferId} className="col-md-6 col-lg-4 mb-3">
                          <div className="position-relative">
                            <button
                              type="button"
                              className="btn-close position-absolute"
                              style={{ top: '0.5rem', right: '0.5rem', zIndex: 1, backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '50%', padding: '0.25rem' }}
                              onClick={() => removeFromBuffer(product.bufferId)}
                              title="Usuń z bufora"
                            ></button>
                            
                            <div className="price-label border border-dark" style={{ 
                              width: '4cm',
                              height: '2cm',
                              fontSize: '6px',
                              display: 'flex',
                              flexDirection: 'column',
                              padding: '1.5mm',
                              boxSizing: 'border-box',
                              justifyContent: 'center',
                              textAlign: 'center'
                            }}>
                              {/* Cena na górze - znacznie większa */}
                              <div style={{ 
                                fontSize: '19px',
                                fontWeight: 'bold',
                                color: '#28a745',
                                lineHeight: '1',
                                marginBottom: '1mm'
                              }}>
                                {formatPrice(product.cenowka?.cena_cenowkowa || product.cena_sprzedazy_brutto)} zł
                              </div>
                              
                              {/* Nazwa produktu - jeszcze większa */}
                              <div style={{ 
                                fontWeight: 'bold',
                                fontSize: '10px',
                                lineHeight: '1.1',
                                marginBottom: '0.5mm',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                color: '#333'
                              }}>
                                {product.finalName || product.nazwa_uproszczona || product.nazwa}
                              </div>

                              {/* Marka pod nazwą */}
                              <div style={{ 
                                fontWeight: 'bold',
                                fontSize: '8px',
                                color: '#007bff',
                                lineHeight: '1.1',
                                marginBottom: '0.5mm'
                              }}>
                                {manufacturers.find(m => m.id === product.producent_id)?.nazwa || 'Brak'}
                              </div>

                              {/* Jednostki oddzielone kreską */}
                              <div style={{ 
                                fontSize: '7px',
                                color: '#666',
                                lineHeight: '1.1',
                                marginTop: 'auto'
                              }}>
                                {[
                                  unitPrice && `${unitPrice} zł/szt`,
                                  pricePerUnit > 0 && 
                                    ((product.cenowka?.jednostka_wagi || product.jednostka_wagi) === 'gramy' || (product.cenowka?.jednostka_wagi || product.jednostka_wagi) === 'ml' 
                                      ? `${formatPrice(pricePerUnit, 4)} zł/100${unitDisplayName}`
                                      : `${formatPrice(pricePerUnit, 4)} zł/${getUnitSingularForm(product.cenowka?.jednostka_wagi || product.jednostka_wagi || 'gramy')}`),
                                  product.packageQuantity && product.packageQuantity !== '1' && `${product.packageQuantity} szt`,
                                  product.gramatura && `${product.gramatura} ${unitDisplayName}`,
                                  product.ilosc_jednostek && `${product.ilosc_jednostek} ${unitDisplayName}`
                                ].filter(Boolean).join(' - ')}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-danger me-2"
                  onClick={clearBuffer}
                  disabled={labelBuffer.length === 0}
                >
                  <FaTrash className="me-1" />
                  Wyczyść bufor
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowBuffer(false)}
                >
                  Zamknij
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={printBufferLabels}
                  disabled={labelBuffer.length === 0}
                >
                  <FaPrint className="me-1" />
                  Drukuj bufor ({labelBuffer.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal zmiany producenta */}
      {showManufacturerModal && (
        <div 
          className="modal show d-block" 
          tabIndex="-1" 
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.5)',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div className="modal-dialog" style={{ margin: 0 }}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <FaEdit className="me-2" />
                  Zmiana producenta - {selectedProducts.size} produktów
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowManufacturerModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Wybierz producenta:</label>
                  <select
                    className="form-select"
                    value={bulkManufacturerChange}
                    onChange={(e) => setBulkManufacturerChange(e.target.value)}
                  >
                    <option value="">Wybierz producenta...</option>
                    {manufacturers.map((manufacturer) => (
                      <option key={manufacturer.id} value={manufacturer.id}>
                        {manufacturer.nazwa}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="alert alert-info">
                  <small>
                    Zaznaczone produkty: {selectedProducts.size}<br/>
                    Operacja zmieni producenta dla wszystkich zaznaczonych produktów.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowManufacturerModal(false)}
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleBulkManufacturerChange}
                  disabled={!bulkManufacturerChange}
                >
                  <FaEdit className="me-1" />
                  Zmień producenta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LocationPricingPage;
