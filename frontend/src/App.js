import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';

import AddStudents from "./Views/Lacture/AddStudents";
import CreateCourse from "./Views/Lacture/CreateCourse";
import Createquiz from "./Views/Lacture/Createquiz";
import Dashboard from "./Views/Lacture/Dashboard";
import QuizHistory from "./Views/Lacture/QuizHistory";
import StudentAnalytics from "./Views/Lacture/StudentAnalytics";
import Login from './Views/LogIn/Login';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        {/* Navigation bar can be placed here if needed on all pages */}
      

        {/* Routes */}
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/add-students" element={<AddStudents />} />
          <Route path="/create-quiz" element={<Createquiz />} />
          <Route path="/quiz-history" element={<QuizHistory />} />
          <Route path="/student-analytics" element={<StudentAnalytics />} />
          <Route path="/create-course" element={<CreateCourse />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
