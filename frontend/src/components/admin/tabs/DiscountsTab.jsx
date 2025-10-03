import React, { useState } from 'react';

const DiscountsTab = ({
  discounts,
  newDiscount,
  setNewDiscount,
  editingDiscount,
  setEditingDiscount,
  addDiscount,
  updateDiscount,
  deleteDiscount,
  startEditDiscount,
  cancelEditDiscount,
  discountFilter,
  setDiscountFilter
}) => {
  const filteredDiscounts = discounts?.filter(discount => {
    if (discountFilter === 'active') return discount.aktywny;
    if (discountFilter === 'inactive') return !discount.aktywny;
    return true;
  }) || [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
      <div>
        {/* Filtry */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Filtruj:</span>
            <button
              onClick={() => setDiscountFilter('all')}
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                backgroundColor: discountFilter === 'all' ? '#007bff' : '#f8f9fa',
                color: discountFilter === 'all' ? 'white' : '#495057',
                border: '1px solid #dee2e6',
                borderRadius: '0.25rem',
                cursor: 'pointer'
              }}
            >
              Wszystkie
            </button>
            <button
              onClick={() => setDiscountFilter('active')}
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                backgroundColor: discountFilter === 'active' ? '#28a745' : '#f8f9fa',
                color: discountFilter === 'active' ? 'white' : '#495057',
                border: '1px solid #dee2e6',
                borderRadius: '0.25rem',
                cursor: 'pointer'
              }}
            >
              Aktywne
            </button>
            <button
              onClick={() => setDiscountFilter('inactive')}
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                backgroundColor: discountFilter === 'inactive' ? '#dc3545' : '#f8f9fa',
                color: discountFilter === 'inactive' ? 'white' : '#495057',
                border: '1px solid #dee2e6',
                borderRadius: '0.25rem',
                cursor: 'pointer'
              }}
            >
              Nieaktywne
            </button>
          </div>
        </div>

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
              🎯 Lista rabatów ({filteredDiscounts.length})
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            {filteredDiscounts.length === 0 ? (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#6c757d',
                fontStyle: 'italic'
              }}>
                {discountFilter === 'all' ? 'Brak rabatów w systemie' : 
                 discountFilter === 'active' ? 'Brak aktywnych rabatów' :
                 'Brak nieaktywnych rabatów'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredDiscounts.map(discount => (
                  <div
                    key={discount.id}
                    style={{
                      padding: '1rem',
                      border: '1px solid #e9ecef',
                      borderRadius: '0.375rem',
                      backgroundColor: discount.aktywny ? '#fff' : '#f8f9fa'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        {editingDiscount && editingDiscount.id === discount.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <input
                              type="text"
                              value={editingDiscount?.nazwa || ''}
                              onChange={(e) => setEditingDiscount({
                                ...editingDiscount,
                                nazwa: e.target.value
                              })}
                              style={{
                                padding: '0.375rem',
                                border: '1px solid #ced4da',
                                borderRadius: '0.25rem',
                                fontSize: '0.875rem'
                              }}
                              placeholder="Nazwa rabatu"
                            />
                            <textarea
                              value={editingDiscount?.opis || ''}
                              onChange={(e) => setEditingDiscount({
                                ...editingDiscount,
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
                              placeholder="Opis rabatu"
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                              <select
                                value={editingDiscount?.typ_rabatu || 'procentowy'}
                                onChange={(e) => setEditingDiscount({
                                  ...editingDiscount,
                                  typ_rabatu: e.target.value
                                })}
                                style={{
                                  padding: '0.375rem',
                                  border: '1px solid #ced4da',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.875rem'
                                }}
                              >
                                <option value="procentowy">Procentowy</option>
                                <option value="kwotowy">Kwotowy</option>
                              </select>
                              <input
                                type="number"
                                value={editingDiscount?.wartosc || 0}
                                onChange={(e) => setEditingDiscount({
                                  ...editingDiscount,
                                  wartosc: parseFloat(e.target.value) || 0
                                })}
                                style={{
                                  padding: '0.375rem',
                                  border: '1px solid #ced4da',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.875rem'
                                }}
                                placeholder="Wartość"
                              />
                              <input
                                type="number"
                                value={editingDiscount?.minimum_koszyka || 0}
                                onChange={(e) => setEditingDiscount({
                                  ...editingDiscount,
                                  minimum_koszyka: parseFloat(e.target.value) || 0
                                })}
                                style={{
                                  padding: '0.375rem',
                                  border: '1px solid #ced4da',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.875rem'
                                }}
                                placeholder="Min. koszyk"
                              />
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                              <input
                                type="checkbox"
                                checked={editingDiscount?.aktywny || false}
                                onChange={(e) => setEditingDiscount({
                                  ...editingDiscount,
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
                              color: discount.aktywny ? '#495057' : '#6c757d',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              {discount.nazwa}
                              <span style={{
                                fontSize: '0.75rem',
                                padding: '0.125rem 0.375rem',
                                borderRadius: '0.25rem',
                                backgroundColor: discount.aktywny ? '#28a745' : '#6c757d',
                                color: 'white'
                              }}>
                                {discount.aktywny ? 'AKTYWNY' : 'NIEAKTYWNY'}
                              </span>
                              <span style={{
                                fontSize: '0.75rem',
                                padding: '0.125rem 0.375rem',
                                borderRadius: '0.25rem',
                                backgroundColor: discount.typ_rabatu === 'procentowy' ? '#007bff' : '#ffc107',
                                color: discount.typ_rabatu === 'procentowy' ? 'white' : '#000'
                              }}>
                                {discount.typ_rabatu === 'procentowy' ? `${discount.wartosc}%` : `${discount.wartosc} zł`}
                              </span>
                            </div>
                            {discount.opis && (
                              <div style={{ 
                                fontSize: '0.75rem', 
                                color: '#6c757d',
                                marginTop: '0.25rem'
                              }}>
                                {discount.opis}
                              </div>
                            )}
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: '#6c757d',
                              marginTop: '0.25rem'
                            }}>
                              Min. koszyk: {discount.minimum_koszyka} zł | ID: {discount.id}
                            </div>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                        {editingDiscount && editingDiscount.id === discount.id ? (
                          <>
                            <button
                              onClick={updateDiscount}
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
                              onClick={cancelEditDiscount}
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
                              onClick={() => startEditDiscount(discount)}
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
                              onClick={() => deleteDiscount(discount.id)}
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
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
          marginBottom: '1rem'
        }}>
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa'
          }}>
            <h6 style={{ margin: 0, fontWeight: '600', color: '#495057' }}>
              ➕ Dodaj rabat
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
                  Nazwa rabatu
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
                  placeholder="Nazwa rabatu"
                  value={newDiscount?.nazwa || ''}
                  onChange={(e) => setNewDiscount({
                    ...newDiscount,
                    nazwa: e.target.value
                  })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
                  Opis
                </label>
                <textarea
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    outline: 'none',
                    resize: 'vertical',
                    minHeight: '60px'
                  }}
                  placeholder="Opis rabatu (opcjonalny)"
                  value={newDiscount?.opis || ''}
                  onChange={(e) => setNewDiscount({
                    ...newDiscount,
                    opis: e.target.value
                  })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
                  Typ rabatu
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
                  value={newDiscount?.typ_rabatu || 'procentowy'}
                  onChange={(e) => setNewDiscount({
                    ...newDiscount,
                    typ_rabatu: e.target.value
                  })}
                >
                  <option value="procentowy">Procentowy</option>
                  <option value="kwotowy">Kwotowy</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
                  Wartość rabatu
                </label>
                <input
                  type="number"
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    outline: 'none'
                  }}
                  placeholder={newDiscount?.typ_rabatu === 'procentowy' ? 'Procent (np. 10)' : 'Kwota (np. 5.00)'}
                  value={newDiscount?.wartosc || ''}
                  onChange={(e) => setNewDiscount({
                    ...newDiscount,
                    wartosc: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
                  Minimum koszyka (zł)
                </label>
                <input
                  type="number"
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    outline: 'none'
                  }}
                  placeholder="0.00"
                  value={newDiscount?.minimum_koszyka || ''}
                  onChange={(e) => setNewDiscount({
                    ...newDiscount,
                    minimum_koszyka: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <input
                  type="checkbox"
                  checked={newDiscount?.aktywny || false}
                  onChange={(e) => setNewDiscount({
                    ...newDiscount,
                    aktywny: e.target.checked
                  })}
                />
                Aktywny
              </label>
              <button
                onClick={addDiscount}
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
                Dodaj rabat
              </button>
            </div>
          </div>
        </div>

        {/* Statystyki */}
        <div style={{
          backgroundColor: '#28a745',
          color: 'white',
          borderRadius: '0.375rem',
          padding: '1rem',
          textAlign: 'center',
          marginBottom: '1rem'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            🎯 {discounts?.length || 0}
          </div>
          <div>Łączna liczba rabatów</div>
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
              Zarządzaj rabatami systemowymi. Możesz tworzyć rabaty procentowe i kwotowe,
              ustawiać minimum koszyka oraz ograniczenia czasowe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscountsTab;
