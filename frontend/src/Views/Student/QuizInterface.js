import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAdaptiveQuiz, submitAdaptiveQuiz, studentAdaptiveProgress } from '../../api/ai-quiz';
import MultipleChoiceQuestion from '../../Componets/Student/MultipleChoiceQuestion';
import './QuizInterface.css';

const QuizInterface = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const stateData = location.state || {};
  const search = new URLSearchParams(location.search);
  const quizIdFromQuery = search.get('quizId');
  const slideIdFromQuery = search.get('slideId');

  const [quizEnv, setQuizEnv] = useState({
    quizTitle: stateData.quizTitle || 'Quiz',
    quizDuration: stateData.quizDuration || '15 min',
    totalQuestions: stateData.totalQuestions || 5,
    quizId: stateData.quizId || (quizIdFromQuery ? Number(quizIdFromQuery) : null),
    slideId: stateData.slideId || (slideIdFromQuery ? Number(slideIdFromQuery) : null),
    isLive: !!stateData.isLive,
    time_limit: stateData.time_limit
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState(null);
  const [resolvedTitle, setResolvedTitle] = useState(quizEnv.quizTitle);
  const [currentAttempts, setCurrentAttempts] = useState(0);
  const [quizDifficulty, setQuizDifficulty] = useState(null);
  const [isPracticeMode, setIsPracticeMode] = useState(false);

  const getSecondsFromDuration = (duration) => {
    if (typeof duration === 'number') return duration * 60;
    if (typeof duration === 'string') {
      const m = duration.match(/(\d+)\s*min/i);
      return m ? parseInt(m[1], 10) * 60 : 900;
    }
    return 900;
  };

  const [timeRemaining, setTimeRemaining] = useState(getSecondsFromDuration(quizEnv.time_limit || quizEnv.quizDuration));

  // Normalize question from API
  const normalizeQuestion = (q, index) => {
    let choices = [];
    
    // The API returns 'options' as an object with keys A, B, C, D
    if (q.options && typeof q.options === 'object') {
      // Convert object to array: {A: "text", B: "text"} -> [{id: 1, text: "text"}, ...]
      const optionKeys = Object.keys(q.options).sort(); // Sort to ensure A, B, C, D order
      choices = optionKeys.map((key, idx) => ({
        id: idx + 1,
        letter: key,
        text: q.options[key],
        is_correct: false // We don't know which is correct during quiz taking
      }));
    }
    // Fallback: check for other possible formats
    else if (Array.isArray(q.choices)) {
      choices = q.choices.map((choice, i) => ({
        id: choice.id || i + 1,
        letter: String.fromCharCode(65 + i),
        text: choice.text || choice.choice_text || String(choice),
        is_correct: false
      }));
    }

    return {
      id: q.id || q.question_id || index + 1,
      type: 'multiple_choice',
      question: q.question || q.question_text || `Question ${index + 1}`,
      choices: choices,
      points: q.points || 1,
      question_number: q.question_number ?? index,
      difficulty: q.difficulty || 'medium',
      explanation: q.explanation || null,
    };
  };

  // Check current attempts for this quiz
  const checkAttempts = async (qid) => {
    try {
      const { data: progress } = await studentAdaptiveProgress();
      const attemptsRaw = Array.isArray(progress) 
        ? progress 
        : progress?.attempts || progress?.recent_attempts || [];
      
      const quizAttempts = attemptsRaw.filter(a => 
        (a.adaptive_quiz_id || a.quiz_id) === qid
      );
      
      return quizAttempts.length;
    } catch (e) {
      console.warn('Failed to check attempts:', e);
      return 0;
    }
  };

  // Load quiz data
  const fetchQuiz = async (qid) => {
    try {
      const res = await getAdaptiveQuiz(qid);
      const data = res.data;

      console.log('Full API Response:', data);

      setResolvedTitle(data?.title || data?.name || quizEnv.quizTitle);
      setQuizDifficulty((data?.difficulty || '').toLowerCase());
      setTimeRemaining(getSecondsFromDuration(data?.time_limit || quizEnv.time_limit || quizEnv.quizDuration));

      // Extract questions
      let qs = [];
      if (Array.isArray(data?.questions)) {
        qs = data.questions;
      } else if (Array.isArray(data?.adaptive_questions)) {
        qs = data.adaptive_questions;
      }

      if (qs.length === 0) {
        throw new Error('No questions found in this quiz.');
      }

      const processed = qs.map((q, idx) => normalizeQuestion(q, idx));
      
      console.log('Processed questions with choices:', processed);
      
      // Validate that we have choices
      const questionsWithoutChoices = processed.filter(q => !q.choices || q.choices.length === 0);
      if (questionsWithoutChoices.length > 0) {
        console.error('Questions missing choices:', questionsWithoutChoices);
        throw new Error('Questions are missing answer choices.');
      }
      
      setQuestions(processed);
      
      // Check attempts
      const attempts = await checkAttempts(qid);
      setCurrentAttempts(attempts);
      
      // Check if in practice mode (more than 3 attempts)
      if (attempts >= 3) {
        setIsPracticeMode(true);
      }
    } catch (err) {
      console.error('Error fetching quiz:', err);
      throw err;
    }
  };

  // Initial load
  useEffect(() => {
    const loadQuiz = async () => {
      try {
        setLoading(true);
        setFatalError(null);

        let qid = quizEnv.quizId;

        if (!qid) {
          setFatalError('No quiz ID provided. Please select a quiz from the dashboard.');
          setLoading(false);
          return;
        }

        await fetchQuiz(qid);
      } catch (err) {
        console.error('Quiz load error:', err);
        const serverMsg = err?.response?.data?.error || err?.response?.data?.detail || err?.message;
        setFatalError(serverMsg || 'Failed to load quiz');
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer
  useEffect(() => {
    if (timeRemaining > 0 && !isSubmitted && !loading && !fatalError) {
      const t = setTimeout(() => setTimeRemaining((prev) => prev - 1), 1000);
      return () => clearTimeout(t);
    }
    if (timeRemaining === 0 && !isSubmitted && !fatalError) {
      handleSubmitQuiz();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, isSubmitted, loading, fatalError]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (answer) => {
    const curr = questions[currentQuestionIndex];
    setAnswers((prev) => ({ ...prev, [curr.id]: answer }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    setIsSubmitted(true);
    setShowSubmitModal(false);

    try {
      const adaptiveQuizId = Number(quizEnv.quizId);

      if (!adaptiveQuizId || isNaN(adaptiveQuizId)) {
        setIsSubmitted(false);
        setFatalError('Cannot submit: missing quiz ID.');
        return;
      }

      // Convert answers to letter format (A, B, C, D)
      const answersDict = {};
      
      questions.forEach((question, questionIndex) => {
        const userAnswer = answers[question.id];
        
        if (userAnswer !== undefined && userAnswer !== null) {
          const choiceIndex = question.choices.findIndex(
            choice => String(choice.id) === String(userAnswer)
          );
          
          if (choiceIndex >= 0) {
            const letterAnswer = String.fromCharCode(65 + choiceIndex);
            answersDict[`question_${questionIndex}`] = letterAnswer;
          }
        }
      });

      // PRACTICE MODE: If more than 3 attempts, don't submit to backend
      if (isPracticeMode) {
        console.log('Practice mode - not submitting to backend');
        
        // Calculate score locally
        let correctCount = 0;
        const localExplanations = [];
        
        questions.forEach((question, idx) => {
          const userAnswer = answersDict[`question_${idx}`];
          // We don't have correct answers on frontend, so we can't calculate accurate score
          // Just show that it was recorded
          localExplanations.push({
            index: idx,
            question: question.question,
            choices: question.choices,
            is_correct: null, // Unknown in practice mode
          });
        });
        
        // Navigate to results with practice mode data
        navigate('/QuizResultsPage', {
          state: {
            score: null, // Can't calculate without correct answers
            correct_count: null,
            total_questions: questions.length,
            time_taken: getSecondsFromDuration(quizEnv.quizDuration) - timeRemaining,
            practice_mode: true,
            attempt_number: currentAttempts + 1,
            show_explanation: false, // Can't show explanations without backend
            questions,
            answers,
            answersDict,
            explanations: localExplanations,
            quizData: {
              ...quizEnv,
              quizId: adaptiveQuizId,
              quizTitle: resolvedTitle,
              difficulty: quizDifficulty
            },
            feedback: 'Practice mode: Your answers have been recorded but not graded. Only your first 3 attempts count toward your grade.'
          }
        });
        return;
      }

      // GRADED MODE: Submit to backend for attempts 1-3
      const payload = {
        adaptive_quiz_id: adaptiveQuizId,
        answers: answersDict
      };

      if (quizEnv.slideId) {
        payload.slide_id = quizEnv.slideId;
      }

      console.log('Submitting quiz with payload:', payload);
      console.log('Answers being submitted:', answersDict);

      const submitResp = await submitAdaptiveQuiz(payload);
      const resultData = submitResp.data;

      console.log('Quiz submission response:', resultData);

      const attemptNumber = resultData.attempt_number || currentAttempts + 1;

      // Navigate to results with all data
      navigate('/QuizResultsPage', {
        state: {
          ...resultData,
          questions,
          answers,
          answersDict,
          quizData: {
            ...quizEnv,
            quizId: adaptiveQuizId,
            quizTitle: resolvedTitle,
            difficulty: quizDifficulty
          },
          attempts_meta: {
            attempt_number: attemptNumber,
            attempts_count: attemptNumber
          }
        }
      });
    } catch (err) {
      console.error('Submit error:', err);
      const serverMsg = err?.response?.data?.error || err?.response?.data?.detail || 'Failed to submit quiz';
      setIsSubmitted(false);
      setFatalError(serverMsg);
    }
  };

  const getAnsweredCount = () => Object.keys(answers).length;
  const getUnanswered = () => questions.filter(q => !answers[q.id]);

  if (loading) {
    return (
      <div className="quiz-interface-container">
        <div className="loading-content">
          <div className="spinner"></div>
          <h2>Loading Quiz...</h2>
          <p>Preparing your questions...</p>
        </div>
      </div>
    );
  }

  if (fatalError) {
    return (
      <div className="quiz-interface-container">
        <div className="error-content">
          <h2>Error</h2>
          <p>{fatalError}</p>
          <button onClick={() => navigate('/StudentDashboard')} className="nav-btn">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="quiz-interface-container">
        <div className="no-questions-content">
          <h2>No Questions Available</h2>
          <button onClick={() => navigate('/StudentDashboard')} className="nav-btn">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const current = questions[currentQuestionIndex];

  if (isSubmitted) {
    return (
      <div className="quiz-submitted-container">
        <div className="submitted-content">
          <div className="success-icon">✅</div>
          <h2>Quiz Submitted!</h2>
          <p>Your answers have been recorded. Redirecting to results...</p>
          <div className="submission-summary">
            <p>Questions answered: {getAnsweredCount()}/{questions.length}</p>
            <p>Attempt: {currentAttempts + 1}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-interface-container">
      {isPracticeMode && (
        <div className="practice-mode-banner" style={{
          background: 'linear-gradient(135deg, #F39C12 0%, #F1C40F 100%)',
          color: 'white',
          padding: '12px 20px',
          textAlign: 'center',
          fontWeight: '600',
          fontSize: '14px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          🎯 Practice Mode - Your score will not be recorded after 3 attempts
        </div>
      )}
      
      <div className="quiz-headerA">
        <div className="quiz-info">
          <h1 className="quiz-title">
            {resolvedTitle}
            {quizDifficulty && (
              <span className={`difficulty-badge ${quizDifficulty}`}>
                {quizDifficulty.toUpperCase()}
              </span>
            )}
          </h1>
          <div className="quiz-progress">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>•</span>
            <span>{getAnsweredCount()} answered</span>
            <span>•</span>
            <span>Attempt {currentAttempts + 1}</span>
          </div>
        </div>

        <div className="quiz-timer">
          <div className="timer">
            <span className="timer-icon">⏱️</span>
            <span className="timer-text">{formatTime(timeRemaining)}</span>
          </div>
        </div>
      </div>

      <div className="question-navigation">
        <div className="question-dots">
          {questions.map((_, i) => (
            <button
              key={i}
              className={`question-dot ${i === currentQuestionIndex ? 'current' : ''} ${
                answers[questions[i].id] ? 'answered' : ''
              }`}
              onClick={() => setCurrentQuestionIndex(i)}
              title={`Question ${i + 1} ${answers[questions[i].id] ? '(Answered)' : '(Unanswered)'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="question-area">
        <MultipleChoiceQuestion
          question={current.question}
          choices={current.choices}
          selectedAnswer={answers[current.id]}
          onAnswerSelect={handleAnswerSelect}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={questions.length}
          isSubmitted={false}
          points={current.points}
        />
      </div>

      <div className="quiz-controls">
        <div className="navigation-buttons">
          <button 
            className="nav-btn prev-btn" 
            onClick={handlePreviousQuestion} 
            disabled={currentQuestionIndex === 0}
          >
            ← Previous
          </button>

          {currentQuestionIndex === questions.length - 1 ? (
            <button className="nav-btn submit-btn" onClick={() => setShowSubmitModal(true)}>
              Submit Quiz
            </button>
          ) : (
            <button className="nav-btn next-btn" onClick={handleNextQuestion}>
              Next →
            </button>
          )}
        </div>

        <div className="quiz-progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(getAnsweredCount() / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {showSubmitModal && (
        <div className="modal-overlay">
          <div className="submit-modal">
            <h3>Submit Quiz?</h3>
            <div className="submission-summary">
              <p>
                You have answered <strong>{getAnsweredCount()}</strong> out of{' '}
                <strong>{questions.length}</strong> questions.
              </p>
              <p>This is attempt <strong>{currentAttempts + 1}</strong>.</p>
              {isPracticeMode && (
                <div className="practice-mode-notice" style={{
                  background: '#FFF3CD',
                  border: '1px solid #FFE69C',
                  borderRadius: '6px',
                  padding: '12px',
                  marginTop: '12px',
                  color: '#856404'
                }}>
                  <strong>📝 Practice Mode:</strong> This score will not be recorded (you've completed 3 graded attempts).
                </div>
              )}
              {getUnanswered().length > 0 && (
                <div className="unanswered-warning">
                  <p>⚠️ Unanswered question(s):</p>
                  <ul>
                    {getUnanswered().slice(0, 5).map((q) => (
                      <li key={q.id}>Question {questions.indexOf(q) + 1}</li>
                    ))}
                    {getUnanswered().length > 5 && (
                      <li>... and {getUnanswered().length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <p>Are you sure you want to submit?</p>

            <div className="modal-actions">
              <button className="modal-btn cancel-btn" onClick={() => setShowSubmitModal(false)}>
                Cancel
              </button>
              <button className="modal-btn confirm-btn" onClick={handleSubmitQuiz}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizInterface;