import React, { useState, useEffect } from 'react';

const SimpleTemplateEditor = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Stan dla formularza nowego szablonu
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Stan dla edycji szablonu
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  
  // Stan dla edytora pól
  const [editingFields, setEditingFields] = useState([]);
  const [saving, setSaving] = useState(false);
  
  // Stan dla podglądu
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Stan dla panelu zmiennych
  const [showVariables, setShowVariables] = useState({});
  
  // Stan dla zwijania/rozwijania pól
  const [expandedFields, setExpandedFields] = useState({});
  const [selectedFieldId, setSelectedFieldId] = useState(null);

  // Stany dla zarządzania szablonami
  const [editingTemplateName, setEditingTemplateName] = useState(null);
  const [duplicatingTemplate, setDuplicatingTemplate] = useState(null);

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
    { name: '{suma_vat}', description: 'Suma VAT (całkowita)' },
    { name: '{suma_brutto}', description: 'Suma brutto' },
    { name: '{kwota_slownie}', description: 'Kwota słownie' },
    
    // VAT wg stawek
    { name: '{vat_23_netto}', description: 'VAT 23% - wartość netto' },
    { name: '{vat_23_vat}', description: 'VAT 23% - kwota VAT' },
    { name: '{vat_23_brutto}', description: 'VAT 23% - wartość brutto' },
    { name: '{vat_8_netto}', description: 'VAT 8% - wartość netto' },
    { name: '{vat_8_vat}', description: 'VAT 8% - kwota VAT' },
    { name: '{vat_8_brutto}', description: 'VAT 8% - wartość brutto' },
    { name: '{vat_5_netto}', description: 'VAT 5% - wartość netto' },
    { name: '{vat_5_vat}', description: 'VAT 5% - kwota VAT' },
    { name: '{vat_5_brutto}', description: 'VAT 5% - wartość brutto' },
    { name: '{vat_0_netto}', description: 'VAT 0% - wartość netto' },
    { name: '{vat_0_vat}', description: 'VAT 0% - kwota VAT (0.00)' },
    { name: '{vat_0_brutto}', description: 'VAT 0% - wartość brutto' },
    { name: '{vat_zw_netto}', description: 'VAT zwolniony - wartość netto' },
    { name: '{vat_zw_vat}', description: 'VAT zwolniony - kwota VAT (0.00)' },
    { name: '{vat_zw_brutto}', description: 'VAT zwolniony - wartość brutto' },
    
    // Płatności warunkowe
    { name: '{kwota_zaplacona}', description: 'Kwota zapłacona (zależnie od formy płatności)' },
    { name: '{kwota_do_zaplaty}', description: 'Kwota do zapłaty (zależnie od formy płatności)' },
    { name: '{status_platnosci}', description: 'Status płatności (ZAPŁACONE/DO ZAPŁATY)' },
    
    // Dodatkowe
    { name: '{uwagi}', description: 'Uwagi' },
    { name: '{miejsce_wystawienia}', description: 'Miejsce wystawienia' },
    { name: '{waluta}', description: 'Waluta' },
    { name: '{dzisiejsza_data}', description: 'Dzisiejsza data' },
    { name: '{rok}', description: 'Rok' },
    { name: '{miesiac}', description: 'Miesiąc' },
    { name: '{dzien}', description: 'Dzień' }
  ];

  // Funkcja do ładowania szablonów z backendu
  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('https://panelv3.pl/custom-templates');
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.data);
        console.log('✅ Załadowano szablony:', data.data);
      } else {
        throw new Error(data.message || 'Błąd podczas ładowania szablonów');
      }
    } catch (err) {
      console.error('❌ Błąd ładowania szablonów:', err);
      setError('Nie udało się załadować szablonów: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Funkcja do tworzenia nowego szablonu
  const createTemplate = async () => {
    if (!newTemplateName.trim()) {
      setError('Nazwa szablonu jest wymagana');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      
      const newTemplate = {
        name: newTemplateName.trim(),
        description: '',
        config: {
          fields: [
            {
              id: "default-title",
              type: "text",
              x: 50,
              y: 50,
              width: 200,
              height: 20,
              content: "FAKTURA",
              style: {
                fontSize: 16,
                fontWeight: "bold",
                textAlign: "center",
                color: "#000000"
              }
            }
          ],
          settings: {
            page_size: "A4",
            margins: { top: 50, bottom: 50, left: 50, right: 50 },
            font_family: "Arial",
            font_size: 10,
            text_case: "normal"
          }
        }
      };

      const response = await fetch('https://panelv3.pl/custom-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTemplate)
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Szablon "${newTemplateName}" został utworzony!`);
        setNewTemplateName('');
        setShowCreateForm(false);
        await loadTemplates(); // Odśwież listę
        console.log('✅ Utworzono szablon:', data.data);
      } else {
        throw new Error(data.message || 'Błąd podczas tworzenia szablonu');
      }
    } catch (err) {
      console.error('❌ Błąd tworzenia szablonu:', err);
      setError('Nie udało się utworzyć szablonu: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  // Funkcja do usuwania szablonu
  const deleteTemplate = async (templateId, templateName, isAnchored) => {
    if (isAnchored) {
      alert(`Szablon "${templateName}" jest zakotwiczony i nie może być usunięty. Najpierw odkotwicz szablon.`);
      return;
    }

    if (!window.confirm(`Czy na pewno chcesz usunąć szablon "${templateName}"?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`https://panelv3.pl/custom-templates/${templateId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Szablon "${templateName}" został usunięty!`);
        await loadTemplates(); // Odśwież listę
        console.log('✅ Usunięto szablon:', templateId);
      } else {
        throw new Error(data.message || 'Błąd podczas usuwania szablonu');
      }
    } catch (err) {
      console.error('❌ Błąd usuwania szablonu:', err);
      setError('Nie udało się usunąć szablonu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Funkcja do edycji szablonu
  const editTemplate = (template) => {
    // Upewnij się, że globalne ustawienia istnieją
    const templateWithDefaults = {
      ...template,
      config: {
        ...template.config,
        settings: {
          page_size: "A4",
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          font_family: "Arial",
          font_size: 10,
          text_case: "normal",
          ...template.config.settings
        }
      }
    };

    setEditingTemplate(templateWithDefaults);
    
    // Inicjalizuj contentLines i lineStyles dla istniejących pól
    const fieldsWithLines = templateWithDefaults.config.fields.map(field => {
      const contentLines = field.contentLines || (field.content ? field.content.split('\n') : [""]);
      const lineStyles = field.lineStyles || contentLines.map(() => ({ bold: false }));
      
      return {
        ...field,
        contentLines,
        lineStyles
      };
    });
    setEditingFields(fieldsWithLines);
    setShowEditor(true);
    console.log('✏️ Otwieranie edytora dla szablonu:', templateWithDefaults);
  };

  // Funkcja do zmiany nazwy szablonu
  const renameTemplate = async (templateId, newName) => {
    if (!newName.trim()) {
      setError('Nazwa szablonu nie może być pusta');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`https://panelv3.pl/custom-templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newName.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        await loadTemplates(); // Odśwież listę
        setSuccess(`Nazwa szablonu została zmieniona na "${newName}"`);
        setEditingTemplateName(null);
      } else {
        throw new Error(data.message || 'Błąd podczas zmiany nazwy szablonu');
      }
    } catch (err) {
      console.error('❌ Błąd zmiany nazwy szablonu:', err);
      setError('Nie udało się zmienić nazwy szablonu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Funkcja do duplikowania szablonu
  const duplicateTemplate = async (template) => {
    try {
      setDuplicatingTemplate(template.id);
      setError(null);

      const response = await fetch(`https://panelv3.pl/custom-templates/${template.id}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${template.name} - Kopia`
        })
      });

      const data = await response.json();

      if (data.success) {
        await loadTemplates(); // Odśwież listę
        setSuccess(`Szablon został zduplikowany!`);
      } else {
        throw new Error(data.message || 'Błąd podczas duplikowania szablonu');
      }
    } catch (err) {
      console.error('❌ Błąd duplikowania szablonu:', err);
      setError('Nie udało się zduplikować szablonu: ' + err.message);
    } finally {
      setDuplicatingTemplate(null);
    }
  };

  // Funkcja do przełączania kotwiczenia szablonu
  const toggleTemplateAnchor = async (templateId, currentAnchorState) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`https://panelv3.pl/custom-templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          anchored: !currentAnchorState
        })
      });

      const data = await response.json();

      if (data.success) {
        await loadTemplates(); // Odśwież listę
        setSuccess(`Szablon został ${!currentAnchorState ? 'zakotwiczony' : 'odkotwiczony'}`);
      } else {
        throw new Error(data.message || 'Błąd podczas zmiany kotwiczenia szablonu');
      }
    } catch (err) {
      console.error('❌ Błąd kotwiczenia szablonu:', err);
      setError('Nie udało się zmienić kotwiczenia szablonu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Funkcje do zarządzania polami w edytorze
  const addField = () => {
    const newField = {
      id: `field-${Date.now()}`,
      type: "text",
      x: 50,
      y: 50,
      width: 200,
      height: 20,
      content: "Nowe pole",
      contentLines: ["Nowe pole"], // Nowa właściwość dla wielokrotnych linii
      style: {
        fontSize: 12,
        fontWeight: "normal",
        textAlign: "left",
        color: "#000000"
      }
    };
    setEditingFields([...editingFields, newField]);
  };

  const updateField = (fieldId, updates) => {
    setEditingFields(editingFields.map(field => {
      if (field.id === fieldId) {
        const updatedField = { ...field, ...updates };
        
        // Synchronizuj content z contentLines jeśli istnieje
        if (updates.contentLines) {
          updatedField.content = updates.contentLines.join('\n');
        }
        
        // Jeśli zmieniamy typ na 'table', dodaj domyślną konfigurację tabeli
        if (updates.type === 'table' && !updatedField.tableConfig) {
          updatedField.tableConfig = {
            columns: [
              { name: 'Lp.', width: 50, align: 'center', dataField: 'lp' },
              { name: 'Nazwa produktu', width: 200, align: 'left', dataField: 'nazwa_produktu' },
              { name: 'Ilość', width: 60, align: 'center', dataField: 'ilosc' },
              { name: 'Cena jedn.', width: 100, align: 'right', dataField: 'cena_jednostkowa_netto' },
              { name: 'Wartość', width: 100, align: 'right', dataField: 'wartosc_brutto' }
            ],
            rowHeight: 20,
            fontSize: 10,
            headerFontSize: 12,
            lineWidth: 0.5,
            showHeader: true,
            showBorders: true
          };
        }
        
        return updatedField;
      }
      return field;
    }));
  };

  // Nowe funkcje do zarządzania liniami treści
  const addContentLine = (fieldId) => {
    const field = editingFields.find(f => f.id === fieldId);
    if (field) {
      const currentLines = field.contentLines || [field.content || ""];
      const newLines = [...currentLines, "Nowa linia"];
      
      // Dodaj także domyślny styl dla nowej linii
      const currentLineStyles = field.lineStyles || [];
      const newLineStyles = [...currentLineStyles, { bold: false }];
      
      updateField(fieldId, { 
        contentLines: newLines,
        lineStyles: newLineStyles 
      });
    }
  };

  const updateContentLine = (fieldId, lineIndex, value) => {
    const field = editingFields.find(f => f.id === fieldId);
    if (field) {
      const currentLines = field.contentLines || [field.content || ""];
      const newLines = [...currentLines];
      newLines[lineIndex] = value;
      updateField(fieldId, { contentLines: newLines });
    }
  };

  const removeContentLine = (fieldId, lineIndex) => {
    const field = editingFields.find(f => f.id === fieldId);
    if (field && field.contentLines && field.contentLines.length > 1) {
      const newLines = field.contentLines.filter((_, index) => index !== lineIndex);
      // Usuń także style dla usuniętej linii
      const newLineStyles = field.lineStyles ? field.lineStyles.filter((_, index) => index !== lineIndex) : [];
      updateField(fieldId, { 
        contentLines: newLines,
        lineStyles: newLineStyles 
      });
    }
  };

  // Funkcja do przełączania pogrubienia konkretnej linii
  const toggleLineBold = (fieldId, lineIndex) => {
    const field = editingFields.find(f => f.id === fieldId);
    if (field) {
      // Inicjalizuj lineStyles jeśli nie istnieją
      const currentLineStyles = field.lineStyles || [];
      
      // Uzupełnij brakujące style dla wszystkich linii
      const linesCount = field.contentLines ? field.contentLines.length : 1;
      while (currentLineStyles.length < linesCount) {
        currentLineStyles.push({ bold: false });
      }
      
      // Przełącz pogrubienie dla konkretnej linii
      const newLineStyles = [...currentLineStyles];
      const wasBold = newLineStyles[lineIndex]?.bold || false;
      newLineStyles[lineIndex] = {
        ...newLineStyles[lineIndex],
        bold: !wasBold
      };
      
      console.log(`🔍 DEBUG TOGGLE: fieldId=${fieldId}, lineIndex=${lineIndex}, wasBold=${wasBold}, nowBold=${!wasBold}`);
      console.log(`🔍 DEBUG TOGGLE: newLineStyles=`, newLineStyles);
      
      updateField(fieldId, { lineStyles: newLineStyles });
    }
  };

  // Funkcja do aktualizacji globalnych ustawień szablonu
  const updateGlobalSetting = (settingName, value) => {
    if (editingTemplate) {
      const updatedTemplate = {
        ...editingTemplate,
        config: {
          ...editingTemplate.config,
          settings: {
            ...editingTemplate.config.settings,
            [settingName]: value
          }
        }
      };
      setEditingTemplate(updatedTemplate);
      
      // Zapisz również w stanie lokalnym dla podglądu
      console.log(`📝 Zaktualizowano globalne ustawienie: ${settingName} = ${value}`);
    }
  };

  // Funkcja do resetowania wszystkich indywidualnych ustawień czcionek
  const resetAllFontsToGlobal = () => {
    const confirmReset = window.confirm(
      'Czy na pewno chcesz zresetować wszystkie indywidualne ustawienia czcionek?\n\n' +
      'Wszystkie pola będą używać globalnych ustawień czcionki określonych powyżej.\n\n' +
      'Ta operacja nie może być cofnięta.'
    );
    
    if (confirmReset) {
      const resetFields = editingFields.map(field => {
        // Usuń indywidualne ustawienia czcionki ze stylu
        const newStyle = { ...field.style };
        delete newStyle.fontSize;
        delete newStyle.fontFamily;
        delete newStyle.fontWeight;
        
        return {
          ...field,
          style: newStyle
        };
      });
      
      setEditingFields(resetFields);
      console.log('🔄 Zresetowano wszystkie indywidualne ustawienia czcionek do globalnych');
    }
  };

  const removeField = (fieldId) => {
    setEditingFields(editingFields.filter(field => field.id !== fieldId));
  };

  // Funkcja do wstawiania zmiennej do pola treści
  const insertVariable = (fieldId, variableName) => {
    const field = editingFields.find(f => f.id === fieldId);
    if (field) {
      if (field.contentLines && field.contentLines.length > 0) {
        // Dodaj zmienną do ostatniej linii
        const lastIndex = field.contentLines.length - 1;
        const currentLine = field.contentLines[lastIndex] || '';
        const newLine = currentLine + variableName;
        updateContentLine(fieldId, lastIndex, newLine);
      } else {
        // Fallback do content
        const currentContent = field.content || '';
        const newContent = currentContent + variableName;
        updateField(fieldId, { content: newContent });
      }
    }
  };

  // Funkcja do wstawiania zmiennej w nowej linii
  const insertVariableNewLine = (fieldId, variableName) => {
    const field = editingFields.find(f => f.id === fieldId);
    if (field) {
      if (field.contentLines && field.contentLines.length > 0) {
        // Dodaj nową linię ze zmienną
        const newLines = [...field.contentLines, variableName];
        updateField(fieldId, { contentLines: newLines });
      } else {
        // Fallback do content
        const currentContent = field.content || '';
        const newContent = currentContent + (currentContent ? '\n' : '') + variableName;
        updateField(fieldId, { content: newContent });
      }
    }
  };

  // Funkcja do przełączania widoczności panelu zmiennych
  const toggleVariablesPanel = (fieldId) => {
    setShowVariables(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }));
  };

  // Funkcje do zarządzania rozwijaniem pól
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

  const collapseAllFields = () => {
    setExpandedFields({});
    setSelectedFieldId(null);
  };

  const expandAllFields = () => {
    const expanded = {};
    editingFields.forEach(field => {
      expanded[field.id] = true;
    });
    setExpandedFields(expanded);
  };

  // Funkcje do przesuwania pól
  const moveFieldUp = (fieldId) => {
    const currentIndex = editingFields.findIndex(f => f.id === fieldId);
    
    if (currentIndex > 0) {
      const newFields = [...editingFields];
      [newFields[currentIndex - 1], newFields[currentIndex]] = [newFields[currentIndex], newFields[currentIndex - 1]];
      setEditingFields(newFields);
    }
  };

  const moveFieldDown = (fieldId) => {
    const currentIndex = editingFields.findIndex(f => f.id === fieldId);
    
    if (currentIndex < editingFields.length - 1) {
      const newFields = [...editingFields];
      [newFields[currentIndex], newFields[currentIndex + 1]] = [newFields[currentIndex + 1], newFields[currentIndex]];
      setEditingFields(newFields);
    }
  };

  // Funkcja do przesuwania pola na konkretną pozycję
  const moveFieldToPosition = (fieldId, newPosition) => {
    const currentIndex = editingFields.findIndex(f => f.id === fieldId);
    
    if (currentIndex !== -1 && newPosition >= 0 && newPosition < editingFields.length) {
      const newFields = [...editingFields];
      const [movedField] = newFields.splice(currentIndex, 1);
      newFields.splice(newPosition, 0, movedField);
      setEditingFields(newFields);
    }
  };

  // Funkcje do przesuwania kolumn w tabeli
  const moveColumnUp = (fieldId, columnIndex) => {
    const field = editingFields.find(f => f.id === fieldId);
    if (!field || !field.tableConfig?.columns || columnIndex <= 0) return;

    const newColumns = [...field.tableConfig.columns];
    [newColumns[columnIndex - 1], newColumns[columnIndex]] = [newColumns[columnIndex], newColumns[columnIndex - 1]];
    
    updateField(fieldId, {
      tableConfig: { ...field.tableConfig, columns: newColumns }
    });
  };

  const moveColumnDown = (fieldId, columnIndex) => {
    const field = editingFields.find(f => f.id === fieldId);
    if (!field || !field.tableConfig?.columns || columnIndex >= field.tableConfig.columns.length - 1) return;

    const newColumns = [...field.tableConfig.columns];
    [newColumns[columnIndex], newColumns[columnIndex + 1]] = [newColumns[columnIndex + 1], newColumns[columnIndex]];
    
    updateField(fieldId, {
      tableConfig: { ...field.tableConfig, columns: newColumns }
    });
  };

  const saveTemplate = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const updatedTemplate = {
        ...editingTemplate,
        config: {
          ...editingTemplate.config,
          fields: editingFields
        }
      };

      const response = await fetch(`https://panelv3.pl/custom-templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTemplate)
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Szablon "${editingTemplate.name}" został zapisany!`);
        setShowEditor(false);
        setEditingTemplate(null);
        await loadTemplates(); // Odśwież listę
        console.log('✅ Zapisano szablon:', data.data);
      } else {
        throw new Error(data.message || 'Błąd podczas zapisywania szablonu');
      }
    } catch (err) {
      console.error('❌ Błąd zapisywania szablonu:', err);
      setError('Nie udało się zapisać szablonu: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Funkcja do podglądu szablonu
  const previewTemplateHandler = async (template) => {
    try {
      setPreviewLoading(true);
      setError(null);
      
      // Symulowane dane faktury do podglądu
      const mockInvoiceData = {
        invoice_number: "FAK/2025/001",
        invoice_date: "2025-09-05", 
        due_date: "2025-09-20",
        // Nie wysyłamy danych sprzedawcy - backend ma użyć realnych danych z bazy
        buyer: {
          name: "Klient XYZ",
          address: "ul. Testowa 456",
          city: "50-001 Wrocław",
          nip: "0987654321"
        },
        items: [
          {
            name: "Produkt A",
            quantity: 2,
            unit_price: 100.00,
            total: 200.00
          },
          {
            name: "Produkt B", 
            quantity: 1,
            unit_price: 150.00,
            total: 150.00
          }
        ],
        total_net: 350.00,
        vat_amount: 80.50,
        total_gross: 430.50
      };

      // Debug - sprawdź co wysyłamy
      console.log('🔍 DEBUG PREVIEW: Wysyłam template.config:', template.config);
      template.config.fields.forEach((field, index) => {
        if (field.contentLines || field.lineStyles) {
          console.log(`🔍 DEBUG FIELD ${index}: id=${field.id}, contentLines=${JSON.stringify(field.contentLines)}, lineStyles=${JSON.stringify(field.lineStyles)}`);
        }
      });

      const response = await fetch('https://panelv3.pl/custom-template-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_config: template.config,
          invoice_data: mockInvoiceData
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // Pobierz PDF lub otwórz w nowym oknie
        const a = document.createElement('a');
        a.href = url;
        a.download = `podglad_szablonu_${template.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Również spróbuj otworzyć w nowym oknie (jeśli nie ma blokady popup-ów)
        try {
          window.open(url, '_blank');
        } catch (e) {
          console.log('Popup zablokowany przez przeglądarkę - PDF został pobrany');
        }
        
        // Wyczyść URL object po czasie
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        
        setSuccess(`Podgląd szablonu "${template.name}" został wygenerowany!`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Błąd generowania podglądu');
      }
    } catch (err) {
      console.error('❌ Błąd podglądu szablonu:', err);
      setError('Nie udało się wygenerować podglądu: ' + err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Wyczyść komunikaty po czasie
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Ładuj szablony przy starcie komponentu
  useEffect(() => {
    loadTemplates();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Nagłówek */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        borderBottom: '2px solid #007bff',
        paddingBottom: '15px'
      }}>
        <h2 style={{ margin: 0, color: '#333' }}>✏️ Edytor Szablonów Faktur</h2>
        <button
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
          onClick={() => setShowCreateForm(true)}
          disabled={showCreateForm}
        >
          ➕ Nowy szablon
        </button>
      </div>

      {/* Komunikaty */}
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
          🔄 Ładowanie...
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          color: '#721c24',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          ❌ {error}
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
          ✅ {success}
        </div>
      )}

      {/* Formularz tworzenia nowego szablonu */}
      {showCreateForm && (
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>➕ Utwórz nowy szablon</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Nazwa szablonu:
            </label>
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              placeholder="np. Mój własny szablon faktury"
            />
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={createTemplate}
              disabled={creating}
              style={{
                backgroundColor: creating ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '10px 20px',
                cursor: creating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              {creating ? '⏳ Tworzenie...' : '✅ Utwórz szablon'}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewTemplateName('');
                setError(null);
              }}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ❌ Anuluj
            </button>
          </div>
        </div>
      )}

      {/* Lista szablonów */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>📋 Lista szablonów ({templates.length})</h3>
        
        {templates.length === 0 ? (
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            padding: '30px',
            textAlign: 'center',
            color: '#6c757d'
          }}>
            <h4 style={{ margin: '0 0 10px 0' }}>📭 Brak szablonów</h4>
            <p style={{ margin: 0 }}>Kliknij "Nowy szablon" aby utworzyć pierwszy szablon.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {templates.map(template => (
              <div key={template.id} style={{
                backgroundColor: 'white',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                padding: '15px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    marginBottom: '5px'
                  }}>
                    {editingTemplateName === template.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="text"
                          defaultValue={template.name}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              renameTemplate(template.id, e.target.value);
                            } else if (e.key === 'Escape') {
                              setEditingTemplateName(null);
                            }
                          }}
                          onBlur={(e) => renameTemplate(template.id, e.target.value)}
                          autoFocus
                          style={{
                            border: '1px solid #007bff',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}
                        />
                        <button
                          onClick={() => setEditingTemplateName(null)}
                          style={{
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ❌
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ margin: 0, color: '#333' }}>
                          {template.anchored && '🔒'} 📄 {template.name}
                        </h4>
                        <button
                          onClick={() => setEditingTemplateName(template.id)}
                          style={{
                            backgroundColor: 'transparent',
                            color: '#007bff',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
                            padding: '2px'
                          }}
                          title="Zmień nazwę"
                        >
                          ✏️
                        </button>
                      </div>
                    )}
                    <span style={{
                      backgroundColor: '#e9ecef',
                      color: '#495057',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}>
                      ID: {template.id}
                    </span>
                    {template.anchored && (
                      <span style={{
                        backgroundColor: '#ffc107',
                        color: '#495057',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        🔒 Zakotwiczony
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#6c757d', fontSize: '14px' }}>
                    <span>📅 Utworzono: {new Date(template.created_at).toLocaleString('pl-PL')}</span>
                    {template.description && (
                      <span style={{ marginLeft: '15px' }}>📝 {template.description}</span>
                    )}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => editTemplate(template)}
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
                    ✏️ Edytuj
                  </button>
                  <button
                    onClick={() => previewTemplateHandler(template)}
                    disabled={previewLoading}
                    style={{
                      backgroundColor: previewLoading ? '#6c757d' : '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      cursor: previewLoading ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      opacity: previewLoading ? 0.6 : 1
                    }}
                  >
                    {previewLoading ? '⏳' : '👁️'} Podgląd
                  </button>
                  <button
                    onClick={() => duplicateTemplate(template)}
                    disabled={duplicatingTemplate === template.id}
                    style={{
                      backgroundColor: duplicatingTemplate === template.id ? '#6c757d' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      cursor: duplicatingTemplate === template.id ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      opacity: duplicatingTemplate === template.id ? 0.6 : 1
                    }}
                    title="Duplikuj szablon"
                  >
                    {duplicatingTemplate === template.id ? '⏳' : '📋'} Kopia
                  </button>
                  <button
                    onClick={() => toggleTemplateAnchor(template.id, template.anchored)}
                    style={{
                      backgroundColor: template.anchored ? '#ffc107' : '#6c757d',
                      color: template.anchored ? '#495057' : 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    title={template.anchored ? "Odkotwicz szablon" : "Zakotwicz szablon"}
                  >
                    {template.anchored ? '🔓' : '🔒'} {template.anchored ? 'Odkotwicz' : 'Kotwica'}
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id, template.name, template.anchored)}
                    disabled={template.anchored}
                    style={{
                      backgroundColor: template.anchored ? '#e9ecef' : '#dc3545',
                      color: template.anchored ? '#6c757d' : 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      cursor: template.anchored ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      opacity: template.anchored ? 0.6 : 1
                    }}
                    title={template.anchored ? "Szablon jest zakotwiczony" : "Usuń szablon"}
                  >
                    🗑️ Usuń
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status rozwoju */}
      <div style={{
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        padding: '15px',
        marginTop: '30px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>
          🚧 Status rozwoju - Krok 2+
        </h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#6c757d' }}>
          <li>✅ Ładowanie listy szablonów z API</li>
          <li>✅ Tworzenie nowych szablonów</li>
          <li>✅ Usuwanie szablonów</li>
          <li>✅ Obsługa komunikatów success/error</li>
          <li>✅ Podgląd szablonów (PDF)</li>
          <li>⏳ Następny krok: Edytor pól szablonu</li>
        </ul>
      </div>

      {/* Modal edytora szablonu */}
      {showEditor && editingTemplate && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80%',
            overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #007bff',
              paddingBottom: '10px'
            }}>
              <h3 style={{ margin: 0, color: '#333' }}>
                ✏️ Edycja szablonu: {editingTemplate.name}
              </h3>
              <button
                onClick={() => {
                  setShowEditor(false);
                  setEditingTemplate(null);
                }}
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✕ Zamknij
              </button>
            </div>
            
            {/* Globalne ustawienia szablonu */}
            <div style={{ 
              marginBottom: '20px', 
              padding: '15px', 
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '6px' 
            }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>⚙️ Ustawienia globalne</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                
                {/* Czcionka */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>
                    Rodzaj czcionki:
                  </label>
                  <select
                    value={editingTemplate?.config?.settings?.font_family || 'Arial'}
                    onChange={(e) => updateGlobalSetting('font_family', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  >
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="DejaVuSans">DejaVu Sans (polskie znaki)</option>
                    <option value="SystemUTF8">System UTF-8</option>
                  </select>
                </div>

                {/* Rozmiar czcionki */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>
                    Rozmiar czcionki:
                  </label>
                  <input
                    type="number"
                    min="6"
                    max="72"
                    value={editingTemplate?.config?.settings?.font_size || 10}
                    onChange={(e) => updateGlobalSetting('font_size', parseInt(e.target.value) || 10)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  />
                </div>

                {/* Styl tekstu */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>
                    Styl tekstu:
                  </label>
                  <select
                    value={editingTemplate?.config?.settings?.text_case || 'normal'}
                    onChange={(e) => updateGlobalSetting('text_case', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  >
                    <option value="normal">Normalny</option>
                    <option value="uppercase">WIELKIE LITERY</option>
                    <option value="lowercase">małe litery</option>
                    <option value="capitalize">Pierwsza Litera Wielka</option>
                  </select>
                </div>

                {/* Rozmiar strony */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>
                    Rozmiar strony:
                  </label>
                  <select
                    value={editingTemplate?.config?.settings?.page_size || 'A4'}
                    onChange={(e) => updateGlobalSetting('page_size', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  >
                    <option value="A4">A4</option>
                    <option value="A5">A5</option>
                    <option value="LETTER">Letter</option>
                  </select>
                </div>
              </div>

              <div style={{ 
                marginTop: '10px', 
                padding: '8px 12px', 
                backgroundColor: '#e7f3ff', 
                border: '1px solid #b6d7ff',
                borderRadius: '4px',
                fontSize: '11px',
                color: '#0c5460'
              }}>
                💡 <strong>Info:</strong> Te ustawienia będą zastosowane do wszystkich pól i tabel w tym szablonie. 
                Możesz nadal dostosować poszczególne pola indywidualnie.
              </div>

              {/* Przycisk resetowania wszystkich czcionek */}
              <div style={{ 
                marginTop: '10px', 
                display: 'flex', 
                justifyContent: 'center' 
              }}>
                <button
                  onClick={resetAllFontsToGlobal}
                  style={{
                    backgroundColor: '#ffc107',
                    color: '#212529',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#e0a800';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = '#ffc107';
                    e.target.style.transform = 'translateY(0)';
                  }}
                  title="Usuwa wszystkie indywidualne ustawienia czcionek z pól i wymusza użycie globalnych ustawień"
                >
                  🔄 Reset wszystkich czcionek do globalnych
                </button>
              </div>
            </div>

            {/* Edytor pól */}
            <div style={{ display: 'flex', gap: '20px' }}>
              {/* Lewa strona - Lista pól */}
              <div style={{ flex: 1 }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '15px'
                }}>
                  <h4 style={{ margin: 0, color: '#333' }}>📝 Pola szablonu ({editingFields.length})</h4>
                  <button
                    onClick={addField}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ➕ Dodaj pole
                  </button>
                </div>

                <div style={{ 
                  maxHeight: '300px', 
                  overflow: 'auto',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px'
                }}>
                  {editingFields.length === 0 ? (
                    <div style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: '#6c757d'
                    }}>
                      📭 Brak pól. Kliknij "Dodaj pole" aby rozpocząć.
                    </div>
                  ) : (
                    <div>
                      {/* Przyciski do zarządzania polami */}
                      <div style={{ 
                        marginBottom: '10px', 
                        display: 'flex', 
                        gap: '8px', 
                        flexWrap: 'wrap',
                        padding: '8px',
                        backgroundColor: '#e9ecef',
                        borderRadius: '4px'
                      }}>
                        <button
                          onClick={expandAllFields}
                          style={{
                            backgroundColor: '#17a2b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: '10px'
                          }}
                          title="Rozwiń wszystkie pola"
                        >
                          📂 Rozwiń wszystkie
                        </button>
                        <button
                          onClick={collapseAllFields}
                          style={{
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: '10px'
                          }}
                          title="Zwiń wszystkie pola"
                        >
                          📁 Zwiń wszystkie
                        </button>
                      </div>

                      {editingFields.map((field, index) => {
                        const isExpanded = expandedFields[field.id];
                        const isSelected = selectedFieldId === field.id;
                        
                        return (
                      <div key={field.id} style={{
                        padding: '10px',
                        borderBottom: index < editingFields.length - 1 ? '1px solid #eee' : 'none',
                        backgroundColor: isSelected ? '#fff3cd' : '#f8f9fa',
                        border: isSelected ? '2px solid #ffc107' : '1px solid #dee2e6',
                        borderRadius: '4px',
                        marginBottom: '8px'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          marginBottom: '10px',
                          cursor: 'pointer'
                        }} onClick={() => toggleFieldExpansion(field.id)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px' }}>
                              {expandedFields[field.id] ? '🔽' : '▶️'}
                            </span>
                            <strong style={{ color: '#333' }}>
                              {field.type.toUpperCase()}: {field.content ? field.content.substring(0, 30) + (field.content.length > 30 ? '...' : '') : 'Brak treści'}
                            </strong>
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => moveFieldUp(field.id)}
                              disabled={index === 0}
                              style={{
                                backgroundColor: index === 0 ? '#ccc' : '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                padding: '4px 8px',
                                cursor: index === 0 ? 'not-allowed' : 'pointer',
                                fontSize: '10px'
                              }}
                              title="Przesuń w górę"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveFieldDown(field.id)}
                              disabled={index === editingFields.length - 1}
                              style={{
                                backgroundColor: index === editingFields.length - 1 ? '#ccc' : '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                padding: '4px 8px',
                                cursor: index === editingFields.length - 1 ? 'not-allowed' : 'pointer',
                                fontSize: '10px'
                              }}
                              title="Przesuń w dół"
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => removeField(field.id)}
                              style={{
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: '10px'
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        
                        {/* Szczegóły pola (widoczne tylko gdy rozwinięte) */}
                        {expandedFields[field.id] && (
                          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #dee2e6' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <label style={{ fontWeight: 'bold', marginRight: '8px' }}>Treść:</label>
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
                                    fontSize: '9px'
                                  }}
                                >
                                  Zmienne
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => addContentLine(field.id)}
                                style={{
                                  backgroundColor: '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '3px',
                                  padding: '2px 6px',
                                  cursor: 'pointer',
                                  fontSize: '9px'
                                }}
                              >
                                + Linia
                              </button>
                            </div>
                            
                            {/* Wyświetlaj wielokrotne linie jeśli istnieją */}
                            {field.contentLines && field.contentLines.length > 0 ? (
                              field.contentLines.map((line, index) => {
                                const lineStyle = field.lineStyles?.[index];
                                const isBold = lineStyle?.bold || false;
                                
                                return (
                                <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
                                  <input
                                    type="text"
                                    value={line}
                                    onChange={(e) => updateContentLine(field.id, index, e.target.value)}
                                    style={{
                                      flex: 1,
                                      padding: '4px 6px',
                                      border: '1px solid #ccc',
                                      borderRadius: '3px',
                                      fontSize: '12px',
                                      marginRight: '5px',
                                      fontWeight: isBold ? 'bold' : 'normal'
                                    }}
                                    placeholder={`Linia ${index + 1} - użyj zmiennych np. {numer_faktury}`}
                                  />
                                  
                                  {/* Przycisk pogrubienia */}
                                  <button
                                    type="button"
                                    onClick={() => toggleLineBold(field.id, index)}
                                    style={{
                                      backgroundColor: isBold ? '#28a745' : '#6c757d',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '3px',
                                      padding: '4px 6px',
                                      cursor: 'pointer',
                                      fontSize: '10px',
                                      marginRight: '5px',
                                      fontWeight: 'bold'
                                    }}
                                    title={isBold ? 'Usuń pogrubienie' : 'Dodaj pogrubienie'}
                                  >
                                    B
                                  </button>
                                  
                                  {field.contentLines.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeContentLine(field.id, index)}
                                      style={{
                                        backgroundColor: '#dc3545',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '3px',
                                        padding: '4px 6px',
                                        cursor: 'pointer',
                                        fontSize: '10px'
                                      }}
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              )})
                            ) : (
                              // Fallback do pojedynczego pola content
                              <input
                                type="text"
                                value={field.content}
                                onChange={(e) => updateField(field.id, { content: e.target.value })}
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  border: '1px solid #ccc',
                                  borderRadius: '3px',
                                  fontSize: '12px'
                                }}
                                placeholder="Wpisz tekst lub użyj zmiennych np. {numer_faktury}"
                              />
                            )}
                            {showVariables[field.id] && (
                              <div style={{
                                marginTop: '5px',
                                padding: '6px',
                                border: '1px solid #ddd',
                                borderRadius: '3px',
                                backgroundColor: '#f8f9fa',
                                maxHeight: '150px',
                                overflowY: 'auto'
                              }}>
                                <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>
                                  Dostępne zmienne:
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  {availableVariables.map((variable, index) => (
                                    <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#666' }}>
                                        {variable.name}
                                      </div>
                                      <div style={{ display: 'flex', gap: '2px' }}>
                                        <button
                                          type="button"
                                          onClick={() => insertVariable(field.id, variable.name)}
                                          style={{
                                            backgroundColor: '#e9ecef',
                                            border: '1px solid #ced4da',
                                            borderRadius: '2px',
                                            padding: '2px 4px',
                                            cursor: 'pointer',
                                            fontSize: '8px',
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
                                            borderRadius: '2px',
                                            padding: '2px 4px',
                                            cursor: 'pointer',
                                            fontSize: '8px',
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
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '3px' }}>Typ:</label>
                            <select
                              value={field.type}
                              onChange={(e) => updateField(field.id, { type: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                border: '1px solid #ccc',
                                borderRadius: '3px',
                                fontSize: '12px'
                              }}
                            >
                              <option value="text">Tekst</option>
                              <option value="title">Tytuł</option>
                              <option value="data">Dane</option>
                              <option value="table">Tabela</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '3px' }}>X:</label>
                            <input
                              type="number"
                              value={field.x}
                              onChange={(e) => updateField(field.id, { x: parseInt(e.target.value) || 0 })}
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                border: '1px solid #ccc',
                                borderRadius: '3px',
                                fontSize: '12px'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '3px' }}>Y:</label>
                            <input
                              type="number"
                              value={field.y}
                              onChange={(e) => updateField(field.id, { y: parseInt(e.target.value) || 0 })}
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                border: '1px solid #ccc',
                                borderRadius: '3px',
                                fontSize: '12px'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '3px' }}>Szerokość:</label>
                            <input
                              type="number"
                              value={field.width}
                              onChange={(e) => updateField(field.id, { width: parseInt(e.target.value) || 0 })}
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                border: '1px solid #ccc',
                                borderRadius: '3px',
                                fontSize: '12px'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '3px' }}>Wysokość:</label>
                            <input
                              type="number"
                              value={field.height}
                              onChange={(e) => updateField(field.id, { height: parseInt(e.target.value) || 0 })}
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                border: '1px solid #ccc',
                                borderRadius: '3px',
                                fontSize: '12px'
                              }}
                            />
                          </div>
                        </div>

                        {/* Style */}
                        <div style={{ marginTop: '10px' }}>
                          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '12px' }}>🎨 Style:</label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                            <div>
                              <label style={{ fontSize: '11px' }}>Rozmiar:</label>
                              <input
                                type="number"
                                value={field.style?.fontSize || 12}
                                onChange={(e) => updateField(field.id, { 
                                  style: { ...field.style, fontSize: parseInt(e.target.value) || 12 }
                                })}
                                style={{
                                  width: '100%',
                                  padding: '3px 5px',
                                  border: '1px solid #ccc',
                                  borderRadius: '3px',
                                  fontSize: '11px'
                                }}
                              />
                            </div>
                            
                            <div>
                              <label style={{ fontSize: '11px' }}>Grubość:</label>
                              <select
                                value={field.style?.fontWeight || 'normal'}
                                onChange={(e) => updateField(field.id, { 
                                  style: { ...field.style, fontWeight: e.target.value }
                                })}
                                style={{
                                  width: '100%',
                                  padding: '3px 5px',
                                  border: '1px solid #ccc',
                                  borderRadius: '3px',
                                  fontSize: '11px'
                                }}
                              >
                                <option value="normal">Normal</option>
                                <option value="bold">Pogrubiony</option>
                              </select>
                            </div>

                            <div>
                              <label style={{ fontSize: '11px' }}>Wyrównanie:</label>
                              <select
                                value={field.style?.textAlign || 'left'}
                                onChange={(e) => updateField(field.id, { 
                                  style: { ...field.style, textAlign: e.target.value }
                                })}
                                style={{
                                  width: '100%',
                                  padding: '3px 5px',
                                  border: '1px solid #ccc',
                                  borderRadius: '3px',
                                  fontSize: '11px'
                                }}
                              >
                                <option value="left">Lewo</option>
                                <option value="center">Środek</option>
                                <option value="right">Prawo</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Table Configuration - tylko dla tabeli */}
                        {field.type === 'table' && (
                          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '12px', color: '#495057' }}>
                              📊 Konfiguracja Tabeli:
                            </label>
                            
                            {/* Kolumny tabeli */}
                            <div style={{ marginBottom: '10px' }}>
                              <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Kolumny:</label>
                              {(field.tableConfig?.columns || []).map((column, index) => (
                                <div key={index} style={{ 
                                  display: 'flex', 
                                  gap: '5px', 
                                  marginBottom: '5px',
                                  alignItems: 'center'
                                }}>
                                  <input
                                    type="text"
                                    placeholder="Nazwa kolumny"
                                    value={column.name || ''}
                                    onChange={(e) => {
                                      const newColumns = [...(field.tableConfig?.columns || [])];
                                      newColumns[index] = { ...newColumns[index], name: e.target.value };
                                      updateField(field.id, {
                                        tableConfig: { ...field.tableConfig, columns: newColumns }
                                      });
                                    }}
                                    style={{
                                      flex: 1,
                                      padding: '3px 5px',
                                      border: '1px solid #ccc',
                                      borderRadius: '3px',
                                      fontSize: '11px'
                                    }}
                                  />
                                  <input
                                    type="number"
                                    placeholder="Szerokość"
                                    value={column.width || ''}
                                    onChange={(e) => {
                                      const newColumns = [...(field.tableConfig?.columns || [])];
                                      newColumns[index] = { ...newColumns[index], width: parseInt(e.target.value) || 100 };
                                      updateField(field.id, {
                                        tableConfig: { ...field.tableConfig, columns: newColumns }
                                      });
                                    }}
                                    style={{
                                      width: '60px',
                                      padding: '3px 5px',
                                      border: '1px solid #ccc',
                                      borderRadius: '3px',
                                      fontSize: '11px'
                                    }}
                                  />
                                  <select
                                    value={column.dataField || ''}
                                    onChange={(e) => {
                                      const newColumns = [...(field.tableConfig?.columns || [])];
                                      newColumns[index] = { ...newColumns[index], dataField: e.target.value };
                                      updateField(field.id, {
                                        tableConfig: { ...field.tableConfig, columns: newColumns }
                                      });
                                    }}
                                    style={{
                                      width: '120px',
                                      padding: '3px 5px',
                                      border: '1px solid #ccc',
                                      borderRadius: '3px',
                                      fontSize: '11px'
                                    }}
                                  >
                                    <option value="">-- Wybierz dane --</option>
                                    <optgroup label="📋 Podstawowe">
                                      <option value="lp">Lp.</option>
                                      <option value="nazwa_produktu">Nazwa produktu</option>
                                      <option value="kod_produktu">Kod produktu</option>
                                      <option value="ilosc">Ilość</option>
                                      <option value="jednostka">Jednostka</option>
                                    </optgroup>
                                    <optgroup label="💰 Ceny i wartości">
                                      <option value="cena_jednostkowa_netto">Cena jedn. netto</option>
                                      <option value="cena_jednostkowa_brutto">Cena jedn. brutto</option>
                                      <option value="wartosc_netto">Wartość netto</option>
                                      <option value="wartosc_brutto">Wartość brutto</option>
                                      <option value="stawka_vat">Stawka VAT</option>
                                      <option value="kwota_vat">Kwota VAT</option>
                                    </optgroup>
                                    <optgroup label="📄 Dane faktury">
                                      <option value="numer_faktury">Numer faktury</option>
                                      <option value="numer_paragonu">Numer paragonu</option>
                                      <option value="data_wystawienia">Data wystawienia</option>
                                      <option value="data_sprzedazy">Data sprzedaży</option>
                                      <option value="termin_platnosci">Termin płatności</option>
                                      <option value="sposob_platnosci">Sposób płatności</option>
                                    </optgroup>
                                    <optgroup label="🏢 Sprzedawca">
                                      <option value="sprzedawca_nazwa">Nazwa</option>
                                      <option value="sprzedawca_adres">Adres</option>
                                      <option value="sprzedawca_nip">NIP</option>
                                      <option value="sprzedawca_regon">REGON</option>
                                      <option value="sprzedawca_numer_konta">Numer konta</option>
                                    </optgroup>
                                    <optgroup label="🏪 Nabywca">
                                      <option value="nabywca_nazwa">Nazwa</option>
                                      <option value="nabywca_adres">Adres</option>
                                      <option value="nabywca_nip">NIP</option>
                                      <option value="nabywca_regon">REGON</option>
                                    </optgroup>
                                    <optgroup label="🧮 Sumy faktury">
                                      <option value="suma_netto">Suma netto</option>
                                      <option value="suma_vat">Suma VAT (całkowita)</option>
                                      <option value="suma_brutto">Suma brutto</option>
                                      <option value="kwota_slownie">Kwota słownie</option>
                                    </optgroup>
                                    <optgroup label="🏷️ VAT wg stawek">
                                      <option value="vat_23_netto">VAT 23% - netto</option>
                                      <option value="vat_23_vat">VAT 23% - kwota VAT</option>
                                      <option value="vat_23_brutto">VAT 23% - brutto</option>
                                      <option value="vat_8_netto">VAT 8% - netto</option>
                                      <option value="vat_8_vat">VAT 8% - kwota VAT</option>
                                      <option value="vat_8_brutto">VAT 8% - brutto</option>
                                      <option value="vat_5_netto">VAT 5% - netto</option>
                                      <option value="vat_5_vat">VAT 5% - kwota VAT</option>
                                      <option value="vat_5_brutto">VAT 5% - brutto</option>
                                      <option value="vat_0_netto">VAT 0% - netto</option>
                                      <option value="vat_0_vat">VAT 0% - kwota VAT</option>
                                      <option value="vat_0_brutto">VAT 0% - brutto</option>
                                      <option value="vat_zw_netto">VAT zw. - netto</option>
                                      <option value="vat_zw_vat">VAT zw. - kwota VAT</option>
                                      <option value="vat_zw_brutto">VAT zw. - brutto</option>
                                    </optgroup>
                                    <optgroup label="💳 Płatności">
                                      <option value="kwota_zaplacona">Kwota zapłacona</option>
                                      <option value="kwota_do_zaplaty">Kwota do zapłaty</option>
                                      <option value="status_platnosci">Status płatności</option>
                                    </optgroup>
                                  </select>
                                  <select
                                    value={column.align || 'left'}
                                    onChange={(e) => {
                                      const newColumns = [...(field.tableConfig?.columns || [])];
                                      newColumns[index] = { ...newColumns[index], align: e.target.value };
                                      updateField(field.id, {
                                        tableConfig: { ...field.tableConfig, columns: newColumns }
                                      });
                                    }}
                                    style={{
                                      width: '70px',
                                      padding: '3px 5px',
                                      border: '1px solid #ccc',
                                      borderRadius: '3px',
                                      fontSize: '11px'
                                    }}
                                  >
                                    <option value="left">L</option>
                                    <option value="center">C</option>
                                    <option value="right">R</option>
                                  </select>
                                  <button
                                    onClick={() => moveColumnUp(field.id, index)}
                                    disabled={index === 0}
                                    style={{
                                      padding: '3px 6px',
                                      border: 'none',
                                      backgroundColor: index === 0 ? '#ccc' : '#28a745',
                                      color: 'white',
                                      borderRadius: '3px',
                                      fontSize: '10px',
                                      cursor: index === 0 ? 'not-allowed' : 'pointer'
                                    }}
                                    title="Przesuń kolumnę w górę"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    onClick={() => moveColumnDown(field.id, index)}
                                    disabled={index === (field.tableConfig?.columns || []).length - 1}
                                    style={{
                                      padding: '3px 6px',
                                      border: 'none',
                                      backgroundColor: index === (field.tableConfig?.columns || []).length - 1 ? '#ccc' : '#28a745',
                                      color: 'white',
                                      borderRadius: '3px',
                                      fontSize: '10px',
                                      cursor: index === (field.tableConfig?.columns || []).length - 1 ? 'not-allowed' : 'pointer'
                                    }}
                                    title="Przesuń kolumnę w dół"
                                  >
                                    ↓
                                  </button>
                                  <button
                                    onClick={() => {
                                      const newColumns = [...(field.tableConfig?.columns || [])];
                                      newColumns.splice(index, 1);
                                      updateField(field.id, {
                                        tableConfig: { ...field.tableConfig, columns: newColumns }
                                      });
                                    }}
                                    style={{
                                      padding: '3px 6px',
                                      border: 'none',
                                      backgroundColor: '#dc3545',
                                      color: 'white',
                                      borderRadius: '3px',
                                      fontSize: '10px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                              
                              <button
                                onClick={() => {
                                  const newColumns = [...(field.tableConfig?.columns || []), 
                                    { name: 'Nowa kolumna', width: 100, align: 'left', dataField: '' }
                                  ];
                                  updateField(field.id, {
                                    tableConfig: { ...field.tableConfig, columns: newColumns }
                                  });
                                }}
                                style={{
                                  padding: '5px 8px',
                                  border: '1px solid #007bff',
                                  backgroundColor: '#007bff',
                                  color: 'white',
                                  borderRadius: '3px',
                                  fontSize: '11px',
                                  cursor: 'pointer'
                                }}
                              >
                                + Dodaj kolumnę
                              </button>
                            </div>

                            {/* Inne ustawienia tabeli */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                              <div>
                                <label style={{ fontSize: '11px' }}>Wysokość rzędu:</label>
                                <input
                                  type="number"
                                  value={field.tableConfig?.rowHeight || 20}
                                  onChange={(e) => updateField(field.id, {
                                    tableConfig: { 
                                      ...field.tableConfig, 
                                      rowHeight: parseInt(e.target.value) || 20 
                                    }
                                  })}
                                  style={{
                                    width: '100%',
                                    padding: '3px 5px',
                                    border: '1px solid #ccc',
                                    borderRadius: '3px',
                                    fontSize: '11px'
                                  }}
                                />
                              </div>
                              
                              <div>
                                <label style={{ fontSize: '11px' }}>Rozmiar czcionki:</label>
                                <input
                                  type="number"
                                  value={field.tableConfig?.fontSize || 10}
                                  onChange={(e) => updateField(field.id, {
                                    tableConfig: { 
                                      ...field.tableConfig, 
                                      fontSize: parseInt(e.target.value) || 10 
                                    }
                                  })}
                                  style={{
                                    width: '100%',
                                    padding: '3px 5px',
                                    border: '1px solid #ccc',
                                    borderRadius: '3px',
                                    fontSize: '11px'
                                  }}
                                />
                              </div>

                              <div>
                                <label style={{ fontSize: '11px' }}>Czcionka nagłówka:</label>
                                <input
                                  type="number"
                                  value={field.tableConfig?.headerFontSize || (field.tableConfig?.fontSize || 10) + 2}
                                  onChange={(e) => updateField(field.id, {
                                    tableConfig: { 
                                      ...field.tableConfig, 
                                      headerFontSize: parseInt(e.target.value) || 12 
                                    }
                                  })}
                                  style={{
                                    width: '100%',
                                    padding: '3px 5px',
                                    border: '1px solid #ccc',
                                    borderRadius: '3px',
                                    fontSize: '11px'
                                  }}
                                />
                              </div>
                              
                              <div>
                                <label style={{ fontSize: '11px' }}>Grubość linii:</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={field.tableConfig?.lineWidth || 0.5}
                                  onChange={(e) => updateField(field.id, {
                                    tableConfig: { 
                                      ...field.tableConfig, 
                                      lineWidth: parseFloat(e.target.value) || 0.5 
                                    }
                                  })}
                                  style={{
                                    width: '100%',
                                    padding: '3px 5px',
                                    border: '1px solid #ccc',
                                    borderRadius: '3px',
                                    fontSize: '11px'
                                  }}
                                />
                              </div>

                              <div>
                                <label style={{ fontSize: '11px' }}>Wysokość nagłówka:</label>
                                <input
                                  type="number"
                                  value={field.tableConfig?.headerRowHeight || ((field.tableConfig?.rowHeight || 20) * 2)}
                                  onChange={(e) => updateField(field.id, {
                                    tableConfig: {
                                      ...field.tableConfig,
                                      headerRowHeight: parseInt(e.target.value) || ((field.tableConfig?.rowHeight || 20) * 2)
                                    }
                                  })}
                                  style={{
                                    width: '100%',
                                    padding: '3px 5px',
                                    border: '1px solid #ccc',
                                    borderRadius: '3px',
                                    fontSize: '11px'
                                  }}
                                />
                              </div>
                            </div>

                            {/* Opcje wyglądu */}
                            <div style={{ marginTop: '8px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <input
                                  type="checkbox"
                                  checked={field.tableConfig?.showHeader !== false}
                                  onChange={(e) => updateField(field.id, {
                                    tableConfig: { 
                                      ...field.tableConfig, 
                                      showHeader: e.target.checked 
                                    }
                                  })}
                                />
                                Pokaż nagłówek
                              </label>
                              
                              <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <input
                                  type="checkbox"
                                  checked={field.tableConfig?.showBorders !== false}
                                  onChange={(e) => updateField(field.id, {
                                    tableConfig: { 
                                      ...field.tableConfig, 
                                      showBorders: e.target.checked 
                                    }
                                  })}
                                />
                                Pokaż ramki
                              </label>
                            </div>
                          </div>
                        )}
                        
                        {/* Sekcja pozycji w kolejności */}
                        <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#f0f8ff', borderRadius: '4px', border: '1px solid #007bff' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: 'bold', color: '#007bff' }}>
                            Pozycja w kolejności:
                          </label>
                          <select
                            value={index}
                            onChange={(e) => moveFieldToPosition(field.id, parseInt(e.target.value))}
                            style={{
                              width: '100%',
                              padding: '4px 6px',
                              border: '1px solid #007bff',
                              borderRadius: '3px',
                              fontSize: '11px',
                              backgroundColor: 'white'
                            }}
                          >
                            {editingFields.map((_, selectIndex) => (
                              <option key={selectIndex} value={selectIndex}>
                                {selectIndex + 1}. pozycja
                              </option>
                            ))}
                          </select>
                          <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>
                            Wybierz pozycję, na którą chcesz przenieść to pole
                          </div>
                        </div>
                          </div>
                        )}
                      </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Prawa strona - Podgląd */}
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>👁️ Podgląd układu</h4>
                <div style={{
                  border: '2px solid #dee2e6',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  height: '300px',
                  position: 'relative',
                  overflow: 'auto'
                }}>
                  {/* Symulacja strony A4 */}
                  <div style={{
                    width: '210px', // A4 ratio
                    height: '297px',
                    margin: '10px auto',
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    position: 'relative',
                    transform: 'scale(0.8)',
                    transformOrigin: 'top center'
                  }}>
                    {editingFields.map(field => (
                      <div
                        key={field.id}
                        onClick={() => selectField(field.id)}
                        style={{
                          position: 'absolute',
                          left: `${(field.x / 595) * 210}px`, // A4 conversion
                          top: `${(field.y / 842) * 297}px`,
                          width: `${(field.width / 595) * 210}px`,
                          height: `${(field.height / 842) * 297}px`,
                          fontSize: `${Math.max(field.style?.fontSize * 0.8, 6)}px`,
                          fontWeight: field.style?.fontWeight || 'normal',
                          textAlign: field.style?.textAlign || 'left',
                          color: field.style?.color || '#000',
                          border: selectedFieldId === field.id ? '2px solid #ffc107' : '1px dashed #007bff',
                          backgroundColor: selectedFieldId === field.id ? 'rgba(255, 193, 7, 0.2)' : 'rgba(0, 123, 255, 0.1)',
                          padding: '2px',
                          overflow: 'hidden',
                          cursor: 'pointer'
                        }}
                        title={`Kliknij aby edytować: ${field.type}: ${field.content}`}
                      >
                        {field.content}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Przyciski akcji */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '20px',
              paddingTop: '15px',
              borderTop: '1px solid #dee2e6'
            }}>
              <button
                onClick={() => previewTemplateHandler({
                  ...editingTemplate,
                  config: { ...editingTemplate.config, fields: editingFields }
                })}
                disabled={previewLoading}
                style={{
                  backgroundColor: previewLoading ? '#6c757d' : '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '10px 20px',
                  cursor: previewLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                {previewLoading ? '⏳' : '👁️'} Podgląd PDF
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={saveTemplate}
                  disabled={saving}
                  style={{
                    backgroundColor: saving ? '#6c757d' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '10px 20px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  {saving ? '⏳ Zapisywanie...' : '💾 Zapisz szablon'}
                </button>
                
                <button
                  onClick={() => {
                    setShowEditor(false);
                    setEditingTemplate(null);
                    setEditingFields([]);
                  }}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ❌ Anuluj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleTemplateEditor;