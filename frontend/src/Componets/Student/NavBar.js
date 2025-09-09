import { NavLink } from "react-router-dom";
import "./NavBar.css";

function StudentNavBar() {
  return (
    <div className="Navigation_Bar">
      <img src="/Amandla.png" alt="Logo" className="Logo" />
      <ul>
        <li>
          <NavLink
            to="/student/dashboard"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/student/analytics"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            My Analytics
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/student/achievements"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Achievements
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/student/quizhistory"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Quiz History
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/student/challenge"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Challenges Yourself
          </NavLink>
        </li>
      </ul>
    </div>
  );
}

export default StudentNavBar;
