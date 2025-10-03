import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CouponsPage from './pages/CouponsPage';

function App() {
  return (
    <div className="app">
      <Router>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<CouponsPage />} />
            <Route path="/coupons" element={<CouponsPage />} />
          </Routes>
        </main>
      </Router>
    </div>
  );
}

export default App;
