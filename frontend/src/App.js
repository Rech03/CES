import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';

// Lecturer side
import AddStudents from "./Views/Lacture/AddStudents";
import CreateCourse from "./Views/Lacture/CreateCourse";
import Createquiz from "./Views/Lacture/Createquiz";
import Dashboard from "./Views/Lacture/Dashboard";
import LecturerQuizHistory from "./Views/Lacture/QuizHistory";
import LecturerAnalytics from "./Views/Lacture/StudentAnalytics";



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
          <Route path="/Dashboard" element={<Dashboard />} />
          <Route path="/addstudents" element={<AddStudents />} />
          <Route path="/createquiz" element={<Createquiz />} />
          <Route path="/quizhistory" element={<LecturerQuizHistory />} />
          <Route path="/studentanalytics" element={<LecturerAnalytics />} />
          <Route path="/createcourse" element={<CreateCourse />} />

          
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
