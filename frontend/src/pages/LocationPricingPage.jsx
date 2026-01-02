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
  
  // State dla dropdown menu akcji
  const [openActionMenu, setOpenActionMenu] = useState(null);
  
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

  // Zamykanie dropdown menu po kliknięciu poza nim
  useEffect(() => {
    const handleClickOutside = () => setOpenActionMenu(null);
    if (openActionMenu !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openActionMenu]);

  // Jeden useEffect do ładowania danych przy zmianie lokalizacji
  useEffect(() => {
    if (selectedLocation) {
      console.log(`📦 Ładowanie danych dla lokalizacji: ${selectedLocation.id} (${selectedLocation.nazwa})`);
      // loadAllProducts(true) pobiera świeże ceny, więc nie trzeba osobno wywoływać loadLocationPrices
      loadAllProducts(true);
    }
  }, [selectedLocation]);

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
        // API zwraca { prices: [...] } - potrzebujemy prices
        const pricesArray = response.data?.prices || [];
        setLocationPrices(pricesArray);
        console.log(`Załadowano ${pricesArray.length} cen magazynowych dla magazynu ${locationId}`);
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
    // POPRAWKA: Priorytetowo użyj purchase_price z API warehouse prices (z faktur)
    const buyPriceNetto = product.purchase_price || product.cena_zakupu_netto || product.cena_zakupu || 0;
    
    console.log(`🔍 MARGIN DEBUG dla produktu ${product.id}:`, {
      sellPriceNetto,
      buyPriceNetto,
      purchase_price: product.purchase_price,
      cena_zakupu_netto: product.cena_zakupu_netto,
      cena_zakupu: product.cena_zakupu,
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
        console.log(`🔄 Pobieram świeże ceny dla magazynu ${selectedLocation.id}...`);
        const pricesResponse = await warehousePricingService.getWarehousePrices(selectedLocation.id);
        console.log('📥 Odpowiedź API:', pricesResponse);
        if (pricesResponse.success) {
          // API zwraca { prices: [...] } - potrzebujemy prices
          currentLocationPrices = pricesResponse.data?.prices || [];
          setLocationPrices(currentLocationPrices);
          console.log(`✅ Odświeżono ${currentLocationPrices.length} cen magazynowych`);
          // Pokaż produkty z cenami specjalnymi
          const specialPriceProducts = currentLocationPrices.filter(p => p.has_special_price);
          console.log(`🎯 Produkty z ceny specjalną: ${specialPriceProducts.length}`, specialPriceProducts.map(p => ({
            id: p.product_id,
            name: p.product_name,
            special: p.special_price,
            has_special: p.has_special_price
          })));
        } else {
          console.error('❌ API nie zwróciło success:', pricesResponse);
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
        // Ustawiamy hasSpecialPrice na true jeśli istnieje wpis lokalizacyjny Z ceną specjalną
        // API zwraca: has_special_price, special_price, warehouse_price_net, standard_price, purchase_price
        const hasSpecialPrice = locationPrice?.has_special_price || false;
        
        // Używaj prawidłowych nazw pól z API
        const specialPriceNetto = hasSpecialPrice ? (locationPrice?.warehouse_price_net || null) : null;
        const specialPriceBrutto = hasSpecialPrice ? (locationPrice?.special_price || locationPrice?.warehouse_price || null) : null;
        
        // POPRAWKA: Użyj ceny zakupu z warehouse pricing API (z faktur) zamiast z produktu
        const purchasePriceFromAPI = locationPrice?.purchase_price || product.cena_zakupu_netto || 0;
        
        // Twórz obiekt produktu z ceną zakupu z API
        const productWithPurchasePrice = {
          ...product,
          purchase_price: purchasePriceFromAPI
        };
        
        const defaultMargin = calculateMargin(productWithPurchasePrice, false);
        const specialMargin = hasSpecialPrice ? calculateMargin({
          ...productWithPurchasePrice,
          hasSpecialPrice: true,
          specialPriceNetto: specialPriceNetto
        }, true) : null;
        
        const result = {
          ...product,
          hasSpecialPrice,
          specialPriceNetto: specialPriceNetto,
          specialPriceBrutto: specialPriceBrutto,
          priceDiffPercent: hasSpecialPrice && specialPriceBrutto ? 
            Math.round(((specialPriceBrutto - product.cena_sprzedazy_brutto) / product.cena_sprzedazy_brutto) * 100) : 0,
          defaultMargin,
          specialMargin,
          // POPRAWKA: Dodaj cenę zakupu z API i marżę z API
          purchase_price: purchasePriceFromAPI,
          margin_from_api: locationPrice?.margin || null,
          margin_method: locationPrice?.margin_method || null
        };
        
        if (hasSpecialPrice) {
          console.log(`Produkt ${product.nazwa} ma cenę specjalną: netto ${specialPriceNetto} zł, brutto ${specialPriceBrutto} zł`);
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
    <div style={{ padding: "0.75rem", backgroundColor: "#f8f9fa", minHeight: "100vh", fontSize: "12px" }}>
      {/* Nagłówek - styl jak Magazyn */}
      <div style={{
        background: "linear-gradient(135deg, #6f42c1, #5a32a3)",
        color: "white",
        padding: "0.5rem 1rem",
        marginBottom: "0.75rem",
        borderRadius: "0.375rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
      }}>
        <div>
          <h5 style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>🏷️ Cenówki</h5>
          <div style={{ fontSize: "10px", opacity: 0.9 }}>
            {selectedLocation ? `📍 ${selectedLocation.nazwa}` : 'Wybierz lokalizację'} | {new Date().toLocaleDateString()}
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
          {selectedProducts.size > 0 && (
            <>
              <span style={{
                padding: "0.25rem 0.5rem", fontSize: "10px", fontWeight: "600",
                backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "4px"
              }}>✓ {selectedProducts.size} zaznaczonych</span>
              <button style={{ padding: "0.35rem 0.75rem", fontSize: "11px", fontWeight: "500", border: "none", borderRadius: "4px", cursor: "pointer", backgroundColor: "#28a745", color: "white" }} onClick={handleBulkPriceChange} title="Zmień ceny zaznaczonych produktów">
                <FaEdit style={{ marginRight: "4px" }} />Edytuj ceny
              </button>
              <button style={{ padding: "0.35rem 0.75rem", fontSize: "11px", fontWeight: "500", border: "none", borderRadius: "4px", cursor: "pointer", backgroundColor: "#17a2b8", color: "white" }} onClick={handlePreviewLabels} title="Podgląd cenówek">
                <FaEye style={{ marginRight: "4px" }} />Podgląd
              </button>
              <button style={{ padding: "0.35rem 0.75rem", fontSize: "11px", fontWeight: "500", border: "none", borderRadius: "4px", cursor: "pointer", backgroundColor: "#dc3545", color: "white" }} onClick={handleRemoveSpecialPrices} title="Usuń ceny specjalne">
                <FaTrash style={{ marginRight: "4px" }} />Usuń specjalne
              </button>
            </>
          )}
          <button style={{
            padding: "0.35rem 0.75rem", fontSize: "11px", fontWeight: "500", border: "1px solid rgba(255,255,255,0.5)", borderRadius: "4px", cursor: "pointer",
            backgroundColor: labelBuffer.length > 0 ? "#ffc107" : "transparent", color: labelBuffer.length > 0 ? "#212529" : "white"
          }} onClick={() => setShowBuffer(true)} title={`Bufor cenówek (${labelBuffer.length})`}>
            <FaTag style={{ marginRight: "4px" }} />Bufor ({labelBuffer.length})
          </button>
          <button style={{
            padding: "0.35rem 0.75rem", fontSize: "11px", fontWeight: "500", border: "1px solid rgba(255,255,255,0.5)", borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer", backgroundColor: "transparent", color: "white", opacity: loading ? 0.7 : 1
          }} onClick={loadAllProducts} disabled={loading}>🔄 {loading ? "..." : "Odśwież"}</button>
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#f8d7da', color: '#721c24', padding: '0.5rem 0.75rem', borderRadius: '4px',
          marginBottom: '0.75rem', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span>❌ {error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>×</button>
        </div>
      )}

      {/* Statystyki - kompaktowy styl jak Magazyn */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <div style={{ backgroundColor: "white", borderLeft: "3px solid #6f42c1", borderRadius: "4px", padding: "0.5rem 0.75rem", textAlign: "center", minWidth: "100px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#6f42c1" }}>{getFilteredProducts().length}</div>
          <div style={{ fontSize: "10px", color: "#6c757d" }}>Produkty</div>
        </div>
        <div style={{ backgroundColor: "white", borderLeft: "3px solid #28a745", borderRadius: "4px", padding: "0.5rem 0.75rem", textAlign: "center", minWidth: "100px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#28a745" }}>{getFilteredProducts().filter(p => p.hasSpecialPrice).length}</div>
          <div style={{ fontSize: "10px", color: "#6c757d" }}>Ceny specjalne</div>
        </div>
        <div style={{ backgroundColor: "white", borderLeft: "3px solid #ffc107", borderRadius: "4px", padding: "0.5rem 0.75rem", textAlign: "center", minWidth: "100px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#856404" }}>{selectedProducts.size}</div>
          <div style={{ fontSize: "10px", color: "#6c757d" }}>Zaznaczone</div>
        </div>
        {/* Selector lokalizacji */}
        <div style={{ backgroundColor: "white", borderLeft: "3px solid #17a2b8", borderRadius: "4px", padding: "0.5rem 0.75rem", minWidth: "200px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize: "10px", color: "#6c757d", marginBottom: "4px" }}>📍 Lokalizacja</div>
          <select style={{ width: "100%", padding: "0.25rem 0.5rem", fontSize: "11px", border: "1px solid #dee2e6", borderRadius: "4px", backgroundColor: "white" }}
            value={selectedLocation?.id || ''}
            onChange={(e) => { const locationId = parseInt(e.target.value); changeLocation(locationId); }}
          >
            <option value="">-- Wybierz --</option>
            {availableLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.nazwa}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Główna zawartość */}
      {selectedLocation ? (
        <div style={{ backgroundColor: "white", borderRadius: "4px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          {/* Filtry - kompaktowe */}
          <div style={{ padding: "0.75rem", borderBottom: "1px solid #dee2e6", backgroundColor: "#fafafa" }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              {/* Wyszukiwarka */}
              <div style={{ flex: '1 1 200px', minWidth: '150px', position: 'relative' }}>
                <FaSearch style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: '#6c757d', fontSize: '11px' }} />
                <input type="text" style={{ width: '100%', padding: '0.35rem 0.5rem 0.35rem 1.75rem', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '11px' }}
                  placeholder="Szukaj produktu..." value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)} />
              </div>
              {/* Kategorie */}
              <select style={{ padding: '0.35rem 0.5rem', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '11px', minWidth: '130px' }}
                value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                <option value="">Wszystkie kategorie</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              {/* Producent */}
              <select style={{ padding: '0.35rem 0.5rem', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '11px', minWidth: '130px' }}
                value={selectedManufacturer} onChange={(e) => setSelectedManufacturer(e.target.value)}>
                <option value="">Wszyscy producenci</option>
                {manufacturers.map(m => <option key={m.id} value={m.id}>{m.nazwa}</option>)}
              </select>
              {/* Typ ceny */}
              <select style={{ padding: '0.35rem 0.5rem', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '11px', backgroundColor: advancedFilters.priceType !== 'all' ? '#e7f1ff' : 'white' }}
                value={advancedFilters.priceType} onChange={(e) => setAdvancedFilters(prev => ({ ...prev, priceType: e.target.value }))}>
                <option value="all">Wszystkie ceny</option>
                <option value="special">Specjalne</option>
                <option value="default">Domyślne</option>
              </select>
              {/* Zaznacz/Odznacz */}
              <button style={{ padding: '0.35rem 0.5rem', fontSize: '10px', fontWeight: '500', border: '1px solid #28a745', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'white', color: '#28a745' }} onClick={handleSelectAll}>✓ Zaznacz wszystkie</button>
              <button style={{ padding: '0.35rem 0.5rem', fontSize: '10px', fontWeight: '500', border: '1px solid #dc3545', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'white', color: '#dc3545' }} onClick={() => setSelectedProducts(new Set())}>✕ Odznacz</button>
            </div>
          </div>

          {/* Tabela produktów */}
          <div style={{ padding: "0.5rem" }}>
            {getFilteredProducts().length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>
                <FaStore style={{ fontSize: '2rem', marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '13px', fontWeight: '500' }}>Brak produktów</div>
                <div style={{ fontSize: '11px' }}>{filterTerm ? 'Brak produktów spełniających kryteria' : 'Magazyn jest pusty'}</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '900px', fontSize: '11px', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: '#f8f9fa' }}>
                    <tr>
                      <th style={{ width: '35px', padding: '0.4rem 0.25rem', textAlign: 'center', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>
                        <input type="checkbox" checked={selectedProducts.size === getFilteredProducts().length && getFilteredProducts().length > 0} onChange={handleSelectAll} />
                      </th>
                      <th style={{ width: '100px', padding: '0.4rem', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Producent</th>
                      <th style={{ minWidth: '200px', padding: '0.4rem', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Produkt</th>
                      <th style={{ width: '120px', padding: '0.4rem', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Kod/EAN</th>
                      <th style={{ width: '80px', padding: '0.4rem', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Opakowanie</th>
                      <th style={{ width: '60px', padding: '0.4rem', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Jednostka</th>
                      <th style={{ width: '90px', padding: '0.4rem', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Cena zakupu</th>
                      <th style={{ width: '90px', padding: '0.4rem', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Cena domyślna</th>
                      <th style={{ width: '90px', padding: '0.4rem', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Cena specjalna</th>
                      <th style={{ width: '60px', padding: '0.4rem', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Marża</th>
                      <th style={{ width: '70px', padding: '0.4rem', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Status</th>
                      <th style={{ width: '130px', padding: '0.4rem', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Akcje</th>
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
                              
                              {/* Cena zakupu - używaj purchase_price z API (z faktur) */}
                              <td style={{ 
                                width: '120px',
                                padding: '0.5rem'
                              }}>
                                <div>
                                  {product.purchase_price && product.purchase_price > 0 ? (
                                    <>
                                      <div style={{ 
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        color: '#fd7e14'
                                      }}>
                                        {(product.purchase_price * (1 + (product.stawka_vat || 23) / 100)).toFixed(2)} zł
                                      </div>
                                      <div style={{ 
                                        fontSize: '0.7rem',
                                        color: '#6c757d'
                                      }}>
                                        netto: {product.purchase_price.toFixed(2)} zł
                                      </div>
                                      {product.margin_method && (
                                        <div style={{ 
                                          fontSize: '0.6rem',
                                          color: '#17a2b8',
                                          fontStyle: 'italic'
                                        }}>
                                          {product.margin_method.includes('faktury') ? '📄 Z faktury' : product.margin_method}
                                        </div>
                                      )}
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
                              
                              {/* Marża - używaj margin_from_api z centralnego serwisu */}
                              <td style={{ 
                                width: '80px',
                                padding: '0.5rem'
                              }}>
                                <div>
                                  {/* Użyj marży z API jako głównego źródła */}
                                  {product.margin_from_api !== null && product.margin_from_api !== undefined ? (
                                    <div>
                                      <div style={{ 
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        color: product.margin_from_api >= 0 ? '#28a745' : '#dc3545'
                                      }}>
                                        {product.margin_from_api.toFixed(1)}%
                                      </div>
                                      <div style={{ 
                                        fontSize: '0.65rem',
                                        color: '#6c757d'
                                      }}>
                                        {product.hasSpecialPrice ? 'Cena spec.' : 'Cena dom.'}
                                      </div>
                                    </div>
                                  ) : product.hasSpecialPrice && product.specialMargin ? (
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
                                          color: product.defaultMargin?.percent >= 0 ? '#28a745' : '#dc3545'
                                        }}>
                                          {product.defaultMargin?.percent || 0}%
                                        </div>
                                        <div style={{ 
                                          fontSize: '0.65rem',
                                          color: '#6c757d'
                                        }}>
                                          {product.defaultMargin?.amount >= 0 ? '+' : ''}{(product.defaultMargin?.amount || 0).toFixed(2)} zł
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
                              
                              {/* Akcje - rozwijane menu */}
                              <td style={{ 
                                width: '130px',
                                padding: '0.4rem'
                              }}>
                                <div style={{ position: 'relative' }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenActionMenu(openActionMenu === product.id ? null : product.id);
                                    }}
                                    style={{
                                      padding: '0.35rem 0.6rem',
                                      fontSize: '10px',
                                      fontWeight: '500',
                                      border: '1px solid #6f42c1',
                                      borderRadius: '4px',
                                      backgroundColor: openActionMenu === product.id ? '#6f42c1' : 'white',
                                      color: openActionMenu === product.id ? 'white' : '#6f42c1',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    ⚙️ Akcje ▾
                                  </button>
                                  
                                  {openActionMenu === product.id && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '100%',
                                      right: 0,
                                      zIndex: 1000,
                                      backgroundColor: 'white',
                                      borderRadius: '8px',
                                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                      border: '1px solid #dee2e6',
                                      minWidth: '180px',
                                      marginTop: '4px',
                                      overflow: 'hidden'
                                    }}>
                                      <button onClick={() => { handleShowHistory(product); setOpenActionMenu(null); }}
                                        style={{ width: '100%', padding: '0.5rem 0.75rem', border: 'none', background: 'white', textAlign: 'left', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f0f0f0' }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}>
                                        <FaHistory style={{ color: '#0d6efd' }} /> Historia cen
                                      </button>
                                      <button onClick={() => { handleDirectPriceEdit(product); setOpenActionMenu(null); }}
                                        style={{ width: '100%', padding: '0.5rem 0.75rem', border: 'none', background: 'white', textAlign: 'left', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f0f0f0' }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}>
                                        <FaMoneyBill style={{ color: '#28a745' }} /> Wpisz cenę
                                      </button>
                                      <button onClick={() => { handleEditCenowka(product); setOpenActionMenu(null); }}
                                        style={{ width: '100%', padding: '0.5rem 0.75rem', border: 'none', background: 'white', textAlign: 'left', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f0f0f0' }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}>
                                        <FaTag style={{ color: '#17a2b8' }} /> Edytuj cenówkę
                                      </button>
                                      <button onClick={() => { setSelectedProducts(new Set([product.id])); handleBulkPriceChange(); setOpenActionMenu(null); }}
                                        style={{ width: '100%', padding: '0.5rem 0.75rem', border: 'none', background: 'white', textAlign: 'left', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f0f0f0' }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}>
                                        <FaEdit style={{ color: '#6c757d' }} /> Kalkulatory cen
                                      </button>
                                      <button onClick={() => { addToBuffer(product); setOpenActionMenu(null); }}
                                        style={{ width: '100%', padding: '0.5rem 0.75rem', border: 'none', background: 'white', textAlign: 'left', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: product.hasSpecialPrice ? '1px solid #f0f0f0' : 'none' }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#fff3cd'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}>
                                        <FaTag style={{ color: '#ffc107' }} /> Do bufora cenówek
                                      </button>
                                      {product.hasSpecialPrice && (
                                        <button onClick={() => { setSelectedProducts(new Set([product.id])); handleRemoveSpecialPrices(); setOpenActionMenu(null); }}
                                          style={{ width: '100%', padding: '0.5rem 0.75rem', border: 'none', background: '#fff5f5', textAlign: 'left', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#dc3545' }}
                                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f8d7da'}
                                          onMouseLeave={(e) => e.target.style.backgroundColor = '#fff5f5'}>
                                          <FaTrash style={{ color: '#dc3545' }} /> Usuń cenę specjalną
                                        </button>
                                      )}
                                    </div>
                                  )}
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
        <div style={{ backgroundColor: "white", borderRadius: "4px", padding: "2rem", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <FaStore style={{ fontSize: "2rem", color: "#6c757d", marginBottom: "0.5rem" }} />
          <div style={{ fontSize: "13px", fontWeight: "500", color: "#495057" }}>Wybierz lokalizację</div>
          <div style={{ fontSize: "11px", color: "#6c757d" }}>Wybierz lokalizację z listy powyżej aby zobaczyć produkty</div>
        </div>
      )}

      {/* Modal zmiany cen - nowoczesny styl */}
      {showPriceModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '12px', width: '90%', maxWidth: '500px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Header z gradientem */}
            <div style={{
              background: 'linear-gradient(135deg, #28a745, #1e7e34)',
              color: 'white', padding: '1rem 1.5rem', borderRadius: '12px 12px 0 0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h5 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                  💰 Zmiana cen
                </h5>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>
                  {selectedProducts.size} produktów wybranych
                </div>
              </div>
              <button onClick={() => setShowPriceModal(false)} style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>×</button>
            </div>

            {/* Zawartość */}
            <div style={{ padding: '1.25rem' }}>
              {/* Typ zmiany */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#495057', marginBottom: '0.5rem' }}>
                  Typ zmiany:
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[
                    { id: 'amount', label: 'Kwota (zł)', icon: '💵' },
                    { id: 'percent', label: 'Procent (%)', icon: '📊' },
                    { id: 'margin', label: 'Marża (%)', icon: '📈' }
                  ].map(opt => (
                    <button key={opt.id} onClick={() => setPriceChangeMode(opt.id)} style={{
                      flex: 1, padding: '0.5rem', fontSize: '11px', fontWeight: '500',
                      border: priceChangeMode === opt.id ? '2px solid #28a745' : '1px solid #dee2e6',
                      borderRadius: '6px', cursor: 'pointer',
                      backgroundColor: priceChangeMode === opt.id ? '#e8f5e9' : 'white',
                      color: priceChangeMode === opt.id ? '#28a745' : '#495057'
                    }}>
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wartość */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#495057', marginBottom: '0.5rem' }}>
                  {priceChangeMode === 'amount' && 'Zmiana ceny (zł):'}
                  {priceChangeMode === 'percent' && 'Zmiana procentowa (%):'}
                  {priceChangeMode === 'margin' && 'Docelowa marża (%):'}
                </div>
                <input type="number" step="0.01" value={priceChangeValue}
                  onChange={(e) => setPriceChangeValue(e.target.value)}
                  placeholder={priceChangeMode === 'amount' ? 'np. 5.00 lub -2.50' : priceChangeMode === 'percent' ? 'np. 10 lub -15' : 'np. 25'}
                  style={{
                    width: '100%', padding: '0.75rem', fontSize: '14px', fontWeight: '500',
                    border: '2px solid #dee2e6', borderRadius: '8px', textAlign: 'center'
                  }}
                />
                <div style={{ fontSize: '10px', color: '#6c757d', marginTop: '0.25rem' }}>
                  {priceChangeMode === 'amount' && 'Dodaj lub odejmij określoną kwotę od aktualnej ceny'}
                  {priceChangeMode === 'percent' && 'Zwiększ lub zmniejsz cenę o określony procent'}
                  {priceChangeMode === 'margin' && 'Ustaw cenę tak, aby uzyskać określoną marżę'}
                </div>
              </div>

              {/* Zaokrąglenie */}
              <div style={{
                backgroundColor: '#fff3cd', borderRadius: '8px', padding: '0.75rem',
                border: '1px solid #ffc107'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={roundToPsychological}
                    onChange={(e) => setRoundToPsychological(e.target.checked)}
                    style={{ accentColor: '#ffc107', width: '16px', height: '16px' }} />
                  <span style={{ fontWeight: '500' }}>Zaokrąglij do cen psychologicznych (.99)</span>
                </label>
                <div style={{ fontSize: '10px', color: '#856404', marginTop: '0.25rem', marginLeft: '24px' }}>
                  np. 12.50 → 12.99
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '0.75rem 1.25rem', borderTop: '1px solid #dee2e6',
              display: 'flex', justifyContent: 'flex-end', gap: '0.5rem',
              backgroundColor: '#f8f9fa', borderRadius: '0 0 12px 12px'
            }}>
              <button onClick={() => setShowPriceModal(false)} style={{
                padding: '0.5rem 1rem', fontSize: '12px', border: '1px solid #6c757d',
                borderRadius: '6px', backgroundColor: 'white', color: '#6c757d', cursor: 'pointer'
              }}>Anuluj</button>
              <button onClick={applyPriceChange} disabled={loading || !priceChangeValue} style={{
                padding: '0.5rem 1.25rem', fontSize: '12px', border: 'none', borderRadius: '6px',
                background: loading || !priceChangeValue ? '#ccc' : 'linear-gradient(135deg, #28a745, #1e7e34)',
                color: 'white', cursor: loading || !priceChangeValue ? 'not-allowed' : 'pointer'
              }}>
                {loading ? '⏳ Zapisywanie...' : '✓ Zastosuj zmiany'}
              </button>
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

      {/* Modal podglądu etykiet - nowoczesny styl */}
      {showPreview && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '12px', width: '95%', maxWidth: '1200px',
            maxHeight: '95vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Header z gradientem */}
            <div style={{
              background: 'linear-gradient(135deg, #6f42c1, #5a32a3)',
              color: 'white', padding: '1rem 1.5rem', borderRadius: '12px 12px 0 0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h5 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                  🏷️ Podgląd cenówek
                </h5>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>
                  {previewProducts.length} produktów wybranych do druku
                </div>
              </div>
              <button onClick={() => setShowPreview(false)} style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>×</button>
            </div>

            {/* Zawartość */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              {/* Ustawienia - kompaktowe 3 kolumny */}
              <div style={{
                backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '0.75rem',
                marginBottom: '1rem', border: '1px solid #e9ecef'
              }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#6f42c1', marginBottom: '0.5rem' }}>
                  ⚙️ Ustawienia etykiet
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {[
                    { id: 'includeManufacturer', label: 'Producent' },
                    { id: 'includeSimplifiedName', label: 'Nazwa uproszczona' },
                    { id: 'includeQuantity', label: 'Ilość w opakowaniu' },
                    { id: 'includePrice', label: 'Cena aktualna' },
                    { id: 'includeSpecialPrice', label: 'Cena specjalna' },
                    { id: 'includeWeight', label: 'Waga produktu' }
                  ].map(opt => (
                    <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={labelSettings[opt.id]}
                        onChange={(e) => setLabelSettings({...labelSettings, [opt.id]: e.target.checked})}
                        style={{ accentColor: '#6f42c1' }} />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Opcje powielania - żółty gradient */}
              <div style={{
                background: 'linear-gradient(135deg, #fff3cd, #ffeeba)', borderRadius: '8px',
                padding: '0.75rem', marginBottom: '1rem', border: '1px solid #ffc107'
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#856404' }}>
                    📦 Powielanie:
                  </div>
                  <select value={copyMultiplier} onChange={(e) => setCopyMultiplier(parseInt(e.target.value))}
                    style={{ padding: '0.35rem 0.5rem', fontSize: '11px', border: '1px solid #ffc107', borderRadius: '4px', backgroundColor: 'white' }}>
                    {[1,2,4,6,8,10].map(n => (
                      <option key={n} value={n}>{n}x {n === 1 ? '(pojedyncza)' : ''}</option>
                    ))}
                  </select>
                  <button onClick={handleSelectAllForCopy} style={{
                    padding: '0.35rem 0.5rem', fontSize: '10px', border: '1px solid #28a745',
                    borderRadius: '4px', backgroundColor: 'white', color: '#28a745', cursor: 'pointer'
                  }}>✓ Zaznacz wszystkie</button>
                  <button onClick={handleDeselectAllForCopy} style={{
                    padding: '0.35rem 0.5rem', fontSize: '10px', border: '1px solid #dc3545',
                    borderRadius: '4px', backgroundColor: 'white', color: '#dc3545', cursor: 'pointer'
                  }}>✕ Odznacz</button>
                  <span style={{ fontSize: '10px', padding: '0.25rem 0.5rem', backgroundColor: '#6f42c1', color: 'white', borderRadius: '4px' }}>
                    Zaznaczono: {selectedForCopy.size} | Łącznie: {previewProducts.reduce((sum, p) => sum + (selectedForCopy.has(p.id) ? copyMultiplier : 1), 0)}
                  </span>
                </div>
              </div>

              {/* Siatka cenówek */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {previewProducts.flatMap((product, productIndex) => {
                  const priceInfo = getDisplayPrice(product);
                  const unitPrice = product.packageQuantity && product.packageQuantity !== '1' ?
                    ((product.displayPrice || priceInfo.price) / parseFloat(product.packageQuantity)).toFixed(2) : null;
                  const isSelectedForCopy = selectedForCopy.has(product.id);
                  const multiplier = isSelectedForCopy ? copyMultiplier : 1;

                  return Array.from({ length: multiplier }, (_, copyIndex) => (
                    <div key={`${product.id}-${copyIndex}`} style={{
                      backgroundColor: 'white', borderRadius: '8px', padding: '0.5rem',
                      border: isSelectedForCopy && copyIndex === 0 ? '2px solid #ffc107' : '1px solid #dee2e6',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      opacity: copyIndex > 0 ? 0.7 : 1
                    }}>
                      {copyIndex === 0 && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', marginBottom: '0.5rem', cursor: 'pointer', color: '#6f42c1' }}>
                          <input type="checkbox" checked={selectedForCopy.has(product.id)}
                            onChange={() => handleToggleCopySelection(product.id)}
                            style={{ accentColor: '#ffc107' }} />
                          Powiel {copyMultiplier}x
                          {isSelectedForCopy && copyMultiplier > 1 && (
                            <span style={{ fontSize: '9px', padding: '1px 4px', backgroundColor: '#ffc107', color: '#212529', borderRadius: '3px' }}>+{copyMultiplier-1}</span>
                          )}
                        </label>
                      )}
                      {/* Cenówka 4x2cm */}
                      <div style={{
                        width: '4cm', height: '2cm', border: '1px solid #333', borderRadius: '2px',
                        padding: '1.5mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
                        justifyContent: 'center', textAlign: 'center', backgroundColor: 'white', margin: '0 auto'
                      }}>
                        {labelSettings.includePrice && (
                          <div style={{
                            fontSize: labelSettings.fontSize === 'small' ? '16px' : labelSettings.fontSize === 'large' ? '22px' : '19px',
                            fontWeight: 'bold', color: priceInfo.type === 'special' ? '#ff6b35' : '#28a745',
                            lineHeight: '1', marginBottom: '1mm'
                          }}>
                            {(product.displayPrice || priceInfo.price)?.toFixed(2)} zł
                          </div>
                        )}
                        {labelSettings.includeSimplifiedName && (
                          <div style={{
                            fontWeight: 'bold',
                            fontSize: labelSettings.fontSize === 'small' ? '9px' : labelSettings.fontSize === 'large' ? '12px' : '10px',
                            lineHeight: '1.1', marginBottom: '0.5mm', overflow: 'hidden', textOverflow: 'ellipsis', color: '#333'
                          }}>
                            {product.simplifiedName || product.nazwa}
                          </div>
                        )}
                        {labelSettings.includeManufacturer && product.manufacturer && (
                          <div style={{
                            fontWeight: 'bold',
                            fontSize: labelSettings.fontSize === 'small' ? '7px' : labelSettings.fontSize === 'large' ? '9px' : '8px',
                            color: '#007bff', lineHeight: '1.1', marginBottom: '0.5mm'
                          }}>
                            {product.manufacturer}
                          </div>
                        )}
                        <div style={{
                          fontSize: labelSettings.fontSize === 'small' ? '6px' : labelSettings.fontSize === 'large' ? '8px' : '7px',
                          color: '#666', lineHeight: '1.1', marginTop: 'auto'
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

            {/* Footer z gradientem */}
            <div style={{
              padding: '0.75rem 1rem', borderTop: '1px solid #dee2e6',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              backgroundColor: '#f8f9fa', borderRadius: '0 0 12px 12px'
            }}>
              <select value={labelSettings.fontSize} onChange={(e) => setLabelSettings({...labelSettings, fontSize: e.target.value})}
                style={{ padding: '0.35rem 0.5rem', fontSize: '11px', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                <option value="small">Mała czcionka</option>
                <option value="medium">Średnia czcionka</option>
                <option value="large">Duża czcionka</option>
              </select>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setShowPreview(false)} style={{
                  padding: '0.5rem 1rem', fontSize: '12px', border: '1px solid #6c757d',
                  borderRadius: '6px', backgroundColor: 'white', color: '#6c757d', cursor: 'pointer'
                }}>Zamknij</button>
                <button onClick={() => { previewProducts.forEach(product => addToBuffer(product)); setShowPreview(false); setShowBuffer(true); }}
                  style={{
                    padding: '0.5rem 1rem', fontSize: '12px', border: 'none', borderRadius: '6px',
                    background: 'linear-gradient(135deg, #17a2b8, #138496)', color: 'white', cursor: 'pointer'
                  }}>
                  <FaTag style={{ marginRight: '4px' }} />Do bufora
                </button>
                <button onClick={handlePrintLabels} style={{
                  padding: '0.5rem 1rem', fontSize: '12px', border: 'none', borderRadius: '6px',
                  background: 'linear-gradient(135deg, #28a745, #1e7e34)', color: 'white', cursor: 'pointer'
                }}>
                  <FaPrint style={{ marginRight: '4px' }} />Drukuj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal bufora cenówek - nowoczesny styl */}
      {showBuffer && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '12px', width: '95%', maxWidth: '1200px',
            maxHeight: '95vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Header z gradientem */}
            <div style={{
              background: 'linear-gradient(135deg, #17a2b8, #138496)',
              color: 'white', padding: '1rem 1.5rem', borderRadius: '12px 12px 0 0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h5 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                  🏷️ Bufor cenówek
                </h5>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>
                  {labelBuffer.length} produktów w buforze
                </div>
              </div>
              <button onClick={() => setShowBuffer(false)} style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>×</button>
            </div>

            {/* Zawartość */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              {labelBuffer.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#6c757d' }}>
                  <FaTag style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }} />
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>Bufor cenówek jest pusty</div>
                  <div style={{ fontSize: '12px' }}>Dodaj produkty do bufora, aby zebrać cenówki przed drukowaniem</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
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
                      <div key={product.bufferId} style={{
                        backgroundColor: 'white', borderRadius: '8px', padding: '0.5rem',
                        border: '1px solid #dee2e6', boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        position: 'relative'
                      }}>
                        <button onClick={() => removeFromBuffer(product.bufferId)} style={{
                          position: 'absolute', top: '4px', right: '4px', zIndex: 1,
                          background: '#dc3545', border: 'none', color: 'white',
                          width: '20px', height: '20px', borderRadius: '50%', cursor: 'pointer',
                          fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }} title="Usuń z bufora">×</button>
                        
                        {/* Cenówka 4x2cm */}
                        <div style={{
                          width: '4cm', height: '2cm', border: '1px solid #333', borderRadius: '2px',
                          padding: '1.5mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
                          justifyContent: 'center', textAlign: 'center', backgroundColor: 'white', margin: '0 auto'
                        }}>
                          <div style={{ fontSize: '19px', fontWeight: 'bold', color: '#28a745', lineHeight: '1', marginBottom: '1mm' }}>
                            {formatPrice(product.cenowka?.cena_cenowkowa || product.cena_sprzedazy_brutto)} zł
                          </div>
                          <div style={{ fontWeight: 'bold', fontSize: '10px', lineHeight: '1.1', marginBottom: '0.5mm', overflow: 'hidden', textOverflow: 'ellipsis', color: '#333' }}>
                            {product.finalName || product.nazwa_uproszczona || product.nazwa}
                          </div>
                          <div style={{ fontWeight: 'bold', fontSize: '8px', color: '#007bff', lineHeight: '1.1', marginBottom: '0.5mm' }}>
                            {manufacturers.find(m => m.id === product.producent_id)?.nazwa || 'Brak'}
                          </div>
                          <div style={{ fontSize: '7px', color: '#666', lineHeight: '1.1', marginTop: 'auto' }}>
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
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '0.75rem 1rem', borderTop: '1px solid #dee2e6',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              backgroundColor: '#f8f9fa', borderRadius: '0 0 12px 12px'
            }}>
              <button onClick={clearBuffer} disabled={labelBuffer.length === 0} style={{
                padding: '0.5rem 1rem', fontSize: '12px', border: 'none', borderRadius: '6px',
                background: labelBuffer.length === 0 ? '#ccc' : 'linear-gradient(135deg, #dc3545, #c82333)',
                color: 'white', cursor: labelBuffer.length === 0 ? 'not-allowed' : 'pointer'
              }}>
                <FaTrash style={{ marginRight: '4px' }} />Wyczyść bufor
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setShowBuffer(false)} style={{
                  padding: '0.5rem 1rem', fontSize: '12px', border: '1px solid #6c757d',
                  borderRadius: '6px', backgroundColor: 'white', color: '#6c757d', cursor: 'pointer'
                }}>Zamknij</button>
                <button onClick={printBufferLabels} disabled={labelBuffer.length === 0} style={{
                  padding: '0.5rem 1rem', fontSize: '12px', border: 'none', borderRadius: '6px',
                  background: labelBuffer.length === 0 ? '#ccc' : 'linear-gradient(135deg, #28a745, #1e7e34)',
                  color: 'white', cursor: labelBuffer.length === 0 ? 'not-allowed' : 'pointer'
                }}>
                  <FaPrint style={{ marginRight: '4px' }} />Drukuj bufor ({labelBuffer.length})
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
