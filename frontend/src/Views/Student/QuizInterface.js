import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAdaptiveQuiz, submitAdaptiveQuiz, getStudentAvailableQuizzes, studentAdaptiveProgress } from '../../api/ai-quiz';
import MultipleChoiceQuestion from '../../Componets/Student/MultipleChoiceQuestion';
import './QuizInterface.css';

const DIFF_ORDER = { easy: 1, medium: 2, hard: 3 };
const MAX_ATTEMPTS = 3;

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

  // Find next level quiz
  const findNextLevelQuiz = async (currentSlideId, currentDifficulty) => {
    try {
      const av = await getStudentAvailableQuizzes();
      const slides = Array.isArray(av?.data?.slides) ? av.data.slides : [];
      
      for (const s of slides) {
        const slideInfo = s?.slide_info || {};
        if (slideInfo.slide_id !== currentSlideId) continue;
        
        const qs = Array.isArray(s?.quizzes) ? s.quizzes : [];
        const currentOrder = DIFF_ORDER[currentDifficulty] || 1;
        
        // Find next difficulty level
        const nextLevel = qs.find(q => {
          const qDiff = (q.difficulty || '').toLowerCase();
          return DIFF_ORDER[qDiff] === currentOrder + 1;
        });
        
        if (nextLevel) {
          return {
            quiz_id: nextLevel.quiz_id,
            slide_id: slideInfo.slide_id,
            difficulty: nextLevel.difficulty,
            topic_name: slideInfo.topic_name
          };
        }
      }
      
      return null;
    } catch (e) {
      console.warn('Failed to find next level:', e);
      return null;
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
      // Backend expects answers like: { "question_0": "A", "question_1": "B", "question_2": "C" }
      const answersDict = {};
      
      questions.forEach((question, questionIndex) => {
        const userAnswer = answers[question.id];
        
        if (userAnswer !== undefined && userAnswer !== null) {
          // Find which choice was selected
          const choiceIndex = question.choices.findIndex(
            choice => String(choice.id) === String(userAnswer)
          );
          
          if (choiceIndex >= 0) {
            // Convert index to letter: 0->A, 1->B, 2->C, 3->D
            const letterAnswer = String.fromCharCode(65 + choiceIndex);
            // KEY FIX: Use "question_X" as key to match backend expectation
            answersDict[`question_${questionIndex}`] = letterAnswer;
          }
        }
      });

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

      // Calculate if this is the 3rd attempt
      const attemptNumber = resultData.attempt_number || currentAttempts + 1;
      const isThirdAttempt = attemptNumber >= MAX_ATTEMPTS;

      // Check if next level should be unlocked
      let nextLevelInfo = null;
      if (isThirdAttempt || resultData.unlocked_next) {
        nextLevelInfo = await findNextLevelQuiz(quizEnv.slideId, quizDifficulty);
      }

      // Navigate to results with all data
      navigate('/QuizResultsPage', {
        state: {
          ...resultData,
          questions,
          answers,
          answersDict, // Pass the letter-based answers for results display
          quizData: {
            ...quizEnv,
            quizId: adaptiveQuizId,
            quizTitle: resolvedTitle,
            difficulty: quizDifficulty
          },
          attempts_meta: {
            attempt_number: attemptNumber,
            attempts_count: attemptNumber,
            max_attempts: MAX_ATTEMPTS,
            is_final_attempt: isThirdAttempt,
            next_level_unlocked: isThirdAttempt && nextLevelInfo !== null,
            next_level_info: nextLevelInfo
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
          <button onClick={() => navigate('/Dashboard')} className="nav-btn">
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
          <button onClick={() => navigate('/Dashboard')} className="nav-btn">
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
            <p>Attempt: {currentAttempts + 1} of {MAX_ATTEMPTS}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-interface-container">
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
            <span>Attempt {currentAttempts + 1} of {MAX_ATTEMPTS}</span>
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
              <p>This is attempt <strong>{currentAttempts + 1}</strong> of <strong>{MAX_ATTEMPTS}</strong>.</p>
              {currentAttempts + 1 >= MAX_ATTEMPTS && (
                <p className="final-attempt-warning">
                  ⚠️ This is your final attempt. After submission, you'll be able to view results and proceed to the next level.
                </p>
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

            <p>Are you sure you want to submit? This action cannot be undone.</p>

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