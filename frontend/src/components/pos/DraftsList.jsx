import React, { useState, useEffect } from 'react';
import { transactionService } from '../../services/transactionService';

const DraftsList = ({ onDraftSelect, onLoadDraft }) => {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Pobierz szkice z bazy danych (backend)
      const response = await transactionService.getDrafts();
      
      if (response.success) {
        const dbDrafts = (response.data || []).map(draft => ({
          id: draft.id,
          receipt_number: draft.numer_paragonu,
          customer_name: draft.customer_name,
          total: draft.kwota_brutto || 0,
          created_at: draft.utworzono,
          itemsCount: draft.items_count || 0,
          source: 'database'
        }));
        
        // Dodaj szkice z localStorage jako backup
        const localDrafts = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('draft_')) {
            try {
              const draftData = JSON.parse(localStorage.getItem(key));
              const draftId = key.replace('draft_', '');
              
              localDrafts.push({
                id: draftId,
                key: key,
                customer: draftData.customer,
                customer_name: draftData.customer?.name || 'Klient niezarejestrowany',
                items: draftData.items || [],
                total: draftData.total || 0,
                created_at: draftData.created_at,
                itemsCount: (draftData.items || []).reduce((sum, item) => sum + item.quantity, 0),
                source: 'localStorage'
              });
            } catch (err) {
              console.error('Błąd parsowania szkicu localStorage:', key, err);
            }
          }
        }
        
        // Połącz szkice z bazy danych i localStorage
        const allDrafts = [...dbDrafts, ...localDrafts];
        
        // Sortuj według daty utworzenia (najnowsze najpierw)
        allDrafts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        setDrafts(allDrafts);
      } else {
        setError(response.error || 'Błąd pobierania szkiców');
      }
    } catch (err) {
      console.error('Błąd ładowania szkiców:', err);
      setError('Błąd połączenia: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDraft = async (draft) => {
    if (window.confirm('Czy na pewno chcesz usunąć ten szkic?')) {
      try {
        if (draft.source === 'localStorage') {
          // Usuń szkic z localStorage
          localStorage.removeItem(draft.key);
        } else {
          // Usuń szkic z bazy danych
          const response = await transactionService.deleteTransaction(draft.id);
          if (!response.success) {
            throw new Error(response.error || 'Błąd usuwania szkicu z bazy danych');
          }
        }
        
        // Odśwież listę szkiców
        await loadDrafts();
      } catch (err) {
        console.error('Błąd usuwania szkicu:', err);
        alert('Błąd usuwania szkicu: ' + err.message);
      }
    }
  };

  const handleLoadDraftToPOS = async (draft) => {
    if (onLoadDraft) {
      try {
        if (draft.source === 'localStorage') {
          // Załaduj szkic z localStorage
          onLoadDraft(draft);
        } else {
          // Pobierz szczegóły szkicu z bazy danych
          const response = await transactionService.getTransaction(draft.id);
          if (response.success) {
            // Przekształć dane z bazy do formatu zgodnego z POS
            const transformedItems = (response.data.items || []).map(item => ({
              id: item.produkt_id,
              name: item.nazwa_produktu || item.product_name,
              price: parseFloat(item.cena_jednostkowa) || 0,
              quantity: parseInt(item.ilosc) || 1,
              vat: parseFloat(item.stawka_vat) || 23,
              kod_kreskowy: item.kod_produktu || item.barcode,
              jednostka: item.jednostka || item.unit,
              cena_zakupu: parseFloat(item.cena_zakupu) || 0
            }));
            
            const draftData = {
              id: draft.id,
              customer: response.data.customer,
              items: transformedItems,
              total: response.data.suma_brutto || response.data.total_amount || 0,
              created_at: response.data.created_at,
              source: 'database'
            };
            onLoadDraft(draftData);
          } else {
            throw new Error(response.error || 'Błąd pobierania szkicu');
          }
        }
      } catch (err) {
        console.error('Błąd ładowania szkicu:', err);
        alert('Błąd ładowania szkicu: ' + err.message);
      }
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pl-PL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Nieprawidłowa data';
    }
  };

  if (loading) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        textAlign: 'center',
        border: '1px solid #e9ecef'
      }}>
        <div style={{ color: '#6c757d' }}>Ładowanie szkiców...</div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e9ecef',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '1rem 1.5rem',
        borderBottom: '1px solid #e9ecef',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h4 style={{ 
          margin: 0, 
          fontSize: '1.1rem', 
          fontWeight: '600',
          color: '#495057',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <i className="fas fa-drafting-compass" style={{ color: '#6f42c1' }}></i>
          Szkice ({drafts.length})
        </h4>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={loadDrafts}
            disabled={loading}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.75rem',
              border: '1px solid #0d6efd',
              borderRadius: '4px',
              backgroundColor: 'white',
              color: '#0d6efd',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              opacity: loading ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = '#0d6efd';
                e.target.style.color = 'white';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = 'white';
                e.target.style.color = '#0d6efd';
              }
            }}
            title="Odśwież listę szkiców"
          >
            <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'} me-1`}></i>
            Odśwież
          </button>
          
          {drafts.length > 0 && (
            <button
              onClick={async () => {
                if (window.confirm('Czy na pewno chcesz usunąć wszystkie szkice?')) {
                  try {
                    setLoading(true);
                    
                    // Usuń wszystkie szkice
                    for (const draft of drafts) {
                      if (draft.source === 'localStorage') {
                        localStorage.removeItem(draft.key);
                      } else {
                        await transactionService.deleteTransaction(draft.id);
                      }
                    }
                    
                    // Odśwież listę
                    await loadDrafts();
                  } catch (err) {
                    console.error('Błąd usuwania szkiców:', err);
                    alert('Błąd usuwania szkiców: ' + err.message);
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.75rem',
                border: '1px solid #dc3545',
                borderRadius: '4px',
                backgroundColor: 'white',
                color: '#dc3545',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              <i className="fas fa-trash me-1"></i>
              Usuń wszystkie
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '1rem' }}>
        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            border: '1px solid #f5c6cb',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <i className="fas fa-exclamation-triangle"></i>
            {error}
            <button
              onClick={() => setError('')}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: '#721c24',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
        
        {drafts.length === 0 && !error ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            color: '#6c757d'
          }}>
            <i className="fas fa-drafting-compass" style={{ 
              fontSize: '3rem', 
              marginBottom: '1rem', 
              opacity: 0.3 
            }}></i>
            <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: '500' }}>
              Brak zapisanych szkiców
            </h5>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem' }}>
              Szkice zostają zapisane automatycznie gdy klikniesz "Zapisz szkic" w sekcji POS
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {drafts.map((draft) => (
              <div
                key={draft.id}
                style={{
                  border: '1px solid #e9ecef',
                  borderRadius: '6px',
                  padding: '1rem',
                  backgroundColor: '#fafafa',
                  transition: 'all 0.15s ease-in-out',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f1f3f4';
                  e.target.style.borderColor = '#6f42c1';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#fafafa';
                  e.target.style.borderColor = '#e9ecef';
                }}
                onClick={() => onDraftSelect && onDraftSelect(draft)}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '0.75rem'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.25rem'
                    }}>
                      <span style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#495057'
                      }}>
                        Szkic #{draft.id.toString().substring(0, 8)}
                      </span>
                      {(draft.customer_name || (draft.customer && draft.customer.name)) && (
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '0.125rem 0.5rem',
                          backgroundColor: '#e3f2fd',
                          color: '#1565c0',
                          borderRadius: '12px',
                          fontWeight: '500'
                        }}>
                          {draft.customer_name || draft.customer.name}
                        </span>
                      )}
                      {draft.source && (
                        <span style={{
                          fontSize: '0.6rem',
                          padding: '0.125rem 0.4rem',
                          backgroundColor: draft.source === 'database' ? '#d4edda' : '#fff3cd',
                          color: draft.source === 'database' ? '#155724' : '#856404',
                          borderRadius: '8px',
                          fontWeight: '500'
                        }}>
                          {draft.source === 'database' ? 'Baza' : 'Local'}
                        </span>
                      )}
                    </div>
                    
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6c757d',
                      marginBottom: '0.5rem'
                    }}>
                      {formatDate(draft.created_at)}
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: '1rem',
                      fontSize: '0.8rem'
                    }}>
                      <span style={{ color: '#495057' }}>
                        <i className="fas fa-shopping-basket me-1" style={{ color: '#6c757d' }}></i>
                        {draft.itemsCount} {draft.itemsCount === 1 ? 'produkt' : 'produktów'}
                      </span>
                      <span style={{ 
                        fontWeight: '600', 
                        color: '#198754' 
                      }}>
                        <i className="fas fa-coins me-1" style={{ color: '#6c757d' }}></i>
                        {draft.total.toFixed(2)} zł
                      </span>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginLeft: '1rem'
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadDraftToPOS(draft);
                      }}
                      style={{
                        padding: '0.375rem 0.75rem',
                        fontSize: '0.75rem',
                        border: '1px solid #198754',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        color: '#198754',
                        cursor: 'pointer',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#198754';
                        e.target.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'white';
                        e.target.style.color = '#198754';
                      }}
                      title="Załaduj szkic do POS"
                    >
                      <i className="fas fa-upload"></i>
                      Załaduj
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDraft(draft);
                      }}
                      style={{
                        padding: '0.375rem',
                        fontSize: '0.75rem',
                        border: '1px solid #dc3545',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        color: '#dc3545',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#dc3545';
                        e.target.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'white';
                        e.target.style.color = '#dc3545';
                      }}
                      title="Usuń szkic"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>

                {/* Podgląd produktów */}
                {draft.items && draft.items.length > 0 && (
                  <div style={{
                    borderTop: '1px solid #e9ecef',
                    paddingTop: '0.5rem',
                    marginTop: '0.5rem'
                  }}>
                    <div style={{
                      fontSize: '0.7rem',
                      color: '#6c757d',
                      marginBottom: '0.25rem'
                    }}>
                      Produkty:
                    </div>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.25rem'
                    }}>
                      {draft.items.slice(0, 3).map((item, index) => (
                        <span
                          key={index}
                          style={{
                            fontSize: '0.65rem',
                            padding: '0.125rem 0.375rem',
                            backgroundColor: '#e9ecef',
                            color: '#495057',
                            borderRadius: '8px'
                          }}
                        >
                          {item.name} ({item.quantity})
                        </span>
                      ))}
                      {draft.items.length > 3 && (
                        <span style={{
                          fontSize: '0.65rem',
                          color: '#6c757d'
                        }}>
                          +{draft.items.length - 3} więcej...
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DraftsList;
