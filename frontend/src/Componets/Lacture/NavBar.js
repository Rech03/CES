import { NavLink } from "react-router-dom";
import "./NavBar.css";

function NavBar() {
  return (
    <div className="Navigation_Bar">
      <img src="/Amandla.png" alt="Logo" className="Logo" />
      <ul>
        <li>
          <NavLink to="/Dashboard" className={({ isActive }) => isActive ? "active" : ""}>
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink to="/CreateCourse" className={({ isActive }) => isActive ? "active" : ""}>
            Create A Course
          </NavLink>
        </li>
        <li>
          <NavLink to="/AddStudents" className={({ isActive }) => isActive ? "active" : ""}>
            Enroll Students
          </NavLink>
        </li>
        <li>
          <NavLink to="/Createquiz" className={({ isActive }) => isActive ? "active" : ""}>
            Create New Quiz
          </NavLink>
        </li>
        <li>
          <NavLink to="/LecturerAIQuizzes" className={({ isActive }) => isActive ? "active" : ""}>
            Create AI Quizzes
          </NavLink>
        </li>
        <li>
          <NavLink to="/StudentAnalytics" className={({ isActive }) => isActive ? "active" : ""}>
            Student Analysis
          </NavLink>
        </li>
        <li>
          <NavLink to="/LecturerQuizHistory" className={({ isActive }) => isActive ? "active" : ""}>
            Quiz History
          </NavLink>
        </li>
      </ul>
    </div>
  );
}

export default NavBar;
