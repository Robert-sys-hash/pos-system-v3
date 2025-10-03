import React, { useState, useEffect } from 'react';
import { invoiceTemplatesService } from '../../services/invoiceTemplatesService';

const InvoiceTemplatesManager = () => {
  const [templates, setTemplates] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [defaultTemplate, setDefaultTemplate] = useState('classic');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testInvoiceId, setTestInvoiceId] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await invoiceTemplatesService.getTemplates();
      
      if (response.success) {
        setTemplates(response.data.templates);
        setDefaultTemplate(response.data.default);
        setSelectedTemplate(response.data.default);
      } else {
        setError('Błąd ładowania szablonów: ' + response.message);
      }
    } catch (err) {
      setError('Błąd połączenia: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplatePreview = async (templateName) => {
    try {
      setError('');
      setSuccess('Generowanie podglądu...');
      
      const blob = await invoiceTemplatesService.getTemplatePreview(templateName);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `podglad_${templateName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setSuccess(`Podgląd szablonu "${templates[templateName]}" został pobrany!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Błąd pobierania podglądu: ' + err.message);
    }
  };

  const openTemplatePreview = (templateName) => {
    const url = invoiceTemplatesService.getTemplatePreviewUrl(templateName);
    window.open(url, '_blank');
  };

  const testTemplateWithInvoice = async () => {
    if (!testInvoiceId) {
      setError('Wprowadź ID faktury do testu!');
      return;
    }
    
    if (!selectedTemplate) {
      setError('Wybierz szablon!');
      return;
    }

    try {
      setError('');
      setSuccess('Generowanie PDF faktury...');
      
      const blob = await invoiceTemplatesService.getInvoicePdfWithTemplate(
        testInvoiceId, 
        selectedTemplate
      );
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `faktura_${testInvoiceId}_${selectedTemplate}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setSuccess(`PDF faktury ${testInvoiceId} z szablonem "${templates[selectedTemplate]}" został pobrany!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Błąd generowania PDF: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>⏳ Ładowanie szablonów...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px', color: '#333' }}>
        🎨 Zarządzanie Szablonami Faktur
      </h2>

      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc',
          borderRadius: '4px',
          marginBottom: '15px',
          color: '#c33'
        }}>
          ❌ {error}
        </div>
      )}

      {success && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#efe', 
          border: '1px solid #cfc',
          borderRadius: '4px',
          marginBottom: '15px',
          color: '#3c3'
        }}>
          ✅ {success}
        </div>
      )}

      {/* Sekcja szablonów */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '20px',
        marginBottom: '30px'
      }}>
        {Object.entries(templates).map(([key, name]) => (
          <div 
            key={key}
            style={{
              border: selectedTemplate === key ? '2px solid #007bff' : '1px solid #ddd',
              borderRadius: '8px',
              padding: '15px',
              backgroundColor: selectedTemplate === key ? '#f8f9ff' : '#f9f9f9',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onClick={() => setSelectedTemplate(key)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#333' }}>
                {name}
                {defaultTemplate === key && <span style={{ color: '#28a745', fontSize: '12px', marginLeft: '8px' }}>(domyślny)</span>}
              </h3>
              <input 
                type="radio" 
                checked={selectedTemplate === key}
                onChange={() => setSelectedTemplate(key)}
                style={{ margin: 0 }}
              />
            </div>
            
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
              Szablon: <code>{key}</code>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openTemplatePreview(key);
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                👁️ Podgląd
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadTemplatePreview(key);
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                💾 Pobierz
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sekcja testowania */}
      <div style={{ 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '20px',
        backgroundColor: '#f8f9fa'
      }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>🧪 Test Szablonów na Prawdziwej Fakturze</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              ID Faktury:
            </label>
            <input
              type="number"
              value={testInvoiceId}
              onChange={(e) => setTestInvoiceId(e.target.value)}
              placeholder="np. 4"
              min="1"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Wybrany Szablon:
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            >
              <option value="">Wybierz szablon...</option>
              {Object.entries(templates).map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={testTemplateWithInvoice}
            disabled={!testInvoiceId || !selectedTemplate}
            style={{
              padding: '10px 20px',
              backgroundColor: testInvoiceId && selectedTemplate ? '#dc3545' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: testInvoiceId && selectedTemplate ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap'
            }}
          >
            🚀 Generuj PDF
          </button>
        </div>
        
        <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
          💡 <strong>Wskazówka:</strong> Wprowadź ID istniejącej faktury i wybierz szablon, 
          aby wygenerować PDF z prawdziwymi danymi.
        </div>
      </div>

      {/* Informacje o szablonach */}
      <div style={{ marginTop: '30px', fontSize: '14px', color: '#666' }}>
        <h4>ℹ️ Informacje o Szablonach:</h4>
        <ul style={{ paddingLeft: '20px' }}>
          <li><strong>Klasyczny:</strong> Tradycyjny układ faktury z prostymi tabelami</li>
          <li><strong>Nowoczesny:</strong> Stylowy design z kolorowymi elementami i logo</li>
          <li><strong>Minimalistyczny:</strong> Czysty, nowoczesny design bez zbędnych elementów</li>
        </ul>
        
        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
          <strong>🔧 Funkcje systemu szablonów:</strong>
          <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
            <li>Automatyczna obsługa polskich znaków</li>
            <li>Dostosowywalne fonty i kolory</li>
            <li>Responsywne tabele z długimi nazwami produktów</li>
            <li>Dynamiczne obliczanie kwot</li>
            <li>Możliwość dodawania nowych szablonów</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTemplatesManager;
