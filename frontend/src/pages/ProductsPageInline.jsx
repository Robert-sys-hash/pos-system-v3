import React, { useState, useEffect } from 'react';
import { productService } from '../services/productService';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
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

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const startEditing = (product) => {
    setEditingProduct({
      ...product,
      cena: product.cena || product.cena_sprzedazy || product.price || '',
      nazwa: product.nazwa || product.name || '',
      kod_produktu: product.kod_produktu || product.barcode || '',
      kategoria: product.kategoria || product.category || '',
      stawka_vat: product.stawka_vat || product.tax_rate || '23'
    });
  };

  const cancelEditing = () => {
    setEditingProduct(null);
  };

  const saveProduct = async () => {
    if (!editingProduct) return;

    try {
      await productService.updateProduct(editingProduct.id, editingProduct);
      showSuccess('Produkt został zaktualizowany pomyślnie');
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      setError('Błąd podczas aktualizacji produktu: ' + err.message);
    }
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten produkt?')) return;

    try {
      await productService.deleteProduct(productId);
      showSuccess('Produkt został usunięty pomyślnie');
      fetchProducts();
    } catch (err) {
      setError('Błąd podczas usuwania produktu: ' + err.message);
    }
  };

  const addProduct = async () => {
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

  const filteredProducts = Array.isArray(products) ? products.filter(product => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (product.nazwa || product.name || '').toLowerCase().includes(searchLower) ||
      (product.kod_produktu || product.barcode || '').includes(searchTerm) ||
      (product.ean || '').includes(searchTerm) ||
      (product.kategoria || product.category || '').toLowerCase().includes(searchLower)
    );
  }) : [];

  if (loading) {
    return (
      <div style={{ padding: '2rem', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Ładowanie...</span>
          </div>
          <p style={{ marginTop: '1rem' }}>Ładowanie produktów...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div className="container-fluid">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
            📦 Produkty
          </h2>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <i className="fas fa-plus" style={{ marginRight: '0.5rem' }}></i>
            Dodaj produkt
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="alert alert-success" role="alert">
            <i className="fas fa-check-circle" style={{ marginRight: '0.5rem' }}></i>
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="alert alert-danger" role="alert">
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>
            {error}
          </div>
        )}

        {/* Add Product Form */}
        {showAddForm && (
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div className="card-header">
              <h5 style={{ margin: 0 }}>Dodaj nowy produkt</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nazwa produktu"
                    value={newProduct.nazwa}
                    onChange={(e) => setNewProduct({...newProduct, nazwa: e.target.value})}
                  />
                </div>
                <div className="col-md-2">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Kod produktu"
                    value={newProduct.kod_produktu}
                    onChange={(e) => setNewProduct({...newProduct, kod_produktu: e.target.value})}
                  />
                </div>
                <div className="col-md-2">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="EAN"
                    value={newProduct.ean}
                    onChange={(e) => setNewProduct({...newProduct, ean: e.target.value})}
                  />
                </div>
                <div className="col-md-2">
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="Cena"
                    value={newProduct.cena}
                    onChange={(e) => setNewProduct({...newProduct, cena: e.target.value})}
                  />
                </div>
                <div className="col-md-2">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Kategoria"
                    value={newProduct.kategoria}
                    onChange={(e) => setNewProduct({...newProduct, kategoria: e.target.value})}
                  />
                </div>
                <div className="col-md-1">
                  <button className="btn btn-success" onClick={addProduct}>
                    <i className="fas fa-save"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div style={{ marginBottom: '2rem' }}>
          <div className="input-group" style={{ maxWidth: '400px' }}>
            <span className="input-group-text">
              <i className="fas fa-search"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Szukaj produktów..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Products Table - Warehouse Style with Inline Editing */}
        <div className="card shadow-sm">
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="table table-hover" style={{ margin: 0 }}>
                <thead style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <tr>
                    <th style={{ padding: '1rem', fontWeight: '600', color: '#495057' }}>Nazwa</th>
                    <th style={{ padding: '1rem', fontWeight: '600', color: '#495057' }}>Kod</th>
                    <th style={{ padding: '1rem', fontWeight: '600', color: '#495057' }}>EAN</th>
                    <th style={{ padding: '1rem', fontWeight: '600', color: '#495057' }}>Kategoria</th>
                    <th style={{ padding: '1rem', fontWeight: '600', color: '#495057', textAlign: 'right' }}>Cena zakupu</th>
                    <th style={{ padding: '1rem', fontWeight: '600', color: '#495057', textAlign: 'right' }}>Cena sprzedaży</th>
                    <th style={{ padding: '1rem', fontWeight: '600', color: '#495057', textAlign: 'center' }}>VAT</th>
                    <th style={{ padding: '1rem', fontWeight: '600', color: '#495057', textAlign: 'center' }}>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: '#6c757d' }}>
                        {searchTerm ? 'Brak produktów pasujących do wyszukiwania' : 'Brak produktów'}
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map(product => (
                      <tr key={product.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '0.75rem' }}>
                          {editingProduct && editingProduct.id === product.id ? (
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={editingProduct.nazwa}
                              onChange={(e) => setEditingProduct({...editingProduct, nazwa: e.target.value})}
                            />
                          ) : (
                            <span style={{ fontWeight: '500' }}>{product.nazwa || product.name || '-'}</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {editingProduct && editingProduct.id === product.id ? (
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={editingProduct.kod_produktu}
                              onChange={(e) => setEditingProduct({...editingProduct, kod_produktu: e.target.value})}
                            />
                          ) : (
                            <code style={{ backgroundColor: '#f8f9fa', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                              {product.kod_produktu || product.barcode || '-'}
                            </code>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {editingProduct && editingProduct.id === product.id ? (
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={editingProduct.ean || ''}
                              onChange={(e) => setEditingProduct({...editingProduct, ean: e.target.value})}
                            />
                          ) : (
                            <small style={{ color: '#6c757d' }}>{product.ean || '-'}</small>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {editingProduct && editingProduct.id === product.id ? (
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={editingProduct.kategoria}
                              onChange={(e) => setEditingProduct({...editingProduct, kategoria: e.target.value})}
                            />
                          ) : (
                            <span className="badge bg-secondary" style={{ fontSize: '0.75rem' }}>
                              {product.kategoria || product.category || 'Brak'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {editingProduct && editingProduct.id === product.id ? (
                            <input
                              type="number"
                              step="0.01"
                              className="form-control form-control-sm"
                              value={editingProduct.cena_zakupu || ''}
                              onChange={(e) => setEditingProduct({...editingProduct, cena_zakupu: e.target.value})}
                            />
                          ) : (
                            <span style={{ fontWeight: '500' }}>
                              {product.cena_zakupu ? `${parseFloat(product.cena_zakupu).toFixed(2)} PLN` : '-'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {editingProduct && editingProduct.id === product.id ? (
                            <input
                              type="number"
                              step="0.01"
                              className="form-control form-control-sm"
                              value={editingProduct.cena}
                              onChange={(e) => setEditingProduct({...editingProduct, cena: e.target.value})}
                            />
                          ) : (
                            <span style={{ fontWeight: '600', color: '#28a745' }}>
                              {(product.cena || product.cena_sprzedazy || product.price) ? 
                                `${parseFloat(product.cena || product.cena_sprzedazy || product.price).toFixed(2)} PLN` : '-'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          {editingProduct && editingProduct.id === product.id ? (
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              value={editingProduct.stawka_vat}
                              onChange={(e) => setEditingProduct({...editingProduct, stawka_vat: e.target.value})}
                              style={{ width: '70px', margin: '0 auto' }}
                            />
                          ) : (
                            <span className="badge bg-info">
                              {product.stawka_vat || product.tax_rate || '23'}%
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          {editingProduct && editingProduct.id === product.id ? (
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={saveProduct}
                                title="Zapisz"
                              >
                                <i className="fas fa-save"></i>
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={cancelEditing}
                                title="Anuluj"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => startEditing(product)}
                                title="Edytuj"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => deleteProduct(product.id)}
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
        </div>

        {/* Statistics */}
        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
          <div className="card bg-primary text-white" style={{ flex: 1 }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h5 style={{ margin: 0, marginBottom: '0.5rem' }}>Wszystkie produkty</h5>
                  <h2 style={{ margin: 0 }}>{products.length}</h2>
                </div>
                <i className="fas fa-boxes fa-2x" style={{ opacity: 0.7 }}></i>
              </div>
            </div>
          </div>
          <div className="card bg-success text-white" style={{ flex: 1 }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h5 style={{ margin: 0, marginBottom: '0.5rem' }}>Wyszukane</h5>
                  <h2 style={{ margin: 0 }}>{filteredProducts.length}</h2>
                </div>
                <i className="fas fa-search fa-2x" style={{ opacity: 0.7 }}></i>
              </div>
            </div>
          </div>
          <div className="card bg-info text-white" style={{ flex: 1 }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h5 style={{ margin: 0, marginBottom: '0.5rem' }}>Kategorie</h5>
                  <h2 style={{ margin: 0 }}>
                    {new Set(products.map(p => p.kategoria || p.category).filter(Boolean)).size}
                  </h2>
                </div>
                <i className="fas fa-tags fa-2x" style={{ opacity: 0.7 }}></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
