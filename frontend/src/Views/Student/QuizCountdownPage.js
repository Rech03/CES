import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getQuiz } from '../../api/quizzes';
import { getAdaptiveQuiz } from '../../api/ai-quiz';
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
  
  // Get quiz data from navigation state
  const quizData = location.state || {
    quizTitle: "CSC3002F - Parallel Programming Quiz",
    quizDuration: "15 minutes",
    totalQuestions: 20,
    difficulty: "Medium",
    quizId: 1
  };

  useEffect(() => {
    const fetchQuizDetails = async () => {
      setLoading(true);
      try {
        let fetchedQuizDetails = null;

        // Fetch AI quiz details
        if (quizData.isAIGenerated && quizData.slideId) {
          const adaptiveResponse = await getAdaptiveQuiz(quizData.slideId);
          fetchedQuizDetails = adaptiveResponse.data;
        }
        // Fetch regular quiz details
        else if (quizData.quizId) {
          const quizResponse = await getQuiz(quizData.quizId);
          fetchedQuizDetails = quizResponse.data;
        }

        if (fetchedQuizDetails) {
          setQuizDetails(fetchedQuizDetails);
          
          // Check if quiz requires password
          const requiresPassword = fetchedQuizDetails.requires_password || 
                                 fetchedQuizDetails.password_protected || 
                                 fetchedQuizDetails.is_live;
          
          setShowPasswordInput(requiresPassword);
          
          // If no password required, proceed directly to countdown
          if (!requiresPassword) {
            setIsPasswordVerified(true);
          }
        }

      } catch (err) {
        console.error('Error fetching quiz details:', err);
        setError('Failed to load quiz details');
        // Continue with provided data as fallback
        setIsPasswordVerified(true);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizDetails();
  }, [quizData]);

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

    // For live quizzes or password-protected quizzes, verify password
    try {
      // In a real implementation, you would verify the password with the backend
      // For now, we'll check against common patterns or skip verification
      const expectedPassword = quizDetails?.password || 
                              quizDetails?.live_password || 
                              quizData.quizPassword || 
                              'quiz123';
      
      if (password === expectedPassword || !quizDetails?.requires_password) {
        setIsPasswordVerified(true);
        setShowPasswordInput(false);
        setPasswordError('');
      } else {
        setPasswordError('Incorrect password. Please contact your instructor.');
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
      password: password || null
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
    const details = quizDetails || quizData;
    return {
      title: details.title || details.quizTitle || 'Quiz',
      duration: details.duration || details.quizDuration || '15 minutes',
      totalQuestions: details.total_questions || details.totalQuestions || 20,
      difficulty: details.difficulty || 'Medium',
      description: details.description || null,
      timeLimit: details.time_limit || details.duration || 15
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
            <h2>Error Loading Quiz</h2>
            <p>{error}</p>
            <button onClick={handleGoBack} className="go-back-btn">
              Go Back
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
          {quizData.isAIGenerated && (
            <div className="ai-quiz-badge">AI Generated Quiz</div>
          )}
          {quizData.isRetake && (
            <div className="retake-badge">Retake Attempt</div>
          )}
          
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
        </div>

        {/* Password Input Section */}
        {showPasswordInput && (
          <div className="password-section">
            <div className="password-icon">🔒</div>
            <h2 className="password-title">Enter Quiz Password</h2>
            <p className="password-subtitle">
              {quizDetails?.is_live ? 
                'This is a live quiz. Please enter the password provided by your lecturer' :
                'Please enter the password provided by your lecturer'
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
              {quizData.isAIGenerated && (
                <li><strong>This AI quiz will adapt to your performance level</strong></li>
              )}
              {quizDetails?.is_live && (
                <li><strong>This is a live quiz session - all students are taking it simultaneously</strong></li>
              )}
            </ul>
          </div>
        )}

        <div className="countdown-actions">
          {isReady ? (
            <button className="start-quiz-btn" onClick={handleStartQuiz}>
              {quizData.isRetake ? 'Start Retake' : 
               quizData.isAIGenerated ? 'Start AI Quiz' : 'Start Quiz Now'}
            </button>
          ) : null}
          
          <button className="go-back-btn" onClick={handleGoBack}>
            Go Back
          </button>
        </div>

        {error && (
          <div className="error-message">
            <small>Warning: {error}</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizCountdownPage;