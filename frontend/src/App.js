import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';

import AddStudents from "./Views/Lacture/AddStudents";
import AIQuizzes from './Views/Lacture/AIQuizzes';
import CreateCourse from "./Views/Lacture/CreateCourse";
import Createquiz from "./Views/Lacture/Createquiz";
import Dashboard from "./Views/Lacture/Dashboard";
import QuizHistory from "./Views/Lacture/QuizHistory";
import StudentAnalytics from "./Views/Lacture/StudentAnalytics";
import QuizAnalytics from './Views/Lacture/QuizAnalytics';
import Login from './Views/LogIn/Login';
function App() {
  return (
    <div className="App">
      <BrowserRouter>
        {/* Navigation bar can be placed here if needed on all pages */}
      

        {/* Routes */}
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/Dashboard" element={<Dashboard />} />
          <Route path="/AddStudents" element={<AddStudents />} />
          <Route path="/Createquiz" element={<Createquiz />} />
          <Route path="/QuizHistory" element={<QuizHistory />} />
          <Route path="/StudentAnalytics" element={<StudentAnalytics />} />
          <Route path="/CreateCourse" element={<CreateCourse />} />
          <Route path="/AIQuizzes" element={<AIQuizzes />} />
          <Route path="/QuizAnalytics" element={<QuizAnalytics />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
