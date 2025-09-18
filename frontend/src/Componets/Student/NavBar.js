import { NavLink } from "react-router-dom";
import "./NavBar.css";

function NavBar() {
  return (
    <div className="Navigation_Bar">
      <img src="/Amandla.png" alt="Logo" className="Logo" />
      <ul>
        <li>
          <NavLink to="/StudentDashboard" className={({ isActive }) => isActive ? "active" : ""}>
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink to="/AIQuizzes" className={({ isActive }) => isActive ? "active" : ""}>
            AI Quizzes
          </NavLink>
        </li>
        <li>
          <NavLink to="/Analytics" className={({ isActive }) => isActive ? "active" : ""}>
            Analytics
          </NavLink>
        </li>
        <li>
          <NavLink to="/Achievements" className={({ isActive }) => isActive ? "active" : ""}>
            Achievements
          </NavLink>
        </li>

        <li>
          <NavLink to="/QuizHistory" className={({ isActive }) => isActive ? "active" : ""}>
            Quiz History
          </NavLink>
        </li>
      </ul>
    </div>
  );
}

export default NavBar;
