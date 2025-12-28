import React, { useState, useEffect } from 'react';

// Komponent dla drzewa kategorii
const CategoryTree = ({ categories }) => {
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  const toggleCategory = (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const renderCategory = (category, level = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    
    return (
      <div key={category.id}>
        <div
          style={{
            padding: '0.5rem 1rem',
            borderBottom: '1px solid #f1f3f4',
            paddingLeft: `${1 + level * 2}rem`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: level % 2 === 0 ? '#fff' : '#f8f9fa'
          }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleCategory(category.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                borderRadius: '0.25rem',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {isExpanded ? '📂' : '📁'}
            </button>
          )}
          {!hasChildren && <span style={{ width: '1.5rem' }}>📄</span>}
          <span style={{ 
            fontSize: '0.875rem',
            color: '#495057',
            fontWeight: level === 0 ? '600' : '400'
          }}>
            {category.nazwa}
          </span>
          <span style={{ 
            fontSize: '0.75rem',
            color: '#6c757d',
            marginLeft: 'auto'
          }}>
            ID: {category.id}
          </span>
        </div>
        {hasChildren && isExpanded && category.children.map(child => 
          renderCategory(child, level + 1)
        )}
      </div>
    );
  };

  return (
    <div>
      {categories.map(category => renderCategory(category))}
    </div>
  );
};

const CategoriesTab = ({ 
  categories, 
  flattenCategories, 
  newCategoryName, 
  setNewCategoryName,
  newCategoryParentId,
  setNewCategoryParentId,
  addCategory
}) => {
  return (
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
};

export default CategoriesTab;
