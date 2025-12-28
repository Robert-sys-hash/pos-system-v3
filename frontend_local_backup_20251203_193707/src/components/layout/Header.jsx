import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LocationSelector from './LocationSelector';

const Header = () => {
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (result.success) {
        // Przekierowanie zostanie obsłużone przez ProtectedRoute
        window.location.href = '/login';
      } else {
        alert('Błąd podczas wylogowywania');
      }
    } catch (error) {
      console.error('Błąd wylogowania:', error);
      alert('Błąd połączenia z serwerem');
    }
  };

  return (
    <header style={{ 
      width: '100%',
      backgroundColor: '#f8f9fa',
      padding: '1rem 1.5rem',
      borderBottom: '1px solid #e9ecef',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Główny header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '1.25rem 1.5rem',
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.5rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          marginBottom: '1rem'
        }}>
          {/* Lewa strona - Logo i tytuł */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '3rem',
              height: '3rem',
              backgroundColor: '#e7f1ff',
              borderRadius: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #0d6efd'
            }}>
              <i className="fas fa-cash-register" style={{ 
                color: '#0d6efd', 
                fontSize: '1.25rem' 
              }}></i>
            </div>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: '1.4rem', 
                fontWeight: '700',
                color: '#212529',
                letterSpacing: '-0.025em'
              }}>
                POS System V3
              </h1>
              <p style={{ 
                margin: '0.25rem 0 0 0', 
                fontSize: '0.875rem', 
                color: '#6c757d',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem'
              }}>
                <i className="fas fa-info-circle" style={{ fontSize: '0.8rem' }}></i>
                Nowoczesny system kasowy - React + Flask API
              </p>
            </div>
          </div>
          
          {/* Prawa strona - Selektor lokalizacji/magazynu i Wyloguj */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {/* Informacje o zalogowanym użytkowniku */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              fontSize: '0.75rem',
              backgroundColor: isAdmin ? '#17a2b8' : '#28a745',
              color: 'white',
              borderRadius: '0.25rem'
            }}>
              <span>{isAdmin ? '👨‍💼' : '👤'}</span>
              <span>{user?.login || 'Użytkownik'}</span>
              <span>({user?.user_type || 'brak roli'})</span>
            </div>
            
            {/* Zawsze używamy LocationSelector dla spójności filtrowania */}
            <LocationSelector 
              onLocationChange={(location) => {
                console.log('Zmienił lokalizację na:', location);
              }}
            />
            
            {/* Przycisk wylogowania */}
            <button
              onClick={handleLogout}
              style={{ 
                padding: '0.625rem 1.125rem',
                fontSize: '0.875rem',
                border: '1px solid #dc3545',
                borderRadius: '0.375rem',
                backgroundColor: '#dc3545',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '500',
                transition: 'all 0.15s ease-in-out'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#c82333';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 0.25rem 0.5rem rgba(220, 53, 69, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#dc3545';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
              title="Wyloguj się"
            >
              <i className="fas fa-sign-out-alt"></i>
              Wyloguj
            </button>
          </div>
        </div>

        {/* Nawigacja */}
        <nav style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          flexWrap: 'wrap',
          padding: '1rem 1.5rem',
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.5rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
        }}>
          <Link 
            to="/" 
            style={{ 
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              border: '1px solid #6c757d',
              borderRadius: '0.375rem',
              backgroundColor: '#f8f9fa',
              color: '#495057',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500',
              transition: 'all 0.15s ease-in-out'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#e9ecef';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#f8f9fa';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            📊 Dashboard
          </Link>
          
          <Link 
            to="/pos" 
            style={{ 
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              border: '1px solid #0d6efd',
              borderRadius: '0.375rem',
              backgroundColor: '#0d6efd',
              color: 'white',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500',
              transition: 'all 0.15s ease-in-out'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#0b5ed7';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#0d6efd';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            💰 POS
          </Link>
          
          <Link 
            to="/products" 
            style={{ 
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              border: '1px solid #17a2b8',
              borderRadius: '0.375rem',
              backgroundColor: '#17a2b8',
              color: 'white',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500',
              transition: 'all 0.15s ease-in-out'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#138496';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#17a2b8';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            📦 Produkty
          </Link>
          
          <Link 
            to="/customers" 
            style={{ 
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              border: '1px solid #28a745',
              borderRadius: '0.375rem',
              backgroundColor: '#28a745',
              color: 'white',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500',
              transition: 'all 0.15s ease-in-out'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#218838';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#28a745';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            👥 Klienci
          </Link>
          
          <Link 
            to="/orders" 
            style={{ 
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              border: '1px solid #6f42c1',
              borderRadius: '0.375rem',
              backgroundColor: '#6f42c1',
              color: 'white',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500',
              transition: 'all 0.15s ease-in-out'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#5a32a3';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#6f42c1';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            🛒 Zamówienia
          </Link>
          
          <Link 
            to="/coupons" 
            style={{ 
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              border: '1px solid #fd7e14',
              borderRadius: '0.375rem',
              backgroundColor: '#fd7e14',
              color: 'white',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500',
              transition: 'all 0.15s ease-in-out'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#e86100';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#fd7e14';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            💳 Kupony
          </Link>
          
          <Link 
            to="/sales-invoices" 
            style={{ 
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              border: '1px solid #20c997',
              borderRadius: '0.375rem',
              backgroundColor: '#20c997',
              color: 'white',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500',
              transition: 'all 0.15s ease-in-out'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#1aa179';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#20c997';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            📧 Faktury sprzedaży
          </Link>
          
          <Link 
            to="/purchase-invoices" 
            style={{ 
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              border: '1px solid #ffc107',
              borderRadius: '0.375rem',
              backgroundColor: '#ffc107',
              color: '#212529',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500',
              transition: 'all 0.15s ease-in-out'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#e0a800';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#ffc107';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            📄 Faktury zakupowe
          </Link>
          
          <Link 
            to="/location-pricing" 
            style={{ 
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              border: '1px solid #e83e8c',
              borderRadius: '0.375rem',
              backgroundColor: '#e83e8c',
              color: 'white',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500',
              transition: 'all 0.15s ease-in-out'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#d91a72';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#e83e8c';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            🏷️ Ceny/Cenówki
          </Link>
          
          <Link 
            to="/warehouse" 
            style={{ 
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              border: '1px solid #6c757d',
              borderRadius: '0.375rem',
              backgroundColor: '#6c757d',
              color: 'white',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500',
              transition: 'all 0.15s ease-in-out'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#5a6268';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#6c757d';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            🏪 Magazyn
          </Link>
          
          <Link 
            to="/kasa-bank" 
            style={{ 
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              border: '1px solid #28a745',
              borderRadius: '0.375rem',
              backgroundColor: '#28a745',
              color: 'white',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500',
              transition: 'all 0.15s ease-in-out'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#218838';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#28a745';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            💳 Kasa/Bank
          </Link>
          
          <Link 
            to="/reports" 
            style={{ 
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              border: '1px solid #343a40',
              borderRadius: '0.375rem',
              backgroundColor: '#343a40',
              color: 'white',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500',
              transition: 'all 0.15s ease-in-out'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#1d2124';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#343a40';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            📈 Raporty
          </Link>
          
          <Link 
            to="/inventory-report" 
            style={{ 
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              border: '1px solid #6f42c1',
              borderRadius: '0.375rem',
              backgroundColor: '#6f42c1',
              color: 'white',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500',
              transition: 'all 0.15s ease-in-out'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#5a32a3';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#6f42c1';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            📊 Raport Magazynowy
          </Link>
          
          <Link 
            to="/admin" 
            style={{ 
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              border: '1px solid #dc3545',
              borderRadius: '0.375rem',
              backgroundColor: '#dc3545',
              color: 'white',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500',
              transition: 'all 0.15s ease-in-out'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#c82333';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#dc3545';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            ⚙️ Admin
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
