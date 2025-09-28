import React, { useState, useEffect, useMemo } from 'react';
import { getStudentQuizSummary } from '../../api/ai-quiz';
import './QuizResultsDisplay.css';

// Normalize question-level data coming from summary
function toQuestionResults(summary) {
  const raw = summary?.question_results || summary?.questions || [];
  return Array.isArray(raw)
    ? raw.map((q, idx) => ({
        question_id: q.id ?? q.question_id ?? idx + 1,
        question_text: q.text ?? q.question_text ?? q.question ?? `Question ${idx + 1}`,
        question_type: q.type ?? q.question_type ?? 'multiple_choice',
        is_correct: !!(q.is_correct ?? q.correct ?? q.user_is_correct),
        correct_answer: q.correct_answer ?? q.answer_key ?? q.correct,
        answer_text: q.user_answer_text ?? q.user_answer ?? q.answer_text ?? q.student_answer ?? null,
        selected_choice_id: q.selected_choice_id ?? q.user_choice_id ?? null,
        model_answer: q.model_answer ?? q.explanation ?? null,
        feedback: q.feedback ?? null,
        points: q.points ?? null,
        points_earned: q.points_earned ?? null,
        choices: (q.choices || q.options || []).map((c) => ({
          id: c.id,
          choice_text: c.text ?? c.choice_text ?? String(c.value ?? ''),
          is_correct: !!(c.is_correct ?? c.correct),
        })),
      }))
    : [];
}

function computeSummary(summary, attemptFallback) {
  const latest = summary?.latest ?? {};
  const score =
    Math.round(
      (latest.score ??
        summary?.score ??
        attemptFallback?.score ??
        (Number.isFinite(attemptFallback?.percentage) ? attemptFallback.percentage : 0)) || 0
    );

  // prefer latest.* then summary.*, then attemptFallback
  const correct =
    latest.correct_answers ??
    summary?.correct_answers ??
    attemptFallback?.correct_answers ??
    attemptFallback?.correct_count ??
    0;

  const total =
    latest.total_questions ??
    summary?.total_questions ??
    attemptFallback?.total_questions ??
    attemptFallback?.total ??
    0;

  return {
    percentage: Number.isFinite(score) ? score : 0,
    correctAnswers: Number.isFinite(correct) ? correct : 0,
    totalQuestions: Number.isFinite(total) ? total : 0,
    timeUsed: latest.time_taken ?? summary?.time_taken ?? attemptFallback?.time_taken ?? 0,
    attemptNumber: latest.attempt_number ?? summary?.attempt_number ?? attemptFallback?.attempt_number ?? 1,
    status: summary?.status ?? attemptFallback?.status ?? 'completed',
    created_at: latest.created_at ?? summary?.created_at ?? attemptFallback?.created_at ?? null,
    title: summary?.quiz?.title ?? attemptFallback?.quiz_title ?? attemptFallback?.title ?? null,
    maxScore: summary?.max_score ?? attemptFallback?.max_score ?? 100,
  };
}

