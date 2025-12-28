import React, { useState } from 'react';
import InlineProductEdit from './InlineProductEdit';

const InventoryTable = ({ 
  products = [], 
  onUpdateStock, 
  onEditProduct,
  onSaveProduct,
  loading = false 
}) => {
  const [editingStock, setEditingStock] = useState({});
  const [tempValues, setTempValues] = useState({});
  const [editingProduct, setEditingProduct] = useState(null);

  const handleStockEdit = (productId, currentStock) => {
    setEditingStock(prev => ({ ...prev, [productId]: true }));
    setTempValues(prev => ({ ...prev, [productId]: currentStock }));
  };

  const handleStockSave = async (productId) => {
    const newStock = tempValues[productId];
    if (newStock === undefined || newStock === null) return;

    const result = await onUpdateStock(productId, {
      operation: 'set',
      stock_quantity: parseFloat(newStock),
      reason: 'Korekta manualna przez interfejs'
    });

    if (result.success) {
      setEditingStock(prev => ({ ...prev, [productId]: false }));
      setTempValues(prev => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });
    }
  };

  const handleStockCancel = (productId) => {
    setEditingStock(prev => ({ ...prev, [productId]: false }));
    setTempValues(prev => {
      const updated = { ...prev };
      delete updated[productId];
      return updated;
    });
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
  };

  const handleSaveProductEdit = async (productId, formData) => {
    try {
      await onSaveProduct(productId, formData);
      setEditingProduct(null);
    } catch (error) {
      throw error;
    }
  };

  const getStatusBadge = (product) => {
    const stock = product.stock_quantity || 0;
    const minLevel = product.min_stock_level || 0;

    if (stock <= 0) {
      return <span className="badge bg-danger">Brak</span>;
    } else if (stock <= minLevel) {
      return <span className="badge bg-warning text-dark">Niski</span>;
    } else {
      return <span className="badge bg-success">Dostępny</span>;
    }
  };

  const getRowClass = (product) => {
    const stock = product.stock_quantity || 0;
    const minLevel = product.min_stock_level || 0;

    if (stock <= 0) {
      return 'table-danger';
    } else if (stock <= minLevel) {
      return 'table-warning';
    }
    return '';
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Ładowanie...</span>
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="text-muted">
          <i className="fas fa-box-open fa-3x mb-3"></i>
          <h5>Brak produktów</h5>
          <p>Nie znaleziono produktów spełniających kryteria wyszukiwania</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-dark">
          <tr>
            <th style={{ width: '80px' }}>ID</th>
            <th style={{ minWidth: '350px' }}>Produkt</th>
            <th style={{ width: '120px' }}>Kategoria</th>
            <th style={{ width: '110px' }}>Cena sprzedaży</th>
            <th style={{ width: '110px' }}>Cena zakupu</th>
            <th style={{ width: '100px' }}>Stan</th>
            <th style={{ width: '80px' }}>Min</th>
            <th style={{ width: '80px' }}>Jedn.</th>
            <th style={{ width: '100px' }}>Status</th>
            <th style={{ width: '90px' }}>Akcje</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <React.Fragment key={product.id}>
              <tr className={getRowClass(product)}>
                <td>
                  <span className="badge bg-light text-dark fw-bold">#{product.id}</span>
                </td>
                <td>
                  <div className="d-flex align-items-start">
                    <div className="flex-grow-1">
                      <div className="fw-bold text-dark mb-1 fs-6" style={{ lineHeight: '1.3' }}>
                        {product.name}
                      </div>
                      {product.description && (
                        <div className="text-muted small mb-1">
                          {product.description.length > 100 
                            ? `${product.description.substring(0, 100)}...` 
                            : product.description}
                        </div>
                      )}
                      <div className="d-flex gap-3 text-muted small">
                        {product.barcode && product.barcode !== 'null' && product.barcode !== 'None' && (
                          <span>
                            <i className="fas fa-barcode me-1"></i>
                            EAN: {product.barcode}
                          </span>
                        )}
                        {product.product_code && product.product_code !== 'null' && product.product_code !== 'None' && (
                          <span>
                            <i className="fas fa-qrcode me-1"></i>
                            Kod: {product.product_code}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="badge bg-secondary bg-opacity-50 text-dark">
                    {product.category || 'Bez kategorii'}
                  </span>
                </td>
                <td>
                  <div className="fw-bold text-success">
                    {parseFloat(product.price || 0).toFixed(2)} zł
                  </div>
                </td>
                <td>
                  <div className="fw-bold text-info">
                    {parseFloat(product.purchase_price || 0).toFixed(2)} zł
                  </div>
                  {product.price > 0 && product.purchase_price > 0 && (
                    <div className="small text-muted">
                      Marża: {(((product.price - product.purchase_price) / product.purchase_price) * 100).toFixed(0)}%
                    </div>
                  )}
                </td>
                <td>
                  {editingStock[product.id] ? (
                    <div className="input-group input-group-sm">
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={tempValues[product.id] || 0}
                        onChange={(e) => setTempValues(prev => ({ ...prev, [product.id]: e.target.value }))}
                        step="0.1"
                        min="0"
                        style={{ width: '60px' }}
                      />
                      <div className="btn-group">
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleStockSave(product.id)}
                          disabled={loading}
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleStockCancel(product.id)}
                          disabled={loading}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="fw-bold text-primary cursor-pointer"
                      onClick={() => handleStockEdit(product.id, product.stock_quantity)}
                      style={{ cursor: 'pointer' }}
                    >
                      {parseFloat(product.stock_quantity || 0).toFixed(1)}
                    </div>
                  )}
                </td>
                <td>
                  <span className="text-muted small">
                    {parseFloat(product.min_stock_level || 5).toFixed(0)}
                  </span>
                </td>
                <td>
                  <span className="text-muted">
                    {product.unit || 'szt.'}
                  </span>
                </td>
                <td>
                  {getStatusBadge(product)}
                </td>
                <td>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleEditProduct(product)}
                    disabled={loading}
                  >
                    <i className="fas fa-edit me-1"></i>
                    Zmień
                  </button>
                </td>
              </tr>
              
              {/* Inline edycja produktu */}
              {editingProduct && editingProduct.id === product.id && (
                <tr>
                  <td colSpan="10" className="p-0">
                    <div className="bg-light border-top">
                      <InlineProductEdit
                        product={editingProduct}
                        onSave={handleSaveProductEdit}
                        onCancel={handleCancelEdit}
                      />
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTable;
