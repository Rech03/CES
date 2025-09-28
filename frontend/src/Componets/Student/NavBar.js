import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./NavBar.css";

function NavBar() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    const KEYS = ["token", "authToken", "accessToken", "auth_token", "Authorization", "user", "userInfo"];
    KEYS.forEach((k) => {
      try { localStorage.removeItem(k); } catch (_) {}
      try { sessionStorage.removeItem(k); } catch (_) {}
    });

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

  // Add/remove body class when menu state changes
  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add('nav-open');
    } else {
      document.body.classList.remove('nav-open');
    }
    
    return () => {
      document.body.classList.remove('nav-open');
    };
  }, [isMenuOpen]);

  // Close menu when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      const navbar = document.querySelector('.Navigation_Bar');
      const hamburger = document.querySelector('.hamburger-menu');
      
      if (isMenuOpen && navbar && hamburger && 
          !navbar.contains(event.target) && 
          !hamburger.contains(event.target)) {
        closeMenu();
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Close menu on route change
  useEffect(() => {
    closeMenu();
  }, [navigate]);

  return (
    <>
      {/* Hamburger Menu Button */}
      <button 
        className={`hamburger-menu ${isMenuOpen ? 'active' : ''}`}
        onClick={toggleMenu}
        aria-label="Toggle navigation menu"
      >
        <div className="hamburger-icon">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      {/* Overlay for mobile */}
      <div 
        className={`nav-overlay ${isMenuOpen ? 'active' : ''}`}
        onClick={closeMenu}
      />

      {/* Navigation Bar */}
      <div className={`Navigation_Bar ${isMenuOpen ? 'mobile-open' : ''}`}>
        <img src="/Amandla.png" alt="Logo" className="Logo" />

        <ul className="NavLinks">
          <li>
            <NavLink 
              to="/StudentDashboard" 
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={closeMenu}
            >
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/QnA" 
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={closeMenu}
            >
              Live QnA
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/Analytics" 
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={closeMenu}
            >
              Analytics
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/Achievements" 
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={closeMenu}
            >
              Achievements
            </NavLink>
          </li>
        </ul>

        <div className="NavActions">
          <button className="LogoutButton" onClick={handleLogout} aria-label="Log out">
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