import { useState, useEffect } from 'react';
import { getMyAttempts, getQuizStatistics } from '../../api/quizzes';
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all quiz attempts for the student
        const attemptsResponse = await getMyAttempts();
        const attempts = Array.isArray(attemptsResponse.data) 
          ? attemptsResponse.data 
          : attemptsResponse.data?.results || [];

        // Process attempts data
        const processedAttempts = attempts.map(attempt => ({
          id: attempt.id,
          quiz_id: attempt.quiz || attempt.quiz_id,
          quiz_title: attempt.quiz_title || `Quiz ${attempt.quiz || attempt.quiz_id}`,
          score: attempt.score || 0,
          is_completed: attempt.is_completed || attempt.status === 'completed',
          created_at: attempt.created_at || attempt.date_created || new Date().toISOString(),
          time_taken: attempt.time_taken || 0,
          correct_answers: attempt.correct_answers || 0,
          total_questions: attempt.total_questions || 0,
          status: attempt.status || (attempt.is_completed ? 'completed' : 'in_progress'),
          attempt_number: attempt.attempt_number || 1
        }));

        setQuizAttempts(processedAttempts);

        // Filter completed attempts and group by quiz
        const completedAttempts = processedAttempts.filter(attempt => attempt.is_completed);
        
        if (completedAttempts.length > 0) {
          // Get unique quizzes with their best attempts
          const quizGroups = {};
          completedAttempts.forEach(attempt => {
            const quizId = attempt.quiz_id;
            if (!quizGroups[quizId] || attempt.score > quizGroups[quizId].score) {
              quizGroups[quizId] = attempt;
            }
          });

          // Set the most recent quiz as default selection
          const mostRecentQuiz = Object.values(quizGroups).sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
          )[0];
          
          if (mostRecentQuiz) {
            setSelectedQuizId(mostRecentQuiz.quiz_id);
            setSelectedAttempt(mostRecentQuiz);
          }
        }

        // Fetch courses for sidebar
        try {
          const coursesResponse = await getMyCourses();
          const fetchedCourses = Array.isArray(coursesResponse.data)
            ? coursesResponse.data
            : coursesResponse.data?.results || [];
          setCourses(fetchedCourses);
        } catch (courseErr) {
          console.warn('Could not fetch courses:', courseErr);
        }

      } catch (err) {
        console.error('Error fetching quiz analytics data:', err);
        setError('Failed to load quiz analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch quiz statistics when a quiz is selected
  useEffect(() => {
    const fetchQuizStatistics = async () => {
      if (selectedQuizId) {
        try {
          const statsResponse = await getQuizStatistics(selectedQuizId);
          setQuizStatistics(statsResponse.data);
        } catch (err) {
          console.warn('Could not fetch quiz statistics:', err);
          setQuizStatistics(null);
        }
      }
    };

    fetchQuizStatistics();
  }, [selectedQuizId]);

  const handleQuizSelect = (attempt) => {
    setSelectedQuizId(attempt.quiz_id);
    setSelectedAttempt(attempt);
  };

  // Group attempts by quiz for display
  const getQuizGroups = () => {
    const groups = {};
    const completedAttempts = quizAttempts.filter(attempt => attempt.is_completed);
    
    completedAttempts.forEach(attempt => {
      const quizId = attempt.quiz_id;
      if (!groups[quizId]) {
        groups[quizId] = {
          quiz_id: quizId,
          quiz_title: attempt.quiz_title,
          attempts: [],
          best_score: 0,
          latest_attempt: attempt.created_at
        };
      }
      
      groups[quizId].attempts.push(attempt);
      groups[quizId].best_score = Math.max(groups[quizId].best_score, attempt.score);
      
      if (new Date(attempt.created_at) > new Date(groups[quizId].latest_attempt)) {
        groups[quizId].latest_attempt = attempt.created_at;
      }
    });

    return Object.values(groups).sort((a, b) => 
      new Date(b.latest_attempt) - new Date(a.latest_attempt)
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
        <div className="List">
          <CoursesList courses={courses} />
        </div>
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

        {/* Quiz Selection Panel */}
        {quizGroups.length > 0 ? (
          <div className="quiz-selection-panel">
            <h3>Select Quiz to Analyze</h3>
            <div className="quiz-attempts-list">
              {quizGroups.map((quizGroup, index) => {
                const bestAttempt = quizGroup.attempts.reduce((best, current) => 
                  current.score > best.score ? current : best
                );
                
                return (
                  <div
                    key={quizGroup.quiz_id}
                    className={`quiz-attempt-item ${
                      selectedQuizId === quizGroup.quiz_id ? 'selected' : ''
                    }`}
                    onClick={() => handleQuizSelect(bestAttempt)}
                  >
                    <div className="attempt-header">
                      <div className="attempt-title">{quizGroup.quiz_title}</div>
                      <div className="attempt-count">
                        {quizGroup.attempts.length} attempt{quizGroup.attempts.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="attempt-meta">
                      <span className="attempt-score">
                        Best Score: {quizGroup.best_score}%
                      </span>
                      <span className="attempt-date">
                        Latest: {new Date(quizGroup.latest_attempt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {/* Show all attempts for this quiz */}
                    {selectedQuizId === quizGroup.quiz_id && quizGroup.attempts.length > 1 && (
                      <div className="attempts-breakdown">
                        <h4>All Attempts:</h4>
                        {quizGroup.attempts
                          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                          .map((attempt, attemptIndex) => (
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
          <div className="no-quizzes-message">
            <h3>No Completed Quizzes</h3>
            <p>Complete some quizzes to see detailed analytics here.</p>
          </div>
        )}

        {/* Quiz Statistics Summary */}
        {quizStatistics && (
          <div className="quiz-statistics-summary">
            <h3>Class Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{quizStatistics.average_score?.toFixed(1) || 'N/A'}%</div>
                <div className="stat-label">Class Average</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{quizStatistics.total_attempts || 0}</div>
                <div className="stat-label">Total Attempts</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{quizStatistics.pass_rate?.toFixed(1) || 'N/A'}%</div>
                <div className="stat-label">Pass Rate</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{quizStatistics.highest_score || 'N/A'}%</div>
                <div className="stat-label">Highest Score</div>
              </div>
            </div>
            
            {selectedAttempt && (
              <div className="performance-comparison">
                <h4>Your Performance</h4>
                <p>
                  You scored <strong>{selectedAttempt.score}%</strong>, which is{' '}
                  {selectedAttempt.score > (quizStatistics.average_score || 0) ? 
                    <span className="above-average">above</span> : 
                    <span className="below-average">below</span>
                  } the class average of {quizStatistics.average_score?.toFixed(1) || 'N/A'}%.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Detailed Results Display */}
        <div className="QuizResultsWrapper">
          {selectedQuizId && selectedAttempt ? (
            <QuizResultsDisplay 
              quizId={selectedQuizId} 
              attemptData={selectedAttempt}
            />
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