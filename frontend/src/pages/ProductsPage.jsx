import React, { useState, useEffect } from 'react';
import { productService } from '../services/productService';
import categoryService from '../services/categoryService';
import { useLocation } from '../contexts/LocationContext';

const ProductsPage = () => {
  const { selectedLocation, locationId } = useLocation();
  
  // Użyj location_id
  const currentLocationId = locationId;

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategoryForAssign, setSelectedCategoryForAssign] = useState('');
  const [tempValues, setTempValues] = useState({});
  const [newProduct, setNewProduct] = useState({
    nazwa: '',
    kod_produktu: '',
    ean: '',
    cena_zakupu: '',
    cena: '',
    kategoria: '',
    opis: '',
    stawka_vat: '23'
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await productService.getProducts();
      console.log('🔍 Pobrane produkty:', data);
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('❌ Błąd pobierania produktów:', err);
      setError('Błąd podczas pobierania produktów: ' + err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await categoryService.getCategoriesFlat();
      setCategories(data || []);
    } catch (err) {
      console.error('❌ Błąd pobierania kategorii:', err);
    }
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleSelectProduct = (productId) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleSelectAll = () => {
    const filteredProducts = Array.isArray(products) ? products.filter(product =>
      product && (
        (product.nazwa && product.nazwa.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.kod_produktu && product.kod_produktu.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.ean && product.ean.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    ) : [];
    
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const handleAssignCategory = async () => {
    if (selectedProducts.length === 0 || !selectedCategoryForAssign) {
      alert('Wybierz produkty i kategorię');
      return;
    }

    try {
      await categoryService.assignCategoryToProducts(selectedProducts, selectedCategoryForAssign);
      showSuccess(`Przypisano kategorię do ${selectedProducts.length} produktów`);
      setShowCategoryModal(false);
      setSelectedProducts([]);
      setSelectedCategoryForAssign('');
      fetchProducts();
    } catch (err) {
      console.error('❌ Błąd przypisywania kategorii:', err);
      alert('Błąd podczas przypisywania kategorii');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct({
      ...product,
      cena: product.cena || product.cena_sprzedazy || product.price || '',
      nazwa: product.nazwa || product.name || '',
      kod_produktu: product.kod_produktu || product.barcode || '',
      kategoria: product.category_id || product.kategoria || product.category || '',
      category_id: product.category_id || '',
      stawka_vat: product.stawka_vat || product.tax_rate || '23'
    });
    setTempValues({});
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setTempValues({});
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;

    try {
      console.log('🔍 handleSaveProduct - editingProduct:', editingProduct);
      await productService.updateProduct(editingProduct.id, editingProduct);
      showSuccess('Produkt został zaktualizowany pomyślnie');
      setEditingProduct(null);
      setTempValues({});
      fetchProducts();
    } catch (err) {
      setError('Błąd podczas aktualizacji produktu: ' + err.message);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten produkt?')) return;

    try {
      await productService.deleteProduct(productId);
      showSuccess('Produkt został usunięty pomyślnie');
      fetchProducts();
    } catch (err) {
      setError('Błąd podczas usuwania produktu: ' + err.message);
    }
  };

  const handleAddProduct = async () => {
    try {
      await productService.addProduct(newProduct);
      showSuccess('Produkt został dodany pomyślnie');
      setNewProduct({
        nazwa: '',
        kod_produktu: '',
        ean: '',
        cena_zakupu: '',
        cena: '',
        kategoria: '',
        opis: '',
        stawka_vat: '23'
      });
      setShowAddForm(false);
      fetchProducts();
    } catch (err) {
      setError('Błąd podczas dodawania produktu: ' + err.message);
    }
  };

  const updateTempValue = (field, value) => {
    setTempValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const commitTempValue = (field) => {
    if (editingProduct && tempValues[field] !== undefined) {
      setEditingProduct(prev => ({
        ...prev,
        [field]: tempValues[field]
      }));
      setTempValues(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const filteredProducts = Array.isArray(products) ? products.filter(product => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (product.nazwa || product.name || '').toLowerCase().includes(searchLower) ||
      (product.kod_produktu || product.barcode || '').includes(searchTerm) ||
      (product.ean || '').includes(searchTerm) ||
      (product.kategoria || product.category || '').toLowerCase().includes(searchLower)
    );
  }) : [];

  if (loading && !products.length) {
    return (
      <div style={{ width: '100%', padding: '2rem', textAlign: 'center' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Ładowanie...</span>
        </div>
        <p className="mt-2 text-muted">Ładowanie produktów...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', padding: '1rem' }}>
      <div className="row">
        <div className="col-12">
          {/* Header - dokładnie jak warehouse */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '1.5rem',
            padding: '1rem',
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            border: '1px solid #e9ecef',
            boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
          }}>
            <div>
              <h2 style={{ margin: 0, color: '#495057', fontSize: '1.5rem', fontWeight: '600' }}>
                <i className="fas fa-box-open text-primary me-2"></i>
                Produkty
              </h2>
              <p style={{ margin: '0.25rem 0 0 0', color: '#6c757d', fontSize: '0.9rem' }}>
                Zarządzaj produktami w systemie
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'white',
                  backgroundColor: '#28a745',
                  border: '1px solid #28a745',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <i className="fas fa-plus" style={{ fontSize: '0.875rem' }}></i>
                Dodaj produkt
              </button>
              
              {selectedProducts.length > 0 && (
                <button 
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onClick={() => setShowCategoryModal(true)}
                >
                  <i className="fas fa-tags" style={{ fontSize: '0.875rem' }}></i>
                  Przypisz kategorię ({selectedProducts.length})
                </button>
              )}
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div style={{ 
              marginBottom: '1rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '0.375rem',
              color: '#155724'
            }}>
              <i className="fas fa-check-circle" style={{ marginRight: '0.5rem' }}></i>
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{ 
              marginBottom: '1rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '0.375rem',
              color: '#721c24'
            }}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>
              {error}
            </div>
          )}

          {/* Add Product Form */}
          {showAddForm && (
            <div style={{
              marginBottom: '1rem',
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
                  <i className="fas fa-plus me-2" style={{ color: '#6c757d' }}></i>
                  Dodaj nowy produkt
                </h6>
              </div>
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <input
                    type="text"
                    placeholder="Nazwa produktu"
                    style={{
                      padding: '0.375rem 0.75rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                    value={newProduct.nazwa}
                    onChange={(e) => setNewProduct({...newProduct, nazwa: e.target.value})}
                  />
                  <input
                    type="text"
                    placeholder="Kod produktu"
                    style={{
                      padding: '0.375rem 0.75rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                    value={newProduct.kod_produktu}
                    onChange={(e) => setNewProduct({...newProduct, kod_produktu: e.target.value})}
                  />
                  <input
                    type="text"
                    placeholder="EAN"
                    style={{
                      padding: '0.375rem 0.75rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                    value={newProduct.ean}
                    onChange={(e) => setNewProduct({...newProduct, ean: e.target.value})}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Cena sprzedaży"
                    style={{
                      padding: '0.375rem 0.75rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                    value={newProduct.cena}
                    onChange={(e) => setNewProduct({...newProduct, cena: e.target.value})}
                  />
                  <select
                    style={{
                      padding: '0.375rem 0.75rem',
                      border: '1px solid #ced4da',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                    value={newProduct.kategoria}
                    onChange={(e) => setNewProduct({...newProduct, kategoria: e.target.value})}
                  >
                    <option value="">-- Wybierz kategorię --</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.display_name}
                      </option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      style={{
                        padding: '0.375rem 1rem',
                        backgroundColor: '#28a745',
                        border: '1px solid #28a745',
                        color: 'white',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                      onClick={handleAddProduct}
                    >
                      <i className="fas fa-save me-1"></i>
                      Zapisz
                    </button>
                    <button
                      style={{
                        padding: '0.375rem 1rem',
                        backgroundColor: '#6c757d',
                        border: '1px solid #6c757d',
                        color: 'white',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                      onClick={() => setShowAddForm(false)}
                    >
                      Anuluj
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search and filters */}
          <div style={{ 
            marginBottom: '1rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'center'
          }}>
            <div style={{ flex: '1', maxWidth: '400px' }}>
              <input
                type="text"
                placeholder="Szukaj produktów..."
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Products Table - dokładnie jak InventoryTable */}
          <div style={{ 
            width: '100%', 
            backgroundColor: 'white',
            border: '1px solid #e9ecef',
            borderRadius: '0.375rem',
            boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
            overflowX: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #e9ecef'
            }}>
              <h6 style={{ 
                margin: 0, 
                color: '#495057', 
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                <i className="fas fa-table me-2" style={{ color: '#6c757d' }}></i>
                Lista produktów
              </h6>
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#6c757d',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <i className="fas fa-list"></i>
                <span>Produkty: <strong>{filteredProducts.length}</strong></span>
              </div>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%',
                minWidth: '850px',
                fontSize: '0.8rem',
                borderCollapse: 'separate',
                borderSpacing: 0
              }}>
                <thead style={{ 
                  backgroundColor: '#f8f9fa',
                  borderBottom: '2px solid #dee2e6'
                }}>
                  <tr style={{ fontSize: '0.75rem' }}>
                    <th style={{ 
                      width: '30px', 
                      padding: '0.5rem 0.25rem',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#495057'
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                        onChange={handleSelectAll}
                        style={{ margin: 0 }}
                      />
                    </th>
                    <th style={{ 
                      width: '40px', 
                      padding: '0.5rem 0.25rem',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#495057'
                    }}>ID</th>
                    <th style={{ 
                      minWidth: '250px', 
                      width: '28%', 
                      padding: '0.5rem 0.5rem',
                      fontWeight: '600',
                      color: '#495057'
                    }}>Produkt</th>
                    <th style={{ 
                      width: '120px', 
                      padding: '0.5rem 0.25rem',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#495057'
                    }}>Kod/EAN</th>
                    <th style={{ 
                      width: '100px', 
                      padding: '0.5rem 0.25rem',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#495057'
                    }}>Kategoria</th>
                    <th style={{ 
                      width: '110px', 
                      padding: '0.5rem 0.25rem',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#495057'
                    }}>Cena sprz.</th>
                    <th style={{ 
                      width: '75px', 
                      padding: '0.5rem 0.25rem',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#495057'
                    }}>Cena zak.</th>
                    <th style={{ 
                      width: '45px', 
                      padding: '0.5rem 0.25rem',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#495057'
                    }}>VAT</th>
                    <th style={{ 
                      width: '80px', 
                      padding: '0.5rem 0.25rem',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#495057'
                    }}>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ 
                        padding: '2rem', 
                        textAlign: 'center', 
                        color: '#6c757d' 
                      }}>
                        <div>
                          <i className="fas fa-box-open fa-3x mb-3" style={{ color: '#dee2e6' }}></i>
                          <h5 style={{ color: '#6c757d' }}>Brak produktów</h5>
                          <p style={{ margin: 0 }}>
                            {searchTerm ? 'Nie znaleziono produktów pasujących do wyszukiwania' : 'Brak produktów w systemie'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map(product => (
                      <tr key={product.id} style={{ 
                        borderBottom: '1px solid #f1f3f4',
                        backgroundColor: editingProduct && editingProduct.id === product.id ? '#f8f9fa' : 'white'
                      }}>
                        <td style={{ 
                          padding: '0.4rem 0.25rem',
                          textAlign: 'center'
                        }}>
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={() => handleSelectProduct(product.id)}
                            style={{ margin: 0 }}
                          />
                        </td>
                        <td style={{ 
                          padding: '0.4rem 0.25rem',
                          textAlign: 'center',
                          color: '#6c757d',
                          fontSize: '0.7rem'
                        }}>
                          {product.id}
                        </td>
                        <td style={{ padding: '0.4rem 0.5rem' }}>
                          {editingProduct && editingProduct.id === product.id ? (
                            <input
                              type="text"
                              style={{
                                width: '100%',
                                padding: '0.25rem 0.5rem',
                                border: '1px solid #007bff',
                                borderRadius: '0.25rem',
                                fontSize: '0.8rem'
                              }}
                              value={tempValues.nazwa !== undefined ? tempValues.nazwa : editingProduct.nazwa}
                              onChange={(e) => updateTempValue('nazwa', e.target.value)}
                              onBlur={() => commitTempValue('nazwa')}
                              onKeyPress={(e) => e.key === 'Enter' && commitTempValue('nazwa')}
                            />
                          ) : (
                            <div>
                              <div style={{ fontWeight: '500', marginBottom: '0.1rem' }}>
                                {product.nazwa || product.name || '-'}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>
                                {product.opis || product.description || ''}
                              </div>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.4rem 0.25rem', textAlign: 'center' }}>
                          {editingProduct && editingProduct.id === product.id ? (
                            <div>
                              <input
                                type="text"
                                placeholder="Kod"
                                style={{
                                  width: '100%',
                                  padding: '0.25rem 0.5rem',
                                  border: '1px solid #007bff',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem',
                                  marginBottom: '0.25rem'
                                }}
                                value={tempValues.kod_produktu !== undefined ? tempValues.kod_produktu : editingProduct.kod_produktu}
                                onChange={(e) => updateTempValue('kod_produktu', e.target.value)}
                                onBlur={() => commitTempValue('kod_produktu')}
                              />
                              <input
                                type="text"
                                placeholder="EAN"
                                style={{
                                  width: '100%',
                                  padding: '0.25rem 0.5rem',
                                  border: '1px solid #007bff',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem'
                                }}
                                value={tempValues.ean !== undefined ? tempValues.ean : (editingProduct.ean || '')}
                                onChange={(e) => updateTempValue('ean', e.target.value)}
                                onBlur={() => commitTempValue('ean')}
                              />
                            </div>
                          ) : (
                            <div>
                              <div style={{ 
                                fontSize: '0.75rem',
                                fontFamily: 'monospace',
                                backgroundColor: '#f8f9fa',
                                padding: '0.1rem 0.3rem',
                                borderRadius: '0.2rem',
                                marginBottom: '0.1rem'
                              }}>
                                {product.kod_produktu || product.barcode || '-'}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>
                                {product.ean || ''}
                              </div>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.4rem 0.25rem', textAlign: 'center' }}>
                          {editingProduct && editingProduct.id === product.id ? (
                            <select
                              style={{
                                width: '100%',
                                padding: '0.25rem 0.5rem',
                                border: '1px solid #007bff',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem'
                              }}
                              value={tempValues.kategoria !== undefined ? tempValues.kategoria : editingProduct.category_id || ''}
                              onChange={(e) => updateTempValue('kategoria', e.target.value)}
                              onBlur={() => commitTempValue('kategoria')}
                            >
                              <option value="">-- Brak kategorii --</option>
                              {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.display_name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span style={{ 
                              padding: '0.2rem 0.4rem',
                              backgroundColor: '#e9ecef',
                              borderRadius: '0.2rem',
                              fontSize: '0.7rem'
                            }}>
                              {product.category_name || product.kategoria || product.category || 'Brak'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.4rem 0.25rem', textAlign: 'center' }}>
                          {editingProduct && editingProduct.id === product.id ? (
                            <input
                              type="number"
                              step="0.01"
                              style={{
                                width: '100%',
                                padding: '0.25rem 0.5rem',
                                border: '1px solid #007bff',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem'
                              }}
                              value={tempValues.cena !== undefined ? tempValues.cena : editingProduct.cena}
                              onChange={(e) => updateTempValue('cena', e.target.value)}
                              onBlur={() => commitTempValue('cena')}
                            />
                          ) : (
                            <div style={{ fontWeight: '600', color: '#28a745' }}>
                              {product.cena_sprzedazy_brutto ? 
                                <div>
                                  <div>{parseFloat(product.cena_sprzedazy_brutto).toFixed(2)} zł</div>
                                  <small style={{ color: '#6c757d', fontSize: '0.75rem' }}>
                                    netto: {product.cena_sprzedazy_netto ? parseFloat(product.cena_sprzedazy_netto).toFixed(2) : '0.00'} zł
                                  </small>
                                </div>
                              : (product.cena ? 
                                <div>{parseFloat(product.cena).toFixed(2)} zł</div>
                                : '-'
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.4rem 0.25rem', textAlign: 'center' }}>
                          {editingProduct && editingProduct.id === product.id ? (
                            <input
                              type="number"
                              step="0.01"
                              style={{
                                width: '100%',
                                padding: '0.25rem 0.5rem',
                                border: '1px solid #007bff',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem'
                              }}
                              value={tempValues.cena_zakupu !== undefined ? tempValues.cena_zakupu : (editingProduct.cena_zakupu || '')}
                              onChange={(e) => updateTempValue('cena_zakupu', e.target.value)}
                              onBlur={() => commitTempValue('cena_zakupu')}
                            />
                          ) : (
                            <span style={{ color: '#6c757d' }}>
                              {product.cena_zakupu ? `${parseFloat(product.cena_zakupu).toFixed(2)} PLN` : '-'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.4rem 0.25rem', textAlign: 'center' }}>
                          {editingProduct && editingProduct.id === product.id ? (
                            <input
                              type="number"
                              style={{
                                width: '50px',
                                padding: '0.25rem',
                                border: '1px solid #007bff',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem'
                              }}
                              value={tempValues.stawka_vat !== undefined ? tempValues.stawka_vat : editingProduct.stawka_vat}
                              onChange={(e) => updateTempValue('stawka_vat', e.target.value)}
                              onBlur={() => commitTempValue('stawka_vat')}
                            />
                          ) : (
                            <span style={{ 
                              padding: '0.2rem 0.3rem',
                              backgroundColor: '#17a2b8',
                              color: 'white',
                              borderRadius: '0.2rem',
                              fontSize: '0.7rem'
                            }}>
                              {product.stawka_vat || product.tax_rate || '23'}%
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.4rem 0.25rem', textAlign: 'center' }}>
                          {editingProduct && editingProduct.id === product.id ? (
                            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                              <button
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: '#28a745',
                                  border: 'none',
                                  color: 'white',
                                  borderRadius: '0.25rem',
                                  cursor: 'pointer',
                                  fontSize: '0.7rem'
                                }}
                                onClick={handleSaveProduct}
                                title="Zapisz"
                              >
                                <i className="fas fa-save"></i>
                              </button>
                              <button
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: '#6c757d',
                                  border: 'none',
                                  color: 'white',
                                  borderRadius: '0.25rem',
                                  cursor: 'pointer',
                                  fontSize: '0.7rem'
                                }}
                                onClick={handleCancelEdit}
                                title="Anuluj"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                              <button
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: '#007bff',
                                  border: 'none',
                                  color: 'white',
                                  borderRadius: '0.25rem',
                                  cursor: 'pointer',
                                  fontSize: '0.7rem'
                                }}
                                onClick={() => handleEditProduct(product)}
                                title="Edytuj"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: '#dc3545',
                                  border: 'none',
                                  color: 'white',
                                  borderRadius: '0.25rem',
                                  cursor: 'pointer',
                                  fontSize: '0.7rem'
                                }}
                                onClick={() => handleDeleteProduct(product.id)}
                                title="Usuń"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Statistics - jak w warehouse */}
          <div style={{ 
            marginTop: '1.5rem',
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{
              flex: '1',
              minWidth: '200px',
              backgroundColor: 'white',
              border: '1px solid #e9ecef',
              borderRadius: '0.375rem',
              padding: '1.25rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h6 style={{ margin: 0, color: '#6c757d', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    Wszystkie produkty
                  </h6>
                  <h3 style={{ margin: '0.5rem 0 0 0', color: '#495057', fontWeight: '700' }}>
                    {products.length}
                  </h3>
                </div>
                <i className="fas fa-boxes fa-2x" style={{ color: '#007bff', opacity: 0.3 }}></i>
              </div>
            </div>
            
            <div style={{
              flex: '1',
              minWidth: '200px',
              backgroundColor: 'white',
              border: '1px solid #e9ecef',
              borderRadius: '0.375rem',
              padding: '1.25rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h6 style={{ margin: 0, color: '#6c757d', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    Wyszukane
                  </h6>
                  <h3 style={{ margin: '0.5rem 0 0 0', color: '#495057', fontWeight: '700' }}>
                    {filteredProducts.length}
                  </h3>
                </div>
                <i className="fas fa-search fa-2x" style={{ color: '#28a745', opacity: 0.3 }}></i>
              </div>
            </div>
            
            <div style={{
              flex: '1',
              minWidth: '200px',
              backgroundColor: 'white',
              border: '1px solid #e9ecef',
              borderRadius: '0.375rem',
              padding: '1.25rem',
              boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h6 style={{ margin: 0, color: '#6c757d', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    Kategorie
                  </h6>
                  <h3 style={{ margin: '0.5rem 0 0 0', color: '#495057', fontWeight: '700' }}>
                    {new Set(products.map(p => p.kategoria || p.category).filter(Boolean)).size}
                  </h3>
                </div>
                <i className="fas fa-tags fa-2x" style={{ color: '#17a2b8', opacity: 0.3 }}></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal przypisywania kategorii */}
      {showCategoryModal && (
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
            padding: '2rem',
            borderRadius: '0.5rem',
            minWidth: '400px',
            boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#333' }}>
              <i className="fas fa-tags" style={{ marginRight: '0.5rem', color: '#007bff' }}></i>
              Przypisz kategorię
            </h3>
            <p style={{ marginBottom: '1rem', color: '#6c757d' }}>
              Wybrane produkty: <strong>{selectedProducts.length}</strong>
            </p>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#495057' }}>
                Wybierz kategorię:
              </label>
              <select
                value={selectedCategoryForAssign}
                onChange={(e) => setSelectedCategoryForAssign(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              >
                <option value="">-- Wybierz kategorię --</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCategoryModal(false)}
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
                onClick={handleAssignCategory}
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
                Przypisz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
