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
import { transactionService } from "../services/transactionService";
import { productService } from "../services/productService";
import { customerService } from "../services/customerService";
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
  const [currentUser] = useState("kasjer1"); // W rzeczywistej aplikacji z kontekstu
  const [cartDiscountTotal, setCartDiscountTotal] = useState(0);

  // Stany dla filtrów produktów w koszyku
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [categories, setCategories] = useState([]);

  // Stany dla rozszerzonych modali zmian
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);

  // Stany dla korekty transakcji
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionTransaction, setCorrectionTransaction] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

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

      // Załaduj dostępne rabaty
      await loadAvailableDiscounts();

      // Załaduj kategorie produktów
      await loadCategories();
    } catch (err) {
      console.error("Błąd ładowania danych:", err);
    }
  };

  const loadDailyStats = async () => {
    try {
      const response = await transactionService.getDailyStats();
      console.log('📊 Odebrane statystyki POS:', response);
      if (response.success) {
        setStats({
          receiptsToday: response.data.today_transactions || 0,
          dailyRevenue: response.data.today_revenue || 0,
          averageReceipt: response.data.average_transaction || 0,
        });
      }
    } catch (err) {
      console.error("Błąd ładowania statystyk:", err);
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

  const loadAvailableDiscounts = async () => {
    try {
      console.log("🎯 Ładowanie rabatów dla użytkownika:", currentUser);
      const response = await fetch(
        `http://localhost:5002/api/rabaty?user_id=${currentUser}`,
      );
      console.log("🎯 Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("🎯 Otrzymane dane rabatów:", data);
        console.log("🎯 Liczba rabatów:", data?.message?.rabaty?.length || 0);
        setAvailableDiscounts(data.message?.rabaty || []);
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
          "http://localhost:5002/api/pos/cart/new",
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
            `http://localhost:5002/api/pos/cart/${transactionId}/items`,
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
        `http://localhost:5002/api/pos/cart/${transactionId}/discount`,
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
          `http://localhost:5002/api/pos/cart/${currentTransaction.id}/discount/${discountToRemove.uzycie_id}`,
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
      setCart([
        ...cart,
        {
          ...product,
          quantity: 1,
          price: product.price || product.cena || 0,
          name: product.name || product.nazwa,
        },
      ]);
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

  const updatePrice = (productId, newPrice, isNetto = false) => {
    setCart(
      cart.map((item) => {
        if (item.id === productId) {
          const vat = item.vat || 23;
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
      }),
    );
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setCurrentTransaction(null);
    setError("");
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

  const processPayment = async () => {
    if (cart.length === 0) {
      setError("Koszyk jest pusty");
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
        payment_method: paymentMethod,
        total_amount: getFinalTotal(), // Używaj kwoty po rabacie
        total_gross: getTotalAmount(), // Kwota brutto przed rabatem
        discount_amount: cartDiscountTotal,
        applied_discounts: appliedDiscounts,
        cashier: currentShift?.kasjer_login || "admin",
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
          alert("Transakcja została pomyślnie zrealizowana!");
        } else {
          // Transakcja wymaga finalizacji
          const paymentData = {
            payment_method: paymentMethod,
            amount_paid: getFinalTotal(), // Używaj kwoty po rabacie
            amount_change: 0,
            customer_id: selectedCustomer?.id || null, // Dodaj customer_id
          };

          const completeResponse = await transactionService.completeTransaction(
            transactionId,
            paymentData,
          );

          if (completeResponse.success) {
            setCurrentTransaction({ id: transactionId });
            clearCart();
            await loadDailyStats(); // Odśwież statystyki
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
        padding: "20px",
        backgroundColor: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      {/* Header jak w V2 */}
      <div
        style={{
          backgroundColor: "#4472C4",
          color: "white",
          padding: "15px 20px",
          marginBottom: "20px",
          borderRadius: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "24px" }}>System POS</h2>
          <div style={{ fontSize: "14px", opacity: 0.9 }}>
            Zmiana: | Kasjer: {currentShift?.kasjer_login || "admin"} |{" "}
            {new Date().toLocaleDateString()}
          </div>
        </div>
        {/* Przyciski akcji jak w V2 */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            className={`btn ${activeTab === "pos" ? "btn-success" : "btn-outline-light"}`}
            style={{ fontSize: "14px" }}
            onClick={() => setActiveTab("pos")}
          >
            🛒 Kasa
          </button>
          <button
            className={`btn ${activeTab === "paragony" ? "btn-success" : "btn-outline-light"}`}
            style={{ fontSize: "14px" }}
            onClick={() => setActiveTab("paragony")}
          >
            📄 Paragony
          </button>
          <button className="btn btn-outline-light" onClick={saveDraft}>
            Zapisz szkic
          </button>
          <button
            className="btn btn-outline-light"
            onClick={() => window.open("/reports", "_blank")}
          >
            Raporty
          </button>
          <button
            className="btn btn-outline-light"
            onClick={() => window.open("/warehouse", "_blank")}
          >
            Magazyn
          </button>
          <button
            className="btn btn-outline-light"
            onClick={() => window.open("/customers", "_blank")}
          >
            Kartoteka
          </button>
          {currentShift ? (
            <button
              className="btn btn-warning"
              onClick={closeShift}
              disabled={loading}
            >
              {loading ? "Zamykanie..." : "Zamknij zmianę"}
            </button>
          ) : (
            <button
              className="btn btn-success"
              onClick={openShift}
              disabled={loading}
            >
              {loading ? "Otwieranie..." : "Otwórz zmianę"}
            </button>
          )}
        </div>
      </div>

      {/* Ostrzeżenie gdy nie wybrano lokalizacji */}
      {!currentLocationId && (
        <div style={{
          backgroundColor: '#ffc107',
          color: '#212529',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '2px solid #f0ad4e',
          textAlign: 'center',
          fontSize: '16px',
          fontWeight: '600'
        }}>
          ⚠️ Wybierz lokalizację w prawym górnym rogu przed utworzeniem paragonu!
        </div>
      )}

      {/* Statystyki jak w V2 */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            border: "2px solid #4472C4",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
            minWidth: "150px",
          }}
        >
          <div
            style={{ fontSize: "32px", fontWeight: "bold", color: "#4472C4" }}
          >
            {stats.receiptsToday}
          </div>
          <div style={{ fontSize: "14px", color: "#666" }}>
            Paragony dzisiaj
          </div>
        </div>

        <div
          style={{
            backgroundColor: "white",
            border: "2px solid #70AD47",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
            minWidth: "150px",
          }}
        >
          <div
            style={{ fontSize: "32px", fontWeight: "bold", color: "#70AD47" }}
          >
            {stats.dailyRevenue.toFixed(0)}
          </div>
          <div style={{ fontSize: "14px", color: "#666" }}>
            Obrót dzienny (zł)
          </div>
        </div>
        {/* ...pozostała zawartość głównej strony... */}

        <div
          style={{
            backgroundColor: "white",
            border: "2px solid #00B0F0",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
            minWidth: "150px",
          }}
        >
          <div
            style={{ fontSize: "32px", fontWeight: "bold", color: "#00B0F0" }}
          >
            {stats.averageReceipt.toFixed(0)}
          </div>
          <div style={{ fontSize: "14px", color: "#666" }}>
            Średnia paragonu (zł)
          </div>
        </div>

        {/* Status transakcji */}
        <div
          style={{
            backgroundColor: "white",
            border: "2px solid #FFC000",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
            minWidth: "200px",
          }}
        >
          <div
            style={{ fontSize: "18px", fontWeight: "bold", color: "#FFC000" }}
          >
            Ostatnia transakcja
          </div>
          <div style={{ fontSize: "14px", color: "#666" }}>
            {currentTransaction
              ? `Zakończona: ${currentTransaction.id}`
              : "Brak transakcji"}
          </div>
        </div>

        {/* Szybkie akcje */}
        <div
          style={{
            backgroundColor: "white",
            border: "2px solid #7030A0",
            borderRadius: "8px",
            padding: "15px",
            minWidth: "200px",
          }}
        >
          <div
            style={{
              fontSize: "16px",
              fontWeight: "bold",
              color: "#7030A0",
              marginBottom: "10px",
            }}
          >
            Szybkie akcje
          </div>
          <button
            className="btn btn-sm btn-primary"
            style={{ width: "100%", marginBottom: "5px" }}
            onClick={() => window.open("/reports/daily", "_blank")}
          >
            📊 Raporty dnia
          </button>
          {currentShift ? (
            <button
              className="btn btn-sm btn-warning"
              style={{ width: "100%" }}
              onClick={closeShift}
              disabled={loading}
            >
              {loading ? "Zamykanie..." : "👤 Zamknij zmianę"}
            </button>
          ) : (
            <button
              className="btn btn-sm btn-success"
              style={{ width: "100%" }}
              onClick={openShift}
              disabled={loading}
            >
              {loading ? "Otwieranie..." : "🔓 Otwórz zmianę"}
            </button>
          )}
        </div>
      </div>

      {/* Główna sekcja POS - jednolity layout */}
      {activeTab === "pos" && (
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Jedna główna kolumna */}
          {/* Sekcja klienta z wbudowaną wyszukiwarką - nad koszykiem */}
          <div
            style={{
              backgroundColor: "white",
              border: "1px solid #e9ecef",
              borderRadius: "0.5rem",
              padding: "1.25rem 1.5rem",
              marginBottom: "1rem",
              boxShadow: "0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)",
              background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: selectedCustomer ? "1rem" : "0",
              }}
            >
              <div
                style={{
                  width: "2.5rem",
                  height: "2.5rem",
                  backgroundColor: "#e7f1ff",
                  borderRadius: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid #0d6efd",
                }}
              >
                <i
                  className="fas fa-user"
                  style={{
                    color: "#0d6efd",
                    fontSize: "1rem",
                  }}
                ></i>
              </div>
              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    color: "#212529",
                    marginBottom: "0.5rem",
                  }}
                >
                  Klient
                </h3>
              </div>

              {/* Mały przycisk "Utwórz klienta" po prawej stronie w nagłówku */}
              {!selectedCustomer && (
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(true)}
                  style={{
                    padding: "6px 12px",
                    background: "#f8f9fa",
                    color: "#059669",
                    border: "1px solid #d0d7de",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "500",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    transition: "all 0.2s",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "#059669";
                    e.target.style.color = "white";
                    e.target.style.borderColor = "#059669";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "#f8f9fa";
                    e.target.style.color = "#059669";
                    e.target.style.borderColor = "#d0d7de";
                  }}
                  title="Dodaj nowego klienta"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  + Nowy klient
                </button>
              )}
            </div>

            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Wyszukaj klienta (nazwa, telefon, email)..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  outline: "none",
                  transition: "border-color 0.15s ease-in-out",
                  backgroundColor: selectedCustomer ? "#f8f9fa" : "white",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#0d6efd";
                  if (customerSearchQuery.length >= 2)
                    setShowCustomerSuggestions(true);
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#ddd";
                  // Delay hiding suggestions to allow clicking
                  setTimeout(() => setShowCustomerSuggestions(false), 150);
                }}
              />

              {/* Przycisk "Wybierz z listy" */}
              {!selectedCustomer && customerSearchQuery.length < 2 && (
                <button
                  type="button"
                  onClick={loadAllCustomers}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "#e7f1ff",
                    border: "1px solid #0d6efd",
                    borderRadius: "4px",
                    color: "#0d6efd",
                    cursor: "pointer",
                    fontSize: "12px",
                    padding: "4px 8px",
                    fontWeight: "500",
                  }}
                  title="Pokaż wszystkich klientów"
                >
                  📋 Lista
                </button>
              )}

              {selectedCustomer && (
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerSearchQuery("");
                    setShowCustomerSuggestions(false);
                  }}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#6c757d",
                    cursor: "pointer",
                    fontSize: "16px",
                    padding: "4px",
                  }}
                  title="Usuń klienta"
                >
                  ✕
                </button>
              )}

              {/* Podpowiedzi wyszukiwania */}
              {showCustomerSuggestions &&
                customerSuggestions.length > 0 &&
                !selectedCustomer && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: "0",
                      right: "0",
                      background: "white",
                      border: "1px solid #ddd",
                      borderTop: "none",
                      borderRadius: "0 0 0.375rem 0.375rem",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      zIndex: 1000,
                      maxHeight: "200px",
                      overflowY: "auto",
                    }}
                  >
                    {customerSuggestions.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => selectCustomer(customer)}
                        style={{
                          padding: "0.75rem",
                          borderBottom: "1px solid #f1f1f1",
                          cursor: "pointer",
                          transition: "background-color 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.target.style.backgroundColor = "#f8f9fa")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.backgroundColor = "white")
                        }
                      >
                        <div style={{ fontWeight: "500", marginBottom: "2px" }}>
                          {(customer.name && customer.name.trim()) ||
                            `${(customer.imie || "").trim()} ${(customer.nazwisko || "").trim()}`.trim() ||
                            customer.email ||
                            customer.phone ||
                            `Klient #${customer.id}`}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#6c757d" }}>
                          {customer.phone && `📞 ${customer.phone}`}
                          {customer.phone && customer.email && " • "}
                          {customer.email && `📧 ${customer.email}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              {/* Brak wyników */}
              {showCustomerSuggestions &&
                customerSuggestions.length === 0 &&
                customerSearchQuery.length >= 2 &&
                !customerSearchLoading &&
                !selectedCustomer && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: "0",
                      right: "0",
                      background: "white",
                      border: "1px solid #ddd",
                      borderTop: "none",
                      borderRadius: "0 0 0.375rem 0.375rem",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      zIndex: 1000,
                      padding: "0.75rem",
                      textAlign: "center",
                      color: "#6c757d",
                      fontSize: "0.875rem",
                    }}
                  >
                    🔍 Nie znaleziono klientów dla "{customerSearchQuery}"
                    <button
                      onClick={() => {
                        setShowAddCustomerModal(true);
                        setShowCustomerSuggestions(false);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        marginTop: "8px",
                        padding: "8px 12px",
                        background: "#059669",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      ➕ Utwórz "{customerSearchQuery}"
                    </button>
                  </div>
                )}

              {/* Loading */}
              {customerSearchLoading && !selectedCustomer && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: "0",
                    right: "0",
                    background: "white",
                    border: "1px solid #ddd",
                    borderTop: "none",
                    borderRadius: "0 0 0.375rem 0.375rem",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    zIndex: 1000,
                    padding: "0.75rem",
                    textAlign: "center",
                    color: "#6c757d",
                    fontSize: "0.875rem",
                  }}
                >
                  🔍 Wyszukiwanie...
                </div>
              )}
            </div>

            {/* Wybrany klient - szczegóły */}
            {selectedCustomer && (
              <div
                style={{
                  padding: "0.75rem",
                  backgroundColor: "#e8f5e8",
                  borderRadius: "0.375rem",
                  border: "1px solid #c3e6cb",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      color: "#155724",
                    }}
                  >
                    ✅{" "}
                    {(selectedCustomer.name && selectedCustomer.name.trim()) ||
                      `${(selectedCustomer.imie || "").trim()} ${(selectedCustomer.nazwisko || "").trim()}`.trim() ||
                      selectedCustomer.email ||
                      selectedCustomer.phone ||
                      `Klient #${selectedCustomer.id}`}
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#155724" }}>
                  {selectedCustomer.phone && `📞 ${selectedCustomer.phone}`}
                  {selectedCustomer.phone && selectedCustomer.email && " • "}
                  {selectedCustomer.email && `📧 ${selectedCustomer.email}`}
                  {selectedCustomer.address && (
                    <div style={{ marginTop: "0.25rem" }}>
                      📍 {selectedCustomer.address}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Koszyk z wbudowaną wyszukiwarką */}
          <div
            style={{
              backgroundColor: "white",
              border: "1px solid #e9ecef",
              borderRadius: "0.5rem",
              marginBottom: "1rem",
              boxShadow: "0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)",
            }}
          >
            <div
              style={{
                padding: "1rem 1.5rem",
                borderBottom: "1px solid #e9ecef",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    backgroundColor: "#d1e7dd",
                    borderRadius: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid #198754",
                  }}
                >
                  <i
                    className="fas fa-shopping-cart"
                    style={{
                      color: "#198754",
                      fontSize: "1rem",
                    }}
                  ></i>
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "1.1rem",
                      fontWeight: "600",
                      color: "#212529",
                    }}
                  >
                    Koszyk
                  </h3>
                  <p
                    style={{
                      margin: "0.25rem 0 0 0",
                      fontSize: "0.8rem",
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
                    gap: "0.75rem",
                    alignItems: "center",
                    marginLeft: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  {/* Kategoria */}
                  <div style={{ minWidth: "140px" }}>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.75rem",
                        border: "1px solid #ced4da",
                        borderRadius: "0.25rem",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="">🏷️ Wszystkie kategorie</option>
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
                      padding: "0.25rem 0.5rem",
                      fontSize: "0.75rem",
                      border: "1px solid #e9ecef",
                      borderRadius: "0.25rem",
                      backgroundColor: "#f8f9fa",
                      minWidth: "120px",
                    }}
                  >
                    <input
                      type="checkbox"
                      id="onlyAvailableCart"
                      checked={onlyAvailable}
                      onChange={(e) => setOnlyAvailable(e.target.checked)}
                      style={{ marginRight: "0.4rem" }}
                    />
                    <label
                      htmlFor="onlyAvailableCart"
                      style={{
                        margin: 0,
                        fontSize: "0.75rem",
                        color: "#495057",
                      }}
                    >
                      <i
                        className="fas fa-eye me-1"
                        style={{ color: "#28a745" }}
                      ></i>
                      Dostępne
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    style={{
                      padding: "0.5rem 0.875rem",
                      fontSize: "0.8rem",
                      border: "1px solid #dc3545",
                      borderRadius: "0.375rem",
                      backgroundColor: "white",
                      color: "#dc3545",
                      cursor: "pointer",
                      fontWeight: "500",
                      transition: "all 0.15s ease-in-out",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#dc3545";
                      e.target.style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "white";
                      e.target.style.color = "#dc3545";
                    }}
                  >
                    <i className="fas fa-trash me-1"></i>
                    Wyczyść
                  </button>
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
                      const nettoPrice =
                        item.price / (1 + (item.vat || 23) / 100);
                      const bruttoPrice = item.price;
                      const total = item.price * item.quantity;
                      const margaAbsolute = item.cena_zakupu
                        ? bruttoPrice - item.cena_zakupu
                        : 0;
                      const margaPercent = item.cena_zakupu
                        ? ((bruttoPrice - item.cena_zakupu) /
                            item.cena_zakupu) *
                          100
                        : 0;
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
                            {item.cena_zakupu ? (
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
          {/* Sekcja płatności - na dole */}
          <div
            style={{
              backgroundColor: "white",
              border: "1px solid #e9ecef",
              borderRadius: "8px",
              padding: "1rem",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1rem",
                paddingBottom: "0.75rem",
                borderBottom: "1px solid #e9ecef",
              }}
            >
              <div
                style={{
                  width: "1.75rem",
                  height: "1.75rem",
                  backgroundColor: "#e3f2fd",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #1976d2",
                }}
              >
                <i
                  className="fas fa-cash-register"
                  style={{
                    color: "#1976d2",
                    fontSize: "0.75rem",
                  }}
                ></i>
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  color: "#212529",
                }}
              >
                Płatność
              </h3>
              <div
                style={{
                  marginLeft: "auto",
                  fontSize: "0.9rem",
                  fontWeight: "700",
                  color: "#198754",
                  padding: "0.25rem 0.5rem",
                  backgroundColor: "#d1e7dd",
                  borderRadius: "4px",
                  border: "1px solid #198754",
                }}
              >
                {getFinalTotal().toFixed(2)} zł
              </div>
            </div>

            {/* Metody płatności - style magazynu */}
            <div style={{ marginBottom: "1rem" }}>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#6c757d",
                  marginBottom: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <i
                  className="fas fa-credit-card"
                  style={{ color: "#6c757d" }}
                ></i>
                Metoda płatności
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                {[
                  {
                    value: "gotowka",
                    label: "Gotówka",
                    icon: "fas fa-money-bill-wave",
                    color: "#198754",
                  },
                  {
                    value: "karta",
                    label: "Karta",
                    icon: "fas fa-credit-card",
                    color: "#0d6efd",
                  },
                  {
                    value: "blik",
                    label: "BLIK",
                    icon: "fas fa-mobile-alt",
                    color: "#ff6b35",
                  },
                  {
                    value: "kupon",
                    label: "Kupon",
                    icon: "fas fa-ticket-alt",
                    color: "#6f42c1",
                  },
                ].map((method) => (
                  <button
                    key={method.value}
                    onClick={() => setPaymentMethod(method.value)}
                    style={{
                      padding: "0.75rem",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      border: "1px solid #e9ecef",
                      borderLeft: `4px solid ${method.color}`,
                      borderRadius: "0.375rem",
                      backgroundColor:
                        paymentMethod === method.value ? method.color : "white",
                      color:
                        paymentMethod === method.value ? "white" : "#495057",
                      cursor: "pointer",
                      transition: "all 0.15s ease-in-out",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      boxShadow: "0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)",
                      minHeight: "50px",
                    }}
                    onMouseEnter={(e) => {
                      if (paymentMethod !== method.value) {
                        e.target.style.backgroundColor = "#f8f9fa";
                        e.target.style.transform = "translateY(-1px)";
                        e.target.style.boxShadow = `0 0.25rem 0.5rem rgba(${
                          method.color === "#198754"
                            ? "25, 135, 84"
                            : method.color === "#0d6efd"
                              ? "13, 110, 253"
                              : method.color === "#ff6b35"
                                ? "255, 107, 53"
                                : "111, 66, 193"
                        }, 0.25)`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (paymentMethod !== method.value) {
                        e.target.style.backgroundColor = "white";
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow =
                          "0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)";
                      }
                    }}
                  >
                    <div
                      style={{
                        width: "1.5rem",
                        height: "1.5rem",
                        backgroundColor:
                          paymentMethod === method.value
                            ? "rgba(255,255,255,0.2)"
                            : method.color === "#198754"
                              ? "#d1e7dd"
                              : method.color === "#0d6efd"
                                ? "#e7f1ff"
                                : method.color === "#ff6b35"
                                  ? "#ffe6d9"
                                  : "#e2d9f3",
                        borderRadius: "0.25rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <i
                        className={method.icon}
                        style={{
                          color:
                            paymentMethod === method.value
                              ? "white"
                              : method.color,
                          fontSize: "0.75rem",
                        }}
                      ></i>
                    </div>
                    <span>{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Przycisk Rabaty */}
            <div style={{ marginBottom: "1rem" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "red",
                  marginBottom: "5px",
                  fontWeight: "bold",
                }}
              >
                DEBUG: showDiscountModal = {showDiscountModal.toString()}
              </div>
              <button
                onClick={() => {
                  console.log("Przycisk rabaty kliknięty!");
                  console.log(
                    "Aktualny stan showDiscountModal:",
                    showDiscountModal,
                  );
                  alert(
                    "Przycisk rabaty kliknięty! Stan modal: " +
                      showDiscountModal,
                  );
                  setShowDiscountModal(true);
                  console.log("setShowDiscountModal(true) wykonane");
                }}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  fontSize: "0.875rem",
                  border: "3px solid red", // Zmieniam na czerwony żeby łatwiej było zobaczyć
                  borderRadius: "0.375rem",
                  backgroundColor: "yellow", // Żółte tło
                  color: "black",
                  cursor: "pointer",
                  fontWeight: "600",
                  transition: "all 0.15s ease-in-out",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  zIndex: 100, // Dodaję z-index
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#0d6efd";
                  e.target.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "white";
                  e.target.style.color = "#0d6efd";
                }}
              >
                <FaPercent />
                Rabaty
              </button>
            </div>

            {/* Przyciski płatności - kompaktowe */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={processPayment}
                disabled={cart.length === 0 || loading || !currentShift}
                style={{
                  flex: 2,
                  padding: "0.75rem",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  border: "none",
                  borderRadius: "6px",
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
                  gap: "0.375rem",
                  transition: "all 0.15s ease-in-out",
                }}
                onMouseEnter={(e) => {
                  if (cart.length > 0 && !loading) {
                    e.target.style.backgroundColor = "#157347";
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow =
                      "0 4px 8px rgba(25, 135, 84, 0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (cart.length > 0 && !loading) {
                    e.target.style.backgroundColor = "#198754";
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "none";
                  }
                }}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Przetwarzanie...
                  </>
                ) : (
                  <>
                    <i className="fas fa-credit-card"></i>
                    Zapłać
                  </>
                )}
              </button>

              <button
                onClick={saveDraft}
                disabled={cart.length === 0 || loading || !currentShift}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  fontSize: "0.75rem",
                  border: "1px solid #6c757d",
                  borderRadius: "6px",
                  backgroundColor:
                    cart.length === 0 || !currentShift ? "#e9ecef" : "#f8f9fa",
                  color:
                    cart.length === 0 || !currentShift ? "#adb5bd" : "#6c757d",
                  cursor:
                    cart.length === 0 || !currentShift
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: "500",
                  transition: "all 0.15s ease-in-out",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.25rem",
                }}
                onMouseEnter={(e) => {
                  if (cart.length > 0 && !loading && currentShift) {
                    e.target.style.backgroundColor = "#6c757d";
                    e.target.style.color = "white";
                  }
                }}
                onMouseLeave={(e) => {
                  if (cart.length > 0 && !loading && currentShift) {
                    e.target.style.backgroundColor = "#f8f9fa";
                    e.target.style.color = "#6c757d";
                  }
                }}
              >
                <i className="fas fa-save" style={{ fontSize: "0.7rem" }}></i>
                Szkic
              </button>

              <button
                onClick={clearCart}
                disabled={cart.length === 0}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  fontSize: "0.75rem",
                  border: "1px solid #dc3545",
                  borderRadius: "6px",
                  backgroundColor: "#f8f9fa",
                  color: "#dc3545",
                  cursor: cart.length === 0 ? "not-allowed" : "pointer",
                  fontWeight: "500",
                  transition: "all 0.15s ease-in-out",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.25rem",
                }}
                onMouseEnter={(e) => {
                  if (cart.length > 0) {
                    e.target.style.backgroundColor = "#dc3545";
                    e.target.style.color = "white";
                  }
                }}
                onMouseLeave={(e) => {
                  if (cart.length > 0) {
                    e.target.style.backgroundColor = "#f8f9fa";
                    e.target.style.color = "#dc3545";
                  }
                }}
              >
                <i className="fas fa-trash" style={{ fontSize: "0.7rem" }}></i>
                Wyczyść
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sekcja Paragony */}
      {activeTab === "paragony" && (
        <div>
          {/* Zakładki podsekcji - Transakcje/Szkice */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "1rem",
              border: "1px solid #e9ecef",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                borderBottom: "1px solid #e9ecef",
                paddingBottom: "0.75rem",
                marginBottom: "0.75rem",
              }}
            >
              <button
                onClick={() => {
                  setReceiptsSubTab("transactions");
                  setSelectedTransactionId(null);
                }}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  border: "1px solid #e9ecef",
                  borderRadius: "6px",
                  backgroundColor:
                    receiptsSubTab === "transactions" ? "#0d6efd" : "white",
                  color:
                    receiptsSubTab === "transactions" ? "white" : "#495057",
                  cursor: "pointer",
                  transition: "all 0.15s ease-in-out",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
                onMouseEnter={(e) => {
                  if (receiptsSubTab !== "transactions") {
                    e.target.style.backgroundColor = "#f8f9fa";
                  }
                }}
                onMouseLeave={(e) => {
                  if (receiptsSubTab !== "transactions") {
                    e.target.style.backgroundColor = "white";
                  }
                }}
              >
                <i className="fas fa-receipt"></i>
                Transakcje
              </button>

              <button
                onClick={() => {
                  setReceiptsSubTab("drafts");
                  setSelectedTransactionId(null);
                }}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  border: "1px solid #e9ecef",
                  borderRadius: "6px",
                  backgroundColor:
                    receiptsSubTab === "drafts" ? "#6f42c1" : "white",
                  color: receiptsSubTab === "drafts" ? "white" : "#495057",
                  cursor: "pointer",
                  transition: "all 0.15s ease-in-out",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
                onMouseEnter={(e) => {
                  if (receiptsSubTab !== "drafts") {
                    e.target.style.backgroundColor = "#f8f9fa";
                  }
                }}
                onMouseLeave={(e) => {
                  if (receiptsSubTab !== "drafts") {
                    e.target.style.backgroundColor = "white";
                  }
                }}
              >
                <i className="fas fa-drafting-compass"></i>
                Szkice
              </button>
            </div>

            <div
              style={{
                fontSize: "0.875rem",
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
          <div style={{ display: "flex", gap: "20px" }}>
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

      {/* Modal wyboru klienta */}
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
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "0.5rem",
              padding: "2rem",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
                paddingBottom: "0.75rem",
                borderBottom: "1px solid #e9ecef",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600" }}>
                Wybierz klienta
              </h3>
              <button
                onClick={() => {
                  setShowCustomerModal(false);
                  setSelectedCustomer(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#6c757d",
                }}
              >
                ×
              </button>
            </div>

            <CustomerSearch
              onCustomerSelect={(customer) => {
                setSelectedCustomer(customer);
                setShowCustomerModal(false);
              }}
              selectedCustomer={selectedCustomer}
            />

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                marginTop: "1.5rem",
                paddingTop: "0.75rem",
                borderTop: "1px solid #e9ecef",
              }}
            >
              <button
                onClick={() => setShowCustomerModal(false)}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Anuluj
              </button>
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setShowCustomerModal(false);
                }}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Usuń klienta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal rabatów */}
      {showDiscountModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255, 0, 0, 0.8)", // Zmieniam na czerwony żeby łatwiej było zobaczyć
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999, // Zwiększam z-index
          }}
          onClick={(e) => {
            // Zamknij modal po kliknięciu w tło
            if (e.target === e.currentTarget) {
              console.log("Kliknięto w tło modala - zamykanie");
              setShowDiscountModal(false);
            }
          }}
        >
          {console.log(
            "Modal rabatów renderuje się! showDiscountModal:",
            showDiscountModal,
          )}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "0.5rem",
              width: "90%",
              maxWidth: "600px",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 0.5rem 1rem rgba(0, 0, 0, 0.15)",
            }}
          >
            <div
              style={{
                padding: "1.5rem",
                borderBottom: "1px solid #e9ecef",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h5 style={{ margin: 0, fontWeight: "600" }}>Dostępne rabaty</h5>
              <button
                onClick={() => setShowDiscountModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#6c757d",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "1.5rem" }}>
              {availableDiscounts.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: "#6c757d",
                  }}
                >
                  <FaPercent
                    style={{ fontSize: "3rem", marginBottom: "1rem" }}
                  />
                  <p>Brak dostępnych rabatów</p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "1rem" }}>
                  {availableDiscounts.map((discount) => (
                    <div
                      key={discount.id}
                      style={{
                        border: "1px solid #e9ecef",
                        borderRadius: "0.375rem",
                        padding: "1rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <h6
                          style={{ margin: "0 0 0.5rem 0", fontWeight: "600" }}
                        >
                          {discount.nazwa}
                        </h6>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "1rem",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              color: "#198754",
                              fontWeight: "500",
                            }}
                          >
                            {discount.typ_rabatu === "procentowy" ? (
                              <>
                                <FaPercent size={12} />
                                {discount.wartosc}%
                              </>
                            ) : (
                              <>
                                <FaEuroSign size={12} />
                                {discount.wartosc} zł
                              </>
                            )}
                          </span>
                          {discount.opis && (
                            <span
                              style={{ fontSize: "0.8rem", color: "#6c757d" }}
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
                          padding: "0.5rem 1rem",
                          backgroundColor: appliedDiscounts.some(
                            (d) => d.id === discount.id,
                          )
                            ? "#6c757d"
                            : "#198754",
                          color: "white",
                          border: "none",
                          borderRadius: "0.375rem",
                          cursor: appliedDiscounts.some(
                            (d) => d.id === discount.id,
                          )
                            ? "not-allowed"
                            : "pointer",
                          fontWeight: "500",
                          fontSize: "0.8rem",
                        }}
                      >
                        {appliedDiscounts.some((d) => d.id === discount.id)
                          ? "Zastosowany"
                          : "Zastosuj"}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Zastosowane rabaty */}
              {appliedDiscounts.length > 0 && (
                <div
                  style={{
                    marginTop: "2rem",
                    paddingTop: "1.5rem",
                    borderTop: "1px solid #e9ecef",
                  }}
                >
                  <h6 style={{ marginBottom: "1rem", fontWeight: "600" }}>
                    Zastosowane rabaty
                  </h6>
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    {appliedDiscounts.map((discount) => (
                      <div
                        key={discount.id}
                        style={{
                          background: "#f8f9fa",
                          padding: "0.75rem",
                          borderRadius: "0.375rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontWeight: "500" }}>
                          {discount.nazwa}
                        </span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <span style={{ color: "#198754", fontWeight: "500" }}>
                            {discount.typ_rabatu === "procentowy"
                              ? `${discount.wartosc}%`
                              : `${discount.wartosc} zł`}
                          </span>
                          <button
                            onClick={() => removeDiscount(discount.czasowe_id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#dc3545",
                              cursor: "pointer",
                              fontSize: "1rem",
                              padding: "0.25rem",
                            }}
                          >
                            <FaTimes />
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
        />
      )}

      {/* Modal zamykania zmiany */}
      {showCloseShiftModal && (
        <CloseShiftEnhancedModal
          isOpen={showCloseShiftModal}
          onClose={() => setShowCloseShiftModal(false)}
          onSuccess={handleShiftClosed}
          currentShift={currentShift}
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
    </div>
  );
};

export default PosPage;
