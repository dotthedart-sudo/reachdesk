import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useAppContext } from '../App';

export default function PublicNav({ brandName = 'ReachDesk' }) {
  const { theme, toggleTheme, session } = useAppContext() || {};
  const isLoggedIn = !!session;
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleNavClick = (e, hash) => {
    if (pathname === '/homepage' || pathname === '/') {
      e.preventDefault();
      window.history.pushState(null, '', `/homepage${hash}`);
      const el = document.getElementById(hash.replace('#', ''));
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Allow default link behavior to navigate to /homepage#hash
    }
  };

  const handleSignUpClick = () => navigate(isLoggedIn ? '/dashboard' : '/signup');
  const handleLoginClick  = () => navigate(isLoggedIn ? '/dashboard' : '/login');

  return (
    <nav className="hp-nav">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => navigate('/homepage')}>
        <span style={{fontFamily:'Mattone, sans-serif', textTransform:'uppercase', letterSpacing:'0.08em', fontSize:'11px', color:'var(--text-primary)', fontWeight:'400'}}>{brandName}</span>
      </div>
      <div className="hp-nav-center">
        <a href="/homepage#features" onClick={(e) => handleNavClick(e, '#features')} className="hp-nav-link">Features</a>
        <Link to="/get-started" className="hp-nav-link" style={{ textDecoration: 'none' }}>Get Started</Link>
        <a href="/homepage#pricing" onClick={(e) => handleNavClick(e, '#pricing')}  className="hp-nav-link">Pricing</a>
        <Link to="/blog" className="hp-nav-link" style={{ textDecoration: 'none' }}>Blog</Link>
        <button onClick={handleLoginClick} className="hp-nav-link hp-nav-link-btn">Log in</button>
      </div>
      <div className="hp-nav-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {toggleTheme && (
          <button
            onClick={toggleTheme}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--hp-muted)', display: 'flex', alignItems: 'center', padding: '4px', transition: 'color 0.15s ease' }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--hp-text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--hp-muted)'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        )}
        <button onClick={handleSignUpClick} className="hp-btn-primary">
          {isLoggedIn ? 'Dashboard' : 'Sign up free'}
        </button>
      </div>
    </nav>
  );
}
