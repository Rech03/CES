import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './QuizResultsPage.css';

const MAX_ATTEMPTS = 3;

export default function QuizResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // The result payload we navigate here with (from QuizInterface.js)
  // Expected to be either the raw submission response or a wrapper containing it
  const raw = (location.state && (location.state.result || location.state)) || {};

  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);

  // ---- Helpers to tolerate different server shapes (no API changes) ----
  const safeNumber = (n, fallback = 0) =>
    typeof n === 'number' && !Number.isNaN(n) ? n : fallback;

  const normalizeAnswersDict = (src) => {
    // Accept any of these shapes. Keys should be string indexes "0","1",...
    const dict =
      src?.answersDict ||
      src?.answers_map ||
      src?.user_answers_map ||
      src?.user_answers ||
      src?.answers ||
      {};
    // Coerce values to letters (A,B,C,...) if they are indices
    const out = {};
    Object.keys(dict || {}).forEach((k) => {
      const val = dict[k];
      if (typeof val === 'number') {
        out[String(k)] = String.fromCharCode(65 + val);
      } else {
        out[String(k)] = String(val);
      }
    });
    return out;
  };

  // The server may return per-question evaluation under different keys.
  // We prefer an array of objects with at least: { question_number?, is_correct?, correct_answer?, explanation?, question? }
  const normalizeExplanations = (src) => {
    const arr =
      src?.explanations ||
      src?.question_results ||
      src?.per_question ||
      src?.items ||
      [];
    // Ensure each item has a usable index
    return (Array.isArray(arr) ? arr : []).map((it, i) => ({
      // prefer explicit mapping if present, else fallback to array index
      index:
        it.index ??
        it.question_index ??
        it.question_number ??
        i,
      is_correct: !!it.is_correct,
      correct_answer:
        it.correct_answer ?? it.correct_option ?? null,
      explanation: it.explanation ?? it.reason ?? null,
      // keep a copy of question text if present
      question: it.question ?? it.prompt ?? null,
      // keep choices if present (optional)
      choices: it.choices ?? null,
    }));
  };

  const normalizeQuestions = (src) => {
    // Try: state.questions (what QuizInterface often passes),
    // or explanations (which may include the question text),
    // or quizData.questions
    const q1 = Array.isArray(src?.questions) ? src.questions : null;
    const q2 = Array.isArray(src?.explanations)
      ? src.explanations.map((e) => ({
          question: e.question ?? e.prompt ?? 'Question',
          choices:
            e.choices ??
            e.options ??
            null,
        }))
      : null;
    const q3 = Array.isArray(src?.quizData?.questions)
      ? src.quizData.questions
      : null;

    return q1 || q2 || q3 || [];
  };

  useEffect(() => setLoading(false), []);

  // ---- Normalize incoming data (robust to field names) ----
  const data = useMemo(() => {
    const score = safeNumber(raw.score, null);
    const correctCount = safeNumber(raw.correct_count);
    const totalQuestions = safeNumber(
      raw.total_questions ?? raw.total ?? raw.questions_count ?? (raw.questions?.length ?? 0)
    );

    // If score is missing, compute it. If it exists and is <=100, assume already %.
    const computedPct =
      score === null
        ? (totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0)
        : Math.round(score);

    const answersDict = normalizeAnswersDict(raw);
    const explanations = normalizeExplanations(raw);
    const questions = normalizeQuestions({ ...raw, explanations });

    // Attempt metadata (optional). We only show if available.
    const attemptNumber =
      raw.attempt_number ??
      raw.attempt ??
      raw.attempts_meta?.attempt_number ??
      null;

    // Server gate for reveal (your response showed: show_explanation: false/true)
    // Also accept: completed === true meaning finalised attempts
    const showFullReveal =
      !!raw.show_explanation || !!raw.completed;

    const unlockedNext =
      !!raw.unlocked_next ||
      !!raw.next_level_unlocked;

    return {
      percentage: computedPct,
      correctCount,
      totalQuestions,
      timeUsed: safeNumber(raw.time_taken ?? raw.timeUsed),
      passed: computedPct >= 50,
      feedback: raw.feedback ?? null,
      answersDict,
      explanations,
      questions,
      showFullReveal,
      attemptNumber,
      unlockedNext,
      nextLevelInfo: raw.next_level_info ?? null,
    };
  }, [raw]);

  // ---- UI helpers ----
  const getGradeColor = (p) => (p >= 80 ? '#27AE60' : p >= 70 ? '#3498DB' : p >= 50 ? '#F39C12' : '#E74C3C');
  const getGradeLetter = (p) => (p >= 80 ? 'A' : p >= 70 ? 'B' : p >= 60 ? 'C' : p >= 50 ? 'D' : 'F');
  const getPerfLabel = (p) =>
    p >= 90 ? 'Excellent' : p >= 80 ? 'Very Good' : p >= 70 ? 'Good' : p >= 60 ? 'Average' : 'Needs Improvement';

  const formatTime = (seconds) => {
    const s = safeNumber(seconds, 0);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  };

  const handleReturnHome = () => navigate('/StudentDashboard');

  const handleNextLevel = () => {
    if (!data.nextLevelInfo) return;
    navigate('/QuizInterface', {
      state: {
        quizId: data.nextLevelInfo.quiz_id,
        slideId: data.nextLevelInfo.slide_id,
        quizTitle: `${data.nextLevelInfo.topic_name} - ${String(data.nextLevelInfo.difficulty || '').toUpperCase()}`,
        difficulty: data.nextLevelInfo.difficulty,
      },
    });
  };

  // Render a single question block
  const renderQuestion = (q, index) => {
    // explanation row that matches this index
    const exp = data.explanations.find((e) => Number(e.index) === index) || null;

    // student's chosen option letter (from answersDict)
    const userAnsLetter = data.answersDict[String(index)] ?? null;

    // we always show Correct/Incorrect if we have the boolean
    const hasCorrectness = typeof exp?.is_correct === 'boolean';
    const isCorrect = !!exp?.is_correct;

    // only show correct answer + explanation AFTER pass or 3 attempts (server sends show_explanation:true)
    const correctLetter = data.showFullReveal ? exp?.correct_answer ?? null : null;
    const showExplanation = data.showFullReveal && !!exp?.explanation;

    // choices: prefer question.choices; else from explanation item if present
    const choices = Array.isArray(q?.choices) ? q.choices : Array.isArray(exp?.choices) ? exp.choices : null;

    return (
      <div key={q?.id || index} className="question-review">
        <div className="question-header">
          <span className="question-number">Question {index + 1}</span>
          {hasCorrectness ? (
            <span className={`result-indicator ${isCorrect ? 'correct' : 'incorrect'}`}>
              {isCorrect ? '✓ Correct' : '✗ Incorrect'}
            </span>
          ) : (
            <span className="result-indicator neutral">Answer recorded</span>
          )}
        </div>

        <div className="question-text">{q?.question || exp?.question || 'Question'}</div>

        {choices && (
          <div className="choices-review">
            {choices.map((choice, i) => {
              const letter = String.fromCharCode(65 + i);
              const isSelected = userAnsLetter === letter;
              const isCorrectChoice = data.showFullReveal && correctLetter === letter;

              // choice text may be plain string or object {text: "..."}
              const text = typeof choice === 'string' ? choice : choice?.text ?? '';

              return (
                <div
                  key={choice?.id || i}
                  className={`choice-review ${isSelected ? 'selected' : ''} ${
                    isCorrectChoice ? 'correct-answer' : ''
                  }`}
                >
                  <span className="choice-letter">{letter}</span>
                  <span className="choice-text">{text}</span>
                  {isSelected && <span className="selected-mark">Your Answer</span>}
                  {isCorrectChoice && <span className="correct-mark">Correct Answer</span>}
                </div>
              );
            })}
          </div>
        )}

        {showExplanation && (
          <div className="explanation">
            <h5>Explanation</h5>
            <p>{exp.explanation}</p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="quiz-results-container">
        <div className="loading-content">
          <div className="spinner" />
          <h2>Processing Results...</h2>
          <p>Preparing your performance summary...</p>
        </div>
      </div>
    );
  }

  // Whether to show the "solutions unlocked" banner:
  const solutionsUnlocked = data.showFullReveal || data.passed;

  return (
    <div className="quiz-results-container">
      <div className="results-content">
        {/* Header */}
        <div className="results-header">
          <h1>Quiz Results</h1>
          {location.state?.quizData?.quizTitle && (
            <p className="quiz-title">{location.state.quizData.quizTitle}</p>
          )}
          {data.attemptNumber ? (
            <p className="attempt-info">Attempt {data.attemptNumber} of {MAX_ATTEMPTS}</p>
          ) : null}
        </div>

        {/* Score */}
        <div className="score-display">
          <div className="score-circle" style={{ borderColor: getGradeColor(data.percentage) }}>
            <div className="score-percentage" style={{ color: getGradeColor(data.percentage) }}>
              {data.percentage}%
            </div>
            <div className="score-grade" style={{ color: getGradeColor(data.percentage) }}>
              Grade {getGradeLetter(data.percentage)}
            </div>
          </div>

          <div className={`pass-status ${data.passed ? 'passed' : 'failed'}`}>
            {data.passed ? 'PASSED' : 'FAILED'}
          </div>
        </div>

        {/* Stats */}
        <div className="results-stats">
          <div className="stat-item">
            <div className="stat-value">{data.correctCount}</div>
            <div className="stat-label">Correct Answers</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{data.totalQuestions}</div>
            <div className="stat-label">Total Questions</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{formatTime(data.timeUsed)}</div>
            <div className="stat-label">Time Used</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{getPerfLabel(data.percentage)}</div>
            <div className="stat-label">Performance</div>
          </div>
        </div>

        {/* Unlock message */}
        {solutionsUnlocked && (
          <div className="final-attempt-message">
            <h3>Solutions Unlocked</h3>
            <p>
              Correct answers and explanations are now visible below.
              {data.unlockedNext ? ' You can now proceed to the next difficulty level!' : ''}
            </p>
          </div>
        )}
        {!solutionsUnlocked && (
          <div className="final-attempt-message hint">
            <h3>Review Your Attempt</h3>
            <p>
              You can see which questions were correct or incorrect. Full solutions will appear once you pass
              or after your 3rd attempt.
            </p>
          </div>
        )}

        {/* Feedback */}
        <div className="feedback-section">
          <h3>Feedback</h3>
          <div className="feedback-content">
            {data.feedback ? (
              <p>{data.feedback}</p>
            ) : data.percentage >= 80 ? (
              <p>Excellent performance! You've demonstrated strong understanding of the material.</p>
            ) : data.percentage >= 70 ? (
              <p>Good work! You're showing solid progress. Review the areas you missed.</p>
            ) : data.percentage >= 50 ? (
              <p>You passed, but there's room for improvement. Review the questions you got wrong.</p>
            ) : (
              <p>Keep practicing! Review the material and focus on the concepts you struggled with.</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="results-actions">
          <button
            className="view-details-btn"
            onClick={() => setShowDetails((v) => !v)}
            disabled={!data.questions?.length}
          >
            {showDetails ? 'Hide Details' : 'View Question Details'}
          </button>

          {/* Retake button intentionally removed per your request */}

          {data.unlockedNext && data.nextLevelInfo && (
            <button
              className="next-level-btn"
              onClick={handleNextLevel}
              style={{ background: 'linear-gradient(135deg, #27AE60 0%, #2ECC71 100%)', color: '#fff', fontWeight: 600 }}
            >
              Proceed to {String(data.nextLevelInfo.difficulty || '').toUpperCase()} Level →
            </button>
          )}

          <button className="home-btn" onClick={handleReturnHome}>
            Return to Dashboard
          </button>
        </div>

        {/* Detailed results */}
        {showDetails && !!data.questions?.length && (
          <div className="detailed-results">
            <h3>Question by Question Review</h3>
            {!solutionsUnlocked && (
              <p className="reveal-note">
                Explanations and correct options will be revealed once you pass the quiz or after you complete all
                {` ${MAX_ATTEMPTS} `}attempts.
              </p>
            )}
            <div className="questions-review">
              {data.questions.map((q, i) => renderQuestion(q, i))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
