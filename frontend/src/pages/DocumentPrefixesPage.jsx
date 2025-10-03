import React, { useState, useEffect } from 'react';
import './DocumentPrefixesPage.css';

const DocumentPrefixesPage = () => {
    const [prefixes, setPrefixes] = useState([]);
    const [locations, setLocations] = useState([]);
    const [documentTypes, setDocumentTypes] = useState([]);
    const [locationsWithoutPrefixes, setLocationsWithoutPrefixes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editingPrefix, setEditingPrefix] = useState(null);
    const [selectedLocationFilter, setSelectedLocationFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [newPrefix, setNewPrefix] = useState({
        location_id: '',
        document_type: '',
        prefix: '',
        format_pattern: '{prefix}/{numer}/{rok}',
        description: '',
        reset_period: 'yearly',
        active: true
    });
    
    // State dla powiadomień
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        fetchData();
    }, []);

    // Reset strony przy zmianie filtra
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedLocationFilter]);

    const fetchData = async () => {
        try {
            setLoading(true);
            console.log('🚀 Rozpoczynanie pobierania danych...');
            
            // Pobierz prefiksy
            console.log('📡 Pobieranie prefiksów...');
            const prefixesResponse = await fetch('http://localhost:5002/api/document-prefixes');
            console.log('📡 Response status:', prefixesResponse.status, prefixesResponse.statusText);
            
            if (!prefixesResponse.ok) {
                throw new Error(`HTTP error! status: ${prefixesResponse.status}`);
            }
            
            const prefixesData = await prefixesResponse.json();
            console.log('📊 Odpowiedź prefiksów:', prefixesData);
            console.log('📊 Typ danych prefiksów:', typeof prefixesData, Array.isArray(prefixesData));
            
            // API zwraca {data: [...]} lub bezpośrednio tablicę
            const prefixesArray = prefixesData.data || prefixesData;
            
            // Pobierz lokalizacje
            const locationsResponse = await fetch('http://localhost:5002/api/locations/');
            if (!locationsResponse.ok) {
                console.warn('⚠️ Błąd pobierania lokalizacji:', locationsResponse.status);
            }
            const locationsData = locationsResponse.ok ? await locationsResponse.json() : {data: []};
            const locationsArray = locationsData.data || locationsData;
            
            // Pobierz typy dokumentów
            const typesResponse = await fetch('http://localhost:5002/api/document-types');
            if (!typesResponse.ok) {
                console.warn('⚠️ Błąd pobierania typów dokumentów:', typesResponse.status);
            }
            const typesData = typesResponse.ok ? await typesResponse.json() : {data: []};
            const typesArray = typesData.data || typesData;
            
            // Pobierz lokalizacje bez prefiksów
            const withoutPrefixesResponse = await fetch('http://localhost:5002/api/locations-without-prefixes');
            if (!withoutPrefixesResponse.ok) {
                console.warn('⚠️ Błąd pobierania lokalizacji bez prefiksów:', withoutPrefixesResponse.status);
            }
            const withoutPrefixesData = withoutPrefixesResponse.ok ? await withoutPrefixesResponse.json() : {data: []};
            const withoutPrefixesArray = withoutPrefixesData.data || withoutPrefixesData;
            
            // Ustaw stan - upewnij się, że prefiksy to tablica
            setPrefixes(Array.isArray(prefixesArray) ? prefixesArray : []);
            setLocations(Array.isArray(locationsArray) ? locationsArray : []);
            setDocumentTypes(Array.isArray(typesArray) ? typesArray : []);
            setLocationsWithoutPrefixes(Array.isArray(withoutPrefixesArray) ? withoutPrefixesArray : []);
        } catch (error) {
            console.error('💥 Błąd podczas pobierania danych:', error);
            setMessage({ text: `Błąd podczas pobierania danych: ${error.message}`, type: 'error' });
            // Ustaw puste tablice w przypadku błędu
            setPrefixes([]);
            setLocations([]);
            setDocumentTypes([]);
            setLocationsWithoutPrefixes([]);
        } finally {
            setLoading(false);
        }
    };

    const openEditDialog = (prefix) => {
        console.log('🔧 OTWIERANIE MODAL EDYCJI:', prefix);
        setEditingPrefix(prefix);
        setEditDialogOpen(true);
        console.log('✅ Modal dialog open ustawiony na:', true);
    };

    const closeEditDialog = () => {
        console.log('🔒 ZAMYKANIE MODAL EDYCJI');
        setEditDialogOpen(false);
        setEditingPrefix(null);
    };

    const openCreateDialog = () => {
        console.log('🆕 OTWIERANIE MODAL TWORZENIA');
        setCreateDialogOpen(true);
    };

    const closeCreateDialog = () => {
        console.log('🔒 ZAMYKANIE MODAL TWORZENIA');
        setCreateDialogOpen(false);
        setNewPrefix({
            location_id: '',
            document_type: '',
            prefix: '',
            format_pattern: '{prefix}/{numer}/{rok}',
            description: '',
            reset_period: 'yearly',
            active: true
        });
    };

    const createDefaultPrefixesForLocation = async (locationId) => {
        try {
            const response = await fetch(`http://localhost:5002/api/create-default-prefixes/${locationId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (response.ok) {
                setMessage({ text: 'Domyślne prefiksy zostały utworzone', type: 'success' });
                fetchData(); // Odśwież dane
            } else {
                setMessage({ text: 'Błąd podczas tworzenia prefiksów', type: 'error' });
            }
        } catch (error) {
            console.error('Błąd:', error);
            setMessage({ text: 'Błąd podczas tworzenia prefiksów', type: 'error' });
        }
    };

    // Testowa funkcja dla modal
    const saveEditedPrefix = async () => {
        try {
            const response = await fetch(`http://localhost:5002/api/document-prefixes/${editingPrefix.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prefix: editingPrefix.prefix,
                    format_pattern: editingPrefix.format_pattern,
                    description: editingPrefix.description,
                    active: editingPrefix.active
                })
            });
            
            if (response.ok) {
                setMessage({ text: 'Prefiks został zaktualizowany', type: 'success' });
                setEditDialogOpen(false);
                fetchData(); // Odśwież dane
            } else {
                setMessage({ text: 'Błąd podczas aktualizacji prefiksu', type: 'error' });
            }
        } catch (error) {
            console.error('Błąd:', error);
            setMessage({ text: 'Błąd podczas aktualizacji prefiksu', type: 'error' });
        }
    };

    const saveNewPrefix = async () => {
        try {
            const response = await fetch('http://localhost:5002/api/document-prefixes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newPrefix)
            });
            
            if (response.ok) {
                setMessage({ text: 'Nowy prefiks został utworzony', type: 'success' });
                setCreateDialogOpen(false);
                fetchData(); // Odśwież dane
            } else {
                setMessage({ text: 'Błąd podczas tworzenia prefiksu', type: 'error' });
            }
        } catch (error) {
            console.error('Błąd:', error);
            setMessage({ text: 'Błąd podczas tworzenia prefiksu', type: 'error' });
        }
    };

    const testModal = () => {
        console.log('🧪 TEST MODAL - kliknięto test button');
        setEditingPrefix({
            id: 999,
            prefix: 'TEST',
            format_pattern: 'TEST/{numer}',
            location_name: 'TEST Location'
        });
        setEditDialogOpen(true);
        console.log('🧪 TEST MODAL - dialog powinien być otwarty');
    };

    if (loading) {
        return <div className="loading">Ładowanie...</div>;
    }

    // Filtrowanie prefiksów po lokalizacji
    const filteredPrefixes = selectedLocationFilter 
        ? prefixes.filter(prefix => prefix.location_id == selectedLocationFilter)
        : prefixes;

    // Paginacja
    const totalPages = Math.ceil(filteredPrefixes.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedPrefixes = filteredPrefixes.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="document-prefixes-page">
            <h2>Zarządzanie Prefiksami Dokumentów</h2>
            
            {/* Wyświetlanie powiadomień */}
            {message.text && (
                <div className={`message ${message.type}`}>
                    {message.text}
                    <button onClick={() => setMessage({ text: '', type: '' })}>×</button>
                </div>
            )}

            {/* Testowy przycisk modal */}
            <div style={{marginBottom: '20px', padding: '10px', background: '#fff3cd', border: '1px solid #ffeaa7'}}>
                <h4>🧪 Debugowanie Modal</h4>
                <button 
                    style={{padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px'}}
                    onClick={testModal}
                >
                    🧪 TEST MODAL
                </button>
                <p>Stan modal: editDialogOpen = {editDialogOpen ? 'TRUE' : 'FALSE'}</p>
            </div>

            {/* Lokalizacje bez prefiksów */}
            {locationsWithoutPrefixes.length > 0 && (
                <div className="locations-without-prefixes">
                    <h3>Lokalizacje bez prefiksów</h3>
                    <div className="locations-grid">
                        {locationsWithoutPrefixes.map(location => (
                            <div key={location.id} className="location-card">
                                <h4>{location.nazwa || location.name}</h4>
                                <p>{location.adres || location.address}</p>
                                <button 
                                    onClick={() => createDefaultPrefixesForLocation(location.id)}
                                    className="btn-create-prefixes"
                                >
                                    Utwórz domyślne prefiksy
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Przycisk dodawania nowego prefiksu */}
            <div className="page-header">
                <button onClick={openCreateDialog} className="btn-primary">
                    Dodaj nowy prefiks
                </button>
            </div>

            {/* Filtrowanie */}
            <div style={{
                marginBottom: '20px', 
                padding: '15px', 
                background: '#f8f9fa', 
                border: '1px solid #dee2e6',
                borderRadius: '4px'
            }}>
                <h4 style={{marginTop: 0, marginBottom: '10px'}}>🔍 Filtrowanie</h4>
                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                    <label style={{fontWeight: 'bold'}}>Lokalizacja:</label>
                    <select 
                        value={selectedLocationFilter}
                        onChange={(e) => setSelectedLocationFilter(e.target.value)}
                        style={{
                            padding: '8px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            minWidth: '200px'
                        }}
                    >
                        <option value="">🏢 Wszystkie lokalizacje</option>
                        {locations.map(location => (
                            <option key={location.id} value={location.id}>
                                {location.nazwa || location.name}
                            </option>
                        ))}
                    </select>
                    {selectedLocationFilter && (
                        <button 
                            onClick={() => setSelectedLocationFilter('')}
                            style={{
                                padding: '6px 12px',
                                background: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            ✖ Wyczyść
                        </button>
                    )}
                    <span style={{color: '#666', fontSize: '14px'}}>
                        Wyników: {filteredPrefixes.length} / {prefixes.length}
                    </span>
                </div>
            </div>

            {/* Tabela prefiksów */}
            <div className="prefixes-table-container">
                <table className="prefixes-table">
                    <thead>
                        <tr>
                            <th>Lokalizacja</th>
                            <th>Typ dokumentu</th>
                            <th>Prefiks</th>
                            <th>Format</th>
                            <th>Ostatni numer</th>
                            <th>Status</th>
                            <th>Akcje</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.isArray(paginatedPrefixes) ? paginatedPrefixes.map(prefix => (
                            <tr key={prefix.id}>
                                <td>{prefix.location_name}</td>
                                <td>{prefix.document_type}</td>
                                <td>{prefix.prefix}</td>
                                <td>{prefix.format_pattern}</td>
                                <td>{prefix.last_number || 0}</td>
                                <td>
                                    <span className={prefix.active ? 'status-active' : 'status-inactive'}>
                                        {prefix.active ? 'Aktywny' : 'Nieaktywny'}
                                    </span>
                                </td>
                                <td>
                                    <button 
                                        onClick={(e) => {
                                            console.log('🔄 KLIK EDYTUJ - event:', e);
                                            console.log('🔄 KLIK EDYTUJ - prefix:', prefix);
                                            e.preventDefault();
                                            e.stopPropagation();
                                            openEditDialog(prefix);
                                        }}
                                        style={{
                                            padding: '8px 16px',
                                            background: '#007bff',
                                            color: 'white',
                                            border: '2px solid red',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            zIndex: 10,
                                            position: 'relative'
                                        }}
                                    >
                                        🔧 Edytuj
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="7" style={{textAlign: 'center', padding: '20px'}}>
                                    {prefixes ? 'Brak danych spełniających kryteria filtrowania' : 'Brak danych'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginacja */}
            {totalPages > 1 && (
                <div style={{
                    marginTop: '20px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <button 
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        style={{
                            padding: '8px 12px',
                            background: currentPage === 1 ? '#ccc' : '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        ◀ Poprzednia
                    </button>
                    
                    <span style={{padding: '0 10px', fontSize: '14px'}}>
                        Strona {currentPage} z {totalPages} 
                        ({filteredPrefixes.length} wyników)
                    </span>
                    
                    <button 
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                            padding: '8px 12px',
                            background: currentPage === totalPages ? '#ccc' : '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Następna ▶
                    </button>
                </div>
            )}

            {/* MODAL EDYCJI - UPROSZCZONY Z INLINE STYLES */}
            {console.log('🔍 RENDEROWANIE MODAL:', { editDialogOpen, editingPrefix })}
            {editDialogOpen && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 999999
                    }}
                    onClick={() => {
                        console.log('🔒 Zamykanie modal przez overlay');
                        setEditDialogOpen(false);
                    }}
                >
                    <div 
                        style={{
                            background: 'white',
                            borderRadius: '8px',
                            maxWidth: '600px',
                            width: '90%',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            zIndex: 9999999,
                            position: 'relative',
                            border: '5px solid red',
                            padding: '30px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                        }}
                        onClick={(e) => {
                            console.log('🛑 Zatrzymywanie propagacji w modal');
                            e.stopPropagation();
                        }}
                    >
                        <h2 style={{color: 'red', fontSize: '24px', marginBottom: '20px'}}>
                            🎯 MODAL EDYCJI PREFIKSU
                        </h2>
                        
                        {editingPrefix && (
                            <div>
                                <div style={{marginBottom: '15px'}}>
                                    <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                        Prefiks:
                                    </label>
                                    <input 
                                        type="text" 
                                        value={editingPrefix.prefix}
                                        onChange={(e) => setEditingPrefix({...editingPrefix, prefix: e.target.value})}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px'
                                        }}
                                    />
                                </div>
                                
                                <div style={{marginBottom: '15px'}}>
                                    <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                        Format:
                                    </label>
                                    <input 
                                        type="text" 
                                        value={editingPrefix.format_pattern}
                                        onChange={(e) => setEditingPrefix({...editingPrefix, format_pattern: e.target.value})}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px'
                                        }}
                                    />
                                </div>
                                
                                <div style={{marginBottom: '15px'}}>
                                    <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                        Opis:
                                    </label>
                                    <input 
                                        type="text" 
                                        value={editingPrefix.description || ''}
                                        onChange={(e) => setEditingPrefix({...editingPrefix, description: e.target.value})}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px'
                                        }}
                                    />
                                </div>
                                
                                <div style={{marginBottom: '15px'}}>
                                    <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                        Status:
                                    </label>
                                    <select 
                                        value={editingPrefix.active ? '1' : '0'}
                                        onChange={(e) => setEditingPrefix({...editingPrefix, active: e.target.value === '1'})}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px'
                                        }}
                                    >
                                        <option value="1">Aktywny</option>
                                        <option value="0">Nieaktywny</option>
                                    </select>
                                </div>
                                
                                <p style={{fontSize: '14px', color: '#666', marginBottom: '20px'}}>
                                    <strong>Lokalizacja:</strong> {editingPrefix.location_name} | 
                                    <strong> Typ:</strong> {editingPrefix.document_type}
                                </p>
                                
                                <div style={{marginTop: '30px', display: 'flex', gap: '10px'}}>
                                    <button 
                                        style={{
                                            padding: '12px 24px', 
                                            background: '#28a745', 
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '16px',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => {
                                            console.log('💾 Zapisywanie edycji...');
                                            saveEditedPrefix();
                                        }}
                                    >
                                        💾 Zapisz
                                    </button>
                                    
                                    <button 
                                        style={{
                                            padding: '12px 24px', 
                                            background: '#6c757d', 
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '16px',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => {
                                            console.log('❌ Anulowanie...');
                                            closeEditDialog();
                                        }}
                                    >
                                        ❌ Anuluj
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal tworzenia nowego prefiksu */}
            {createDialogOpen && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 999999
                    }}
                    onClick={closeCreateDialog}
                >
                    <div 
                        style={{
                            background: 'white',
                            borderRadius: '8px',
                            maxWidth: '600px',
                            width: '90%',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            zIndex: 9999999,
                            position: 'relative',
                            border: '2px solid #007bff',
                            padding: '30px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{color: '#007bff', fontSize: '20px', marginBottom: '20px'}}>
                            ➕ Dodaj nowy prefiks
                        </h3>
                        <div>
                            <div style={{marginBottom: '15px'}}>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                    Lokalizacja:
                                </label>
                                <select 
                                    value={newPrefix.location_id} 
                                    onChange={(e) => setNewPrefix({...newPrefix, location_id: e.target.value})}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px'
                                    }}
                                >
                                    <option value="">Wybierz lokalizację</option>
                                    {locations.map(location => (
                                        <option key={location.id} value={location.id}>
                                            {location.nazwa || location.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div style={{marginBottom: '15px'}}>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                    Typ dokumentu:
                                </label>
                                <select 
                                    value={newPrefix.document_type} 
                                    onChange={(e) => setNewPrefix({...newPrefix, document_type: e.target.value})}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px'
                                    }}
                                >
                                    <option value="">Wybierz typ dokumentu</option>
                                    {documentTypes.map(type => (
                                        <option key={type.type || type.code} value={type.type || type.code}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div style={{marginBottom: '15px'}}>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                    Prefiks:
                                </label>
                                <input 
                                    type="text" 
                                    value={newPrefix.prefix}
                                    onChange={(e) => setNewPrefix({...newPrefix, prefix: e.target.value})}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px'
                                    }}
                                />
                            </div>
                            
                            <div style={{marginBottom: '15px'}}>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                    Format:
                                </label>
                                <input 
                                    type="text" 
                                    value={newPrefix.format_pattern}
                                    onChange={(e) => setNewPrefix({...newPrefix, format_pattern: e.target.value})}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px'
                                    }}
                                />
                            </div>
                            
                            <div style={{marginBottom: '20px'}}>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                    Opis:
                                </label>
                                <input 
                                    type="text" 
                                    value={newPrefix.description}
                                    onChange={(e) => setNewPrefix({...newPrefix, description: e.target.value})}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px'
                                    }}
                                />
                            </div>
                            
                            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                                <button 
                                    style={{
                                        padding: '10px 20px',
                                        background: '#6c757d',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                    onClick={closeCreateDialog}
                                >
                                    Anuluj
                                </button>
                                <button 
                                    style={{
                                        padding: '10px 20px',
                                        background: '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                    onClick={saveNewPrefix}
                                >
                                    💾 Zapisz
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentPrefixesPage;
