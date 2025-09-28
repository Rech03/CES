import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./NavBar.css";

function NavBar() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = () => {
    const KEYS = ["token", "authToken", "accessToken", "auth_token", "Authorization", "user", "userInfo"];
    KEYS.forEach((k) => {
      try { localStorage.removeItem(k); } catch (_) {}
      try { sessionStorage.removeItem(k); } catch (_) {}
    });

    closeMenu(); // Close menu before navigating
    try {
      navigate("/Login");
    } catch {
      navigate("/");
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // Prevent body scroll when menu is open on mobile
  useEffect(() => {
    if (isMobile && isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen, isMobile]);

  // Close menu when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!isMobile) return;
      
      const navbar = document.querySelector('.Navigation_Bar');
      const hamburger = document.querySelector('.hamburger-menu');
      
      if (isMenuOpen && navbar && hamburger && 
          !navbar.contains(event.target) && 
          !hamburger.contains(event.target)) {
        closeMenu();
      }
    };

    if (isMenuOpen && isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMenuOpen, isMobile]);

  // Close menu on route change
  useEffect(() => {
    const handleRouteChange = () => {
      if (isMobile) {
        closeMenu();
      }
    };

    // Listen for route changes
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [isMobile]);

  // Handle link clicks on mobile
  const handleLinkClick = () => {
    if (isMobile) {
      closeMenu();
    }
  };

  return (
    <>
      {/* Hamburger Menu Button - Only show on mobile */}
      {isMobile && (
        <button 
          className={`hamburger-menu ${isMenuOpen ? 'active' : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
          type="button"
        >
          <div className="hamburger-icon">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
      )}

      {/* Overlay for mobile - Only show on mobile when menu is open */}
      {isMobile && (
        <div 
          className={`nav-overlay ${isMenuOpen ? 'active' : ''}`}
          onClick={closeMenu}
        />
      )}

      {/* Navigation Bar */}
      <div className={`Navigation_Bar ${isMobile && isMenuOpen ? 'mobile-open' : ''} ${isMobile && !isMenuOpen ? 'mobile-hidden' : ''}`}>
        <img src="/Amandla.png" alt="Logo" className="Logo" />

        <ul className="NavLinks">
          <li>
            <NavLink 
              to="/StudentDashboard" 
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={handleLinkClick}
            >
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/QnA" 
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={handleLinkClick}
            >
              Live QnA
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/Analytics" 
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={handleLinkClick}
            >
              Analytics
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/Achievements" 
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={handleLinkClick}
            >
              Achievements
            </NavLink>
          </li>
        </ul>

        <div className="NavActions">
          <button className="LogoutButton" onClick={handleLogout} aria-label="Log out" type="button">
            <svg className="LogoutIcon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 21H6a3 3 0 01-3-3V6a3 3 0 013-3h6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="LogoutText">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}

export default NavBar;