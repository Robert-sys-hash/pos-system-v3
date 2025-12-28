import React, { useState, useEffect } from 'react';
import { transactionService } from '../../services/transactionService';

const Cart = ({ items = [], onUpdateItems, customer, cashier = 'admin', locationId = 5 }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactionId, setTransactionId] = useState(null);
  const [totals, setTotals] = useState({
    subtotal: 0,
    tax: 0,
    total: 0,
    itemsCount: 0
  });

  // Oblicz sumy przy zmianie elementów
  useEffect(() => {
    calculateTotals();
  }, [items]);

  const calculateTotals = () => {
    let subtotal = 0;
    let tax = 0;
    let itemsCount = 0;

    items.forEach(item => {
      const itemTotal = item.quantity * item.price;
      subtotal += itemTotal;
      
      const taxRate = item.tax_rate || item.stawka_vat || 23;
      const itemTax = itemTotal * (taxRate / 100);
      tax += itemTax;
      
      itemsCount += item.quantity;
    });

    const total = subtotal;
    const net = subtotal - tax;

    setTotals({
      subtotal: net,
      tax: tax,
      total: total,
      itemsCount: itemsCount
    });
  };

  const updateQuantity = (itemIndex, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(itemIndex);
      return;
    }

    const item = items[itemIndex];
    const availableStock = item.stock_quantity || item.stan_magazynowy || 0;
    
    // Walidacja stanu magazynowego
    if (newQuantity > availableStock) {
      setError(`Niewystarczający stan magazynowy dla ${item.name || item.nazwa}. Dostępne: ${availableStock} szt.`);
      return;
    }

    const updatedItems = items.map((item, index) => 
      index === itemIndex ? { ...item, quantity: newQuantity } : item
    );
    
    // Wyczyść błąd po pomyślnej aktualizacji
    setError('');
    onUpdateItems(updatedItems);
  };

  const removeItem = (itemIndex) => {
    const updatedItems = items.filter((_, index) => index !== itemIndex);
    onUpdateItems(updatedItems);
  };

  const clearCart = () => {
    onUpdateItems([]);
    setTransactionId(null);
  };

  const saveAsDraft = async () => {
    if (items.length === 0) {
      setError('Koszyk jest pusty');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const transactionData = {
        customer_id: customer?.id,
        cashier: cashier,
        type: 'draft',
        location_id: locationId,
        items: items.map(item => ({
          product_id: item.product_id || item.id,
          quantity: item.quantity,
          price: item.price || item.cena
        }))
      };

      const response = await transactionService.createTransaction(transactionData);
      
      if (response.success) {
        setTransactionId(response.data.transaction_id);
        // Opcjonalnie - wyczyść koszyk po zapisaniu
        // clearCart();
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const completeSale = async (paymentMethod = 'cash') => {
    if (items.length === 0) {
      setError('Koszyk jest pusty');
      return;
    }

    // Sprawdź stany przed finalizacją
    const stockErrors = [];
    for (let item of items) {
      const availableStock = item.stock_quantity || item.stan_magazynowy || 0;
      if (item.quantity > availableStock) {
        stockErrors.push({
          product: item.name || item.nazwa,
          required: item.quantity,
          available: availableStock
        });
      }
    }

    if (stockErrors.length > 0) {
      const errorMsg = stockErrors.map(err => 
        `${err.product}: potrzeba ${err.required}, dostępne ${err.available}`
      ).join('; ');
      setError(`Niewystarczające stany: ${errorMsg}`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Najpierw utwórz transakcję
      const transactionData = {
        customer_id: customer?.id,
        cashier: cashier,
        type: 'sprzedaz',
        location_id: locationId,
        payment_method: paymentMethod,
        items: items.map(item => ({
          product_id: item.product_id || item.id,
          quantity: item.quantity,
          price: item.price || item.cena
        }))
      };

      const createResponse = await transactionService.createTransaction(transactionData);
      
      if (!createResponse.success) {
        setError(createResponse.error || 'Błąd tworzenia transakcji');
        return;
      }

      const newTransactionId = createResponse.data.transaction_id;

      // Następnie finalizuj transakcję (to automatycznie odejmie stany)
      const completeResponse = await transactionService.completeTransaction(newTransactionId, {
        user: cashier
      });

      if (completeResponse.success) {
        // Transakcja sfinalizowana - wyczyść koszyk
        clearCart();
        setError('');
        
        // Opcjonalnie - pokaż potwierdzenie
        alert(`Sprzedaż sfinalizowana! Transakcja #${newTransactionId}`);
        
        return { success: true, transaction_id: newTransactionId };
      } else {
        setError(completeResponse.error || 'Błąd finalizacji transakcji');
        return { success: false };
      }
    } catch (err) {
      setError('Błąd podczas finalizacji sprzedaży: ' + err.message);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const validateCartStock = () => {
    const stockWarnings = [];
    
    items.forEach(item => {
      const availableStock = item.stock_quantity || item.stan_magazynowy || 0;
      const productName = item.name || item.nazwa;
      
      if (availableStock <= 0) {
        stockWarnings.push({
          type: 'error',
          product: productName,
          message: 'Brak na stanie'
        });
      } else if (item.quantity > availableStock) {
        stockWarnings.push({
          type: 'error',
          product: productName,
          message: `Dostępne tylko ${availableStock} szt.`
        });
      } else if (availableStock <= (item.min_stock_level || item.stan_minimalny || 0)) {
        stockWarnings.push({
          type: 'warning',
          product: productName,
          message: 'Niski stan po sprzedaży'
        });
      }
    });
    
    return stockWarnings;
  };

  const formatPrice = (price) => {
    return (price || 0).toFixed(2);
  };

  if (items.length === 0) {
    return (
      <div className="cart empty-cart text-center py-4">
        <i className="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
        <h6 className="text-muted">Koszyk jest pusty</h6>
        <p className="text-muted mb-0">
          Dodaj produkty używając wyszukiwarki
        </p>
      </div>
    );
  }

  return (
    <div className="cart">
      <div className="cart-header d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">
          <i className="fas fa-shopping-cart me-2"></i>
          Koszyk ({totals.itemsCount} szt.)
        </h6>
        <button 
          className="btn btn-outline-secondary btn-sm"
          onClick={clearCart}
          title="Wyczyść koszyk"
        >
          <i className="fas fa-trash"></i>
        </button>
      </div>

      {error && (
        <div className="alert alert-warning alert-sm">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {/* Ostrzeżenia o stanach magazynowych */}
      {(() => {
        const warnings = validateCartStock();
        const errors = warnings.filter(w => w.type === 'error');
        const stockWarnings = warnings.filter(w => w.type === 'warning');
        
        return (
          <>
            {errors.length > 0 && (
              <div className="alert alert-danger alert-sm">
                <i className="fas fa-exclamation-circle me-2"></i>
                <strong>Błędy stanów:</strong>
                <ul className="mb-0 mt-1">
                  {errors.map((error, idx) => (
                    <li key={idx}>{error.product}: {error.message}</li>
                  ))}
                </ul>
              </div>
            )}
            {stockWarnings.length > 0 && (
              <div className="alert alert-warning alert-sm">
                <i className="fas fa-exclamation-triangle me-2"></i>
                <strong>Ostrzeżenia:</strong>
                <ul className="mb-0 mt-1">
                  {stockWarnings.map((warning, idx) => (
                    <li key={idx}>{warning.product}: {warning.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        );
      })()}

      <div className="cart-items" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {items.map((item, index) => (
          <div key={index} className="cart-item border-bottom py-2">
            <div className="d-flex justify-content-between align-items-start">
              <div className="flex-grow-1">
                <div className="item-name fw-semibold">
                  {item.name || item.nazwa}
                  {item.has_special_price && (
                    <span className="badge bg-warning ms-2" style={{ fontSize: '0.6rem' }}>
                      CENA SPECJALNA
                    </span>
                  )}
                </div>
                <div className="item-details">
                  <small className="text-muted">
                    {formatPrice(item.price || item.cena)} zł / {item.unit || item.jednostka || 'szt'}
                    {item.has_special_price && item.default_price_brutto && (
                      <span className="text-decoration-line-through ms-1">
                        (was: {formatPrice(item.default_price_brutto)} zł)
                      </span>
                    )}
                  </small>
                </div>
              </div>
              <button
                className="btn btn-outline-danger btn-sm ms-2"
                onClick={() => removeItem(index)}
                title="Usuń produkt"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="d-flex justify-content-between align-items-center mt-2">
              <div className="quantity-controls d-flex align-items-center">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => updateQuantity(index, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  <i className="fas fa-minus"></i>
                </button>
                <input
                  type="number"
                  className="form-control form-control-sm mx-2 text-center"
                  style={{ width: '70px' }}
                  value={item.quantity}
                  onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                  min="1"
                />
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => updateQuantity(index, item.quantity + 1)}
                >
                  <i className="fas fa-plus"></i>
                </button>
              </div>
              
              <div className="item-total fw-bold text-primary">
                {formatPrice((item.price || item.cena) * item.quantity)} zł
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="cart-summary mt-3 p-3 bg-light rounded">
        <div className="d-flex justify-content-between mb-1">
          <span>Netto:</span>
          <span>{formatPrice(totals.subtotal)} zł</span>
        </div>
        <div className="d-flex justify-content-between mb-1">
          <span>VAT:</span>
          <span>{formatPrice(totals.tax)} zł</span>
        </div>
        <hr className="my-2" />
        <div className="d-flex justify-content-between fw-bold">
          <span>RAZEM:</span>
          <span className="text-primary fs-5">{formatPrice(totals.total)} zł</span>
        </div>
      </div>

      <div className="cart-actions mt-3">
        <div className="d-grid gap-2">
          <button
            className="btn btn-outline-primary"
            onClick={saveAsDraft}
            disabled={loading || items.length === 0}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Zapisywanie...
              </>
            ) : (
              <>
                <i className="fas fa-save me-2"></i>
                Zapisz jako szkic
              </>
            )}
          </button>
          
          <button 
            className="btn btn-success"
            disabled={items.length === 0 || loading || validateCartStock().filter(w => w.type === 'error').length > 0}
            onClick={() => completeSale('cash')}
          >
            {loading ? (
              <>
                <div className="spinner-border spinner-border-sm me-2" role="status">
                  <span className="visually-hidden">Finalizowanie...</span>
                </div>
                Finalizowanie...
              </>
            ) : (
              <>
                <i className="fas fa-cash-register me-2"></i>
                Finalizuj sprzedaż
              </>
            )}
          </button>
        </div>
      </div>

      {transactionId && (
        <div className="mt-2">
          <small className="text-success">
            <i className="fas fa-check me-1"></i>
            Zapisano jako szkic #{transactionId}
          </small>
        </div>
      )}

      {customer && (
        <div className="customer-info mt-3 p-2 bg-info bg-opacity-10 rounded">
          <small>
            <i className="fas fa-user me-2"></i>
            <strong>Klient:</strong> {customer.display_name || customer.name}
          </small>
        </div>
      )}
    </div>
  );
};

export default Cart;
