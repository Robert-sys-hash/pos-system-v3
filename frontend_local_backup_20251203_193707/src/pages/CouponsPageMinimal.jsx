import React, { useState, useEffect } from 'react';
import { couponService } from '../services/couponService';
import { useLocation } from '../contexts/LocationContext';
import { useWarehouse } from '../contexts/WarehouseContext';

const CouponsPageMinimal = () => {
  const { selectedLocation, locationId } = useLocation();
  const { selectedWarehouse, warehouseId } = useWarehouse();
  
  // Użyj location_id dla adminów, warehouse_id dla pracowników
  const currentLocationId = locationId || warehouseId;

  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCoupons();
  }, [currentLocationId]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await couponService.getCoupons(currentLocationId);
      console.log('📦 API Response:', response);
      const couponsData = response?.data || [];
      setCoupons(Array.isArray(couponsData) ? couponsData : []);
      setError(null);
    } catch (err) {
      setError('Błąd podczas pobierania kuponów');
      console.error('Fetch coupons error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Ładowanie...</div>;
  if (error) return <div>Błąd: {error}</div>;

  return (
    <div>
      <h1>Kupony</h1>
      <p>Znaleziono {coupons.length} kuponów</p>
      <div>
        {coupons.map(coupon => (
          <div key={coupon.id} style={{ padding: '10px', border: '1px solid #ddd', margin: '5px' }}>
            <strong>{coupon.kod}</strong> - {coupon.wartosc} zł - {coupon.status}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CouponsPageMinimal;
