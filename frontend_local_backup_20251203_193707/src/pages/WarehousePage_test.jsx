import React, { useState, useEffect, useCallback, useRef } from 'react';

const WarehousePage = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  
  return (
    <div style={{ width: '100%', padding: '1rem' }}>
      <div className="row">
        <div className="col-12">
          <h1>Warehouse Test</h1>
          
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
          {activeTab === 'transfers' && <div>Transfers</div>}
          
          {activeTab === 'inventory' && (
            <div>
              <h3>Inventory content</h3>
            </div>
          )}

          {activeTab === 'stats' && (
            <div>
              <h3>Stats content</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WarehousePage;
