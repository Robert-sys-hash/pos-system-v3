import React, { useState, useEffect, useCallback, useRef } from 'react';
import { warehouseService } from '../services/warehouseService';
import { productService } from '../services/productService';
import InventoryTable from '../components/warehouse/InventoryTable';
import InventoryFilters from '../components/warehouse/InventoryFilters';
import InterWarehouseTransfer from '../components/warehouse/InterWarehouseTransfer';

const WarehousePage = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [inventory, setInventory] = useState({
    products: [],
    pagination: { page: 1, limit: 20, total: 0, pages: 0 }
  });
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);

  return (
    <div style={{ width: '100%', padding: '1rem' }}>
      <div className="row">
        <div className="col-12">
          <h1>Warehouse Page</h1>
          
          {/* Zakładki główne */}
          <div className="mb-4">
            <ul className="nav nav-tabs nav-fill">
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'inventory' ? 'active' : ''}`}
                  onClick={() => setActiveTab('inventory')}
                >
                  📦 Magazyn
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'transfers' ? 'active' : ''}`}
                  onClick={() => setActiveTab('transfers')}
                >
                  🔄 Transfery
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'stats' ? 'active' : ''}`}
                  onClick={() => setActiveTab('stats')}
                >
                  📊 Statystyki
                </button>
              </li>
            </ul>
          </div>

          {/* Zawartość zakładek */}
          {activeTab === 'transfers' && <InterWarehouseTransfer />}
          
          {activeTab === 'inventory' && (
            <div>
              <h3>Inventory Content</h3>
              <p>Products: {inventory.products.length}</p>
            </div>
          )}

          {activeTab === 'stats' && (
            <div>
              <h3>Stats Content</h3>
              <p>Total: {stats.total_products || 0}</p>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default WarehousePage;
