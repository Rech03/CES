import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { studentAdaptiveProgress } from '../../api/ai-quiz';
import { getMyCourses } from '../../api/courses';

import Bio from "../../Componets/Student/bio";
import CoursesList from "../../Componets/Student/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
import QuizResultsDisplay from '../../Componets/Student/QuizResultsDisplay';
import "./QuizAnalyticsPage.css";

const MIN_ATTEMPTS_REQUIRED = 3;
const PASS_THRESHOLD = 50;

function QuizAnalyticsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [selectedSlideId, setSelectedSlideId] = useState(null);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [quizStatistics, setQuizStatistics] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  const toNum = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

  const normalizeAttempt = (a, index) => {
    // Generate a composite key from slide_title and difficulty since there's no quiz_id
    const compositeId = `${a.slide_title}_${a.difficulty}`;
    
    return {
      id: compositeId + '_' + index,
      quiz_id: compositeId, // Use composite as quiz_id
      slide_title: a.slide_title,
      difficulty: a.difficulty,
      course_code: a.course_code,
      quiz_title: `${a.slide_title} • ${a.difficulty.charAt(0).toUpperCase() + a.difficulty.slice(1)}`,
      score: toNum(a.best_score, 0),
      attempts_count: toNum(a.attempts_count, 0),
      is_completed: a.completed ?? (a.attempts_count > 0),
      created_at: a.last_attempt_at || new Date().toISOString(),
      latest_score: toNum(a.latest_score, 0),
      best_score: toNum(a.best_score, 0),
    };
  };

  const computeClassStatsForQuiz = (attempts, quizId) => {
    const scoped = attempts.filter(a => a.quiz_id === quizId && a.is_completed);
    if (scoped.length === 0) return null;
    
    // For this data, we only have one "attempt" record per quiz (which contains attempts_count)
    const record = scoped[0];
    
    return {
      average_score: record.score,
      total_attempts: record.attempts_count,
      pass_rate: record.score > PASS_THRESHOLD ? 100 : 0,
      highest_score: record.score
    };
  };

  const checkQuizAccess = (quizData) => {
    if (!quizData) {
      return {
        granted: false,
        attemptCount: 0,
        highestScore: 0,
        hasEnoughAttempts: false,
        hasPassed: false
      };
    }

    const attemptCount = quizData.attempts_count || 0;
    const highestScore = quizData.best_score || 0;
    
    const hasEnoughAttempts = attemptCount >= MIN_ATTEMPTS_REQUIRED;
    const hasPassed = highestScore > PASS_THRESHOLD;
    
    return {
      granted: hasEnoughAttempts || hasPassed,
      attemptCount,
      highestScore,
      hasEnoughAttempts,
      hasPassed
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setAccessDenied(false);
      
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const quizIdFromUrl = urlParams.get('quizId');
        const slideIdFromUrl = urlParams.get('slideId');
        const quizIdFromState = location.state?.quizId;
        const slideIdFromState = location.state?.slideId;
        
        const targetQuizId = quizIdFromUrl || quizIdFromState;
        const targetSlideId = slideIdFromUrl || slideIdFromState;

        console.log('=== ANALYTICS PAGE DEBUG ===');
        console.log('Target Quiz ID:', targetQuizId);
        console.log('Target Slide ID:', targetSlideId);

        const { data: progress } = await studentAdaptiveProgress();
        console.log('Raw progress data:', progress);

        let attemptsRaw = [];
        if (Array.isArray(progress)) {
          attemptsRaw = progress;
        } else if (progress?.data && Array.isArray(progress.data)) {
          attemptsRaw = progress.data;
        }

        console.log('Attempts raw array:', attemptsRaw);

        const processed = attemptsRaw.map((a, i) => normalizeAttempt(a, i));
        
        console.log('Processed attempts:', processed);
        
        setQuizAttempts(processed);

        // If trying to access a specific quiz, check if it has progress data
        if (targetQuizId && targetSlideId) {
          console.log('Looking for quiz with ID:', targetQuizId, 'and slide:', targetSlideId);
          
          // Find the matching progress record
          const matchingRecord = processed.find(p => 
            String(p.quiz_id).includes(targetSlideId) || 
            p.quiz_title.includes(targetSlideId)
          );
          
          console.log('Matching record:', matchingRecord);
          
          if (matchingRecord) {
            const access = checkQuizAccess(matchingRecord);
            console.log('Access check:', access);
            
            setAttemptsCount(access.attemptCount);
            setBestScore(access.highestScore);

            if (!access.granted) {
              setAccessDenied(true);
              setError(`You need ${MIN_ATTEMPTS_REQUIRED} attempts OR >${PASS_THRESHOLD}% to view analytics.\n\nCurrent: ${access.attemptCount} attempts, ${access.highestScore}% best score`);
              setLoading(false);
              return;
            }

            setSelectedQuizId(matchingRecord.quiz_id);
            setSelectedSlideId(targetSlideId);
            setSelectedAttempt(matchingRecord);
            setQuizStatistics(computeClassStatsForQuiz(processed, matchingRecord.quiz_id));
          } else {
            setAccessDenied(true);
            setError('No progress found for this quiz. Complete at least one attempt first.');
            setLoading(false);
            return;
          }
        } else {
          // No specific quiz, show most recent with access
          const accessible = processed.filter(p => {
            const access = checkQuizAccess(p);
            return access.granted;
          });

          if (accessible.length > 0) {
            const mostRecent = accessible.sort(
              (a, b) => new Date(b.created_at) - new Date(a.created_at)
            )[0];
            
            setSelectedQuizId(mostRecent.quiz_id);
            setSelectedAttempt(mostRecent);
            setQuizStatistics(computeClassStatsForQuiz(processed, mostRecent.quiz_id));
          }
        }

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
        console.error('Analytics page error:', e);
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
    const access = checkQuizAccess(attempt);

    if (!access.granted) {
      setError(`This quiz requires ${MIN_ATTEMPTS_REQUIRED} attempts OR >${PASS_THRESHOLD}%. Current: ${access.attemptCount} attempts, ${access.highestScore}% score`);
      return;
    }

    setSelectedQuizId(attempt.quiz_id);
    setSelectedAttempt(attempt);
    setError(null);
  };

  const getQuizGroups = () => {
    return quizAttempts
      .filter(attempt => {
        const access = checkQuizAccess(attempt);
        return access.granted;
      })
      .map(attempt => ({
        quiz_id: attempt.quiz_id,
        quiz_title: attempt.quiz_title,
        attempts_count: attempt.attempts_count,
        best_score: attempt.best_score,
        latest_attempt: attempt.created_at,
        attempt: attempt
      }))
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

  if (accessDenied) {
    const needsMoreAttempts = attemptsCount < MIN_ATTEMPTS_REQUIRED;
    const needsBetterScore = bestScore <= PASS_THRESHOLD;
    const attemptsNeeded = MIN_ATTEMPTS_REQUIRED - attemptsCount;

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
            <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.3 }}>🔒</div>
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
              To unlock analytics, you need to either:
            </p>
            <div style={{
              background: '#F8F9FA',
              padding: '24px',
              borderRadius: '8px',
              marginBottom: '24px',
              border: '1px solid #E0E0E0',
              textAlign: 'left'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '16px',
                color: needsMoreAttempts ? '#666' : '#27AE60'
              }}>
                <span style={{ fontSize: '20px', marginRight: '12px' }}>
                  {needsMoreAttempts ? '⭕' : '✅'}
                </span>
                <div>
                  <strong>Complete 3 attempts</strong>
                  <div style={{ fontSize: '13px', marginTop: '4px' }}>
                    Current: {attemptsCount}/3 attempts
                  </div>
                </div>
              </div>
              <div style={{
                textAlign: 'center',
                margin: '12px 0',
                color: '#999',
                fontWeight: '600'
              }}>
                OR
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                color: needsBetterScore ? '#666' : '#27AE60'
              }}>
                <span style={{ fontSize: '20px', marginRight: '12px' }}>
                  {needsBetterScore ? '⭕' : '✅'}
                </span>
                <div>
                  <strong>Pass the quiz (more than 50%)</strong>
                  <div style={{ fontSize: '13px', marginTop: '4px' }}>
                    Best score: {bestScore}%
                  </div>
                </div>
              </div>
            </div>
            {needsMoreAttempts && needsBetterScore && (
              <p style={{
                color: '#333',
                fontSize: '14px',
                marginBottom: '24px',
                fontFamily: 'Poppins, sans-serif'
              }}>
                {attemptsNeeded === 1 
                  ? 'Complete 1 more attempt or score above 50% to unlock analytics.'
                  : `Complete ${attemptsNeeded} more attempts or score above 50% to unlock analytics.`}
              </p>
            )}
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
                fontFamily: 'Poppins, sans-serif'
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
            <p style={{ margin: 0, fontSize: '14px', whiteSpace: 'pre-line' }}>{error}</p>
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

        {quizGroups.length > 0 ? (
          <div className="quiz-selection-panel">
            <h3>Select Quiz to Analyze</h3>
            <div className="quiz-attempts-list">
              {quizGroups.map((group) => (
                <div
                  key={group.quiz_id}
                  className={`quiz-attempt-item ${selectedQuizId === group.quiz_id ? 'selected' : ''}`}
                  onClick={() => handleQuizSelect(group.attempt)}
                >
                  <div className="attempt-header">
                    <div className="attempt-title">{group.quiz_title}</div>
                    <div className="attempt-count">
                      {group.attempts_count} attempt{group.attempts_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="attempt-meta">
                    <span className="attempt-score">Best Score: {group.best_score}%</span>
                    <span className="attempt-date">
                      Latest: {new Date(group.latest_attempt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
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
              Complete at least {MIN_ATTEMPTS_REQUIRED} attempts OR pass any quiz (>{PASS_THRESHOLD}%) to view detailed analytics.
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

        {quizStatistics && selectedQuizId && (
          <div className="quiz-statistics-summary">
            <h3>Quiz Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">
                  {quizStatistics.average_score != null ? quizStatistics.average_score.toFixed(1) : 'N/A'}%
                </div>
                <div className="stat-label">Best Score</div>
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