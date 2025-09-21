import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { getQuiz } from '../../api/quizzes';
import './QuizCountdownPage.css';

const QuizCountdownPage = () => {
  const [countdown, setCountdown] = useState(5);
  const [isReady, setIsReady] = useState(false);
  const [password, setPassword] = useState('');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quizDetails, setQuizDetails] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Get quiz data from navigation state or URL params
  const quizData = location.state || {
    quizId: searchParams.get('quizId') || 1,
    quizTitle: "Quiz",
    quizDuration: "15 minutes",
    totalQuestions: 20,
    difficulty: "Medium"
  };

  useEffect(() => {
    const fetchQuizDetails = async () => {
      setLoading(true);
      try {
        if (!quizData.quizId) {
          throw new Error('No quiz ID provided');
        }

        // Fetch quiz details from API
        const quizResponse = await getQuiz(quizData.quizId);
        const fetchedQuizDetails = quizResponse.data;

        setQuizDetails(fetchedQuizDetails);
        
        // Check if quiz requires password (live quizzes or password-protected)
        const requiresPassword = fetchedQuizDetails.is_live || 
                               fetchedQuizDetails.password_protected || 
                               fetchedQuizDetails.requires_password;
        
        setShowPasswordInput(requiresPassword);
        
        // If no password required, proceed directly to countdown
        if (!requiresPassword) {
          setIsPasswordVerified(true);
        }

        // Validate quiz availability
        if (!fetchedQuizDetails.is_live && fetchedQuizDetails.due_date) {
          const dueDate = new Date(fetchedQuizDetails.due_date);
          const now = new Date();
          
          if (now > dueDate) {
            throw new Error('This quiz is no longer available');
          }
        }

        if (fetchedQuizDetails.scheduled_start) {
          const startTime = new Date(fetchedQuizDetails.scheduled_start);
          const now = new Date();
          
          if (now < startTime) {
            throw new Error(`This quiz will be available from ${startTime.toLocaleString()}`);
          }
        }

      } catch (err) {
        console.error('Error fetching quiz details:', err);
        setError(err.message || 'Failed to load quiz details');
        
        // For development, continue with provided data as fallback
        if (process.env.NODE_ENV === 'development') {
          setIsPasswordVerified(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchQuizDetails();
  }, [quizData.quizId]);

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

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setPasswordError('Please enter a password');
      return;
    }

    // For live quizzes, the password is typically provided by the lecturer
    // In a real implementation, you might verify this with the backend
    try {
      // Simple validation - in production, this should be server-side
      if (quizDetails?.password && password !== quizDetails.password) {
        setPasswordError('Incorrect password. Please check with your lecturer.');
        setPassword('');
        return;
      }
      
      // For live quizzes without explicit password, accept any reasonable input
      if (quizDetails?.is_live && password.length >= 3) {
        setIsPasswordVerified(true);
        setShowPasswordInput(false);
        setPasswordError('');
      } else if (!quizDetails?.is_live || !quizDetails?.password) {
        // If no password is actually required, proceed
        setIsPasswordVerified(true);
        setShowPasswordInput(false);
        setPasswordError('');
      } else {
        setPasswordError('Invalid password. Contact your lecturer for assistance.');
        setPassword('');
      }
    } catch (err) {
      console.error('Error verifying password:', err);
      setPasswordError('Error verifying password. Please try again.');
    }
  };

  const handleStartQuiz = () => {
    // Navigate to quiz interface with complete quiz data
    const completeQuizData = {
      ...quizData,
      ...quizDetails,
      startTime: new Date().toISOString(),
      password: password || null,
      quizId: quizData.quizId || quizDetails?.id
    };

    navigate('/Quizinterface', {
      state: completeQuizData
    });
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  // Get quiz information with fallbacks
  const getQuizInfo = () => {
    const details = quizDetails || {};
    return {
      title: details.title || quizData.quizTitle || 'Quiz',
      duration: details.time_limit ? `${details.time_limit} minutes` : 
                quizData.quizDuration || '15 minutes',
      totalQuestions: details.total_questions || quizData.totalQuestions || 20,
      difficulty: details.difficulty || quizData.difficulty || 'Medium',
      description: details.description || null,
      timeLimit: details.time_limit || 15,
      isLive: details.is_live || quizData.isLive || false,
      dueDate: details.due_date,
      course: details.topic?.course?.name || 'Course',
      maxAttempts: details.max_attempts || 3
    };
  };

  const quizInfo = getQuizInfo();

  if (loading) {
    return (
      <div className="countdown-container">
        <div className="countdown-overlay"></div>
        <div className="countdown-content">
          <div className="loading-content">
            <div className="spinner"></div>
            <h2>Loading Quiz...</h2>
            <p>Preparing quiz details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !quizDetails) {
    return (
      <div className="countdown-container">
        <div className="countdown-overlay"></div>
        <div className="countdown-content">
          <div className="error-content">
            <h2>Quiz Not Available</h2>
            <p>{error}</p>
            <button onClick={handleGoBack} className="go-back-btn">
              Go Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="countdown-container">
      <div className="countdown-overlay"></div>
      
      <div className="countdown-content">
        <div className="quiz-info-header">
          <h1 className="quiz-title">{quizInfo.title}</h1>
          
          {quizInfo.isLive && (
            <div className="live-quiz-badge">
              <span className="live-dot"></span>
              Live Quiz
            </div>
          )}
          
          {quizData.isRetake && (
            <div className="retake-badge">Retake Attempt</div>
          )}
          
          <div className="quiz-course">
            <span>{quizInfo.course}</span>
          </div>
          
          <div className="quiz-meta-info">
            <div className="quiz-stat">
              <span className="stat-label">Duration:</span>
              <span className="stat-value">{quizInfo.duration}</span>
            </div>
            <div className="quiz-stat">
              <span className="stat-label">Questions:</span>
              <span className="stat-value">{quizInfo.totalQuestions}</span>
            </div>
            <div className="quiz-stat">
              <span className="stat-label">Difficulty:</span>
              <span className="stat-value">{quizInfo.difficulty}</span>
            </div>
          </div>

          {quizInfo.description && (
            <div className="quiz-description">
              <p>{quizInfo.description}</p>
            </div>
          )}

          {quizInfo.dueDate && (
            <div className="quiz-due-date">
              <strong>Due:</strong> {new Date(quizInfo.dueDate).toLocaleString()}
            </div>
          )}
        </div>

        {/* Password Input Section */}
        {showPasswordInput && (
          <div className="password-section">
            <div className="password-icon">🔒</div>
            <h2 className="password-title">
              {quizInfo.isLive ? 'Enter Live Quiz Password' : 'Enter Quiz Password'}
            </h2>
            <p className="password-subtitle">
              {quizInfo.isLive ? 
                'This is a live quiz session. Please enter the password provided by your lecturer.' :
                'Please enter the password provided by your lecturer to access this quiz.'
              }
            </p>
            
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
                Verify Password & Continue
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
                <p className="countdown-subtext">
                  {quizInfo.isLive ? 'Joining live quiz in...' : 'Quiz starts in...'}
                </p>
              </>
            ) : (
              <>
                <div className="ready-icon">🚀</div>
                <h2 className="ready-text">Ready to Begin!</h2>
                <p className="ready-subtext">
                  {quizInfo.isLive ? 
                    'Click below to join the live quiz session' :
                    'Click the button below to start your quiz'
                  }
                </p>
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
              {quizInfo.isLive && (
                <>
                  <li><strong>This is a live quiz - all students are taking it simultaneously</strong></li>
                  <li><strong>The quiz will automatically submit when the lecturer ends the session</strong></li>
                </>
              )}
              <li>You have {quizInfo.maxAttempts} total attempts for this quiz</li>
            </ul>
          </div>
        )}

        <div className="countdown-actions">
          {isReady ? (
            <button className="start-quiz-btn" onClick={handleStartQuiz}>
              {quizData.isRetake ? 'Start Retake' : 
               quizInfo.isLive ? 'Join Live Quiz' : 'Start Quiz Now'}
            </button>
          ) : null}
          
          <button className="go-back-btn" onClick={handleGoBack}>
            Go Back to Dashboard
          </button>
        </div>

        {error && quizDetails && (
          <div className="error-message">
            <small>Warning: {error}</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizCountdownPage;