import React, { useState, useEffect } from 'react';
import { productService } from '../services/productService';
import categoryService from '../services/categoryService';

// Komponent strony produktów z funkcjonalnością kategorii
const ProductsPage = () => {
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
      const data = await categoryService.getCategories();
      setCategories(data.categories || []);
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
    const filteredProducts = products.filter(product =>
      product.nazwa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.kod_produktu.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.ean && product.ean.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
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
      fetchProducts(); // Odśwież listę produktów
    } catch (err) {
      console.error('❌ Błąd przypisywania kategorii:', err);
      alert('Błąd podczas przypisywania kategorii');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct({
      ...product,
      cena_zakupu: product.cena_zakupu || '',
      cena: product.cena || '',
      stawka_vat: product.stawka_vat || '23'
    });
    setTempValues({
      cena_zakupu: product.cena_zakupu || '',
      cena: product.cena || '',
      stawka_vat: product.stawka_vat || '23'
    });
  };

  const handleSaveEdit = async () => {
    try {
      await productService.updateProduct(editingProduct.id, editingProduct);
      await fetchProducts();
      setEditingProduct(null);
      setTempValues({});
      showSuccess('Produkt zaktualizowany pomyślnie');
    } catch (err) {
      console.error('❌ Błąd aktualizacji produktu:', err);
      setError('Błąd podczas aktualizacji produktu: ' + err.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setTempValues({});
  };

  const handleInputChange = (field, value) => {
    setEditingProduct(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await productService.addProduct(newProduct);
      await fetchProducts();
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
      showSuccess('Produkt dodany pomyślnie');
    } catch (err) {
      console.error('❌ Błąd dodawania produktu:', err);
      setError('Błąd podczas dodawania produktu: ' + err.message);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Czy na pewno chcesz usunąć ten produkt?')) {
      try {
        await productService.deleteProduct(id);
        await fetchProducts();
        showSuccess('Produkt usunięty pomyślnie');
      } catch (err) {
        console.error('❌ Błąd usuwania produktu:', err);
        setError('Błąd podczas usuwania produktu: ' + err.message);
      }
    }
  };

  const filteredProducts = products.filter(product =>
    product.nazwa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.kod_produktu.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.ean && product.ean.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div className="loading">Ładowanie produktów...</div>;
  }

  return (
    <div className="products-page" style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div className="header" style={{ marginBottom: '20px' }}>
        <h1 style={{ color: '#333', marginBottom: '10px' }}>Produkty</h1>
        
        {/* Komunikaty */}
        {error && (
          <div style={{ color: 'red', backgroundColor: '#ffebee', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
            {error}
          </div>
        )}
        
        {successMessage && (
          <div style={{ color: 'green', backgroundColor: '#e8f5e8', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
            {successMessage}
          </div>
        )}

        {/* Kontrolki */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Szukaj produktu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              minWidth: '200px'
            }}
          />
          
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {showAddForm ? 'Anuluj' : 'Dodaj produkt'}
          </button>

          {selectedProducts.length > 0 && (
            <button
              onClick={() => setShowCategoryModal(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Przypisz kategorię ({selectedProducts.length})
            </button>
          )}
        </div>
      </div>

      {/* Formularz dodawania produktu */}
      {showAddForm && (
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #ddd'
        }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>Dodaj nowy produkt</h3>
          <form onSubmit={handleAddProduct} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nazwa produktu:</label>
              <input
                type="text"
                value={newProduct.nazwa}
                onChange={(e) => setNewProduct({...newProduct, nazwa: e.target.value})}
                required
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Kod produktu:</label>
              <input
                type="text"
                value={newProduct.kod_produktu}
                onChange={(e) => setNewProduct({...newProduct, kod_produktu: e.target.value})}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>EAN:</label>
              <input
                type="text"
                value={newProduct.ean}
                onChange={(e) => setNewProduct({...newProduct, ean: e.target.value})}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Cena zakupu:</label>
              <input
                type="number"
                step="0.01"
                value={newProduct.cena_zakupu}
                onChange={(e) => setNewProduct({...newProduct, cena_zakupu: e.target.value})}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Cena sprzedaży:</label>
              <input
                type="number"
                step="0.01"
                value={newProduct.cena}
                onChange={(e) => setNewProduct({...newProduct, cena: e.target.value})}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Kategoria:</label>
              <input
                type="text"
                value={newProduct.kategoria}
                onChange={(e) => setNewProduct({...newProduct, kategoria: e.target.value})}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Opis:</label>
              <textarea
                value={newProduct.opis}
                onChange={(e) => setNewProduct({...newProduct, opis: e.target.value})}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', height: '60px' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Stawka VAT (%):</label>
              <select
                value={newProduct.stawka_vat}
                onChange={(e) => setNewProduct({...newProduct, stawka_vat: e.target.value})}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="8">8%</option>
                <option value="23">23%</option>
              </select>
            </div>
            
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#757575',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Anuluj
              </button>
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Dodaj produkt
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal przypisywania kategorii */}
      {showCategoryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            minWidth: '400px'
          }}>
            <h3>Przypisz kategorię</h3>
            <p>Wybrane produkty: {selectedProducts.length}</p>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px' }}>Wybierz kategorię:</label>
              <select
                value={selectedCategoryForAssign}
                onChange={(e) => setSelectedCategoryForAssign(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
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
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCategoryModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#757575',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Anuluj
              </button>
              <button
                onClick={handleAssignCategory}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Przypisz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista produktów */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ 
                padding: '12px 8px', 
                textAlign: 'left', 
                borderBottom: '2px solid #ddd',
                fontWeight: 'bold'
              }}>
                <input
                  type="checkbox"
                  checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                  onChange={handleSelectAll}
                  style={{ marginRight: '8px' }}
                />
                Wybierz
              </th>
              <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 'bold' }}>Nazwa</th>
              <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 'bold' }}>Kod</th>
              <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 'bold' }}>EAN</th>
              <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 'bold' }}>Cena zakupu</th>
              <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 'bold' }}>Cena sprzedaży</th>
              <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 'bold' }}>Kategoria</th>
              <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 'bold' }}>VAT %</th>
              <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 'bold' }}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product, index) => (
              <tr 
                key={product.id} 
                style={{ 
                  backgroundColor: index % 2 === 0 ? 'white' : '#f9f9f9',
                  borderBottom: '1px solid #eee'
                }}
              >
                <td style={{ padding: '8px' }}>
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => handleSelectProduct(product.id)}
                  />
                </td>
                <td style={{ padding: '8px' }}>
                  {editingProduct && editingProduct.id === product.id ? (
                    <input
                      type="text"
                      value={editingProduct.nazwa}
                      onChange={(e) => handleInputChange('nazwa', e.target.value)}
                      style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '2px' }}
                    />
                  ) : (
                    <span style={{ fontWeight: '500' }}>{product.nazwa}</span>
                  )}
                </td>
                <td style={{ padding: '8px' }}>
                  {editingProduct && editingProduct.id === product.id ? (
                    <input
                      type="text"
                      value={editingProduct.kod_produktu}
                      onChange={(e) => handleInputChange('kod_produktu', e.target.value)}
                      style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '2px' }}
                    />
                  ) : (
                    <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{product.kod_produktu}</span>
                  )}
                </td>
                <td style={{ padding: '8px' }}>
                  {editingProduct && editingProduct.id === product.id ? (
                    <input
                      type="text"
                      value={editingProduct.ean || ''}
                      onChange={(e) => handleInputChange('ean', e.target.value)}
                      style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '2px' }}
                    />
                  ) : (
                    <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{product.ean || '-'}</span>
                  )}
                </td>
                <td style={{ padding: '8px' }}>
                  {editingProduct && editingProduct.id === product.id ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editingProduct.cena_zakupu || ''}
                      onChange={(e) => handleInputChange('cena_zakupu', e.target.value)}
                      style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '2px' }}
                    />
                  ) : (
                    <span style={{ fontWeight: '500' }}>{product.cena_zakupu ? parseFloat(product.cena_zakupu).toFixed(2) + ' zł' : '-'}</span>
                  )}
                </td>
                <td style={{ padding: '8px' }}>
                  {editingProduct && editingProduct.id === product.id ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editingProduct.cena || ''}
                      onChange={(e) => handleInputChange('cena', e.target.value)}
                      style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '2px' }}
                    />
                  ) : (
                    <span style={{ fontWeight: 'bold', color: '#2196F3' }}>{product.cena ? parseFloat(product.cena).toFixed(2) + ' zł' : '-'}</span>
                  )}
                </td>
                <td style={{ padding: '8px' }}>
                  {editingProduct && editingProduct.id === product.id ? (
                    <input
                      type="text"
                      value={editingProduct.kategoria || ''}
                      onChange={(e) => handleInputChange('kategoria', e.target.value)}
                      style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '2px' }}
                    />
                  ) : (
                    <span>{product.kategoria || '-'}</span>
                  )}
                </td>
                <td style={{ padding: '8px' }}>
                  {editingProduct && editingProduct.id === product.id ? (
                    <select
                      value={editingProduct.stawka_vat || '23'}
                      onChange={(e) => handleInputChange('stawka_vat', e.target.value)}
                      style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '2px' }}
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="8">8%</option>
                      <option value="23">23%</option>
                    </select>
                  ) : (
                    <span>{product.stawka_vat || '23'}%</span>
                  )}
                </td>
                <td style={{ padding: '8px' }}>
                  {editingProduct && editingProduct.id === product.id ? (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        onClick={handleSaveEdit}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Zapisz
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#757575',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Anuluj
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        onClick={() => handleEditProduct(product)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Edytuj
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Usuń
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredProducts.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          backgroundColor: 'white',
          borderRadius: '8px',
          marginTop: '20px',
          border: '1px solid #ddd'
        }}>
          <p style={{ fontSize: '16px', color: '#666' }}>
            {searchTerm ? 'Brak produktów spełniających kryteria wyszukiwania' : 'Brak produktów w bazie danych'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
