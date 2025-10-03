import React, { useState } from 'react';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    shopName: 'Mój Sklep',
    address: 'ul. Przykładowa 123',
    city: 'Warszawa',
    postalCode: '00-000',
    phone: '+48 123 456 789',
    email: 'kontakt@mojsklep.pl',
    nip: '1234567890',
    currency: 'PLN',
    taxRate: '23',
    receiptFooter: 'Dziękujemy za zakupy!',
    autoLogout: true,
    logoutTime: 30,
    printReceipts: true,
    soundEffects: true
  });

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    alert('Ustawienia zostały zapisane!');
  };

  const renderGeneralTab = () => (
    <div className="row">
      <div className="col-md-6">
        <div className="card">
          <div className="card-header">
            <h5>🏪 Informacje o sklepie</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label">Nazwa sklepu</label>
              <input 
                type="text" 
                className="form-control" 
                value={settings.shopName}
                onChange={(e) => handleSettingChange('shopName', e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Adres</label>
              <input 
                type="text" 
                className="form-control" 
                value={settings.address}
                onChange={(e) => handleSettingChange('address', e.target.value)}
              />
            </div>
            <div className="row">
              <div className="col-md-8">
                <div className="mb-3">
                  <label className="form-label">Miasto</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={settings.city}
                    onChange={(e) => handleSettingChange('city', e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-4">
                <div className="mb-3">
                  <label className="form-label">Kod pocztowy</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={settings.postalCode}
                    onChange={(e) => handleSettingChange('postalCode', e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Telefon</label>
              <input 
                type="tel" 
                className="form-control" 
                value={settings.phone}
                onChange={(e) => handleSettingChange('phone', e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input 
                type="email" 
                className="form-control" 
                value={settings.email}
                onChange={(e) => handleSettingChange('email', e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">NIP</label>
              <input 
                type="text" 
                className="form-control" 
                value={settings.nip}
                onChange={(e) => handleSettingChange('nip', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="col-md-6">
        <div className="card">
          <div className="card-header">
            <h5>💰 Ustawienia sprzedaży</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label">Waluta</label>
              <select 
                className="form-control"
                value={settings.currency}
                onChange={(e) => handleSettingChange('currency', e.target.value)}
              >
                <option value="PLN">PLN (Polski złoty)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="USD">USD (Dolar amerykański)</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Stawka VAT (%)</label>
              <input 
                type="number" 
                className="form-control" 
                value={settings.taxRate}
                onChange={(e) => handleSettingChange('taxRate', e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Stopka paragonu</label>
              <textarea 
                className="form-control" 
                rows="3"
                value={settings.receiptFooter}
                onChange={(e) => handleSettingChange('receiptFooter', e.target.value)}
              />
            </div>
            <div className="mb-3">
              <div className="form-check">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  id="printReceipts"
                  checked={settings.printReceipts}
                  onChange={(e) => handleSettingChange('printReceipts', e.target.checked)}
                />
                <label className="form-check-label" htmlFor="printReceipts">
                  Automatyczne drukowanie paragonów
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="row">
      <div className="col-md-6">
        <div className="card">
          <div className="card-header">
            <h5>🔒 Bezpieczeństwo</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <div className="form-check">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  id="autoLogout"
                  checked={settings.autoLogout}
                  onChange={(e) => handleSettingChange('autoLogout', e.target.checked)}
                />
                <label className="form-check-label" htmlFor="autoLogout">
                  Automatyczne wylogowanie po bezczynności
                </label>
              </div>
            </div>
            {settings.autoLogout && (
              <div className="mb-3">
                <label className="form-label">Czas bezczynności (minuty)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={settings.logoutTime}
                  onChange={(e) => handleSettingChange('logoutTime', e.target.value)}
                />
              </div>
            )}
            <div className="mb-3">
              <button className="btn btn-warning">🔐 Zmień hasło</button>
            </div>
            <div className="mb-3">
              <button className="btn btn-info">📋 Eksportuj logi</button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="col-md-6">
        <div className="card">
          <div className="card-header">
            <h5>🔊 Interfejs</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <div className="form-check">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  id="soundEffects"
                  checked={settings.soundEffects}
                  onChange={(e) => handleSettingChange('soundEffects', e.target.checked)}
                />
                <label className="form-check-label" htmlFor="soundEffects">
                  Dźwięki systemowe
                </label>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Motyw</label>
              <select className="form-control">
                <option>Jasny</option>
                <option>Ciemny</option>
                <option>Auto</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Język</label>
              <select className="form-control">
                <option>Polski</option>
                <option>English</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        <div className="col-12">
          <h2>⚙️ Ustawienia Systemu</h2>
          
          {/* Zakładki */}
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'general' ? 'active' : ''}`}
                onClick={() => setActiveTab('general')}
              >
                🏪 Ogólne
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                🔒 Bezpieczeństwo
              </button>
            </li>
          </ul>

          {/* Zawartość zakładek */}
          <div className="tab-content">
            {activeTab === 'general' && renderGeneralTab()}
            {activeTab === 'security' && renderSecurityTab()}
          </div>

          {/* Przyciski akcji */}
          <div className="mt-4 text-center">
            <button className="btn btn-success btn-lg me-3" onClick={handleSave}>
              💾 Zapisz ustawienia
            </button>
            <button className="btn btn-secondary btn-lg">
              ↺ Przywróć domyślne
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
