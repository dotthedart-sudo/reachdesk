import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useAppContext } from '../App';
import { getAppUrl, getMarketingUrl, isLocalDev } from '../utils/domain';

import { BRAND_NAME, BRAND_LOGO_TEXT } from '../config/brand';

export default function PublicNav({ brandName = BRAND_NAME }) {
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
    }
  };

  const goHome = () => {
    if (isLocalDev()) navigate('/homepage');
    else window.location.href = getMarketingUrl('/homepage');
  };

  const handleSignUpClick = () => {
    if (isLocalDev()) {
      navigate(isLoggedIn ? '/dashboard' : '/signup');
    } else {
      window.location.href = getAppUrl(isLoggedIn ? '/dashboard' : '/signup');
    }
  };

  const handleLoginClick = () => {
    if (isLocalDev()) {
      navigate(isLoggedIn ? '/dashboard' : '/login');
    } else {
      window.location.href = getAppUrl(isLoggedIn ? '/dashboard' : '/login');
    }
  };

  return (
    <nav className="hp-nav">
      <div className="hp-nav-inner">
        <button
          type="button"
          className="hp-logo-btn"
          onClick={goHome}
          aria-label={`${brandName} home`}
        >
          <span className="hp-logo">{BRAND_LOGO_TEXT}</span>
        </button>

        <div className="hp-nav-center">
          <a
            href={getMarketingUrl('/homepage#features')}
            onClick={(e) => handleNavClick(e, '#features')}
            className="hp-nav-link"
          >
            Features
          </a>
          <a href={getAppUrl('/get-started')} className="hp-nav-link">
            Get Started
          </a>
          <a
            href={getMarketingUrl('/homepage#pricing')}
            onClick={(e) => handleNavClick(e, '#pricing')}
            className="hp-nav-link"
          >
            Pricing
          </a>
          <a href={getMarketingUrl('/blog')} className="hp-nav-link">
            Blog
          </a>
        </div>

        <div className="hp-nav-right">
          {toggleTheme && (
            <button
              type="button"
              onClick={toggleTheme}
              className="hp-theme-toggle"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          )}
          <button type="button" onClick={handleLoginClick} className="hp-nav-link">
            Log in
          </button>
          <button type="button" onClick={handleSignUpClick} className="hp-btn-primary hp-btn-nav">
            {isLoggedIn ? 'Dashboard' : 'Sign up'}
          </button>
        </div>
      </div>
    </nav>
  );
}
