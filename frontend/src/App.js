import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';

// Lecturer side
import AddStudents from "./Views/Lacture/AddStudents";
import CreateCourse from "./Views/Lacture/CreateCourse";
import Createquiz from "./Views/Lacture/Createquiz";
import LecturerDashboard from "./Views/Lacture/Dashboard";
import LecturerQuizHistory from "./Views/Lacture/QuizHistory";
import LecturerAnalytics from "./Views/Lacture/StudentAnalytics";

// Student side
import StudentDashboard from "./Views/Student/Dashboard";
import StudentAnalytics from "./Views/Student/StudentAnalytics";
import StudentAchievements from './Views/Student/Achievements';
import StudentQuizHistory from "./Views/Student/QuizHistory";
import Challenge from "./Views/Student/Challenge";

// Common
import Login from './Views/LogIn/Login';


function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* login */}
          <Route path="/" element={<Login />} />

          {/* Lecturer routes */}
          <Route path="/lecturer/dashboard" element={<LecturerDashboard />} />
          <Route path="/lecturer/addstudents" element={<AddStudents />} />
          <Route path="/lecturer/createquiz" element={<Createquiz />} />
          <Route path="/lecturer/quizhistory" element={<LecturerQuizHistory />} />
          <Route path="/lecturer/studentanalytics" element={<LecturerAnalytics />} />
          <Route path="/lecturer/createcourse" element={<CreateCourse />} />

          {/* Student routes */}
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/analytics" element={<StudentAnalytics />} />
          <Route path="/student/achievements" element={<StudentAchievements />} />
          <Route path="/student/quizhistory" element={<StudentQuizHistory />} />
          <Route path="/student/challenge" element={<Challenge />} />

        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
