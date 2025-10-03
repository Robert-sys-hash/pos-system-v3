import React, { useState, useEffect } from 'react';
import templateEditorService from '../../services/templateEditorService';

const InvoiceTemplateEditor = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [showVariables, setShowVariables] = useState({});
  const [expandedFields, setExpandedFields] = useState({});
  const [selectedFieldId, setSelectedFieldId] = useState(null);

  // Lista dostępnych zmiennych/placeholderów
  const availableVariables = [
    // Podstawowe dane faktury
    { name: '{numer_faktury}', description: 'Numer faktury' },
    { name: '{numer_paragonu}', description: 'Numer paragonu' },
    { name: '{data_wystawienia}', description: 'Data wystawienia' },
    { name: '{data_sprzedazy}', description: 'Data sprzedaży' },
    { name: '{termin_platnosci}', description: 'Termin płatności' },
    { name: '{sposob_platnosci}', description: 'Sposób płatności' },
    
    // Dane sprzedawcy
    { name: '{sprzedawca_nazwa}', description: 'Nazwa sprzedawcy' },
    { name: '{sprzedawca_adres}', description: 'Adres sprzedawcy' },
    { name: '{sprzedawca_miasto}', description: 'Miasto sprzedawcy' },
    { name: '{sprzedawca_kod_pocztowy}', description: 'Kod pocztowy sprzedawcy' },
    { name: '{sprzedawca_nip}', description: 'NIP sprzedawcy' },
    { name: '{sprzedawca_numer_konta}', description: 'Numer konta sprzedawcy' },
    { name: '{sprzedawca_telefon}', description: 'Telefon sprzedawcy' },
    { name: '{sprzedawca_email}', description: 'Email sprzedawcy' },
    
    // Dane nabywcy
    { name: '{nabywca_nazwa}', description: 'Nazwa nabywcy' },
    { name: '{nabywca_adres}', description: 'Adres nabywcy' },
    { name: '{nabywca_miasto}', description: 'Miasto nabywcy' },
    { name: '{nabywca_kod_pocztowy}', description: 'Kod pocztowy nabywcy' },
    { name: '{nabywca_nip}', description: 'NIP nabywcy' },
    { name: '{nabywca_telefon}', description: 'Telefon nabywcy' },
    { name: '{nabywca_email}', description: 'Email nabywcy' },
    
    // Podsumowania finansowe
    { name: '{suma_netto}', description: 'Suma netto' },
    { name: '{suma_vat}', description: 'Suma VAT' },
    { name: '{suma_brutto}', description: 'Suma brutto' },
    { name: '{kwota_slownie}', description: 'Kwota słownie' },
    
    // Dodatkowe
    { name: '{uwagi}', description: 'Uwagi' },
    { name: '{miejsce_wystawienia}', description: 'Miejsce wystawienia' },
    { name: '{waluta}', description: 'Waluta' },
    { name: '{dzisiejsza_data}', description: 'Dzisiejsza data' },
    { name: '{rok}', description: 'Rok' },
    { name: '{miesiac}', description: 'Miesiąc' },
    { name: '{dzien}', description: 'Dzień' }
  ];

  // Initialize empty template structure
  const createEmptyTemplate = () => ({
    id: null,
    name: '',
    template_data: {
      fields: [],
      settings: {
        page_size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        font_family: 'Arial',
        font_size: 10
      }
    }
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await templateEditorService.getTemplates();
      setTemplates(response);
    } catch (err) {
      setError('Błąd podczas ładowania szablonów');
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedTemplate(createEmptyTemplate());
    setIsEditing(true);
    setTemplateName('');
    setError(null);
    setSuccess(null);
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplate({ ...template });
    setTemplateName(template.name);
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      setError('Nazwa szablonu jest wymagana');
      return;
    }

    if (!selectedTemplate.template_data.fields.length) {
      setError('Szablon musi zawierać przynajmniej jedno pole');
      return;
    }

    try {
      setLoading(true);
      const templateToSave = {
        ...selectedTemplate,
        name: templateName
      };

      if (selectedTemplate.id) {
        await templateEditorService.updateTemplate(selectedTemplate.id, templateToSave);
        setSuccess('Szablon został zaktualizowany');
      } else {
        await templateEditorService.createTemplate(templateToSave);
        setSuccess('Szablon został utworzony');
      }

      await loadTemplates();
      setIsEditing(false);
      setSelectedTemplate(null);
      setTemplateName('');
    } catch (err) {
      setError('Błąd podczas zapisywania szablonu');
      console.error('Error saving template:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten szablon?')) {
      return;
    }

    try {
      setLoading(true);
      await templateEditorService.deleteTemplate(templateId);
      await loadTemplates();
      setSuccess('Szablon został usunięty');
      if (selectedTemplate && selectedTemplate.id === templateId) {
        setSelectedTemplate(null);
        setIsEditing(false);
      }
    } catch (err) {
      setError('Błąd podczas usuwania szablonu');
      console.error('Error deleting template:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = (type) => {
    if (!selectedTemplate) return;

    const newField = {
      id: Date.now().toString(),
      type,
      x: 50,
      y: 100 + (selectedTemplate.template_data.fields.length * 30),
      width: type === 'table' ? 400 : 200,
      height: type === 'table' ? 150 : 20,
      content: type === 'text' ? 'Nowy tekst' : type === 'table' ? 'tabela' : 'custom_field',
      style: {
        fontSize: 10,
        fontWeight: 'normal',
        textAlign: 'left',
        color: '#000000'
      }
    };

    setSelectedTemplate(prev => ({
      ...prev,
      template_data: {
        ...prev.template_data,
        fields: [...prev.template_data.fields, newField]
      }
    }));
  };

  const handleUpdateField = (fieldId, updates) => {
    setSelectedTemplate(prev => ({
      ...prev,
      template_data: {
        ...prev.template_data,
        fields: prev.template_data.fields.map(field =>
          field.id === fieldId ? { ...field, ...updates } : field
        )
      }
    }));
  };

  const handleRemoveField = (fieldId) => {
    setSelectedTemplate(prev => ({
      ...prev,
      template_data: {
        ...prev.template_data,
        fields: prev.template_data.fields.filter(field => field.id !== fieldId)
      }
    }));
  };

  const handlePreview = async () => {
    if (!selectedTemplate) return;

    try {
      setLoading(true);
      const mockData = {
        invoice_number: "FAK/2024/0001",
        issue_date: "2024-09-05",
        sale_date: "2024-09-05",
        // Nie wysyłamy danych sprzedawcy - backend ma użyć realnych danych z bazy
        buyer: {
          name: "Klient Testowy",
          address: "ul. Testowa 456",
          city: "11-111 Kraków",
          nip: "0987654321"
        },
        items: [
          {
            name: "Produkt 1",
            quantity: 2,
            unit: "szt",
            net_price: 100.00,
            vat_rate: 23,
            net_value: 200.00,
            vat_value: 46.00,
            gross_value: 246.00
          },
          {
            name: "Produkt 2",
            quantity: 1,
            unit: "szt",
            net_price: 50.00,
            vat_rate: 23,
            net_value: 50.00,
            vat_value: 11.50,
            gross_value: 61.50
          }
        ],
        totals: {
          net_total: 250.00,
          vat_total: 57.50,
          gross_total: 307.50
        }
      };

      const previewUrl = await templateEditorService.previewTemplate({
        ...selectedTemplate,
        name: templateName || 'Podgląd szablonu'
      }, mockData);
      
      setPreviewData(previewUrl);
    } catch (err) {
      setError('Błąd podczas generowania podglądu');
      console.error('Error generating preview:', err);
    } finally {
      setLoading(false);
    }
  };

  // Funkcja do wstawiania zmiennej do pola treści
  const insertVariable = (fieldId, variableName) => {
    const field = selectedTemplate.template_data.fields.find(f => f.id === fieldId);
    if (field) {
      const currentContent = field.content || '';
      const newContent = currentContent + variableName;
      handleUpdateField(fieldId, { content: newContent });
    }
  };

  // Funkcja do wstawiania zmiennej w nowej linii
  const insertVariableNewLine = (fieldId, variableName) => {
    const field = selectedTemplate.template_data.fields.find(f => f.id === fieldId);
    if (field) {
      const currentContent = field.content || '';
      const newContent = currentContent + (currentContent ? '\n' : '') + variableName;
      handleUpdateField(fieldId, { content: newContent });
    }
  };

  // Funkcja do przełączania widoczności panelu zmiennych
  const toggleVariablesPanel = (fieldId) => {
    setShowVariables(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }));
  };

  // Funkcje do obsługi zwijania/rozwijania pól
  const toggleFieldExpansion = (fieldId) => {
    setExpandedFields(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }));
  };

  const selectField = (fieldId) => {
    setSelectedFieldId(fieldId);
    setExpandedFields(prev => ({
      ...prev,
      [fieldId]: true
    }));
  };

  const expandAllFields = () => {
    if (selectedTemplate?.template_data?.fields) {
      const allExpanded = {};
      selectedTemplate.template_data.fields.forEach(field => {
        allExpanded[field.id] = true;
      });
      setExpandedFields(allExpanded);
    }
  };

  const collapseAllFields = () => {
    setExpandedFields({});
  };

  // Funkcje do przesuwania pól
  const moveFieldUp = (fieldId) => {
    const fields = selectedTemplate.template_data.fields;
    const currentIndex = fields.findIndex(f => f.id === fieldId);
    
    if (currentIndex > 0) {
      const newFields = [...fields];
      [newFields[currentIndex - 1], newFields[currentIndex]] = [newFields[currentIndex], newFields[currentIndex - 1]];
      
      setSelectedTemplate(prev => ({
        ...prev,
        template_data: {
          ...prev.template_data,
          fields: newFields
        }
      }));
    }
  };

  const moveFieldDown = (fieldId) => {
    const fields = selectedTemplate.template_data.fields;
    const currentIndex = fields.findIndex(f => f.id === fieldId);
    
    if (currentIndex < fields.length - 1) {
      const newFields = [...fields];
      [newFields[currentIndex], newFields[currentIndex + 1]] = [newFields[currentIndex + 1], newFields[currentIndex]];
      
      setSelectedTemplate(prev => ({
        ...prev,
        template_data: {
          ...prev.template_data,
          fields: newFields
        }
      }));
    }
  };

  // Funkcja do przesuwania pola na konkretną pozycję
  const moveFieldToPosition = (fieldId, newPosition) => {
    const fields = selectedTemplate.template_data.fields;
    const currentIndex = fields.findIndex(f => f.id === fieldId);
    
    if (currentIndex !== -1 && newPosition >= 0 && newPosition < fields.length) {
      const newFields = [...fields];
      const [movedField] = newFields.splice(currentIndex, 1);
      newFields.splice(newPosition, 0, movedField);
      
      setSelectedTemplate(prev => ({
        ...prev,
        template_data: {
          ...prev.template_data,
          fields: newFields
        }
      }));
    }
  };

  const renderFieldEditor = (field) => {
    const isExpanded = expandedFields[field.id];
    const isSelected = selectedFieldId === field.id;
    
    return (
      <div key={field.id} style={{
        border: `2px solid ${isSelected ? '#007bff' : '#ddd'}`,
        borderRadius: '4px',
        padding: '10px',
        marginBottom: '10px',
        backgroundColor: isSelected ? '#f8f9fa' : '#f9f9f9'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isExpanded ? '10px' : '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <button
              onClick={() => toggleFieldExpansion(field.id)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '2px'
              }}
              title={isExpanded ? 'Zwiń pole' : 'Rozwiń pole'}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
            <strong style={{ cursor: 'pointer' }} onClick={() => selectField(field.id)}>
              {getFieldTypeLabel(field.type)}: {field.content}
            </strong>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => moveFieldUp(field.id)}
              disabled={selectedTemplate.template_data.fields.findIndex(f => f.id === field.id) === 0}
              style={{
                backgroundColor: selectedTemplate.template_data.fields.findIndex(f => f.id === field.id) === 0 ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: selectedTemplate.template_data.fields.findIndex(f => f.id === field.id) === 0 ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
              title="Przesuń w górę"
            >
              ↑
            </button>
            <button
              onClick={() => moveFieldDown(field.id)}
              disabled={selectedTemplate.template_data.fields.findIndex(f => f.id === field.id) === selectedTemplate.template_data.fields.length - 1}
              style={{
                backgroundColor: selectedTemplate.template_data.fields.findIndex(f => f.id === field.id) === selectedTemplate.template_data.fields.length - 1 ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: selectedTemplate.template_data.fields.findIndex(f => f.id === field.id) === selectedTemplate.template_data.fields.length - 1 ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
              title="Przesuń w dół"
            >
              ↓
            </button>
            <button
              onClick={() => handleRemoveField(field.id)}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Usuń
            </button>
          </div>
        </div>

        {isExpanded && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', marginRight: '8px' }}>
              Treść:
            </label>
            <button
              type="button"
              onClick={() => toggleVariablesPanel(field.id)}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                padding: '2px 6px',
                cursor: 'pointer',
                fontSize: '10px'
              }}
            >
              Zmienne
            </button>
          </div>
          <input
            type="text"
            value={field.content}
            onChange={(e) => handleUpdateField(field.id, { content: e.target.value })}
            style={{
              width: '100%',
              padding: '6px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px'
            }}
            placeholder="Wpisz tekst lub użyj zmiennych np. {numer_faktury}"
          />
          {showVariables[field.id] && (
            <div style={{
              marginTop: '5px',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: '#f8f9fa',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '5px' }}>
                Dostępne zmienne:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {availableVariables.map((variable, index) => (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#666' }}>
                      {variable.name}
                    </div>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button
                        type="button"
                        onClick={() => insertVariable(field.id, variable.name)}
                        style={{
                          backgroundColor: '#e9ecef',
                          border: '1px solid #ced4da',
                          borderRadius: '3px',
                          padding: '3px 5px',
                          cursor: 'pointer',
                          fontSize: '9px',
                          flex: 1
                        }}
                        title={`Wstaw ${variable.name} obok tekstu`}
                      >
                        + Obok
                      </button>
                      <button
                        type="button"
                        onClick={() => insertVariableNewLine(field.id, variable.name)}
                        style={{
                          backgroundColor: '#d4edda',
                          border: '1px solid #c3e6cb',
                          borderRadius: '3px',
                          padding: '3px 5px',
                          cursor: 'pointer',
                          fontSize: '9px',
                          flex: 1
                        }}
                        title={`Wstaw ${variable.name} w nowej linii`}
                      >
                        + Nowa linia
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>
            Rozmiar czcionki:
          </label>
          <input
            type="number"
            value={field.style.fontSize}
            onChange={(e) => handleUpdateField(field.id, { 
              style: { ...field.style, fontSize: parseInt(e.target.value) || 10 }
            })}
            style={{
              width: '100%',
              padding: '6px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px'
            }}
            min="6"
            max="72"
          />
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>
            X:
          </label>
          <input
            type="number"
            value={field.x}
            onChange={(e) => handleUpdateField(field.id, { x: parseInt(e.target.value) || 0 })}
            style={{
              width: '100%',
              padding: '6px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>
            Y:
          </label>
          <input
            type="number"
            value={field.y}
            onChange={(e) => handleUpdateField(field.id, { y: parseInt(e.target.value) || 0 })}
            style={{
              width: '100%',
              padding: '6px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>
            Szerokość:
          </label>
          <input
            type="number"
            value={field.width}
            onChange={(e) => handleUpdateField(field.id, { width: parseInt(e.target.value) || 100 })}
            style={{
              width: '100%',
              padding: '6px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>
            Wysokość:
          </label>
          <input
            type="number"
            value={field.height}
            onChange={(e) => handleUpdateField(field.id, { height: parseInt(e.target.value) || 20 })}
            style={{
              width: '100%',
              padding: '6px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          />
        </div>
      </div>
      
      {/* Sekcja pozycji w kolejności */}
      <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#f0f8ff', borderRadius: '4px', border: '1px solid #007bff' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#007bff' }}>
          Pozycja w kolejności:
        </label>
        <select
          value={selectedTemplate.template_data.fields.findIndex(f => f.id === field.id)}
          onChange={(e) => moveFieldToPosition(field.id, parseInt(e.target.value))}
          style={{
            width: '100%',
            padding: '6px',
            border: '1px solid #007bff',
            borderRadius: '4px',
            fontSize: '12px',
            backgroundColor: 'white'
          }}
        >
          {selectedTemplate.template_data.fields.map((_, index) => (
            <option key={index} value={index}>
              {index + 1}. pozycja
            </option>
          ))}
        </select>
        <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
          Wybierz pozycję, na którą chcesz przenieść to pole
        </div>
      </div>
          </div>
        )}
      </div>
    );
  };

  const renderTemplatesList = () => (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ marginBottom: '15px', color: '#333' }}>Zapisane szablony</h3>
      {templates.length === 0 ? (
        <p style={{ color: '#666', fontStyle: 'italic' }}>Brak zapisanych szablonów</p>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {templates.map(template => (
            <div key={template.id} style={{
              border: '1px solid #ddd',
              borderRadius: '4px',
              padding: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#fff'
            }}>
              <div>
                <strong>{template.name}</strong>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Pól: {template.template_data?.fields?.length || 0}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleEditTemplate(template)}
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Edytuj
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Usuń
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderEditor = () => (
    <div>
      <h3 style={{ marginBottom: '15px', color: '#333' }}>
        {selectedTemplate?.id ? 'Edytuj szablon' : 'Nowy szablon'}
      </h3>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
          Nazwa szablonu:
        </label>
        <input
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="Wprowadź nazwę szablonu"
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
          Dodaj pole:
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => handleAddField('text')}
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              cursor: 'pointer'
            }}
          >
            📝 Tekst
          </button>
          <button
            onClick={() => handleAddField('table')}
            style={{
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              cursor: 'pointer'
            }}
          >
            📋 Tabela
          </button>
          <button
            onClick={() => handleAddField('custom')}
            style={{
              backgroundColor: '#ffc107',
              color: 'black',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              cursor: 'pointer'
            }}
          >
            ⚙️ Pole niestandardowe
          </button>
        </div>
      </div>

      {selectedTemplate?.template_data?.fields?.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ marginBottom: '0', color: '#333' }}>Pola szablonu:</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={expandAllFields}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
                title="Rozwiń wszystkie pola"
              >
                ▼ Rozwiń wszystkie
              </button>
              <button
                onClick={collapseAllFields}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
                title="Zwiń wszystkie pola"
              >
                ▶ Zwiń wszystkie
              </button>
            </div>
          </div>
          {selectedTemplate.template_data.fields.map(renderFieldEditor)}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button
          onClick={handleSaveTemplate}
          disabled={loading}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '10px 20px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Zapisywanie...' : 'Zapisz szablon'}
        </button>
        
        <button
          onClick={handlePreview}
          disabled={loading || !selectedTemplate?.template_data?.fields?.length}
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '10px 20px',
            cursor: loading || !selectedTemplate?.template_data?.fields?.length ? 'not-allowed' : 'pointer',
            opacity: loading || !selectedTemplate?.template_data?.fields?.length ? 0.6 : 1
          }}
        >
          {loading ? 'Generowanie...' : 'Podgląd PDF'}
        </button>
        
        <button
          onClick={() => {
            setIsEditing(false);
            setSelectedTemplate(null);
            setTemplateName('');
            setPreviewData(null);
          }}
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '10px 20px',
            cursor: 'pointer'
          }}
        >
          Anuluj
        </button>
      </div>

      {previewData && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ marginBottom: '10px', color: '#333' }}>Podgląd PDF:</h4>
          <iframe
            src={previewData}
            style={{
              width: '100%',
              height: '600px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
            title="Podgląd szablonu"
          />
        </div>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        borderBottom: '2px solid #007bff',
        paddingBottom: '15px'
      }}>
        <h2 style={{ margin: 0, color: '#333' }}>✏️ Edytor Szablonów Faktur</h2>
        {!isEditing && (
          <button
            onClick={handleCreateNew}
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            ➕ Nowy szablon
          </button>
        )}
      </div>

      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          color: '#721c24',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          color: '#155724',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {success}
        </div>
      )}

      {loading && (
        <div style={{
          backgroundColor: '#d1ecf1',
          border: '1px solid #bee5eb',
          color: '#0c5460',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          Ładowanie...
        </div>
      )}

      {isEditing ? renderEditor() : renderTemplatesList()}
    </div>
  );
};

const getFieldTypeLabel = (type) => {
  const labels = {
    text: 'Tekst',
    table: 'Tabela',
    custom: 'Pole niestandardowe'
  };
  
  return labels[type] || type;
};

export default InvoiceTemplateEditor;
