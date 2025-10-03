// Test JSX syntax
import React from 'react';
import { FaEdit, FaHistory, FaTrash, FaTag } from 'react-icons/fa';

const TestComponent = () => {
  const product = {
    id: 1,
    nazwa: "Test Product",
    ean: "123456789",
    stawka_vat: 23,
    kod_produktu: "TEST001",
    cena_sprzedazy_brutto: 10.00,
    cena_sprzedazy_netto: 8.13,
    hasSpecialPrice: false,
    defaultMargin: { percent: 23, amount: 1.87 }
  };

  const selectedProducts = new Set();
  const handleSelectProduct = () => {};
  const handleEditProductPrice = () => {};
  const handleShowProductHistory = () => {};
  const handleDeleteProductPrice = () => {};

  const renderProductRow = (product) => (
    <tr key={product.id} className={selectedProducts.has(product.id) ? 'table-primary' : ''}>
      <td>
        <input
          type="checkbox"
          className="form-check-input"
          checked={selectedProducts.has(product.id)}
          onChange={() => handleSelectProduct(product.id)}
        />
      </td>
      <td>
        <div>
          <div className="fw-bold">{product.nazwa}</div>
          <small className="text-muted">
            EAN: {product.ean || 'Brak'} | VAT: {product.stawka_vat || 23}%
          </small>
        </div>
      </td>
      <td>
        <code>{product.kod_produktu}</code>
      </td>
      <td>
        <div>
          <span className="fw-bold">{product.cena_sprzedazy_brutto?.toFixed(2) || '0.00'} zł</span>
          <br />
          <small className="text-muted">netto: {product.cena_sprzedazy_netto?.toFixed(2) || '0.00'} zł</small>
        </div>
      </td>
    </tr>
  );

  return (
    <table>
      <tbody>
        {[product].map((product) => renderProductRow(product))}
      </tbody>
    </table>
  );
};

export default TestComponent;
