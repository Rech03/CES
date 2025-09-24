import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAdaptiveQuiz, submitAdaptiveQuiz, getStudentAvailableQuizzes } from '../../api/ai-quiz';
import MultipleChoiceQuestion from '../../Componets/Student/MultipleChoiceQuestion';
import TrueFalseQuestion from '../../Componets/Student/TrueFalseQuestion';
import ShortAnswerQuestion from '../../Componets/Student/ShortAnswerQuestion';
import './QuizInterface.css';

const DIFF_ORDER = { easy: 1, medium: 2, hard: 3 };

const QuizInterface = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Router state
  const stateData = location.state || {};

  // Query params
  const search = new URLSearchParams(location.search);
  const quizIdFromQuery = search.get('quizId');
  const slideIdFromQuery = search.get('slideId');

  // LocalStorage fallbacks
  const quizIdFromStorage = typeof window !== 'undefined' ? localStorage.getItem('last_quiz_id') : null;
  const slideIdFromStorage = typeof window !== 'undefined' ? localStorage.getItem('last_slide_id') : null;

  // Quiz meta
  const [quizEnv, setQuizEnv] = useState({
    quizTitle: stateData.quizTitle || 'AI Quiz',
    quizDuration: stateData.quizDuration || '15 min',
    totalQuestions: stateData.totalQuestions || 5,
    quizId:
      stateData.quizId ||
      (quizIdFromQuery ? Number(quizIdFromQuery) : null) ||
      (quizIdFromStorage ? Number(quizIdFromStorage) : null),
    slideId:
      stateData.slideId ||
      (slideIdFromQuery ? Number(slideIdFromQuery) : null) ||
      (slideIdFromStorage ? Number(slideIdFromStorage) : null),
    isAIQuiz: true,
    isLive: !!stateData.isLive,
    time_limit: stateData.time_limit
  });

  // UI state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState(null);
  const [resolvedTitle, setResolvedTitle] = useState(quizEnv.quizTitle);
  const [gateInfo, setGateInfo] = useState(null); // { message, suggested }

  // timer helpers
  const getSecondsFromDuration = (duration) => {
    if (typeof duration === 'number') return duration * 60;
    if (typeof duration === 'string') {
      const m = duration.match(/(\d+)\s*min/i);
      return m ? parseInt(m[1], 10) * 60 : 900;
    }
    return 900;
  };
  const [timeRemaining, setTimeRemaining] = useState(getSecondsFromDuration(quizEnv.time_limit || quizEnv.quizDuration));

  // ---------- robust normalizers ----------
  const normalizeType = (rawType) => {
    const t = String(rawType || '').toLowerCase().replace(/[-\s]/g, '_');
    if (['mcq','multiple_choice','multiple_choice_single','single_choice','multiple_choice_question'].includes(t)) return 'multiple_choice';
    if (['true_false','true/false','boolean','bool'].includes(t)) return 'true_false';
    if (['short_answer','short_answer_question','text','open','open_ended'].includes(t)) return 'short_answer';
    return 'multiple_choice';
  };

  const normalizeChoices = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map((choice, i) => {
        if (typeof choice === 'string') {
          return { id: i + 1, text: choice, is_correct: false };
        }
        if (choice && typeof choice === 'object') {
          return {
            id: choice.id ?? i + 1,
            text: choice.choice_text ?? choice.text ?? choice.answer_text ?? `Option ${i + 1}`,
            is_correct: !!choice.is_correct
          };
        }
        return { id: i + 1, text: String(choice), is_correct: false };
      }).filter(Boolean);
    }
    if (typeof raw === 'object') {
      return Object.entries(raw).map(([key, val], idx) => {
        if (typeof val === 'string') {
          return {
            id: isNaN(Number(key)) ? idx + 1 : Number(key),
            text: val,
            is_correct: false
          };
        }
        if (val && typeof val === 'object') {
          return {
            id: val.id ?? (isNaN(Number(key)) ? idx + 1 : Number(key)),
            text: val.choice_text ?? val.text ?? val.answer_text ?? `Option ${idx + 1}`,
            is_correct: !!val.is_correct
          };
        }
        return {
          id: isNaN(Number(key)) ? idx + 1 : Number(key),
          text: String(val),
          is_correct: false
        };
      }).filter(Boolean);
    }
    if (typeof raw === 'string') {
      const parts = raw.split(/\r?\n|;|\|/).map(s => s.trim()).filter(Boolean);
      return parts.map((txt, i) => ({ id: i + 1, text: txt, is_correct: false }));
    }
    return [];
  };

  const normalizeOneQuestion = (q, index) => {
    const type = normalizeType(q?.question_type || q?.type);
    const base = {
      id: q?.id || q?.question_id || index + 1,
      type,
      question: q?.question_text || q?.text || q?.question || `Question ${index + 1}`,
      points: q?.points || q?.weight || 1,
      order: q?.order || index + 1,
      explanation: q?.explanation || null,
    };

    if (type === 'multiple_choice') {
      const rawChoices = (q?.choices ?? q?.options ?? q?.answers ?? null);
      const choices = normalizeChoices(rawChoices);
      const correctId = q?.correct_choice_id ?? q?.correct_option_id ?? null;
      const correctText = q?.correct_answer ?? null;
      if (correctId != null) {
        choices.forEach(c => { if (String(c.id) === String(correctId)) c.is_correct = true; });
      } else if (correctText) {
        choices.forEach(c => { if ((c.text || '').trim() === String(correctText).trim()) c.is_correct = true; });
      }
      return { ...base, choices };
    }

    if (type === 'true_false') {
      return {
        ...base,
        correct_answer: typeof q?.correct_answer === 'boolean'
          ? q.correct_answer
          : String(q?.correct_answer || '').toLowerCase() === 'true'
      };
    }

    // short_answer
    return {
      ...base,
      model_answer: q?.model_answer || q?.sample_answer || null
    };
  };

  // -------- data loaders ----------
  const fetchAndPopulate = async (qid, sid = null) => {
    const res = await getAdaptiveQuiz(qid); // may 403
    const data = res.data;

    // title & time
    setResolvedTitle(data?.title || data?.name || quizEnv.quizTitle);
    setTimeRemaining(getSecondsFromDuration(data?.time_limit || quizEnv.time_limit || quizEnv.quizDuration || 15));

    // questions
    let qs = [];
    if (Array.isArray(data?.questions)) qs = data.questions;
    else if (Array.isArray(data?.adaptive_questions)) qs = data.adaptive_questions;

    if (!Array.isArray(qs) || qs.length === 0) {
      throw new Error('No questions found in this quiz.');
    }

    const processed = qs.map((q, idx) => normalizeOneQuestion(q, idx));
    setQuestions(processed);
    setFatalError(null);
    setGateInfo(null);

    // persist IDs and URL
    localStorage.setItem('last_quiz_id', String(qid));
    if (sid != null) localStorage.setItem('last_slide_id', String(sid));
    const params = new URLSearchParams();
    params.set('quizId', String(qid));
    if (sid != null) params.set('slideId', String(sid));
    window.history.replaceState({}, '', `/QuizInterface?${params.toString()}`);
  };

  const suggestPrerequisite = async (targetQuizId, targetSlideId) => {
    try {
      const av = await getStudentAvailableQuizzes();
      const slides = Array.isArray(av?.data?.slides) ? av.data.slides : [];
      const flat = [];
      let targetDifficulty = null;

      for (const s of slides) {
        const slideInfo = s?.slide_info || {};
        const qs = Array.isArray(s?.quizzes) ? s.quizzes : [];
        for (const q of qs) {
          const item = {
            quiz_id: q.quiz_id,
            slide_id: slideInfo.slide_id ?? null,
            difficulty: (q.difficulty || '').toLowerCase(),
            accessible: !!q.accessible,
            topic_name: slideInfo.topic_name,
            course_code: slideInfo.course_code,
          };
          flat.push(item);
          if (q.quiz_id === targetQuizId) {
            targetDifficulty = item.difficulty;
            targetSlideId = targetSlideId ?? item.slide_id ?? null;
          }
        }
      }

      if (!targetSlideId || !targetDifficulty) {
        const firstAcc = flat.find(x => x.accessible);
        return firstAcc ? { message: 'Please start with an available quiz first.', suggested: firstAcc } : null;
      }

      const sameSlide = flat.filter(x => x.slide_id === targetSlideId);
      const accessible = sameSlide.filter(x => x.accessible);
      if (accessible.length === 0) return null;

      const tOrder = DIFF_ORDER[targetDifficulty] ?? 99;
      const byDiff = (a, b) => (DIFF_ORDER[a.difficulty] ?? 99) - (DIFF_ORDER[b.difficulty] ?? 99);
      const exactPrev = accessible.find(x => (DIFF_ORDER[x.difficulty] ?? -1) === tOrder - 1);
      const suggested = exactPrev || accessible.sort(byDiff)[0];

      if (!suggested) return null;
      const humanDiff = suggested.difficulty ? suggested.difficulty[0].toUpperCase() + suggested.difficulty.slice(1) : '';
      const msg = `You need to complete the ${humanDiff} quiz first for this slide.`;
      return { message: msg, suggested };
    } catch (e) {
      console.warn('suggestPrerequisite failed:', e);
      return null;
    }
  };

  const switchToSuggested = async (obj) => {
    if (!obj?.quiz_id) return;
    setLoading(true);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setQuizEnv(prev => ({ ...prev, quizId: obj.quiz_id, slideId: obj.slide_id ?? prev.slideId ?? null }));
    try {
      await fetchAndPopulate(obj.quiz_id, obj.slide_id ?? null);
    } catch (err) {
      console.error('Failed to load suggested quiz:', err);
      setFatalError(err?.message || 'Failed to load suggested quiz.');
    } finally {
      setLoading(false);
    }
  };

  // initial load
  useEffect(() => {
    const ensureQuizIdAndLoad = async () => {
      try {
        setLoading(true);
        setFatalError(null);
        setGateInfo(null);

        let qid = quizEnv.quizId;
        let sid = quizEnv.slideId;

        if (!qid) {
          const av = await getStudentAvailableQuizzes();
          let first = null;
          if (Array.isArray(av?.data?.slides)) {
            for (const s of av.data.slides) {
              const info = s?.slide_info || {};
              const qs = Array.isArray(s?.quizzes) ? s.quizzes : [];
              for (const q of qs) {
                if (q?.accessible) {
                  first = { quiz_id: q.quiz_id, slide_id: info.slide_id ?? null };
                  break;
                }
              }
              if (first) break;
            }
          }
          if (!first) {
            setFatalError('No accessible quizzes for this student.');
            setLoading(false);
            return;
          }
          qid = first.quiz_id;
          sid = first.slide_id;
          setQuizEnv(prev => ({ ...prev, quizId: qid, slideId: sid ?? prev.slideId ?? null }));
        }

        try {
          await fetchAndPopulate(qid, sid ?? null);
        } catch (err) {
          if (err?.response?.status === 403) {
            const serverMsg = err?.response?.data?.error || 'Quiz not accessible.';
            const suggestion = await suggestPrerequisite(qid, sid ?? null);
            if (suggestion?.suggested) {
              setGateInfo({ message: serverMsg, suggested: suggestion.suggested });
              setFatalError(null);
            } else {
              setFatalError(serverMsg);
            }
          } else {
            setFatalError(err?.message || 'Failed to initialize quiz');
          }
        }
      } finally {
        setLoading(false);
      }
    };

    ensureQuizIdAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // timer
  useEffect(() => {
    if (timeRemaining > 0 && !isSubmitted && !loading && !fatalError && !gateInfo) {
      const t = setTimeout(() => setTimeRemaining((prev) => prev - 1), 1000);
      return () => clearTimeout(t);
    }
    if (timeRemaining === 0 && !isSubmitted && !fatalError && !gateInfo) {
      handleSubmitQuiz();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, isSubmitted, loading, fatalError, gateInfo]);

  // -------- handlers ----------
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
    if (currentQuestionIndex < questions.length - 1) setCurrentQuestionIndex(currentQuestionIndex + 1);
  };
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex(currentQuestionIndex - 1);
  };
  const handleQuestionJump = (i) => setCurrentQuestionIndex(i);

  const handleSubmitQuiz = async () => {
    setIsSubmitted(true);
    setShowSubmitModal(false);

    try {
      const adaptiveQuizId =
        Number(quizEnv.quizId) ||
        Number(quizIdFromQuery) ||
        Number(quizIdFromStorage);

      if (!adaptiveQuizId || Number.isNaN(adaptiveQuizId)) {
        console.error('Missing adaptive_quiz_id at submit time', { quizEnv, quizIdFromQuery, quizIdFromStorage });
        setIsSubmitted(false);
        setFatalError('Cannot submit: missing quiz id. Please reopen the quiz from the dashboard.');
        return;
      }

      // Build answers: ALWAYS include question_type to satisfy strict validators
      const answersPayload = Object.entries(answers).map(([questionId, value]) => {
        const q = questions.find(qq => String(qq.id) === String(questionId));
        const qt = q?.type || 'multiple_choice';

        if (qt === 'multiple_choice') {
          let choiceId = null;
          if (typeof value === 'number' || typeof value === 'string') {
            const n = Number(value);
            choiceId = Number.isFinite(n) ? n : null;
          } else if (value && typeof value === 'object' && 'id' in value) {
            const n = Number(value.id);
            choiceId = Number.isFinite(n) ? n : null;
          }
          return {
            question_id: Number(questionId),
            question_type: 'multiple_choice',
            selected_choice_id: choiceId
          };
        }

        if (qt === 'true_false') {
          return {
            question_id: Number(questionId),
            question_type: 'true_false',
            answer: !!value
          };
        }

        // short_answer
        return {
          question_id: Number(questionId),
          question_type: 'short_answer',
          answer_text: value != null ? String(value) : ''
        };
      });

      const payload = {
        adaptive_quiz_id: adaptiveQuizId,
        slide_id:
          quizEnv.slideId ??
          (slideIdFromQuery ? Number(slideIdFromQuery) : (slideIdFromStorage ? Number(slideIdFromStorage) : null)),
        answers: answersPayload
      };

      // console.debug('Submitting quiz payload:', JSON.stringify(payload, null, 2));

      const submitResp = await submitAdaptiveQuiz(payload);

      const submissionResult = {
        ...submitResp.data,
        questions,
        answers,
        quizData: { ...quizEnv, isAIQuiz: true, quizId: adaptiveQuizId }
      };

      navigate('/QuizResultsPage', { state: submissionResult });
    } catch (err) {
      console.error('Error submitting quiz:', err);
      const serverMsg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        (typeof err?.response?.data === 'string' ? err.response.data : null) ||
        // If the backend returned field-level errors (DRF style), show first helpful key
        (() => {
          const d = err?.response?.data;
          if (d && typeof d === 'object') {
            const k = Object.keys(d)[0];
            if (k) {
              const v = Array.isArray(d[k]) ? d[k][0] : d[k];
              return `${k}: ${typeof v === 'string' ? v : 'invalid'}`;
            }
          }
          return null;
        })() ||
        'Failed to submit quiz. Please try again.';
      setIsSubmitted(false);
      setFatalError(serverMsg);
    }
  };

  const getAnsweredCount = () => Object.keys(answers).length;
  const getUnanswered = () => questions.filter(q => !answers[q.id]);

  // -------- renders ----------
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

  if (gateInfo) {
    const sug = gateInfo.suggested;
    const label =
      `${(sug.topic_name || 'Topic')} • ${sug.difficulty ? sug.difficulty[0].toUpperCase() + sug.difficulty.slice(1) : ''}`;
    return (
      <div className="quiz-interface-container">
        <div className="error-content">
          <h2>Prerequisite Required</h2>
          <p>{gateInfo.message}</p>
          <div style={{ marginTop: 12, marginBottom: 12 }}>
            <button
              className="nav-btn"
              onClick={() => switchToSuggested(sug)}
              style={{ padding: '10px 16px', background: '#1935CA', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
            >
              Start {label}
            </button>
          </div>
          <button onClick={() => navigate(-1)} className="nav-btn">Go Back</button>
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
          <button onClick={() => navigate('/Dashboard')} className="nav-btn">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="quiz-interface-container">
        <div className="no-questions-content">
          <h2>No Questions Available</h2>
          <p>This quiz doesn't have any questions yet.</p>
          <button onClick={() => navigate(-1)} className="nav-btn">Go Back</button>
        </div>
      </div>
    );
  }

  const current = questions[currentQuestionIndex];

  const renderQuestion = () => {
    const common = {
      question: current.question,
      selectedAnswer: answers[current.id],
      onAnswerSelect: handleAnswerSelect,
      questionNumber: currentQuestionIndex + 1,
      totalQuestions: questions.length,
      isSubmitted: false,
      points: current.points
    };
    switch (current.type) {
      case 'multiple_choice':
        return <MultipleChoiceQuestion {...common} choices={current.choices || []} />;
      case 'true_false':
        return <TrueFalseQuestion {...common} correctAnswer={current.correct_answer} />;
      case 'short_answer':
        return <ShortAnswerQuestion {...common} autoSave={true} maxLength={500} modelAnswer={current.model_answer} />;
      default:
        return <div>Unknown question type: {current.type}</div>;
    }
  };

  if (isSubmitted) {
    return (
      <div className="quiz-submitted-container">
        <div className="submitted-content">
          <div className="success-icon">✅</div>
          <h2>Quiz Submitted!</h2>
          <p>Your answers have been recorded. Redirecting to results...</p>
          <div className="submission-summary">
            <p>Questions answered: {getAnsweredCount()}/{questions.length}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-interface-container">
      {/* Header */}
      <div className="quiz-header">
        <div className="quiz-info">
          <h1 className="quiz-title">
            {resolvedTitle}
            <span className="ai-badge">AI</span>
          </h1>
          <div className="quiz-progress">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>•</span>
            <span>{getAnsweredCount()} answered</span>
          </div>
        </div>

        <div className="quiz-timer">
          <div className="timer">
            <span className="timer-icon">⏱️</span>
            <span className="timer-text">{formatTime(timeRemaining)}</span>
          </div>
        </div>
      </div>

      {/* Dots navigation */}
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

      {/* Question */}
      <div className="question-area">{renderQuestion()}</div>

      {/* Controls */}
      <div className="quiz-controls">
        <div className="navigation-buttons">
          <button className="nav-btn prev-btn" onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0}>
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
          <div className="progress-fill" style={{ width: `${(getAnsweredCount() / questions.length) * 100}%` }}></div>
        </div>
      </div>

      {/* Confirm submit */}
      {showSubmitModal && (
        <div className="modal-overlay">
          <div className="submit-modal">
            <h3>Submit Quiz?</h3>
            <div className="submission-summary">
              <p>You have answered <strong>{getAnsweredCount()}</strong> out of <strong>{questions.length}</strong> questions.</p>
              {getUnanswered().length > 0 && (
                <div className="unanswered-warning">
                  <p>⚠️ Unanswered question(s):</p>
                  <ul>
                    {getUnanswered().slice(0, 5).map((q) => (
                      <li key={q.id}>Question {questions.indexOf(q) + 1}</li>
                    ))}
                    {getUnanswered().length > 5 && <li>... and {getUnanswered().length - 5} more</li>}
                  </ul>
                </div>
              )}
            </div>

            <p>Are you sure you want to submit? This action cannot be undone.</p>

            <div className="modal-actions">
              <button className="modal-btn cancel-btn" onClick={() => setShowSubmitModal(false)}>Cancel</button>
              <button className="modal-btn confirm-btn" onClick={handleSubmitQuiz}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizInterface;
