import React, { useState, useEffect } from 'react';
import { couponService } from '../services/couponService';
import { useLocation } from '../contexts/LocationContext';
import { useWarehouse } from '../contexts/WarehouseContext';
import SimpleUseCouponModal from '../components/coupons/SimpleUseCouponModal';
import SimpleHistoryModal from '../components/coupons/SimpleHistoryModal';
import ManualReceiptModal from '../components/coupons/ManualReceiptModal';

const CouponsPageSimple = () => {
  const { selectedLocation, locationId } = useLocation();
  const { selectedWarehouse, warehouseId } = useWarehouse();
  
  // Użyj location_id dla adminów, warehouse_id dla pracowników
  const currentLocationId = locationId || warehouseId;

  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [stats, setStats] = useState({
    active_count: 0,
    active_value: 0,
    used_count: 0,
    used_value: 0,
    total_count: 0
  });
  const [showUseModal, setShowUseModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);

  const getDefaultExpiryDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  };

  const [newCoupon, setNewCoupon] = useState({
    wartosc: '',
    data_waznosci: getDefaultExpiryDate(),
    numer_telefonu: '',
    sposob_platnosci: 'gotowka'
  });

  useEffect(() => {
    fetchCoupons();
  }, [currentLocationId]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      console.log('🔄 Pobieranie kuponów dla lokalizacji:', currentLocationId);
      const response = await couponService.getCoupons(currentLocationId);
      console.log('📦 Odpowiedź API:', response);
      
      const couponsData = response?.data || [];
      console.log('📋 Kupony:', couponsData);
      
      setCoupons(Array.isArray(couponsData) ? couponsData : []);
      
      // Oblicz statystyki z kuponów
      const statsCalculated = {
        active_count: couponsData.filter(c => c.status === 'aktywny').length,
        active_value: couponsData.filter(c => c.status === 'aktywny').reduce((sum, c) => sum + (c.wartosc || 0), 0),
        used_count: couponsData.filter(c => c.status === 'wykorzystany').length,
        used_value: couponsData.filter(c => c.status === 'wykorzystany').reduce((sum, c) => sum + (c.kwota_wykorzystana || c.wartosc || 0), 0),
        total_count: couponsData.length
      };
      setStats(statsCalculated);
      console.log('📊 Statystyki:', statsCalculated);
      
      setError(null);
    } catch (err) {
      setError('Błąd podczas pobierania kuponów');
      console.error('❌ Fetch coupons error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCoupon = async (e) => {
    e.preventDefault();
    if (!newCoupon.wartosc || !newCoupon.data_waznosci) {
      alert('Wypełnij wszystkie wymagane pola');
      return;
    }

    try {
      await couponService.addCoupon(newCoupon);
      setNewCoupon({
        wartosc: '',
        data_waznosci: getDefaultExpiryDate(),
        numer_telefonu: '',
        sposob_platnosci: 'gotowka'
      });
      setShowAddForm(false);
      fetchCoupons();
    } catch (err) {
      alert('Błąd podczas dodawania kuponu: ' + (err.message || 'Nieznany błąd'));
    }
  };

  const filteredCoupons = coupons.filter(coupon =>
    coupon.kod.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (coupon.numer_telefonu && coupon.numer_telefonu.includes(searchTerm))
  );

  if (loading) return <div style={{ padding: '20px' }}>Ładowanie kuponów...</div>;

  return (
    <div style={{ padding: '8px 0', maxWidth: 900, margin: '0 auto', fontSize: 14, fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 17 }}>Kupony</span>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ 
            padding: '4px 14px', 
            background: '#2563eb', 
            color: 'white', 
            border: 'none', 
            borderRadius: 5,
            fontWeight: 500,
            fontSize: 14,
            cursor: 'pointer',
            minHeight: 28
          }}
        >
          {showAddForm ? 'Anuluj' : 'Dodaj kupon'}
        </button>
      </div>

      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          borderRadius: '4px', 
          marginBottom: '20px' 
        }}>
          {error}
        </div>
      )}

      {/* Statystyki */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <div style={{ padding: '6px 10px', background: '#e3f2fd', borderRadius: 6, minWidth: 90 }}>
          <span style={{ color: '#1976d2', fontWeight: 600 }}>Aktywne</span><br/>
          <span style={{ fontWeight: 600 }}>{stats.active_count}</span> <span style={{ color: '#1976d2' }}>({(stats.active_value || 0).toFixed(2)} zł)</span>
        </div>
        <div style={{ padding: '6px 10px', background: '#e8f5e8', borderRadius: 6, minWidth: 90 }}>
          <span style={{ color: '#388e3c', fontWeight: 600 }}>Wykorzystane</span><br/>
          <span style={{ fontWeight: 600 }}>{stats.used_count}</span> <span style={{ color: '#388e3c' }}>({(stats.used_value || 0).toFixed(2)} zł)</span>
        </div>
        <div style={{ padding: '6px 10px', background: '#fff3e0', borderRadius: 6, minWidth: 90 }}>
          <span style={{ color: '#f57c00', fontWeight: 600 }}>Razem</span><br/>
          <span style={{ fontWeight: 600 }}>{stats.total_count}</span> <span style={{ color: '#f57c00' }}>kuponów</span>
        </div>
      </div>

      {/* Formularz dodawania */}
      {showAddForm && (
        <div style={{ background: '#f8f9fa', padding: '10px 10px 8px 10px', borderRadius: 7, marginBottom: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Dodaj nowy kupon</span>
          <form onSubmit={handleAddCoupon} style={{ marginTop: 6 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input type="number" id="wartosc" value={newCoupon.wartosc} onChange={e => setNewCoupon({...newCoupon, wartosc: e.target.value})} placeholder="Wartość (zł) *" style={{ width: 90, padding: '4px 8px', fontSize: 14, borderRadius: 5, border: '1px solid #ddd' }} step="0.01" min="0" required />
              <input type="date" id="data_waznosci" value={newCoupon.data_waznosci} onChange={e => setNewCoupon({...newCoupon, data_waznosci: e.target.value})} style={{ width: 120, padding: '4px 8px', fontSize: 14, borderRadius: 5, border: '1px solid #ddd' }} required />
              <input type="tel" id="numer_telefonu" value={newCoupon.numer_telefonu} onChange={e => setNewCoupon({...newCoupon, numer_telefonu: e.target.value})} placeholder="Telefon" style={{ width: 110, padding: '4px 8px', fontSize: 14, borderRadius: 5, border: '1px solid #ddd' }} />
              <select id="sposob_platnosci" value={newCoupon.sposob_platnosci} onChange={e => setNewCoupon({...newCoupon, sposob_platnosci: e.target.value})} style={{ width: 90, padding: '4px 8px', fontSize: 14, borderRadius: 5, border: '1px solid #ddd' }}>
                <option value="gotowka">Gotówka</option>
                <option value="karta">Karta</option>
                <option value="przelew">Przelew</option>
              </select>
              <button type="submit" style={{ padding: '4px 14px', background: '#28a745', color: 'white', border: 'none', borderRadius: 5, fontWeight: 500, fontSize: 14, cursor: 'pointer', minHeight: 28 }}>Dodaj</button>
              <button type="button" onClick={() => setShowAddForm(false)} style={{ padding: '4px 14px', background: '#6c757d', color: 'white', border: 'none', borderRadius: 5, fontWeight: 500, fontSize: 14, cursor: 'pointer', minHeight: 28 }}>Anuluj</button>
            </div>
          </form>
        </div>
      )}

      {/* Wyszukiwanie */}
      <div style={{ marginBottom: 8 }}>
        <input
          type="text"
          placeholder="Szukaj po kodzie lub telefonie..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '6px 8px', fontSize: 14, border: '1px solid #ddd', borderRadius: 5 }}
        />
      </div>

      {/* Lista kuponów */}
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Lista kuponów <span style={{ color: '#2563eb' }}>({filteredCoupons.length})</span></div>
        {filteredCoupons.length === 0 ? (
          <div style={{ color: '#888', fontSize: 14, margin: '8px 0' }}>Brak kuponów do wyświetlenia</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '6px 6px', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: 600 }}>Kod</th>
                  <th style={{ padding: '6px 6px', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: 600 }}>Wartość</th>
                  <th style={{ padding: '6px 6px', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '6px 6px', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: 600 }}>Ważność</th>
                  <th style={{ padding: '6px 6px', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: 600 }}>Telefon</th>
                  <th style={{ padding: '6px 6px', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: 600 }}>Paragon</th>
                  <th style={{ padding: '6px 6px', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: 600 }}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoupons.map(coupon => (
                  <tr key={coupon.id} style={{ height: 32 }}>
                    <td style={{ padding: '4px 6px', border: '1px solid #e5e7eb', fontWeight: 600 }}>{coupon.kod}</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #e5e7eb' }}>{(coupon.wartosc || 0).toFixed(2)} zł</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #e5e7eb' }}>
                      <span style={{
                        padding: '2px 7px',
                        borderRadius: 4,
                        fontSize: 12,
                        background: coupon.status === 'aktywny' ? '#e0f7fa' : '#ffeaea',
                        color: coupon.status === 'aktywny' ? '#2563eb' : '#b91c1c',
                        fontWeight: 600
                      }}>{coupon.status}</span>
                    </td>
                    <td style={{ padding: '4px 6px', border: '1px solid #e5e7eb' }}>{coupon.data_waznosci}</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #e5e7eb' }}>{coupon.numer_telefonu || '-'}</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #e5e7eb' }}>
                      {coupon.numer_paragonu || '-'}
                      <button style={{ marginLeft: 6, fontSize: 12, padding: '2px 8px', borderRadius: 4, border: 'none', background: '#f3f4f6', cursor: 'pointer' }} onClick={() => { setSelectedCoupon(coupon); setShowReceiptModal(true); }}>Edytuj</button>
                    </td>
                    <td style={{ padding: '4px 6px', border: '1px solid #e5e7eb' }}>
                      <button style={{ marginRight: 6, fontSize: 12, padding: '2px 8px', borderRadius: 4, border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer' }} onClick={() => { setSelectedCoupon(coupon); setShowUseModal(true); }}>Wykorzystaj</button>
                      <button style={{ marginRight: 0, fontSize: 12, padding: '2px 8px', borderRadius: 4, border: 'none', background: '#f3f4f6', color: '#222', cursor: 'pointer' }} onClick={() => { setSelectedCoupon(coupon); setShowHistoryModal(true); }}>Historia</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* MODALE */}
      <SimpleUseCouponModal
        coupon={selectedCoupon}
        isOpen={showUseModal}
        onClose={() => { setShowUseModal(false); setSelectedCoupon(null); }}
        onSuccess={fetchCoupons}
      />
      <SimpleHistoryModal
        couponId={selectedCoupon?.id}
        isOpen={showHistoryModal}
        onClose={() => { setShowHistoryModal(false); setSelectedCoupon(null); }}
      />
      <ManualReceiptModal
        coupon={selectedCoupon}
        isOpen={showReceiptModal}
        onClose={() => { setShowReceiptModal(false); setSelectedCoupon(null); }}
        onSuccess={fetchCoupons}
      />
    </div>
  );
};

export default CouponsPageSimple;
