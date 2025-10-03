import React, { useState } from 'react';

const SettingsTab = ({
  settings,
  setSettings,
  saveSettings,
  resetSettings
}) => {
  const [activeSubTab, setActiveSubTab] = useState('general');
  const [saving, setSaving] = useState(false);

  const handleSettingChange = (key, value) => {
    setSettings({
      ...settings,
      [key]: value
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings();
    } catch (error) {
      console.error('Błąd zapisywania ustawień:', error);
    } finally {
      setSaving(false);
    }
  };

  const subTabs = [
    { id: 'general', label: '🏪 Ogólne', icon: '🏪' },
    { id: 'pos', label: '💳 Kasa', icon: '💳' },
    { id: 'print', label: '🖨️ Drukowanie', icon: '🖨️' },
    { id: 'backup', label: '💾 Kopie zapasowe', icon: '💾' },
    { id: 'security', label: '🔒 Bezpieczeństwo', icon: '🔒' }
  ];

  const renderGeneralSettings = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e9ecef',
        borderRadius: '0.375rem',
        padding: '1rem'
      }}>
        <h6 style={{ margin: '0 0 1rem 0', fontWeight: '600', color: '#495057' }}>
          🏪 Informacje o sklepie
        </h6>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
              Nazwa sklepu
            </label>
            <input
              type="text"
              style={{
                width: '100%',
                padding: '0.375rem 0.75rem',
                fontSize: '0.875rem',
                border: '1px solid #ced4da',
                borderRadius: '0.375rem'
              }}
              value={settings?.shop_name || ''}
              onChange={(e) => handleSettingChange('shop_name', e.target.value)}
              placeholder="Nazwa Twojego sklepu"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
              Adres
            </label>
            <textarea
              style={{
                width: '100%',
                padding: '0.375rem 0.75rem',
                fontSize: '0.875rem',
                border: '1px solid #ced4da',
                borderRadius: '0.375rem',
                resize: 'vertical',
                minHeight: '80px'
              }}
              value={settings?.shop_address || ''}
              onChange={(e) => handleSettingChange('shop_address', e.target.value)}
              placeholder="Pełny adres sklepu"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
                NIP
              </label>
              <input
                type="text"
                style={{
                  width: '100%',
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem'
                }}
                value={settings?.shop_nip || ''}
                onChange={(e) => handleSettingChange('shop_nip', e.target.value)}
                placeholder="123-456-78-90"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
                Telefon
              </label>
              <input
                type="text"
                style={{
                  width: '100%',
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #ced4da',
                  borderRadius: '0.375rem'
                }}
                value={settings?.shop_phone || ''}
                onChange={(e) => handleSettingChange('shop_phone', e.target.value)}
                placeholder="+48 123 456 789"
              />
            </div>
          </div>
        </div>
      </div>

      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e9ecef',
        borderRadius: '0.375rem',
        padding: '1rem'
      }}>
        <h6 style={{ margin: '0 0 1rem 0', fontWeight: '600', color: '#495057' }}>
          🌍 Lokalizacja i waluta
        </h6>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
              Waluta
            </label>
            <select
              style={{
                width: '100%',
                padding: '0.375rem 0.75rem',
                fontSize: '0.875rem',
                border: '1px solid #ced4da',
                borderRadius: '0.375rem'
              }}
              value={settings?.currency || 'PLN'}
              onChange={(e) => handleSettingChange('currency', e.target.value)}
            >
              <option value="PLN">PLN (Złoty Polski)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="USD">USD (Dolar Amerykański)</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
              Strefa czasowa
            </label>
            <select
              style={{
                width: '100%',
                padding: '0.375rem 0.75rem',
                fontSize: '0.875rem',
                border: '1px solid #ced4da',
                borderRadius: '0.375rem'
              }}
              value={settings?.timezone || 'Europe/Warsaw'}
              onChange={(e) => handleSettingChange('timezone', e.target.value)}
            >
              <option value="Europe/Warsaw">Europe/Warsaw (CET)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="America/New_York">America/New_York (EST)</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
              Format daty
            </label>
            <select
              style={{
                width: '100%',
                padding: '0.375rem 0.75rem',
                fontSize: '0.875rem',
                border: '1px solid #ced4da',
                borderRadius: '0.375rem'
              }}
              value={settings?.date_format || 'DD.MM.YYYY'}
              onChange={(e) => handleSettingChange('date_format', e.target.value)}
            >
              <option value="DD.MM.YYYY">DD.MM.YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPOSSettings = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e9ecef',
        borderRadius: '0.375rem',
        padding: '1rem'
      }}>
        <h6 style={{ margin: '0 0 1rem 0', fontWeight: '600', color: '#495057' }}>
          💳 Ustawienia kasy
        </h6>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={settings?.auto_print_receipt || false}
              onChange={(e) => handleSettingChange('auto_print_receipt', e.target.checked)}
            />
            Automatyczne drukowanie paragonów
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={settings?.require_customer_display || false}
              onChange={(e) => handleSettingChange('require_customer_display', e.target.checked)}
            />
            Wymagaj wyświetlacza klienta
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={settings?.enable_barcode_scanner || false}
              onChange={(e) => handleSettingChange('enable_barcode_scanner', e.target.checked)}
            />
            Włącz skaner kodów kreskowych
          </label>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
              Domyślna metoda płatności
            </label>
            <select
              style={{
                width: '100%',
                padding: '0.375rem 0.75rem',
                fontSize: '0.875rem',
                border: '1px solid #ced4da',
                borderRadius: '0.375rem'
              }}
              value={settings?.default_payment_method || 'gotowka'}
              onChange={(e) => handleSettingChange('default_payment_method', e.target.value)}
            >
              <option value="gotowka">Gotówka</option>
              <option value="karta">Karta</option>
              <option value="blik">BLIK</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e9ecef',
        borderRadius: '0.375rem',
        padding: '1rem'
      }}>
        <h6 style={{ margin: '0 0 1rem 0', fontWeight: '600', color: '#495057' }}>
          💰 VAT i ceny
        </h6>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
              Domyślna stawka VAT (%)
            </label>
            <select
              style={{
                width: '100%',
                padding: '0.375rem 0.75rem',
                fontSize: '0.875rem',
                border: '1px solid #ced4da',
                borderRadius: '0.375rem'
              }}
              value={settings?.default_vat_rate || '23'}
              onChange={(e) => handleSettingChange('default_vat_rate', e.target.value)}
            >
              <option value="23">23%</option>
              <option value="8">8%</option>
              <option value="5">5%</option>
              <option value="0">0%</option>
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={settings?.prices_include_vat || true}
              onChange={(e) => handleSettingChange('prices_include_vat', e.target.checked)}
            />
            Ceny zawierają VAT
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={settings?.round_to_cents || true}
              onChange={(e) => handleSettingChange('round_to_cents', e.target.checked)}
            />
            Zaokrąglaj do groszy
          </label>
        </div>
      </div>
    </div>
  );

  const renderPrintSettings = () => (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e9ecef',
      borderRadius: '0.375rem',
      padding: '1rem'
    }}>
      <h6 style={{ margin: '0 0 1rem 0', fontWeight: '600', color: '#495057' }}>
        🖨️ Ustawienia drukarki
      </h6>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
              Szerokość papieru
            </label>
            <select
              style={{
                width: '100%',
                padding: '0.375rem 0.75rem',
                fontSize: '0.875rem',
                border: '1px solid #ced4da',
                borderRadius: '0.375rem'
              }}
              value={settings?.printer_paper_width || '80mm'}
              onChange={(e) => handleSettingChange('printer_paper_width', e.target.value)}
            >
              <option value="58mm">58mm</option>
              <option value="80mm">80mm</option>
              <option value="A4">A4</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
              Nazwa drukarki
            </label>
            <input
              type="text"
              style={{
                width: '100%',
                padding: '0.375rem 0.75rem',
                fontSize: '0.875rem',
                border: '1px solid #ced4da',
                borderRadius: '0.375rem'
              }}
              value={settings?.printer_name || ''}
              onChange={(e) => handleSettingChange('printer_name', e.target.value)}
              placeholder="Nazwa drukarki paragonów"
            />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={settings?.print_logo || false}
              onChange={(e) => handleSettingChange('print_logo', e.target.checked)}
            />
            Drukuj logo na paragonie
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={settings?.print_footer || true}
              onChange={(e) => handleSettingChange('print_footer', e.target.checked)}
            />
            Drukuj stopkę z podziękowaniem
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={settings?.auto_cut_paper || true}
              onChange={(e) => handleSettingChange('auto_cut_paper', e.target.checked)}
            />
            Automatyczne obcinanie papieru
          </label>
        </div>
      </div>
    </div>
  );

  const renderBackupSettings = () => (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e9ecef',
      borderRadius: '0.375rem',
      padding: '1rem'
    }}>
      <h6 style={{ margin: '0 0 1rem 0', fontWeight: '600', color: '#495057' }}>
        💾 Kopie zapasowe
      </h6>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={settings?.auto_backup_enabled || false}
              onChange={(e) => handleSettingChange('auto_backup_enabled', e.target.checked)}
            />
            Automatyczne kopie zapasowe
          </label>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
              Częstotliwość
            </label>
            <select
              style={{
                width: '100%',
                padding: '0.375rem 0.75rem',
                fontSize: '0.875rem',
                border: '1px solid #ced4da',
                borderRadius: '0.375rem'
              }}
              value={settings?.backup_frequency || 'daily'}
              onChange={(e) => handleSettingChange('backup_frequency', e.target.value)}
              disabled={!settings?.auto_backup_enabled}
            >
              <option value="hourly">Co godzinę</option>
              <option value="daily">Codziennie</option>
              <option value="weekly">Co tydzień</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
              Przechowuj kopie (dni)
            </label>
            <input
              type="number"
              style={{
                width: '100%',
                padding: '0.375rem 0.75rem',
                fontSize: '0.875rem',
                border: '1px solid #ced4da',
                borderRadius: '0.375rem'
              }}
              value={settings?.backup_retention_days || 30}
              onChange={(e) => handleSettingChange('backup_retention_days', parseInt(e.target.value))}
              min="1"
              max="365"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
              Ścieżka kopii
            </label>
            <input
              type="text"
              style={{
                width: '100%',
                padding: '0.375rem 0.75rem',
                fontSize: '0.875rem',
                border: '1px solid #ced4da',
                borderRadius: '0.375rem'
              }}
              value={settings?.backup_path || './backups'}
              onChange={(e) => handleSettingChange('backup_path', e.target.value)}
              placeholder="Ścieżka do foldera kopii"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e9ecef',
      borderRadius: '0.375rem',
      padding: '1rem'
    }}>
      <h6 style={{ margin: '0 0 1rem 0', fontWeight: '600', color: '#495057' }}>
        🔒 Bezpieczeństwo
      </h6>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
              Czas sesji (minuty)
            </label>
            <input
              type="number"
              style={{
                width: '100%',
                padding: '0.375rem 0.75rem',
                fontSize: '0.875rem',
                border: '1px solid #ced4da',
                borderRadius: '0.375rem'
              }}
              value={settings?.session_timeout || 480}
              onChange={(e) => handleSettingChange('session_timeout', parseInt(e.target.value))}
              min="5"
              max="1440"
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={settings?.require_password_change || false}
              onChange={(e) => handleSettingChange('require_password_change', e.target.checked)}
            />
            Wymagaj zmiany hasła co 90 dni
          </label>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={settings?.log_user_actions || true}
              onChange={(e) => handleSettingChange('log_user_actions', e.target.checked)}
            />
            Loguj działania użytkowników
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={settings?.enable_audit_trail || false}
              onChange={(e) => handleSettingChange('enable_audit_trail', e.target.checked)}
            />
            Włącz ślad audytu
          </label>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeSubTab) {
      case 'general':
        return renderGeneralSettings();
      case 'pos':
        return renderPOSSettings();
      case 'print':
        return renderPrintSettings();
      case 'backup':
        return renderBackupSettings();
      case 'security':
        return renderSecuritySettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e9ecef',
        borderRadius: '0.375rem',
        marginBottom: '1rem',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e9ecef'
        }}>
          {subTabs.map(tab => (
            <button
              key={tab.id}
              style={{
                padding: '0.75rem 1rem',
                border: 'none',
                backgroundColor: activeSubTab === tab.id ? '#007bff' : 'white',
                color: activeSubTab === tab.id ? 'white' : '#495057',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderBottom: activeSubTab === tab.id ? '2px solid #007bff' : '2px solid transparent',
                transition: 'all 0.2s'
              }}
              onClick={() => setActiveSubTab(tab.id)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ marginBottom: '2rem' }}>
        {renderTabContent()}
      </div>

      {/* Action Buttons */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e9ecef',
        borderRadius: '0.375rem',
        padding: '1rem',
        display: 'flex',
        gap: '1rem',
        justifyContent: 'center'
      }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: saving ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? 'Zapisywanie...' : '💾 Zapisz ustawienia'}
        </button>
        <button
          onClick={resetSettings}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          ↺ Przywróć domyślne
        </button>
      </div>
    </div>
  );
};

export default SettingsTab;
