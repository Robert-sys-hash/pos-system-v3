import React, { useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WarehouseProvider } from './contexts/WarehouseContext';
import { LocationProvider } from './contexts/LocationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/layout/Layout';
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
import ReturnPrintPage from './pages/ReturnPrintPage';
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
    <AuthProvider>
      <LocationProvider>
        <WarehouseProvider>
          <div className="app">
            <Router>
              <Routes>
                {/* Publiczna strona logowania - bez Header */}
                <Route path="/login" element={<LoginPage />} />
                
                {/* Chronione trasy - z Header w Layout */}
                <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
                <Route path="/pos" element={<ProtectedRoute><Layout><PosPage /></Layout></ProtectedRoute>} />
                <Route path="/products" element={<ProtectedRoute><Layout><ProductsPage /></Layout></ProtectedRoute>} />
                <Route path="/customers" element={<ProtectedRoute><Layout><CustomersPage /></Layout></ProtectedRoute>} />
                <Route path="/orders" element={<ProtectedRoute><Layout><OrdersPage /></Layout></ProtectedRoute>} />
                <Route path="/coupons" element={<ProtectedRoute><Layout><CouponsPage /></Layout></ProtectedRoute>} />
                <Route path="/invoices" element={<ProtectedRoute><Layout><InvoicesPage /></Layout></ProtectedRoute>} />
                <Route path="/sales-invoices" element={<ProtectedRoute><Layout><SalesInvoicesPage /></Layout></ProtectedRoute>} />
                <Route path="/purchase-invoices" element={<ProtectedRoute><Layout><PurchaseInvoicesPage /></Layout></ProtectedRoute>} />
                <Route path="/purchase-invoices/list" element={<ProtectedRoute><Layout><PurchaseInvoicesListPage /></Layout></ProtectedRoute>} />
                <Route path="/purchase-invoices/cennik-history" element={<ProtectedRoute><Layout><CennikHistoryPage /></Layout></ProtectedRoute>} />
                <Route path="/purchase-invoices/:id/edit" element={<ProtectedRoute><Layout><PurchaseInvoiceEditPage /></Layout></ProtectedRoute>} />
                <Route path="/purchase-invoices/:id" element={<ProtectedRoute><Layout><PurchaseInvoiceDetailsPage /></Layout></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Layout><ReportsPage /></Layout></ProtectedRoute>} />
                <Route path="/warehouse" element={<ProtectedRoute><Layout><WarehousePage /></Layout></ProtectedRoute>} />
                <Route path="/inventory-report" element={<ProtectedRoute><Layout><InventoryReportPage /></Layout></ProtectedRoute>} />
                <Route path="/kasa-bank" element={<ProtectedRoute><Layout><KasaBankPage /></Layout></ProtectedRoute>} />
                <Route path="/locations" element={<ProtectedRoute><Layout><LocationsPage /></Layout></ProtectedRoute>} />
                <Route path="/location-pricing" element={<ProtectedRoute><Layout><LocationPricingPage /></Layout></ProtectedRoute>} />
                <Route path="/cenowki" element={<ProtectedRoute><Layout><LocationPricingPage /></Layout></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><Layout><AdminPage /></Layout></ProtectedRoute>} />
                <Route path="/admin/categories" element={<ProtectedRoute><Layout><CategoriesAdmin /></Layout></ProtectedRoute>} />
                <Route path="/admin/document-prefixes" element={<ProtectedRoute><Layout><DocumentPrefixesPage /></Layout></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>} />
                
                {/* Strona wydruku zwrotu - bez layoutu */}
                <Route path="/pos/return-print/:transactionId" element={<ReturnPrintPage />} />
                
                {/* <Route path="/messenger" element={<ProtectedRoute><Layout><Messenger ref={messengerRef} onMessageSent={handleMessengerMessageSent} /></Layout></ProtectedRoute>} /> */}
              </Routes>
              
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
    </AuthProvider>
  );
}

export default App;
