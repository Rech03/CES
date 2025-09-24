import { NavLink, useNavigate } from "react-router-dom";
import "./NavBar.css";

function NavBar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Remove common token keys (covers your interceptor’s "Token xxx" case)
    const KEYS = ["token", "authToken", "accessToken", "auth_token", "Authorization", "user", "userInfo"];
    KEYS.forEach((k) => {
      try { localStorage.removeItem(k); } catch (_) {}
      try { sessionStorage.removeItem(k); } catch (_) {}
    });

    // Optional: if your API needs a server-side logout, call it here.
    // (kept client-only to avoid breaking if endpoint doesn’t exist)

    // Navigate to login
    try {
      navigate("/Login");
    } catch {
      navigate("/");
    }
  };

  return (
    <div className="Navigation_Bar">
      <img src="/Amandla.png" alt="Logo" className="Logo" />

      <ul className="NavLinks">
        <li>
          <NavLink to="/StudentDashboard" className={({ isActive }) => (isActive ? "active" : "")}>
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink to="/Analytics" className={({ isActive }) => (isActive ? "active" : "")}>
            Analytics
          </NavLink>
        </li>
        <li>
          <NavLink to="/Achievements" className={({ isActive }) => (isActive ? "active" : "")}>
            Achievements
          </NavLink>
        </li>
        <li>
          <NavLink to="/QuizHistory" className={({ isActive }) => (isActive ? "active" : "")}>
            Quiz History
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
  );
}

export default NavBar;
