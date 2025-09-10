import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './QuizCountdownPage.css';

const QuizCountdownPage = () => {
  const [countdown, setCountdown] = useState(5);
  const [isReady, setIsReady] = useState(false);
  const [password, setPassword] = useState('');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(true);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get quiz data from navigation state
  const quizData = location.state || {
    quizTitle: "CSC3002F - Parallel Programming Quiz",
    quizDuration: "15 minutes",
    totalQuestions: 20,
    difficulty: "Medium",
    quizId: 1,
    quizPassword: "quiz123" // This would come from the backend
  };

  useEffect(() => {
    if (isPasswordVerified && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isPasswordVerified && countdown === 0) {
      setIsReady(true);
    }
  }, [countdown, isPasswordVerified]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    // In a real app, this would verify against the backend
    if (password === quizData.quizPassword || password === "quiz123") {
      setIsPasswordVerified(true);
      setShowPasswordInput(false);
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  const handleStartQuiz = () => {
    // Navigate to quiz interface with quiz data
    navigate('/Quizinterface', {
      state: {
        ...quizData,
        startTime: new Date().toISOString()
      }
    });
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="countdown-container">
      <div className="countdown-overlay"></div>
      
      <div className="countdown-content">
        <div className="quiz-info-header">
          <h1 className="quiz-title">{quizData.quizTitle}</h1>
          
        </div>

        {/* Password Input Section */}
        {showPasswordInput && (
          <div className="password-section">
            <div className="password-icon">🔐</div>
            <h2 className="password-title">Enter Quiz Password</h2>
            <p className="password-subtitle">Please enter the password provided by your lecturer</p>
            
            <form onSubmit={handlePasswordSubmit} className="password-form">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="password-input"
                required
              />
              {passwordError && (
                <div className="password-error">{passwordError}</div>
              )}
              <button type="submit" className="verify-password-btn">
                Verify Password
              </button>
            </form>
          </div>
        )}

        {/* Countdown Section */}
        {isPasswordVerified && (
          <div className="countdown-section">
            {countdown > 0 ? (
              <>
                <div className="countdown-circle">
                  <div className="countdown-number">{countdown}</div>
                </div>
                <h2 className="countdown-text">Get Ready!</h2>
                <p className="countdown-subtext">Quiz starts in...</p>
              </>
            ) : (
              <>
                <div className="ready-icon">🚀</div>
                <h2 className="ready-text">Ready to Begin!</h2>
                <p className="ready-subtext">Click the button below to start your quiz</p>
              </>
            )}
          </div>
        )}

        {/* Instructions */}
        {isPasswordVerified && (
          <div className="quiz-instructions">
            <h3>Instructions:</h3>
            <ul>
              <li>Read each question carefully before answering</li>
              <li>You can navigate between questions using the navigation buttons</li>
              <li>Make sure to submit your quiz before time runs out</li>
              <li>You cannot pause the quiz once it starts</li>
              {quizData.isRetake && (
                <li><strong>This is a retake attempt - your best score will be kept</strong></li>
              )}
            </ul>
          </div>
        )}

        <div className="countdown-actions">
          {isReady ? (
            <button className="start-quiz-btn" onClick={handleStartQuiz}>
              {quizData.isRetake ? 'Start Retake' : 'Start Quiz Now'}
            </button>
          ) : null}
          
          <button className="go-back-btn" onClick={handleGoBack}>
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizCountdownPage;