import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';

// Lecturer side

/*
import AddStudents from "./Views/Lacture/AddStudents";
import CreateCourse from "./Views/Lacture/CreateCourse";
import Createquiz from "./Views/Lacture/Createquiz";
import Dashboard from "./Views/Lacture/Dashboard";
import LecturerQuizHistory from "./Views/Lacture/QuizHistory";
import LecturerAnalytics from "./Views/Lacture/StudentAnalytics";
import AIQuizzes from "./Views/Lacture/AIQuizzes";
import QuizzAnalytics from "./Views/Lacture/QuizAnalytics"
*/
import STAchievements from './Views/Student/Achievements';
import STAIQuizzes from './Views/Student/AIQuizzes';
import STAnalytics from './Views/Student/Analytics';
import STDashboard  from './Views/Student/Dashboard';
import STQuizCountdownPage from './Views/Student/QuizCountdownPage';
import STQuizInterface from './Views/Student/QuizInterface';
import STQuizResultsPage from './Views/Student/QuizResultsPage';
import STQuizHistory from "./Views/Student/QuizHistory";
import QuizAnalyticsPage from './Views/Student/QuizAnalyticsPage';


// Common
import Login from './Views/LogIn/Login';


function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* login */}
          <Route path="/" element={<Login />} />

          {/* Lecturer routes 
          <Route path="/Dashboard" element={<Dashboard />} />
          <Route path="/addstudents" element={<AddStudents />} />
          <Route path="/createquiz" element={<Createquiz />} />
          <Route path="/quizhistory" element={<LecturerQuizHistory />} />
          <Route path="/studentanalytics" element={<LecturerAnalytics />} />
          <Route path="/createcourse" element={<CreateCourse />} />
          <Route path="/AIQuizzes" element={<AIQuizzes />} />
          <Route path="/QuizzAnalytics" element={<QuizzAnalytics />} />
          */}
           <Route path="/Achievements" element={<STAchievements />} />
          <Route path="/AIQuizzes" element={<STAIQuizzes />} />
          <Route path="/Analytics" element={<STAnalytics />} />
          <Route path="/Dashboard" element={<STDashboard />} />
          <Route path="/QuizCountdownPage" element={<STQuizCountdownPage />} />
          <Route path="/QuizHistory" element={<STQuizHistory />} />
          <Route path="/QuizInterface" element={<STQuizInterface />} />
          <Route path="/QuizResultsPage" element={<STQuizResultsPage />} />
           <Route path="/QuizAnalyticsPage" element={<QuizAnalyticsPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
