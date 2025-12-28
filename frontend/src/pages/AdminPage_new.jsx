import React, { useState, useEffect } from 'react';
import CategoriesTab from '../components/admin/tabs/CategoriesTab';
import ManufacturersTab from '../components/admin/tabs/ManufacturersTab';
import DocumentDefinitionsTab from '../components/admin/tabs/DocumentDefinitionsTab';

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

  useEffect(() => {
    loadCategories();
    loadManufacturers();
  }, []);

  // Funkcje dla kategorii
  const loadCategories = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/categories');
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
      const response = await fetch('http://localhost:8000/api/categories', {
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

  // Funkcje dla producentów
  const loadManufacturers = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/manufacturers');
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
      const response = await fetch('http://localhost:8000/api/manufacturers', {
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
      const response = await fetch(`http://localhost:8000/api/manufacturers/${editingManufacturer.id}`, {
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
      const response = await fetch(`http://localhost:8000/api/manufacturers/${id}`, {
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

  const tabs = [
    { id: 'categories', label: '🏷️ Kategorie', component: 'categories' },
    { id: 'manufacturers', label: '🏭 Producenci', component: 'manufacturers' },
    { id: 'document-definitions', label: '📄 Definicje dokumentów', component: 'document-definitions' },
    { id: 'system', label: '⚙️ System', component: 'system' },
    { id: 'users', label: '👥 Użytkownicy', component: 'users' },
    { id: 'discounts', label: '💰 Rabaty', component: 'discounts' },
    { id: 'settings', label: '🔧 Ustawienia', component: 'settings' },
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
      case 'document-definitions':
        return <DocumentDefinitionsTab />;
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
