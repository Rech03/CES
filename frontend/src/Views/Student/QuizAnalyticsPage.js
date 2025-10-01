import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { studentAdaptiveProgress } from '../../api/ai-quiz';
import { getMyCourses } from '../../api/courses';

import Bio from "../../Componets/Student/bio";
import CoursesList from "../../Componets/Student/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
import StarRating from "../../Componets/Student/StarRating";
import QuizResultsDisplay from '../../Componets/Student/QuizResultsDisplay';
import "./QuizAnalyticsPage.css";

const MIN_ATTEMPTS_REQUIRED = 3;

function QuizAnalyticsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [quizStatistics, setQuizStatistics] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [attemptsCount, setAttemptsCount] = useState(0);

  const toNum = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

  const normalizeAttempt = (a) => ({
    id: a.id ?? a.attempt_id ?? a.progress_id ?? a.pk ?? Math.random(),
    quiz_id: a.adaptive_quiz_id || a.quiz_id || a.quiz || a.quizId,
    slide_id: a.slide_id || a.lecture_slide_id || null,
    quiz_title: a.quiz_title || a.title || `Quiz ${a.adaptive_quiz_id || a.quiz_id || a.id}`,
    score: toNum(a.score ?? a.percentage, 0),
    is_completed: a.is_completed ?? a.status === 'completed' ?? true,
    created_at: a.created_at || a.date_created || a.submitted_at || new Date().toISOString(),
    time_taken: toNum(a.time_taken, 0),
    correct_answers: toNum(a.correct_answers, 0),
    total_questions: toNum(a.total_questions, 0),
    status: a.status || ((a.is_completed ?? true) ? 'completed' : 'in_progress'),
    attempt_number: toNum(a.attempt_number, 1),
  });

  const computeClassStatsForQuiz = (attempts, quizId) => {
    const scoped = attempts.filter(a => a.quiz_id === quizId && a.is_completed);
    if (scoped.length === 0) return null;
    const scores = scoped.map(a => toNum(a.score, 0));
    const average = scores.reduce((s, v) => s + v, 0) / scoped.length;
    const highest = Math.max(...scores);
    const passes = scoped.filter(a => toNum(a.score, 0) >= 50).length;
    const passRate = (passes / scoped.length) * 100;

    return {
      average_score: average,
      total_attempts: scoped.length,
      pass_rate: passRate,
      highest_score: highest
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setAccessDenied(false);
      
      try {
        // Get quiz ID from URL params or state
        const urlParams = new URLSearchParams(window.location.search);
        const quizIdFromUrl = urlParams.get('quizId');
        const quizIdFromState = location.state?.quizId;
        const targetQuizId = quizIdFromUrl || quizIdFromState;

        // Fetch student progress/attempts
        const { data: progress } = await studentAdaptiveProgress();
        const attemptsRaw = Array.isArray(progress)
          ? progress
          : progress?.attempts || progress?.recent_attempts || [];

        const processed = (attemptsRaw || [])
          .map(normalizeAttempt)
          .filter(a => a.quiz_id);
        
        setQuizAttempts(processed);

        // If a specific quiz was requested, check access
        if (targetQuizId) {
          const quizAttemptsForTarget = processed.filter(
            a => String(a.quiz_id) === String(targetQuizId) && a.is_completed
          );
          
          setAttemptsCount(quizAttemptsForTarget.length);

          // Check if user has completed required attempts
          if (quizAttemptsForTarget.length < MIN_ATTEMPTS_REQUIRED) {
            setAccessDenied(true);
            setError(`You need to complete at least ${MIN_ATTEMPTS_REQUIRED} attempts before viewing detailed analytics. You have completed ${quizAttemptsForTarget.length} attempt${quizAttemptsForTarget.length !== 1 ? 's' : ''}.`);
            setLoading(false);
            return;
          }

          // User has enough attempts, show analytics
          const mostRecent = [...quizAttemptsForTarget].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          )[0];
          
          setSelectedQuizId(mostRecent.quiz_id);
          setSelectedAttempt(mostRecent);
          setQuizStatistics(computeClassStatsForQuiz(processed, mostRecent.quiz_id));
        } else {
          // No specific quiz requested, show most recent
          const completed = processed.filter(a => a.is_completed);
          if (completed.length > 0) {
            const mostRecent = [...completed].sort(
              (a, b) => new Date(b.created_at) - new Date(a.created_at)
            )[0];
            setSelectedQuizId(mostRecent.quiz_id);
            setSelectedAttempt(mostRecent);
            setQuizStatistics(computeClassStatsForQuiz(processed, mostRecent.quiz_id));
          }
        }

        // Fetch sidebar courses
        try {
          const { data: coursesResp } = await getMyCourses();
          const fetchedCourses = Array.isArray(coursesResp)
            ? coursesResp
            : coursesResp?.courses || coursesResp?.results || [];
          setCourses(fetchedCourses);
        } catch (e) {
          console.warn('getMyCourses failed:', e);
        }
      } catch (e) {
        console.error(e);
        setError('Failed to load quiz analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [location]);

  useEffect(() => {
    if (!selectedQuizId) {
      setQuizStatistics(null);
      return;
    }
    setQuizStatistics(computeClassStatsForQuiz(quizAttempts, selectedQuizId));
  }, [selectedQuizId, quizAttempts]);

  const handleQuizSelect = (attempt) => {
    // Check if this quiz has enough attempts
    const quizAttemptsForSelected = quizAttempts.filter(
      a => a.quiz_id === attempt.quiz_id && a.is_completed
    );

    if (quizAttemptsForSelected.length < MIN_ATTEMPTS_REQUIRED) {
      setError(`This quiz requires ${MIN_ATTEMPTS_REQUIRED} attempts before viewing analytics. Current attempts: ${quizAttemptsForSelected.length}`);
      return;
    }

    setSelectedQuizId(attempt.quiz_id);
    setSelectedAttempt(attempt);
    setError(null);
  };

  const getQuizGroups = () => {
    const groups = {};
    const completed = quizAttempts.filter((a) => a.is_completed);

    completed.forEach((a) => {
      const qid = a.quiz_id;
      if (!groups[qid]) {
        groups[qid] = {
          quiz_id: qid,
          quiz_title: a.quiz_title,
          attempts: [],
          best_score: 0,
          latest_attempt: a.created_at,
        };
      }
      groups[qid].attempts.push(a);
      groups[qid].best_score = Math.max(groups[qid].best_score, a.score ?? 0);
      if (new Date(a.created_at) > new Date(groups[qid].latest_attempt)) {
        groups[qid].latest_attempt = a.created_at;
      }
    });

    // Only include quizzes with enough attempts
    return Object.values(groups)
      .filter(group => group.attempts.length >= MIN_ATTEMPTS_REQUIRED)
      .sort((a, b) => new Date(b.latest_attempt) - new Date(a.latest_attempt));
  };

  const quizGroups = getQuizGroups();

  const handleBackToDashboard = () => {
    navigate('/StudentDashboard');
  };

  if (loading) {
    return (
      <div>
        <div className="NavBar">
          <NavBar />
        </div>
        <div className="loading-container" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '40px'
        }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #1935CA',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '20px'
          }}></div>
          <p style={{ fontSize: '16px', color: '#666' }}>Loading quiz analytics...</p>
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

  // Access denied screen
  if (accessDenied) {
    return (
      <div>
        <div className="NavBar">
          <NavBar />
        </div>
        <div className="ContainerHA">
          <div style={{
            textAlign: 'center',
            padding: '60px 40px',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            <div style={{
              fontSize: '64px',
              marginBottom: '20px',
              opacity: 0.3
            }}>
              🔒
            </div>
            <h2 style={{
              color: '#E74C3C',
              fontSize: '24px',
              fontWeight: '600',
              marginBottom: '16px',
              fontFamily: 'Poppins, sans-serif'
            }}>
              Analytics Locked
            </h2>
            <p style={{
              color: '#666',
              fontSize: '16px',
              lineHeight: '1.6',
              marginBottom: '24px',
              fontFamily: 'Poppins, sans-serif'
            }}>
              {error}
            </p>
            <div style={{
              background: '#F8F9FA',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '30px',
              border: '1px solid #E0E0E0'
            }}>
              <p style={{
                color: '#333',
                fontSize: '14px',
                margin: 0,
                fontFamily: 'Poppins, sans-serif'
              }}>
                Complete <strong>{MIN_ATTEMPTS_REQUIRED - attemptsCount} more attempt{MIN_ATTEMPTS_REQUIRED - attemptsCount !== 1 ? 's' : ''}</strong> to unlock detailed analytics for this quiz.
              </p>
            </div>
            <button
              onClick={handleBackToDashboard}
              style={{
                background: '#1935CA',
                color: 'white',
                border: 'none',
                padding: '12px 32px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#142B9E';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#1935CA';
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
        <div className="SideHA">
          <CoursesList courses={courses} />
        </div>
        <div className="BoiHA">
          <Bio />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="NavBar">
        <NavBar />
      </div>

      <div className="SideHA">
        <CoursesList courses={courses} />
      </div>

      <div className="BoiHA">
        <Bio />
      </div>

      <div className="ContainerHA">
        {error && !accessDenied && (
          <div className="error-banner" style={{
            background: '#FEE2E2',
            border: '1px solid #FECACA',
            color: '#DC2626',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <p style={{ margin: 0, fontSize: '14px' }}>{error}</p>
            <button 
              onClick={() => setError(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#DC2626',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 'bold'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Quiz Selection */}
        {quizGroups.length > 0 ? (
          <div className="quiz-selection-panel">
            <h3>Select Quiz to Analyze</h3>
            <div className="quiz-attempts-list">
              {quizGroups.map((group) => {
                const bestAttempt = group.attempts.reduce((best, cur) =>
                  (cur.score ?? 0) > (best.score ?? 0) ? cur : best
                );
                return (
                  <div
                    key={group.quiz_id}
                    className={`quiz-attempt-item ${selectedQuizId === group.quiz_id ? 'selected' : ''}`}
                    onClick={() => handleQuizSelect(bestAttempt)}
                  >
                    <div className="attempt-header">
                      <div className="attempt-title">{group.quiz_title}</div>
                      <div className="attempt-count">
                        {group.attempts.length} attempt{group.attempts.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="attempt-meta">
                      <span className="attempt-score">Best Score: {group.best_score}%</span>
                      <span className="attempt-date">
                        Latest: {new Date(group.latest_attempt).toLocaleDateString()}
                      </span>
                    </div>
                    {selectedQuizId === group.quiz_id && group.attempts.length > 1 && (
                      <div className="attempts-breakdown">
                        <h4>All Attempts:</h4>
                        {group.attempts
                          .slice()
                          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                          .map((attempt) => (
                            <div
                              key={attempt.id}
                              className={`attempt-detail ${attempt.id === selectedAttempt?.id ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuizSelect(attempt);
                              }}
                            >
                              <span className="attempt-number">Attempt #{attempt.attempt_number}</span>
                              <span className="attempt-score-detail">{attempt.score}%</span>
                              <span className="attempt-date-detail">
                                {new Date(attempt.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="no-quizzes-message" style={{
            textAlign: 'center',
            padding: '60px 40px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.3 }}>📊</div>
            <h3 style={{ color: '#333', marginBottom: '12px', fontSize: '20px' }}>
              No Analytics Available
            </h3>
            <p style={{ color: '#666', marginBottom: '24px', fontSize: '14px' }}>
              Complete at least {MIN_ATTEMPTS_REQUIRED} attempts on any quiz to view detailed analytics.
            </p>
            <button
              onClick={handleBackToDashboard}
              style={{
                background: '#1935CA',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif'
              }}
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {/* Class Stats */}
        {quizStatistics && selectedQuizId && (
          <div className="quiz-statistics-summary">
            <h3>Class Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">
                  {quizStatistics.average_score != null ? quizStatistics.average_score.toFixed(1) : 'N/A'}%
                </div>
                <div className="stat-label">Class Average</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{quizStatistics.total_attempts ?? 0}</div>
                <div className="stat-label">Total Attempts</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {quizStatistics.pass_rate != null ? quizStatistics.pass_rate.toFixed(1) : 'N/A'}%
                </div>
                <div className="stat-label">Pass Rate</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{quizStatistics.highest_score ?? 'N/A'}%</div>
                <div className="stat-label">Highest Score</div>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Results */}
        <div className="QuizResultsWrapper">
          {selectedQuizId && selectedAttempt ? (
            <QuizResultsDisplay quizId={selectedQuizId} attemptData={selectedAttempt} />
          ) : quizGroups.length > 0 ? (
            <div className="no-quiz-selected">
              <h3>Select a Quiz</h3>
              <p>Choose a quiz from the list above to view detailed analytics.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default QuizAnalyticsPage;