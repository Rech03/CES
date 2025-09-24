import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { getAdaptiveQuiz, checkQuizAccess } from '../../api/ai-quiz';
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
    quizId: searchParams.get('quizId'), // This should be the adaptive quiz ID from published quiz
    slideId: searchParams.get('slideId'),
    quizTitle: "Quiz",
    quizDuration: "15 minutes",
    totalQuestions: 5,
    difficulty: "Medium"
  };

  // Debug logging
  console.log('QuizCountdownPage - quizData received:', quizData);
  console.log('QuizCountdownPage - adaptive quizId:', quizData.quizId);
  console.log('QuizCountdownPage - slideId:', quizData.slideId);

  useEffect(() => {
    const fetchQuizDetails = async () => {
      setLoading(true);
      try {
        // Validate that we have the correct adaptive quiz ID
        if (!quizData.quizId || quizData.quizId === 'undefined' || quizData.quizId === 'null') {
          throw new Error('No valid adaptive quiz ID provided. Please select a published quiz from the dashboard.');
        }

        console.log('Fetching published quiz details for adaptive quiz ID:', quizData.quizId);

        // Check quiz access first using the adaptive quiz ID
        const accessResponse = await checkQuizAccess(quizData.quizId);
        const canAccess = accessResponse.data?.can_access !== false;
        
        if (!canAccess) {
          throw new Error('You do not have access to this published quiz. It may have been unpublished or restricted.');
        }

        // Fetch published quiz details using the adaptive quiz ID
        const quizResponse = await getAdaptiveQuiz(quizData.quizId);
        const fetchedQuizDetails = quizResponse.data;

        console.log('Published quiz details from adaptive API:', fetchedQuizDetails);
        setQuizDetails(fetchedQuizDetails);
        
        // Validate this is actually a published quiz
        if (!fetchedQuizDetails.is_published && !fetchedQuizDetails.published) {
          console.warn('Quiz may not be properly published:', fetchedQuizDetails);
        }
        
        // Check if quiz requires password (live quizzes or password-protected)
        const requiresPassword = fetchedQuizDetails.is_live || 
                               fetchedQuizDetails.password_protected || 
                               fetchedQuizDetails.requires_password ||
                               fetchedQuizDetails.password;
        
        setShowPasswordInput(requiresPassword);
        
        // If no password required, proceed directly to countdown
        if (!requiresPassword) {
          setIsPasswordVerified(true);
        }

        // Validate quiz availability and timing
        if (fetchedQuizDetails.scheduled_start) {
          const startTime = new Date(fetchedQuizDetails.scheduled_start);
          const now = new Date();
          
          if (now < startTime) {
            throw new Error(`This quiz will be available from ${startTime.toLocaleString()}`);
          }
        }

        if (fetchedQuizDetails.due_date) {
          const dueDate = new Date(fetchedQuizDetails.due_date);
          const now = new Date();
          
          if (now > dueDate) {
            throw new Error('This quiz is no longer available - deadline has passed');
          }
        }

        // Check if student has exceeded attempt limits
        if (fetchedQuizDetails.max_attempts && fetchedQuizDetails.attempts_used >= fetchedQuizDetails.max_attempts) {
          throw new Error(`You have used all ${fetchedQuizDetails.max_attempts} attempts for this quiz`);
        }

      } catch (err) {
        console.error('Error fetching published quiz details:', err);
        setError(err.message || 'Failed to load published quiz details');
        
        // Don't use fallback for production - students should only access properly published quizzes
        if (process.env.NODE_ENV === 'development') {
          console.warn('Development mode: Using fallback data');
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

    try {
      // For published AI quizzes, password verification
      if (quizDetails?.password && password !== quizDetails.password) {
        setPasswordError('Incorrect password. Please check with your lecturer.');
        setPassword('');
        return;
      }
      
      // For live AI quizzes without explicit password, accept reasonable input
      if (quizDetails?.is_live && password.length >= 3) {
        setIsPasswordVerified(true);
        setShowPasswordInput(false);
        setPasswordError('');
      } else if (!quizDetails?.password) {
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
    // Navigate to AI quiz interface with complete published quiz data
    const completeQuizData = {
      ...quizData,
      ...quizDetails,
      startTime: new Date().toISOString(),
      password: password || null,
      // CRITICAL: Use the adaptive quiz ID for the quiz interface
      quizId: quizData.quizId, // This is the adaptive/published quiz ID
      slideId: quizData.slideId, // Keep slide ID for reference
      isAIQuiz: true,
      isPublishedQuiz: true // Flag to indicate this is a published quiz
    };

    console.log('Starting published AI quiz with adaptive quiz ID:', completeQuizData);

    navigate('/Quizinterface', {
      state: completeQuizData
    });
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  // Get quiz information with fallbacks, prioritizing published quiz details
  const getQuizInfo = () => {
    const details = quizDetails || {};
    return {
      title: details.title || 
             details.slide_title ||
             quizData.quizTitle || 
             quizData.title || 
             'Published Quiz',
      
      duration: details.time_limit ? `${details.time_limit} minutes` : 
                quizData.quizDuration || '15 minutes',
      
      totalQuestions: details.questions?.length ||
                     details.total_questions || 
                     details.questions_count ||
                     quizData.totalQuestions || 
                     5,
    
      description: details.description || 
                  `This is a published adaptive quiz based on: ${details.topic?.name || details.subject?.name || 'course content'}`,
      
      timeLimit: details.time_limit || 15,
      isLive: details.is_live || quizData.isLive || false,
      dueDate: details.due_date,
      
      course: details.topic?.course?.name || 
             details.subject?.course?.name ||
             details.course?.name ||
             quizData.courseCode ||
             'Course',
      
      topic: details.topic?.name || 
            details.subject?.name ||
            details.topic_name ||
            quizData.topicName ||
            'Topic',
      
      maxAttempts: details.max_attempts || 3,
      attemptsUsed: details.attempts_used || 0,
      difficulty: details.difficulty || details.level || quizData.difficulty || 'Medium',
      isPublished: details.is_published || details.published || true
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
            <h2>Loading Published Quiz...</h2>
            <p>Preparing adaptive quiz details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !quizDetails && process.env.NODE_ENV !== 'development') {
    return (
      <div className="countdown-container">
        <div className="countdown-overlay"></div>
        <div className="countdown-content">
          <div className="error-content">
            <h2>Published Quiz Not Available</h2>
            <p>{error}</p>
            <div className="error-suggestions">
              <h4>Possible reasons:</h4>
              <ul>
                <li>The quiz has been unpublished by your lecturer</li>
                <li>You've exceeded the maximum number of attempts</li>
                <li>The quiz deadline has passed</li>
                <li>Access has been restricted</li>
              </ul>
            </div>
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
          
          <div className="quiz-badges">
            <div className="published-badge">
              Published Quiz
            </div>
            
            {quizInfo.isLive && (
              <div className="live-quiz-badge">
                <span className="live-dot"></span>
                Live Session
              </div>
            )}
            
            {quizData.isRetake && (
              <div className="retake-badge">Retake Attempt</div>
            )}
          </div>
          
          <div className="quiz-course">
            <span>{quizInfo.course} - {quizInfo.topic}</span>
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
            <div className="quiz-stat">
              <span className="stat-label">Attempts:</span>
              <span className="stat-value">{quizInfo.attemptsUsed}/{quizInfo.maxAttempts}</span>
            </div>
          </div>

          <div className="quiz-description">
            <p>{quizInfo.description}</p>
          </div>

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
                'Please enter the password provided by your lecturer to access this published quiz.'
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
                  {quizInfo.isLive ? 'Joining live quiz in...' : 'Published quiz starts in...'}
                </p>
              </>
            ) : (
              <>
                <div className="ready-icon">🚀</div>
                <h2 className="ready-text">Ready to Begin!</h2>
                <p className="ready-subtext">
                  {quizInfo.isLive ? 
                    'Click below to join the live quiz session' :
                    'Click the button below to start your adaptive quiz'
                  }
                </p>
                
                {quizData.isRetake && (
                  <div className="retake-info">
                    <p><strong>This is a retake attempt.</strong></p>
                    <p>Your best score will be kept regardless of this attempt's outcome.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="countdown-actions">
          {isReady ? (
            <button className="start-quiz-btn" onClick={handleStartQuiz}>
              {quizData.isRetake ? 'Start Retake' : 
               quizInfo.isLive ? 'Join Live Quiz' : 'Start Published Quiz'}
            </button>
          ) : null}
          
          <button className="go-back-btn" onClick={handleGoBack}>
            Go Back to Dashboard
          </button>
        </div>

        {/* Additional Information */}
        <div className="quiz-additional-info">
          <div className="adaptive-info">
            <h4>About This Adaptive Quiz:</h4>
            <ul>
              <li>Questions adapt to your performance in real-time</li>
              <li>Your responses influence the difficulty of subsequent questions</li>
              <li>This helps provide a personalized learning experience</li>
              <li>All attempts count toward your learning progress</li>
            </ul>
          </div>
        </div>

        {error && quizDetails && (
          <div className="error-message">
            <small>Warning: {error}</small>
          </div>
        )}

        {process.env.NODE_ENV === 'development' && error && (
          <div className="dev-warning">
            <small>Development Mode: Proceeding with fallback data</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizCountdownPage;