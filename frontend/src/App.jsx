import React, { useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WarehouseProvider } from './contexts/WarehouseContext';
import { LocationProvider } from './contexts/LocationContext';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import PosPage from './pages/PosPage';
import KasaBankPage from './pages/KasaBankPage';
import LocationsPage from './pages/LocationsPage';
import LocationPricingPage from './pages/LocationPricingPage';
import ProductsPage from './pages/ProductsPage';
import CustomersPage from './pages/CustomersPage';
import ReportsPage from './pages/ReportsPage';
import AdminPage from './pages/AdminPage';
import CouponsPage from './pages/CouponsPageSimple';
import InvoicesPage from './pages/InvoicesPage';
import SalesInvoicesPage from './pages/SalesInvoicesPage';
import PurchaseInvoicesPage from './pages/PurchaseInvoicesPage';
import PurchaseInvoicesListPage from './pages/PurchaseInvoicesListPage';
import PurchaseInvoiceDetailsPage from './pages/PurchaseInvoiceDetailsPage';
import PurchaseInvoiceEditPage from './pages/PurchaseInvoiceEditPage';
import CennikHistoryPage from './pages/CennikHistoryPage';
import WarehousePage from './pages/WarehousePage';
import InventoryReportPage from './pages/InventoryReportPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import CategoriesAdmin from './pages/CategoriesAdmin';
import OrdersPage from './pages/OrdersPage';
import DocumentPrefixesPage from './pages/DocumentPrefixesPage';
// import Messenger from './components/Messenger';
// import MessengerButton from './components/MessengerButton';
// import MessengerModal from './components/MessengerModal';

function App() {
  const [isMessengerModalOpen, setIsMessengerModalOpen] = useState(false);
  const messengerRef = useRef(null);
  const messengerModalRef = useRef(null);

  const toggleMessengerModal = () => {
    setIsMessengerModalOpen(!isMessengerModalOpen);
  };

  // Callback wywoływany po wysłaniu wiadomości przez modal
  const handleMessageSent = () => {
    console.log('🔄 App: Message sent from modal, refreshing messenger if active');
    // Jeśli pełny messenger jest aktywny (na stronie /messenger), odśwież go
    if (messengerRef.current && typeof messengerRef.current.refreshMessages === 'function') {
      messengerRef.current.refreshMessages();
    }
  };

  // Callback wywoływany po wysłaniu wiadomości przez pełny messenger
  const handleMessengerMessageSent = () => {
    console.log('🔄 App: Message sent from messenger, refreshing modal if active');
    // Jeśli modal jest otwarty, odśwież go
    if (messengerModalRef.current && typeof messengerModalRef.current.refreshMessages === 'function') {
      messengerModalRef.current.refreshMessages();
    }
  };

  return (
    <LocationProvider>
      <WarehouseProvider>
        <div className="app">
          <Router>
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/pos" element={<PosPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/coupons" element={<CouponsPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/sales-invoices" element={<SalesInvoicesPage />} />
              <Route path="/purchase-invoices" element={<PurchaseInvoicesPage />} />
              <Route path="/purchase-invoices/list" element={<PurchaseInvoicesListPage />} />
              <Route path="/purchase-invoices/cennik-history" element={<CennikHistoryPage />} />
              <Route path="/purchase-invoices/:id/edit" element={<PurchaseInvoiceEditPage />} />
              <Route path="/purchase-invoices/:id" element={<PurchaseInvoiceDetailsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/warehouse" element={<WarehousePage />} />
              <Route path="/inventory-report" element={<InventoryReportPage />} />
              <Route path="/kasa-bank" element={<KasaBankPage />} />
              <Route path="/locations" element={<LocationsPage />} />
              <Route path="/location-pricing" element={<LocationPricingPage />} />
              <Route path="/cenowki" element={<LocationPricingPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/categories" element={<CategoriesAdmin />} />
              <Route path="/admin/document-prefixes" element={<DocumentPrefixesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/login" element={<LoginPage />} />
              {/* <Route path="/messenger" element={<Messenger ref={messengerRef} onMessageSent={handleMessengerMessageSent} />} /> */}
            </Routes>
          </main>
          
          {/* Floating Messenger Button */}
          {/* <MessengerButton onToggle={toggleMessengerModal} /> */}
          
          {/* Messenger Modal */}
          {/* <MessengerModal 
            ref={messengerModalRef}
            isOpen={isMessengerModalOpen} 
            onClose={() => setIsMessengerModalOpen(false)}
            onMessageSent={handleMessageSent}
          /> */}
        </Router>
      </div>
      </WarehouseProvider>
      </LocationProvider>
  );
}

export default App;
