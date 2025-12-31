import React, { useState, useEffect } from 'react';
import api from '../../services/api';

// Predefiniowane powody zwrotu
const RETURN_REASONS = [
  { value: '', label: '-- Wybierz powód zwrotu --' },
  { value: 'wada_produktu', label: 'Wada produktu' },
  { value: 'pomylka_klienta', label: 'Pomyłka klienta' },
  { value: 'pomylka_sprzedawcy', label: 'Pomyłka sprzedawcy' },
  { value: 'zmiana_decyzji', label: 'Zmiana decyzji' },
  { value: 'niezgodnosc_z_opisem', label: 'Niezgodność z opisem' },
  { value: 'uszkodzenie_opakowania', label: 'Uszkodzenie opakowania' },
  { value: 'termin_waznosci', label: 'Krótki termin ważności' },
  { value: 'duplikat', label: 'Duplikat zakupu' },
  { value: 'inne', label: 'Inny powód' }
];

const ReturnModal = ({ isOpen, onClose, transaction, onReturnComplete }) => {
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('gotowka');
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [returnData, setReturnData] = useState(null); // Dane zwrotu do druku
  
  // Załaduj pozycje transakcji przy otwarciu
  useEffect(() => {
    if (isOpen && transaction?.id) {
      loadTransactionItems();
      setReturnData(null);
      setSuccess('');
    }
  }, [isOpen, transaction]);
  
  const loadTransactionItems = async () => {
    setLoadingItems(true);
    setError('');
    
    try {
      const response = await api.get(`/pos/transaction/${transaction.id}/items`);
      
      if (response.data.success) {
        const itemsData = response.data.data.items || [];
        setItems(itemsData);
        
        // Inicjalizuj zaznaczenie - domyślnie wszystkie pozycje odznaczone
        const initial = {};
        itemsData.forEach(item => {
          initial[item.id] = {
            selected: false,
            quantity: item.ilosc_do_zwrotu || 0,
            maxQuantity: item.ilosc_do_zwrotu || 0,
            reason: ''
          };
        });
        setSelectedItems(initial);
      } else {
        setError(response.data.message || 'Błąd pobierania pozycji');
      }
    } catch (err) {
      console.error('Błąd:', err);
      setError('Błąd połączenia z serwerem');
    } finally {
      setLoadingItems(false);
    }
  };
  
  const toggleItem = (itemId) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selected: !prev[itemId].selected
      }
    }));
  };
  
  const updateQuantity = (itemId, value) => {
    const qty = parseFloat(value) || 0;
    const maxQty = selectedItems[itemId]?.maxQuantity || 0;
    
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity: Math.min(Math.max(0, qty), maxQty)
      }
    }));
  };
  
  const updateItemReason = (itemId, value) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        reason: value
      }
    }));
  };
  
  const selectAll = () => {
    setSelectedItems(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        if (updated[key].maxQuantity > 0) {
          updated[key].selected = true;
        }
      });
      return updated;
    });
  };
  
  const deselectAll = () => {
    setSelectedItems(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        updated[key].selected = false;
      });
      return updated;
    });
  };
  
  const calculateTotal = () => {
    let total = 0;
    items.forEach(item => {
      const sel = selectedItems[item.id];
      if (sel?.selected && sel.quantity > 0) {
        total += item.cena_jednostkowa * sel.quantity;
      }
    });
    return total.toFixed(2);
  };
  
  const getSelectedCount = () => {
    return Object.values(selectedItems).filter(s => s.selected && s.quantity > 0).length;
  };
  
  // Pobierz pełny tekst powodu
  const getFullReason = () => {
    if (reason === 'inne') {
      return customReason || 'Inny powód';
    }
    const found = RETURN_REASONS.find(r => r.value === reason);
    return found ? found.label : reason;
  };
  
  const handleSubmit = async () => {
    // Walidacja powodu
    if (!reason) {
      setError('Wybierz powód zwrotu');
      return;
    }
    
    if (reason === 'inne' && !customReason.trim()) {
      setError('Opisz powód zwrotu');
      return;
    }
    
    // Walidacja pozycji
    const itemsToReturn = [];
    
    items.forEach(item => {
      const sel = selectedItems[item.id];
      if (sel?.selected && sel.quantity > 0) {
        itemsToReturn.push({
          pozycja_id: item.id,
          ilosc_zwracana: sel.quantity,
          powod: sel.reason || getFullReason()
        });
      }
    });
    
    if (itemsToReturn.length === 0) {
      setError('Wybierz przynajmniej jedną pozycję do zwrotu');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/pos/returns', {
        transaction_id: transaction.id,
        items: itemsToReturn,
        payment_method: paymentMethod,
        reason: getFullReason(),
        cashier: localStorage.getItem('userLogin') || 'kasjer',
        location_id: transaction.location_id
      });
      
      if (response.data.success) {
        // Przygotuj dane do druku
        const returnedItems = items.filter(item => {
          const sel = selectedItems[item.id];
          return sel?.selected && sel.quantity > 0;
        }).map(item => {
          const sel = selectedItems[item.id];
          return {
            ...item,
            ilosc_zwracana: sel.quantity,
            wartosc_zwrotu: (item.cena_jednostkowa * sel.quantity).toFixed(2)
          };
        });
        
        setReturnData({
          ...response.data.data,
          items: returnedItems,
          reason: getFullReason(),
          payment_method: paymentMethod,
          transaction: transaction,
          cashier: localStorage.getItem('userLogin') || 'kasjer'
        });
        
        setSuccess(`Zwrot ${response.data.data.return_number} został utworzony. ` +
                   `Kwota: ${response.data.data.total_brutto} zł`);
        
        // Nie zamykaj automatycznie - pozwól użytkownikowi wydrukować
      } else {
        setError(response.data.message || 'Błąd tworzenia zwrotu');
      }
    } catch (err) {
      console.error('Błąd:', err);
      setError(err.response?.data?.message || 'Błąd połączenia z serwerem');
    } finally {
      setLoading(false);
    }
  };
  
  // Funkcja drukowania dokumentu zwrotu
  const handlePrintReturn = () => {
    if (!returnData) return;
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Nie można otworzyć okna drukowania. Sprawdź ustawienia blokowania wyskakujących okien.');
      return;
    }
    
    const today = new Date();
    const dateStr = today.toLocaleDateString('pl-PL');
    const timeStr = today.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    
    const paymentMethodText = {
      'gotowka': 'Gotówka',
      'karta': 'Karta płatnicza',
      'blik': 'BLIK'
    }[returnData.payment_method] || returnData.payment_method;
    
    const itemsHtml = returnData.items.map((item, idx) => `
      <tr>
        <td style="padding: 6px; border-bottom: 1px solid #ddd;">${idx + 1}</td>
        <td style="padding: 6px; border-bottom: 1px solid #ddd;">${item.nazwa_produktu}</td>
        <td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: center;">${item.kod_produktu || '-'}</td>
        <td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: center;">${item.ilosc_zwracana} ${item.jednostka || 'szt'}</td>
        <td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: right;">${parseFloat(item.cena_jednostkowa).toFixed(2)} zł</td>
        <td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${item.wartosc_zwrotu} zł</td>
      </tr>
    `).join('');
    
    const html = `
      <!DOCTYPE html>
      <html lang="pl">
      <head>
        <meta charset="UTF-8">
        <title>Dokument zwrotu ${returnData.return_number}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 18px; color: #dc3545; }
          .header h2 { margin: 5px 0; font-size: 14px; font-weight: normal; }
          .info-section { margin-bottom: 15px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .info-label { color: #666; }
          .info-value { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th { background: #f5f5f5; padding: 8px; text-align: left; border-bottom: 2px solid #ddd; font-size: 11px; }
          .total-section { margin-top: 15px; text-align: right; }
          .total-amount { font-size: 18px; font-weight: bold; color: #dc3545; }
          .signature-section { margin-top: 40px; display: flex; justify-content: space-between; }
          .signature-box { width: 45%; text-align: center; }
          .signature-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; font-size: 11px; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px dashed #ccc; padding-top: 10px; }
          @media print {
            body { margin: 10mm; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔄 DOKUMENT ZWROTU TOWARU</h1>
          <h2>${returnData.return_number}</h2>
        </div>
        
        <div class="info-section">
          <div class="info-row">
            <span class="info-label">Data zwrotu:</span>
            <span class="info-value">${dateStr} ${timeStr}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Paragon źródłowy:</span>
            <span class="info-value">${returnData.transaction?.numer_paragonu || returnData.transaction?.receipt_number || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Data paragonu:</span>
            <span class="info-value">${returnData.transaction?.data_transakcji || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Kasjer:</span>
            <span class="info-value">${returnData.cashier}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Powód zwrotu:</span>
            <span class="info-value">${returnData.reason}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Forma zwrotu:</span>
            <span class="info-value">${paymentMethodText}</span>
          </div>
        </div>
        
        <h3 style="margin: 10px 0; font-size: 13px;">Zwracane produkty:</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 30px;">Lp.</th>
              <th>Nazwa produktu</th>
              <th style="width: 80px; text-align: center;">Kod</th>
              <th style="width: 60px; text-align: center;">Ilość</th>
              <th style="width: 70px; text-align: right;">Cena</th>
              <th style="width: 80px; text-align: right;">Wartość</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div class="total-section">
          <span>Łączna kwota zwrotu: </span>
          <span class="total-amount">${parseFloat(returnData.total_brutto).toFixed(2)} zł</span>
        </div>
        
        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line">Podpis klienta</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Podpis sprzedawcy</div>
          </div>
        </div>
        
        <div class="footer">
          Dokument wygenerowany elektronicznie • System POS v3
        </div>
        
        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 30px; font-size: 14px; cursor: pointer; background: #dc3545; color: white; border: none; border-radius: 4px;">
            🖨️ Drukuj dokument
          </button>
        </div>
        
        <script>
          window.onload = function() {
            // Auto-print po załadowaniu
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };
  
  // Zamknij po zakończeniu
  const handleClose = () => {
    if (returnData) {
      onReturnComplete && onReturnComplete(returnData);
    }
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <>
      <div 
        className="modal fade show" 
        style={{ 
          display: 'block',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1050,
          overflow: 'auto'
        }} 
        tabIndex="-1"
      >
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content" style={{ fontSize: '12px' }}>
            <div className="modal-header py-2" style={{ backgroundColor: '#dc3545', color: 'white' }}>
              <h6 className="modal-title mb-0" style={{ fontSize: '13px' }}>
                <i className="fas fa-undo me-2"></i>
                Zwrot do paragonu {transaction?.receipt_number || transaction?.numer_paragonu || `#${transaction?.id}`}
              </h6>
              <button 
                type="button" 
                className="btn-close btn-close-white" 
                onClick={onClose}
                disabled={loading}
              ></button>
            </div>
            
            <div className="modal-body py-2" style={{ fontSize: '11px' }}>
              {error && (
                <div className="alert alert-danger alert-dismissible fade show py-1 mb-2" style={{ fontSize: '11px' }}>
                  <i className="fas fa-exclamation-circle me-1"></i>
                  {error}
                  <button type="button" className="btn-close" onClick={() => setError('')}></button>
                </div>
              )}
              
              {success && (
                <div className="alert alert-success py-1 mb-2" style={{ fontSize: '11px' }}>
                  <i className="fas fa-check-circle me-1"></i>
                  {success}
                </div>
              )}
              
              {/* Informacje o transakcji */}
              <div className="card mb-2">
                <div className="card-body py-1 px-2">
                  <div className="row">
                    <div className="col-md-4">
                      <small className="text-muted" style={{ fontSize: '10px' }}>Data:</small>
                      <div style={{ fontSize: '11px' }}><strong>{transaction?.data_transakcji || transaction?.date}</strong></div>
                    </div>
                    <div className="col-md-4">
                      <small className="text-muted" style={{ fontSize: '10px' }}>Wartość paragonu:</small>
                      <div style={{ fontSize: '11px' }}><strong>{parseFloat(transaction?.suma_brutto || transaction?.total || 0).toFixed(2)} zł</strong></div>
                    </div>
                    <div className="col-md-4">
                      <small className="text-muted" style={{ fontSize: '10px' }}>Płatność:</small>
                      <div style={{ fontSize: '11px' }}><strong>{transaction?.forma_platnosci || transaction?.payment_method}</strong></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Lista pozycji */}
              <div className="mb-2">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="fw-bold" style={{ fontSize: '11px' }}>Pozycje do zwrotu:</span>
                  <div>
                    <button 
                      className="btn btn-outline-primary btn-sm me-1 py-0 px-2"
                      onClick={selectAll}
                      disabled={loadingItems}
                      style={{ fontSize: '10px' }}
                    >
                      Zaznacz wszystkie
                    </button>
                    <button 
                      className="btn btn-outline-secondary btn-sm py-0 px-2"
                      onClick={deselectAll}
                      disabled={loadingItems}
                      style={{ fontSize: '10px' }}
                    >
                      Odznacz wszystkie
                    </button>
                  </div>
                </div>
                
                {loadingItems ? (
                  <div className="text-center py-2">
                    <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                    <p className="mt-1 mb-0 text-muted" style={{ fontSize: '10px' }}>Ładowanie pozycji...</p>
                  </div>
                ) : items.length === 0 ? (
                  <div className="alert alert-warning py-1 mb-0" style={{ fontSize: '11px' }}>
                    <i className="fas fa-exclamation-triangle me-1"></i>
                    Brak pozycji do wyświetlenia
                  </div>
                ) : (
                  <div className="table-responsive" style={{ maxHeight: '200px' }}>
                    <table className="table table-sm table-hover mb-0" style={{ fontSize: '11px' }}>
                      <thead className="table-light sticky-top">
                        <tr>
                          <th style={{ width: '30px', padding: '4px' }}></th>
                          <th style={{ padding: '4px' }}>Produkt</th>
                          <th className="text-center" style={{ width: '70px', padding: '4px' }}>Cena</th>
                          <th className="text-center" style={{ width: '80px', padding: '4px' }}>Ilość</th>
                          <th className="text-center" style={{ width: '80px', padding: '4px' }}>Wartość</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(item => {
                          const sel = selectedItems[item.id] || {};
                          const canReturn = item.ilosc_do_zwrotu > 0;
                          const returnValue = (item.cena_jednostkowa * (sel.quantity || 0)).toFixed(2);
                          
                          return (
                            <tr 
                              key={item.id} 
                              className={sel.selected ? 'table-warning' : ''}
                              style={{ opacity: canReturn ? 1 : 0.5 }}
                            >
                              <td className="text-center" style={{ padding: '4px' }}>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={sel.selected || false}
                                  onChange={() => toggleItem(item.id)}
                                  disabled={!canReturn}
                                  style={{ width: '14px', height: '14px' }}
                                />
                              </td>
                              <td style={{ padding: '4px' }}>
                                <div style={{ fontSize: '11px' }}><strong>{item.nazwa_produktu}</strong></div>
                                <small className="text-muted" style={{ fontSize: '9px' }}>
                                  {item.kod_produktu && <span className="me-1">Kod: {item.kod_produktu}</span>}
                                  <span>
                                    Kupiono: {item.ilosc} {item.jednostka || 'szt'}
                                    {item.ilosc_zwrocona > 0 && (
                                      <span className="text-danger ms-1">
                                        (zwrócono: {item.ilosc_zwrocona})
                                      </span>
                                    )}
                                  </span>
                                </small>
                              </td>
                              <td className="text-center" style={{ padding: '4px', fontSize: '11px' }}>
                                {parseFloat(item.cena_jednostkowa).toFixed(2)} zł
                              </td>
                              <td className="text-center" style={{ padding: '4px' }}>
                                {canReturn ? (
                                  <input
                                    type="number"
                                    className="form-control form-control-sm text-center"
                                    value={sel.quantity || 0}
                                    onChange={(e) => updateQuantity(item.id, e.target.value)}
                                    min="0"
                                    max={item.ilosc_do_zwrotu}
                                    step="1"
                                    disabled={!sel.selected}
                                    style={{ width: '50px', margin: '0 auto', fontSize: '10px', padding: '2px' }}
                                  />
                                ) : (
                                  <span className="badge bg-secondary" style={{ fontSize: '9px' }}>0</span>
                                )}
                              </td>
                              <td className="text-center" style={{ padding: '4px', fontSize: '11px' }}>
                                {sel.selected ? (
                                  <strong className="text-danger">{returnValue} zł</strong>
                                ) : (
                                  <span className="text-muted">-</span>
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
              
              {/* Metoda płatności zwrotu */}
              <div className="row mb-2">
                <div className="col-md-6">
                  <label className="form-label mb-1" style={{ fontSize: '10px' }}>Metoda zwrotu pieniędzy:</label>
                  <div className="btn-group w-100" role="group">
                    <input
                      type="radio"
                      className="btn-check"
                      name="paymentMethod"
                      id="pm_gotowka"
                      checked={paymentMethod === 'gotowka'}
                      onChange={() => setPaymentMethod('gotowka')}
                    />
                    <label className="btn btn-outline-success btn-sm py-1" htmlFor="pm_gotowka" style={{ fontSize: '10px' }}>
                      <i className="fas fa-money-bill-wave me-1"></i>
                      Gotówka
                    </label>
                    
                    <input
                      type="radio"
                      className="btn-check"
                      name="paymentMethod"
                      id="pm_karta"
                      checked={paymentMethod === 'karta'}
                      onChange={() => setPaymentMethod('karta')}
                    />
                    <label className="btn btn-outline-primary btn-sm py-1" htmlFor="pm_karta" style={{ fontSize: '10px' }}>
                      <i className="fas fa-credit-card me-1"></i>
                      Karta
                    </label>
                    
                    <input
                      type="radio"
                      className="btn-check"
                      name="paymentMethod"
                      id="pm_blik"
                      checked={paymentMethod === 'blik'}
                      onChange={() => setPaymentMethod('blik')}
                    />
                    <label className="btn btn-outline-warning btn-sm py-1" htmlFor="pm_blik" style={{ fontSize: '10px' }}>
                      <i className="fas fa-mobile-alt me-1"></i>
                      BLIK
                    </label>
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label mb-1" style={{ fontSize: '10px' }}>
                    Powód zwrotu: <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    style={{ fontSize: '11px' }}
                  >
                    {RETURN_REASONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  {reason === 'inne' && (
                    <input
                      type="text"
                      className="form-control form-control-sm mt-1"
                      placeholder="Opisz powód zwrotu..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      style={{ fontSize: '11px' }}
                    />
                  )}
                </div>
              </div>
              
              {/* Podsumowanie */}
              <div className="card bg-light">
                <div className="card-body py-2 px-3">
                  <div className="row align-items-center">
                    <div className="col">
                      <span className="text-muted" style={{ fontSize: '10px' }}>Pozycje do zwrotu:</span>
                      <strong className="ms-1" style={{ fontSize: '12px' }}>{getSelectedCount()}</strong>
                    </div>
                    <div className="col text-end">
                      <span className="text-muted" style={{ fontSize: '10px' }}>Kwota zwrotu:</span>
                      <span className="ms-1 fw-bold text-danger" style={{ fontSize: '16px' }}>{calculateTotal()} zł</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer py-2">
              {returnData ? (
                // Po sukcesie - pokaż przyciski druku i zamknij
                <>
                  <button 
                    type="button" 
                    className="btn btn-success btn-sm"
                    onClick={handlePrintReturn}
                    style={{ fontSize: '11px' }}
                  >
                    <i className="fas fa-print me-1"></i>
                    Drukuj dokument zwrotu
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary btn-sm" 
                    onClick={handleClose}
                    style={{ fontSize: '11px' }}
                  >
                    <i className="fas fa-check me-1"></i>
                    Zamknij
                  </button>
                </>
              ) : (
                // Przed zwrotem - pokaż przyciski anuluj i wykonaj
                <>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm" 
                    onClick={handleClose}
                    disabled={loading}
                    style={{ fontSize: '11px' }}
                  >
                    <i className="fas fa-times me-1"></i>
                    Anuluj
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-danger btn-sm"
                    onClick={handleSubmit}
                    disabled={loading || getSelectedCount() === 0 || !reason}
                    style={{ fontSize: '11px' }}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        Przetwarzanie...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-undo me-1"></i>
                        Wykonaj zwrot ({calculateTotal()} zł)
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
    </>
  );
};

export default ReturnModal;
