import React, { useState, useEffect } from 'react';

const SimpleLocationPricingPage = () => {
  const [selectedLocation, setSelectedLocation] = useState({ id: 1, nazwa: "Test Location" });
  const [allProducts, setAllProducts] = useState([
    {
      id: 1,
      nazwa: "Test Product 1",
      kod_produktu: "TEST001",
      cena_sprzedazy_brutto: 10.00,
      cena_sprzedazy_netto: 8.13,
      hasSpecialPrice: false,
      defaultMargin: { percent: 23, amount: 1.87 }
    }
  ]);

  const getFilteredProducts = () => allProducts;

  const renderProductRow = (product) => (
    <tr key={product.id}>
      <td>{product.nazwa}</td>
      <td>{product.kod_produktu}</td>
      <td>{product.cena_sprzedazy_brutto} zł</td>
    </tr>
  );

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          {selectedLocation ? (
            <div className="card">
              <div className="card-header">
                <h6>Magazyn: {selectedLocation.nazwa}</h6>
              </div>
              <div className="card-body">
                {getFilteredProducts().length === 0 ? (
                  <div className="text-center py-5">
                    <h5>Brak produktów</h5>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Produkt</th>
                          <th>Kod</th>
                          <th>Cena</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredProducts().map((product) => renderProductRow(product))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body text-center py-5">
                <h5>Wybierz lokalizację</h5>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleLocationPricingPage;
