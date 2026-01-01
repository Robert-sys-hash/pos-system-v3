import React, { useState, useEffect } from "react";
import CustomerSearch from "../components/pos/CustomerSearch";
import ProductSearch from "../components/pos/ProductSearch";
import TransactionsList from "../components/pos/TransactionsList";
import TransactionDetails from "../components/pos/TransactionDetails";
import DraftsList from "../components/pos/DraftsList";
import AddCustomerModal from "../components/pos/AddCustomerModal";
import CorrectionModal from "../components/pos/CorrectionModal";
import OpenShiftEnhancedModal from "../components/shifts/OpenShiftEnhancedModal";
import CloseShiftEnhancedModal from "../components/shifts/CloseShiftEnhancedModal";
import { useLocation } from "../contexts/LocationContext";
import { shiftService } from "../services/shiftService";
import { shiftEnhancedService } from "../services/shiftEnhancedService";
import { transactionService } from "../services/transactionService";
import { productService } from "../services/productService";
import { customerService } from "../services/customerService";
import { marginService } from "../services/marginService";
import { FaPercent, FaEuroSign, FaCheck, FaTimes } from "react-icons/fa";

const PosPage = () => {
  const { selectedLocation, locationId } = useLocation();
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [cart, setCart] = useState([]);
  const [editingPrices, setEditingPrices] = useState({}); // Nowy stan do śledzenia edycji cen
  const [currentShift, setCurrentShift] = useState(null);
  const [activeTab, setActiveTab] = useState("pos"); // pos, paragony
  const [receiptsSubTab, setReceiptsSubTab] = useState("transactions"); // transactions, drafts
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const [stats, setStats] = useState({
    receiptsToday: 0,
    dailyRevenue: 0,
    averageReceipt: 0,
  });
  const [salesTarget, setSalesTarget] = useState({
    target_amount: 0,
    current_revenue: 0,
    remaining_amount: 0,
    progress_percentage: 0,
    has_target: false
  });
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("gotowka");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  
  // Używamy locationId z kontekstu zamiast hardkodowanej wartości
  const currentLocationId = locationId;

  // Stany dla wyszukiwania klientów
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // Stany dla systemu rabatów
  const [availableDiscounts, setAvailableDiscounts] = useState([]);
  const [appliedDiscounts, setAppliedDiscounts] = useState([]);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [currentUser] = useState("admin"); // W rzeczywistej aplikacji z kontekstu
  const [cartDiscountTotal, setCartDiscountTotal] = useState(0);

  // Stany dla płatności gotówkowej
  const [showCashPaymentModal, setShowCashPaymentModal] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [cashChange, setCashChange] = useState(0);

  // Stany dla płatności kuponem
  const [showCouponPaymentModal, setShowCouponPaymentModal] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponData, setCouponData] = useState(null);
  const [couponValidating, setCouponValidating] = useState(false);

  // Stany dla płatności dzielonej
  const [showSplitPaymentModal, setShowSplitPaymentModal] = useState(false);
  const [splitPayments, setSplitPayments] = useState([
    { method: 'gotowka', amount: 0, label: 'Gotówka', icon: 'fas fa-money-bill-wave', color: '#198754' },
    { method: 'karta', amount: 0, label: 'Karta', icon: 'fas fa-credit-card', color: '#0d6efd' },
    { method: 'blik', amount: 0, label: 'BLIK', icon: 'fas fa-mobile-alt', color: '#ff6b35' },
    { method: 'kupon', amount: 0, label: 'Kupon', icon: 'fas fa-ticket-alt', color: '#6f42c1', couponCode: '' }
  ]);
  const [splitPaymentError, setSplitPaymentError] = useState('');

  // Stany dla filtrów produktów w koszyku
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [categories, setCategories] = useState([]);

  // Stany dla szybkich produktów (przyciski szybkiego dodawania)
  const [quickProducts, setQuickProducts] = useState([]);

  // Stany dla rozszerzonych modali zmian
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);

  // Stany dla korekty transakcji
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionTransaction, setCorrectionTransaction] = useState(null);

  // Stany dla raportów zamknięć dnia
  const [dailyClosureReports, setDailyClosureReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showClosureDetailsModal, setShowClosureDetailsModal] = useState(false);
  const [reportFilters, setReportFilters] = useState({
    date_from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0],
    cashier: ''
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  // Reaguj na zmianę lokalizacji - przeładuj cele sprzedaży i statystyki
  useEffect(() => {
    if (locationId) {
      loadSalesTarget();
      loadDailyStats();
    }
  }, [locationId]);

  const loadCurrentShift = async () => {
    try {
      const response = await shiftService.getCurrentShift(currentUser);
      if (response.success && response.data) {
        setCurrentShift(response.data);
        console.log('🔄 Załadowano aktualną zmianę:', response.data);
      } else {
        setCurrentShift(null);
        console.log('ℹ️ Brak otwartej zmiany');
      }
    } catch (err) {
      console.error("Błąd ładowania aktualnej zmiany:", err);
      setCurrentShift(null);
    }
  };

  const loadInitialData = async () => {
    try {
      // Załaduj aktualną zmianę
      await loadCurrentShift();

      // Załaduj statystyki dnia
      await loadDailyStats();
      
      // Załaduj cel sprzedaży
      await loadSalesTarget();

      // Załaduj dostępne rabaty
      await loadAvailableDiscounts();

      // Załaduj kategorie produktów
      await loadCategories();
      
      // Załaduj szybkie produkty
      await loadQuickProducts();
    } catch (err) {
      console.error("Błąd ładowania danych:", err);
    }
  };

  const loadDailyStats = async () => {
    try {
      const response = await transactionService.getDailyStats(currentLocationId);
      console.log('📊 Odebrane statystyki POS:', response);
      if (response.success) {
        setStats({
          receiptsToday: response.data.today_transactions || 0,
          dailyRevenue: response.data.today_revenue || 0,
          averageReceipt: response.data.today_average_transaction || 0,
        });
      }
    } catch (err) {
      console.error("Błąd ładowania statystyk:", err);
    }
  };

  // Ładowanie raportów zamknięć dnia
  const loadDailyClosureReports = async () => {
    setReportsLoading(true);
    try {
      const response = await shiftEnhancedService.getDailyClosureReports(reportFilters);
      console.log('📋 Raporty zamknięć:', response);
      if (response.success) {
        setDailyClosureReports(response.data?.reports || response.data || []);
      } else {
        setDailyClosureReports([]);
      }
    } catch (err) {
      console.error("Błąd ładowania raportów:", err);
      setDailyClosureReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  // Pobierz szczegóły raportu
  const loadReportDetails = async (reportId) => {
    try {
      const response = await shiftEnhancedService.getDailyClosureReportDetails(reportId);
      if (response.success) {
        setSelectedReport(response.data);
      }
    } catch (err) {
      console.error("Błąd ładowania szczegółów raportu:", err);
    }
  };

  const loadSalesTarget = async () => {
    if (!currentLocationId) return;
    
    try {
      const response = await transactionService.getSalesTarget(currentLocationId);
      console.log('🎯 Odebrane cele sprzedaży:', response);
      if (response.success && response.data) {
        // Mapuj dane z backendu na format oczekiwany przez frontend
        const targetData = {
          target_amount: response.data.target?.target_amount || 0,
          current_revenue: response.data.current_revenue || 0,
          remaining_amount: response.data.remaining || 0,
          progress_percentage: response.data.progress_percentage || 0,
          has_target: !!response.data.target // Ustaw has_target na true jeśli target istnieje
        };
        
        console.log('🎯 Zmapowane dane celu:', targetData);
        setSalesTarget(targetData);
      } else {
        // Brak celu - ustaw domyślne wartości
        setSalesTarget({
          target_amount: 0,
          current_revenue: 0,
          remaining_amount: 0,
          progress_percentage: 0,
          has_target: false
        });
      }
    } catch (err) {
      console.error("Błąd ładowania celu sprzedaży:", err);
      // W przypadku błędu ustaw brak celu
      setSalesTarget({
        target_amount: 0,
        current_revenue: 0,
        remaining_amount: 0,
        progress_percentage: 0,
        has_target: false
      });
    }
  };

  // Debounced search dla klientów
  useEffect(() => {
    if (customerSearchQuery.length < 2) {
      setCustomerSuggestions([]);
      setShowCustomerSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchCustomers();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [customerSearchQuery]);

  const searchCustomers = async () => {
    setCustomerSearchLoading(true);

    try {
      const response = await customerService.searchCustomers(
        customerSearchQuery,
        10,
      );

      if (response.success) {
        setCustomerSuggestions(response.data.customers || []);
        setShowCustomerSuggestions(true);
      } else {
        setCustomerSuggestions([]);
      }
    } catch (err) {
      console.error("Błąd wyszukiwania klientów:", err);
      setCustomerSuggestions([]);
    } finally {
      setCustomerSearchLoading(false);
    }
  };

  const loadAllCustomers = async () => {
    setCustomerSearchLoading(true);

    try {
      const response = await customerService.getCustomers();
      const customers = Array.isArray(response)
        ? response
        : response.data || [];
      setCustomerSuggestions(customers);
      setShowCustomerSuggestions(true);
    } catch (err) {
      console.error("Błąd pobierania klientów:", err);
      setCustomerSuggestions([]);
    } finally {
      setCustomerSearchLoading(false);
    }
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    const displayName =
      (customer.name && customer.name.trim()) ||
      `${(customer.imie || "").trim()} ${(customer.nazwisko || "").trim()}`.trim() ||
      customer.email ||
      customer.phone ||
      `Klient #${customer.id}`;
    setCustomerSearchQuery(displayName);
    setShowCustomerSuggestions(false);
  };

  const handleNewCustomerAdded = (newCustomer) => {
    // Automatycznie wybierz nowo utworzonego klienta
    selectCustomer(newCustomer);
    setShowAddCustomerModal(false);
  };

  // =============== FUNKCJE OBSŁUGI RABATÓW ===============

  const loadCategories = async () => {
    try {
      const response = await productService.getCategories();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (err) {
      console.error("Błąd ładowania kategorii:", err);
    }
  };

  // =============== FUNKCJE SZYBKICH PRODUKTÓW ===============
  
  const loadQuickProducts = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/pos/quick-products');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setQuickProducts(data.data || []);
          console.log("🛒 Załadowano szybkie produkty:", data.data?.length || 0);
        }
      }
    } catch (err) {
      console.error("Błąd ładowania szybkich produktów:", err);
    }
  };

  const handleQuickProductAdd = async (quickProduct) => {
    try {
      // Pobierz pełne dane produktu
      const response = await productService.getProduct(quickProduct.product_id, currentLocationId);
      if (response.success && response.data) {
        addToCart(response.data);
        console.log(`🛒 Dodano szybki produkt: ${quickProduct.nazwa}`);
      } else {
        setError(`Nie można dodać produktu: ${quickProduct.nazwa}`);
      }
    } catch (err) {
      console.error("Błąd dodawania szybkiego produktu:", err);
      setError(`Błąd dodawania produktu: ${quickProduct.nazwa}`);
    }
  };

  const loadAvailableDiscounts = async () => {
    try {
      console.log("🎯 Ładowanie rabatów dla użytkownika:", currentUser, "lokalizacja:", currentLocationId);
      const response = await fetch(
        `http://localhost:8000/api/rabaty?user_id=${currentUser}&location_id=${currentLocationId || ''}`,
      );
      console.log("🎯 Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("🎯 Otrzymane dane rabatów:", data);
        console.log("🎯 Liczba rabatów:", data?.data?.rabaty?.length || 0);
        setAvailableDiscounts(data.data?.rabaty || []);
      } else {
        console.error("🎯 Błąd odpowiedzi serwera:", response.status);
      }
    } catch (error) {
      console.error("🎯 Błąd ładowania rabatów:", error);
    }
  };

  const applyDiscount = async (discountId, note = "") => {
    console.log("🎯 Próba zastosowania rabatu ID:", discountId);
    console.log("🎯 Dostępne rabaty:", availableDiscounts.length);

    if (!cart.length) {
      setError("Koszyk jest pusty");
      return;
    }

    setDiscountLoading(true);
    try {
      // Sprawdź czy rabat można zastosować lokalnie
      const discount = availableDiscounts.find((d) => d.id === discountId);
      console.log("🎯 Znaleziony rabat:", discount);

      if (!discount) {
        setError("Rabat nie został znaleziony");
        return;
      }

      if (discount.status_dostepnosci !== "DOSTEPNY") {
        setError("Rabat nie jest dostępny (przekroczony limit)");
        return;
      }

      // Sprawdź czy ten rabat już nie jest zastosowany
      if (appliedDiscounts.some((d) => d.id === discountId)) {
        setError("Ten rabat jest już zastosowany");
        return;
      }

      // Najpierw utwórz koszyk (transakcję) jeśli nie istnieje
      let transactionId = currentTransaction?.id;

      if (!transactionId) {
        console.log("🎯 Tworzenie nowego koszyka dla rabatu...");
        const cartData = {
          kasjer_id: "admin",
          location_id: currentLocationId,
          shift_id: null,
        };

        const createResponse = await fetch(
          "http://localhost:8000/api/pos/cart/new",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(cartData),
          },
        );

        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          throw new Error(errorData.message || "Błąd tworzenia koszyka");
        }

        const createData = await createResponse.json();
        transactionId = createData.message.transakcja_id;
        setCurrentTransaction({
          id: transactionId,
          numer_transakcji: createData.message.numer_transakcji,
        });
        console.log("🎯 Utworzono koszyk ID:", transactionId);

        // Dodaj produkty do koszyka
        for (const item of cart) {
          const addItemResponse = await fetch(
            `http://localhost:8000/api/pos/cart/${transactionId}/items`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                product_id: item.id,
                ilosc: item.quantity,
              }),
            },
          );

          if (!addItemResponse.ok) {
            const errorData = await addItemResponse.json();
            throw new Error(
              `Błąd dodawania produktu ${item.name}: ${errorData.message}`,
            );
          }
        }
        console.log("🎯 Dodano wszystkie produkty do koszyka");
      }

      // Zastosuj rabat przez backend API
      console.log("🎯 Wywołuję backend API dla zastosowania rabatu...");
      const discountResponse = await fetch(
        `http://localhost:8000/api/pos/cart/${transactionId}/discount`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rabat_id: discountId,
            user_id: "admin",
            notatka: note,
            ip_address: window.location.hostname,
          }),
        },
      );

      if (!discountResponse.ok) {
        const errorData = await discountResponse.json();
        throw new Error(errorData.message || "Błąd zastosowania rabatu");
      }

      const discountData = await discountResponse.json();
      console.log("🎯 Odpowiedź backend rabatu:", discountData);

      // USUŃ WSZYSTKIE POPRZEDNIE RABATY (tylko jeden rabat na raz)
      console.log(
        "🎯 Usuwam poprzednie rabaty, było:",
        appliedDiscounts.length,
      );
      setAppliedDiscounts([]);
      setCartDiscountTotal(0);

      // Dodaj nowy rabat z danymi z backend
      const newDiscount = {
        id: discountId,
        nazwa: discount.nazwa,
        typ_rabatu: discount.typ_rabatu,
        wartosc: discount.wartosc,
        kwota_rabatu: discountData.message.kwota_rabatu,
        uzycie_id: discountData.message.uzycie_id, // ID zapisu w bazie
        czasowe_id: Date.now(),
      };

      console.log("🎯 Dodaję nowy rabat:", newDiscount);
      setAppliedDiscounts([newDiscount]);
      setCartDiscountTotal(discountData.message.kwota_rabatu);
      setShowDiscountModal(false);

      // Odśwież dostępne rabaty (limity mogły się zmienić)
      loadAvailableDiscounts();
    } catch (error) {
      console.error("🎯 Błąd zastosowania rabatu:", error);
      setError("Błąd zastosowania rabatu: " + error.message);
    } finally {
      setDiscountLoading(false);
    }
  };

  const removeDiscount = async (czasoweId) => {
    const discountToRemove = appliedDiscounts.find(
      (d) => d.czasowe_id === czasoweId,
    );
    
    if (!discountToRemove) {
      console.warn("🎯 Nie znaleziono rabatu do usunięcia:", czasoweId);
      return;
    }

    console.log("🎯 Usuwanie rabatu:", discountToRemove);

    try {
      // Wywołaj backend API jeśli rabat ma uzycie_id (został zapisany w bazie)
      if (discountToRemove.uzycie_id && currentTransaction?.id) {
        const response = await fetch(
          `http://localhost:8000/api/pos/cart/${currentTransaction.id}/discount/${discountToRemove.uzycie_id}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Błąd usuwania rabatu");
        }

        console.log("🎯 Rabat usunięty z backendu");
      }

      // Usuń rabat z frontendu
      setAppliedDiscounts((prev) =>
        prev.filter((d) => d.czasowe_id !== czasoweId),
      );
      setCartDiscountTotal((prev) => prev - discountToRemove.kwota_rabatu);
      
      // Odśwież dostępne rabaty
      loadAvailableDiscounts();
    } catch (error) {
      console.error("🎯 Błąd usuwania rabatu:", error);
      setError("Błąd usuwania rabatu: " + error.message);
    }
  };

  const calculateCartTotal = () => {
    return cart.reduce((total, item) => {
      const price =
        editingPrices[item.id] !== undefined
          ? editingPrices[item.id]
          : item.price;
      return total + price * item.quantity;
    }, 0);
  };

  const getFinalTotal = () => {
    return Math.max(0, calculateCartTotal() - cartDiscountTotal);
  };

  // Załaduj rabaty przy inicjalizacji
  useEffect(() => {
    loadAvailableDiscounts();
  }, [currentUser]);

  // Załaduj rabaty przy otwarciu modala
  useEffect(() => {
    if (showDiscountModal) {
      loadAvailableDiscounts();
    }
  }, [showDiscountModal]);

  // =============== KONIEC FUNKCJI RABATÓW ===============

  const getInitialCustomerData = () => {
    if (!customerSearchQuery) return {};

    // Próbujemy określić czy to email, telefon czy nazwa
    const query = customerSearchQuery.trim();

    if (query.includes("@")) {
      return { email: query };
    } else if (/^\+?[\d\s\-\(\)]+$/.test(query)) {
      return { telefon: query };
    } else if (query.includes(" ")) {
      const parts = query.split(" ");
      return {
        imie: parts[0],
        nazwisko: parts.slice(1).join(" "),
      };
    } else {
      return { imie: query };
    }
  };

  const handleProductSelect = (product) => {
    addToCart(product);
  };

  const handleTransactionSelect = (transaction) => {
    setSelectedTransactionId(transaction.id);
  };

  const addToCart = (product) => {
    // Blokada - nie można dodawać produktów bez otwartej zmiany
    if (!currentShift) {
      alert('⚠️ Nie można dodać produktu - najpierw otwórz zmianę!');
      return;
    }
    
    const existingItem = cart.find((item) => item.id === product.id);

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      // Użyj ceny specjalnej jeśli istnieje, w przeciwnym razie domyślnej
      const finalPrice = product.has_special_price && product.special_price_brutto 
        ? product.special_price_brutto 
        : product.default_price_brutto || product.price || product.cena || 0;
        
      console.log(`🔍 POS addToCart - Produkt ${product.name}:`, {
        has_special_price: product.has_special_price,
        special_price_brutto: product.special_price_brutto,
        default_price_brutto: product.default_price_brutto,
        finalPrice: finalPrice,
        purchase_price: product.purchase_price
      });
        
      const newCartItem = {
        ...product,
        quantity: 1,
        price: finalPrice,
        name: product.name || product.nazwa,
        has_special_price: product.has_special_price || false,
        special_price_brutto: product.special_price_brutto || null,
        default_price_brutto: product.default_price_brutto || product.price || product.cena || 0,
        // Zapisz najnowszą cenę zakupu z margin_service
        current_purchase_price: product.purchase_price || product.cena_zakupu || 0,
        purchase_price_method: product.purchase_price_method || 'Tabela produkty',
        // Zachowaj informacje o marży dla dynamicznego przeliczania
        margin_percent: null,
        margin_amount: null
      };
        
      setCart([...cart, newCartItem]);
      
      // Oblicz marżę dla nowo dodanego produktu
      if (product.id && finalPrice > 0) {
        marginService.calculateMargin({
          product_id: product.id,
          sell_price_brutto: finalPrice,
          warehouse_id: currentLocationId
        }).then(marginResult => {
          console.log(`🔢 POS: Marża dla nowego produktu ${product.id}:`, marginResult);
          
          setCart(prevCart => 
            prevCart.map((item) => {
              if (item.id === product.id && item.margin_percent === null) {
                return { 
                  ...item, 
                  margin_percent: marginResult.margin_percent,
                  margin_amount: marginResult.margin_amount,
                  current_purchase_price: marginResult.purchase_price,
                  purchase_price_method: marginResult.purchase_price_method
                };
              }
              return item;
            })
          );
        }).catch(error => {
          console.error('❌ POS: Błąd obliczania marży dla nowego produktu:', error);
        });
      }
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(
      cart.map((item) =>
        item.id === productId ? { ...item, quantity } : item,
      ),
    );
  };

  const updatePrice = async (productId, newPrice, isNetto = false) => {
    const updatedCart = cart.map((item) => {
      if (item.id === productId) {
        const vat = item.tax_rate || item.vat || 23;
        const vatMultiplier = 1 + vat / 100;

        let updatedPrice;
        if (isNetto) {
          // Jeśli edytujemy cenę netto, przelicz na brutto
          updatedPrice = newPrice * vatMultiplier;
        } else {
          // Jeśli edytujemy cenę brutto, użyj jej bezpośrednio
          updatedPrice = newPrice;
        }

        return { ...item, price: updatedPrice };
      }
      return item;
    });
    
    // Aktualizuj koszyk natychmiast
    setCart(updatedCart);
    
    // Oblicz nową marżę dla zmienionego produktu
    const updatedItem = updatedCart.find(item => item.id === productId);
    if (updatedItem) {
      try {
        const marginResult = await marginService.calculateMargin({
          product_id: productId,
          sell_price_brutto: updatedItem.price,
          warehouse_id: currentLocationId
        });
        
        console.log(`🔢 POS: Nowa marża dla produktu ${productId}:`, marginResult);
        
        // Aktualizuj marżę w koszyku
        setCart(prevCart => 
          prevCart.map((item) => {
            if (item.id === productId) {
              return { 
                ...item, 
                margin_percent: marginResult.margin_percent,
                margin_amount: marginResult.margin_amount,
                current_purchase_price: marginResult.purchase_price,
                purchase_price_method: marginResult.purchase_price_method
              };
            }
            return item;
          })
        );
        
      } catch (error) {
        console.error('❌ POS: Błąd obliczania marży:', error);
      }
    }
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setCurrentTransaction(null);
    setError("");
    // Resetuj płatności dzielone
    resetSplitPayments();
    setShowSplitPaymentModal(false);
    setSplitPaymentError("");
  };

  const saveDraft = async () => {
    if (cart.length === 0) {
      setError("Nie można zapisać pustego koszyka");
      return;
    }

    if (!currentLocationId) {
      setError("Najpierw wybierz lokalizację w prawym górnym rogu!");
      return;
    }

    if (!currentShift) {
      setError("Brak otwartej zmiany! Najpierw otwórz zmianę kasową.");
      return;
    }

    setLoading(true);
    try {
      const draftData = {
        customer: selectedCustomer,
        items: cart,
        total: getFinalTotal(),
        created_at: new Date().toISOString(),
      };

      localStorage.setItem(`draft_${Date.now()}`, JSON.stringify(draftData));

      clearCart();
      alert("Szkic został zapisany pomyślnie!");
    } catch (err) {
      setError("Błąd zapisywania szkicu");
    } finally {
      setLoading(false);
    }
  };

  // Funkcja do obsługi płatności gotówkowej
  const handleCashPayment = () => {
    console.log("💵 HandleCashPayment wywołane:", { cashReceived });
    
    const finalAmount = getFinalTotal();
    const receivedAmount = parseFloat(cashReceived) || 0;
    
    if (receivedAmount < finalAmount) {
      setError(`Otrzymana kwota (${receivedAmount.toFixed(2)} zł) jest mniejsza od należności (${finalAmount.toFixed(2)} zł)`);
      return;
    }

    const change = receivedAmount - finalAmount;
    setCashChange(change);
    
    console.log("💵 Zamykanie modalu i wywołanie processPayment z kwotą:", receivedAmount);
    
    // Zamknij modal i wywołaj płatność
    setShowCashPaymentModal(false);
    processPayment(receivedAmount);
  };

  // Funkcja do resetu modalu płatności
  const resetCashPaymentModal = () => {
    setCashReceived('');
    setCashChange(0);
    setShowCashPaymentModal(false);
  };

  // Funkcje obsługi kuponów
  const validateCouponCode = async (code) => {
    if (!code || code.length < 4) return null;
    
    setCouponValidating(true);
    try {
      const response = await fetch(`http://localhost:8000/api/coupons/validate/${code.toUpperCase()}`);
      const data = await response.json();
      
      if (data.success && data.data.valid) {
        return data.data;
      } else {
        throw new Error(data.data.errors?.join(', ') || 'Kupon nie jest ważny');
      }
    } catch (error) {
      console.error('Błąd walidacji kuponu:', error);
      throw error;
    } finally {
      setCouponValidating(false);
    }
  };

  const handleCouponPayment = async () => {
    try {
      const validatedCoupon = await validateCouponCode(couponCode);
      if (validatedCoupon) {
        setCouponData(validatedCoupon);
        setShowCouponPaymentModal(false);
        // Kontynuuj z płatnością używając kuponu
        processPayment(null, validatedCoupon);
      }
    } catch (error) {
      setError(`Błąd kuponu: ${error.message}`);
    }
  };

  const resetCouponPaymentModal = () => {
    setCouponCode('');
    setCouponData(null);
    setShowCouponPaymentModal(false);
  };

  // Funkcje dla płatności dzielonej
  const resetSplitPayments = () => {
    setSplitPayments([
      { method: 'gotowka', amount: 0, label: 'Gotówka', icon: 'fas fa-money-bill-wave', color: '#198754' },
      { method: 'karta', amount: 0, label: 'Karta', icon: 'fas fa-credit-card', color: '#0d6efd' },
      { method: 'blik', amount: 0, label: 'BLIK', icon: 'fas fa-mobile-alt', color: '#ff6b35' },
      { method: 'kupon', amount: 0, label: 'Kupon', icon: 'fas fa-ticket-alt', color: '#6f42c1', couponCode: '' }
    ]);
    setSplitPaymentError('');
  };

  const updateSplitPaymentAmount = (method, amount) => {
    // Zaokrąglij do 2 miejsc po przecinku
    const roundedAmount = Math.round((parseFloat(amount) || 0) * 100) / 100;
    setSplitPayments(prev => prev.map(payment => 
      payment.method === method 
        ? { ...payment, amount: roundedAmount }
        : payment
    ));
  };

  const updateSplitPaymentCouponCode = (code) => {
    setSplitPayments(prev => prev.map(payment => 
      payment.method === 'kupon' 
        ? { ...payment, couponCode: code }
        : payment
    ));
  };

  const getTotalSplitAmount = () => {
    return splitPayments.reduce((total, payment) => total + (payment.amount || 0), 0);
  };

  const processSplitPayment = async () => {
    const totalAmount = getFinalTotal();
    const splitTotal = getTotalSplitAmount();
    
    if (Math.abs(splitTotal - totalAmount) > 0.01) {
      setSplitPaymentError(`Suma płatności (${splitTotal.toFixed(2)} zł) nie równa się całkowitej kwocie (${totalAmount.toFixed(2)} zł)`);
      return;
    }

    // Waliduj kupon jeśli używany
    const couponPayment = splitPayments.find(p => p.method === 'kupon' && p.amount > 0);
    if (couponPayment && couponPayment.couponCode) {
      try {
        const validatedCoupon = await validateCouponCode(couponPayment.couponCode);
        if (validatedCoupon.value < couponPayment.amount) {
          setSplitPaymentError(`Kupon ma wartość ${validatedCoupon.value} zł, nie można wykorzystać ${couponPayment.amount} zł`);
          return;
        }
      } catch (error) {
        setSplitPaymentError(`Błąd kuponu: ${error.message}`);
        return;
      }
    }

    // Przetwórz płatność dzieloną
    setShowSplitPaymentModal(false);
    await processPayment(null, null, splitPayments);
  };

  const processPayment = async (receivedAmount = null, couponData = null, splitPaymentsData = null) => {
    console.log("🚀 ProcessPayment wywołane:", { paymentMethod, receivedAmount, cartLength: cart.length, splitPayments: splitPaymentsData });
    
    if (cart.length === 0) {
      setError("Koszyk jest pusty");
      return;
    }

    // Jeśli płatność dzielona, nie pokazuj innych modali
    if (splitPaymentsData) {
      console.log("💳 Przetwarzanie płatności dzielonej");
      // Kontynuuj bez otwierania dodatkowych modali
    }
    // Jeśli płatność gotówkowa (ale nie dzielona) i nie podano kwoty otrzymanej, otwórz modal
    else if (paymentMethod === "gotowka" && receivedAmount === null) {
      console.log("💰 Otwieranie modalu płatności gotówkowej");
      setShowCashPaymentModal(true);
      return;
    }
    // Jeśli płatność kuponem (ale nie dzielona) i nie podano danych kuponu, otwórz modal
    else if (paymentMethod === "kupon" && !couponData) {
      console.log("🎟️ Otwieranie modalu płatności kuponem");
      setShowCouponPaymentModal(true);
      return;
    }

    if (!currentLocationId) {
      setError("Najpierw wybierz lokalizację w prawym górnym rogu!");
      return;
    }

    if (!currentShift) {
      setError("Brak otwartej zmiany! Najpierw otwórz zmianę kasową.");
      return;
    }

    setLoading(true);
    try {
      const transactionData = {
        customer_id: selectedCustomer?.id || null,
        type: "sale", // Transakcja sprzedażowa
        location_id: currentLocationId, // Dodaj location_id
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
        payment_method: splitPaymentsData ? "dzielona" : paymentMethod,
        total_amount: getFinalTotal(), // Używaj kwoty po rabacie
        total_gross: getTotalAmount(), // Kwota brutto przed rabatem
        discount_amount: cartDiscountTotal,
        applied_discounts: appliedDiscounts,
        cashier: currentShift?.kasjer_login || "admin",
        // Dodaj informacje o płatnościach dzielonych
        ...(splitPaymentsData && {
          split_payments: splitPaymentsData.filter(p => p.amount > 0).map(p => ({
            method: p.method,
            amount: p.amount,
            ...(p.method === 'kupon' && p.couponCode && { coupon_code: p.couponCode })
          }))
        }),
        // Dodaj informacje o kuponie jeśli płacono kuponem
        ...(couponData && {
          coupon_code: couponData.code,
          coupon_value: couponData.value,
          coupon_discount: Math.min(couponData.value, getFinalTotal())
        })
      };

      // Utwórz transakcję przez transactionService
      const response =
        await transactionService.createTransaction(transactionData);

      if (response.success) {
        const transactionId = response.data.transaction_id;
        const transactionStatus = response.data.status;

        // Sprawdź czy transakcja jest już sfinalizowana
        if (transactionStatus === "zakonczony") {
          // Transakcja została automatycznie sfinalizowana przez backend
          setCurrentTransaction({ id: transactionId });
          clearCart();
          await loadDailyStats(); // Odśwież statystyki
          await loadSalesTarget(); // Odśwież cel sprzedaży
          alert("Transakcja została pomyślnie zrealizowana!");
        } else {
          // Transakcja wymaga finalizacji
          const finalAmount = getFinalTotal();
          const receivedAmountFloat = receivedAmount ? parseFloat(receivedAmount) : finalAmount;
          const changeAmount = paymentMethod === "gotowka" ? Math.max(0, receivedAmountFloat - finalAmount) : 0;
          
          const paymentData = {
            payment_method: splitPaymentsData ? "dzielona" : paymentMethod,
            amount_paid: finalAmount, // Kwota transakcji
            kwota_otrzymana: receivedAmountFloat, // Kwota otrzymana od klienta
            amount_change: changeAmount, // Reszta
            customer_id: selectedCustomer?.id || null, // Dodaj customer_id
            // Dodaj płatności dzielone jeśli istnieją
            ...(splitPaymentsData && {
              split_payments: splitPaymentsData.filter(p => p.amount > 0).map(p => ({
                method: p.method,
                amount: p.amount,
                ...(p.method === 'kupon' && p.couponCode && { coupon_code: p.couponCode })
              }))
            }),
            // Dodaj kupon jeśli istnieje
            ...(couponData && {
              coupon_code: couponData.code
            })
          };

          const completeResponse = await transactionService.completeTransaction(
            transactionId,
            paymentData,
          );

          if (completeResponse.success) {
            // Kupon jest automatycznie wykorzystywany przez backend w pos.py
            // Nie trzeba już osobno wywoływać /coupons/use/
            
            setCurrentTransaction({ id: transactionId });
            clearCart();
            await loadDailyStats(); // Odśwież statystyki
            await loadSalesTarget(); // Odśwież cel sprzedaży
            alert("Transakcja została pomyślnie zrealizowana!");
          } else {
            setError(completeResponse.error || "Błąd finalizacji transakcji");
          }
        }
      } else {
        setError(response.error || "Błąd tworzenia transakcji");
      }
    } catch (err) {
      setError("Błąd przetwarzania płatności: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openShift = () => {
    setShowOpenShiftModal(true);
  };

  const closeShift = () => {
    setShowCloseShiftModal(true);
  };

  const handleShiftOpened = async (shiftData) => {
    // Załaduj aktualną zmianę ponownie
    try {
      const shiftResponse = await shiftService.getCurrentShift();
      if (shiftResponse.success) {
        setCurrentShift(shiftResponse.data);
      }
      alert("Zmiana została otwarta pomyślnie!");
    } catch (err) {
      setError("Błąd ładowania zmiany: " + err.message);
    }
  };

  const handleShiftClosed = () => {
    setCurrentShift(null);
    alert("Zmiana została zamknięta pomyślnie z pełnym raportem!");
  };

  const handleCorrectionClick = (transaction) => {
    setCorrectionTransaction(transaction);
    setShowCorrectionModal(true);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Resetuj wybrane transakcje/szkice przy zmianie głównej zakładki
    if (tab !== "paragony") {
      setSelectedTransactionId(null);
    }
  };

  const handleLoadDraftToPOS = (draft) => {
    // Załaduj szkic do koszyka i przełącz na POS
    if (draft.items && draft.items.length > 0) {
      setCart(draft.items);
      if (draft.customer) {
        setSelectedCustomer(draft.customer);
      }

      // Usuń szkic z localStorage po załadowaniu
      localStorage.removeItem(draft.key);

      // Przełącz na zakładkę POS
      setActiveTab("pos");

      alert("Szkic został załadowany do koszyka!");
    }
  };

  return (
    <div
      className="pos-page"
      style={{
        padding: "0.75rem",
        backgroundColor: "#f8f9fa",
        minHeight: "100vh",
        fontSize: "12px"
      }}
    >
      {/* Header - kompaktowy styl */}
      <div
        style={{
          backgroundColor: "#4472C4",
          color: "white",
          padding: "0.5rem 1rem",
          marginBottom: "0.75rem",
          borderRadius: "0.375rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
        }}
      >
        <div>
          <h5 style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>🛒 System POS</h5>
          <div style={{ fontSize: "10px", opacity: 0.9 }}>
            Kasjer: {currentShift?.kasjer_login || "admin"} | {new Date().toLocaleDateString()}
          </div>
        </div>
        {/* Przyciski akcji - kompaktowe */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "11px",
              fontWeight: "500",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              backgroundColor: activeTab === "pos" ? "#28a745" : "rgba(255,255,255,0.2)",
              color: "white"
            }}
            onClick={() => setActiveTab("pos")}
          >
            🛒 Kasa
          </button>
          <button
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "11px",
              fontWeight: "500",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              backgroundColor: activeTab === "paragony" ? "#28a745" : "rgba(255,255,255,0.2)",
              color: "white"
            }}
            onClick={() => setActiveTab("paragony")}
          >
            📄 Paragony
          </button>
          <button
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "11px",
              fontWeight: "500",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              backgroundColor: activeTab === "raporty" ? "#28a745" : "rgba(255,255,255,0.2)",
              color: "white"
            }}
            onClick={() => {
              setActiveTab("raporty");
              loadDailyClosureReports();
            }}
          >
            📊 Raporty
          </button>
          <button 
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "11px",
              fontWeight: "500",
              border: "1px solid rgba(255,255,255,0.5)",
              borderRadius: "4px",
              cursor: "pointer",
              backgroundColor: "transparent",
              color: "white"
            }}
            onClick={saveDraft}
          >
            💾 Szkic
          </button>
          {currentShift ? (
            <button
              style={{
                padding: "0.35rem 0.75rem",
                fontSize: "11px",
                fontWeight: "600",
                border: "none",
                borderRadius: "4px",
                cursor: loading ? "not-allowed" : "pointer",
                backgroundColor: "#dc3545",
                color: "white",
                opacity: loading ? 0.7 : 1
              }}
              onClick={closeShift}
              disabled={loading}
            >
              🔒 {loading ? "..." : "Zamknij"}
            </button>
          ) : (
            <button
              style={{
                padding: "0.35rem 0.75rem",
                fontSize: "11px",
                fontWeight: "600",
                border: "none",
                borderRadius: "4px",
                cursor: loading ? "not-allowed" : "pointer",
                backgroundColor: "#28a745",
                color: "white",
                opacity: loading ? 0.7 : 1
              }}
              onClick={openShift}
              disabled={loading}
            >
              🔓 {loading ? "..." : "Otwórz zmianę"}
            </button>
          )}
        </div>
      </div>

      {/* Ostrzeżenie gdy nie wybrano lokalizacji */}
      {!currentLocationId && (
        <div style={{
          backgroundColor: '#fff3cd',
          color: '#856404',
          padding: '0.5rem 0.75rem',
          borderRadius: '4px',
          marginBottom: '0.75rem',
          border: '1px solid #ffc107',
          textAlign: 'center',
          fontSize: '11px',
          fontWeight: '600'
        }}>
          ⚠️ Wybierz lokalizację w prawym górnym rogu przed utworzeniem paragonu!
        </div>
      )}

      {/* Statystyki - kompaktowy styl */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            borderLeft: "3px solid #4472C4",
            borderRadius: "4px",
            padding: "0.5rem 0.75rem",
            textAlign: "center",
            minWidth: "90px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
          }}
        >
          <div
            style={{ fontSize: "16px", fontWeight: "700", color: "#4472C4" }}
          >
            {stats.receiptsToday}
          </div>
          <div style={{ fontSize: "10px", color: "#6c757d" }}>
            Paragony
          </div>
        </div>

        <div
          style={{
            backgroundColor: "white",
            borderLeft: "3px solid #28a745",
            borderRadius: "4px",
            padding: "0.5rem 0.75rem",
            textAlign: "center",
            minWidth: "90px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
          }}
        >
          <div
            style={{ fontSize: "16px", fontWeight: "700", color: "#28a745" }}
          >
            {stats.dailyRevenue.toFixed(2)}
          </div>
          <div style={{ fontSize: "10px", color: "#6c757d" }}>
            Obrót (zł)
          </div>
        </div>
        {/* ...pozostała zawartość głównej strony... */}

        <div
          style={{
            backgroundColor: "white",
            borderLeft: "3px solid #17a2b8",
            borderRadius: "4px",
            padding: "0.5rem 0.75rem",
            textAlign: "center",
            minWidth: "90px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
          }}
        >
          <div
            style={{ fontSize: "16px", fontWeight: "700", color: "#17a2b8" }}
          >
            {stats.averageReceipt.toFixed(2)}
          </div>
          <div style={{ fontSize: "10px", color: "#6c757d" }}>
            Średnia (zł)
          </div>
        </div>

        {/* Cel sprzedaży miesięczny - kompaktowy */}
        <div
          style={{
            backgroundColor: "white",
            borderLeft: "3px solid #ffc107",
            borderRadius: "4px",
            padding: "0.5rem 0.75rem",
            minWidth: "180px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
          }}
        >
          <div
            style={{ fontSize: "11px", fontWeight: "600", color: "#856404", marginBottom: "4px" }}
          >
            🎯 Cel miesięczny
          </div>
          
          {salesTarget.has_target ? (
            <>
              <div style={{ fontSize: "10px", color: "#6c757d", marginBottom: "3px" }}>
                Cel: {salesTarget.target_amount.toLocaleString()} zł
              </div>
              
              {/* Pasek postępu */}
              <div style={{ 
                width: "100%", 
                backgroundColor: "#e9ecef", 
                borderRadius: "4px", 
                height: "5px",
                marginBottom: "3px"
              }}>
                <div style={{
                  width: `${Math.min(salesTarget.progress_percentage, 100)}%`,
                  backgroundColor: salesTarget.progress_percentage >= 100 ? "#28a745" : "#ffc107",
                  height: "100%",
                  borderRadius: "4px",
                  transition: "width 0.3s ease"
                }}></div>
              </div>
              
              <div style={{ fontSize: "10px", color: salesTarget.remaining_amount > 0 ? "#dc3545" : "#28a745" }}>
                {salesTarget.remaining_amount > 0 
                  ? `Pozostało: ${salesTarget.remaining_amount.toLocaleString()} zł`
                  : "🎉 Cel osiągnięty!"
                }
              </div>
            </>
          ) : (
            <div style={{ fontSize: "10px", color: "#6c757d" }}>
              Brak celu
            </div>
          )}
        </div>

        {/* Szybkie akcje - kompaktowe */}
        <div
          style={{
            backgroundColor: "white",
            borderLeft: "3px solid #6f42c1",
            borderRadius: "4px",
            padding: "0.5rem 0.75rem",
            minWidth: "130px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: "600",
              color: "#6f42c1",
              marginBottom: "6px",
            }}
          >
            ⚡ Szybkie akcje
          </div>
          <button
            style={{
              width: "100%",
              padding: "0.25rem 0.5rem",
              fontSize: "10px",
              fontWeight: "500",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
              backgroundColor: "#0d6efd",
              color: "white",
              marginBottom: "4px"
            }}
            onClick={() => window.open("/reports/daily", "_blank")}
          >
            📊 Raporty
          </button>
          {currentShift ? (
            <button
              style={{
                width: "100%",
                padding: "0.25rem 0.5rem",
                fontSize: "10px",
                fontWeight: "500",
                border: "none",
                borderRadius: "3px",
                cursor: loading ? "not-allowed" : "pointer",
                backgroundColor: "#dc3545",
                color: "white"
              }}
              onClick={closeShift}
              disabled={loading}
            >
              � Zamknij
            </button>
          ) : (
            <button
              style={{
                width: "100%",
                padding: "0.25rem 0.5rem",
                fontSize: "10px",
                fontWeight: "500",
                border: "none",
                borderRadius: "3px",
                cursor: loading ? "not-allowed" : "pointer",
                backgroundColor: "#28a745",
                color: "white"
              }}
              onClick={openShift}
              disabled={loading}
            >
              🔓 Otwórz
            </button>
          )}
        </div>
      </div>

      {/* Główna sekcja POS - kompaktowy styl */}
      {activeTab === "pos" && (
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Koszyk z wbudowaną wyszukiwarką - kompaktowy */}
          <div
            style={{
              backgroundColor: "white",
              border: "1px solid #dee2e6",
              borderRadius: "0.375rem",
              marginBottom: "0.75rem",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div
              style={{
                padding: "0.5rem 0.75rem",
                borderBottom: "1px solid #e9ecef",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.5rem",
                backgroundColor: "#f8f9fa"
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span style={{ fontSize: "1rem" }}>🛒</span>
                <div>
                  <h6
                    style={{
                      margin: 0,
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#212529",
                    }}
                  >
                    Koszyk
                  </h6>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "10px",
                      color: "#6c757d",
                    }}
                  >
                    {cart.length} {cart.length === 1 ? "produkt" : "produktów"}
                  </p>
                </div>

                {/* Filtry w jednej linii z nagłówkiem */}
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                    marginLeft: "0.75rem",
                    flexWrap: "wrap",
                  }}
                >
                  {/* Kategoria */}
                  <div style={{ minWidth: "120px" }}>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.25rem 0.4rem",
                        fontSize: "10px",
                        border: "1px solid #ced4da",
                        borderRadius: "3px",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="">🏷️ Wszystkie</option>
                      {categories.map((category, index) => (
                        <option key={index} value={category.name}>
                          {category.name} ({category.product_count || 0})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Widok */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "0.2rem 0.4rem",
                      fontSize: "10px",
                      border: "1px solid #e9ecef",
                      borderRadius: "3px",
                      backgroundColor: "white",
                    }}
                  >
                    <input
                      type="checkbox"
                      id="onlyAvailableCart"
                      checked={onlyAvailable}
                      onChange={(e) => setOnlyAvailable(e.target.checked)}
                      style={{ marginRight: "0.3rem" }}
                    />
                    <label
                      htmlFor="onlyAvailableCart"
                      style={{
                        margin: 0,
                        fontSize: "10px",
                        color: "#495057",
                      }}
                    >
                      ✓ Dostępne
                    </label>
                  </div>

                  {/* Szybkie produkty - przyciski szybkiego dodawania */}
                  {quickProducts.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: "0.3rem",
                        alignItems: "center",
                        marginLeft: "0.3rem",
                        paddingLeft: "0.5rem",
                        borderLeft: "1px solid #dee2e6",
                      }}
                    >
                      {quickProducts.map((qp) => (
                        <button
                          key={qp.id}
                          onClick={() => handleQuickProductAdd(qp)}
                          title={`${qp.product_nazwa || qp.nazwa} - ${(qp.product_cena || 0).toFixed(2)} zł`}
                          style={{
                            padding: "0.2rem 0.4rem",
                            fontSize: "10px",
                            border: "1px solid #6f42c1",
                            borderRadius: "0.375rem",
                            backgroundColor: "#f8f5ff",
                            color: "#6f42c1",
                            cursor: "pointer",
                            fontWeight: "500",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            transition: "all 0.15s ease-in-out",
                            whiteSpace: "nowrap",
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = "#6f42c1";
                            e.target.style.color = "white";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "#f8f5ff";
                            e.target.style.color = "#6f42c1";
                          }}
                        >
                          <i className={qp.ikona || "fas fa-shopping-bag"}></i>
                          {qp.nazwa}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.3rem" }}>
                {cart.length > 0 && (
                  <>
                    <button
                      onClick={saveDraft}
                      style={{
                        padding: "0.3rem 0.5rem",
                        fontSize: "10px",
                        border: "1px solid #6c757d",
                        borderRadius: "3px",
                        backgroundColor: "white",
                        color: "#6c757d",
                        cursor: "pointer",
                        fontWeight: "500"
                      }}
                      title="Zapisz jako szkic"
                    >
                      💾 Szkic
                    </button>
                    <button
                      onClick={clearCart}
                      style={{
                        padding: "0.3rem 0.5rem",
                        fontSize: "10px",
                        border: "1px solid #dc3545",
                        borderRadius: "3px",
                        backgroundColor: "white",
                        color: "#dc3545",
                        cursor: "pointer",
                        fontWeight: "500"
                      }}
                      title="Wyczyść koszyk"
                    >
                      🗑️ Wyczyść
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Kompaktowa sekcja klienta */}
            <div
              style={{
                padding: "0.5rem 1rem",
                borderBottom: "1px solid #e9ecef",
                backgroundColor: "#fafbfc",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: "fit-content" }}>
                <i className="fas fa-user" style={{ color: "#6c757d", fontSize: "0.8rem" }}></i>
                <span style={{ fontSize: "0.75rem", fontWeight: "500", color: "#495057" }}>Klient:</span>
              </div>

              <div style={{ flex: 1, position: "relative", maxWidth: "300px" }}>
                {selectedCustomer ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.25rem 0.5rem",
                      backgroundColor: "#d4edda",
                      borderRadius: "0.25rem",
                      border: "1px solid #c3e6cb",
                    }}
                  >
                    <span style={{ fontSize: "0.75rem", fontWeight: "500", color: "#155724" }}>
                      {(selectedCustomer.name && selectedCustomer.name.trim()) ||
                        `${(selectedCustomer.imie || "").trim()} ${(selectedCustomer.nazwisko || "").trim()}`.trim() ||
                        selectedCustomer.email ||
                        selectedCustomer.phone ||
                        `#${selectedCustomer.id}`}
                    </span>
                    {selectedCustomer.phone && (
                      <span style={{ fontSize: "0.7rem", color: "#155724" }}>📞 {selectedCustomer.phone}</span>
                    )}
                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCustomerSearchQuery("");
                      }}
                      style={{
                        marginLeft: "auto",
                        background: "none",
                        border: "none",
                        color: "#155724",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        padding: "0 0.25rem",
                      }}
                      title="Usuń klienta"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Wyszukaj lub wybierz..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.3rem 0.5rem",
                        border: "1px solid #ced4da",
                        borderRadius: "0.25rem",
                        fontSize: "0.75rem",
                        outline: "none",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#0d6efd";
                        if (customerSearchQuery.length >= 2) setShowCustomerSuggestions(true);
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#ced4da";
                        setTimeout(() => setShowCustomerSuggestions(false), 150);
                      }}
                    />
                    {/* Podpowiedzi */}
                    {showCustomerSuggestions && customerSuggestions.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          background: "white",
                          border: "1px solid #ced4da",
                          borderTop: "none",
                          borderRadius: "0 0 0.25rem 0.25rem",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                          zIndex: 1000,
                          maxHeight: "150px",
                          overflowY: "auto",
                        }}
                      >
                        {customerSuggestions.map((customer) => (
                          <div
                            key={customer.id}
                            onClick={() => selectCustomer(customer)}
                            style={{
                              padding: "0.4rem 0.5rem",
                              fontSize: "0.75rem",
                              cursor: "pointer",
                              borderBottom: "1px solid #f1f1f1",
                            }}
                            onMouseEnter={(e) => (e.target.style.backgroundColor = "#f8f9fa")}
                            onMouseLeave={(e) => (e.target.style.backgroundColor = "white")}
                          >
                            <div style={{ fontWeight: "500" }}>
                              {(customer.name && customer.name.trim()) ||
                                `${(customer.imie || "").trim()} ${(customer.nazwisko || "").trim()}`.trim() ||
                                customer.email ||
                                `#${customer.id}`}
                            </div>
                            {customer.phone && (
                              <span style={{ fontSize: "0.65rem", color: "#6c757d" }}>📞 {customer.phone}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {showCustomerSuggestions && customerSuggestions.length === 0 && customerSearchQuery.length >= 2 && !customerSearchLoading && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          background: "white",
                          border: "1px solid #ced4da",
                          borderTop: "none",
                          borderRadius: "0 0 0.25rem 0.25rem",
                          padding: "0.4rem",
                          fontSize: "0.7rem",
                          color: "#6c757d",
                          textAlign: "center",
                          zIndex: 1000,
                        }}
                      >
                        Brak wyników
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Przyciski */}
              <div style={{ display: "flex", gap: "0.25rem" }}>
                {!selectedCustomer && (
                  <>
                    <button
                      onClick={loadAllCustomers}
                      style={{
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.7rem",
                        border: "1px solid #0d6efd",
                        borderRadius: "0.25rem",
                        backgroundColor: "#e7f1ff",
                        color: "#0d6efd",
                        cursor: "pointer",
                        fontWeight: "500",
                      }}
                      title="Pokaż listę klientów"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => setShowAddCustomerModal(true)}
                      style={{
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.7rem",
                        border: "1px solid #198754",
                        borderRadius: "0.25rem",
                        backgroundColor: "#d1e7dd",
                        color: "#198754",
                        cursor: "pointer",
                        fontWeight: "500",
                      }}
                      title="Dodaj nowego klienta"
                    >
                      ➕
                    </button>
                  </>
                )}
              </div>
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: "#f8d7da",
                  color: "#721c24",
                  border: "1px solid #f5c6cb",
                  borderRadius: "0.375rem",
                  padding: "0.75rem",
                  margin: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <i className="fas fa-exclamation-triangle"></i>
                {error}
              </div>
            )}

            {/* Tabela produktów w koszyku */}
            <div style={{ padding: "1rem" }}>
              <div
                style={{
                  maxHeight: "500px",
                  overflowY: "auto",
                  marginBottom: "20px",
                  border: "1px solid #eee",
                  borderRadius: "4px",
                }}
              >
                <table style={{ width: "100%", fontSize: "12px" }}>
                  <thead
                    style={{
                      backgroundColor: "#f8f9fa",
                      position: "sticky",
                      top: 0,
                    }}
                  >
                    <tr>
                      <th
                        style={{
                          padding: "8px 6px",
                          textAlign: "center",
                          width: "40px",
                        }}
                      >
                        LP
                      </th>
                      <th style={{ padding: "8px 6px", textAlign: "left" }}>
                        Produkt
                      </th>
                      <th
                        style={{
                          padding: "8px 6px",
                          textAlign: "center",
                          width: "80px",
                        }}
                      >
                        Ilość
                      </th>
                      <th
                        style={{
                          padding: "8px 6px",
                          textAlign: "center",
                          width: "60px",
                        }}
                      >
                        VAT
                      </th>
                      <th
                        style={{
                          padding: "8px 6px",
                          textAlign: "right",
                          width: "90px",
                        }}
                      >
                        Cena netto
                      </th>
                      <th
                        style={{
                          padding: "8px 6px",
                          textAlign: "right",
                          width: "90px",
                        }}
                      >
                        Cena brutto
                      </th>
                      <th
                        style={{
                          padding: "8px 6px",
                          textAlign: "right",
                          width: "90px",
                        }}
                      >
                        Wartość
                      </th>
                      <th
                        style={{
                          padding: "8px 6px",
                          textAlign: "center",
                          width: "110px",
                        }}
                      >
                        Marża
                      </th>
                      <th
                        style={{
                          padding: "8px 6px",
                          textAlign: "center",
                          width: "60px",
                        }}
                      >
                        Akcje
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.length === 0 && (
                      <tr>
                        <td
                          colSpan="9"
                          style={{
                            textAlign: "center",
                            padding: "2rem 1rem",
                            color: "#6c757d",
                          }}
                        >
                          <i
                            className="fas fa-shopping-cart"
                            style={{
                              fontSize: "2rem",
                              marginBottom: "0.5rem",
                              opacity: 0.3,
                              display: "block",
                            }}
                          ></i>
                          <div
                            style={{ fontSize: "0.9rem", fontWeight: "500" }}
                          >
                            Koszyk jest pusty
                          </div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              marginTop: "0.25rem",
                            }}
                          >
                            Użyj wyszukiwarki poniżej, aby dodać produkty
                          </div>
                        </td>
                      </tr>
                    )}
                    {cart.map((item, index) => {
                      // Obliczenia dla ceny netto/brutto, marży, total itp.
                      const taxRate = item.tax_rate || item.vat || 23;
                      const nettoPrice = item.price / (1 + taxRate / 100);
                      const bruttoPrice = item.price;
                      const total = item.price * item.quantity;
                      
                      // Użyj dynamicznie obliczonej marży jeśli dostępna, w przeciwnym razie oblicz z aktualnej ceny zakupu
                      let margaAbsolute, margaPercent;
                      
                      if (item.margin_percent !== null && item.margin_amount !== null) {
                        // Użyj dynamicznie obliczonej marży
                        margaPercent = item.margin_percent;
                        margaAbsolute = item.margin_amount;
                      } else if (item.current_purchase_price && item.current_purchase_price > 0) {
                        // Oblicz marżę z najnowszej ceny zakupu
                        margaAbsolute = nettoPrice - item.current_purchase_price;
                        margaPercent = (margaAbsolute / nettoPrice) * 100;
                      } else if (item.cena_zakupu && item.cena_zakupu > 0) {
                        // Fallback - stara metoda obliczania
                        margaAbsolute = bruttoPrice - item.cena_zakupu;
                        margaPercent = ((bruttoPrice - item.cena_zakupu) / item.cena_zakupu) * 100;
                      } else {
                        // Brak danych do obliczenia marży
                        margaAbsolute = 0;
                        margaPercent = 0;
                      }
                      return (
                        <tr
                          key={item.id}
                          style={{ borderBottom: "1px solid #eee" }}
                        >
                          <td
                            style={{
                              padding: "8px 6px",
                              textAlign: "center",
                              fontSize: "11px",
                              fontWeight: "500",
                              color: "#6c757d",
                            }}
                          >
                            {index + 1}
                          </td>
                          <td style={{ padding: "8px 6px" }}>
                            <div
                              style={{ fontWeight: "500", fontSize: "11px" }}
                            >
                              {item.name}
                            </div>
                            {item.kod_kreskowy && (
                              <div style={{ fontSize: "10px", color: "#666" }}>
                                {item.kod_kreskowy}
                              </div>
                            )}
                          </td>
                          <td
                            style={{ padding: "8px 6px", textAlign: "center" }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "3px",
                              }}
                            >
                              <button
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity - 1)
                                }
                                style={{
                                  background: "#f8f9fa",
                                  border: "1px solid #dee2e6",
                                  borderRadius: "3px",
                                  width: "18px",
                                  height: "18px",
                                  fontSize: "10px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                -
                              </button>
                              <span
                                style={{
                                  minWidth: "24px",
                                  textAlign: "center",
                                  fontSize: "11px",
                                  fontWeight: "500",
                                }}
                              >
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity + 1)
                                }
                                style={{
                                  background: "#f8f9fa",
                                  border: "1px solid #dee2e6",
                                  borderRadius: "3px",
                                  width: "18px",
                                  height: "18px",
                                  fontSize: "10px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td
                            style={{ padding: "8px 6px", textAlign: "center" }}
                          >
                            {item.vat || 23}%
                          </td>
                          <td
                            style={{
                              padding: "8px 6px",
                              textAlign: "right",
                              fontSize: "11px",
                              color: "#6c757d",
                            }}
                          >
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={
                                editingPrices[`${item.id}_netto`] !== undefined
                                  ? editingPrices[`${item.id}_netto`]
                                  : nettoPrice.toFixed(2)
                              }
                              onChange={(e) => {
                                const value = e.target.value;
                                setEditingPrices((prev) => ({
                                  ...prev,
                                  [`${item.id}_netto`]: value,
                                }));
                                if (value !== "" && !isNaN(parseFloat(value))) {
                                  updatePrice(
                                    item.id,
                                    parseFloat(value) || 0,
                                    true,
                                  );
                                }
                              }}
                              onFocus={(e) => {
                                e.target.select();
                                setEditingPrices((prev) => ({
                                  ...prev,
                                  [`${item.id}_netto`]: nettoPrice.toFixed(2),
                                }));
                              }}
                              onBlur={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                updatePrice(item.id, value, true);
                                setEditingPrices((prev) => {
                                  const newState = { ...prev };
                                  delete newState[`${item.id}_netto`];
                                  return newState;
                                });
                              }}
                              style={{
                                width: "70px",
                                padding: "2px 4px",
                                fontSize: "10px",
                                border: "1px solid #dee2e6",
                                borderRadius: "3px",
                                textAlign: "right",
                                backgroundColor: "white",
                                fontWeight: "500",
                              }}
                            />
                          </td>
                          <td
                            style={{
                              padding: "8px 6px",
                              textAlign: "right",
                              fontSize: "11px",
                              fontWeight: "500",
                            }}
                          >
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={
                                editingPrices[`${item.id}_brutto`] !== undefined
                                  ? editingPrices[`${item.id}_brutto`]
                                  : bruttoPrice.toFixed(2)
                              }
                              onChange={(e) => {
                                const value = e.target.value;
                                setEditingPrices((prev) => ({
                                  ...prev,
                                  [`${item.id}_brutto`]: value,
                                }));
                                if (value !== "" && !isNaN(parseFloat(value))) {
                                  updatePrice(
                                    item.id,
                                    parseFloat(value) || 0,
                                    false,
                                  );
                                }
                              }}
                              onFocus={(e) => {
                                e.target.select();
                                setEditingPrices((prev) => ({
                                  ...prev,
                                  [`${item.id}_brutto`]: bruttoPrice.toFixed(2),
                                }));
                              }}
                              onBlur={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                updatePrice(item.id, value, false);
                                setEditingPrices((prev) => {
                                  const newState = { ...prev };
                                  delete newState[`${item.id}_brutto`];
                                  return newState;
                                });
                              }}
                              style={{
                                width: "70px",
                                padding: "2px 4px",
                                fontSize: "10px",
                                border: "1px solid #dee2e6",
                                borderRadius: "3px",
                                textAlign: "right",
                                backgroundColor: "white",
                                fontWeight: "500",
                              }}
                            />
                          </td>
                          <td
                            style={{
                              padding: "8px 6px",
                              textAlign: "right",
                              fontSize: "11px",
                              fontWeight: "600",
                            }}
                          >
                            {total.toFixed(2)} zł
                          </td>
                          <td
                            style={{ padding: "8px 6px", textAlign: "center" }}
                          >
                            {(item.current_purchase_price > 0 || item.cena_zakupu > 0) ? (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "2px",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: "500",
                                    color:
                                      margaPercent >= 30
                                        ? "#28a745"
                                        : margaPercent >= 15
                                          ? "#ffc107"
                                          : "#dc3545",
                                    padding: "1px 4px",
                                    borderRadius: "3px",
                                    backgroundColor:
                                      margaPercent >= 30
                                        ? "#d4edda"
                                        : margaPercent >= 15
                                          ? "#fff3cd"
                                          : "#f8d7da",
                                  }}
                                >
                                  {margaPercent.toFixed(1)}%
                                </span>
                                <span
                                  style={{ fontSize: "9px", color: "#6c757d" }}
                                >
                                  {margaAbsolute.toFixed(2)} zł
                                </span>
                                {item.purchase_price_method && (
                                  <span
                                    style={{ 
                                      fontSize: "8px", 
                                      color: "#6c757d",
                                      fontStyle: "italic"
                                    }}
                                    title={item.purchase_price_method}
                                  >
                                    {item.purchase_price_method.includes('faktury') ? 'Faktura' : 'Tabela'}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span
                                style={{ fontSize: "10px", color: "#adb5bd" }}
                              >
                                -
                              </span>
                            )}
                          </td>
                          <td
                            style={{ padding: "8px 6px", textAlign: "center" }}
                          >
                            <button
                              onClick={() => removeFromCart(item.id)}
                              style={{
                                background: "#dc3545",
                                color: "white",
                                border: "none",
                                borderRadius: "3px",
                                width: "22px",
                                height: "22px",
                                fontSize: "12px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              title="Usuń z koszyka"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Wyszukiwarka jako ostatnia pozycja w koszyku */}
                    <tr
                      style={{
                        backgroundColor: "#f8f9fa",
                        borderTop: "2px solid #dee2e6",
                      }}
                    >
                      <td colSpan="9" style={{ padding: "12px" }}>
                        <ProductSearch
                          onProductSelect={handleProductSelect}
                          selectedProducts={cart}
                          searchQuery={productSearchQuery}
                          onSearchQueryChange={setProductSearchQuery}
                          selectedCategory={selectedCategory}
                          onlyAvailable={onlyAvailable}
                          showFilters={false}
                          locationId={currentLocationId}
                        />
                      </td>
                    </tr>
                  </tbody>
                  <tfoot
                    style={{
                      backgroundColor: "#f8f9fa",
                      borderTop: "2px solid #dee2e6",
                    }}
                  >
                    {/* ...stopka koszyka... */}
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
          {/* Sekcja płatności - na dole - KOMPAKTOWA */}
          <div
            style={{
              backgroundColor: "white",
              border: "1px solid #e9ecef",
              borderRadius: "6px",
              padding: "0.75rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                marginBottom: "0.75rem",
                paddingBottom: "0.5rem",
                borderBottom: "1px solid #e9ecef",
              }}
            >
              <span style={{ fontSize: "14px" }}>💳</span>
              <h3
                style={{
                  margin: 0,
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#212529",
                }}
              >
                Płatność
              </h3>
              <div
                style={{
                  marginLeft: "auto",
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#198754",
                  padding: "0.2rem 0.5rem",
                  backgroundColor: "#d1e7dd",
                  borderRadius: "4px",
                  border: "1px solid #198754",
                }}
              >
                {getFinalTotal().toFixed(2)} zł
              </div>
            </div>

            {/* Metody płatności - kompaktowe */}
            <div style={{ marginBottom: "0.75rem" }}>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: "600",
                  color: "#6c757d",
                  marginBottom: "0.5rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                💰 Metoda płatności
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: "0.4rem",
                }}
              >
                {[
                  { value: "gotowka", label: "Gotówka", icon: "💵", color: "#198754" },
                  { value: "karta", label: "Karta", icon: "💳", color: "#0d6efd" },
                  { value: "blik", label: "BLIK", icon: "📱", color: "#ff6b35" },
                  { value: "kupon", label: "Kupon", icon: "🎟️", color: "#6f42c1" },
                  { value: "dzielona", label: "Dzielona", icon: "💰", color: "#fd7e14" },
                ].map((method) => (
                  <button
                    key={method.value}
                    onClick={() => {
                      if (method.value === 'dzielona') {
                        setShowSplitPaymentModal(true);
                      } else {
                        setPaymentMethod(method.value);
                      }
                    }}
                    style={{
                      padding: "0.4rem 0.5rem",
                      fontSize: "10px",
                      fontWeight: "600",
                      border: "1px solid #e9ecef",
                      borderLeft: `3px solid ${method.color}`,
                      borderRadius: "4px",
                      backgroundColor:
                        paymentMethod === method.value ? method.color : "white",
                      color:
                        paymentMethod === method.value ? "white" : "#495057",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.2rem",
                      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                    }}
                  >
                    <span style={{ fontSize: "14px" }}>{method.icon}</span>
                    <span>{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Przyciski płatności - kompaktowe */}
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button
                onClick={() => setShowDiscountModal(true)}
                style={{
                  flex: 1,
                  padding: "0.4rem 0.5rem",
                  fontSize: "10px",
                  fontWeight: "600",
                  border: "1px solid #6f42c1",
                  borderRadius: "4px",
                  backgroundColor: "#f8f5ff",
                  color: "#6f42c1",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.1rem",
                }}
              >
                <span style={{ fontSize: "12px" }}>🏷️</span>
                <span>Rabaty</span>
              </button>
              
              <button
                onClick={() => processPayment()}
                disabled={cart.length === 0 || loading || !currentShift}
                style={{
                  flex: 3,
                  padding: "0.5rem",
                  fontSize: "12px",
                  fontWeight: "600",
                  border: "none",
                  borderRadius: "4px",
                  backgroundColor:
                    cart.length === 0 || !currentShift ? "#6c757d" : "#198754",
                  color: "white",
                  cursor:
                    cart.length === 0 || !currentShift
                      ? "not-allowed"
                      : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.3rem",
                }}
              >
                {loading ? (
                  <>⏳ Przetwarzanie...</>
                ) : (
                  <>💳 Zapłać {getFinalTotal().toFixed(2)} zł</>
                )}
              </button>

              <button
                onClick={saveDraft}
                disabled={cart.length === 0 || loading || !currentShift}
                style={{
                  flex: 1,
                  padding: "0.4rem 0.5rem",
                  fontSize: "10px",
                  border: "1px solid #6c757d",
                  borderRadius: "4px",
                  backgroundColor:
                    cart.length === 0 || !currentShift ? "#e9ecef" : "#f8f9fa",
                  color:
                    cart.length === 0 || !currentShift ? "#adb5bd" : "#6c757d",
                  cursor:
                    cart.length === 0 || !currentShift
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: "600",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.1rem",
                }}
              >
                <span style={{ fontSize: "12px" }}>💾</span>
                <span>Szkic</span>
              </button>

              <button
                onClick={clearCart}
                disabled={cart.length === 0}
                style={{
                  flex: 1,
                  padding: "0.4rem 0.5rem",
                  fontSize: "10px",
                  border: "1px solid #dc3545",
                  borderRadius: "4px",
                  backgroundColor: "#fff5f5",
                  color: "#dc3545",
                  cursor: cart.length === 0 ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.1rem",
                }}
              >
                <span style={{ fontSize: "12px" }}>🗑️</span>
                <span>Wyczyść</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sekcja Paragony */}
      {activeTab === "paragony" && (
        <div>
          {/* Zakładki podsekcji - Transakcje/Szkice - KOMPAKTOWE */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "6px",
              padding: "0.75rem",
              marginBottom: "0.75rem",
              border: "1px solid #e9ecef",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "0.4rem",
                borderBottom: "1px solid #e9ecef",
                paddingBottom: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              <button
                onClick={() => {
                  setReceiptsSubTab("transactions");
                  setSelectedTransactionId(null);
                }}
                style={{
                  flex: 1,
                  padding: "0.4rem 0.5rem",
                  fontSize: "11px",
                  fontWeight: "600",
                  border: "1px solid #e9ecef",
                  borderRadius: "4px",
                  backgroundColor:
                    receiptsSubTab === "transactions" ? "#0d6efd" : "white",
                  color:
                    receiptsSubTab === "transactions" ? "white" : "#495057",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.3rem",
                }}
              >
                📄 Transakcje
              </button>

              <button
                onClick={() => {
                  setReceiptsSubTab("drafts");
                  setSelectedTransactionId(null);
                }}
                style={{
                  flex: 1,
                  padding: "0.4rem 0.5rem",
                  fontSize: "11px",
                  fontWeight: "600",
                  border: "1px solid #e9ecef",
                  borderRadius: "4px",
                  backgroundColor:
                    receiptsSubTab === "drafts" ? "#6f42c1" : "white",
                  color: receiptsSubTab === "drafts" ? "white" : "#495057",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.3rem",
                }}
              >
                📝 Szkice
              </button>
            </div>

            <div
              style={{
                fontSize: "10px",
                color: "#6c757d",
                textAlign: "center",
              }}
            >
              {receiptsSubTab === "transactions"
                ? "Lista wszystkich zrealizowanych transakcji"
                : "Lista zapisanych szkiców transakcji gotowych do kontynuacji"}
            </div>
          </div>

          {/* Zawartość w zależności od wybranej podsekcji */}
          <div style={{ display: "flex", gap: "15px" }}>
            {receiptsSubTab === "transactions" ? (
              <div style={{ display: "contents" }}>
                {/* Lista transakcji */}
                <div style={{ flex: selectedTransactionId ? "0 0 60%" : "1" }}>
                  <TransactionsList
                    onTransactionSelect={handleTransactionSelect}
                    onCorrectionClick={handleCorrectionClick}
                    locationId={currentLocationId}
                    isAdmin={
                      (currentShift?.kasjer_login || "admin") === "admin"
                    }
                  />
                </div>

                {/* Szczegóły transakcji */}
                {selectedTransactionId && (
                  <div style={{ flex: "0 0 40%" }}>
                    <TransactionDetails
                      transactionId={selectedTransactionId}
                      onClose={() => setSelectedTransactionId(null)}
                    />
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Sekcja szkiców */}
                <div style={{ flex: "1" }}>
                  <DraftsList onLoadDraft={handleLoadDraftToPOS} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sekcja Raporty zamknięć dnia - KOMPAKTOWA (identyczna jak w AdminPage) */}
      {activeTab === "raporty" && (
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Lista zamknięć dziennych */}
          <div style={{
            border: '1px solid #e9ecef',
            borderRadius: '4px',
            backgroundColor: 'white',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              padding: '0.4rem 0.6rem',
              background: 'linear-gradient(135deg, #4a6fa5 0%, #3d5a8c 100%)',
              borderBottom: '1px solid #e9ecef',
              fontWeight: '600',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: 'white',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <div>
                <span style={{ fontSize: '11px' }}>📋 Historia zamknięć dziennych</span>
                <div style={{ fontSize: '9px', fontWeight: '400', opacity: 0.9, marginTop: '2px' }}>
                  💰 Finanse • 📊 Różnice • 📱 Social Media • 🎯 Osiągnięcia • 📝 Notatki
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '9px' }}>Od:</span>
                <input
                  type="date"
                  value={reportFilters.date_from}
                  onChange={(e) => setReportFilters(prev => ({ ...prev, date_from: e.target.value }))}
                  style={{
                    padding: '2px 4px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '3px',
                    fontSize: '9px',
                    backgroundColor: 'rgba(255,255,255,0.9)'
                  }}
                />
                <span style={{ fontSize: '9px' }}>Do:</span>
                <input
                  type="date"
                  value={reportFilters.date_to}
                  onChange={(e) => setReportFilters(prev => ({ ...prev, date_to: e.target.value }))}
                  style={{
                    padding: '2px 4px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '3px',
                    fontSize: '9px',
                    backgroundColor: 'rgba(255,255,255,0.9)'
                  }}
                />
                <input
                  type="text"
                  value={reportFilters.cashier || ''}
                  onChange={(e) => setReportFilters(prev => ({ ...prev, cashier: e.target.value }))}
                  placeholder="Kasjer..."
                  style={{
                    padding: '2px 4px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '3px',
                    fontSize: '9px',
                    width: '70px',
                    backgroundColor: 'rgba(255,255,255,0.9)'
                  }}
                />
                <button
                  onClick={loadDailyClosureReports}
                  disabled={reportsLoading}
                  style={{
                    padding: '3px 8px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '3px',
                    cursor: reportsLoading ? 'not-allowed' : 'pointer',
                    fontSize: '9px'
                  }}
                >
                  {reportsLoading ? '⏳' : '🔍'} Szukaj
                </button>
              </div>
            </div>

            {/* Legenda wskaźników */}
            <div style={{
              padding: '4px 8px',
              backgroundColor: '#f1f3f4',
              borderBottom: '1px solid #e9ecef',
              fontSize: '9px',
              color: '#6c757d',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              <strong>Legenda:</strong>
              <span style={{ backgroundColor: '#f3e5f5', padding: '1px 4px', borderRadius: '2px' }}>📱 Social Media</span>
              <span style={{ backgroundColor: '#fff3cd', padding: '1px 4px', borderRadius: '2px' }}>🎯 Osiągnięcia</span>
              <span style={{ backgroundColor: '#d1ecf1', padding: '1px 4px', borderRadius: '2px' }}>📝 Notatki</span>
              <span style={{ backgroundColor: '#fff8e1', padding: '1px 4px', borderRadius: '2px' }}>💰 Safebag</span>
              <span style={{ fontStyle: 'italic' }}>- kliknij "👁️" aby zobaczyć pełne dane</span>
            </div>

            <div style={{ overflow: 'auto', maxHeight: '500px' }}>
              {reportsLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>
                  <p style={{ margin: 0, fontSize: '11px' }}>⏳ Ładowanie raportów...</p>
                </div>
              ) : dailyClosureReports && dailyClosureReports.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                  <thead style={{ backgroundColor: '#e9ecef', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: '10px', fontWeight: '600', borderBottom: '1px solid #dee2e6' }}>
                        📅 Data / Kasjer
                      </th>
                      <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: '10px', fontWeight: '600', borderBottom: '1px solid #dee2e6' }}>
                        💵 Gotówka
                      </th>
                      <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: '10px', fontWeight: '600', borderBottom: '1px solid #dee2e6' }}>
                        💳 Karty
                      </th>
                      <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: '10px', fontWeight: '600', borderBottom: '1px solid #dee2e6' }}>
                        📊 Różnice
                      </th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: '10px', fontWeight: '600', borderBottom: '1px solid #dee2e6' }}>
                        🧾 Trans.
                      </th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: '10px', fontWeight: '600', borderBottom: '1px solid #dee2e6' }}>
                        📋 Dane
                      </th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: '10px', fontWeight: '600', borderBottom: '1px solid #dee2e6' }}>
                        ⚙️ Akcje
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyClosureReports.map((report, index) => (
                      <tr key={report.id || index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                        <td style={{ padding: '5px 8px', fontSize: '10px', borderBottom: '1px solid #e9ecef' }}>
                          <div style={{ fontWeight: '600', color: '#2c3e50' }}>
                            {report.data_zamkniecia ? new Date(report.data_zamkniecia).toLocaleDateString('pl-PL') : '-'}
                          </div>
                          <div style={{ fontSize: '9px', color: '#6c757d' }}>
                            👤 {report.kasjer_login || 'System'} • ⏰ {report.czas_zamkniecia?.split('.')[0] || ''}
                          </div>
                        </td>
                        <td style={{ padding: '5px 8px', fontSize: '10px', textAlign: 'right', borderBottom: '1px solid #e9ecef' }}>
                          <div style={{ fontWeight: '600', color: '#28a745' }}>
                            {parseFloat(report.kasa_fizyczna || 0).toFixed(2)} zł
                          </div>
                          <div style={{ fontSize: '9px', color: '#6c757d' }}>
                            sys: {parseFloat(report.kasa_system || 0).toFixed(2)} zł
                          </div>
                        </td>
                        <td style={{ padding: '5px 8px', fontSize: '10px', textAlign: 'right', borderBottom: '1px solid #e9ecef' }}>
                          <div style={{ fontWeight: '600', color: '#007bff' }}>
                            {parseFloat(report.sprzedaz_karta || report.terminal_rzeczywisty || 0).toFixed(2)} zł
                          </div>
                          <div style={{ fontSize: '9px', color: '#6c757d' }}>
                            term: {parseFloat(report.terminal_rzeczywisty || 0).toFixed(2)} zł
                          </div>
                        </td>
                        <td style={{ 
                          padding: '5px 8px', 
                          fontSize: '10px', 
                          textAlign: 'right', 
                          borderBottom: '1px solid #e9ecef'
                        }}>
                          <div style={{ 
                            fontWeight: '600',
                            color: (report.roznica_kasa || 0) < 0 ? '#dc3545' : (report.roznica_kasa || 0) > 0 ? '#28a745' : '#495057'
                          }}>
                            Kasa: {parseFloat(report.roznica_kasa || 0).toFixed(2)} zł
                          </div>
                          <div style={{ 
                            fontSize: '9px',
                            color: (report.roznica_terminal || 0) < 0 ? '#dc3545' : (report.roznica_terminal || 0) > 0 ? '#28a745' : '#6c757d'
                          }}>
                            Term: {parseFloat(report.roznica_terminal || 0).toFixed(2)} zł
                          </div>
                        </td>
                        <td style={{ padding: '5px 8px', fontSize: '10px', textAlign: 'center', borderBottom: '1px solid #e9ecef' }}>
                          <span style={{
                            padding: '2px 6px',
                            backgroundColor: '#e7f3ff',
                            color: '#0056b3',
                            borderRadius: '3px',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}>
                            {report.liczba_transakcji || 0}
                          </span>
                        </td>
                        <td style={{ padding: '5px 8px', fontSize: '10px', textAlign: 'center', borderBottom: '1px solid #e9ecef' }}>
                          <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                            {(report.social_media_tiktok || report.social_media_facebook || 
                              report.social_media_instagram || report.social_media_google) && (
                              <span style={{
                                padding: '2px 4px',
                                backgroundColor: '#f3e5f5',
                                color: '#6f42c1',
                                borderRadius: '2px',
                                fontSize: '9px'
                              }} title="Social Media">
                                📱
                              </span>
                            )}
                            {(report.osiagniecia_sprzedaz || report.osiagniecia_praca) && (
                              <span style={{
                                padding: '2px 4px',
                                backgroundColor: '#fff3cd',
                                color: '#856404',
                                borderRadius: '2px',
                                fontSize: '9px'
                              }} title="Osiągnięcia">
                                🎯
                              </span>
                            )}
                            {report.uwagi_zamkniecia && (
                              <span style={{
                                padding: '2px 4px',
                                backgroundColor: '#d1ecf1',
                                color: '#0c5460',
                                borderRadius: '2px',
                                fontSize: '9px'
                              }} title="Notatki">
                                📝
                              </span>
                            )}
                            {(report.safebag_wplaty > 0 || report.safebag_stan > 0) && (
                              <span style={{
                                padding: '2px 4px',
                                backgroundColor: '#fff8e1',
                                color: '#e65100',
                                borderRadius: '2px',
                                fontSize: '9px'
                              }} title={`Safebag: wpłaty ${parseFloat(report.safebag_wplaty || 0).toFixed(2)} zł, stan ${parseFloat(report.safebag_stan || 0).toFixed(2)} zł`}>
                                💰
                              </span>
                            )}
                            {!(report.social_media_tiktok || report.social_media_facebook || 
                              report.social_media_instagram || report.social_media_google ||
                              report.osiagniecia_sprzedaz || report.osiagniecia_praca || report.uwagi_zamkniecia ||
                              report.safebag_wplaty > 0 || report.safebag_stan > 0) && (
                              <span style={{ fontSize: '9px', color: '#adb5bd' }}>—</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '5px 8px', fontSize: '10px', textAlign: 'center', borderBottom: '1px solid #e9ecef' }}>
                          <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                            <button
                              onClick={() => {
                                setSelectedReport(report);
                                setShowClosureDetailsModal(true);
                              }}
                              style={{
                                padding: '3px 6px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '9px'
                              }}
                            >
                              👁️
                            </button>
                            <button
                              onClick={() => window.print()}
                              style={{
                                padding: '3px 6px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '9px'
                              }}
                            >
                              🖨️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '1.5rem',
                  color: '#6c757d'
                }}>
                  <p style={{ margin: 0, fontSize: '11px' }}>📭 Brak raportów zamknięć dla wybranych kryteriów</p>
                  <p style={{ fontSize: '10px', marginTop: '0.3rem', color: '#adb5bd' }}>
                    Użyj filtrów powyżej aby wygenerować raporty zamknięć dziennych
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal szczegółów zamknięcia */}
      {showClosureDetailsModal && selectedReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            maxWidth: '700px',
            width: '95%',
            maxHeight: '85vh',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            {/* Nagłówek modalu */}
            <div style={{ 
              background: 'linear-gradient(135deg, #4a6fa5 0%, #3d5a8c 100%)',
              color: 'white',
              padding: '0.5rem 0.75rem',
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '12px', fontWeight: '600' }}>
                  📊 Szczegóły zamknięcia dziennego
                </h3>
                <div style={{ fontSize: '10px', opacity: 0.9, marginTop: '2px' }}>
                  📅 {selectedReport.data_zamkniecia ? new Date(selectedReport.data_zamkniecia).toLocaleDateString('pl-PL') : '-'} • 👤 {selectedReport.kasjer_login || 'System'}
                </div>
              </div>
              <button
                onClick={() => setShowClosureDetailsModal(false)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
              >
                ✕ Zamknij
              </button>
            </div>

            <div style={{ padding: '0.5rem', overflow: 'auto', maxHeight: 'calc(85vh - 80px)' }}>
              <div style={{ display: 'grid', gap: '0.4rem' }}>
              
              {/* Podstawowe informacje */}
              <div style={{ padding: '0.4rem 0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px', borderLeft: '3px solid #6c757d' }}>
                <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '11px', fontWeight: '600', color: '#495057' }}>
                  📅 Informacje podstawowe
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.3rem', fontSize: '10px' }}>
                  <div>
                    <span style={{ color: '#6c757d' }}>Data zamknięcia:</span><br/>
                    <strong>{selectedReport.data_zamkniecia ? new Date(selectedReport.data_zamkniecia).toLocaleString('pl-PL') : '-'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6c757d' }}>Użytkownik:</span><br/>
                    <strong>{selectedReport.kasjer_login || 'System'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6c757d' }}>Czas zamknięcia:</span><br/>
                    <strong>{selectedReport.czas_zamkniecia?.split('.')[0] || '-'}</strong>
                  </div>
                </div>
              </div>

              {/* Podsumowanie finansowe */}
              <div style={{ padding: '0.4rem 0.5rem', backgroundColor: '#e7f3ff', borderRadius: '4px', borderLeft: '3px solid #007bff' }}>
                <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '11px', fontWeight: '600', color: '#0056b3' }}>
                  💰 Podsumowanie finansowe
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.3rem', fontSize: '10px' }}>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '4px 6px', borderRadius: '3px' }}>
                    <span style={{ color: '#6c757d' }}>Kasa system:</span><br/>
                    <strong>{parseFloat(selectedReport.kasa_system || 0).toFixed(2)} zł</strong>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '4px 6px', borderRadius: '3px' }}>
                    <span style={{ color: '#6c757d' }}>Kasa fizyczna:</span><br/>
                    <strong>{parseFloat(selectedReport.kasa_fizyczna || 0).toFixed(2)} zł</strong>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '4px 6px', borderRadius: '3px' }}>
                    <span style={{ color: '#6c757d' }}>Różnica kasa:</span><br/>
                    <strong style={{ 
                      color: (selectedReport.roznica_kasa || 0) < 0 ? '#dc3545' : (selectedReport.roznica_kasa || 0) > 0 ? '#28a745' : '#495057'
                    }}>
                      {parseFloat(selectedReport.roznica_kasa || 0).toFixed(2)} zł
                    </strong>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '4px 6px', borderRadius: '3px' }}>
                    <span style={{ color: '#6c757d' }}>Terminal system:</span><br/>
                    <strong>{parseFloat(selectedReport.terminal_system || 0).toFixed(2)} zł</strong>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '4px 6px', borderRadius: '3px' }}>
                    <span style={{ color: '#6c757d' }}>Terminal rzeczywisty:</span><br/>
                    <strong>{parseFloat(selectedReport.terminal_rzeczywisty || 0).toFixed(2)} zł</strong>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '4px 6px', borderRadius: '3px' }}>
                    <span style={{ color: '#6c757d' }}>Różnica terminal:</span><br/>
                    <strong style={{ 
                      color: (selectedReport.roznica_terminal || 0) < 0 ? '#dc3545' : (selectedReport.roznica_terminal || 0) > 0 ? '#28a745' : '#495057'
                    }}>
                      {parseFloat(selectedReport.roznica_terminal || 0).toFixed(2)} zł
                    </strong>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '4px 6px', borderRadius: '3px' }}>
                    <span style={{ color: '#6c757d' }}>Kasa fiskalna:</span><br/>
                    <strong>{parseFloat(selectedReport.kasa_fiskalna_raport || 0).toFixed(2)} zł</strong>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '4px 6px', borderRadius: '3px' }}>
                    <span style={{ color: '#6c757d' }}>Sprzedaż gotówka:</span><br/>
                    <strong style={{ color: '#28a745' }}>{parseFloat(selectedReport.sprzedaz_gotowka || 0).toFixed(2)} zł</strong>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '4px 6px', borderRadius: '3px' }}>
                    <span style={{ color: '#6c757d' }}>Sprzedaż karta:</span><br/>
                    <strong style={{ color: '#007bff' }}>{parseFloat(selectedReport.sprzedaz_karta || 0).toFixed(2)} zł</strong>
                  </div>
                </div>
              </div>

              {/* Statystyki transakcji */}
              <div style={{ padding: '0.4rem 0.5rem', backgroundColor: '#e8f5e8', borderRadius: '4px', borderLeft: '3px solid #28a745' }}>
                <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '11px', fontWeight: '600', color: '#1e7e34' }}>
                  📈 Statystyki transakcji
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.3rem', fontSize: '10px' }}>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '4px 6px', borderRadius: '3px' }}>
                    <span style={{ color: '#6c757d' }}>Transakcje:</span><br/>
                    <strong style={{ fontSize: '12px', color: '#28a745' }}>{selectedReport.liczba_transakcji || 0}</strong>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '4px 6px', borderRadius: '3px' }}>
                    <span style={{ color: '#6c757d' }}>Kasjer:</span><br/>
                    <strong>{selectedReport.kasjer_login || 'System'}</strong>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '4px 6px', borderRadius: '3px' }}>
                    <span style={{ color: '#6c757d' }}>Rozpoczęcie:</span><br/>
                    <strong>{selectedReport.czas_rozpoczecia || '—'}</strong>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '4px 6px', borderRadius: '3px' }}>
                    <span style={{ color: '#6c757d' }}>Zamknięcie:</span><br/>
                    <strong>{selectedReport.czas_zamkniecia?.split('.')[0] || '—'}</strong>
                  </div>
                </div>
              </div>

              {/* Safebag */}
              {(selectedReport.safebag_wplaty > 0 || selectedReport.safebag_stan > 0) && (
                <div style={{ padding: '0.4rem 0.5rem', backgroundColor: '#fff8e1', borderRadius: '4px', borderLeft: '3px solid #ff9800' }}>
                  <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '11px', fontWeight: '600', color: '#e65100' }}>
                    💰 Safebag
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.3rem', fontSize: '10px' }}>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '4px 6px', borderRadius: '3px' }}>
                      <span style={{ color: '#6c757d' }}>Wpłaty tego dnia:</span><br/>
                      <strong style={{ color: '#ff9800' }}>{parseFloat(selectedReport.safebag_wplaty || 0).toFixed(2)} zł</strong>
                    </div>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '4px 6px', borderRadius: '3px' }}>
                      <span style={{ color: '#6c757d' }}>Stan safebag:</span><br/>
                      <strong style={{ color: '#e65100' }}>{parseFloat(selectedReport.safebag_stan || 0).toFixed(2)} zł</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Social Media */}
              {(selectedReport.social_media_tiktok || selectedReport.social_media_facebook || 
                selectedReport.social_media_instagram || selectedReport.social_media_google) && (
                <div style={{ padding: '0.4rem 0.5rem', backgroundColor: '#f3e5f5', borderRadius: '4px', borderLeft: '3px solid #6f42c1' }}>
                  <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '11px', fontWeight: '600', color: '#5a3d8a' }}>
                    📱 Aktywność w Social Media
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.3rem', fontSize: '10px' }}>
                    {selectedReport.social_media_tiktok && (
                      <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '4px 6px', borderRadius: '3px' }}>
                        <span style={{ color: '#6c757d' }}>🎵 TikTok:</span><br/>
                        <span>{selectedReport.social_media_tiktok}</span>
                      </div>
                    )}
                    {selectedReport.social_media_facebook && (
                      <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '4px 6px', borderRadius: '3px' }}>
                        <span style={{ color: '#6c757d' }}>📘 Facebook:</span><br/>
                        <span>{selectedReport.social_media_facebook}</span>
                      </div>
                    )}
                    {selectedReport.social_media_instagram && (
                      <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '4px 6px', borderRadius: '3px' }}>
                        <span style={{ color: '#6c757d' }}>📷 Instagram:</span><br/>
                        <span>{selectedReport.social_media_instagram}</span>
                      </div>
                    )}
                    {selectedReport.social_media_google && (
                      <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '4px 6px', borderRadius: '3px' }}>
                        <span style={{ color: '#6c757d' }}>🔍 Google:</span><br/>
                        <span>{selectedReport.social_media_google}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Osiągnięcia */}
              {(selectedReport.osiagniecia_sprzedaz || selectedReport.osiagniecia_praca) && (
                <div style={{ padding: '0.4rem 0.5rem', backgroundColor: '#fff3cd', borderRadius: '4px', borderLeft: '3px solid #ffc107' }}>
                  <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '11px', fontWeight: '600', color: '#856404' }}>
                    🎯 Osiągnięcia dnia
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.3rem', fontSize: '10px' }}>
                    {selectedReport.osiagniecia_sprzedaz && (
                      <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '4px 6px', borderRadius: '3px' }}>
                        <span style={{ color: '#6c757d' }}>💼 Sprzedaż:</span><br/>
                        <span>{selectedReport.osiagniecia_sprzedaz}</span>
                      </div>
                    )}
                    {selectedReport.osiagniecia_praca && (
                      <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '4px 6px', borderRadius: '3px' }}>
                        <span style={{ color: '#6c757d' }}>🔧 Praca:</span><br/>
                        <span>{selectedReport.osiagniecia_praca}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notatki */}
              {selectedReport.uwagi_zamkniecia && (
                <div style={{ padding: '0.4rem 0.5rem', backgroundColor: '#d1ecf1', borderRadius: '4px', borderLeft: '3px solid #17a2b8' }}>
                  <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '11px', fontWeight: '600', color: '#0c5460' }}>
                    📝 Uwagi / Notatki
                  </h4>
                  <div style={{ fontSize: '10px', color: '#0c5460', whiteSpace: 'pre-wrap' }}>
                    {selectedReport.uwagi_zamkniecia}
                  </div>
                </div>
              )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal wyboru klienta - KOMPAKTOWY */}
      {showCustomerModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "6px",
              maxWidth: "500px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "hidden",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            }}
          >
            {/* Header */}
            <div
              style={{
                backgroundColor: "#0d6efd",
                color: "white",
                padding: "0.75rem 1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                👤 Wybierz klienta
              </h3>
              <button
                onClick={() => {
                  setShowCustomerModal(false);
                  setSelectedCustomer(null);
                }}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  fontSize: "14px",
                  cursor: "pointer",
                  color: "white",
                  width: "24px",
                  height: "24px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: "0.75rem", maxHeight: "60vh", overflowY: "auto" }}>
              <CustomerSearch
                onCustomerSelect={(customer) => {
                  setSelectedCustomer(customer);
                  setShowCustomerModal(false);
                }}
                selectedCustomer={selectedCustomer}
              />
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                padding: "0.75rem",
                borderTop: "1px solid #e9ecef",
                backgroundColor: "#f8f9fa",
              }}
            >
              <button
                onClick={() => setShowCustomerModal(false)}
                style={{
                  flex: 1,
                  padding: "0.4rem 0.75rem",
                  fontSize: "11px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                ❌ Anuluj
              </button>
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setShowCustomerModal(false);
                }}
                style={{
                  flex: 1,
                  padding: "0.4rem 0.75rem",
                  fontSize: "11px",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                🗑️ Usuń klienta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal rabatów - KOMPAKTOWY */}
      {showDiscountModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDiscountModal(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "6px",
              width: "90%",
              maxWidth: "500px",
              maxHeight: "80vh",
              overflow: "hidden",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            }}
          >
            {/* Header - fioletowy dla rabatów */}
            <div
              style={{
                backgroundColor: "#6f42c1",
                color: "white",
                padding: "0.75rem 1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h5 style={{ margin: 0, fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                🏷️ Dostępne rabaty
              </h5>
              <button
                onClick={() => setShowDiscountModal(false)}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  fontSize: "14px",
                  cursor: "pointer",
                  color: "white",
                  width: "24px",
                  height: "24px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "0.75rem", maxHeight: "60vh", overflowY: "auto" }}>
              {availableDiscounts.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "1.5rem",
                    color: "#6c757d",
                    fontSize: "11px",
                  }}
                >
                  <span style={{ fontSize: "24px", display: "block", marginBottom: "0.5rem" }}>🏷️</span>
                  <p style={{ margin: 0 }}>Brak dostępnych rabatów</p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {availableDiscounts.map((discount) => (
                    <div
                      key={discount.id}
                      style={{
                        border: "1px solid #e9ecef",
                        borderLeft: "3px solid #6f42c1",
                        borderRadius: "4px",
                        padding: "0.5rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        backgroundColor: "#f8f9fa",
                      }}
                    >
                      <div>
                        <h6
                          style={{ margin: "0 0 0.25rem 0", fontWeight: "600", fontSize: "11px" }}
                        >
                          {discount.nazwa}
                        </h6>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.2rem",
                              color: "#198754",
                              fontWeight: "600",
                              fontSize: "11px",
                              backgroundColor: "#d4edda",
                              padding: "0.15rem 0.4rem",
                              borderRadius: "3px",
                            }}
                          >
                            {discount.typ_rabatu === "procentowy" ? (
                              <>{discount.wartosc}%</>
                            ) : (
                              <>{discount.wartosc} zł</>
                            )}
                          </span>
                          {discount.opis && (
                            <span
                              style={{ fontSize: "10px", color: "#6c757d" }}
                            >
                              {discount.opis}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => applyDiscount(discount.id)}
                        disabled={appliedDiscounts.some(
                          (d) => d.id === discount.id,
                        )}
                        style={{
                          padding: "0.3rem 0.6rem",
                          fontSize: "10px",
                          backgroundColor: appliedDiscounts.some(
                            (d) => d.id === discount.id,
                          )
                            ? "#6c757d"
                            : "#198754",
                          color: "white",
                          border: "none",
                          borderRadius: "3px",
                          cursor: appliedDiscounts.some(
                            (d) => d.id === discount.id,
                          )
                            ? "not-allowed"
                            : "pointer",
                          fontWeight: "600",
                        }}
                      >
                        {appliedDiscounts.some((d) => d.id === discount.id)
                          ? "✓ Dodany"
                          : "+ Dodaj"}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Zastosowane rabaty */}
              {appliedDiscounts.length > 0 && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    paddingTop: "0.75rem",
                    borderTop: "1px solid #e9ecef",
                  }}
                >
                  <h6 style={{ marginBottom: "0.5rem", fontWeight: "600", fontSize: "11px", color: "#6c757d" }}>
                    ✅ Zastosowane rabaty
                  </h6>
                  <div style={{ display: "grid", gap: "0.3rem" }}>
                    {appliedDiscounts.map((discount) => (
                      <div
                        key={discount.id}
                        style={{
                          background: "#d4edda",
                          padding: "0.4rem 0.5rem",
                          borderRadius: "4px",
                          borderLeft: "3px solid #198754",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontWeight: "500", fontSize: "10px" }}>
                          {discount.nazwa}
                        </span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                          }}
                        >
                          <span style={{ color: "#155724", fontWeight: "600", fontSize: "10px" }}>
                            {discount.typ_rabatu === "procentowy"
                              ? `${discount.wartosc}%`
                              : `${discount.wartosc} zł`}
                          </span>
                          <button
                            onClick={() => removeDiscount(discount.czasowe_id)}
                            style={{
                              background: "#dc3545",
                              border: "none",
                              color: "white",
                              cursor: "pointer",
                              fontSize: "10px",
                              padding: "0.15rem 0.3rem",
                              borderRadius: "3px",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal otwierania zmiany */}
      {showOpenShiftModal && (
        <OpenShiftEnhancedModal
          isOpen={showOpenShiftModal}
          onClose={() => setShowOpenShiftModal(false)}
          onSuccess={handleShiftOpened}
          locationId={currentLocationId}
        />
      )}

      {/* Modal zamykania zmiany */}
      {showCloseShiftModal && (
        <CloseShiftEnhancedModal
          isOpen={showCloseShiftModal}
          onClose={() => setShowCloseShiftModal(false)}
          onSuccess={handleShiftClosed}
          currentShift={currentShift}
          locationId={currentLocationId}
        />
      )}

      {/* Modal korekty */}
      {showCorrectionModal && (
        <CorrectionModal
          isOpen={showCorrectionModal}
          onClose={() => setShowCorrectionModal(false)}
          transaction={correctionTransaction}
        />
      )}

      {/* Modal płatności kuponem */}
      {showCouponPaymentModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "2rem",
              borderRadius: "12px",
              width: "90%",
              maxWidth: "500px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <h4 style={{ margin: 0, color: "#6f42c1" }}>
                <i className="fas fa-ticket-alt" style={{ marginRight: "0.5rem" }}></i>
                Płatność kuponem
              </h4>
              <div style={{ fontSize: "1.2rem", fontWeight: "600", color: "#495057", marginTop: "0.5rem" }}>
                Do zapłaty: {getFinalTotal().toFixed(2)} zł
              </div>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Kod kuponu:
              </label>
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Wprowadź kod kuponu"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "2px solid #e9ecef",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  textAlign: "center",
                  letterSpacing: "2px",
                  fontWeight: "600",
                }}
                autoFocus
                disabled={couponValidating}
              />
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={resetCouponPaymentModal}
                disabled={couponValidating}
                style={{
                  flex: 1,
                  padding: "0.75rem 1.5rem",
                  border: "2px solid #6c757d",
                  borderRadius: "6px",
                  backgroundColor: "white",
                  color: "#6c757d",
                  cursor: couponValidating ? "not-allowed" : "pointer",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                }}
              >
                Anuluj
              </button>
              <button
                onClick={handleCouponPayment}
                disabled={!couponCode || couponCode.length < 4 || couponValidating}
                style={{
                  flex: 2,
                  padding: "0.75rem 1.5rem",
                  border: "none",
                  borderRadius: "6px",
                  backgroundColor: couponCode && couponCode.length >= 4 && !couponValidating ? "#6f42c1" : "#6c757d",
                  color: "white",
                  cursor: couponCode && couponCode.length >= 4 && !couponValidating ? "pointer" : "not-allowed",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                }}
              >
                <i className="fas fa-check" style={{ marginRight: "0.5rem" }}></i>
                {couponValidating ? "Sprawdzam..." : "Sprawdź i zapłać"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal płatności gotówkowej */}
      {showCashPaymentModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1050,
          }}
          onClick={resetCashPaymentModal}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "2rem",
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              width: "90%",
              maxWidth: "400px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
              <i className="fas fa-money-bill-wave" style={{ color: "#198754", fontSize: "1.25rem" }}></i>
              <h3 style={{ margin: 0, color: "#198754", fontWeight: "600" }}>
                Płatność gotówkowa
              </h3>
            </div>

            {/* Kwota do zapłaty */}
            <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
              <div style={{ fontSize: "0.875rem", color: "#6c757d", marginBottom: "0.25rem" }}>
                Kwota do zapłaty:
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: "700", color: "#198754" }}>
                {getFinalTotal().toFixed(2)} zł
              </div>
            </div>

            {/* Pole kwoty otrzymanej */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>
                Kwota otrzymana:
              </label>
              <input
                type="number"
                step="0.01"
                min={getFinalTotal()}
                value={cashReceived}
                onChange={(e) => {
                  setCashReceived(e.target.value);
                  const received = parseFloat(e.target.value) || 0;
                  const change = received - getFinalTotal();
                  setCashChange(Math.max(0, change));
                }}
                placeholder={getFinalTotal().toFixed(2)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ced4da",
                  borderRadius: "6px",
                  fontSize: "1rem",
                }}
                autoFocus
              />
            </div>

            {/* Wyświetlenie reszty */}
            {cashReceived && parseFloat(cashReceived) >= getFinalTotal() && (
              <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#e7f3ff", borderRadius: "6px" }}>
                <div style={{ fontSize: "0.875rem", color: "#0d6efd", marginBottom: "0.25rem" }}>
                  Reszta do wydania:
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0d6efd" }}>
                  {cashChange.toFixed(2)} zł
                </div>
              </div>
            )}

            {/* Przyciski szybkiej kwoty */}
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.75rem", color: "#6c757d", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                Szybkie kwoty:
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {[
                  Math.ceil(getFinalTotal()),
                  Math.ceil(getFinalTotal() / 10) * 10,
                  Math.ceil(getFinalTotal() / 20) * 20,
                  Math.ceil(getFinalTotal() / 50) * 50,
                ].filter((amount, index, arr) => arr.indexOf(amount) === index && amount >= getFinalTotal())
                .slice(0, 4)
                .map((amount) => (
                  <button
                    key={amount}
                    onClick={() => {
                      setCashReceived(amount.toString());
                      setCashChange(amount - getFinalTotal());
                    }}
                    style={{
                      padding: "0.5rem 0.75rem",
                      border: "1px solid #ced4da",
                      borderRadius: "4px",
                      backgroundColor: "white",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                    }}
                  >
                    {amount} zł
                  </button>
                ))}
              </div>
            </div>

            {/* Przyciski akcji */}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                onClick={resetCashPaymentModal}
                style={{
                  padding: "0.75rem 1.5rem",
                  border: "1px solid #ced4da",
                  borderRadius: "6px",
                  backgroundColor: "white",
                  color: "#6c757d",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                Anuluj
              </button>
              <button
                onClick={handleCashPayment}
                disabled={!cashReceived || parseFloat(cashReceived) < getFinalTotal()}
                style={{
                  padding: "0.75rem 1.5rem",
                  border: "none",
                  borderRadius: "6px",
                  backgroundColor: parseFloat(cashReceived) >= getFinalTotal() ? "#198754" : "#6c757d",
                  color: "white",
                  cursor: parseFloat(cashReceived) >= getFinalTotal() ? "pointer" : "not-allowed",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                }}
              >
                <i className="fas fa-check" style={{ marginRight: "0.5rem" }}></i>
                Zapłać
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal płatności dzielonej - KOMPAKTOWY */}
      {showSplitPaymentModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSplitPaymentModal(false);
              resetSplitPayments();
            }
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "6px",
              minWidth: "400px",
              maxWidth: "90vw",
              maxHeight: "90vh",
              overflow: "hidden",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nagłówek - pomarańczowy */}
            <div style={{ 
              backgroundColor: "#fd7e14", 
              color: "white", 
              padding: "0.75rem 1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem"
            }}>
              <span style={{ fontSize: "14px" }}>💰</span>
              <h3 style={{ margin: 0, fontSize: "13px", fontWeight: "600" }}>
                Płatność dzielona
              </h3>
            </div>

            <div style={{ padding: "0.75rem", maxHeight: "70vh", overflowY: "auto" }}>
              {/* Kwota do zapłaty */}
              <div style={{ marginBottom: "0.75rem", padding: "0.5rem", backgroundColor: "#f8f9fa", borderRadius: "4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "10px", color: "#6c757d" }}>Do zapłaty:</div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#fd7e14" }}>
                    {getFinalTotal().toFixed(2)} zł
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "10px", color: "#6c757d" }}>Suma:</div>
                  <div style={{ 
                    fontSize: "12px", 
                    fontWeight: "600", 
                    color: Math.abs(getTotalSplitAmount() - getFinalTotal()) < 0.01 ? "#198754" : "#dc3545" 
                  }}>
                    {getTotalSplitAmount().toFixed(2)} zł
                  </div>
                </div>
              </div>

              {/* Metody płatności */}
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {splitPayments.map((payment) => (
                  <div key={payment.method} style={{ 
                    padding: "0.5rem", 
                    border: "1px solid #e9ecef", 
                    borderRadius: "4px",
                    borderLeft: `3px solid ${payment.color}`,
                    backgroundColor: "#fafbfc"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: "0.4rem" }}>
                      <span style={{ marginRight: "0.3rem" }}>
                        {payment.method === 'gotowka' ? '💵' : payment.method === 'karta' ? '💳' : payment.method === 'blik' ? '📱' : '🎟️'}
                      </span>
                      <span style={{ fontWeight: "600", fontSize: "11px" }}>{payment.label}</span>
                    </div>
                    
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                      <input
                        type="number"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        value={payment.amount || ''}
                        onChange={(e) => updateSplitPaymentAmount(payment.method, e.target.value)}
                        style={{
                          flex: 1,
                          padding: "0.3rem 0.5rem",
                          border: "1px solid #ced4da",
                          borderRadius: "4px",
                          fontSize: "11px"
                        }}
                      />
                      
                      {payment.method === 'kupon' && (
                        <input
                          type="text"
                          placeholder="Kod kuponu"
                          value={payment.couponCode || ''}
                          onChange={(e) => updateSplitPaymentCouponCode(e.target.value)}
                          style={{
                            flex: 1,
                            padding: "0.3rem 0.5rem",
                            border: "1px solid #ced4da",
                            borderRadius: "4px",
                            fontSize: "11px"
                          }}
                        />
                      )}
                      
                      <button
                        onClick={() => updateSplitPaymentAmount(payment.method, getFinalTotal() - getTotalSplitAmount() + (payment.amount || 0))}
                        style={{
                          padding: "0.3rem 0.5rem",
                          border: "1px solid #ced4da",
                          borderRadius: "4px",
                          backgroundColor: "white",
                          fontSize: "10px",
                          cursor: "pointer"
                        }}
                        title="Wypełnij resztę"
                      >
                        🔄
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Błąd */}
              {splitPaymentError && (
                <div style={{ 
                  marginTop: "0.5rem", 
                  padding: "0.4rem", 
                  backgroundColor: "#f8d7da", 
                  color: "#721c24", 
                  borderRadius: "4px",
                  fontSize: "10px"
                }}>
                  ⚠️ {splitPaymentError}
                </div>
              )}
            </div>

            {/* Przyciski - footer */}
            <div style={{ 
              display: "flex", 
              gap: "0.5rem", 
              padding: "0.75rem", 
              borderTop: "1px solid #e9ecef",
              backgroundColor: "#f8f9fa" 
            }}>
              <button
                onClick={() => {
                  setShowSplitPaymentModal(false);
                  resetSplitPayments();
                }}
                style={{
                  flex: 1,
                  padding: "0.4rem 0.75rem",
                  border: "1px solid #ced4da",
                  borderRadius: "4px",
                  backgroundColor: "white",
                  color: "#495057",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: "600",
                }}
              >
                ❌ Anuluj
              </button>
              <button
                onClick={processSplitPayment}
                disabled={Math.abs(getTotalSplitAmount() - getFinalTotal()) > 0.01}
                style={{
                  flex: 2,
                  padding: "0.4rem 0.75rem",
                  border: "none",
                  borderRadius: "4px",
                  backgroundColor: Math.abs(getTotalSplitAmount() - getFinalTotal()) < 0.01 ? "#fd7e14" : "#6c757d",
                  color: "white",
                  cursor: Math.abs(getTotalSplitAmount() - getFinalTotal()) < 0.01 ? "pointer" : "not-allowed",
                  fontSize: "11px",
                  fontWeight: "600",
                }}
              >
                ✓ Zapłać
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal dodawania klienta */}
      {showAddCustomerModal && (
        <AddCustomerModal
          isOpen={showAddCustomerModal}
          onClose={() => setShowAddCustomerModal(false)}
          onSuccess={handleNewCustomerAdded}
          initialData={{ 
            imie: customerSearchQuery || '',
            telefon: ''
          }}
        />
      )}
    </div>
  );
};

export default PosPage;
