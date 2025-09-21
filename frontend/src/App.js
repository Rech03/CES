import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './App.css';

// Student Components
import STAchievements from './Views/Student/Achievements';
import STAIQuizzes from './Views/Student/AIQuizzes';
import STAnalytics from './Views/Student/Analytics';
import STDashboard from './Views/Student/Dashboard';
import STQuizCountdownPage from './Views/Student/QuizCountdownPage';
import STQuizInterface from './Views/Student/QuizInterface';
import STQuizResultsPage from './Views/Student/QuizResultsPage';
import STQuizHistory from "./Views/Student/QuizHistory";
import QuizAnalyticsPage from './Views/Student/QuizAnalyticsPage';

// Lecturer Components
import AddStudents from "./Views/Lacture/AddStudents";
import CreateCourse from "./Views/Lacture/CreateCourse";
import Createquiz from "./Views/Lacture/Createquiz";
import LecturerDashboard from "./Views/Lacture/Dashboard";
import LecturerQuizHistory from "./Views/Lacture/QuizHistory";
import LecturerAnalytics from "./Views/Lacture/StudentAnalytics";
import LecturerAIQuizzes from "./Views/Lacture/AIQuizzes";
import QuizzAnalytics from "./Views/Lacture/QuizAnalytics";
import AddTopic from './Componets/Lacture/AddTopic';
import AddTopicPage from './Views/Lacture/AddTopicPage';

// Common Components
import Login from './Views/LogIn/Login';
import { logout } from './api/auth';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles = [] }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        // Check for user session in both localStorage and sessionStorage
        const userSession = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
        
        if (userSession) {
          const parsedUser = JSON.parse(userSession);
          
          // Check if tokens exist (from auth.js)
          const access = localStorage.getItem('access') || sessionStorage.getItem('access');
          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
          
          if (!access && !token) {
            // No valid token found
            localStorage.removeItem('userSession');
            sessionStorage.removeItem('userSession');
            setUser(null);
            setLoading(false);
            return;
          }
          
          // Check session expiry (only if not remembered)
          if (!parsedUser.rememberMe) {
            const loginTime = new Date(parsedUser.loginTime);
            const now = new Date();
            const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
            
            // Session expires after 8 hours if not remembered
            if (hoursDiff > 8) {
              localStorage.removeItem('userSession');
              sessionStorage.removeItem('userSession');
              // Clear tokens as well
              ['access', 'refresh', 'token'].forEach((k) => {
                localStorage.removeItem(k);
                sessionStorage.removeItem(k);
              });
              setUser(null);
              setLoading(false);
              return;
            }
          }
          
          setUser(parsedUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error parsing user session:', error);
        // Clear all authentication data on error
        localStorage.removeItem('userSession');
        sessionStorage.removeItem('userSession');
        ['access', 'refresh', 'token'].forEach((k) => {
          localStorage.removeItem(k);
          sessionStorage.removeItem(k);
        });
        setUser(null);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'Poppins, sans-serif',
        flexDirection: 'column',
        gap: '20px',
        background: 'rgb(250, 250, 247)'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #1935CA',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <div style={{ color: '#1935CA', fontSize: '16px', fontWeight: '500' }}>
          Authenticating...
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const redirectPath = user.role === 'student' ? '/StudentDashboard' : '/LecturerDashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

// Role-based Dashboard Redirect Component
function DashboardRedirect() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userSession = localStorage.getItem('userSession');
    if (userSession) {
      try {
        const parsedUser = JSON.parse(userSession);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user session:', error);
        localStorage.removeItem('userSession');
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'Poppins, sans-serif'
      }}>
        <div>Redirecting...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const redirectPath = user.role === 'student' ? '/StudentDashboard' : '/LecturerDashboard';
  return <Navigate to={redirectPath} replace />;
}

// Logout Component
function Logout() {
  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Call API logout endpoint
        await logout();
      } catch (error) {
        console.error('Logout API error:', error);
      } finally {
        // Always clear local session regardless of API response
        localStorage.removeItem('userSession');
        sessionStorage.removeItem('userSession');
        // Clear all auth tokens
        ['access', 'refresh', 'token'].forEach((k) => {
          localStorage.removeItem(k);
          sessionStorage.removeItem(k);
        });
        window.location.href = '/';
      }
    };
    
    handleLogout();
  }, []);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'Poppins, sans-serif',
      background: 'rgb(250, 250, 247)'
    }}>
      <div style={{ color: '#1935CA', fontSize: '16px' }}>Logging out...</div>
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/logout" element={<Logout />} />
          
          {/* General Dashboard Route that redirects based on role */}
          <Route path="/Dashboard" element={<DashboardRedirect />} />

          {/* Student Routes */}
          <Route 
            path="/StudentDashboard" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <STDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/Achievements" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <STAchievements />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/AIQuizzes" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <STAIQuizzes />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/Analytics" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <STAnalytics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/QuizCountdownPage" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <STQuizCountdownPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/QuizHistory" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <STQuizHistory />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/QuizInterface" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <STQuizInterface />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/QuizResultsPage" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <STQuizResultsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/QuizAnalyticsPage" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <QuizAnalyticsPage />
              </ProtectedRoute>
            } 
          />

          {/* AI Quiz Routes for Students - using your existing components */}
          <Route 
            path="/AIQuizCountdownPage" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <STQuizCountdownPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/AIQuizInterface" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <STQuizInterface />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/AIQuizResultsPage" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <STQuizResultsPage />
              </ProtectedRoute>
            } 
          />

          {/* Lecturer Routes */}
          <Route 
            path="/LecturerDashboard" 
            element={
              <ProtectedRoute allowedRoles={['lecturer', 'teacher', 'instructor']}>
                <LecturerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/AddStudents" 
            element={
              <ProtectedRoute allowedRoles={['lecturer', 'teacher', 'instructor']}>
                <AddStudents />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/CreateQuiz" 
            element={
              <ProtectedRoute allowedRoles={['lecturer', 'teacher', 'instructor']}>
                <Createquiz />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/CreateCourse" 
            element={
              <ProtectedRoute allowedRoles={['lecturer', 'teacher', 'instructor']}>
                <CreateCourse />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/LecturerQuizHistory" 
            element={
              <ProtectedRoute allowedRoles={['lecturer', 'teacher', 'instructor']}>
                <LecturerQuizHistory />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/StudentAnalytics" 
            element={
              <ProtectedRoute allowedRoles={['lecturer', 'teacher', 'instructor']}>
                <LecturerAnalytics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/LecturerAIQuizzes" 
            element={
              <ProtectedRoute allowedRoles={['lecturer', 'teacher', 'instructor']}>
                <LecturerAIQuizzes />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/QuizzAnalytics" 
            element={
              <ProtectedRoute allowedRoles={['lecturer', 'teacher', 'instructor']}>
                <QuizzAnalytics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/AddTopic" 
            element={
              <ProtectedRoute allowedRoles={['lecturer', 'teacher', 'instructor']}>
                <AddTopicPage />
              </ProtectedRoute>
            } 
          />

          {/* Catch all route - redirect to login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;