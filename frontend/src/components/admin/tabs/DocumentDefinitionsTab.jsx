import React, { useState, useEffect } from 'react';

const DocumentDefinitionsTab = () => {
  const [documentDefinitions, setDocumentDefinitions] = useState([]);
  const [documentDefinitionsLoading, setDocumentDefinitionsLoading] = useState(true);
  const [previewNumber, setPreviewNumber] = useState('');
  const [newDefinition, setNewDefinition] = useState({
    document_type: '',
    symbol: '',
    format_template: '{symbol}-{number}-{month}-{year}-{warehouse}',
    description: ''
  });

  useEffect(() => {
    loadDocumentDefinitions();
  }, []);

  const loadDocumentDefinitions = async () => {
    try {
      setDocumentDefinitionsLoading(true);
      const response = await fetch('http://localhost:8000/api/admin/document-definitions');
      if (response.ok) {
        const data = await response.json();
        setDocumentDefinitions(data.data || []);
      } else {
        console.error('Błąd pobierania definicji dokumentów');
      }
    } catch (error) {
      console.error('Błąd:', error);
    } finally {
      setDocumentDefinitionsLoading(false);
    }
  };

  const handleCreateDefinition = async () => {
    if (!newDefinition.document_type.trim() || !newDefinition.symbol.trim()) {
      alert('Typ dokumentu i symbol są wymagane');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/admin/document-definitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newDefinition)
      });

      if (response.ok) {
        alert('Definicja dokumentu została dodana pomyślnie');
        setNewDefinition({
          document_type: '',
          symbol: '',
          format_template: '{symbol}-{number}-{month}-{year}-{warehouse}',
          description: ''
        });
        await loadDocumentDefinitions();
      } else {
        const error = await response.json();
        alert(error.message || 'Błąd podczas dodawania definicji');
      }
    } catch (error) {
      console.error('Błąd:', error);
      alert('Błąd podczas dodawania definicji');
    }
  };

  const handleGeneratePreview = async (docType) => {
    try {
      const response = await fetch(`http://localhost:8000/api/admin/document-definitions/${docType}/preview`);
      if (response.ok) {
        const data = await response.json();
        setPreviewNumber(data.preview_number);
        setTimeout(() => setPreviewNumber(''), 5000); // Ukryj po 5 sekundach
      } else {
        alert('Błąd podczas generowania podglądu');
      }
    } catch (error) {
      console.error('Błąd:', error);
      alert('Błąd podczas generowania podglądu');
    }
  };

  const handleResetCounter = async (docType) => {
    if (!window.confirm('Czy na pewno chcesz zresetować licznik? Ta operacja jest nieodwracalna.')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/admin/document-definitions/${docType}/reset`, {
        method: 'POST'
      });

      if (response.ok) {
        alert('Licznik został zresetowany pomyślnie');
        await loadDocumentDefinitions();
      } else {
        const error = await response.json();
        alert(error.message || 'Błąd podczas resetowania licznika');
      }
    } catch (error) {
      console.error('Błąd:', error);
      alert('Błąd podczas resetowania licznika');
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        marginBottom: '2rem',
        padding: '1.5rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '0.5rem',
        border: '1px solid #e9ecef'
      }}>
        <h3 style={{
          margin: '0 0 1rem 0',
          color: '#495057',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          📄 Definicje dokumentów
        </h3>
        <p style={{ margin: '0 0 1rem 0', color: '#6c757d' }}>
          Zarządzaj formatami numeracji dokumentów (paragony, faktury, itp.)
        </p>
      </div>

      {/* Formularz dodawania nowej definicji */}
      <div style={{
        marginBottom: '2rem',
        padding: '1.5rem',
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        border: '1px solid #e9ecef'
      }}>
        <h4 style={{ margin: '0 0 1rem 0', color: '#495057' }}>Dodaj nową definicję</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Typ dokumentu</label>
            <input
              type="text"
              value={newDefinition.document_type}
              onChange={(e) => setNewDefinition({...newDefinition, document_type: e.target.value})}
              placeholder="np. paragon, faktura"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '0.25rem'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Symbol</label>
            <input
              type="text"
              value={newDefinition.symbol}
              onChange={(e) => setNewDefinition({...newDefinition, symbol: e.target.value})}
              placeholder="np. PA, FV"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '0.25rem'
              }}
            />
          </div>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Format numeru</label>
          <input
            type="text"
            value={newDefinition.format_template}
            onChange={(e) => setNewDefinition({...newDefinition, format_template: e.target.value})}
            placeholder="{symbol}-{number}-{month}-{year}-{warehouse}"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '0.25rem'
            }}
          />
          <small style={{ color: '#6c757d' }}>
            Dostępne zmienne: {'{symbol}, {number}, {month}, {year}, {warehouse}'}
          </small>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Opis</label>
          <input
            type="text"
            value={newDefinition.description}
            onChange={(e) => setNewDefinition({...newDefinition, description: e.target.value})}
            placeholder="Opcjonalny opis definicji"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '0.25rem'
            }}
          />
        </div>
        <button
          onClick={handleCreateDefinition}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer'
          }}
        >
          ➕ Dodaj definicję
        </button>
      </div>

      {/* Lista istniejących definicji */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        border: '1px solid #e9ecef'
      }}>
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e9ecef',
          backgroundColor: '#f8f9fa'
        }}>
          <h4 style={{ margin: 0, color: '#495057' }}>Istniejące definicje</h4>
        </div>
        
        {documentDefinitionsLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div>Ładowanie...</div>
          </div>
        ) : documentDefinitions.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
            Brak definicji dokumentów
          </div>
        ) : (
          <div style={{ padding: '1rem' }}>
            {documentDefinitions.map((definition) => (
              <div
                key={definition.id}
                style={{
                  padding: '1rem',
                  marginBottom: '1rem',
                  border: '1px solid #e9ecef',
                  borderRadius: '0.25rem',
                  backgroundColor: definition.active ? '#f8fff8' : '#fff8f8'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h5 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>
                      {definition.document_type.toUpperCase()} - {definition.symbol}
                    </h5>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#6c757d' }}>
                      <strong>Format:</strong> {definition.format_template}
                    </p>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#6c757d' }}>
                      <strong>Aktualny numer:</strong> {definition.current_number}
                    </p>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#6c757d' }}>
                      <strong>Status:</strong> {definition.active ? '🟢 Aktywny' : '🔴 Nieaktywny'}
                    </p>
                    {definition.description && (
                      <p style={{ margin: '0 0 0.5rem 0', color: '#6c757d', fontStyle: 'italic' }}>
                        {definition.description}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                    <button
                      onClick={() => handleGeneratePreview(definition.document_type)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      👀 Podgląd
                    </button>
                    <button
                      onClick={() => handleResetCounter(definition.document_type)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#ffc107',
                        color: '#212529',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      🔄 Reset
                    </button>
                  </div>
                </div>
                {previewNumber && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#e7f3ff',
                    borderRadius: '0.25rem',
                    border: '1px solid #b3d7ff'
                  }}>
                    <strong>Podgląd następnego numeru:</strong> {previewNumber}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentDefinitionsTab;
