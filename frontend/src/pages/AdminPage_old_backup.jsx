import React, { useState, useEffect, useCallback } from 'react';
import WarehouseManagement from '../components/admin/WarehouseManagement';
import categoryService from '../services/categoryService';
import manufacturerService from '../services/manufacturerService';
import AnnouncementAdmin from '../components/announcements/AnnouncementAdmin';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('system');
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryParentId, setEditCategoryParentId] = useState('');
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ login: '', haslo: '', typ: 'kasjer' });
  const [editingUser, setEditingUser] = useState(null);
  
  // State dla producentów
  const [manufacturers, setManufacturers] = useState([]);
  const [newManufacturer, setNewManufacturer] = useState({ nazwa: '', opis: '', aktywny: true });
  const [editingManufacturer, setEditingManufacturer] = useState(null);
  
  // State dla rabatów
  const [discounts, setDiscounts] = useState([]);
  const [newDiscount, setNewDiscount] = useState({
    nazwa: '',
    opis: '',
    typ_rabatu: 'procentowy',
    wartosc: 0,
    minimum_koszyka: 0,
    limit_miesieczny_aktywny: false,
    limit_miesieczny_kwota: 0,
    limit_miesieczny_ilosc: 0,
    limit_dzienny_aktywny: false,
    limit_dzienny_kwota: 0,
    limit_dzienny_ilosc: 0,
    aktywny: true
  });
  const [editingDiscount, setEditingDiscount] = useState(null);
  
  // State dla filtrów rabatów
  const [discountFilter, setDiscountFilter] = useState('all'); // 'all', 'active', 'inactive'
  
  // State dla raportów rabatów
  const [discountReports, setDiscountReports] = useState([]);
  const [discountStats, setDiscountStats] = useState({});
  const [discountDetails, setDiscountDetails] = useState(null);
  const [reportFilters, setReportFilters] = useState({
    data_od: new Date().toISOString().split('T')[0],
    data_do: new Date().toISOString().split('T')[0],
    user_id: '',
    rabat_id: ''
  });
  const [reportType, setReportType] = useState('dzienne');

  // State dla raportów zamknięć dnia
  const [dailyClosureReports, setDailyClosureReports] = useState([]);
  const [dailyClosureSummary, setDailyClosureSummary] = useState({});
  const [dailyClosureFilters, setDailyClosureFilters] = useState({
    date_from: new Date().toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0],
    cashier: ''
  });
  const [selectedClosureReport, setSelectedClosureReport] = useState(null);
  const [showClosureReportModal, setShowClosureReportModal] = useState(false);

  // State dla automatycznych backupów
  const [backupSchedulerStatus, setBackupSchedulerStatus] = useState(null);
  const [backupList, setBackupList] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);

  // State dla definicji dokumentów
  const [documentDefinitions, setDocumentDefinitions] = useState([]);
  const [documentDefinitionsLoading, setDocumentDefinitionsLoading] = useState(true);
  const [newDefinition, setNewDefinition] = useState({
    document_type: '',
    symbol: '',
    format_template: '',
    description: ''
  });
  const [editingDefinition, setEditingDefinition] = useState(null);
  const [previewNumber, setPreviewNumber] = useState('');

  useEffect(() => {
    loadSystemInfo();
    loadCategories();
    loadUsers();
    loadManufacturers();
    loadDiscounts();
    loadDiscountStats();
    loadBackupSchedulerStatus();
    loadBackupList();
    loadDocumentDefinitions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Przeładuj rabaty gdy zmieni się filtr
  useEffect(() => {
    if (activeTab === 'discounts') {
      loadDiscounts();
    }
  }, [discountFilter, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Automatycznie ładuj raporty rabatów przy przejściu do zakładki
  useEffect(() => {
    if (activeTab === 'discount-reports') {
      loadDiscountReports();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Automatycznie ładuj raporty zamknięć przy przejściu do zakładki
  useEffect(() => {
    if (activeTab === 'daily-closure') {
      loadDailyClosureReports();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Automatycznie ładuj dane backupów przy przejściu do zakładki
  useEffect(() => {
    if (activeTab === 'auto-backup') {
      loadBackupSchedulerStatus();
      loadBackupList();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Automatycznie ładuj definicje dokumentów przy przejściu do zakładki
  useEffect(() => {
    if (activeTab === 'document-definitions') {
      loadDocumentDefinitions();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSystemInfo = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/info');
      if (response.ok) {
        const data = await response.json();
        setSystemInfo(data);
      }
    } catch (err) {
      setError('Błąd podczas pobierania informacji o systemie');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBackupDatabase = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/admin/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert(`✅ Kopia zapasowa utworzona pomyślnie!\nPlik: ${data.data.backup_filename}\nRozmiar: ${(data.data.file_size / 1024 / 1024).toFixed(2)} MB`);
        } else {
          alert(`❌ Błąd: ${data.message}`);
        }
      } else {
        alert('❌ Błąd podczas tworzenia kopii zapasowej');
      }
    } catch (err) {
      alert(`❌ Błąd: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/admin/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Pobierz dane jako JSON i zapisz jako plik
          const exportData = data.data.export_data;
          const jsonString = JSON.stringify(exportData, null, 2);
          const blob = new Blob([jsonString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          
          // Utwórz link do pobrania
          const a = document.createElement('a');
          a.href = url;
          a.download = `pos_system_export_${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          alert(`✅ Dane wyeksportowane pomyślnie!\nTabele: ${data.data.tables_exported}\nRekordy: ${data.data.total_records}`);
        } else {
          alert(`❌ Błąd: ${data.message}`);
        }
      } else {
        alert('❌ Błąd podczas eksportu danych');
      }
    } catch (err) {
      alert(`❌ Błąd: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Funkcje dla automatycznych backupów
  const loadBackupSchedulerStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/backup/scheduler/status');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBackupSchedulerStatus(data.data);
        }
      }
    } catch (err) {
      console.error('Błąd podczas pobierania statusu schedulera:', err);
    }
  };

  const loadBackupList = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/backup/list');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBackupList(data.data.backups || []);
        }
      }
    } catch (err) {
      console.error('Błąd podczas pobierania listy backupów:', err);
    }
  };

  const handleStartScheduler = async () => {
    setBackupLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/admin/backup/scheduler/start', {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert('✅ Scheduler automatycznych backupów uruchomiony');
          loadBackupSchedulerStatus();
        } else {
          alert(`❌ Błąd: ${data.message}`);
        }
      }
    } catch (err) {
      alert(`❌ Błąd: ${err.message}`);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleStopScheduler = async () => {
    setBackupLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/admin/backup/scheduler/stop', {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert('🛑 Scheduler automatycznych backupów zatrzymany');
          loadBackupSchedulerStatus();
        } else {
          alert(`❌ Błąd: ${data.message}`);
        }
      }
    } catch (err) {
      alert(`❌ Błąd: ${err.message}`);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleManualBackup = async () => {
    setBackupLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/admin/backup/manual', {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert(`✅ Backup utworzony: ${data.data.backup_filename}\nRozmiar: ${(data.data.file_size / 1024 / 1024).toFixed(2)} MB`);
          loadBackupList();
        } else {
          alert(`❌ Błąd: ${data.message}`);
        }
      }
    } catch (err) {
      alert(`❌ Błąd: ${err.message}`);
    } finally {
      setBackupLoading(false);
    }
  };

  // Funkcje dla definicji dokumentów
  const loadDocumentDefinitions = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/document-definitions');
      if (response.ok) {
        const data = await response.json();
        setDocumentDefinitions(data.data?.definitions || []);
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
    if (!newDefinition.document_type || !newDefinition.symbol || !newDefinition.format_template) {
      alert('Proszę wypełnić wszystkie wymagane pola');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/admin/document-definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDefinition)
      });

      if (response.ok) {
        setNewDefinition({
          document_type: '',
          symbol: '',
          format_template: '',
          description: ''
        });
        loadDocumentDefinitions();
        alert('Definicja dokumentu została utworzona');
      } else {
        alert('Błąd tworzenia definicji dokumentu');
      }
    } catch (error) {
      console.error('Błąd:', error);
      alert('Błąd serwera');
    }
  };

  const handleGeneratePreview = async (docType) => {
    try {
      const response = await fetch(`http://localhost:8000/api/admin/document-definitions/preview/${docType}`);
      if (response.ok) {
        const data = await response.json();
        setPreviewNumber(data.message.preview_number);
      }
    } catch (error) {
      console.error('Błąd podglądu:', error);
    }
  };

  const handleResetCounter = async (docType) => {
    if (!confirm(`Czy na pewno chcesz zresetować licznik dla typu "${docType}"?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/admin/document-definitions/${docType}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_number: 1 })
      });

      if (response.ok) {
        loadDocumentDefinitions();
        alert('Licznik został zresetowany');
      } else {
        alert('Błąd resetowania licznika');
      }
    } catch (error) {
      console.error('Błąd:', error);
      alert('Błąd serwera');
    }
  };

  const loadCategories = useCallback(async () => {
    try {
      const data = await categoryService.getCategories();
      setCategories(data || []);
    } catch (err) {
      console.error('Błąd podczas pobierania kategorii:', err);
    }
  }, []);

  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Wprowadź nazwę kategorii');
      return;
    }

    try {
      const categoryData = { 
        name: newCategoryName.trim(),
        parent_id: newCategoryParentId || null
      };
      await categoryService.createCategory(categoryData);
      setNewCategoryName('');
      setNewCategoryParentId('');
      loadCategories();
      alert('Kategoria została dodana pomyślnie');
    } catch (err) {
      console.error('Błąd podczas dodawania kategorii:', err);
      alert('Błąd podczas dodawania kategorii');
    }
  };

  const deleteCategory = async (categoryId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tę kategorię?')) {
      return;
    }

    try {
      await categoryService.deleteCategory(categoryId);
      loadCategories();
      alert('Kategoria została usunięta pomyślnie');
    } catch (err) {
      console.error('Błąd podczas usuwania kategorii:', err);
      alert('Błąd podczas usuwania kategorii');
    }
  };

  const startEditCategory = (category) => {
    setEditingCategory(category.id);
    setEditCategoryName(category.name);
    setEditCategoryParentId(category.parent_id || '');
  };

  const cancelEditCategory = () => {
    setEditingCategory(null);
    setEditCategoryName('');
    setEditCategoryParentId('');
  };

  const updateCategory = async (categoryId) => {
    if (!editCategoryName.trim()) {
      alert('Wprowadź nazwę kategorii');
      return;
    }

    try {
      const categoryData = { 
        name: editCategoryName.trim(),
        parent_id: editCategoryParentId || null
      };
      await categoryService.updateCategory(categoryId, categoryData);
      setEditingCategory(null);
      setEditCategoryName('');
      setEditCategoryParentId('');
      loadCategories();
      alert('Kategoria została zaktualizowana pomyślnie');
    } catch (err) {
      console.error('Błąd podczas aktualizacji kategorii:', err);
      alert('Błąd podczas aktualizacji kategorii');
    }
  };

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data.users || []);
      }
    } catch (err) {
      console.error('Błąd podczas pobierania użytkowników:', err);
    }
  }, []);

  const addUser = async () => {
    if (!newUser.login.trim() || !newUser.haslo.trim()) {
      alert('Wprowadź login i hasło');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        setNewUser({ login: '', haslo: '', typ: 'kasjer' });
        loadUsers();
        alert('Użytkownik został dodany pomyślnie');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Błąd podczas dodawania użytkownika');
      }
    } catch (err) {
      console.error('Błąd podczas dodawania użytkownika:', err);
      alert('Błąd podczas dodawania użytkownika');
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tego użytkownika?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadUsers();
        alert('Użytkownik został usunięty pomyślnie');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Błąd podczas usuwania użytkownika');
      }
    } catch (err) {
      console.error('Błąd podczas usuwania użytkownika:', err);
      alert('Błąd podczas usuwania użytkownika');
    }
  };

  const startEditUser = (user) => {
    setEditingUser({
      id: user.id,
      login: user.login,
      haslo: '', // Nie wyświetlamy obecnego hasła
      typ: user.role
    });
  };

  const cancelEditUser = () => {
    setEditingUser(null);
  };

  const updateUser = async () => {
    if (!editingUser.login.trim()) {
      alert('Login nie może być pusty');
      return;
    }

    try {
      const updateData = {
        login: editingUser.login,
        typ: editingUser.typ
      };

      // Dodaj hasło tylko jeśli zostało podane
      if (editingUser.haslo.trim()) {
        updateData.haslo = editingUser.haslo;
      }

      const response = await fetch(`http://localhost:8000/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        loadUsers();
        setEditingUser(null);
        alert('Użytkownik został zaktualizowany pomyślnie');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Błąd podczas aktualizacji użytkownika');
      }
    } catch (err) {
      console.error('Błąd podczas aktualizacji użytkownika:', err);
      alert('Błąd podczas aktualizacji użytkownika');
    }
  };

  // Funkcje dla zarządzania producentami
  const loadManufacturers = useCallback(async () => {
    console.log('🔧 loadManufacturers called');
    try {
      const data = await manufacturerService.getManufacturers();
      console.log('✅ Manufacturers loaded:', data);
      setManufacturers(data || []);
    } catch (err) {
      console.error('❌ Błąd podczas pobierania producentów:', err);
    }
  }, []);

  const addManufacturer = async () => {
    console.log('🔧 addManufacturer called with:', newManufacturer);
    
    if (!newManufacturer.nazwa.trim()) {
      console.error('❌ Nazwa producenta jest pusta');
      alert('Nazwa producenta jest wymagana');
      return;
    }

    try {
      console.log('📡 Wywołuję manufacturerService.addManufacturer...');
      const result = await manufacturerService.addManufacturer(newManufacturer);
      console.log('✅ Producent dodany pomyślnie:', result);
      
      setNewManufacturer({ nazwa: '', opis: '', aktywny: true });
      loadManufacturers();
      alert('Producent został dodany pomyślnie');
    } catch (err) {
      console.error('❌ Błąd podczas dodawania producenta:', err);
      alert(`Błąd podczas dodawania producenta: ${err.message}`);
    }
  };

  const deleteManufacturer = async (manufacturerId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tego producenta?')) {
      return;
    }

    try {
      await manufacturerService.deleteManufacturer(manufacturerId);
      loadManufacturers();
      alert('Producent został usunięty pomyślnie');
    } catch (err) {
      console.error('Błąd podczas usuwania producenta:', err);
      alert(err.message || 'Błąd podczas usuwania producenta');
    }
  };

  const startEditManufacturer = (manufacturer) => {
    setEditingManufacturer({
      id: manufacturer.id,
      nazwa: manufacturer.nazwa,
      opis: manufacturer.opis || '',
      aktywny: manufacturer.aktywny
    });
  };

  const cancelEditManufacturer = () => {
    setEditingManufacturer(null);
  };

  const updateManufacturer = async () => {
    if (!editingManufacturer?.nazwa?.trim()) {
      alert('Nazwa producenta jest wymagana');
      return;
    }

    try {
      await manufacturerService.updateManufacturer(editingManufacturer.id, {
        nazwa: editingManufacturer.nazwa,
        opis: editingManufacturer.opis || '',
        aktywny: editingManufacturer.aktywny
      });
      loadManufacturers();
      setEditingManufacturer(null);
      alert('Producent został zaktualizowany pomyślnie');
    } catch (err) {
      console.error('Błąd podczas aktualizacji producenta:', err);
      alert(err.message || 'Błąd podczas aktualizacji producenta');
    }
  };

  // Funkcje dla zarządzania rabatami
  const loadDiscounts = useCallback(async () => {
    console.log('📋 Ładuję listę rabatów...');
    console.log('🔍 Aktualny filtr:', discountFilter);
    
    try {
      let url = 'http://localhost:8000/api/rabaty';
      if (discountFilter === 'active') {
        url += '?aktywny=1';
      } else if (discountFilter === 'inactive') {
        url += '?aktywny=0';
      } else if (discountFilter === 'all') {
        url += '?aktywny=all';
      }
      
      console.log('🌐 URL zapytania:', url);
      
      const response = await fetch(url);
      console.log('📡 Odpowiedź loadDiscounts:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Otrzymane dane rabatów:', data);
        
        const discountsList = data.message?.rabaty || [];
        console.log('🎯 Lista rabatów do ustawienia:', discountsList);
        console.log('🔢 Liczba rabatów:', discountsList.length);
        
        // Sprawdź statusy rabatów
        discountsList.forEach((discount, index) => {
          console.log(`🎯 Rabat ${index + 1}: ID=${discount.id}, nazwa="${discount.nazwa}", aktywny=${discount.aktywny}`);
        });
        
        setDiscounts(discountsList);
        console.log('✅ Lista rabatów została zaktualizowana');
      } else {
        console.error('❌ Błąd podczas pobierania rabatów - status:', response.status);
      }
    } catch (err) {
      console.error('❌ Błąd podczas pobierania rabatów:', err);
    }
  }, [discountFilter]);

  const addDiscount = async () => {
    if (!newDiscount.nazwa.trim()) {
      alert('Nazwa rabatu jest wymagana');
      return;
    }

    if (newDiscount.wartosc <= 0) {
      alert('Wartość rabatu musi być większa od 0');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/rabaty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newDiscount)
      });

      if (response.ok) {
        setNewDiscount({
          nazwa: '',
          opis: '',
          typ_rabatu: 'procentowy',
          wartosc: 0,
          minimum_koszyka: 0,
          limit_miesieczny_aktywny: false,
          limit_miesieczny_kwota: 0,
          limit_miesieczny_ilosc: 0,
          limit_dzienny_aktywny: false,
          limit_dzienny_kwota: 0,
          limit_dzienny_ilosc: 0,
          aktywny: true
        });
        loadDiscounts();
        alert('Rabat został dodany pomyślnie');
      } else {
        const error = await response.json();
        alert(error.message || 'Błąd podczas dodawania rabatu');
      }
    } catch (err) {
      console.error('Błąd podczas dodawania rabatu:', err);
      alert('Błąd podczas dodawania rabatu');
    }
  };

  const deleteDiscount = async (discountId) => {
    console.log('🗑️ Próba usunięcia rabatu ID:', discountId);
    
    if (!window.confirm('Czy na pewno chcesz usunąć ten rabat?')) {
      console.log('❌ Użytkownik anulował usuwanie');
      return;
    }

    try {
      console.log('🔄 Wysyłam zapytanie DELETE do:', `http://localhost:8000/api/rabaty/${discountId}`);
      
      const response = await fetch(`http://localhost:8000/api/rabaty/${discountId}`, {
        method: 'DELETE'
      });

      console.log('📡 Odpowiedź serwera:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Rabat usunięty pomyślnie:', result);
        
        console.log('🔄 Odświeżam listę rabatów...');
        await loadDiscounts();
        
        alert('Rabat został usunięty pomyślnie');
      } else {
        const error = await response.json();
        console.error('❌ Błąd serwera:', error);
        alert(error.message || 'Błąd podczas usuwania rabatu');
      }
    } catch (err) {
      console.error('❌ Błąd podczas usuwania rabatu:', err);
      alert('Błąd podczas usuwania rabatu');
    }
  };

  const startEditDiscount = (discount) => {
    setEditingDiscount({ ...discount });
  };

  const cancelEditDiscount = () => {
    setEditingDiscount(null);
  };

  const updateDiscount = async () => {
    console.log('✏️ Próba aktualizacji rabatu:', editingDiscount);
    
    if (!editingDiscount?.nazwa?.trim()) {
      alert('Nazwa rabatu jest wymagana');
      return;
    }

    if ((editingDiscount?.wartosc || 0) <= 0) {
      alert('Wartość rabatu musi być większa od 0');
      return;
    }

    try {
      console.log('🔄 Wysyłam zapytanie PUT do:', `http://localhost:8000/api/rabaty/${editingDiscount.id}`);
      console.log('📤 Dane do wysłania:', editingDiscount);
      
      const response = await fetch(`http://localhost:8000/api/rabaty/${editingDiscount.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingDiscount)
      });

      console.log('📡 Odpowiedź serwera:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Rabat zaktualizowany pomyślnie:', result);
        
        console.log('🔄 Odświeżam listę rabatów...');
        await loadDiscounts();
        
        setEditingDiscount(null);
        alert('Rabat został zaktualizowany pomyślnie');
      } else {
        const error = await response.json();
        console.error('❌ Błąd serwera:', error);
        alert(error.message || 'Błąd podczas aktualizacji rabatu');
      }
    } catch (err) {
      console.error('❌ Błąd podczas aktualizacji rabatu:', err);
      alert('Błąd podczas aktualizacji rabatu');
    }
  };

  // Funkcje dla raportów rabatów
  const loadDiscountStats = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/api/rabaty/stats');
      if (response.ok) {
        const data = await response.json();
        setDiscountStats(data.data || {});
      }
    } catch (err) {
      console.error('Błąd podczas pobierania statystyk rabatów:', err);
    }
  }, []);

  const loadDiscountReports = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      
      if (reportType === 'dzienne') {
        params.append('data_od', reportFilters.data_od);
        params.append('data_do', reportFilters.data_do);
      } else {
        // Dla miesięcznych używamy pierwszego dnia miesiąca
        const miesiac = reportFilters.data_od.substring(0, 7); // YYYY-MM
        params.append('miesiac', miesiac);
      }
      
      if (reportFilters.user_id) {
        params.append('user_id', reportFilters.user_id);
      }

      const endpoint = reportType === 'dzienne' ? 'dzienne' : 'miesieczne';
      const response = await fetch(`http://localhost:8000/api/rabaty/raporty/${endpoint}?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setDiscountReports(data.message?.raporty || []);
      }
    } catch (err) {
      console.error('Błąd podczas pobierania raportów rabatów:', err);
    }
  }, [reportType, reportFilters.data_od, reportFilters.data_do, reportFilters.user_id]);

  const fetchDiscountDetails = async (discountId) => {
    try {
      const params = new URLSearchParams();
      params.append('data_od', reportFilters.data_od);
      params.append('data_do', reportFilters.data_do);
      
      const response = await fetch(`http://localhost:8000/api/rabaty/${discountId}/szczegoly?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setDiscountDetails(data.message);
      }
    } catch (err) {
      console.error('Błąd podczas pobierania szczegółów rabatu:', err);
    }
  };

  const exportDiscountReport = () => {
    if (discountReports.length === 0) {
      alert('Brak danych do eksportu');
      return;
    }

    const csvContent = [
      // Nagłówki
      reportType === 'dzienne' 
        ? ['Data', 'Rabat', 'Typ', 'Kasjer', 'Ilość użyć', 'Suma rabatów', 'Średni rabat', 'Min rabat', 'Max rabat']
        : ['Miesiąc', 'Rabat', 'Typ', 'Kasjer', 'Ilość użyć', 'Suma rabatów', 'Średni rabat'],
      // Dane
      ...discountReports.map(report => 
        reportType === 'dzienne'
          ? [
              report.dzien,
              report.rabat_nazwa,
              report.typ_rabatu,
              report.kasjer,
              report.ilosc_uzyc,
              report.suma_rabatow,
              report.sredni_rabat,
              report.min_rabat,
              report.max_rabat
            ]
          : [
              report.miesiac_rok,
              report.rabat_nazwa,
              report.typ_rabatu,
              report.kasjer,
              report.ilosc_uzyc,
              report.suma_rabatow,
              report.sredni_rabat
            ]
      )
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `raport_rabaty_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Funkcje dla raportów zamknięć dnia
  const loadDailyClosureReports = useCallback(async () => {
    try {
      setLoading(true);
      
      const shiftEnhancedService = (await import('../services/shiftEnhancedService')).default;
      const response = await shiftEnhancedService.getDailyClosureReports(dailyClosureFilters);
      
      if (response.success) {
        setDailyClosureReports(response.data.reports || []);
        setDailyClosureSummary(response.data.summary || {});
      } else {
        setError(response.message || 'Błąd ładowania raportów zamknięć');
      }
    } catch (err) {
      console.error('Błąd ładowania raportów zamknięć:', err);
      setError('Błąd ładowania raportów zamknięć');
    } finally {
      setLoading(false);
    }
  }, [dailyClosureFilters]);

  const viewClosureReportDetails = async (reportId) => {
    try {
      setLoading(true);
      
      const shiftEnhancedService = (await import('../services/shiftEnhancedService')).default;
      const response = await shiftEnhancedService.getDailyClosureReportDetails(reportId);
      
      if (response.success) {
        setSelectedClosureReport(response.data);
        setShowClosureReportModal(true);
      } else {
        setError(response.message || 'Błąd pobierania szczegółów raportu');
      }
    } catch (err) {
      console.error('Błąd pobierania szczegółów raportu:', err);
      setError('Błąd pobierania szczegółów raportu');
    } finally {
      setLoading(false);
    }
  };

  const exportDailyClosureReports = () => {
    if (!dailyClosureReports || dailyClosureReports.length === 0) {
      alert('Brak raportów do eksportu');
      return;
    }

    // Tworzenie CSV
    const csvContent = [
      // Nagłówki
      ['Data', 'Kasjer', 'Kasa System', 'Kasa Fizyczna', 'Różnica Kasa', 'Terminal System', 'Terminal Rzeczywisty', 'Różnica Terminal', 'Kasa Fiskalna', 'Sprzedaż Gotówka', 'Sprzedaż Karta', 'Liczba Transakcji', 'TikTok', 'Facebook', 'Instagram', 'Google', 'Osiągnięcia Sprzedaż', 'Osiągnięcia Praca'],
      // Dane
      ...dailyClosureReports.map(report => [
        report.data_zamkniecia,
        report.kasjer_login,
        report.kasa_system,
        report.kasa_fizyczna,
        report.roznica_kasa,
        report.terminal_system,
        report.terminal_rzeczywisty,
        report.roznica_terminal,
        report.kasa_fiskalna_raport,
        report.sprzedaz_gotowka,
        report.sprzedaz_karta,
        report.liczba_transakcji,
        report.social_media_tiktok,
        report.social_media_facebook,
        report.social_media_instagram,
        report.social_media_google,
        report.osiagniecia_sprzedaz,
        report.osiagniecia_praca
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `raporty_zamkniecia_dnia_${dailyClosureFilters.date_from}_${dailyClosureFilters.date_to}.csv`;
    link.click();
  };

  // Funkcja do tworzenia płaskiej listy kategorii dla selecta
  const flattenCategories = (categories, level = 0) => {
    let flattened = [];
    categories.forEach(category => {
      flattened.push({
        ...category,
        displayName: '  '.repeat(level) + (level > 0 ? '└─ ' : '') + category.name,
        level
      });
      if (category.children && category.children.length > 0) {
        flattened = flattened.concat(flattenCategories(category.children, level + 1));
      }
    });
    return flattened;
  };

  // Komponent drzewa kategorii
  const CategoryTree = ({ categories, level = 0 }) => {
    return categories.map(category => (
      <div key={category.id}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginLeft: `${level * 20}px`,
          padding: '0.5rem',
          backgroundColor: level % 2 === 0 ? '#f8f9fa' : '#ffffff',
          borderBottom: '1px solid #e9ecef'
        }}>
          {level > 0 && (
            <span style={{ marginRight: '0.5rem', color: '#6c757d' }}>
              {'└─'.repeat(Math.min(level, 1))}
            </span>
          )}
          <span style={{ 
            fontSize: '0.875rem',
            fontWeight: level === 0 ? '600' : '400',
            color: level === 0 ? '#495057' : '#6c757d',
            flex: 1
          }}>
            {level === 0 ? '📁' : '📄'} {category.name}
          </span>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {editingCategory === category.id ? (
              <>
                <button
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => updateCategory(category.id)}
                >
                  ✓
                </button>
                <button
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer'
                  }}
                  onClick={cancelEditCategory}
                >
                  ✕
                </button>
              </>
            ) : (
              <>
                <button
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => startEditCategory(category)}
                >
                  ✏️
                </button>
                <button
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => deleteCategory(category.id)}
                >
                  🗑️
                </button>
              </>
            )}
          </div>
        </div>
        {editingCategory === category.id && (
          <div style={{ 
            marginLeft: `${level * 20}px`,
            padding: '0.5rem',
            backgroundColor: '#f0f0f0',
            borderBottom: '1px solid #e9ecef'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="text"
                style={{
                  flex: '1',
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem',
                  outline: 'none'
                }}
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') updateCategory(category.id);
                }}
              />
            </div>
            <select
              style={{
                width: '100%',
                padding: '0.375rem 0.75rem',
                fontSize: '0.875rem',
                border: '1px solid #ced4da',
                borderRadius: '0.375rem',
                outline: 'none'
              }}
              value={editCategoryParentId}
              onChange={(e) => setEditCategoryParentId(e.target.value)}
            >
              <option value="">-- Kategoria główna --</option>
              {flattenCategories(categories)
                .filter(cat => cat.id !== category.id) // Nie pokazuj siebie jako rodzica
                .map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.displayName}
                  </option>
                ))}
            </select>
          </div>
        )}
        {category.children && category.children.length > 0 && (
          <CategoryTree categories={category.children} level={level + 1} />
        )}
      </div>
    ));
  };

  const renderCategoriesTab = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
      <div>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
          marginBottom: '1rem'
        }}>
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa'
          }}>
            <h6 style={{ margin: 0, fontWeight: '600', color: '#495057' }}>
              🏷️ Zarządzanie kategoriami
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            {/* Formularz dodawania kategorii */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
                    Nazwa kategorii
                  </label>
                  <input
                    type="text"
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      outline: 'none'
                    }}
                    placeholder="Nazwa nowej kategorii"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
                    Kategoria nadrzędna
                  </label>
                  <select
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      outline: 'none'
                    }}
                    value={newCategoryParentId}
                    onChange={(e) => setNewCategoryParentId(e.target.value)}
                  >
                    <option value="">-- Kategoria główna --</option>
                    {flattenCategories(categories).map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <button 
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: 'white',
                    backgroundColor: '#28a745',
                    border: '1px solid #28a745',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    height: 'fit-content'
                  }}
                  onClick={addCategory}
                  disabled={!newCategoryName.trim()}
                >
                  ➕ Dodaj
                </button>
              </div>
            </div>

            {/* Drzewo kategorii */}
            <div style={{ 
              border: '1px solid #e9ecef',
              borderRadius: '0.375rem',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#f8f9fa',
                borderBottom: '1px solid #e9ecef',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#495057'
              }}>
                🌳 Struktura kategorii
              </div>
              {categories.length === 0 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#6c757d',
                  fontStyle: 'italic'
                }}>
                  Brak kategorii w systemie
                </div>
              ) : (
                <CategoryTree categories={categories} />
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div>
        <div style={{
          backgroundColor: '#007bff',
          color: 'white',
          borderRadius: '0.375rem',
          padding: '1rem',
          textAlign: 'center',
          marginBottom: '1rem'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            📊 {categories.length}
          </div>
          <div>Łączna liczba kategorii</div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
        }}>
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa'
          }}>
            <h6 style={{ margin: 0, fontWeight: '600', color: '#495057' }}>
              💡 Informacje
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            <p style={{ color: '#6c757d', lineHeight: '1.5', margin: '0', fontSize: '0.875rem' }}>
              Kategorie pomagają w organizacji produktów i ułatwiają zarządzanie asortymentem. 
              Możesz tworzyć nowe kategorie i przypisywać je do produktów.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSystemTab = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <div>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
        }}>
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa'
          }}>
            <h6 style={{ margin: 0, fontWeight: '600', color: '#495057' }}>
              ℹ️ Informacje o systemie
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            {systemInfo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '500' }}>Wersja:</span>
                  <span style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem'
                  }}>
                    {systemInfo.version}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '500' }}>Backend:</span>
                  <span style={{ color: '#6c757d' }}>Flask/Python</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '500' }}>Frontend:</span>
                  <span style={{ color: '#6c757d' }}>React</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '500' }}>Status:</span>
                  <span style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem'
                  }}>
                    🟢 Aktywny
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem',
                color: '#6c757d'
              }}>
                <div style={{ 
                  display: 'inline-block',
                  width: '2rem',
                  height: '2rem',
                  border: '3px solid #f8f9fa',
                  borderTop: '3px solid #007bff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginBottom: '1rem'
                }}></div>
                <div>Ładowanie informacji...</div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
        }}>
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa'
          }}>
            <h6 style={{ margin: 0, fontWeight: '600', color: '#495057' }}>
              🔧 Akcje systemowe
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button 
                style={{
                  padding: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'white',
                  backgroundColor: '#007bff',
                  border: '1px solid #007bff',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onClick={loadSystemInfo}
              >
                🔄 Odśwież informacje
              </button>
              <button 
                onClick={handleExportData}
                disabled={loading}
                style={{
                  padding: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'white',
                  backgroundColor: loading ? '#ccc' : '#ffc107',
                  border: `1px solid ${loading ? '#ccc' : '#ffc107'}`,
                  borderRadius: '0.375rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}>
                📊 {loading ? 'Eksportowanie...' : 'Eksportuj dane'}
              </button>
              <button 
                onClick={handleBackupDatabase}
                disabled={loading}
                style={{
                  padding: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'white',
                  backgroundColor: loading ? '#ccc' : '#28a745',
                  border: `1px solid ${loading ? '#ccc' : '#28a745'}`,
                  borderRadius: '0.375rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}>
                🗄️ {loading ? 'Tworzenie kopii...' : 'Backup bazy danych'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderManufacturersTab = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
      <div>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          overflow: 'hidden'
        }}>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '1rem',
            borderBottom: '1px solid #e9ecef',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1.25rem' }}>🏭</span>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
              Lista Producentów
            </h3>
          </div>

          <div style={{ padding: '1rem' }}>
            {manufacturers.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6c757d', margin: 0 }}>
                Brak producentów w systemie
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {manufacturers.map((manufacturer) => (
                  <div
                    key={manufacturer.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem',
                      backgroundColor: manufacturer.aktywny ? '#f8f9fa' : '#fff3cd',
                      border: '1px solid #e9ecef',
                      borderRadius: '0.375rem'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      {editingManufacturer && editingManufacturer.id === manufacturer.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <input
                            type="text"
                            value={editingManufacturer?.nazwa || ''}
                            onChange={(e) => setEditingManufacturer({
                              ...editingManufacturer,
                              nazwa: e.target.value
                            })}
                            style={{
                              padding: '0.375rem',
                              border: '1px solid #ced4da',
                              borderRadius: '0.25rem',
                              fontSize: '0.875rem'
                            }}
                            placeholder="Nazwa producenta"
                          />
                          <textarea
                            value={editingManufacturer?.opis || ''}
                            onChange={(e) => setEditingManufacturer({
                              ...editingManufacturer,
                              opis: e.target.value
                            })}
                            style={{
                              padding: '0.375rem',
                              border: '1px solid #ced4da',
                              borderRadius: '0.25rem',
                              fontSize: '0.875rem',
                              resize: 'vertical',
                              minHeight: '60px'
                            }}
                            placeholder="Opis (opcjonalny)"
                          />
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                            <input
                              type="checkbox"
                              checked={editingManufacturer?.aktywny || false}
                              onChange={(e) => setEditingManufacturer({
                                ...editingManufacturer,
                                aktywny: e.target.checked
                              })}
                            />
                            Aktywny
                          </label>
                        </div>
                      ) : (
                        <div>
                          <div style={{ 
                            fontWeight: '600', 
                            fontSize: '0.875rem',
                            color: manufacturer.aktywny ? '#495057' : '#856404'
                          }}>
                            {manufacturer.nazwa}
                            {!manufacturer.aktywny && (
                              <span style={{ 
                                marginLeft: '0.5rem',
                                fontSize: '0.75rem',
                                color: '#856404',
                                fontWeight: '400'
                              }}>
                                (nieaktywny)
                              </span>
                            )}
                          </div>
                          {manufacturer.opis && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: '#6c757d',
                              marginTop: '0.25rem'
                            }}>
                              {manufacturer.opis}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {editingManufacturer && editingManufacturer.id === manufacturer.id ? (
                        <>
                          <button
                            onClick={updateManufacturer}
                            style={{
                              padding: '0.375rem 0.75rem',
                              fontSize: '0.75rem',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              cursor: 'pointer'
                            }}
                          >
                            Zapisz
                          </button>
                          <button
                            onClick={cancelEditManufacturer}
                            style={{
                              padding: '0.375rem 0.75rem',
                              fontSize: '0.75rem',
                              backgroundColor: '#6c757d',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              cursor: 'pointer'
                            }}
                          >
                            Anuluj
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditManufacturer(manufacturer)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              fontSize: '0.75rem',
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              cursor: 'pointer'
                            }}
                          >
                            Edytuj
                          </button>
                          <button
                            onClick={() => deleteManufacturer(manufacturer.id)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              fontSize: '0.75rem',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              cursor: 'pointer'
                            }}
                          >
                            Usuń
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          overflow: 'hidden'
        }}>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '1rem',
            borderBottom: '1px solid #e9ecef',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1.25rem' }}>➕</span>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
              Nowy Producent
            </h3>
          </div>

          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontSize: '0.875rem', 
                  fontWeight: '500' 
                }}>
                  Nazwa producenta *
                </label>
                <input
                  type="text"
                  value={newManufacturer.nazwa}
                  onChange={(e) => setNewManufacturer({
                    ...newManufacturer,
                    nazwa: e.target.value
                  })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem'
                  }}
                  placeholder="np. ALLNUTRITION"
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontSize: '0.875rem', 
                  fontWeight: '500' 
                }}>
                  Opis (opcjonalny)
                </label>
                <textarea
                  value={newManufacturer?.opis || ''}
                  onChange={(e) => setNewManufacturer({
                    ...newManufacturer,
                    opis: e.target.value
                  })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    resize: 'vertical',
                    minHeight: '80px'
                  }}
                  placeholder="Krótki opis producenta..."
                />
              </div>

              <div>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  <input
                    type="checkbox"
                    checked={newManufacturer.aktywny}
                    onChange={(e) => setNewManufacturer({
                      ...newManufacturer,
                      aktywny: e.target.checked
                    })}
                  />
                  Aktywny
                </label>
              </div>

              <button
                onClick={() => {
                  console.log('🔧 Button clicked - addManufacturer');
                  addManufacturer();
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Dodaj Producenta
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDiscountsTab = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
      <div>
        <div style={{
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          backgroundColor: 'white',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #e9ecef',
            fontWeight: '600',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>🎯 Zarządzanie rabatami</span>
            <select
              value={discountFilter}
              onChange={(e) => setDiscountFilter(e.target.value)}
              style={{
                padding: '0.25rem 0.5rem',
                border: '1px solid #ced4da',
                borderRadius: '0.25rem',
                fontSize: '0.875rem'
              }}
            >
              <option value="all">Wszystkie rabaty</option>
              <option value="active">Tylko aktywne</option>
              <option value="inactive">Tylko nieaktywne</option>
            </select>
          </div>

          <div style={{ padding: '1rem' }}>
            {discounts.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#6c757d'
              }}>
                <p>Brak rabatów w systemie</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {discounts.map(discount => (
                  <div key={discount.id} style={{
                    padding: '1rem',
                    border: '1px solid #e9ecef',
                    borderRadius: '0.375rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: discount.aktywny ? '#ffffff' : '#f8f9fa'
                  }}>
                    {editingDiscount && editingDiscount.id === discount.id ? (
                      // Formularz edycji
                      <div style={{ width: '100%', display: 'grid', gap: '0.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <input
                            type="text"
                            value={editingDiscount?.nazwa || ''}
                            onChange={(e) => setEditingDiscount({...editingDiscount, nazwa: e.target.value})}
                            placeholder="Nazwa rabatu"
                            style={{
                              padding: '0.5rem',
                              border: '1px solid #e9ecef',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem'
                            }}
                          />
                          <select
                            value={editingDiscount?.typ_rabatu || 'procentowy'}
                            onChange={(e) => setEditingDiscount({...editingDiscount, typ_rabatu: e.target.value})}
                            style={{
                              padding: '0.5rem',
                              border: '1px solid #e9ecef',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem'
                            }}
                          >
                            <option value="procentowy">Procentowy</option>
                            <option value="kwotowy">Kwotowy</option>
                          </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <input
                            type="number"
                            value={editingDiscount?.wartosc || 0}
                            onChange={(e) => setEditingDiscount({...editingDiscount, wartosc: parseFloat(e.target.value) || 0})}
                            placeholder="Wartość"
                            min="0"
                            step="0.01"
                            style={{
                              padding: '0.5rem',
                              border: '1px solid #e9ecef',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem'
                            }}
                          />
                          <input
                            type="number"
                            value={editingDiscount?.minimum_koszyka || 0}
                            onChange={(e) => setEditingDiscount({...editingDiscount, minimum_koszyka: parseFloat(e.target.value) || 0})}
                            placeholder="Min. koszyk"
                            min="0"
                            step="0.01"
                            style={{
                              padding: '0.5rem',
                              border: '1px solid #e9ecef',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem'
                            }}
                          />
                        </div>
                        <textarea
                          value={editingDiscount?.opis || ''}
                          onChange={(e) => setEditingDiscount({...editingDiscount, opis: e.target.value})}
                          placeholder="Opis rabatu"
                          style={{
                            padding: '0.5rem',
                            border: '1px solid #e9ecef',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            minHeight: '60px',
                            resize: 'vertical'
                          }}
                        />
                        
                        {/* Limity miesięczne */}
                        <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '0.375rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <input
                              type="checkbox"
                              checked={editingDiscount?.limit_miesieczny_aktywny || false}
                              onChange={(e) => setEditingDiscount({...editingDiscount, limit_miesieczny_aktywny: e.target.checked})}
                            />
                            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Limity miesięczne</span>
                          </label>
                          {editingDiscount?.limit_miesieczny_aktywny && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                              <input
                                type="number"
                                value={editingDiscount?.limit_miesieczny_kwota || 0}
                                onChange={(e) => setEditingDiscount({...editingDiscount, limit_miesieczny_kwota: parseFloat(e.target.value) || 0})}
                                placeholder="Limit kwotowy"
                                min="0"
                                step="0.01"
                                style={{
                                  padding: '0.5rem',
                                  border: '1px solid #e9ecef',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.875rem'
                                }}
                              />
                              <input
                                type="number"
                                value={editingDiscount?.limit_miesieczny_ilosc || 0}
                                onChange={(e) => setEditingDiscount({...editingDiscount, limit_miesieczny_ilosc: parseInt(e.target.value) || 0})}
                                placeholder="Limit ilościowy"
                                min="0"
                                style={{
                                  padding: '0.5rem',
                                  border: '1px solid #e9ecef',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.875rem'
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Limity dzienne */}
                        <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '0.375rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <input
                              type="checkbox"
                              checked={editingDiscount?.limit_dzienny_aktywny || false}
                              onChange={(e) => setEditingDiscount({...editingDiscount, limit_dzienny_aktywny: e.target.checked})}
                            />
                            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Limity dzienne</span>
                          </label>
                          {editingDiscount?.limit_dzienny_aktywny && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                              <input
                                type="number"
                                value={editingDiscount?.limit_dzienny_kwota || 0}
                                onChange={(e) => setEditingDiscount({...editingDiscount, limit_dzienny_kwota: parseFloat(e.target.value) || 0})}
                                placeholder="Limit kwotowy"
                                min="0"
                                step="0.01"
                                style={{
                                  padding: '0.5rem',
                                  border: '1px solid #e9ecef',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.875rem'
                                }}
                              />
                              <input
                                type="number"
                                value={editingDiscount?.limit_dzienny_ilosc || 0}
                                onChange={(e) => setEditingDiscount({...editingDiscount, limit_dzienny_ilosc: parseInt(e.target.value) || 0})}
                                placeholder="Limit ilościowy"
                                min="0"
                                style={{
                                  padding: '0.5rem',
                                  border: '1px solid #e9ecef',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.875rem'
                                }}
                              />
                            </div>
                          )}
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={editingDiscount?.aktywny || false}
                            onChange={(e) => setEditingDiscount({...editingDiscount, aktywny: e.target.checked})}
                          />
                          <span style={{ fontSize: '0.875rem' }}>Rabat aktywny</span>
                        </label>

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                          <button
                            onClick={cancelEditDiscount}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#6c757d',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontSize: '0.875rem'
                            }}
                          >
                            Anuluj
                          </button>
                          <button
                            onClick={updateDiscount}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontSize: '0.875rem'
                            }}
                          >
                            Zapisz
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Widok normalny
                      <>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.25rem'
                          }}>
                            <span style={{
                              fontWeight: '600',
                              fontSize: '0.95rem',
                              color: discount.aktywny ? '#495057' : '#6c757d'
                            }}>
                              {discount.nazwa}
                            </span>
                            <span style={{
                              padding: '0.125rem 0.375rem',
                              backgroundColor: discount.aktywny ? '#d4edda' : '#f8d7da',
                              color: discount.aktywny ? '#155724' : '#721c24',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}>
                              {discount.aktywny ? 'Aktywny' : 'Nieaktywny'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                            {discount.typ_rabatu === 'procentowy' ? (
                              <span>📊 {discount.wartosc}% rabatu</span>
                            ) : (
                              <span>💰 {parseFloat(discount.wartosc).toFixed(2)} zł rabatu</span>
                            )}
                            {discount.minimum_koszyka > 0 && (
                              <span style={{ marginLeft: '0.5rem' }}>
                                (min. koszyk: {parseFloat(discount.minimum_koszyka).toFixed(2)} zł)
                              </span>
                            )}
                          </div>
                          {discount.opis && (
                            <div style={{ fontSize: '0.8rem', color: '#6c757d', fontStyle: 'italic' }}>
                              {discount.opis}
                            </div>
                          )}
                          {(discount.limit_miesieczny_aktywny || discount.limit_dzienny_aktywny) && (
                            <div style={{ fontSize: '0.75rem', color: '#007bff', marginTop: '0.25rem' }}>
                              {discount.limit_miesieczny_aktywny && '📅 Limit miesięczny '}
                              {discount.limit_dzienny_aktywny && '🕐 Limit dzienny'}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => startEditDiscount(discount)}
                            style={{
                              padding: '0.5rem',
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontSize: '0.75rem'
                            }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteDiscount(discount.id)}
                            style={{
                              padding: '0.5rem',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontSize: '0.75rem'
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel dodawania nowego rabatu */}
      <div>
        <div style={{
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          backgroundColor: 'white',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #e9ecef',
            fontWeight: '600'
          }}>
            ➕ Dodaj nowy rabat
          </div>

          <div style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Nazwa rabatu *
              </label>
              <input
                type="text"
                value={newDiscount.nazwa}
                onChange={(e) => setNewDiscount({...newDiscount, nazwa: e.target.value})}
                placeholder="np. Rabat weekend"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #e9ecef',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Typ rabatu
              </label>
              <select
                value={newDiscount.typ_rabatu}
                onChange={(e) => setNewDiscount({...newDiscount, typ_rabatu: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #e9ecef',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              >
                <option value="procentowy">Procentowy (%)</option>
                <option value="kwotowy">Kwotowy (zł)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Wartość rabatu *
              </label>
              <input
                type="number"
                value={newDiscount.wartosc}
                onChange={(e) => setNewDiscount({...newDiscount, wartosc: parseFloat(e.target.value) || 0})}
                placeholder={newDiscount.typ_rabatu === 'procentowy' ? '10' : '50'}
                min="0"
                step="0.01"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #e9ecef',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Minimalny koszyk
              </label>
              <input
                type="number"
                value={newDiscount.minimum_koszyka}
                onChange={(e) => setNewDiscount({...newDiscount, minimum_koszyka: parseFloat(e.target.value) || 0})}
                placeholder="0"
                min="0"
                step="0.01"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #e9ecef',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Opis
              </label>
              <textarea
                value={newDiscount?.opis || ''}
                onChange={(e) => setNewDiscount({...newDiscount, opis: e.target.value})}
                placeholder="Opis rabatu..."
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #e9ecef',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Limity miesięczne */}
            <div style={{ padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '0.375rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                  type="checkbox"
                  checked={newDiscount.limit_miesieczny_aktywny}
                  onChange={(e) => setNewDiscount({...newDiscount, limit_miesieczny_aktywny: e.target.checked})}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>📅 Limity miesięczne</span>
              </label>
              {newDiscount.limit_miesieczny_aktywny && (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  <input
                    type="number"
                    value={newDiscount.limit_miesieczny_kwota}
                    onChange={(e) => setNewDiscount({...newDiscount, limit_miesieczny_kwota: parseFloat(e.target.value) || 0})}
                    placeholder="Limit kwotowy miesięczny"
                    min="0"
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #e9ecef',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                  <input
                    type="number"
                    value={newDiscount.limit_miesieczny_ilosc}
                    onChange={(e) => setNewDiscount({...newDiscount, limit_miesieczny_ilosc: parseInt(e.target.value) || 0})}
                    placeholder="Limit ilościowy miesięczny"
                    min="0"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #e9ecef',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Limity dzienne */}
            <div style={{ padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '0.375rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                  type="checkbox"
                  checked={newDiscount.limit_dzienny_aktywny}
                  onChange={(e) => setNewDiscount({...newDiscount, limit_dzienny_aktywny: e.target.checked})}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>🕐 Limity dzienne</span>
              </label>
              {newDiscount.limit_dzienny_aktywny && (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  <input
                    type="number"
                    value={newDiscount.limit_dzienny_kwota}
                    onChange={(e) => setNewDiscount({...newDiscount, limit_dzienny_kwota: parseFloat(e.target.value) || 0})}
                    placeholder="Limit kwotowy dzienny"
                    min="0"
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #e9ecef',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                  <input
                    type="number"
                    value={newDiscount.limit_dzienny_ilosc}
                    onChange={(e) => setNewDiscount({...newDiscount, limit_dzienny_ilosc: parseInt(e.target.value) || 0})}
                    placeholder="Limit ilościowy dzienny"
                    min="0"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #e9ecef',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              )}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={newDiscount.aktywny}
                onChange={(e) => setNewDiscount({...newDiscount, aktywny: e.target.checked})}
              />
              <span style={{ fontSize: '0.875rem' }}>Rabat aktywny</span>
            </label>

            <button
              onClick={addDiscount}
              disabled={!newDiscount.nazwa.trim() || newDiscount.wartosc <= 0}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: !newDiscount.nazwa.trim() || newDiscount.wartosc <= 0 ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: !newDiscount.nazwa.trim() || newDiscount.wartosc <= 0 ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              ➕ Dodaj rabat
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDiscountReportsTab = () => (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Statystyki ogólne */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        {[
          { label: 'Łączne rabaty', value: discountStats.rabaty?.total_rabaty || 0, icon: '🎯' },
          { label: 'Aktywne rabaty', value: discountStats.rabaty?.aktywne_rabaty || 0, icon: '✅' },
          { label: 'Użycia dziś', value: discountStats.uzycie?.uzycia_dzisiaj || 0, icon: '📅' },
          { label: 'Wartość dziś', value: `${parseFloat(discountStats.uzycie?.rabaty_dzisiaj || 0).toFixed(2)} zł`, icon: '💰' },
          { label: 'Użycia miesiąc', value: discountStats.uzycie?.uzycia_ten_miesiac || 0, icon: '📊' },
          { label: 'Wartość miesiąc', value: `${parseFloat(discountStats.uzycie?.rabaty_ten_miesiac || 0).toFixed(2)} zł`, icon: '💎' }
        ].map(stat => (
          <div key={stat.label} style={{
            padding: '1rem',
            backgroundColor: 'white',
            border: '1px solid #e9ecef',
            borderRadius: '0.375rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{stat.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#495057' }}>{stat.value}</div>
            <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filtry raportów */}
      <div style={{
        padding: '1.5rem',
        backgroundColor: 'white',
        border: '1px solid #e9ecef',
        borderRadius: '0.375rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
          📊 Filtry raportów
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Typ raportu
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #e9ecef',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            >
              <option value="dzienne">Raporty dzienne</option>
              <option value="miesieczne">Raporty miesięczne</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              {reportType === 'dzienne' ? 'Data od' : 'Miesiąc'}
            </label>
            <input
              type={reportType === 'dzienne' ? 'date' : 'month'}
              value={reportFilters.data_od}
              onChange={(e) => setReportFilters({...reportFilters, data_od: e.target.value})}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #e9ecef',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {reportType === 'dzienne' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Data do
              </label>
              <input
                type="date"
                value={reportFilters.data_do}
                onChange={(e) => setReportFilters({...reportFilters, data_do: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #e9ecef',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Kasjer (opcjonalnie)
            </label>
            <input
              type="text"
              value={reportFilters.user_id}
              onChange={(e) => setReportFilters({...reportFilters, user_id: e.target.value})}
              placeholder="np. admin"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #e9ecef',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={loadDiscountReports}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            🔍 Generuj raport
          </button>
          
          <button
            onClick={exportDiscountReport}
            disabled={discountReports.length === 0}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: discountReports.length === 0 ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: discountReports.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            📥 Eksport CSV
          </button>
          
          <button
            onClick={loadDiscountStats}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            🔄 Odśwież statystyki
          </button>
        </div>
      </div>

      {/* Tabela raportów */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e9ecef',
        borderRadius: '0.375rem',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #e9ecef',
          fontWeight: '600'
        }}>
          📋 Wyniki raportu ({discountReports.length} rekordów)
        </div>
        
        {discountReports.length === 0 ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#6c757d'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
            <p>Brak danych dla wybranych filtrów</p>
            <p style={{ fontSize: '0.875rem' }}>Kliknij "Generuj raport" aby załadować dane</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  {reportType === 'dzienne' ? (
                    <>
                      <th style={tableHeaderStyle}>Data</th>
                      <th style={tableHeaderStyle}>Rabat</th>
                      <th style={tableHeaderStyle}>Typ</th>
                      <th style={tableHeaderStyle}>Kasjer</th>
                      <th style={tableHeaderStyle}>Ilość użyć</th>
                      <th style={tableHeaderStyle}>Suma rabatów</th>
                      <th style={tableHeaderStyle}>Średni rabat</th>
                      <th style={tableHeaderStyle}>Min/Max</th>
                      <th style={tableHeaderStyle}>Akcje</th>
                    </>
                  ) : (
                    <>
                      <th style={tableHeaderStyle}>Miesiąc</th>
                      <th style={tableHeaderStyle}>Rabat</th>
                      <th style={tableHeaderStyle}>Typ</th>
                      <th style={tableHeaderStyle}>Kasjer</th>
                      <th style={tableHeaderStyle}>Ilość użyć</th>
                      <th style={tableHeaderStyle}>Suma rabatów</th>
                      <th style={tableHeaderStyle}>Średni rabat</th>
                      <th style={tableHeaderStyle}>Akcje</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {discountReports.map((report, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e9ecef' }}>
                    <td style={tableCellStyle}>{reportType === 'dzienne' ? report.dzien : report.miesiac_rok}</td>
                    <td style={tableCellStyle}>
                      <span style={{ fontWeight: '500' }}>{report.rabat_nazwa}</span>
                    </td>
                    <td style={tableCellStyle}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: report.typ_rabatu === 'procentowy' ? '#e7f3ff' : '#fff3cd',
                        color: report.typ_rabatu === 'procentowy' ? '#0066cc' : '#856404',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}>
                        {report.typ_rabatu === 'procentowy' ? '📊 %' : '💰 zł'}
                      </span>
                    </td>
                    <td style={tableCellStyle}>{report.kasjer}</td>
                    <td style={tableCellStyle}>
                      <span style={{ fontWeight: '600' }}>{report.ilosc_uzyc}</span>
                    </td>
                    <td style={tableCellStyle}>
                      <span style={{ fontWeight: '600', color: '#28a745' }}>{parseFloat(report.suma_rabatow).toFixed(2)} zł</span>
                    </td>
                    <td style={tableCellStyle}>{parseFloat(report.sredni_rabat).toFixed(2)} zł</td>
                    {reportType === 'dzienne' && (
                      <td style={tableCellStyle}>
                        <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                          <div>Min: {parseFloat(report.min_rabat).toFixed(2)} zł</div>
                          <div>Max: {parseFloat(report.max_rabat).toFixed(2)} zł</div>
                        </div>
                      </td>
                    )}
                    <td style={tableCellStyle}>
                      <button
                        onClick={() => fetchDiscountDetails(report.rabat_id)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        📊 Szczegóły
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal szczegółów rabatu */}
      {discountDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '2rem',
            maxWidth: '80%',
            maxHeight: '80%',
            overflow: 'auto',
            minWidth: '600px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                📊 Szczegóły rabatu: {discountDetails.rabat?.nazwa}
              </h3>
              <button
                onClick={() => setDiscountDetails(null)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer'
                }}
              >
                ✕ Zamknij
              </button>
            </div>

            {/* Informacje o rabacie */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '0.375rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <strong>Typ:</strong> {discountDetails.rabat?.typ_rabatu} 
                  ({discountDetails.rabat?.wartosc}{discountDetails.rabat?.typ_rabatu === 'procentowy' ? '%' : ' zł'})
                </div>
                <div><strong>Łączne użycia:</strong> {discountDetails.rabat?.total_uzyc}</div>
                <div><strong>Suma rabatów:</strong> {parseFloat(discountDetails.rabat?.suma_rabatow || 0).toFixed(2)} zł</div>
                <div><strong>Średni rabat:</strong> {parseFloat(discountDetails.rabat?.sredni_rabat || 0).toFixed(2)} zł</div>
              </div>
            </div>

            {/* Lista transakcji */}
            <div>
              <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>
                🧾 Transakcje ({discountDetails.historia_uzyc?.length || 0})
              </h4>
              
              {discountDetails.historia_uzyc && discountDetails.historia_uzyc.length > 0 ? (
                <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa' }}>
                        <th style={tableHeaderStyle}>Data</th>
                        <th style={tableHeaderStyle}>Nr transakcji</th>
                        <th style={tableHeaderStyle}>Kasjer</th>
                        <th style={tableHeaderStyle}>Wartość transakcji</th>
                        <th style={tableHeaderStyle}>Kwota rabatu</th>
                        <th style={tableHeaderStyle}>Po rabacie</th>
                        <th style={tableHeaderStyle}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {discountDetails.historia_uzyc.map((transaction, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #e9ecef' }}>
                          <td style={tableCellStyle}>{transaction.data_zastosowania}</td>
                          <td style={tableCellStyle}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                              {transaction.numer_transakcji}
                            </span>
                          </td>
                          <td style={tableCellStyle}>{transaction.kasjer_id}</td>
                          <td style={tableCellStyle}>{parseFloat(transaction.wartosc_transakcji || 0).toFixed(2)} zł</td>
                          <td style={tableCellStyle}>
                            <span style={{ color: '#dc3545', fontWeight: '600' }}>
                              -{parseFloat(transaction.kwota_rabatu).toFixed(2)} zł
                            </span>
                          </td>
                          <td style={tableCellStyle}>
                            <span style={{ color: '#28a745', fontWeight: '600' }}>
                              {parseFloat(transaction.kwota_po_rabacie).toFixed(2)} zł
                            </span>
                          </td>
                          <td style={tableCellStyle}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: transaction.status === 'zakonczony' ? '#d4edda' : '#fff3cd',
                              color: transaction.status === 'zakonczony' ? '#155724' : '#856404',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}>
                              {transaction.status === 'zakonczony' ? '✅ Zakończona' : '⏳ W trakcie'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#6c757d',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '0.375rem'
                }}>
                  Brak transakcji w wybranym okresie
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Style dla tabeli
  const tableHeaderStyle = {
    padding: '0.75rem',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '0.875rem',
    color: '#495057',
    borderBottom: '2px solid #e9ecef'
  };

  const tableCellStyle = {
    padding: '0.75rem',
    fontSize: '0.875rem',
    color: '#495057'
  };

  const renderUsersTab = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
      <div>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
          marginBottom: '1rem'
        }}>
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa'
          }}>
            <h6 style={{ margin: 0, fontWeight: '600', color: '#495057' }}>
              👥 Zarządzanie użytkownikami
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            {/* Formularz dodawania użytkownika */}
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '0.375rem' }}>
              <h6 style={{ margin: '0 0 1rem 0', fontWeight: '600', color: '#495057' }}>➕ Dodaj nowego użytkownika</h6>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Login</label>
                  <input
                    type="text"
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      outline: 'none'
                    }}
                    placeholder="Login użytkownika"
                    value={newUser.login}
                    onChange={(e) => setNewUser({...newUser, login: e.target.value})}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Hasło</label>
                  <input
                    type="password"
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      outline: 'none'
                    }}
                    placeholder="Hasło"
                    value={newUser.haslo}
                    onChange={(e) => setNewUser({...newUser, haslo: e.target.value})}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Typ</label>
                  <select
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                    value={newUser.typ}
                    onChange={(e) => setNewUser({...newUser, typ: e.target.value})}
                  >
                    <option value="kasjer">Kasjer</option>
                    <option value="kierownik">Kierownik</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <button 
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: 'white',
                    backgroundColor: '#28a745',
                    border: '1px solid #28a745',
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                  }}
                  onClick={addUser}
                  disabled={!newUser.login.trim() || !newUser.haslo.trim()}
                >
                  ➕ Dodaj
                </button>
              </div>
            </div>

            {/* Tabela użytkowników */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem', fontWeight: '600' }}>ID</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem', fontWeight: '600' }}>Login</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem', fontWeight: '600' }}>Typ</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem', fontWeight: '600' }}>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: '#6c757d',
                        fontStyle: 'italic'
                      }}>
                        Brak użytkowników w systemie
                      </td>
                    </tr>
                  ) : (
                    users.map(user => (
                      <tr key={user.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            backgroundColor: '#007bff',
                            color: 'white',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            {user.id}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>👤</span>
                            <span style={{ fontWeight: '500' }}>{user.login}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            backgroundColor: user.role === 'admin' ? '#dc3545' : user.role === 'kierownik' ? '#ffc107' : '#007bff',
                            color: 'white',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            {user.role === 'admin' ? 'Administrator' : user.role === 'kierownik' ? 'Kierownik' : 'Kasjer'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            backgroundColor: '#28a745',
                            color: 'white',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            🟢 Aktywny
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button 
                              style={{
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                color: 'white',
                                backgroundColor: '#007bff',
                                border: '1px solid #007bff',
                                borderRadius: '0.25rem',
                                cursor: 'pointer'
                              }}
                              onClick={() => startEditUser(user)}
                              title="Edytuj użytkownika"
                            >
                              ✏️
                            </button>
                            <button 
                              style={{
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                color: 'white',
                                backgroundColor: '#dc3545',
                                border: '1px solid #dc3545',
                                borderRadius: '0.25rem',
                                cursor: 'pointer'
                              }}
                              onClick={() => deleteUser(user.id)}
                              title="Usuń użytkownika"
                            >
                              🗑️ Usuń
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Formularz edycji użytkownika */}
            {editingUser && (
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
                zIndex: 1050
              }}>
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '0.375rem',
                  padding: '1.5rem',
                  minWidth: '400px',
                  maxWidth: '500px',
                  boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)'
                }}>
                  <h5 style={{ marginBottom: '1rem', fontWeight: '600' }}>Edytuj użytkownika</h5>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                      Login:
                    </label>
                    <input
                      type="text"
                      style={{
                        width: '100%',
                        padding: '0.375rem 0.75rem',
                        fontSize: '0.875rem',
                        border: '1px solid #ced4da',
                        borderRadius: '0.375rem',
                        outline: 'none',
                        backgroundColor: 'white'
                      }}
                      value={editingUser.login}
                      onChange={(e) => setEditingUser({...editingUser, login: e.target.value})}
                      placeholder="Wpisz login"
                    />
                  </div>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                      Nowe hasło (opcjonalne):
                    </label>
                    <input
                      type="password"
                      style={{
                        width: '100%',
                        padding: '0.375rem 0.75rem',
                        fontSize: '0.875rem',
                        border: '1px solid #ced4da',
                        borderRadius: '0.375rem',
                        outline: 'none',
                        backgroundColor: 'white'
                      }}
                      value={editingUser.haslo}
                      onChange={(e) => setEditingUser({...editingUser, haslo: e.target.value})}
                      placeholder="Zostaw puste, aby nie zmieniać hasła"
                    />
                  </div>
                  
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                      Typ:
                    </label>
                    <select
                      style={{
                        width: '100%',
                        padding: '0.375rem 0.75rem',
                        fontSize: '0.875rem',
                        border: '1px solid #ced4da',
                        borderRadius: '0.375rem',
                        outline: 'none',
                        backgroundColor: 'white'
                      }}
                      value={editingUser.typ}
                      onChange={(e) => setEditingUser({...editingUser, typ: e.target.value})}
                    >
                      <option value="kasjer">Kasjer</option>
                      <option value="kierownik">Kierownik</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button 
                      style={{
                        padding: '0.375rem 0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#6c757d',
                        backgroundColor: 'white',
                        border: '1px solid #6c757d',
                        borderRadius: '0.375rem',
                        cursor: 'pointer'
                      }}
                      onClick={cancelEditUser}
                    >
                      Anuluj
                    </button>
                    <button 
                      style={{
                        padding: '0.375rem 0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: 'white',
                        backgroundColor: '#28a745',
                        border: '1px solid #28a745',
                        borderRadius: '0.375rem',
                        cursor: 'pointer'
                      }}
                      onClick={updateUser}
                      disabled={!editingUser.login.trim()}
                    >
                      💾 Zapisz zmiany
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div>
        <div style={{
          backgroundColor: '#007bff',
          color: 'white',
          borderRadius: '0.375rem',
          padding: '1rem',
          textAlign: 'center',
          marginBottom: '1rem'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            👥 {users.length}
          </div>
          <div>Łączna liczba użytkowników</div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
        }}>
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa'
          }}>
            <h6 style={{ margin: 0, fontWeight: '600', color: '#495057' }}>
              💡 Informacje
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            <p style={{ color: '#6c757d', lineHeight: '1.5', margin: '0', fontSize: '0.875rem' }}>
              Zarządzaj użytkownikami systemu. Możesz dodawać nowych użytkowników z różnymi uprawnieniami:
            </p>
            <ul style={{ color: '#6c757d', fontSize: '0.875rem', paddingLeft: '1.5rem', margin: '0.5rem 0 0 0' }}>
              <li><strong>Kasjer</strong> - podstawowe uprawnienia POS</li>
              <li><strong>Kierownik</strong> - zarządzanie magazynem</li>
              <li><strong>Administrator</strong> - pełne uprawnienia</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <div>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
        }}>
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa'
          }}>
            <h6 style={{ margin: 0, fontWeight: '600', color: '#495057' }}>
              ⚙️ Ustawienia systemu
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '500',
                  fontSize: '0.875rem'
                }}>
                  Nazwa sklepu
                </label>
                <input 
                  type="text" 
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem'
                  }}
                  defaultValue="Mój Sklep" 
                />
              </div>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '500',
                  fontSize: '0.875rem'
                }}>
                  NIP
                </label>
                <input 
                  type="text" 
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem'
                  }}
                  defaultValue="1234567890" 
                />
              </div>
              <button style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'white',
                backgroundColor: '#28a745',
                border: '1px solid #28a745',
                borderRadius: '0.375rem',
                cursor: 'pointer'
              }}>
                💾 Zapisz ustawienia
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
        }}>
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa'
          }}>
            <h6 style={{ margin: 0, fontWeight: '600', color: '#495057' }}>
              🛡️ Ustawienia bezpieczeństwa
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="autoLogout" 
                  defaultChecked 
                />
                <label htmlFor="autoLogout" style={{ fontSize: '0.875rem' }}>
                  Automatyczne wylogowanie po bezczynności
                </label>
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '500',
                  fontSize: '0.875rem'
                }}>
                  Czas bezczynności (minuty)
                </label>
                <input 
                  type="number" 
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem'
                  }}
                  defaultValue="30" 
                />
              </div>
              
              <button style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'white',
                backgroundColor: '#ffc107',
                border: '1px solid #ffc107',
                borderRadius: '0.375rem',
                cursor: 'pointer'
              }}>
                🔒 Zapisz ustawienia bezpieczeństwa
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDailyClosureTab = () => (
    <div>
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e9ecef',
        borderRadius: '0.375rem',
        boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
        marginBottom: '1rem'
      }}>
        <div style={{ 
          padding: '1rem',
          borderBottom: '1px solid #e9ecef',
          backgroundColor: '#f8f9fa'
        }}>
          <h5 style={{ margin: 0, fontWeight: '600', color: '#495057' }}>
            🔒 Raporty zamknięć dnia
          </h5>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#6c757d' }}>
            Przegląd wszystkich zamknięć zmian z pełnymi raportami i weryfikacjami
          </p>
        </div>
        
        {/* Filtry */}
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Data od
              </label>
              <input
                type="date"
                value={dailyClosureFilters.date_from}
                onChange={(e) => setDailyClosureFilters(prev => ({ ...prev, date_from: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Data do
              </label>
              <input
                type="date"
                value={dailyClosureFilters.date_to}
                onChange={(e) => setDailyClosureFilters(prev => ({ ...prev, date_to: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Kasjer
              </label>
              <input
                type="text"
                value={dailyClosureFilters.cashier}
                onChange={(e) => setDailyClosureFilters(prev => ({ ...prev, cashier: e.target.value }))}
                placeholder="Login kasjera (opcjonalny)"
                style={{
                  width: '100%',
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem'
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'end', gap: '0.5rem' }}>
              <button
                onClick={loadDailyClosureReports}
                disabled={loading}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'white',
                  backgroundColor: '#007bff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Ładowanie...' : 'Filtruj'}
              </button>
              <button
                onClick={exportDailyClosureReports}
                disabled={!dailyClosureReports?.length}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'white',
                  backgroundColor: '#28a745',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: !dailyClosureReports?.length ? 'not-allowed' : 'pointer',
                  opacity: !dailyClosureReports?.length ? 0.6 : 1
                }}
              >
                📊 Eksportuj CSV
              </button>
            </div>
          </div>

          {/* Podsumowanie */}
          {dailyClosureSummary && Object.keys(dailyClosureSummary).length > 0 && (
            <div style={{
              padding: '1rem',
              background: '#e7f3ff',
              border: '1px solid #b3d9ff',
              borderRadius: '0.375rem',
              marginBottom: '1rem'
            }}>
              <h6 style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#0056b3' }}>
                📊 Podsumowanie okresu
              </h6>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <strong>Liczba zmian:</strong> {dailyClosureSummary.total_shifts || 0}
                </div>
                <div>
                  <strong>Łączna sprzedaż:</strong> {(dailyClosureSummary.total_sales || 0).toFixed(2)} zł
                </div>
                <div>
                  <strong>Sprzedaż gotówka:</strong> {(dailyClosureSummary.total_cash_sales || 0).toFixed(2)} zł
                </div>
                <div>
                  <strong>Sprzedaż karta:</strong> {(dailyClosureSummary.total_card_sales || 0).toFixed(2)} zł
                </div>
                <div>
                  <strong>Transakcje:</strong> {dailyClosureSummary.total_transactions || 0}
                </div>
                <div style={{ color: dailyClosureSummary.total_cash_differences >= 0 ? '#28a745' : '#dc3545' }}>
                  <strong>Różnice w kasie:</strong> {(dailyClosureSummary.total_cash_differences || 0).toFixed(2)} zł
                </div>
              </div>
            </div>
          )}

          {/* Lista raportów */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '0.75rem', border: '1px solid #dee2e6', textAlign: 'left' }}>Data</th>
                  <th style={{ padding: '0.75rem', border: '1px solid #dee2e6', textAlign: 'left' }}>Kasjer</th>
                  <th style={{ padding: '0.75rem', border: '1px solid #dee2e6', textAlign: 'right' }}>Kasa System</th>
                  <th style={{ padding: '0.75rem', border: '1px solid #dee2e6', textAlign: 'right' }}>Kasa Fizyczna</th>
                  <th style={{ padding: '0.75rem', border: '1px solid #dee2e6', textAlign: 'right' }}>Różnica</th>
                  <th style={{ padding: '0.75rem', border: '1px solid #dee2e6', textAlign: 'right' }}>Terminal</th>
                  <th style={{ padding: '0.75rem', border: '1px solid #dee2e6', textAlign: 'right' }}>Kasa Fiskalna</th>
                  <th style={{ padding: '0.75rem', border: '1px solid #dee2e6', textAlign: 'center' }}>Social Media</th>
                  <th style={{ padding: '0.75rem', border: '1px solid #dee2e6', textAlign: 'center' }}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {dailyClosureReports?.length > 0 ? (
                  dailyClosureReports.map((report) => (
                    <tr key={report.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '0.75rem', border: '1px solid #dee2e6' }}>
                        {report.data_zamkniecia}
                      </td>
                      <td style={{ padding: '0.75rem', border: '1px solid #dee2e6' }}>
                        {report.kasjer_login}
                      </td>
                      <td style={{ padding: '0.75rem', border: '1px solid #dee2e6', textAlign: 'right' }}>
                        {(report.kasa_system || 0).toFixed(2)} zł
                      </td>
                      <td style={{ padding: '0.75rem', border: '1px solid #dee2e6', textAlign: 'right' }}>
                        {(report.kasa_fizyczna || 0).toFixed(2)} zł
                      </td>
                      <td style={{ 
                        padding: '0.75rem', 
                        border: '1px solid #dee2e6', 
                        textAlign: 'right',
                        color: (report.roznica_kasa || 0) >= 0 ? '#28a745' : '#dc3545',
                        fontWeight: '500'
                      }}>
                        {(report.roznica_kasa || 0) >= 0 ? '+' : ''}{(report.roznica_kasa || 0).toFixed(2)} zł
                      </td>
                      <td style={{ padding: '0.75rem', border: '1px solid #dee2e6', textAlign: 'right' }}>
                        {(report.terminal_rzeczywisty || 0).toFixed(2)} zł
                      </td>
                      <td style={{ padding: '0.75rem', border: '1px solid #dee2e6', textAlign: 'right' }}>
                        {(report.kasa_fiskalna_raport || 0).toFixed(2)} zł
                      </td>
                      <td style={{ padding: '0.75rem', border: '1px solid #dee2e6', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                          {report.social_media_tiktok && <span title="TikTok">📱</span>}
                          {report.social_media_facebook && <span title="Facebook">📘</span>}
                          {report.social_media_instagram && <span title="Instagram">📷</span>}
                          {report.social_media_google && <span title="Google">🔍</span>}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', border: '1px solid #dee2e6', textAlign: 'center' }}>
                        <button
                          onClick={() => viewClosureReportDetails(report.id)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            color: '#007bff',
                            backgroundColor: 'transparent',
                            border: '1px solid #007bff',
                            borderRadius: '0.25rem',
                            cursor: 'pointer'
                          }}
                        >
                          Szczegóły
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" style={{ 
                      padding: '1rem', 
                      textAlign: 'center', 
                      color: '#6c757d',
                      border: '1px solid #dee2e6'
                    }}>
                      {loading ? 'Ładowanie raportów...' : 'Brak raportów zamknięć dla wybranych kryteriów'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal szczegółów raportu */}
      {showClosureReportModal && selectedClosureReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '0.5rem',
            minWidth: '800px',
            maxWidth: '1000px',
            width: '95vw',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e9ecef',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h5 style={{ margin: 0, fontWeight: '600' }}>
                🔒 Szczegóły zamknięcia dnia - {selectedClosureReport.report?.data_zamkniecia}
              </h5>
              <button
                onClick={() => setShowClosureReportModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: '#6c757d',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Lewa kolumna - Dane kasowe */}
                <div>
                  <h6 style={{ margin: '0 0 1rem 0', fontWeight: '600', color: '#495057' }}>
                    💰 Dane kasowe
                  </h6>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>Kasjer:</strong> {selectedClosureReport.report?.kasjer_login}<br/>
                    <strong>Data zamknięcia:</strong> {selectedClosureReport.report?.data_zamkniecia}<br/>
                    <strong>Czas zamknięcia:</strong> {selectedClosureReport.report?.czas_zamkniecia}
                  </div>

                  <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '0.375rem' }}>
                    <strong>Kasa według systemu:</strong> {(selectedClosureReport.report?.kasa_system || 0).toFixed(2)} zł<br/>
                    <strong>Kasa fizycznie:</strong> {(selectedClosureReport.report?.kasa_fizyczna || 0).toFixed(2)} zł<br/>
                    <strong style={{ color: (selectedClosureReport.report?.roznica_kasa || 0) >= 0 ? '#28a745' : '#dc3545' }}>
                      Różnica w kasie: {(selectedClosureReport.report?.roznica_kasa || 0) >= 0 ? '+' : ''}{(selectedClosureReport.report?.roznica_kasa || 0).toFixed(2)} zł
                    </strong>
                  </div>

                  <div style={{ marginBottom: '1rem', padding: '1rem', background: '#e7f3ff', borderRadius: '0.375rem' }}>
                    <strong>Terminal - system:</strong> {(selectedClosureReport.report?.terminal_system || 0).toFixed(2)} zł<br/>
                    <strong>Terminal - rzeczywisty:</strong> {(selectedClosureReport.report?.terminal_rzeczywisty || 0).toFixed(2)} zł<br/>
                    <strong style={{ color: (selectedClosureReport.report?.roznica_terminal || 0) >= 0 ? '#28a745' : '#dc3545' }}>
                      Różnica terminal: {(selectedClosureReport.report?.roznica_terminal || 0) >= 0 ? '+' : ''}{(selectedClosureReport.report?.roznica_terminal || 0).toFixed(2)} zł
                    </strong>
                  </div>

                  <div style={{ marginBottom: '1rem', padding: '1rem', background: '#fff3cd', borderRadius: '0.375rem' }}>
                    <strong>Kasa fiskalna - raport dobowy:</strong> {(selectedClosureReport.report?.kasa_fiskalna_raport || 0).toFixed(2)} zł
                  </div>
                </div>

                {/* Prawa kolumna - Social Media i osiągnięcia */}
                <div>
                  <h6 style={{ margin: '0 0 1rem 0', fontWeight: '600', color: '#495057' }}>
                    📱 Social Media
                  </h6>
                  
                  {selectedClosureReport.report?.social_media_tiktok && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>TikTok:</strong> {selectedClosureReport.report.social_media_tiktok}
                    </div>
                  )}
                  {selectedClosureReport.report?.social_media_facebook && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Facebook:</strong> {selectedClosureReport.report.social_media_facebook}
                    </div>
                  )}
                  {selectedClosureReport.report?.social_media_instagram && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Instagram:</strong> {selectedClosureReport.report.social_media_instagram}
                    </div>
                  )}
                  {selectedClosureReport.report?.social_media_google && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Google Business:</strong> {selectedClosureReport.report.social_media_google}
                    </div>
                  )}

                  <h6 style={{ margin: '1.5rem 0 1rem 0', fontWeight: '600', color: '#495057' }}>
                    🎯 Osiągnięcia dnia
                  </h6>
                  
                  {selectedClosureReport.report?.osiagniecia_sprzedaz && (
                    <div style={{ marginBottom: '1rem' }}>
                      <strong>Sprzedaż:</strong><br/>
                      {selectedClosureReport.report.osiagniecia_sprzedaz}
                    </div>
                  )}
                  {selectedClosureReport.report?.osiagniecia_praca && (
                    <div style={{ marginBottom: '1rem' }}>
                      <strong>Praca w sklepie:</strong><br/>
                      {selectedClosureReport.report.osiagniecia_praca}
                    </div>
                  )}

                  {selectedClosureReport.report?.uwagi_zamkniecia && (
                    <div style={{ marginTop: '1.5rem' }}>
                      <h6 style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#495057' }}>
                        📝 Uwagi
                      </h6>
                      {selectedClosureReport.report.uwagi_zamkniecia}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderLogsTab = () => (
    <div>
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e9ecef',
        borderRadius: '0.375rem',
        boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
      }}>
        <div style={{ 
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #e9ecef',
          backgroundColor: '#f8f9fa'
        }}>
          <h6 style={{ margin: 0, fontWeight: '600', color: '#495057' }}>
            📋 Logi systemowe
          </h6>
        </div>
        <div style={{ padding: '1rem' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr', 
            gap: '0.5rem', 
            marginBottom: '1rem' 
          }}>
            <select style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.875rem',
              border: '1px solid #ced4da',
              borderRadius: '0.375rem'
            }}>
              <option>Wszystkie logi</option>
              <option>Logowania</option>
              <option>Transakcje</option>
              <option>Błędy</option>
            </select>
            <input type="date" style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.875rem',
              border: '1px solid #ced4da',
              borderRadius: '0.375rem'
            }} />
            <button style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'white',
              backgroundColor: '#007bff',
              border: '1px solid #007bff',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}>
              🔍 Filtruj logi
            </button>
          </div>
          
          <div style={{ 
            maxHeight: '25rem', 
            overflowY: 'auto',
            border: '1px solid #e9ecef',
            borderRadius: '0.375rem'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem', fontWeight: '600' }}>Czas</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem', fontWeight: '600' }}>Typ</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem', fontWeight: '600' }}>Użytkownik</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontSize: '0.875rem', fontWeight: '600' }}>Akcja</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e9ecef' }}>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    2024-01-15 10:30:15
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem'
                    }}>INFO</span>
                  </td>
                  <td style={{ padding: '0.75rem', fontWeight: '500' }}>admin</td>
                  <td style={{ padding: '0.75rem' }}>Pomyślne logowanie do systemu</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e9ecef' }}>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    2024-01-15 10:25:42
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem'
                    }}>TRANS</span>
                  </td>
                  <td style={{ padding: '0.75rem', fontWeight: '500' }}>kasjer1</td>
                  <td style={{ padding: '0.75rem' }}>Transakcja #1234 - 45.50 zł</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  // Render funkcji dla definicji dokumentów
  const renderDocumentDefinitionsTab = () => {
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

  // Render funkcji dla automatycznych backupów
  const renderAutoBackupTab = () => {

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
          
          {loading ? (
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
  // Dodajemy CSS animację
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
          <span>💾</span> Automatyczne kopie zapasowe
        </h3>
        <p style={{ color: '#6c757d', margin: '0 0 1rem 0' }}>
          System automatycznie tworzy kopie zapasowe bazy danych codziennie o 21:30
        </p>

        {/* Status Schedulera */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            padding: '1rem',
            backgroundColor: 'white',
            borderRadius: '0.375rem',
            border: '1px solid #e9ecef'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>Status Schedulera</h4>
            {backupSchedulerStatus ? (
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    backgroundColor: backupSchedulerStatus.is_running ? '#d4edda' : '#f8d7da',
                    color: backupSchedulerStatus.is_running ? '#155724' : '#721c24'
                  }}>
                    {backupSchedulerStatus.is_running ? '🟢 AKTYWNY' : '🔴 NIEAKTYWNY'}
                  </span>
                </div>
                {backupSchedulerStatus.next_backup && (
                  <p style={{ color: '#6c757d', margin: '0', fontSize: '0.875rem' }}>
                    Następny backup: {backupSchedulerStatus.next_backup}
                  </p>
                )}
                <p style={{ color: '#6c757d', margin: '0', fontSize: '0.875rem' }}>
                  Zaplanowanych zadań: {backupSchedulerStatus.scheduled_jobs}
                </p>
              </div>
            ) : (
              <p style={{ color: '#6c757d', margin: '0' }}>Ładowanie...</p>
            )}
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: 'white',
            borderRadius: '0.375rem',
            border: '1px solid #e9ecef'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#495057' }}>Kontrola Schedulera</h4>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleStartScheduler}
                disabled={backupLoading || (backupSchedulerStatus && backupSchedulerStatus.is_running)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  opacity: (backupLoading || (backupSchedulerStatus && backupSchedulerStatus.is_running)) ? 0.6 : 1
                }}
              >
                {backupLoading ? 'Ładowanie...' : '▶️ Uruchom'}
              </button>
              <button
                onClick={handleStopScheduler}
                disabled={backupLoading || (backupSchedulerStatus && !backupSchedulerStatus.is_running)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  opacity: (backupLoading || (backupSchedulerStatus && !backupSchedulerStatus.is_running)) ? 0.6 : 1
                }}
              >
                {backupLoading ? 'Ładowanie...' : '⏹️ Zatrzymaj'}
              </button>
            </div>
          </div>
        </div>

        {/* Ręczny backup */}
        <div style={{
          padding: '1rem',
          backgroundColor: 'white',
          borderRadius: '0.375rem',
          border: '1px solid #e9ecef',
          marginBottom: '1.5rem'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>Ręczny Backup</h4>
          <p style={{ color: '#6c757d', margin: '0 0 1rem 0', fontSize: '0.875rem' }}>
            Utwórz kopię zapasową natychmiast (niezależnie od automatycznego harmonogramu)
          </p>
          <button
            onClick={handleManualBackup}
            disabled={backupLoading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              opacity: backupLoading ? 0.6 : 1
            }}
          >
            {backupLoading ? 'Tworzenie...' : '💾 Utwórz backup teraz'}
          </button>
        </div>

        {/* Lista backupów */}
        <div style={{
          padding: '1rem',
          backgroundColor: 'white',
          borderRadius: '0.375rem',
          border: '1px solid #e9ecef'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h4 style={{ margin: '0', color: '#495057' }}>Lista Kopii Zapasowych</h4>
            <button
              onClick={loadBackupList}
              style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              🔄 Odśwież
            </button>
          </div>

          {backupList.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid #e9ecef' }}>Nazwa pliku</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid #e9ecef' }}>Rozmiar</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid #e9ecef' }}>Data utworzenia</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid #e9ecef' }}>Typ</th>
                  </tr>
                </thead>
                <tbody>
                  {backupList.map((backup, index) => (
                    <tr key={index}>
                      <td style={{ padding: '0.5rem', border: '1px solid #e9ecef', fontSize: '0.875rem' }}>
                        {backup.filename}
                      </td>
                      <td style={{ padding: '0.5rem', border: '1px solid #e9ecef', fontSize: '0.875rem' }}>
                        {(backup.size / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td style={{ padding: '0.5rem', border: '1px solid #e9ecef', fontSize: '0.875rem' }}>
                        {new Date(backup.created).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.5rem', border: '1px solid #e9ecef', fontSize: '0.875rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          backgroundColor: backup.is_automatic ? '#d1ecf1' : '#fff3cd',
                          color: backup.is_automatic ? '#0c5460' : '#856404'
                        }}>
                          {backup.is_automatic ? '🤖 Auto' : '👤 Ręczny'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#6c757d', margin: '0', textAlign: 'center', padding: '2rem' }}>
              Brak kopii zapasowych
            </p>
          )}
        </div>
  // Dodajemy CSS animację
  const spinKeyframes = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;

  return (
    <>
      <style>{spinKeyframes}</style>
      <div style={{ 
        padding: '1.5rem',
        backgroundColor: '#f8f9fa',
        minHeight: '100vh'
      }}>
        {/* Header */}
        <div style={{
          marginBottom: '1.5rem',
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.375rem',
          border: '1px solid #e9ecef',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
        }}>
          <h1 style={{ 
            margin: '0 0 0.5rem 0',
            fontSize: '1.75rem',
            fontWeight: '600',
            color: '#343a40'
          }}>
            ⚙️ Panel Administratora
          </h1>
          <p style={{ 
            margin: 0,
            color: '#6c757d',
            fontSize: '1rem'
          }}>
            Centralny system zarządzania sklepem
          </p>
          
          {error && (
            <div style={{ 
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '0.375rem',
              color: '#721c24',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>
                <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>
                {error}
              </span>
              <button 
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#721c24',
                  fontSize: '18px',
                  cursor: 'pointer'
                }}
                onClick={() => setError(null)}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Tabs Navigation */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          overflow: 'hidden',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
        }}>
          <div style={{
            display: 'flex',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #e9ecef',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}>
            {[
              { id: 'system', icon: '🖥️', label: 'System' },
              { id: 'announcements', icon: '📢', label: 'Ogłoszenia' },
              { id: 'users', icon: '👥', label: 'Użytkownicy' },
              { id: 'manufacturers', icon: '🏭', label: 'Producenci' },
              { id: 'warehouses', icon: '🏪', label: 'Magazyny' },
              { id: 'categories', icon: '🏷️', label: 'Kategorie' },
              { id: 'discounts', icon: '🎯', label: 'Rabaty' },
              { id: 'discount-reports', icon: '📊', label: 'Raporty' },
              { id: 'daily-closure', icon: '🔒', label: 'Zamknięcie dnia' },
              { id: 'document-definitions', icon: '📄', label: 'Definicje dokumentów' },
              { id: 'auto-backup', icon: '💾', label: 'Auto Backup' },
              { id: 'settings', icon: '⚙️', label: 'Ustawienia' },
              { id: 'logs', icon: '📋', label: 'Logi' }
            ].map(tab => (
              <button
                key={tab.id}
                style={{
                  padding: '0.75rem 1rem',
                  border: 'none',
                  backgroundColor: activeTab === tab.id ? '#007bff' : 'transparent',
                  color: activeTab === tab.id ? 'white' : '#495057',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderBottom: activeTab === tab.id ? '2px solid #007bff' : '2px solid transparent',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                  minWidth: 'fit-content'
                }}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ padding: '1.5rem' }}>
            {activeTab === 'system' && renderSystemTab()}
            {activeTab === 'announcements' && <AnnouncementAdmin />}
            {activeTab === 'users' && renderUsersTab()}
            {activeTab === 'manufacturers' && renderManufacturersTab()}
            {activeTab === 'warehouses' && <WarehouseManagement />}
            {activeTab === 'categories' && renderCategoriesTab()}
            {activeTab === 'discounts' && renderDiscountsTab()}
            {activeTab === 'discount-reports' && renderDiscountReportsTab()}
            {activeTab === 'daily-closure' && renderDailyClosureTab()}
            {activeTab === 'document-definitions' && renderDocumentDefinitionsTab()}
            {activeTab === 'auto-backup' && renderAutoBackupTab()}
            {activeTab === 'settings' && renderSettingsTab()}
            {activeTab === 'logs' && renderLogsTab()}
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminPage;
