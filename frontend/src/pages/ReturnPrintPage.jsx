import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const ReturnPrintPage = () => {
  const { transactionId } = useParams();
  const [returns, setReturns] = useState([]);
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReturnData();
  }, [transactionId]);

  const loadReturnData = async () => {
    try {
      // Pobierz zwroty dla transakcji
      const returnsResponse = await api.get(`/pos/transaction/${transactionId}/returns`);
      
      if (returnsResponse.data.success) {
        setReturns(returnsResponse.data.data.returns || []);
      }
      
      // Pobierz dane transakcji
      const transactionResponse = await api.get(`/pos/transaction/${transactionId}`);
      
      if (transactionResponse.data.success) {
        setTransaction(transactionResponse.data.data);
      }
      
    } catch (err) {
      console.error('Błąd:', err);
      setError('Błąd pobierania danych zwrotu');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getPaymentMethodText = (method) => {
    const methods = {
      'gotowka': 'Gotówka',
      'karta': 'Karta płatnicza',
      'blik': 'BLIK'
    };
    return methods[method] || method;
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="spinner-border text-primary" role="status"></div>
        <p>Ładowanie danych zwrotu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#dc3545' }}>
        <h3>❌ Błąd</h3>
        <p>{error}</p>
        <button onClick={() => window.close()} className="btn btn-secondary">
          Zamknij
        </button>
      </div>
    );
  }

  if (returns.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h3>📭 Brak zwrotów</h3>
        <p>Dla tej transakcji nie znaleziono żadnych zwrotów.</p>
        <button onClick={() => window.close()} className="btn btn-secondary">
          Zamknij
        </button>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            body { margin: 10mm; font-size: 12px; }
            .page-break { page-break-before: always; }
          }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
          .return-document { 
            max-width: 800px; 
            margin: 20px auto; 
            padding: 20px;
            border: 1px solid #ddd;
            background: white;
          }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #dc3545; padding-bottom: 15px; }
          .header h1 { margin: 0; font-size: 20px; color: #dc3545; }
          .header h2 { margin: 5px 0; font-size: 16px; font-weight: normal; }
          .info-section { margin-bottom: 15px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; padding: 3px 0; border-bottom: 1px dotted #eee; }
          .info-label { color: #666; }
          .info-value { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th { background: #f5f5f5; padding: 8px; text-align: left; border: 1px solid #ddd; font-size: 11px; }
          td { padding: 8px; border: 1px solid #ddd; }
          .total-section { margin-top: 15px; text-align: right; padding: 10px; background: #f8f9fa; border-radius: 4px; }
          .total-amount { font-size: 20px; font-weight: bold; color: #dc3545; }
          .signature-section { margin-top: 50px; display: flex; justify-content: space-between; }
          .signature-box { width: 45%; text-align: center; }
          .signature-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 5px; font-size: 11px; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px dashed #ccc; padding-top: 10px; }
          .print-button { 
            position: fixed; 
            top: 20px; 
            right: 20px; 
            padding: 15px 30px; 
            font-size: 16px; 
            cursor: pointer; 
            background: #dc3545; 
            color: white; 
            border: none; 
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          }
          .print-button:hover { background: #c82333; }
        `}
      </style>

      <button className="print-button no-print" onClick={handlePrint}>
        🖨️ Drukuj wszystkie zwroty
      </button>

      {returns.map((returnItem, index) => (
        <div key={returnItem.id} className={`return-document ${index > 0 ? 'page-break' : ''}`}>
          <div className="header">
            <h1>🔄 DOKUMENT ZWROTU TOWARU</h1>
            <h2>{returnItem.numer_zwrotu}</h2>
          </div>
          
          <div className="info-section">
            <div className="info-row">
              <span className="info-label">Data zwrotu:</span>
              <span className="info-value">{returnItem.data_zwrotu} {returnItem.czas_zwrotu}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Paragon źródłowy:</span>
              <span className="info-value">{returnItem.numer_paragonu || transaction?.numer_paragonu || '-'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Data paragonu:</span>
              <span className="info-value">{transaction?.data_transakcji || '-'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Kasjer:</span>
              <span className="info-value">{returnItem.kasjer_login}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Powód zwrotu:</span>
              <span className="info-value">{returnItem.powod_zwrotu || '-'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Forma zwrotu:</span>
              <span className="info-value">{getPaymentMethodText(returnItem.forma_platnosci)}</span>
            </div>
          </div>
          
          <h3 style={{ margin: '15px 0 10px', fontSize: '14px' }}>Zwracane produkty:</h3>
          <table>
            <thead>
              <tr>
                <th style={{ width: '30px' }}>Lp.</th>
                <th>Nazwa produktu</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Kod</th>
                <th style={{ width: '60px', textAlign: 'center' }}>Ilość</th>
                <th style={{ width: '80px', textAlign: 'right' }}>Cena</th>
                <th style={{ width: '90px', textAlign: 'right' }}>Wartość</th>
              </tr>
            </thead>
            <tbody>
              {returnItem.pozycje && returnItem.pozycje.map((item, idx) => (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td>{item.nazwa_produktu}</td>
                  <td style={{ textAlign: 'center' }}>{item.kod_produktu || '-'}</td>
                  <td style={{ textAlign: 'center' }}>{item.ilosc_zwracana}</td>
                  <td style={{ textAlign: 'right' }}>{parseFloat(item.cena_jednostkowa_brutto).toFixed(2)} zł</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{parseFloat(item.wartosc_brutto).toFixed(2)} zł</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="total-section">
            <span>Łączna kwota zwrotu: </span>
            <span className="total-amount">{parseFloat(returnItem.suma_zwrotu_brutto).toFixed(2)} zł</span>
          </div>
          
          <div className="signature-section">
            <div className="signature-box">
              <div className="signature-line">Podpis klienta</div>
            </div>
            <div className="signature-box">
              <div className="signature-line">Podpis sprzedawcy</div>
            </div>
          </div>
          
          <div className="footer">
            Dokument wygenerowany elektronicznie • System POS v3 • {new Date().toLocaleDateString('pl-PL')}
          </div>
        </div>
      ))}

      <div className="no-print" style={{ textAlign: 'center', margin: '30px', paddingBottom: '50px' }}>
        <button 
          onClick={handlePrint} 
          style={{ 
            padding: '15px 40px', 
            fontSize: '16px', 
            cursor: 'pointer', 
            background: '#dc3545', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px',
            marginRight: '10px'
          }}
        >
          🖨️ Drukuj dokumenty zwrotu
        </button>
        <button 
          onClick={() => window.close()} 
          style={{ 
            padding: '15px 40px', 
            fontSize: '16px', 
            cursor: 'pointer', 
            background: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px' 
          }}
        >
          ✕ Zamknij
        </button>
      </div>
    </>
  );
};

export default ReturnPrintPage;
