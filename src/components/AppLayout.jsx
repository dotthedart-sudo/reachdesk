import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Users, BookOpen, Receipt, TrendingUp, ShieldAlert,
  Sun, Moon, LayoutDashboard, Clock, LogOut,
  Settings, MoreVertical, FileText, Bell, CreditCard,
  Menu, X as XIcon
} from 'lucide-react';
import { PLAN_LIMITS } from '../lib/utils';
import UpgradeLockModal from './UpgradeLockModal';
import MobileNav from './MobileNav';

export default function AppLayout({
  profile,
  theme,
  toggleTheme,
  remindersCount,
  adminNotifCount,
  brandName,
  handleLogout,
  subStatus,
  children
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isAdmin = profile?.role === 'admin' || profile?.email === 'dotthedart@gmail.com';
  const planLimits = PLAN_LIMITS[(profile?.plan || 'trial').toLowerCase()] || PLAN_LIMITS.trial;

  const handleNotesClickMobile = (e) => {
    setIsSidebarOpen(false);
  };

  const getInitials = () => {
    if (profile?.full_name) {
      const parts = profile.full_name.trim().split(/\s+/);
      return parts.map(p => p[0]).join('').substring(0, 2).toUpperCase();
    }
    if (profile?.email) {
      return profile.email.substring(0, 2).toUpperCase();
    }
    return 'RD';
  };

  return (
    <div className="app-container">
      {/* Mobile Top Bar */}
      <div className="mobile-top-bar">
        <button 
          className="hamburger-btn" 
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <span 
          className="logo-text" 
          onClick={() => { navigate('/dashboard'); setIsSidebarOpen(false); }} 
          style={{ cursor: 'pointer' }}
        >
          <img src="/reachdesk-logo.svg" alt="ReachDesk CRM" height="28" style={{objectFit: 'contain'}} />
        </span>
        <div style={{ width: 24 }}></div>
      </div>

      {/* Sidebar overlay backdrop for mobile */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <div className={`sidebar ${isSidebarOpen ? 'mobile-open' : ''}`}>
        <div>
          {/* Sidebar Logo — text only */}
          <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img src="/reachdesk-logo.svg" alt="ReachDesk CRM" height="28" style={{objectFit: 'contain'}} />
            </div>
            <button 
              className="hamburger-btn mobile-only-close" 
              onClick={() => setIsSidebarOpen(false)}
              style={{ display: 'none' }}
            >
              <XIcon size={20} />
            </button>
          </div>

          {/* Desktop-only Sidebar Menu */}
          <ul className="sidebar-menu desktop-only-menu">
            <li>
              <Link to="/dashboard" className={`sidebar-item ${pathname === '/dashboard' ? 'active' : ''}`}>
                <LayoutDashboard size={18} /><span className="nav-label">Dashboard</span>
              </Link>
            </li>
            
            <li>
              <Link to="/leads" className={`sidebar-item ${pathname === '/leads' ? 'active' : ''}`}>
                <Users size={18} /><span className="nav-label">CRM Leads</span>
              </Link>
            </li>
            
            <li>
              <Link to="/templates" className={`sidebar-item ${pathname === '/templates' ? 'active' : ''}`}>
                <BookOpen size={18} /><span className="nav-label">Templates</span>
              </Link>
            </li>
            
            <li>
              <Link to="/invoices" className={`sidebar-item ${pathname === '/invoices' ? 'active' : ''}`}>
                <Receipt size={18} /><span className="nav-label">Client Invoices</span>
              </Link>
            </li>
            
            <li>
              <Link to="/revenue" className={`sidebar-item ${pathname === '/revenue' ? 'active' : ''}`}>
                <TrendingUp size={18} /><span className="nav-label">Revenue Tracker</span>
              </Link>
            </li>

            <li>
              <Link 
                to="/notes" 
                className={`sidebar-item ${pathname === '/notes' ? 'active' : ''}`}
              >
                <FileText size={18} /><span className="nav-label">Notes</span>
              </Link>
            </li>

            <li>
              <Link 
                to="/reminders" 
                className={`sidebar-item ${pathname === '/reminders' ? 'active' : ''}`}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Bell size={18} /><span className="nav-label">Reminders</span>
                </div>
                {remindersCount > 0 && (
                  <span className="badge badge-pending" style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '50%' }}>
                    {remindersCount}
                  </span>
                )}
              </Link>
            </li>

            {/* Configuration — hidden for Starter plan */}
            {(profile?.plan ?? '').toLowerCase() !== 'starter' && (
              <li>
                <Link to="/settings" className={`sidebar-item ${pathname === '/settings' ? 'active' : ''}`}>
                  <Settings size={18} /><span className="nav-label">Configuration</span>
                </Link>
              </li>
            )}

            <li>
              <Link to="/upgrade" className={`sidebar-item ${pathname === '/upgrade' ? 'active' : ''}`}>
                <CreditCard size={18} /><span className="nav-label">{profile?.plan_status === 'active' ? 'Manage Plan' : 'Upgrade Plan'}</span>
              </Link>
            </li>

            {isAdmin && (
              <li>
                <Link
                  to="/admin"
                  className={`sidebar-item ${pathname === '/admin' ? 'active' : ''}`}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <ShieldAlert size={16} />
                    <span className="nav-label">Admin Panel</span>
                  </div>
                  {adminNotifCount > 0 && (
                    <span style={{ background: 'var(--status-hot)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 600 }}>
                      {adminNotifCount}
                    </span>
                  )}
                </Link>
              </li>
            )}

            <li>
              <div
                className="sidebar-item"
                onClick={handleLogout}
                style={{ marginTop: '1rem', borderTop: '0.5px solid var(--border)', paddingTop: '1rem', borderRadius: 0 }}
              >
                <LogOut size={16} style={{ color: 'var(--status-hot)' }} />
                <span className="nav-label" style={{ color: 'var(--status-hot)' }}>Log Out</span>
              </div>
            </li>
          </ul>

          {/* Mobile-only Sidebar Menu (Clean, Text-only, Filtered) */}
          <ul className="sidebar-menu mobile-only-menu">
            <li>
              <Link to="/invoices" onClick={() => setIsSidebarOpen(false)} className="mobile-menu-item">
                Client Invoices
              </Link>
            </li>
            
            <li>
              <Link to="/revenue" onClick={() => setIsSidebarOpen(false)} className="mobile-menu-item">
                Revenue Tracker
              </Link>
            </li>

            <li>
              <Link 
                to="/notes" 
                onClick={handleNotesClickMobile}
                className="mobile-menu-item"
              >
                Notes
              </Link>
            </li>

            {(profile?.plan ?? '').toLowerCase() !== 'starter' && (
              <li>
                <Link to="/settings" onClick={() => setIsSidebarOpen(false)} className="mobile-menu-item">
                  Configuration
                </Link>
              </li>
            )}

            <li>
              <Link to="/upgrade" onClick={() => setIsSidebarOpen(false)} className="mobile-menu-item">
                {profile?.plan_status === 'active' ? 'Manage Plan' : 'Upgrade Plan'}
              </Link>
            </li>

            {isAdmin && (
              <li>
                <Link to="/admin" onClick={() => setIsSidebarOpen(false)} className="mobile-menu-item" style={{ color: 'var(--primary-magenta)' }}>
                  Admin Panel
                </Link>
              </li>
            )}

            <li>
              <div
                className="mobile-menu-item"
                onClick={() => { handleLogout(); setIsSidebarOpen(false); }}
                style={{ cursor: 'pointer', color: 'var(--danger-color)', borderTop: '1px solid var(--border-color)', marginTop: '1rem', paddingTop: '1rem' }}
              >
                Log Out
              </div>
            </li>
          </ul>
        </div>

        <div className="sidebar-footer" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>WORKSPACE</span>
            <button
              onClick={toggleTheme}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
                transition: 'color 0.15s ease'
              }}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          <div className="user-info-card">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="Profile Avatar" 
                className="user-avatar"
                style={{ objectFit: 'cover' }} 
              />
            ) : (
              <div className="user-avatar">{getInitials()}</div>
            )}
            <div className="user-details" style={{ overflow: 'hidden' }}>
              <div className="user-name" title={profile?.full_name || profile?.email || 'Logged In'} style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px', fontWeight: 600 }}>
                {profile?.full_name || profile?.email || 'Logged In'}
              </div>
              <div className="user-role" title={profile?.full_name ? profile?.email : undefined} style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                {profile?.full_name ? profile.email : `${profile?.status?.toUpperCase()} • ${profile?.plan?.toUpperCase()}`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="main-content">
        {/* Trial banner — days remaining is derived from trial_ends_at stored in DB */}
        {profile?.plan === 'trial' && subStatus === 'active' && (() => {
          const msLeft = new Date(profile.trial_ends_at) - Date.now();
          const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
          const label = daysLeft === 0 ? 'less than a day' : daysLeft === 1 ? '1 day' : `${daysLeft} days`;
          return (
            <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '4px', padding: '0.75rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem' }}>
              <Clock size={14} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                <strong style={{ color: 'var(--accent-blue)' }}>Free Trial Active</strong>
                {' '}— Your trial ends in <strong style={{ color: 'var(--accent-blue)' }}>{label}</strong> ({new Date(profile.trial_ends_at).toLocaleDateString()}). Choose a plan in settings to avoid lock.
              </span>
            </div>
          );
        })()}
        {children}
      </div>
      {profile?.account_locked && (
        <UpgradeLockModal
          profile={profile}
          handleLogout={handleLogout}
          theme={theme}
        />
      )}
      
      {/* Mobile Bottom Navigation */}
      <MobileNav onOpenMenu={() => setIsSidebarOpen(prev => !prev)} />
    </div>
  );
}