const QuizResultsDisplay = ({ quizId, attemptData = {} }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nbError, setNbError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setNbError(null);
        // Only correct student API from your ai-quiz module
        const resp = await getStudentQuizSummary(quizId);
        const payload = resp?.data ?? resp;
        if (!alive) return;
        setSummary(payload || null);
      } catch (e) {
        if (!alive) return;
        setNbError('Could not load full quiz summary.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [quizId]);

  const questionResults = useMemo(() => toQuestionResults(summary), [summary]);
  const results = useMemo(() => computeSummary(summary, attemptData), [summary, attemptData]);

  const getGradeColor = (p) => (p >= 80 ? '#27AE60' : p >= 70 ? '#3498DB' : p >= 50 ? '#F39C12' : '#E74C3C');
  const getGradeLetter = (p) => (p >= 80 ? 'A' : p >= 70 ? 'B' : p >= 60 ? 'C' : p >= 50 ? 'D' : 'F');
  const formatTime = (s = 0) => {
    const n = Number.isFinite(s) ? s : 0;
    const m = Math.floor(n / 60);
    const r = n % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  };
  const formatDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    } catch { return '—'; }
  };

  const [showDetails, setShowDetails] = useState(false);
  const canShowDetails = questionResults.length > 0;

  if (loading) {
    return (
      <div className="quiz-results-display">
        <div className="loading-spinner">
          <div className="spinner" />
          <p>Loading quiz results...</p>
        </div>
      </div>
    );
  }

  if (!summary && !attemptData) {
    return (
      <div className="quiz-results-display">
        <div className="error-message">
          <p>Unable to load quiz results</p>
          {nbError && <p className="error-details">{nbError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-results-display">
      {/* Header */}
      <div className="results-header-compact">
        <h2>Quiz Results</h2>
        <div className="quiz-info-compact">
          <span className="quiz-title-compact">{results.title || (quizId ? `Quiz ${quizId}` : 'Quiz')}</span>
          <span className="quiz-date-compact">{formatDate(results.created_at)}</span>
          {results.attemptNumber > 1 && (
            <span className="attempt-badge-compact">Attempt #{results.attemptNumber}</span>
          )}
          {results.status !== 'completed' && (
            <span className="status-badge">{results.status}</span>
          )}
        </div>
      </div>

      {/* Score Summary */}
      <div className="score-summary">
        <div className="score-main">
          <div className="score-circle-display" style={{ borderColor: getGradeColor(results.percentage) }}>
            <div className="score-percentage-display" style={{ color: getGradeColor(results.percentage) }}>
              {results.percentage}%
            </div>
            <div className="score-grade-display" style={{ color: getGradeColor(results.percentage) }}>
              Grade {getGradeLetter(results.percentage)}
            </div>
          </div>
        </div>

        <div className="score-stats">
          <div className="stat-compact">
            <span className="stat-value-display">{results.correctAnswers}/{results.totalQuestions}</span>
            <span className="stat-label-display">Correct</span>
          </div>
          <div className="stat-compact">
            <span className="stat-value-display">{formatTime(results.timeUsed)}</span>
            <span className="stat-label-display">Time</span>
          </div>
          {results.maxScore && results.maxScore !== 100 && (
            <div className="stat-compact">
              <span className="stat-value-display">
                {results.correctAnswers * (results.maxScore / (results.totalQuestions || 1))}/{results.maxScore}
              </span>
              <span className="stat-label-display">Points</span>
            </div>
          )}
        </div>
      </div>

      {/* Toggle Details */}
      <div className="toggle-details">
        <button
          className="toggle-btn"
          onClick={() => setShowDetails(!showDetails)}
          disabled={!canShowDetails}
        >
          {showDetails ? 'Hide Details' : 'View Question Details'}
          {!canShowDetails && <span className="disabled-note"> (Not Available)</span>}
        </button>
      </div>

      {/* Detailed Results */}
      {showDetails && canShowDetails && (
        <div className="detailed-results-compact">
          <h3>Question Review</h3>
          <div className="questions-review-compact">
            {questionResults.map((qr, i) => {
              const isCorrect = !!qr.is_correct;
              return (
                <div key={qr.question_id ?? i} className="question-review-compact">
                  <div className="question-header-compact">
                    <span className="question-number-compact">Q{i + 1}</span>
                    <span className={`result-indicator-compact ${isCorrect ? 'correct' : 'incorrect'}`}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    {qr.points != null && (
                      <span className="question-points">
                        {qr.points_earned ?? 0}/{qr.points} pts
                      </span>
                    )}
                  </div>

                  <div className="question-text-compact">
                    {qr.question_text || `Question ${i + 1}`}
                  </div>

                  {/* Multiple Choice */}
                  {qr.question_type === 'multiple_choice' && Array.isArray(qr.choices) && (
                    <div className="choices-review-compact">
                      {qr.choices.map((choice, idx) => {
                        const isSelected = String(qr.selected_choice_id) === String(choice.id);
                        const isCorrectChoice = !!choice.is_correct;
                        return (
                          <div
                            key={choice.id ?? idx}
                            className={`choice-review-compact ${isSelected ? 'selected' : ''} ${isCorrectChoice ? 'correct-answer' : ''}`}
                          >
                            <span className="choice-letter-compact">{String.fromCharCode(65 + idx)}</span>
                            <span className="choice-text-compact">{choice.choice_text}</span>
                            {isSelected && <span className="selected-mark-compact">Your</span>}
                            {isCorrectChoice && <span className="correct-mark-compact">✓</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* True/False or Short Answer */}
                  {qr.question_type !== 'multiple_choice' && (
                    <div className="short-answer-review-compact">
                      <div className="user-answer-compact">
                        <strong>Your Answer:</strong> {String(qr.answer_text ?? '—')}
                      </div>
                      <div className="sample-answer-compact">
                        <strong>Correct Answer:</strong> {String(qr.correct_answer ?? '—')}
                      </div>
                      {qr.model_answer && (
                        <div className="answer-feedback">
                          <strong>Explanation:</strong> {qr.model_answer}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Non-blocking error */}
      {nbError && (
        <div className="error-message-small">
          <p>Note: Some detailed information could not be loaded.</p>
        </div>
      )}
    </div>
  );
};

export default QuizResultsDisplay;
