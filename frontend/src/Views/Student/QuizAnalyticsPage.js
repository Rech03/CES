import { useState, useEffect } from 'react';

// ❌ Removed: '../../api/quizzes'
import { studentAdaptiveProgress, getProgressAnalytics } from '../../api/ai-quiz';
import { getMyCourses } from '../../api/courses';

import Bio from "../../Componets/Student/bio";
import CoursesList from "../../Componets/Student/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
import StarRating from "../../Componets/Student/StarRating";
import QuizResultsDisplay from '../../Componets/Student/QuizResultsDisplay';
import "./QuizAnalyticsPage.css";

function QuizAnalyticsPage() {
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [quizStatistics, setQuizStatistics] = useState(null);

  // Normalize attempt objects into the shape we need
  const normalizeAttempt = (a) => ({
    id: a.id,
    quiz_id: a.adaptive_quiz_id || a.quiz_id || a.quiz || a.quizId,
    slide_id: a.slide_id || a.lecture_slide_id || null,
    quiz_title: a.quiz_title || a.title || `Quiz ${a.adaptive_quiz_id || a.quiz_id || a.id}`,
    score: a.score ?? a.percentage ?? 0,
    is_completed: a.is_completed ?? a.status === 'completed' ?? true,
    created_at: a.created_at || a.date_created || a.submitted_at || new Date().toISOString(),
    time_taken: a.time_taken ?? 0,
    correct_answers: a.correct_answers ?? 0,
    total_questions: a.total_questions ?? 0,
    status: a.status || (a.is_completed ? 'completed' : 'in_progress'),
    attempt_number: a.attempt_number || 1,
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // ✅ Get student attempts/progress from AI-Quiz service
        const { data: progress } = await studentAdaptiveProgress();

        const attemptsRaw =
          Array.isArray(progress) ? progress : progress?.attempts || progress?.recent_attempts || [];

        const processed = (attemptsRaw || []).map(normalizeAttempt).filter(a => a.quiz_id);
        setQuizAttempts(processed);

        // Pick most recent completed as default
        const completed = processed.filter(a => a.is_completed);
        if (completed.length > 0) {
          const mostRecent = [...completed].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          )[0];
          setSelectedQuizId(mostRecent.quiz_id);
          setSelectedAttempt(mostRecent);
        }

        // Sidebar courses
        try {
          const { data: coursesResp } = await getMyCourses();
          const fetchedCourses = Array.isArray(coursesResp)
            ? coursesResp
            : coursesResp?.results || [];
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
  }, []);

  // Class/aggregate stats for the selected quiz
  useEffect(() => {
    const fetchStats = async () => {
      if (!selectedQuizId) {
        setQuizStatistics(null);
        return;
      }
      try {
        // We don’t have a dedicated "quiz stats" endpoint,
        // so we use progress analytics as an aggregate (server can scope by quiz if supported).
        const { data: stats } = await getProgressAnalytics({ quiz_id: selectedQuizId });
        setQuizStatistics({
          average_score: stats?.average_score ?? null,
          total_attempts: stats?.total_attempts ?? null,
          pass_rate: stats?.pass_rate ?? null,
          highest_score: stats?.highest_score ?? null,
        });
      } catch (e) {
        console.warn('getProgressAnalytics failed for quiz scope:', e);
        setQuizStatistics(null);
      }
    };

    fetchStats();
  }, [selectedQuizId]);

  const handleQuizSelect = (attempt) => {
    setSelectedQuizId(attempt.quiz_id);
    setSelectedAttempt(attempt);
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

    return Object.values(groups).sort(
      (a, b) => new Date(b.latest_attempt) - new Date(a.latest_attempt)
    );
  };

  const quizGroups = getQuizGroups();

  if (loading) {
    return (
      <div>
        <div className="NavBar">
          <NavBar />
        </div>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading quiz analytics...</p>
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
        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
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
                    className={`quiz-attempt-item ${
                      selectedQuizId === group.quiz_id ? 'selected' : ''
                    }`}
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
                              className={`attempt-detail ${
                                attempt.id === selectedAttempt?.id ? 'active' : ''
                              }`}
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
          <div className="no-quizzes-message">
            <h3>No Completed Quizzes</h3>
            <p>Complete some quizzes to see detailed analytics here.</p>
          </div>
        )}

        {/* Class Stats */}
        {quizStatistics && (
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
