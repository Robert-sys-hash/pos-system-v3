import React, { useState, useEffect, useCallback } from 'react';
import WarehouseManagement from '../components/admin/WarehouseManagement';
import { LocationsTab, FiscalPrinterTab, CompanyTab } from '../components/admin';
import SimpleTemplateEditor from '../components/admin/SimpleTemplateEditor';
import categoryService from '../services/categoryService';
import manufacturerService from '../services/manufacturerService';
import AnnouncementAdmin from '../components/announcements/AnnouncementAdmin';
import DocumentPrefixesPage from './DocumentPrefixesPage';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

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
  
  // State dla producentów
  const [manufacturers, setManufacturers] = useState([]);
  const [newManufacturer, setNewManufacturer] = useState({ nazwa: '', opis: '', aktywny: true });
  const [editingManufacturer, setEditingManufacturer] = useState(null);
  
  // State dla rabatów
  const [discounts, setDiscounts] = useState([]);
  const [discountLocations, setDiscountLocations] = useState([]); // Lista lokalizacji dla selecta
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
    aktywny: true,
    location_id: '' // Pusta wartość = wszystkie lokalizacje
  });
  const [editingDiscount, setEditingDiscount] = useState(null);
  
  // State dla filtrów rabatów
  const [discountFilter, setDiscountFilter] = useState('all'); // 'all', 'active', 'inactive'
  
  // State dla raportów rabatów
  const [discountReports, setDiscountReports] = useState([]);
  const [discountStats, setDiscountStats] = useState({});
  const [reportType, setReportType] = useState('dzienne');
  const [reportFilters, setReportFilters] = useState({
    data_od: new Date().toISOString().split('T')[0],
    data_do: new Date().toISOString().split('T')[0],
    user_id: ''
  });
  const [discountDetails, setDiscountDetails] = useState(null);
  
  // State dla raportów rabatów
  const [discountReportData, setDiscountReportData] = useState([]);
  const [discountReportFilters, setDiscountReportFilters] = useState({
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    discountId: ''
  });
  const [topDiscounts, setTopDiscounts] = useState([]);
  
  // State dla zamknięć dnia
  const [dailyClosureStatus, setDailyClosureStatus] = useState(null);
  const [dailyClosureFilter, setDailyClosureFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [showClosureDetails, setShowClosureDetails] = useState(false);
  const [selectedClosure, setSelectedClosure] = useState(null);
  const [dailyClosureReports, setDailyClosureReports] = useState([]);
  const [dailyClosureSummary, setDailyClosureSummary] = useState({});
  const [dailyClosureFilters, setDailyClosureFilters] = useState({
    date_from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0],
    cashier: ''
  });
  const [selectedClosureReport, setSelectedClosureReport] = useState(null);
  const [showClosureReportModal, setShowClosureReportModal] = useState(false);
  
  // State dla automatycznych backupów
  const [backupSettings, setBackupSettings] = useState({
    enabled: false,
    frequency: 'daily',
    time: '02:00',
    retention_count: 7,
    backup_path: '/backup'
  });
  const [backupSchedulerStatus, setBackupSchedulerStatus] = useState(null);
  const [backupList, setBackupList] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  
  // State dla definicji dokumentów
  const [documentDefinitions, setDocumentDefinitions] = useState([]);
  const [documentDefinitionsLoading, setDocumentDefinitionsLoading] = useState(true);
  const [documentTypeFilter, setDocumentTypeFilter] = useState('all');
  const [editingDocDef, setEditingDocDef] = useState(null);
  const [newDocDef, setNewDocDef] = useState({
    nazwa: '',
    typ_dokumentu: 'invoice',
    prefiks: '',
    nastepny_numer: 1,
    szablon_naglowka: '',
    szablon_stopki: '',
    aktywny: true
  });
  const [newDefinition, setNewDefinition] = useState({
    document_type: '',
    symbol: '',
    format_template: '',
    description: ''
  });
  const [previewNumber, setPreviewNumber] = useState('');

  // State dla ustawień systemu
  const [systemSettings, setSystemSettings] = useState({
    company_name: '',
    tax_id: '',
    company_address: '',
    default_vat_rate: '23',
    currency: 'PLN',
    language: 'pl',
    auto_print_receipts: false,
    require_customer_info: false,
    enable_inventory_tracking: false,
    enable_loyalty_program: false
  });
  
  const [printerSettings, setPrinterSettings] = useState({
    printer_type: 'thermal',
    paper_width: '80',
    printer_port: 'USB001',
    copies: 1
  });
  
  const [securitySettings, setSecuritySettings] = useState({
    min_password_length: 8,
    session_timeout: 480,
    max_login_attempts: 5,
    require_strong_passwords: false,
    enable_two_factor: false,
    log_all_actions: false
  });

  // State dla logów
  const [logs, setLogs] = useState([]);
  const [logFilters, setLogFilters] = useState({
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    level: '',
    userId: '',
    search: ''
  });
  const [showLogDetails, setShowLogDetails] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Define loadDiscountReports before useEffect calls that reference it
  const loadDiscountReports = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      
      if (reportType === 'dzienne') {
        params.append('data_od', discountReportFilters.dateFrom);
        params.append('data_do', discountReportFilters.dateTo);
      } else {
        // Dla miesięcznych używamy pierwszego dnia miesiąca
        const miesiac = discountReportFilters.dateFrom.substring(0, 7); // YYYY-MM
        params.append('miesiac', miesiac);
      }
      
      if (discountReportFilters.discountId) {
        params.append('rabat_id', discountReportFilters.discountId);
      }

      const endpoint = reportType === 'dzienne' ? 'dzienne' : 'miesieczne';
      const response = await fetch(`${API_BASE}/rabaty/raporty/${endpoint}?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        const reports = data.message?.raporty || [];
        
        // Mapowanie danych z backendu na format oczekiwany przez frontend
        const mappedReports = reports.map(item => {
          // Oblicz procent rabatu
          const procentRabatu = item.suma_przed_rabatem > 0 
            ? Math.round((item.suma_rabatow / item.suma_przed_rabatem) * 100) 
            : 0;
            
          return {
            data_transakcji: item.dzien,
            nazwa_rabatu: item.rabat_nazwa,
            typ_rabatu: item.typ_rabatu,
            wartosc_rabatu: item.typ_rabatu === 'procentowy' ? procentRabatu : item.suma_rabatow,
            klient_nazwa: item.kasjer, // Używamy kasjera jako klienta
            wartosc_przed_rabatem: item.suma_przed_rabatem,
            kwota_rabatu: item.suma_rabatow,
            wartosc_po_rabacie: item.suma_po_rabacie,
            transakcja_id: `${item.rabat_id}-${item.dzien}-${item.kasjer}`,
            kasjer: item.kasjer,
            ilosc_uzyc: item.ilosc_uzyc
          };
        });
        
        setDiscountReports(mappedReports);
        setDiscountReportData(mappedReports);
        console.log('📊 Załadowano raporty rabatów:', mappedReports.length);
      } else {
        console.error('Błąd odpowiedzi API:', response.status);
        setDiscountReports([]);
        setDiscountReportData([]);
      }
    } catch (err) {
      console.error('Błąd podczas pobierania raportów rabatów:', err);
      setDiscountReports([]);
      setDiscountReportData([]);
    }
  }, [reportType, discountReportFilters.dateFrom, discountReportFilters.dateTo, discountReportFilters.discountId]);

  // Define loadDailyClosureReports before useEffect calls that reference it  
  const loadDailyClosureReports = useCallback(async () => {
    try {
      console.log('🔄 Rozpoczynam ładowanie raportów zamknięć z filtrami:', dailyClosureFilters);
      setLoading(true);
      
      const shiftEnhancedService = (await import('../services/shiftEnhancedService')).default;
      const response = await shiftEnhancedService.getDailyClosureReports(dailyClosureFilters);
      
      console.log('📡 Odpowiedź z API:', response);
      
      if (response.success) {
        const reports = response.data.reports || [];
        const summary = response.data.summary || {};
        
        console.log('📋 Otrzymane raporty:', reports.length, reports);
        console.log('📊 Otrzymane podsumowanie:', summary);
        
        setDailyClosureReports(reports);
        setDailyClosureSummary(summary);
        
        console.log('✅ Pomyślnie ustawiono stany komponentu');
      } else {
        console.error('❌ Błąd w odpowiedzi API:', response.message);
        setError(response.message || 'Błąd ładowania raportów zamknięć');
      }
    } catch (err) {
      console.error('❌ Błąd ładowania raportów zamknięć:', err);
      setError('Błąd ładowania raportów zamknięć');
    } finally {
      setLoading(false);
    }
  }, [dailyClosureFilters]);

  // useEffects section starts here
  useEffect(() => {
    loadSystemInfo();
    loadCategories();
    loadManufacturers();
    loadDiscounts();
    loadDiscountLocations();
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
  }, [activeTab, loadDiscountReports]); // Dodano loadDiscountReports jako zależność

  // Przeładuj raporty rabatów przy zmianie filtrów
  useEffect(() => {
    if (activeTab === 'discount-reports') {
      loadDiscountReports();
    }
  }, [reportType, discountReportFilters.dateFrom, discountReportFilters.dateTo, discountReportFilters.discountId, activeTab, loadDiscountReports]);

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

  // Automatycznie ładuj logi przy przejściu do zakładki
  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSystemInfo = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/info`);
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
      const response = await fetch(`${API_BASE}/admin/backup`, {
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
      const response = await fetch(`${API_BASE}/admin/export`, {
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
      const response = await fetch(`${API_BASE}/admin/backup/scheduler/status`);
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
      const response = await fetch(`${API_BASE}/admin/backup/list`);
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
      const response = await fetch(`${API_BASE}/admin/backup/scheduler/start`, {
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
      const response = await fetch(`${API_BASE}/admin/backup/scheduler/stop`, {
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
      const response = await fetch(`${API_BASE}/admin/backup/manual`, {
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
      const response = await fetch(`${API_BASE}/admin/document-definitions`);
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
      const response = await fetch(`${API_BASE}/admin/document-definitions`, {
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
      const response = await fetch(`${API_BASE}/admin/document-definitions/preview/${docType}`);
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
      const response = await fetch(`${API_BASE}/admin/document-definitions/${docType}/reset`, {
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
      console.log('🏷️ Loaded categories:', data);
      console.log('🏷️ Categories count:', data?.length);
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

  // Funkcja pobierania lokalizacji dla rabatów
  const loadDiscountLocations = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/locations/`);
      if (response.ok) {
        const data = await response.json();
        const locations = data.data?.locations || data.locations || [];
        setDiscountLocations(locations);
      }
    } catch (err) {
      console.error('❌ Błąd podczas pobierania lokalizacji:', err);
    }
  }, []);

  // Funkcje dla zarządzania rabatami
  const loadDiscounts = useCallback(async () => {
    console.log('📋 Ładuję listę rabatów...');
    console.log('🔍 Aktualny filtr:', discountFilter);
    
    try {
      let url = `${API_BASE}/rabaty`;
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
        
        const discountsList = data.data?.rabaty || data.message?.rabaty || [];
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
      const response = await fetch(`${API_BASE}/rabaty`, {
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
          aktywny: true,
          location_id: ''
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
      console.log('🔄 Wysyłam zapytanie DELETE do:', `${API_BASE}/rabaty/${discountId}`);
      
      const response = await fetch(`${API_BASE}/rabaty/${discountId}`, {
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
      console.log('🔄 Wysyłam zapytanie PUT do:', `${API_BASE}/rabaty/${editingDiscount.id}`);
      console.log('📤 Dane do wysłania:', editingDiscount);
      
      const response = await fetch(`${API_BASE}/rabaty/${editingDiscount.id}`, {
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
      const response = await fetch(`${API_BASE}/rabaty/stats`);
      if (response.ok) {
        const data = await response.json();
        setDiscountStats(data.data || {});
      }
    } catch (err) {
      console.error('Błąd podczas pobierania statystyk rabatów:', err);
    }
  }, []);

  const fetchDiscountDetails = async (discountId) => {
    try {
      const params = new URLSearchParams();
      params.append('data_od', reportFilters.data_od);
      params.append('data_do', reportFilters.data_do);
      
      const response = await fetch(`${API_BASE}/rabaty/${discountId}/szczegoly?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setDiscountDetails(data.message);
      }
    } catch (err) {
      console.error('Błąd podczas pobierania szczegółów rabatu:', err);
    }
  };

  const exportDiscountReport = (data) => {
    const reportData = data || discountReportData;
    if (!reportData || reportData.length === 0) {
      alert('Brak danych do eksportu');
      return;
    }

    const csvContent = [
      // Nagłówki
      ['Data', 'Rabat', 'Typ', 'Kasjer', 'Ilość użyć', 'Wartość przed rabatem', 'Kwota rabatu', 'Wartość po rabacie'],
      // Dane
      ...reportData.map(report => [
        report.data_transakcji || '',
        report.nazwa_rabatu || '',
        report.typ_rabatu || '',
        report.kasjer || '',
        report.ilosc_uzyc || 0,
        report.wartosc_przed_rabatem || 0,
        report.kwota_rabatu || 0,
        report.wartosc_po_rabacie || 0
      ])
    ].map(row => row.join(';')).join('\n');

    // Dodaj BOM dla poprawnego wyświetlania polskich znaków w Excelu
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `raport_rabaty_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportDiscountReportPDF = (data) => {
    const reportData = data || discountReportData;
    if (!reportData || reportData.length === 0) {
      alert('Brak danych do eksportu');
      return;
    }

    const doc = new jsPDF();
    
    // Tytuł
    doc.setFontSize(16);
    doc.text('Raport Rabatow', 14, 20);
    
    // Data generowania
    doc.setFontSize(10);
    doc.text(`Data wygenerowania: ${new Date().toLocaleDateString('pl-PL')}`, 14, 30);
    
    // Tabela
    const tableColumn = ['Data', 'Rabat', 'Typ', 'Kasjer', 'Ilosc', 'Przed rabatem', 'Kwota rabatu', 'Po rabacie'];
    const tableRows = reportData.map(report => [
      report.data_transakcji || '',
      report.nazwa_rabatu || '',
      report.typ_rabatu || '',
      report.kasjer || '',
      report.ilosc_uzyc || 0,
      `${(report.wartosc_przed_rabatem || 0).toFixed(2)} zl`,
      `${(report.kwota_rabatu || 0).toFixed(2)} zl`,
      `${(report.wartosc_po_rabacie || 0).toFixed(2)} zl`
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    // Podsumowanie
    const finalY = doc.lastAutoTable.finalY + 10;
    const totalRabat = reportData.reduce((sum, item) => sum + parseFloat(item.kwota_rabatu || 0), 0);
    const totalPrzed = reportData.reduce((sum, item) => sum + parseFloat(item.wartosc_przed_rabatem || 0), 0);
    
    doc.setFontSize(10);
    doc.text(`Liczba rekordow: ${reportData.length}`, 14, finalY);
    doc.text(`Suma rabatow: ${totalRabat.toFixed(2)} zl`, 14, finalY + 6);
    doc.text(`Wartosc przed rabatami: ${totalPrzed.toFixed(2)} zl`, 14, finalY + 12);

    doc.save(`raport_rabaty_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Funkcje dla raportów zamknięć dnia już zdefiniowane powyżej

  const loadDailyClosureStatus = useCallback(async () => {
    try {
      // Ta funkcja jest już wywołana w loadDailyClosures
    } catch (err) {
      console.error('Błąd ładowania statusu zamknięcia dziennego:', err);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/logs`);
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      } else {
        console.error('Błąd odpowiedzi API:', response.status);
        setLogs([]);
      }
    } catch (err) {
      console.error('Błąd podczas pobierania logów:', err);
      setLogs([]);
    }
  }, []);

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
      ['Data', 'Kasjer', 'Kasa System', 'Kasa Fizyczna', 'Różnica Kasa', 'Terminal System', 'Terminal Rzeczywisty', 'Różnica Terminal', 'Kasa Fiskalna', 'Sprzedaż Gotówka', 'Sprzedaż Karta', 'Liczba Transakcji', 'TikTok', 'Facebook', 'Instagram', 'Google', 'Osiągnięcia Sprzedaż', 'Osiągnięcia Praca', 'Uwagi Zamknięcia'],
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
        report.osiagniecia_praca,
        report.uwagi_zamkniecia
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
                        
                        {/* Lokalizacja */}
                        <div style={{ marginTop: '0.5rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: '500' }}>
                            🏢 Lokalizacja
                          </label>
                          <select
                            value={editingDiscount?.location_id || ''}
                            onChange={(e) => setEditingDiscount({...editingDiscount, location_id: e.target.value ? parseInt(e.target.value) : null})}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #e9ecef',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem'
                            }}
                          >
                            <option value="">Wszystkie lokalizacje</option>
                            {discountLocations.map(loc => (
                              <option key={loc.id} value={loc.id}>{loc.nazwa}</option>
                            ))}
                          </select>
                        </div>
                        
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
                          {discount.location_id && (
                            <div style={{ fontSize: '0.75rem', color: '#17a2b8', marginTop: '0.25rem' }}>
                              🏢 Lokalizacja: {discountLocations.find(l => l.id === discount.location_id)?.nazwa || `ID: ${discount.location_id}`}
                            </div>
                          )}
                          {!discount.location_id && (
                            <div style={{ fontSize: '0.75rem', color: '#28a745', marginTop: '0.25rem' }}>
                              🌍 Wszystkie lokalizacje
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
                🏢 Lokalizacja
              </label>
              <select
                value={newDiscount.location_id || ''}
                onChange={(e) => setNewDiscount({...newDiscount, location_id: e.target.value ? parseInt(e.target.value) : null})}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #e9ecef',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              >
                <option value="">Wszystkie lokalizacje</option>
                {discountLocations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.nazwa}</option>
                ))}
              </select>
              <small style={{ color: '#6c757d', fontSize: '0.75rem' }}>
                Wybierz lokalizację lub zostaw "Wszystkie lokalizacje" aby rabat był dostępny wszędzie
              </small>
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
    <div style={{ display: 'grid', gap: '1rem' }}>
      {/* Filtry raportów */}
      <div style={{
        border: '1px solid #e9ecef',
        borderRadius: '0.375rem',
        backgroundColor: 'white',
        padding: '1rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
          📊 Raporty rabatów
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Data od
            </label>
            <input
              type="date"
              value={discountReportFilters.dateFrom}
              onChange={(e) => setDiscountReportFilters({...discountReportFilters, dateFrom: e.target.value})}
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
              Data do
            </label>
            <input
              type="date"
              value={discountReportFilters.dateTo}
              onChange={(e) => setDiscountReportFilters({...discountReportFilters, dateTo: e.target.value})}
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
              Rabat
            </label>
            <select
              value={discountReportFilters.discountId}
              onChange={(e) => setDiscountReportFilters({...discountReportFilters, discountId: e.target.value})}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #e9ecef',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            >
              <option value="">Wszystkie rabaty</option>
              {discounts.map(discount => (
                <option key={discount.id} value={discount.id}>
                  {discount.nazwa}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button
              onClick={generateDiscountReport}
              style={{
                width: '100%',
                padding: '0.5rem 1rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              📊 Generuj raport
            </button>
          </div>
        </div>
      </div>

      {/* Statystyki ogólne */}
      {discountStats && (
        <div style={{
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          backgroundColor: 'white',
          padding: '1rem'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
            📈 Statystyki rabatów
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div style={{
              padding: '1rem',
              backgroundColor: '#e7f3ff',
              borderRadius: '0.375rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0056b3', marginBottom: '0.25rem' }}>
                {discountStats.total_savings?.toFixed(2) || '0.00'} zł
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                Łączne oszczędności
              </div>
            </div>

            <div style={{
              padding: '1rem',
              backgroundColor: '#e8f5e8',
              borderRadius: '0.375rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#155724', marginBottom: '0.25rem' }}>
                {discountStats.total_uses || 0}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                Całkowite użycia
              </div>
            </div>

            <div style={{
              padding: '1rem',
              backgroundColor: '#fff3cd',
              borderRadius: '0.375rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#856404', marginBottom: '0.25rem' }}>
                {discountStats.avg_discount?.toFixed(2) || '0.00'} zł
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                Średni rabat
              </div>
            </div>

            <div style={{
              padding: '1rem',
              backgroundColor: '#f8d7da',
              borderRadius: '0.375rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#721c24', marginBottom: '0.25rem' }}>
                {discountStats.unique_customers || 0}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                Unikalnych klientów
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Raport szczegółowy */}
      {discountReportData && discountReportData.length > 0 && (
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
            <span>📋 Szczegółowy raport rabatów</span>
            <button
              onClick={() => exportDiscountReport(discountReportData)}
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
              📤 Eksportuj CSV
            </button>
            <button
              onClick={() => exportDiscountReportPDF(discountReportData)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                marginLeft: '0.5rem'
              }}
            >
              📄 Eksportuj PDF
            </button>
          </div>

          <div style={{ overflow: 'auto', maxHeight: '500px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Data
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Rabat
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Klient
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Wartość przed
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Rabat
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Wartość końcowa
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Transakcja
                  </th>
                </tr>
              </thead>
              <tbody>
                {discountReportData.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ 
                      padding: '2rem', 
                      textAlign: 'center', 
                      fontSize: '0.875rem', 
                      color: '#6c757d',
                      borderBottom: '1px solid #e9ecef'
                    }}>
                      {loading ? 'Ładowanie danych...' : 'Brak danych do wyświetlenia. Sprawdź filtry lub dodaj rabaty w systemie POS.'}
                    </td>
                  </tr>
                ) : discountReportData.map((item, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', borderBottom: '1px solid #e9ecef' }}>
                      {new Date(item.data_transakcji).toLocaleDateString('pl-PL')}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', borderBottom: '1px solid #e9ecef' }}>
                      <div style={{ fontWeight: '500' }}>{item.nazwa_rabatu}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                        {item.typ_rabatu === 'procentowy' ? `${item.wartosc_rabatu}%` : `${parseFloat(item.wartosc_rabatu).toFixed(2)} zł`}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', borderBottom: '1px solid #e9ecef' }}>
                      {item.klient_nazwa || 'Brak danych'}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right', borderBottom: '1px solid #e9ecef' }}>
                      {parseFloat(item.wartosc_przed_rabatem).toFixed(2)} zł
                    </td>
                    <td style={{ 
                      padding: '0.75rem', 
                      fontSize: '0.875rem', 
                      textAlign: 'right', 
                      borderBottom: '1px solid #e9ecef',
                      color: '#dc3545',
                      fontWeight: '500'
                    }}>
                      -{parseFloat(item.kwota_rabatu).toFixed(2)} zł
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right', borderBottom: '1px solid #e9ecef', fontWeight: '500' }}>
                      {parseFloat(item.wartosc_po_rabacie).toFixed(2)} zł
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', borderBottom: '1px solid #e9ecef' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#e7f3ff',
                        color: '#0056b3',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem'
                      }}>
                        #{item.transakcja_id}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Podsumowanie raportu */}
          <div style={{
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderTop: '1px solid #e9ecef',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.875rem', color: '#6c757d' }}>
              Pokazano {discountReportData.length} rekordów
            </span>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
              <span>
                <strong>Łączne oszczędności:</strong> {' '}
                <span style={{ color: '#dc3545', fontWeight: '600' }}>
                  {discountReportData.reduce((sum, item) => sum + parseFloat(item.kwota_rabatu), 0).toFixed(2)} zł
                </span>
              </span>
              <span>
                <strong>Wartość przed rabatami:</strong> {' '}
                <span style={{ fontWeight: '600' }}>
                  {discountReportData.reduce((sum, item) => sum + parseFloat(item.wartosc_przed_rabatem), 0).toFixed(2)} zł
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top rabaty */}
      {topDiscounts && topDiscounts.length > 0 && (
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
            🏆 Najczęściej używane rabaty
          </div>

          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {topDiscounts.map((discount, index) => (
                <div key={discount.id} style={{
                  padding: '1rem',
                  border: '1px solid #e9ecef',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: index === 0 ? '#fff3cd' : 'white'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: index === 0 ? '#856404' : '#6c757d',
                      color: 'white',
                      borderRadius: '50%',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      minWidth: '1.5rem',
                      textAlign: 'center'
                    }}>
                      {index + 1}
                    </span>
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '0.95rem' }}>
                        {discount.nazwa}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                        {discount.typ_rabatu === 'procentowy' ? `${discount.wartosc}%` : `${parseFloat(discount.wartosc).toFixed(2)} zł`}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                      {discount.uzycia_count} użyć
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                      {parseFloat(discount.total_savings).toFixed(2)} zł oszczędności
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Wykres trendów (placeholder) */}
      <div style={{
        border: '1px solid #e9ecef',
        borderRadius: '0.375rem',
        backgroundColor: 'white',
        padding: '1rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
          📈 Trendy użycia rabatów
        </h3>
        <div style={{
          height: '200px',
          backgroundColor: '#f8f9fa',
          borderRadius: '0.375rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6c757d'
        }}>
          Wykres trendów użycia rabatów w czasie
          <br />
          <small>(wymagana integracja z biblioteką wykresów)</small>
        </div>
      </div>
    </div>
  );

  const renderDailyClosureTab = () => (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {/* Status obecnego dnia */}
      <div style={{
        border: '1px solid #e9ecef',
        borderRadius: '0.375rem',
        backgroundColor: 'white',
        padding: '1rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
            🏪 Status dnia roboczego
          </h3>
          <span style={{
            padding: '0.5rem 1rem',
            backgroundColor: dailyClosureStatus?.is_open ? '#d4edda' : '#f8d7da',
            color: dailyClosureStatus?.is_open ? '#155724' : '#721c24',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            {dailyClosureStatus?.is_open ? '🟢 Dzień otwarty' : '🔴 Dzień zamknięty'}
          </span>
        </div>

        {dailyClosureStatus && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{
              padding: '1rem',
              backgroundColor: '#e7f3ff',
              borderRadius: '0.375rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#0056b3', marginBottom: '0.25rem' }}>
                {parseFloat(dailyClosureStatus.total_sales || 0).toFixed(2)} zł
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                Sprzedaż dzienna
              </div>
            </div>

            <div style={{
              padding: '1rem',
              backgroundColor: '#e8f5e8',
              borderRadius: '0.375rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#155724', marginBottom: '0.25rem' }}>
                {dailyClosureStatus.transactions_count || 0}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                Liczba transakcji
              </div>
            </div>

            <div style={{
              padding: '1rem',
              backgroundColor: '#fff3cd',
              borderRadius: '0.375rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#856404', marginBottom: '0.25rem' }}>
                {parseFloat(dailyClosureStatus.cash_in_register || 0).toFixed(2)} zł
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                Gotówka w kasie
              </div>
            </div>

            <div style={{
              padding: '1rem',
              backgroundColor: '#f8d7da',
              borderRadius: '0.375rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#721c24', marginBottom: '0.25rem' }}>
                {parseFloat(dailyClosureStatus.returns_total || 0).toFixed(2)} zł
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                Zwroty
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          {dailyClosureStatus?.is_open ? (
            <button
              onClick={performDailyClosure}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              🔒 Zamknij dzień roboczy
            </button>
          ) : (
            <button
              onClick={openNewDay}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              🔓 Otwórz nowy dzień
            </button>
          )}
          <button
            onClick={refreshDailyStatus}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            🔄 Odśwież
          </button>
        </div>
      </div>

      {/* Lista zamknięć dziennych */}
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
          <div>
            <span>📋 Historia zamknięć dziennych</span>
            <div style={{ fontSize: '0.75rem', fontWeight: '400', color: '#6c757d', marginTop: '0.25rem' }}>
              Obejmuje: podsumowanie finansowe, różnice kasowe, aktywność social media, osiągnięcia dnia i notatki pracowników
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Od:</label>
              <input
                type="date"
                value={dailyClosureFilters.date_from}
                onChange={(e) => setDailyClosureFilters(prev => ({ ...prev, date_from: e.target.value }))}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem'
                }}
              />
              <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Do:</label>
              <input
                type="date"
                value={dailyClosureFilters.date_to}
                onChange={(e) => setDailyClosureFilters(prev => ({ ...prev, date_to: e.target.value }))}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem'
                }}
              />
              <input
                type="text"
                value={dailyClosureFilters.cashier}
                onChange={(e) => setDailyClosureFilters(prev => ({ ...prev, cashier: e.target.value }))}
                placeholder="Kasjer..."
                style={{
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem',
                  width: '120px'
                }}
              />
              <button
                onClick={loadDailyClosureReports}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                🔍 Szukaj
              </button>
            </div>
            <button
              onClick={() => exportDailyClosures(dailyClosureReports)}
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
              📤 Eksport
            </button>
          </div>
        </div>

        {/* Legenda wskaźników */}
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#f1f3f4',
          borderBottom: '1px solid #e9ecef',
          fontSize: '0.75rem',
          color: '#6c757d'
        }}>
          <strong>Wskaźniki dodatkowych danych:</strong>
          <span style={{ marginLeft: '1rem' }}>📱 Social Media</span>
          <span style={{ marginLeft: '1rem' }}>🎯 Osiągnięcia</span>
          <span style={{ marginLeft: '1rem' }}>📝 Notatki</span>
          <span style={{ marginLeft: '1rem', fontStyle: 'italic' }}>- kliknij "Szczegóły" aby zobaczyć pełne informacje</span>
        </div>

        <div style={{ overflow: 'auto', maxHeight: '600px' }}>
          {dailyClosureReports && dailyClosureReports.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Data / Kasjer
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Gotówka
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Karty
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Różnica kasa
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Transakcje
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Dodatkowe
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Akcje
                  </th>
                </tr>
              </thead>
              <tbody>
                {dailyClosureReports.map((report, index) => (
                  <tr key={report.id} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', borderBottom: '1px solid #e9ecef' }}>
                      <div style={{ fontWeight: '500' }}>
                        {new Date(report.data_zamkniecia).toLocaleDateString('pl-PL')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                        {report.kasjer_login || 'System'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                        {report.czas_zamkniecia?.split('.')[0] || ''}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right', borderBottom: '1px solid #e9ecef' }}>
                      <div style={{ fontWeight: '500' }}>
                        {parseFloat(report.kasa_fizyczna || 0).toFixed(2)} zł
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                        sys: {parseFloat(report.kasa_system || 0).toFixed(2)} zł
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right', borderBottom: '1px solid #e9ecef' }}>
                      <div style={{ fontWeight: '500' }}>
                        {parseFloat(report.sprzedaz_karta || 0).toFixed(2)} zł
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                        term: {parseFloat(report.terminal_rzeczywisty || 0).toFixed(2)} zł
                      </div>
                    </td>
                    <td style={{ 
                      padding: '0.75rem', 
                      fontSize: '0.875rem', 
                      textAlign: 'right', 
                      borderBottom: '1px solid #e9ecef', 
                      color: (report.roznica_kasa || 0) < 0 ? '#dc3545' : (report.roznica_kasa || 0) > 0 ? '#28a745' : '#495057',
                      fontWeight: '500'
                    }}>
                      {parseFloat(report.roznica_kasa || 0).toFixed(2)} zł
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'center', borderBottom: '1px solid #e9ecef' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#e7f3ff',
                        color: '#0056b3',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}>
                        {report.liczba_transakcji || 0}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'center', borderBottom: '1px solid #e9ecef' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                        {(report.social_media_tiktok || report.social_media_facebook || 
                          report.social_media_instagram || report.social_media_google) && (
                          <span style={{
                            padding: '0.2rem 0.3rem',
                            backgroundColor: '#f3e5f5',
                            color: '#6f42c1',
                            borderRadius: '0.2rem',
                            fontSize: '0.65rem',
                            fontWeight: '500'
                          }}>
                            📱
                          </span>
                        )}
                        {(report.osiagniecia_sprzedaz || report.osiagniecia_praca) && (
                          <span style={{
                            padding: '0.2rem 0.3rem',
                            backgroundColor: '#fff3cd',
                            color: '#856404',
                            borderRadius: '0.2rem',
                            fontSize: '0.65rem',
                            fontWeight: '500'
                          }}>
                            🎯
                          </span>
                        )}
                        {report.uwagi_zamkniecia && (
                          <span style={{
                            padding: '0.2rem 0.3rem',
                            backgroundColor: '#d1ecf1',
                            color: '#0c5460',
                            borderRadius: '0.2rem',
                            fontSize: '0.65rem',
                            fontWeight: '500'
                          }}>
                            📝
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'center', borderBottom: '1px solid #e9ecef' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => viewClosureDetails(report)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          👁️ Szczegóły
                        </button>
                        <button
                          onClick={() => printClosureReport(report)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          🖨️ Drukuj
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#6c757d'
            }}>
              <p>Brak raportów zamknięć dla wybranych kryteriów</p>
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Użyj filtrów powyżej aby wygenerować raporty zamknięć dziennych
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal szczegółów zamknięcia */}
      {showClosureDetails && selectedClosure && (
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>
                📊 Szczegóły zamknięcia dziennego
              </h3>
              <button
                onClick={() => setShowClosureDetails(false)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* Podstawowe informacje */}
              <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '0.375rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600' }}>
                  📅 Informacje podstawowe
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                  <div>
                    <strong>Data zamknięcia:</strong> {new Date(selectedClosure.data_zamkniecia).toLocaleString('pl-PL')}
                  </div>
                  <div>
                    <strong>Użytkownik:</strong> {selectedClosure.uzytkownik_nazwa || 'System'}
                  </div>
                  <div>
                    <strong>Okres:</strong> {new Date(selectedClosure.data_od).toLocaleDateString('pl-PL')} - {new Date(selectedClosure.data_do).toLocaleDateString('pl-PL')}
                  </div>
                </div>
              </div>

              {/* Podsumowanie finansowe */}
              <div style={{ padding: '1rem', backgroundColor: '#e7f3ff', borderRadius: '0.375rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600' }}>
                  💰 Podsumowanie finansowe
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                  <div>
                    <strong>Kasa system:</strong> {parseFloat(selectedClosure.kasa_system || 0).toFixed(2)} zł
                  </div>
                  <div>
                    <strong>Kasa fizyczna:</strong> {parseFloat(selectedClosure.kasa_fizyczna || 0).toFixed(2)} zł
                  </div>
                  <div>
                    <strong>Różnica kasa:</strong> 
                    <span style={{ 
                      color: (selectedClosure.roznica_kasa || 0) < 0 ? '#dc3545' : (selectedClosure.roznica_kasa || 0) > 0 ? '#28a745' : '#495057',
                      fontWeight: '600' 
                    }}>
                      {parseFloat(selectedClosure.roznica_kasa || 0).toFixed(2)} zł
                    </span>
                  </div>
                  <div>
                    <strong>Terminal system:</strong> {parseFloat(selectedClosure.terminal_system || 0).toFixed(2)} zł
                  </div>
                  <div>
                    <strong>Terminal rzeczywisty:</strong> {parseFloat(selectedClosure.terminal_rzeczywisty || 0).toFixed(2)} zł
                  </div>
                  <div>
                    <strong>Różnica terminal:</strong> 
                    <span style={{ 
                      color: (selectedClosure.roznica_terminal || 0) < 0 ? '#dc3545' : (selectedClosure.roznica_terminal || 0) > 0 ? '#28a745' : '#495057',
                      fontWeight: '600' 
                    }}>
                      {parseFloat(selectedClosure.roznica_terminal || 0).toFixed(2)} zł
                    </span>
                  </div>
                  <div>
                    <strong>Kasa fiskalna:</strong> {parseFloat(selectedClosure.kasa_fiskalna_raport || 0).toFixed(2)} zł
                  </div>
                  <div>
                    <strong>Sprzedaż gotówka:</strong> {parseFloat(selectedClosure.sprzedaz_gotowka || 0).toFixed(2)} zł
                  </div>
                  <div>
                    <strong>Sprzedaż karta:</strong> {parseFloat(selectedClosure.sprzedaz_karta || 0).toFixed(2)} zł
                  </div>
                </div>
              </div>

              {/* Statystyki transakcji */}
              <div style={{ padding: '1rem', backgroundColor: '#e8f5e8', borderRadius: '0.375rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600' }}>
                  📈 Statystyki transakcji
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                  <div>
                    <strong>Liczba transakcji:</strong> {selectedClosure.liczba_transakcji || 0}
                  </div>
                  <div>
                    <strong>Kasjer:</strong> {selectedClosure.kasjer_login || 'System'}
                  </div>
                  <div>
                    <strong>Czas rozpoczęcia:</strong> {selectedClosure.czas_rozpoczecia || 'Brak danych'}
                  </div>
                  <div>
                    <strong>Czas zamknięcia:</strong> {selectedClosure.czas_zamkniecia?.split('.')[0] || 'Brak danych'}
                  </div>
                </div>
              </div>

              {/* Social Media */}
              {(selectedClosure.social_media_tiktok || selectedClosure.social_media_facebook || 
                selectedClosure.social_media_instagram || selectedClosure.social_media_google) && (
                <div style={{ padding: '1rem', backgroundColor: '#f3e5f5', borderRadius: '0.375rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600' }}>
                    📱 Aktywność w Social Media
                  </h4>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {selectedClosure.social_media_tiktok && (
                      <div>
                        <strong>TikTok:</strong>
                        <div style={{ 
                          marginTop: '0.25rem',
                          padding: '0.5rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.7)',
                          borderRadius: '0.25rem',
                          fontSize: '0.875rem'
                        }}>
                          {selectedClosure.social_media_tiktok}
                        </div>
                      </div>
                    )}
                    {selectedClosure.social_media_facebook && (
                      <div>
                        <strong>Facebook:</strong>
                        <div style={{ 
                          marginTop: '0.25rem',
                          padding: '0.5rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.7)',
                          borderRadius: '0.25rem',
                          fontSize: '0.875rem'
                        }}>
                          {selectedClosure.social_media_facebook}
                        </div>
                      </div>
                    )}
                    {selectedClosure.social_media_instagram && (
                      <div>
                        <strong>Instagram:</strong>
                        <div style={{ 
                          marginTop: '0.25rem',
                          padding: '0.5rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.7)',
                          borderRadius: '0.25rem',
                          fontSize: '0.875rem'
                        }}>
                          {selectedClosure.social_media_instagram}
                        </div>
                      </div>
                    )}
                    {selectedClosure.social_media_google && (
                      <div>
                        <strong>Google Business:</strong>
                        <div style={{ 
                          marginTop: '0.25rem',
                          padding: '0.5rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.7)',
                          borderRadius: '0.25rem',
                          fontSize: '0.875rem'
                        }}>
                          {selectedClosure.social_media_google}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Osiągnięcia dnia */}
              {(selectedClosure.osiagniecia_sprzedaz || selectedClosure.osiagniecia_praca) && (
                <div style={{ padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '0.375rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600' }}>
                    🎯 Osiągnięcia dnia
                  </h4>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {selectedClosure.osiagniecia_sprzedaz && (
                      <div>
                        <strong>Sprzedaż:</strong>
                        <div style={{ 
                          marginTop: '0.25rem',
                          padding: '0.5rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.7)',
                          borderRadius: '0.25rem',
                          fontSize: '0.875rem'
                        }}>
                          {selectedClosure.osiagniecia_sprzedaz}
                        </div>
                      </div>
                    )}
                    {selectedClosure.osiagniecia_praca && (
                      <div>
                        <strong>Praca w sklepie:</strong>
                        <div style={{ 
                          marginTop: '0.25rem',
                          padding: '0.5rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.7)',
                          borderRadius: '0.25rem',
                          fontSize: '0.875rem'
                        }}>
                          {selectedClosure.osiagniecia_praca}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Uwagi zamknięcia */}
              {selectedClosure.uwagi_zamkniecia && (
                <div style={{ padding: '1rem', backgroundColor: '#d1ecf1', borderRadius: '0.375rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600' }}>
                    📝 Uwagi dotyczące zamknięcia dnia
                  </h4>
                  <div style={{ 
                    padding: '0.75rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedClosure.uwagi_zamkniecia}
                  </div>
                </div>
              )}

              {/* Akcje */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => printClosureReport(selectedClosure)}
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
                  🖨️ Drukuj raport
                </button>
                <button
                  onClick={() => exportSingleClosure(selectedClosure)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  📤 Eksportuj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderDocumentDefinitionsTab = () => (
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
            <span>📄 Definicje dokumentów</span>
            <select
              value={documentTypeFilter}
              onChange={(e) => setDocumentTypeFilter(e.target.value)}
              style={{
                padding: '0.25rem 0.5rem',
                border: '1px solid #ced4da',
                borderRadius: '0.25rem',
                fontSize: '0.875rem'
              }}
            >
              <option value="all">Wszystkie typy</option>
              <option value="invoice">Faktury</option>
              <option value="receipt">Paragony</option>
              <option value="proforma">Faktury pro forma</option>
              <option value="credit_note">Faktury korygujące</option>
            </select>
          </div>

          <div style={{ padding: '1rem' }}>
            {documentDefinitions.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#6c757d'
              }}>
                <p>Brak definicji dokumentów</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {documentDefinitions.map(definition => (
                  <div key={definition.id} style={{
                    padding: '1rem',
                    border: '1px solid #e9ecef',
                    borderRadius: '0.375rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: definition.aktywny ? '#ffffff' : '#f8f9fa'
                  }}>
                    {editingDocDef && editingDocDef.id === definition.id ? (
                      // Formularz edycji
                      <div style={{ width: '100%', display: 'grid', gap: '0.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <input
                            type="text"
                            value={editingDocDef?.nazwa || ''}
                            onChange={(e) => setEditingDocDef({...editingDocDef, nazwa: e.target.value})}
                            placeholder="Nazwa definicji"
                            style={{
                              padding: '0.5rem',
                              border: '1px solid #e9ecef',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem'
                            }}
                          />
                          <select
                            value={editingDocDef?.typ_dokumentu || 'invoice'}
                            onChange={(e) => setEditingDocDef({...editingDocDef, typ_dokumentu: e.target.value})}
                            style={{
                              padding: '0.5rem',
                              border: '1px solid #e9ecef',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem'
                            }}
                          >
                            <option value="invoice">Faktura</option>
                            <option value="receipt">Paragon</option>
                            <option value="proforma">Faktura pro forma</option>
                            <option value="credit_note">Faktura korygująca</option>
                          </select>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <input
                            type="text"
                            value={editingDocDef?.prefiks || ''}
                            onChange={(e) => setEditingDocDef({...editingDocDef, prefiks: e.target.value})}
                            placeholder="Prefiks numeracji"
                            style={{
                              padding: '0.5rem',
                              border: '1px solid #e9ecef',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem'
                            }}
                          />
                          <input
                            type="number"
                            value={editingDocDef?.nastepny_numer || 1}
                            onChange={(e) => setEditingDocDef({...editingDocDef, nastepny_numer: parseInt(e.target.value) || 1})}
                            placeholder="Następny numer"
                            min="1"
                            style={{
                              padding: '0.5rem',
                              border: '1px solid #e9ecef',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem'
                            }}
                          />
                        </div>

                        <textarea
                          value={editingDocDef?.szablon_naglowka || ''}
                          onChange={(e) => setEditingDocDef({...editingDocDef, szablon_naglowka: e.target.value})}
                          placeholder="Szablon nagłówka dokumentu"
                          style={{
                            padding: '0.5rem',
                            border: '1px solid #e9ecef',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            minHeight: '60px',
                            resize: 'vertical'
                          }}
                        />

                        <textarea
                          value={editingDocDef?.szablon_stopki || ''}
                          onChange={(e) => setEditingDocDef({...editingDocDef, szablon_stopki: e.target.value})}
                          placeholder="Szablon stopki dokumentu"
                          style={{
                            padding: '0.5rem',
                            border: '1px solid #e9ecef',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            minHeight: '60px',
                            resize: 'vertical'
                          }}
                        />

                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={editingDocDef?.aktywny || false}
                            onChange={(e) => setEditingDocDef({...editingDocDef, aktywny: e.target.checked})}
                          />
                          <span style={{ fontSize: '0.875rem' }}>Definicja aktywna</span>
                        </label>

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                          <button
                            onClick={cancelEditDocDef}
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
                            onClick={updateDocumentDefinition}
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
                              color: definition.aktywny ? '#495057' : '#6c757d'
                            }}>
                              {definition.nazwa}
                            </span>
                            <span style={{
                              padding: '0.125rem 0.375rem',
                              backgroundColor: getDocumentTypeColor(definition.typ_dokumentu),
                              color: 'white',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}>
                              {getDocumentTypeName(definition.typ_dokumentu)}
                            </span>
                            <span style={{
                              padding: '0.125rem 0.375rem',
                              backgroundColor: definition.aktywny ? '#d4edda' : '#f8d7da',
                              color: definition.aktywny ? '#155724' : '#721c24',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}>
                              {definition.aktywny ? 'Aktywny' : 'Nieaktywny'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                            <span>🔢 Prefiks: <strong>{definition.prefiks}</strong></span>
                            <span style={{ marginLeft: '1rem' }}>
                              📄 Następny numer: <strong>{definition.nastepny_numer}</strong>
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                            Utworzono: {new Date(definition.data_utworzenia).toLocaleDateString('pl-PL')}
                            {definition.ostatnia_modyfikacja && (
                              <span style={{ marginLeft: '1rem' }}>
                                Modyfikowano: {new Date(definition.ostatnia_modyfikacja).toLocaleDateString('pl-PL')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => previewDocumentTemplate(definition)}
                            style={{
                              padding: '0.5rem',
                              backgroundColor: '#17a2b8',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontSize: '0.75rem'
                            }}
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => startEditDocDef(definition)}
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
                            onClick={() => deleteDocumentDefinition(definition.id)}
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

      {/* Panel dodawania nowej definicji */}
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
            ➕ Dodaj definicję dokumentu
          </div>

          <div style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Nazwa definicji *
              </label>
              <input
                type="text"
                value={newDocDef.nazwa}
                onChange={(e) => setNewDocDef({...newDocDef, nazwa: e.target.value})}
                placeholder="np. Faktury sprzedażowe"
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
                Typ dokumentu *
              </label>
              <select
                value={newDocDef.typ_dokumentu}
                onChange={(e) => setNewDocDef({...newDocDef, typ_dokumentu: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #e9ecef',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              >
                <option value="invoice">Faktura</option>
                <option value="receipt">Paragon</option>
                <option value="proforma">Faktura pro forma</option>
                <option value="credit_note">Faktura korygująca</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Prefiks numeracji *
              </label>
              <input
                type="text"
                value={newDocDef.prefiks}
                onChange={(e) => setNewDocDef({...newDocDef, prefiks: e.target.value})}
                placeholder="np. FS"
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
                Następny numer
              </label>
              <input
                type="number"
                value={newDocDef.nastepny_numer}
                onChange={(e) => setNewDocDef({...newDocDef, nastepny_numer: parseInt(e.target.value) || 1})}
                placeholder="1"
                min="1"
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
                Szablon nagłówka
              </label>
              <textarea
                value={newDocDef.szablon_naglowka}
                onChange={(e) => setNewDocDef({...newDocDef, szablon_naglowka: e.target.value})}
                placeholder="Szablon nagłówka dokumentu..."
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
              <small style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                Dostępne zmienne: {'{firma_nazwa}'}, {'{firma_adres}'}, {'{data}'}, {'{numer_dokumentu}'}
              </small>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Szablon stopki
              </label>
              <textarea
                value={newDocDef.szablon_stopki}
                onChange={(e) => setNewDocDef({...newDocDef, szablon_stopki: e.target.value})}
                placeholder="Szablon stopki dokumentu..."
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
              <small style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                Dostępne zmienne: {'{suma_brutto}'}, {'{suma_netto}'}, {'{suma_vat}'}, {'{podpis}'}
              </small>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={newDocDef.aktywny}
                onChange={(e) => setNewDocDef({...newDocDef, aktywny: e.target.checked})}
              />
              <span style={{ fontSize: '0.875rem' }}>Definicja aktywna</span>
            </label>

            <button
              onClick={addDocumentDefinition}
              disabled={!newDocDef.nazwa.trim() || !newDocDef.prefiks.trim()}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: !newDocDef.nazwa.trim() || !newDocDef.prefiks.trim() ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: !newDocDef.nazwa.trim() || !newDocDef.prefiks.trim() ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              ➕ Dodaj definicję
            </button>
          </div>
        </div>

        {/* Podgląd szablonów */}
        <div style={{
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          backgroundColor: 'white',
          overflow: 'hidden',
          marginTop: '1rem'
        }}>
          <div style={{
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #e9ecef',
            fontWeight: '600'
          }}>
            👁️ Podgląd szablonu
          </div>

          <div style={{ padding: '1rem' }}>
            {newDocDef.szablon_naglowka || newDocDef.szablon_stopki ? (
              <div style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
                {newDocDef.szablon_naglowka && (
                  <div style={{
                    padding: '0.5rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '0.375rem',
                    marginBottom: '0.5rem'
                  }}>
                    <strong>Nagłówek:</strong>
                    <pre style={{ margin: '0.5rem 0 0 0', whiteSpace: 'pre-wrap' }}>
                      {newDocDef.szablon_naglowka}
                    </pre>
                  </div>
                )}
                {newDocDef.szablon_stopki && (
                  <div style={{
                    padding: '0.5rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '0.375rem'
                  }}>
                    <strong>Stopka:</strong>
                    <pre style={{ margin: '0.5rem 0 0 0', whiteSpace: 'pre-wrap' }}>
                      {newDocDef.szablon_stopki}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#6c757d'
              }}>
                Wprowadź szablon nagłówka lub stopki aby zobaczyć podgląd
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAutoBackupTab = () => (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {/* Status automatycznych kopii zapasowych */}
      <div style={{
        border: '1px solid #e9ecef',
        borderRadius: '0.375rem',
        backgroundColor: 'white',
        padding: '1rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
            🔄 Automatyczne kopie zapasowe
          </h3>
          <span style={{
            padding: '0.5rem 1rem',
            backgroundColor: backupSettings?.enabled ? '#d4edda' : '#f8d7da',
            color: backupSettings?.enabled ? '#155724' : '#721c24',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            {backupSettings?.enabled ? '🟢 Aktywne' : '🔴 Nieaktywne'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Częstotliwość kopii
            </label>
            <select
              value={backupSettings?.frequency || 'daily'}
              onChange={(e) => setBackupSettings({...backupSettings, frequency: e.target.value})}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #e9ecef',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            >
              <option value="hourly">Co godzinę</option>
              <option value="daily">Codziennie</option>
              <option value="weekly">Co tydzień</option>
              <option value="monthly">Co miesiąc</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Godzina wykonania
            </label>
            <input
              type="time"
              value={backupSettings?.time || '02:00'}
              onChange={(e) => setBackupSettings({...backupSettings, time: e.target.value})}
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
              Liczba kopii do zachowania
            </label>
            <input
              type="number"
              value={backupSettings?.retention_count || 7}
              onChange={(e) => setBackupSettings({...backupSettings, retention_count: parseInt(e.target.value) || 7})}
              min="1"
              max="30"
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
              Ścieżka kopii zapasowych
            </label>
            <input
              type="text"
              value={backupSettings?.backup_path || '/backup'}
              onChange={(e) => setBackupSettings({...backupSettings, backup_path: e.target.value})}
              placeholder="/backup"
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

        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={backupSettings?.enabled || false}
              onChange={(e) => setBackupSettings({...backupSettings, enabled: e.target.checked})}
            />
            <span style={{ fontSize: '0.875rem' }}>Włącz automatyczne kopie zapasowe</span>
          </label>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button
            onClick={saveBackupSettings}
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
            💾 Zapisz ustawienia
          </button>
          <button
            onClick={createManualBackup}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            📦 Utwórz kopię teraz
          </button>
          <button
            onClick={testBackupSystem}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#ffc107',
              color: '#212529',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            🧪 Testuj system
          </button>
        </div>
      </div>

      {/* Lista kopii zapasowych */}
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
          <span>📁 Lista kopii zapasowych</span>
          <button
            onClick={refreshBackupList}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            🔄 Odśwież
          </button>
        </div>

        <div style={{ overflow: 'auto', maxHeight: '400px' }}>
          {backupList.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#6c757d'
            }}>
              <p>Brak kopii zapasowych</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Nazwa pliku
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Data utworzenia
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Rozmiar
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Typ
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Akcje
                  </th>
                </tr>
              </thead>
              <tbody>
                {backupList.map((backup, index) => (
                  <tr key={backup.id} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', borderBottom: '1px solid #e9ecef' }}>
                      <div style={{ fontWeight: '500' }}>
                        {backup.filename}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                        {backup.path}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', borderBottom: '1px solid #e9ecef' }}>
                      {new Date(backup.created_at).toLocaleString('pl-PL')}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right', borderBottom: '1px solid #e9ecef' }}>
                      {formatFileSize(backup.size)}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', borderBottom: '1px solid #e9ecef' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: backup.type === 'automatic' ? '#d4edda' : '#fff3cd',
                        color: backup.type === 'automatic' ? '#155724' : '#856404',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}>
                        {backup.type === 'automatic' ? 'Automatyczna' : 'Manualna'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'center', borderBottom: '1px solid #e9ecef' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => downloadBackup(backup)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          📥 Pobierz
                        </button>
                        <button
                          onClick={() => restoreBackup(backup)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#ffc107',
                            color: '#212529',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          🔄 Przywróć
                        </button>
                        <button
                          onClick={() => deleteBackup(backup.id)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          🗑️ Usuń
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {/* Ustawienia systemu */}
      <div style={{
        border: '1px solid #e9ecef',
        borderRadius: '0.375rem',
        backgroundColor: 'white',
        padding: '1rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
          ⚙️ Ustawienia systemu
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Nazwa firmy
            </label>
            <input
              type="text"
              value={systemSettings?.company_name || ''}
              onChange={(e) => setSystemSettings({...systemSettings, company_name: e.target.value})}
              placeholder="Nazwa firmy"
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
              NIP
            </label>
            <input
              type="text"
              value={systemSettings?.tax_id || ''}
              onChange={(e) => setSystemSettings({...systemSettings, tax_id: e.target.value})}
              placeholder="NIP"
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
              Adres firmy
            </label>
            <textarea
              value={systemSettings?.company_address || ''}
              onChange={(e) => setSystemSettings({...systemSettings, company_address: e.target.value})}
              placeholder="Adres firmy"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #e9ecef',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                minHeight: '60px',
                resize: 'vertical'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Domyślna stawka VAT (%)
            </label>
            <select
              value={systemSettings?.default_vat_rate || '23'}
              onChange={(e) => setSystemSettings({...systemSettings, default_vat_rate: e.target.value})}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #e9ecef',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            >
              <option value="0">0%</option>
              <option value="5">5%</option>
              <option value="8">8%</option>
              <option value="23">23%</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Waluta
            </label>
            <select
              value={systemSettings?.currency || 'PLN'}
              onChange={(e) => setSystemSettings({...systemSettings, currency: e.target.value})}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #e9ecef',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            >
              <option value="PLN">PLN (zł)</option>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Język systemu
            </label>
            <select
              value={systemSettings?.language || 'pl'}
              onChange={(e) => setSystemSettings({...systemSettings, language: e.target.value})}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #e9ecef',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            >
              <option value="pl">Polski</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={systemSettings?.auto_print_receipts || false}
              onChange={(e) => setSystemSettings({...systemSettings, auto_print_receipts: e.target.checked})}
            />
            <span style={{ fontSize: '0.875rem' }}>Automatyczne drukowanie paragonów</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={systemSettings?.require_customer_info || false}
              onChange={(e) => setSystemSettings({...systemSettings, require_customer_info: e.target.checked})}
            />
            <span style={{ fontSize: '0.875rem' }}>Wymagaj danych klienta przy sprzedaży</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={systemSettings?.enable_inventory_tracking || false}
              onChange={(e) => setSystemSettings({...systemSettings, enable_inventory_tracking: e.target.checked})}
            />
            <span style={{ fontSize: '0.875rem' }}>Włącz śledzenie stanów magazynowych</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={systemSettings?.enable_loyalty_program || false}
              onChange={(e) => setSystemSettings({...systemSettings, enable_loyalty_program: e.target.checked})}
            />
            <span style={{ fontSize: '0.875rem' }}>Włącz program lojalnościowy</span>
          </label>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={saveSystemSettings}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            💾 Zapisz ustawienia systemu
          </button>
        </div>
      </div>

      {/* Ustawienia drukarki */}
      <div style={{
        border: '1px solid #e9ecef',
        borderRadius: '0.375rem',
        backgroundColor: 'white',
        padding: '1rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
          🖨️ Ustawienia drukarki
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Typ drukarki
            </label>
            <select
              value={printerSettings?.printer_type || 'thermal'}
              onChange={(e) => setPrinterSettings({...printerSettings, printer_type: e.target.value})}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #e9ecef',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            >
              <option value="thermal">Drukarka termiczna</option>
              <option value="inkjet">Drukarka atramentowa</option>
              <option value="laser">Drukarka laserowa</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Szerokość papieru (mm)
            </label>
            <select
              value={printerSettings?.paper_width || '80'}
              onChange={(e) => setPrinterSettings({...printerSettings, paper_width: e.target.value})}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #e9ecef',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            >
              <option value="58">58mm</option>
              <option value="80">80mm</option>
              <option value="210">A4 (210mm)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Port drukarki
            </label>
            <input
              type="text"
              value={printerSettings?.printer_port || 'USB001'}
              onChange={(e) => setPrinterSettings({...printerSettings, printer_port: e.target.value})}
              placeholder="USB001"
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
              Liczba kopii
            </label>
            <input
              type="number"
              value={printerSettings?.copies || 1}
              onChange={(e) => setPrinterSettings({...printerSettings, copies: parseInt(e.target.value) || 1})}
              min="1"
              max="5"
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

        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={testPrinter}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#ffc107',
              color: '#212529',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            🧪 Test drukarki
          </button>
          <button
            onClick={savePrinterSettings}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            💾 Zapisz ustawienia
          </button>
        </div>
      </div>

      {/* Ustawienia bezpieczeństwa */}
      <div style={{
        border: '1px solid #e9ecef',
        borderRadius: '0.375rem',
        backgroundColor: 'white',
        padding: '1rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
          🔒 Ustawienia bezpieczeństwa
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Minimalna długość hasła
            </label>
            <input
              type="number"
              value={securitySettings?.min_password_length || 8}
              onChange={(e) => setSecuritySettings({...securitySettings, min_password_length: parseInt(e.target.value) || 8})}
              min="6"
              max="20"
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
              Czas sesji (minuty)
            </label>
            <input
              type="number"
              value={securitySettings?.session_timeout || 480}
              onChange={(e) => setSecuritySettings({...securitySettings, session_timeout: parseInt(e.target.value) || 480})}
              min="30"
              max="1440"
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
              Maksymalna liczba prób logowania
            </label>
            <input
              type="number"
              value={securitySettings?.max_login_attempts || 5}
              onChange={(e) => setSecuritySettings({...securitySettings, max_login_attempts: parseInt(e.target.value) || 5})}
              min="3"
              max="10"
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

        <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={securitySettings?.require_strong_passwords || false}
              onChange={(e) => setSecuritySettings({...securitySettings, require_strong_passwords: e.target.checked})}
            />
            <span style={{ fontSize: '0.875rem' }}>Wymagaj silnych haseł</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={securitySettings?.enable_two_factor || false}
              onChange={(e) => setSecuritySettings({...securitySettings, enable_two_factor: e.target.checked})}
            />
            <span style={{ fontSize: '0.875rem' }}>Włącz uwierzytelnianie dwuskładnikowe</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={securitySettings?.log_all_actions || false}
              onChange={(e) => setSecuritySettings({...securitySettings, log_all_actions: e.target.checked})}
            />
            <span style={{ fontSize: '0.875rem' }}>Loguj wszystkie akcje użytkowników</span>
          </label>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={saveSecuritySettings}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            🔒 Zapisz ustawienia bezpieczeństwa
          </button>
        </div>
      </div>

      {/* Akcje systemowe */}
      <div style={{
        border: '1px solid #e9ecef',
        borderRadius: '0.375rem',
        backgroundColor: 'white',
        padding: '1rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
          🔧 Akcje systemowe
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <button
            onClick={clearCache}
            style={{
              padding: '1rem',
              backgroundColor: '#ffc107',
              color: '#212529',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              textAlign: 'center'
            }}
          >
            🧹 Wyczyść cache
          </button>

          <button
            onClick={optimizeDatabase}
            style={{
              padding: '1rem',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              textAlign: 'center'
            }}
          >
            ⚡ Optymalizuj bazę danych
          </button>

          <button
            onClick={checkSystemHealth}
            style={{
              padding: '1rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              textAlign: 'center'
            }}
          >
            🩺 Sprawdź stan systemu
          </button>

          <button
            onClick={restartSystem}
            style={{
              padding: '1rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              textAlign: 'center'
            }}
          >
            🔄 Restart systemu
          </button>
        </div>
      </div>
    </div>
  );

  const renderLogsTab = () => (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {/* Filtry logów */}
      <div style={{
        border: '1px solid #e9ecef',
        borderRadius: '0.375rem',
        backgroundColor: 'white',
        padding: '1rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
          🔍 Filtry logów systemowych
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Data od
            </label>
            <input
              type="date"
              value={logFilters.dateFrom}
              onChange={(e) => setLogFilters({...logFilters, dateFrom: e.target.value})}
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
              Data do
            </label>
            <input
              type="date"
              value={logFilters.dateTo}
              onChange={(e) => setLogFilters({...logFilters, dateTo: e.target.value})}
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
              Poziom logu
            </label>
            <select
              value={logFilters.level}
              onChange={(e) => setLogFilters({...logFilters, level: e.target.value})}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #e9ecef',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            >
              <option value="">Wszystkie poziomy</option>
              <option value="ERROR">Błędy</option>
              <option value="WARNING">Ostrzeżenia</option>
              <option value="INFO">Informacje</option>
              <option value="DEBUG">Debug</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Użytkownik
            </label>
            <select
              value={logFilters.userId}
              onChange={(e) => setLogFilters({...logFilters, userId: e.target.value})}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #e9ecef',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            >
              <option value="">Wszyscy użytkownicy</option>
              {/* Lista użytkowników jest teraz w zakładce Lokalizacje */}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Szukaj w logach
            </label>
            <input
              type="text"
              value={logFilters.search}
              onChange={(e) => setLogFilters({...logFilters, search: e.target.value})}
              placeholder="Szukaj tekstu..."
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #e9ecef',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button
              onClick={searchLogs}
              style={{
                width: '100%',
                padding: '0.5rem 1rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              🔍 Szukaj
            </button>
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button
            onClick={refreshLogs}
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
            🔄 Odśwież
          </button>
          <button
            onClick={clearLogs}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#ffc107',
              color: '#212529',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            🧹 Wyczyść stare logi
          </button>
          <button
            onClick={() => exportLogs(logs)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            📤 Eksportuj logi
          </button>
        </div>
      </div>

      {/* Lista logów */}
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
          <span>📋 Logi systemowe</span>
          <span style={{ fontSize: '0.875rem', color: '#6c757d' }}>
            Znaleziono: {logs.length} rekordów
          </span>
        </div>

        <div style={{ overflow: 'auto', maxHeight: '600px' }}>
          {logs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#6c757d'
            }}>
              <p>Brak logów spełniających kryteria</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Data/Czas
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Poziom
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Użytkownik
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Akcja
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Wiadomość
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', borderBottom: '1px solid #e9ecef' }}>
                    Szczegóły
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={log.id} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', borderBottom: '1px solid #e9ecef' }}>
                      <div style={{ fontWeight: '500' }}>
                        {new Date(log.timestamp).toLocaleDateString('pl-PL')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                        {new Date(log.timestamp).toLocaleTimeString('pl-PL')}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', borderBottom: '1px solid #e9ecef' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: getLogLevelColor(log.level),
                        color: 'white',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}>
                        {log.level}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', borderBottom: '1px solid #e9ecef' }}>
                      {log.username || 'System'}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', borderBottom: '1px solid #e9ecef' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#e7f3ff',
                        color: '#0056b3',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem'
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ 
                      padding: '0.75rem', 
                      fontSize: '0.875rem', 
                      borderBottom: '1px solid #e9ecef',
                      maxWidth: '300px'
                    }}>
                      <div style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {log.message}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'center', borderBottom: '1px solid #e9ecef' }}>
                      <button
                        onClick={() => viewLogDetails(log)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.25rem',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        👁️ Szczegóły
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal szczegółów logu */}
      {showLogDetails && selectedLog && (
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>
                📋 Szczegóły logu
              </h3>
              <button
                onClick={() => setShowLogDetails(false)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '0.375rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                  <div>
                    <strong>ID:</strong> {selectedLog.id}
                  </div>
                  <div>
                    <strong>Timestamp:</strong> {new Date(selectedLog.timestamp).toLocaleString('pl-PL')}
                  </div>
                  <div>
                    <strong>Poziom:</strong> 
                    <span style={{
                      marginLeft: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      backgroundColor: getLogLevelColor(selectedLog.level),
                      color: 'white',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem'
                    }}>
                      {selectedLog.level}
                    </span>
                  </div>
                  <div>
                    <strong>Użytkownik:</strong> {selectedLog.username || 'System'}
                  </div>
                  <div>
                    <strong>Akcja:</strong> {selectedLog.action}
                  </div>
                  <div>
                    <strong>IP:</strong> {selectedLog.ip_address || 'N/A'}
                  </div>
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '0.375rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600' }}>
                  📝 Wiadomość
                </h4>
                <p style={{ margin: 0, fontSize: '0.875rem', wordBreak: 'break-word' }}>
                  {selectedLog.message}
                </p>
              </div>

              {selectedLog.details && (
                <div style={{ padding: '1rem', backgroundColor: '#e7f3ff', borderRadius: '0.375rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600' }}>
                    🔍 Szczegóły techniczne
                  </h4>
                  <pre style={{ 
                    margin: 0, 
                    fontSize: '0.75rem', 
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    backgroundColor: '#f8f9fa',
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    overflow: 'auto'
                  }}>
                    {typeof selectedLog.details === 'string' ? selectedLog.details : JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.stack_trace && (
                <div style={{ padding: '1rem', backgroundColor: '#f8d7da', borderRadius: '0.375rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600' }}>
                    🚨 Stack Trace
                  </h4>
                  <pre style={{ 
                    margin: 0, 
                    fontSize: '0.75rem', 
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    backgroundColor: '#f8f9fa',
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    overflow: 'auto'
                  }}>
                    {selectedLog.stack_trace}
                  </pre>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => copyLogToClipboard(selectedLog)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  📋 Kopiuj do schowka
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Dodajemy CSS animację
  const spinKeyframes = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;

  // Funkcje pomocnicze
  const generateDiscountReport = async () => {
    console.log('🔄 Generowanie raportu rabatów...');
    setLoading(true);
    try {
      await loadDiscountReports();
      console.log('✅ Raport rabatów wygenerowany pomyślnie');
    } catch (error) {
      console.error('❌ Błąd podczas generowania raportu:', error);
      setError('Błąd podczas generowania raportu rabatów');
    } finally {
      setLoading(false);
    }
  };

  const performDailyClosure = () => {
    console.log('Wykonywanie zamknięcia dziennego...');
    // TODO: Implementacja zamknięcia dziennego
  };

  const openNewDay = () => {
    console.log('Otwieranie nowego dnia...');
    // TODO: Implementacja otwierania nowego dnia
  };

  const refreshDailyStatus = () => {
    console.log('Odświeżanie statusu dziennego...');
    // TODO: Implementacja odświeżania statusu
  };

  const viewClosureDetails = (closure) => {
    setSelectedClosure(closure);
    setShowClosureDetails(true);
  };

  const printClosureReport = (closure) => {
    console.log('Drukowanie raportu zamknięcia...', closure);
    // TODO: Implementacja drukowania
  };

  const exportSingleClosure = (closure) => {
    console.log('Eksport zamknięcia...', closure);
    // TODO: Implementacja eksportu
  };

  const exportDailyClosures = (closures) => {
    if (!closures || closures.length === 0) {
      alert('Brak raportów do eksportu');
      return;
    }

    // Tworzenie CSV
    const csvContent = [
      // Nagłówki
      ['Data', 'Kasjer', 'Kasa System', 'Kasa Fizyczna', 'Różnica Kasa', 'Terminal System', 'Terminal Rzeczywisty', 'Różnica Terminal', 'Kasa Fiskalna', 'Sprzedaż Gotówka', 'Sprzedaż Karta', 'Liczba Transakcji', 'TikTok', 'Facebook', 'Instagram', 'Google', 'Osiągnięcia Sprzedaż', 'Osiągnięcia Praca'],
      // Dane
      ...closures.map(report => [
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
        report.social_media_tiktok || '',
        report.social_media_facebook || '',
        report.social_media_instagram || '',
        report.social_media_google || '',
        report.osiagniecia_sprzedaz || '',
        report.osiagniecia_praca || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `raporty_zamkniecia_dnia_${dailyClosureFilters.date_from}_${dailyClosureFilters.date_to}.csv`;
    link.click();
  };

  const getDocumentTypeColor = (type) => {
    const colors = {
      invoice: '#007bff',
      receipt: '#28a745',
      proforma: '#ffc107',
      credit_note: '#dc3545'
    };
    return colors[type] || '#6c757d';
  };

  const getDocumentTypeName = (type) => {
    const names = {
      invoice: 'Faktura',
      receipt: 'Paragon',
      proforma: 'Pro forma',
      credit_note: 'Korekta'
    };
    return names[type] || type;
  };

  const previewDocumentTemplate = (definition) => {
    console.log('Podgląd szablonu dokumentu...', definition);
    // TODO: Implementacja podglądu
  };

  const startEditDocDef = (definition) => {
    setEditingDocDef({...definition});
  };

  const cancelEditDocDef = () => {
    setEditingDocDef(null);
  };

  const updateDocumentDefinition = () => {
    console.log('Aktualizacja definicji dokumentu...', editingDocDef);
    // TODO: Implementacja aktualizacji
    setEditingDocDef(null);
  };

  const deleteDocumentDefinition = (id) => {
    if (window.confirm('Czy na pewno chcesz usunąć tę definicję?')) {
      console.log('Usuwanie definicji dokumentu...', id);
      // TODO: Implementacja usuwania
    }
  };

  const addDocumentDefinition = () => {
    console.log('Dodawanie definicji dokumentu...', newDocDef);
    // TODO: Implementacja dodawania
  };

  const saveBackupSettings = () => {
    console.log('Zapisywanie ustawień backup...', backupSettings);
    // TODO: Implementacja zapisywania ustawień
  };

  const createManualBackup = () => {
    console.log('Tworzenie manualnej kopii zapasowej...');
    // TODO: Implementacja tworzenia backup
  };

  const testBackupSystem = () => {
    console.log('Testowanie systemu backup...');
    // TODO: Implementacja testowania
  };

  const refreshBackupList = () => {
    console.log('Odświeżanie listy kopii zapasowych...');
    // TODO: Implementacja odświeżania listy
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadBackup = (backup) => {
    console.log('Pobieranie kopii zapasowej...', backup);
    // TODO: Implementacja pobierania
  };

  const restoreBackup = (backup) => {
    if (window.confirm('Czy na pewno chcesz przywrócić tę kopię zapasową?')) {
      console.log('Przywracanie kopii zapasowej...', backup);
      // TODO: Implementacja przywracania
    }
  };

  const deleteBackup = (id) => {
    if (window.confirm('Czy na pewno chcesz usunąć tę kopię zapasową?')) {
      console.log('Usuwanie kopii zapasowej...', id);
      // TODO: Implementacja usuwania
    }
  };

  const saveSystemSettings = () => {
    console.log('Zapisywanie ustawień systemu...', systemSettings);
    // TODO: Implementacja zapisywania
  };

  const savePrinterSettings = () => {
    console.log('Zapisywanie ustawień drukarki...', printerSettings);
    // TODO: Implementacja zapisywania
  };

  const saveSecuritySettings = () => {
    console.log('Zapisywanie ustawień bezpieczeństwa...', securitySettings);
    // TODO: Implementacja zapisywania
  };

  const testPrinter = () => {
    console.log('Testowanie drukarki...');
    // TODO: Implementacja testowania drukarki
  };

  const clearCache = () => {
    console.log('Czyszczenie cache...');
    // TODO: Implementacja czyszczenia cache
  };

  const optimizeDatabase = () => {
    console.log('Optymalizacja bazy danych...');
    // TODO: Implementacja optymalizacji
  };

  const checkSystemHealth = () => {
    console.log('Sprawdzanie stanu systemu...');
    // TODO: Implementacja sprawdzania stanu
  };

  const restartSystem = () => {
    if (window.confirm('Czy na pewno chcesz zrestartować system?')) {
      console.log('Restart systemu...');
      // TODO: Implementacja restartu
    }
  };

  const searchLogs = () => {
    console.log('Wyszukiwanie w logach...', logFilters);
    // TODO: Implementacja wyszukiwania
  };

  const refreshLogs = () => {
    console.log('Odświeżanie logów...');
    // TODO: Implementacja odświeżania
  };

  const clearLogs = () => {
    if (window.confirm('Czy na pewno chcesz wyczyścić stare logi?')) {
      console.log('Czyszczenie logów...');
      // TODO: Implementacja czyszczenia
    }
  };

  const exportLogs = (logs) => {
    console.log('Eksport logów...', logs);
    // TODO: Implementacja eksportu
  };

  const viewLogDetails = (log) => {
    setSelectedLog(log);
    setShowLogDetails(true);
  };

  const getLogLevelColor = (level) => {
    const colors = {
      ERROR: '#dc3545',
      WARNING: '#ffc107',
      INFO: '#007bff',
      DEBUG: '#6c757d'
    };
    return colors[level] || '#6c757d';
  };

  const copyLogToClipboard = (log) => {
    const logText = `[${log.timestamp}] ${log.level}: ${log.message}`;
    navigator.clipboard.writeText(logText);
    console.log('Log skopiowany do schowka');
  };

  // Funkcja renderująca zakładkę prefiksów dokumentów
  const renderDocumentPrefixesTab = () => (
    <DocumentPrefixesPage />
  );

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
              { id: 'company', icon: '🏢', label: 'Dane Firmy' },
              { id: 'announcements', icon: '📢', label: 'Ogłoszenia' },
              { id: 'fiscal-printer', icon: '🖨️', label: 'Drukarka Fiskalna' },
              { id: 'template-editor', icon: '✏️', label: 'Szablony Faktur' },
              { id: 'manufacturers', icon: '🏭', label: 'Producenci' },
              { id: 'warehouses', icon: '🏪', label: 'Magazyny' },
              { id: 'locations', icon: '🏢', label: 'Lokalizacje' },
              { id: 'categories', icon: '🏷️', label: 'Kategorie' },
              { id: 'discounts', icon: '🎯', label: 'Rabaty' },
              { id: 'discount-reports', icon: '📊', label: 'Raporty' },
              { id: 'daily-closure', icon: '🔒', label: 'Zamknięcie dnia' },
              { id: 'document-definitions', icon: '📄', label: 'Definicje dokumentów' },
              { id: 'document-prefixes', icon: '🏷️', label: 'Prefiksy dokumentów' },
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
            {activeTab === 'company' && <CompanyTab />}
            {activeTab === 'announcements' && <AnnouncementAdmin />}
            {activeTab === 'fiscal-printer' && <FiscalPrinterTab />}
            {activeTab === 'template-editor' && <SimpleTemplateEditor />}
            {activeTab === 'manufacturers' && renderManufacturersTab()}
            {activeTab === 'warehouses' && <WarehouseManagement />}
            {activeTab === 'locations' && <LocationsTab />}
            {activeTab === 'categories' && renderCategoriesTab()}
            {activeTab === 'discounts' && renderDiscountsTab()}
            {activeTab === 'discount-reports' && renderDiscountReportsTab()}
            {activeTab === 'daily-closure' && renderDailyClosureTab()}
            {activeTab === 'document-definitions' && renderDocumentDefinitionsTab()}
            {activeTab === 'document-prefixes' && renderDocumentPrefixesTab()}
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
