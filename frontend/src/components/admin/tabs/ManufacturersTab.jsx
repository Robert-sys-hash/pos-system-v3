import React from 'react';

const ManufacturersTab = ({ 
  manufacturers,
  editingManufacturer,
  setEditingManufacturer,
  newManufacturer,
  setNewManufacturer,
  updateManufacturer,
  cancelEditManufacturer,
  startEditManufacturer,
  deleteManufacturer,
  addManufacturer
}) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
      <div>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          overflow: 'hidden'
        }}>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '1rem',
            borderBottom: '1px solid #e9ecef',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1.25rem' }}>🏭</span>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
              Lista Producentów
            </h3>
          </div>

          <div style={{ padding: '1rem' }}>
            {manufacturers.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6c757d', margin: 0 }}>
                Brak producentów w systemie
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {manufacturers.map((manufacturer) => (
                  <div
                    key={manufacturer.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem',
                      backgroundColor: manufacturer.aktywny ? '#f8f9fa' : '#fff3cd',
                      border: '1px solid #e9ecef',
                      borderRadius: '0.375rem'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      {editingManufacturer && editingManufacturer.id === manufacturer.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <input
                            type="text"
                            value={editingManufacturer?.nazwa || ''}
                            onChange={(e) => setEditingManufacturer({
                              ...editingManufacturer,
                              nazwa: e.target.value
                            })}
                            style={{
                              padding: '0.375rem',
                              border: '1px solid #ced4da',
                              borderRadius: '0.25rem',
                              fontSize: '0.875rem'
                            }}
                            placeholder="Nazwa producenta"
                          />
                          <textarea
                            value={editingManufacturer?.opis || ''}
                            onChange={(e) => setEditingManufacturer({
                              ...editingManufacturer,
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
                            placeholder="Opis (opcjonalny)"
                          />
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                            <input
                              type="checkbox"
                              checked={editingManufacturer?.aktywny || false}
                              onChange={(e) => setEditingManufacturer({
                                ...editingManufacturer,
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
                            color: manufacturer.aktywny ? '#495057' : '#856404'
                          }}>
                            {manufacturer.nazwa}
                            {!manufacturer.aktywny && (
                              <span style={{ 
                                marginLeft: '0.5rem',
                                fontSize: '0.75rem',
                                color: '#856404',
                                fontWeight: '400'
                              }}>
                                (nieaktywny)
                              </span>
                            )}
                          </div>
                          {manufacturer.opis && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: '#6c757d',
                              marginTop: '0.25rem'
                            }}>
                              {manufacturer.opis}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {editingManufacturer && editingManufacturer.id === manufacturer.id ? (
                        <>
                          <button
                            onClick={updateManufacturer}
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
                            onClick={cancelEditManufacturer}
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
                            onClick={() => startEditManufacturer(manufacturer)}
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
                            onClick={() => deleteManufacturer(manufacturer.id)}
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
          overflow: 'hidden'
        }}>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '1rem',
            borderBottom: '1px solid #e9ecef',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1.25rem' }}>➕</span>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
              Nowy Producent
            </h3>
          </div>

          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontSize: '0.875rem', 
                  fontWeight: '500' 
                }}>
                  Nazwa producenta *
                </label>
                <input
                  type="text"
                  value={newManufacturer.nazwa}
                  onChange={(e) => setNewManufacturer({
                    ...newManufacturer,
                    nazwa: e.target.value
                  })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem'
                  }}
                  placeholder="np. ALLNUTRITION"
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontSize: '0.875rem', 
                  fontWeight: '500' 
                }}>
                  Opis (opcjonalny)
                </label>
                <textarea
                  value={newManufacturer?.opis || ''}
                  onChange={(e) => setNewManufacturer({
                    ...newManufacturer,
                    opis: e.target.value
                  })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    resize: 'vertical',
                    minHeight: '80px'
                  }}
                  placeholder="Krótki opis producenta..."
                />
              </div>

              <div>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  <input
                    type="checkbox"
                    checked={newManufacturer.aktywny}
                    onChange={(e) => setNewManufacturer({
                      ...newManufacturer,
                      aktywny: e.target.checked
                    })}
                  />
                  Aktywny
                </label>
              </div>

              <button
                onClick={() => {
                  console.log('🔧 Button clicked - addManufacturer');
                  addManufacturer();
                }}
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
                Dodaj Producenta
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManufacturersTab;
