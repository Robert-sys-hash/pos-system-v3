import React, { useState, useEffect } from 'react';
import WarehouseManagement from '../components/admin/WarehouseManagement';
import AnnouncementAdmin from '../components/announcements/AnnouncementAdmin';
import {
  CategoriesTab,
  ManufacturersTab,
  DocumentDefinitionsTab,
  SystemTab,
  LogsTab,
  UsersTab,
  DiscountsTab,
  DiscountReportsTab,
  DailyClosureTab,
  SettingsTab,
  AutoBackupTab
} from '../components/admin';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('categories');
  
  // State dla kategorii
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState('');
  
  // State dla producentów
  const [manufacturers, setManufacturers] = useState([]);
  const [editingManufacturer, setEditingManufacturer] = useState(null);
  const [newManufacturer, setNewManufacturer] = useState({
    nazwa: '',
    opis: '',
    aktywny: true
  });

  // State dla użytkowników
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ login: '', haslo: '', typ: 'kasjer' });
  const [editingUser, setEditingUser] = useState(null);
  
  // State dla rabatów
  const [discounts, setDiscounts] = useState([]);
  const [newDiscount, setNewDiscount] = useState({
    nazwa: '',
    opis: '',
    typ_rabatu: 'procentowy',
    wartosc: 0,
    minimum_koszyka: 0,
    aktywny: true
  });
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [discountFilter, setDiscountFilter] = useState('all');
  
  // State dla raportów rabatów
  const [discountReports, setDiscountReports] = useState([]);
  const [discountStats, setDiscountStats] = useState({});
  const [reportFilters, setReportFilters] = useState({
    data_od: new Date().toISOString().split('T')[0],
    data_do: new Date().toISOString().split('T')[0],
    user_id: '',
    rabat_id: ''
  });
  const [reportType, setReportType] = useState('dzienne');

  // State dla zamknięć dnia
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

  // State dla ustawień
  const [settings, setSettings] = useState({
    shop_name: '',
    shop_address: '',
    shop_nip: '',
    shop_phone: '',
    currency: 'PLN',
    timezone: 'Europe/Warsaw',
    date_format: 'DD.MM.YYYY',
    auto_print_receipt: true,
    require_customer_display: false,
    enable_barcode_scanner: true,
    default_payment_method: 'gotowka',
    default_vat_rate: '23',
    prices_include_vat: true,
    round_to_cents: true,
    printer_paper_width: '80mm',
    printer_name: '',
    print_logo: false,
    print_footer: true,
    auto_cut_paper: true,
    auto_backup_enabled: false,
    backup_frequency: 'daily',
    backup_retention_days: 30,
    backup_path: './backups',
    session_timeout: 480,
    require_password_change: false,
    log_user_actions: true,
    enable_audit_trail: false
  });

  useEffect(() => {
    loadCategories();
    loadManufacturers();
    loadUsers();
    loadDiscounts();
    loadDiscountStats();
    loadDailyClosureReports();
    loadBackupSchedulerStatus();
    loadBackupList();
    loadSettings();
  }, []);

  // Funkcje ładowania danych
  const loadCategories = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(buildCategoryTree(data.data || []));
      }
    } catch (error) {
      console.error('Błąd ładowania kategorii:', error);
    }
  };

  const buildCategoryTree = (flatCategories) => {
    const categoryMap = {};
    const result = [];

    flatCategories.forEach(cat => {
      categoryMap[cat.id] = { ...cat, children: [] };
    });

    flatCategories.forEach(cat => {
      if (cat.parent_id && categoryMap[cat.parent_id]) {
        categoryMap[cat.parent_id].children.push(categoryMap[cat.id]);
      } else {
        result.push(categoryMap[cat.id]);
      }
    });

    return result;
  };

  const flattenCategories = (categories) => {
    const result = [];
    const traverse = (cats, prefix = '') => {
      cats.forEach(cat => {
        result.push({
          ...cat,
          displayName: prefix + cat.nazwa
        });
        if (cat.children && cat.children.length > 0) {
          traverse(cat.children, prefix + '-- ');
        }
      });
    };
    traverse(categories);
    return result;
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const response = await fetch('http://localhost:5002/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nazwa: newCategoryName,
          parent_id: newCategoryParentId || null
        })
      });

      if (response.ok) {
        setNewCategoryName('');
        setNewCategoryParentId('');
        await loadCategories();
      } else {
        alert('Błąd podczas dodawania kategorii');
      }
    } catch (error) {
      console.error('Błąd:', error);
      alert('Błąd podczas dodawania kategorii');
    }
  };

  const loadManufacturers = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/manufacturers');
      if (response.ok) {
        const data = await response.json();
        setManufacturers(data.data || []);
      }
    } catch (error) {
      console.error('Błąd ładowania producentów:', error);
    }
  };

  const addManufacturer = async () => {
    if (!newManufacturer.nazwa.trim()) {
      alert('Nazwa producenta jest wymagana');
      return;
    }

    try {
      const response = await fetch('http://localhost:5002/api/manufacturers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newManufacturer)
      });

      if (response.ok) {
        setNewManufacturer({ nazwa: '', opis: '', aktywny: true });
        await loadManufacturers();
        alert('Producent został dodany pomyślnie');
      } else {
        const error = await response.json();
        alert(error.message || 'Błąd podczas dodawania producenta');
      }
    } catch (error) {
      console.error('Błąd:', error);
      alert('Błąd podczas dodawania producenta');
    }
  };

  const startEditManufacturer = (manufacturer) => {
    setEditingManufacturer({ ...manufacturer });
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
      const response = await fetch(`http://localhost:5002/api/manufacturers/${editingManufacturer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingManufacturer)
      });

      if (response.ok) {
        setEditingManufacturer(null);
        await loadManufacturers();
        alert('Producent został zaktualizowany pomyślnie');
      } else {
        const error = await response.json();
        alert(error.message || 'Błąd podczas aktualizacji producenta');
      }
    } catch (error) {
      console.error('Błąd:', error);
      alert('Błąd podczas aktualizacji producenta');
    }
  };

  const deleteManufacturer = async (id) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tego producenta?')) return;

    try {
      const response = await fetch(`http://localhost:5002/api/manufacturers/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadManufacturers();
        alert('Producent został usunięty pomyślnie');
      } else {
        const error = await response.json();
        alert(error.message || 'Błąd podczas usuwania producenta');
      }
    } catch (error) {
      console.error('Błąd:', error);
      alert('Błąd podczas usuwania producenta');
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error('Błąd ładowania użytkowników:', error);
    }
  };

  const addUser = async () => {
    if (!newUser.login.trim() || !newUser.haslo.trim()) {
      alert('Login i hasło są wymagane');
      return;
    }

    try {
      const response = await fetch('http://localhost:5002/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        setNewUser({ login: '', haslo: '', typ: 'kasjer' });
        await loadUsers();
        alert('Użytkownik został dodany pomyślnie');
      } else {
        const error = await response.json();
        alert(error.message || 'Błąd podczas dodawania użytkownika');
      }
    } catch (error) {
      console.error('Błąd:', error);
      alert('Błąd podczas dodawania użytkownika');
    }
  };

  const startEditUser = (user) => {
    setEditingUser({ ...user });
  };

  const cancelEditUser = () => {
    setEditingUser(null);
  };

  const updateUser = async () => {
    if (!editingUser?.login?.trim()) {
      alert('Login jest wymagany');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5002/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser)
      });

      if (response.ok) {
        setEditingUser(null);
        await loadUsers();
        alert('Użytkownik został zaktualizowany pomyślnie');
      } else {
        const error = await response.json();
        alert(error.message || 'Błąd podczas aktualizacji użytkownika');
      }
    } catch (error) {
      console.error('Błąd:', error);
      alert('Błąd podczas aktualizacji użytkownika');
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tego użytkownika?')) return;

    try {
      const response = await fetch(`http://localhost:5002/api/users/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadUsers();
        alert('Użytkownik został usunięty pomyślnie');
      } else {
        const error = await response.json();
        alert(error.message || 'Błąd podczas usuwania użytkownika');
      }
    } catch (error) {
      console.error('Błąd:', error);
      alert('Błąd podczas usuwania użytkownika');
    }
  };

  const loadDiscounts = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/discounts');
      if (response.ok) {
        const data = await response.json();
        setDiscounts(data.data || []);
      }
    } catch (error) {
      console.error('Błąd ładowania rabatów:', error);
    }
  };

  const addDiscount = async () => {
    if (!newDiscount.nazwa.trim()) {
      alert('Nazwa rabatu jest wymagana');
      return;
    }

    try {
      const response = await fetch('http://localhost:5002/api/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDiscount)
      });

      if (response.ok) {
        setNewDiscount({
          nazwa: '',
          opis: '',
          typ_rabatu: 'procentowy',
          wartosc: 0,
          minimum_koszyka: 0,
          aktywny: true
        });
        await loadDiscounts();
        alert('Rabat został dodany pomyślnie');
      } else {
        const error = await response.json();
        alert(error.message || 'Błąd podczas dodawania rabatu');
      }
    } catch (error) {
      console.error('Błąd:', error);
      alert('Błąd podczas dodawania rabatu');
    }
  };

  const startEditDiscount = (discount) => {
    setEditingDiscount({ ...discount });
  };

  const cancelEditDiscount = () => {
    setEditingDiscount(null);
  };

  const updateDiscount = async () => {
    if (!editingDiscount?.nazwa?.trim()) {
      alert('Nazwa rabatu jest wymagana');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5002/api/discounts/${editingDiscount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingDiscount)
      });

      if (response.ok) {
        setEditingDiscount(null);
        await loadDiscounts();
        alert('Rabat został zaktualizowany pomyślnie');
      } else {
        const error = await response.json();
        alert(error.message || 'Błąd podczas aktualizacji rabatu');
      }
    } catch (error) {
      console.error('Błąd:', error);
      alert('Błąd podczas aktualizacji rabatu');
    }
  };

  const deleteDiscount = async (id) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten rabat?')) return;

    try {
      const response = await fetch(`http://localhost:5002/api/discounts/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadDiscounts();
        alert('Rabat został usunięty pomyślnie');
      } else {
        const error = await response.json();
        alert(error.message || 'Błąd podczas usuwania rabatu');
      }
    } catch (error) {
      console.error('Błąd:', error);
      alert('Błąd podczas usuwania rabatu');
    }
  };

  const loadDiscountStats = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/discount-reports/stats');
      if (response.ok) {
        const data = await response.json();
        setDiscountStats(data.data || {});
      }
    } catch (error) {
      console.error('Błąd ładowania statystyk rabatów:', error);
    }
  };

  const loadDiscountReports = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/discount-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportFilters)
      });
      if (response.ok) {
        const data = await response.json();
        setDiscountReports(data.data || []);
      }
    } catch (error) {
      console.error('Błąd ładowania raportów rabatów:', error);
    }
  };

  const loadDailyClosureReports = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/daily-closure/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dailyClosureFilters)
      });
      if (response.ok) {
        const data = await response.json();
        setDailyClosureReports(data.data || []);
      }
    } catch (error) {
      console.error('Błąd ładowania raportów zamknięć:', error);
    }
  };

  const loadDailyClosureSummary = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/daily-closure/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dailyClosureFilters)
      });
      if (response.ok) {
        const data = await response.json();
        setDailyClosureSummary(data.data || {});
      }
    } catch (error) {
      console.error('Błąd ładowania podsumowania zamknięć:', error);
    }
  };

  const loadBackupSchedulerStatus = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/backup/scheduler/status');
      if (response.ok) {
        const data = await response.json();
        setBackupSchedulerStatus(data.data || null);
      }
    } catch (error) {
      console.error('Błąd ładowania statusu harmonogramu:', error);
    }
  };

  const loadBackupList = async () => {
    setBackupLoading(true);
    try {
      const response = await fetch('http://localhost:5002/api/backup/list');
      if (response.ok) {
        const data = await response.json();
        setBackupList(data.data || []);
      }
    } catch (error) {
      console.error('Błąd ładowania listy kopii:', error);
    } finally {
      setBackupLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings({ ...settings, ...data.data });
      }
    } catch (error) {
      console.error('Błąd ładowania ustawień:', error);
    }
  };

  const createBackup = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/backup/create', {
        method: 'POST'
      });

      if (response.ok) {
        alert('Kopia zapasowa została utworzona pomyślnie');
      } else {
        const error = await response.json();
        alert(error.message || 'Błąd podczas tworzenia kopii zapasowej');
      }
    } catch (error) {
      console.error('Błąd:', error);
      alert('Błąd podczas tworzenia kopii zapasowej');
    }
  };

  const restoreBackup = async (filename) => {
    try {
      const response = await fetch('http://localhost:5002/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });

      if (response.ok) {
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Błąd podczas przywracania kopii');
      }
    } catch (error) {
      console.error('Błąd:', error);
      throw error;
    }
  };

  const deleteBackup = async (filename) => {
    try {
      const response = await fetch('http://localhost:5002/api/backup/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });

      if (response.ok) {
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Błąd podczas usuwania kopii');
      }
    } catch (error) {
      console.error('Błąd:', error);
      throw error;
    }
  };

  const toggleBackupScheduler = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/backup/scheduler/toggle', {
        method: 'POST'
      });

      if (response.ok) {
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Błąd przełączania harmonogramu');
      }
    } catch (error) {
      console.error('Błąd:', error);
      throw error;
    }
  };

  const saveSettings = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        alert('Ustawienia zostały zapisane pomyślnie');
      } else {
        const error = await response.json();
        alert(error.message || 'Błąd podczas zapisywania ustawień');
      }
    } catch (error) {
      console.error('Błąd:', error);
      alert('Błąd podczas zapisywania ustawień');
    }
  };

  const resetSettings = async () => {
    if (!window.confirm('Czy na pewno chcesz przywrócić domyślne ustawienia?')) return;

    try {
      const response = await fetch('http://localhost:5002/api/settings/reset', {
        method: 'POST'
      });

      if (response.ok) {
        await loadSettings();
        alert('Ustawienia zostały przywrócone do domyślnych');
      } else {
        const error = await response.json();
        alert(error.message || 'Błąd podczas przywracania ustawień');
      }
    } catch (error) {
      console.error('Błąd:', error);
      alert('Błąd podczas przywracania ustawień');
    }
  };

  const tabs = [
    { id: 'categories', label: '🏷️ Kategorie', component: 'categories' },
    { id: 'manufacturers', label: '🏭 Producenci', component: 'manufacturers' },
    { id: 'users', label: '👥 Użytkownicy', component: 'users' },
    { id: 'discounts', label: '🎯 Rabaty', component: 'discounts' },
    { id: 'discount-reports', label: '📊 Raporty rabatów', component: 'discount-reports' },
    { id: 'daily-closure', label: '🔒 Zamknięcie dnia', component: 'daily-closure' },
    { id: 'warehouses', label: '🏪 Magazyny', component: 'warehouses' },
    { id: 'announcements', label: '📢 Ogłoszenia', component: 'announcements' },
    { id: 'document-definitions', label: '📄 Definicje dokumentów', component: 'document-definitions' },
    { id: 'auto-backup', label: '💾 Auto kopie', component: 'auto-backup' },
    { id: 'settings', label: '🔧 Ustawienia', component: 'settings' },
    { id: 'system', label: '⚙️ System', component: 'system' },
    { id: 'logs', label: '📋 Logi', component: 'logs' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'categories':
        return (
          <CategoriesTab
            categories={categories}
            flattenCategories={flattenCategories}
            newCategoryName={newCategoryName}
            setNewCategoryName={setNewCategoryName}
            newCategoryParentId={newCategoryParentId}
            setNewCategoryParentId={setNewCategoryParentId}
            addCategory={addCategory}
          />
        );
      case 'manufacturers':
        return (
          <ManufacturersTab
            manufacturers={manufacturers}
            editingManufacturer={editingManufacturer}
            setEditingManufacturer={setEditingManufacturer}
            newManufacturer={newManufacturer}
            setNewManufacturer={setNewManufacturer}
            updateManufacturer={updateManufacturer}
            cancelEditManufacturer={cancelEditManufacturer}
            startEditManufacturer={startEditManufacturer}
            deleteManufacturer={deleteManufacturer}
            addManufacturer={addManufacturer}
          />
        );
      case 'users':
        return (
          <UsersTab
            users={users}
            newUser={newUser}
            setNewUser={setNewUser}
            editingUser={editingUser}
            setEditingUser={setEditingUser}
            addUser={addUser}
            updateUser={updateUser}
            deleteUser={deleteUser}
            startEditUser={startEditUser}
            cancelEditUser={cancelEditUser}
          />
        );
      case 'discounts':
        return (
          <DiscountsTab
            discounts={discounts}
            newDiscount={newDiscount}
            setNewDiscount={setNewDiscount}
            editingDiscount={editingDiscount}
            setEditingDiscount={setEditingDiscount}
            addDiscount={addDiscount}
            updateDiscount={updateDiscount}
            deleteDiscount={deleteDiscount}
            startEditDiscount={startEditDiscount}
            cancelEditDiscount={cancelEditDiscount}
            discountFilter={discountFilter}
            setDiscountFilter={setDiscountFilter}
          />
        );
      case 'discount-reports':
        return (
          <DiscountReportsTab
            discountReports={discountReports}
            discountStats={discountStats}
            reportFilters={reportFilters}
            setReportFilters={setReportFilters}
            reportType={reportType}
            setReportType={setReportType}
            loadDiscountReports={loadDiscountReports}
            loadDiscountStats={loadDiscountStats}
          />
        );
      case 'daily-closure':
        return (
          <DailyClosureTab
            dailyClosureReports={dailyClosureReports}
            dailyClosureSummary={dailyClosureSummary}
            dailyClosureFilters={dailyClosureFilters}
            setDailyClosureFilters={setDailyClosureFilters}
            selectedClosureReport={selectedClosureReport}
            setSelectedClosureReport={setSelectedClosureReport}
            showClosureReportModal={showClosureReportModal}
            setShowClosureReportModal={setShowClosureReportModal}
            loadDailyClosureReports={loadDailyClosureReports}
            loadDailyClosureSummary={loadDailyClosureSummary}
          />
        );
      case 'warehouses':
        return <WarehouseManagement />;
      case 'announcements':
        return <AnnouncementAdmin />;
      case 'document-definitions':
        return <DocumentDefinitionsTab />;
      case 'auto-backup':
        return (
          <AutoBackupTab
            backupSchedulerStatus={backupSchedulerStatus}
            backupList={backupList}
            backupLoading={backupLoading}
            loadBackupSchedulerStatus={loadBackupSchedulerStatus}
            loadBackupList={loadBackupList}
            createBackup={createBackup}
            restoreBackup={restoreBackup}
            deleteBackup={deleteBackup}
            toggleBackupScheduler={toggleBackupScheduler}
          />
        );
      case 'settings':
        return (
          <SettingsTab
            settings={settings}
            setSettings={setSettings}
            saveSettings={saveSettings}
            resetSettings={resetSettings}
          />
        );
      case 'system':
        return <SystemTab />;
      case 'logs':
        return <LogsTab />;
      default:
        return (
          <div style={{ 
            padding: '2rem', 
            textAlign: 'center', 
            color: '#6c757d',
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            border: '1px solid #e9ecef'
          }}>
            <h3>🚧 W trakcie budowy</h3>
            <p>Ta sekcja jest obecnie w trakcie implementacji.</p>
            <p>Aktywna zakładka: <strong>{activeTab}</strong></p>
          </div>
        );
    }
  };

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderBottom: '1px solid #e9ecef',
        zIndex: 1000,
        padding: '1rem 0'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem'
          }}>
            <h1 style={{
              margin: 0,
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#2c3e50'
            }}>
              🛠️ Panel Administratora
            </h1>
          </div>

          <div style={{
            display: 'flex',
            gap: '0.25rem',
            flexWrap: 'wrap'
          }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  border: '1px solid #dee2e6',
                  borderRadius: '0.375rem',
                  backgroundColor: activeTab === tab.id ? '#007bff' : 'white',
                  color: activeTab === tab.id ? 'white' : '#495057',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '160px',
        minHeight: 'calc(100vh - 160px)',
        backgroundColor: '#f8f9fa',
        padding: '2rem 1rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {renderTabContent()}
        </div>
      </div>
    </>
  );
};

export default AdminPage;
