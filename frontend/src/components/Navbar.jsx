import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, PlusCircle, List, Shield, LogOut, LogIn, User } from 'lucide-react';

const Navbar = () => {
  const { user, logout, isOfficial } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link to="/" className="brand">
          <div className="brand-icon">
            <MapPin size={20} />
          </div>
          <span>CivicTrack</span>
        </Link>

        <nav className="nav-links">
          <Link
            to="/"
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
          >
            City Issues & Map
          </Link>

          {user && (
            <Link
              to="/report"
              className={`nav-link ${isActive('/report') ? 'active' : ''}`}
            >
              <PlusCircle size={16} />
              Report Issue
            </Link>
          )}

          {user && (
            <Link
              to="/my-reports"
              className={`nav-link ${isActive('/my-reports') ? 'active' : ''}`}
            >
              <List size={16} />
              My Reports
            </Link>
          )}

          {isOfficial && (
            <Link
              to="/admin"
              className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
              style={{ color: '#2563eb', fontWeight: 700 }}
            >
              <Shield size={16} />
              Dept Dashboard
            </Link>
          )}

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f1f5f9',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '0.825rem',
                }}
              >
                <User size={14} color="#64748b" />
                <span style={{ fontWeight: 600 }}>{user.name.split(' ')[0]}</span>
                {user.role !== 'citizen' && (
                  <span
                    style={{
                      background: '#dbeafe',
                      color: '#1e40af',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }}
                  >
                    {user.department !== 'None' ? user.department : user.role}
                  </span>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="btn btn-secondary btn-sm"
                title="Logout"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link to="/login" className="btn btn-secondary btn-sm">
                <LogIn size={15} />
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
