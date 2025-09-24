import { NavLink, useNavigate } from "react-router-dom";
import "./NavBar.css";

function NavBar() {
  const navigate = useNavigate();

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

  return (
    <div className="Navigation_Bar">
      <img src="/Amandla.png" alt="Logo" className="Logo" />

      <ul className="NavLinks">
        <li>
          <NavLink to="/LecturerDashboard" className={({ isActive }) => (isActive ? "active" : "")}>
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink to="/CreateCourse" className={({ isActive }) => (isActive ? "active" : "")}>
            Create A Course
          </NavLink>
        </li>
        <li>
          <NavLink to="/AddTopic" className={({ isActive }) => (isActive ? "active" : "")}>
            Add Topics
          </NavLink>
        </li>
        <li>
          <NavLink to="/AddStudents" className={({ isActive }) => (isActive ? "active" : "")}>
            Enroll Students
          </NavLink>
        </li>
        <li>
          <NavLink to="/StudentAnalytics" className={({ isActive }) => (isActive ? "active" : "")}>
            Student Analysis
          </NavLink>
        </li>
        <li>
          <NavLink to="/LecturerQuizHistory" className={({ isActive }) => (isActive ? "active" : "")}>
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
