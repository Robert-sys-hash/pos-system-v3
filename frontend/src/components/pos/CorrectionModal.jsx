import React, { useState, useEffect } from 'react';

const CorrectionModal = ({ isOpen, onClose, transaction, onCorrectionSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [correctionType, setCorrectionType] = useState('quantity'); // quantity | amount
  const [correctionItems, setCorrectionItems] = useState([]);
  const [reason, setReason] = useState('');
  const [reasonType, setReasonType] = useState('zwrot'); // zwrot | pomylka | inne

  useEffect(() => {
    if (isOpen && transaction) {
      loadTransactionDetails();
    }
  }, [isOpen, transaction]);

  // Automatyczne ustawienie domyślnego powodu na podstawie przyczyny
  useEffect(() => {
    if (reasonType === 'zwrot' && !reason.includes('Zwrot')) {
      setReason('Zwrot towaru na żądanie klienta');
    } else if (reasonType === 'pomylka' && !reason.includes('Pomyłka')) {
      setReason('Pomyłka w sprzedaży - korekta transakcji');
    } else if (reasonType === 'inne' && (reason.includes('Zwrot') || reason.includes('Pomyłka'))) {
      setReason('');
    }
  }, [reasonType]);

  const loadTransactionDetails = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`http://localhost:8000/api/transactions/${transaction.id}/details`);
      const data = await response.json();
      
      if (data.success) {
        setTransactionDetails(data.data);
        // Inicjalizuj pozycje korekty
        const items = data.data.items.map(item => ({
          position_id: item.id,
          product_id: item.produkt_id,
          product_name: item.product_name,
          original_quantity: item.ilosc,
          original_amount: item.wartosc_brutto,
          unit_price: item.cena_jednostkowa,
          correction_quantity: 0,
          correction_amount: 0,
          selected: false
        }));
        setCorrectionItems(items);
      } else {
        setError(data.message || 'Błąd pobierania szczegółów transakcji');
      }
    } catch (err) {
      setError('Błąd połączenia: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleItemToggle = (index) => {
    setCorrectionItems(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleQuantityChange = (index, value) => {
    setCorrectionItems(prev => 
      prev.map((item, i) => {
        if (i === index) {
          const quantity = Math.max(0, Math.min(parseFloat(value) || 0, item.original_quantity));
          const amount = quantity * item.unit_price;
          return { 
            ...item, 
            correction_quantity: quantity,
            correction_amount: amount
          };
        }
        return item;
      })
    );
  };

  const handleAmountChange = (index, value) => {
    setCorrectionItems(prev => 
      prev.map((item, i) => {
        if (i === index) {
          const amount = Math.max(0, Math.min(parseFloat(value) || 0, item.original_amount));
          const quantity = item.unit_price > 0 ? amount / item.unit_price : 0;
          return { 
            ...item, 
            correction_amount: amount,
            correction_quantity: quantity
          };
        }
        return item;
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const selectedItems = correctionItems.filter(item => item.selected && 
      (correctionType === 'quantity' ? item.correction_quantity > 0 : item.correction_amount > 0)
    );
    
    if (selectedItems.length === 0) {
      setError('Wybierz co najmniej jedną pozycję do korekty');
      return;
    }

    if (!reason.trim()) {
      setError('Podaj powód korekty');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const correctionData = {
        cashier: 'admin', // TODO: pobierz z kontekstu użytkownika
        correction_type: correctionType,
        reason: reason,
        items: selectedItems.map(item => ({
          position_id: item.position_id,
          product_id: item.product_id,
          correction_quantity: correctionType === 'quantity' ? item.correction_quantity : undefined,
          correction_amount: correctionType === 'amount' ? item.correction_amount : undefined
        }))
      };

      const response = await fetch(`http://localhost:8000/api/transactions/${transaction.id}/correction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(correctionData)
      });

      const result = await response.json();

      if (result.success) {
        // Pokaż opcję wydruku
        const shouldPrint = window.confirm(
          `Korekta została wykonana pomyślnie!\n\n` +
          `Numer korekty: ${result.data.correction_number}\n` +
          `Kwota korekty: -${result.data.total_correction_amount} zł\n\n` +
          `Czy chcesz wydrukować dokument korekty?`
        );
        
        if (shouldPrint) {
          printCorrection(result.data);
        }
        
        onCorrectionSubmit && onCorrectionSubmit(result.data);
        onClose();
        // Reset form
        setCorrectionItems([]);
        setReason('');
        setReasonType('zwrot');
        setError('');
      } else {
        setError(result.message || 'Błąd wykonywania korekty');
      }
    } catch (err) {
      setError('Błąd połączenia: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const printCorrection = (correctionData) => {
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('Nie można otworzyć okna wydruku. Sprawdź czy przeglądarka nie blokuje popup-ów.');
      return;
    }
    
    const selectedItems = correctionItems.filter(item => item.selected);
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Korekta - ${correctionData.correction_number}</title>
          <style>
            body { font-family: monospace; margin: 20px; line-height: 1.4; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin-bottom: 15px; }
            .items { border-collapse: collapse; width: 100%; }
            .items th, .items td { border: 1px solid #000; padding: 5px; text-align: left; }
            .total { font-weight: bold; font-size: 16px; }
            .footer { margin-top: 20px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>DOKUMENT KOREKTY</h2>
            <div>Numer: ${correctionData.correction_number}</div>
            <div>Data: ${new Date().toLocaleDateString('pl-PL')} ${new Date().toLocaleTimeString('pl-PL')}</div>
          </div>
          
          <div class="section">
            <strong>Oryginalna transakcja:</strong><br>
            Numer: ${transactionDetails.transaction.numer_transakcji}<br>
            Data: ${transactionDetails.transaction.data_transakcji} ${transactionDetails.transaction.czas_transakcji}<br>
            Kasjer: ${transactionDetails.transaction.kasjer_login}
          </div>
          
          <div class="section">
            <strong>Przyczyna korekty:</strong> ${reasonType === 'zwrot' ? 'Zwrot towaru' : reasonType === 'pomylka' ? 'Pomyłka w sprzedaży' : 'Inne'}<br>
            <strong>Szczegóły:</strong> ${reason}
          </div>
          
          <div class="section">
            <strong>Pozycje korekty:</strong>
            <table class="items">
              <thead>
                <tr>
                  <th>Produkt</th>
                  <th>Cena jedn.</th>
                  <th>${correctionType === 'quantity' ? 'Ilość' : 'Kwota'}</th>
                  <th>Wartość korekty</th>
                </tr>
              </thead>
              <tbody>
                ${selectedItems.map(item => `
                  <tr>
                    <td>${item.product_name}</td>
                    <td>${item.unit_price ? item.unit_price.toFixed(2) : '0.00'} zł</td>
                    <td>${correctionType === 'quantity' ? item.correction_quantity : (item.correction_amount ? item.correction_amount.toFixed(2) : '0.00') + ' zł'}</td>
                    <td>-${item.correction_amount ? item.correction_amount.toFixed(2) : '0.00'} zł</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section total">
            ŁĄCZNA KWOTA KOREKTY: -${correctionData.total_correction_amount || '0.00'} zł
          </div>
          
          <div class="footer">
            <div>Dokument wygenerowany automatycznie</div>
            <div>${new Date().toISOString()}</div>
          </div>
        </body>
      </html>
    `;
    
    try {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch (error) {
      console.error('Błąd wydruku:', error);
      alert('Wystąpił błąd podczas wydruku. Sprawdź konsolę deweloperską.');
      printWindow.close();
    }
  };

  const getTotalCorrection = () => {
    return correctionItems
      .filter(item => item.selected)
      .reduce((sum, item) => sum + item.correction_amount, 0);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Korekta transakcji #{transaction?.id}</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        {loading && <div>Ładowanie...</div>}
        {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

        {transactionDetails && (
          <form onSubmit={handleSubmit}>
            {/* Informacje o transakcji */}
            <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <h4>Informacje o transakcji</h4>
              <p>Data: {transactionDetails.transaction.data_transakcji} {transactionDetails.transaction.czas_transakcji}</p>
              <p>Kasjer: {transactionDetails.transaction.kasjer_login}</p>
              <p>Suma: {transactionDetails.transaction.suma_brutto?.toFixed(2)} zł</p>
              {transactionDetails.transaction.imie && (
                <p>Klient: {transactionDetails.transaction.imie} {transactionDetails.transaction.nazwisko}</p>
              )}
            </div>

            {/* Typ korekty */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontWeight: 'bold', marginBottom: '10px', display: 'block' }}>
                Typ korekty:
              </label>
              <div>
                <label style={{ marginRight: '20px' }}>
                  <input 
                    type="radio" 
                    value="quantity" 
                    checked={correctionType === 'quantity'}
                    onChange={(e) => setCorrectionType(e.target.value)}
                    style={{ marginRight: '5px' }}
                  />
                  Ilościowa
                </label>
                <label>
                  <input 
                    type="radio" 
                    value="amount" 
                    checked={correctionType === 'amount'}
                    onChange={(e) => setCorrectionType(e.target.value)}
                    style={{ marginRight: '5px' }}
                  />
                  Kwotowa
                </label>
              </div>
            </div>

            {/* Pozycje do korekty */}
            <div style={{ marginBottom: '20px' }}>
              <h4>Pozycje do korekty:</h4>
              <div style={{ border: '1px solid #dee2e6', borderRadius: '4px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '50px 1fr 100px 120px 120px',
                  gap: '10px',
                  padding: '10px',
                  backgroundColor: '#f8f9fa',
                  fontWeight: 'bold',
                  borderBottom: '1px solid #dee2e6'
                }}>
                  <div>Wybierz</div>
                  <div>Produkt</div>
                  <div>Oryginalna ilość</div>
                  <div>{correctionType === 'quantity' ? 'Ilość korekty' : 'Kwota korekty'}</div>
                  <div>Wartość korekty</div>
                </div>

                {correctionItems.map((item, index) => (
                  <div key={item.position_id} style={{
                    display: 'grid',
                    gridTemplateColumns: '50px 1fr 100px 120px 120px',
                    gap: '10px',
                    padding: '10px',
                    borderBottom: index < correctionItems.length - 1 ? '1px solid #dee2e6' : 'none',
                    backgroundColor: item.selected ? '#fff3cd' : 'white'
                  }}>
                    <div>
                      <input 
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => handleItemToggle(index)}
                      />
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{item.product_name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Cena jedn.: {item.unit_price.toFixed(2)} zł
                      </div>
                    </div>
                    <div>{item.original_quantity}</div>
                    <div>
                      {item.selected && (
                        <input 
                          type="number"
                          step={correctionType === 'quantity' ? '1' : '0.01'}
                          min="0"
                          max={correctionType === 'quantity' ? item.original_quantity : item.original_amount}
                          value={correctionType === 'quantity' ? item.correction_quantity : item.correction_amount}
                          onChange={(e) => correctionType === 'quantity' 
                            ? handleQuantityChange(index, e.target.value)
                            : handleAmountChange(index, e.target.value)
                          }
                          style={{
                            width: '100%',
                            padding: '4px',
                            border: '1px solid #ccc',
                            borderRadius: '4px'
                          }}
                        />
                      )}
                    </div>
                    <div>
                      {item.selected && item.correction_amount > 0 && (
                        <span style={{ fontWeight: 'bold' }}>
                          -{item.correction_amount.toFixed(2)} zł
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Przyczyna korekty */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontWeight: 'bold', marginBottom: '10px', display: 'block' }}>
                Przyczyna korekty:
              </label>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ marginRight: '20px' }}>
                  <input 
                    type="radio" 
                    value="zwrot" 
                    checked={reasonType === 'zwrot'}
                    onChange={(e) => setReasonType(e.target.value)}
                    style={{ marginRight: '5px' }}
                  />
                  Zwrot towaru
                </label>
                <label style={{ marginRight: '20px' }}>
                  <input 
                    type="radio" 
                    value="pomylka" 
                    checked={reasonType === 'pomylka'}
                    onChange={(e) => setReasonType(e.target.value)}
                    style={{ marginRight: '5px' }}
                  />
                  Pomyłka w sprzedaży
                </label>
                <label>
                  <input 
                    type="radio" 
                    value="inne" 
                    checked={reasonType === 'inne'}
                    onChange={(e) => setReasonType(e.target.value)}
                    style={{ marginRight: '5px' }}
                  />
                  Inne
                </label>
              </div>
            </div>

            {/* Powód korekty */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
                Powód korekty:
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  resize: 'vertical'
                }}
                placeholder="Podaj powód korekty..."
              />
            </div>

            {/* Podsumowanie */}
            {getTotalCorrection() > 0 && (
              <div style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                marginBottom: '20px'
              }}>
                <h4>Podsumowanie korekty:</h4>
                <p>Łączna kwota korekty: <strong>-{getTotalCorrection().toFixed(2)} zł</strong></p>
                <p>Pozycji do korekty: {correctionItems.filter(item => item.selected).length}</p>
              </div>
            )}

            {/* Przyciski */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Anuluj
              </button>
              <button 
                type="submit"
                disabled={loading || getTotalCorrection() === 0}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: getTotalCorrection() > 0 ? '#dc3545' : '#ccc',
                  color: 'white',
                  cursor: getTotalCorrection() > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                {loading ? 'Wykonywanie...' : 'Wykonaj korektę'}
              </button>
            </div>
          </form>
        )}

        {/* Poprzednie korekty */}
        {transactionDetails?.corrections && transactionDetails.corrections.length > 0 && (
          <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #dee2e6' }}>
            <h4>Poprzednie korekty:</h4>
            {transactionDetails.corrections.map(correction => (
              <div key={correction.id} style={{
                padding: '10px',
                marginBottom: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                fontSize: '14px'
              }}>
                <div>Numer: {correction.numer_transakcji}</div>
                <div>Data: {correction.data_transakcji} {correction.czas_transakcji}</div>
                <div>Kwota: {correction.suma_brutto?.toFixed(2)} zł</div>
                <div>Uwagi: {correction.uwagi}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CorrectionModal;
