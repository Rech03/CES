import { useState, useEffect } from 'react';
import { getProfile } from '../../api/users';
import {
  studentDashboard,
  studentEngagementHeatmap
} from '../../api/analytics';
import {
  getStudentAvailableQuizzes,
  getStudentQuizSummary,
  studentAdaptiveProgress
} from '../../api/ai-quiz';
import Bio from "../../Componets/Student/bio";
import CoursesList from "../../Componets/Student/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
import StudentInsights from '../../Componets/Student/StudentInsights';
import "./Analytics.css";

function Analytics() {
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [slowLoadWarning, setSlowLoadWarning] = useState(false);
  
  // Analytics data states
  const [dashboardData, setDashboardData] = useState(null);
  const [quizSummary, setQuizSummary] = useState(null);
  const [availableQuizzes, setAvailableQuizzes] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [adaptiveProgress, setAdaptiveProgress] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setSlowLoadWarning(false);
      
      // Show warning after 10 seconds
      const warningTimer = setTimeout(() => {
        setSlowLoadWarning(true);
      }, 10000);
      
      try {
        try {
          const profileResponse = await getProfile();
          const user = profileResponse.data;
          const userId = user?.id || user?.user_id;
          if (userId) {
            setSelectedStudentId(userId);
          }
        } catch (profileErr) {
          console.warn('Profile endpoint not available, using default student ID');
        }

        // Fetch all data in parallel, but don't fail if individual requests timeout
        const results = await Promise.allSettled([
          fetchDashboardData(),
          fetchQuizSummary(),
          fetchAvailableQuizzes(),
          fetchHeatmapData(),
          fetchAdaptiveProgress()
        ]);

        // Log which requests failed
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const endpoints = ['dashboard', 'quiz summary', 'available quizzes', 'heatmap', 'adaptive progress'];
            console.warn(`${endpoints[index]} failed to load:`, result.reason?.message);
          }
        });

        // Check if all critical data failed
        const criticalDataLoaded = results.slice(0, 2).some(r => r.status === 'fulfilled');
        if (!criticalDataLoaded) {
          setError('Some analytics data is temporarily unavailable. Please try again later.');
        }

      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data. Please refresh the page.');
      } finally {
        clearTimeout(warningTimer);
        setLoading(false);
        setSlowLoadWarning(false);
      }
    };

    fetchData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await studentDashboard();
      setDashboardData(response.data);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    }
  };

  const fetchQuizSummary = async () => {
    try {
      const response = await getStudentQuizSummary();
      setQuizSummary(response.data);
    } catch (err) {
      console.error('Error fetching quiz summary:', err);
    }
  };

  const fetchAvailableQuizzes = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
      
      const response = await getStudentAvailableQuizzes({ signal: controller.signal });
      clearTimeout(timeoutId);
      setAvailableQuizzes(response.data);
    } catch (err) {
      if (err.name === 'AbortError' || err.code === 'ECONNABORTED') {
        console.warn('Available quizzes request timed out - using fallback data');
      } else {
        console.error('Error fetching available quizzes:', err);
      }
      setAvailableQuizzes({ summary: null, slides: [] });
    }
  };

  const fetchHeatmapData = async () => {
    try {
      const now = new Date();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);
      
      const response = await studentEngagementHeatmap({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      setHeatmapData(response.data);
    } catch (err) {
      console.warn('Heatmap data unavailable:', err.message);
      setHeatmapData(null);
    }
  };

  const fetchAdaptiveProgress = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);
      
      const response = await studentAdaptiveProgress({ signal: controller.signal });
      clearTimeout(timeoutId);
      setAdaptiveProgress(response.data);
    } catch (err) {
      if (err.name === 'AbortError' || err.code === 'ECONNABORTED') {
        console.warn('Adaptive progress request timed out - using fallback data');
      } else {
        console.error('Error fetching adaptive progress:', err);
      }
      setAdaptiveProgress([]);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div>
        <div className="NavBar">
          <NavBar />
        </div>
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading analytics...</p>
            {slowLoadWarning && (
              <p className="slow-load-warning">
                This is taking longer than usual. The server may be processing large amounts of data.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="NavBar">
        <NavBar />
      </div>
      
      <div className="ContainerAn">
        <div className="analytics-content">
          {error && (
            <div className="error-banner">
              <div className="error-content">
                <p>{error}</p>
                <button onClick={handleRefresh} className="retry-button">
                  Try Again
                </button>
              </div>
            </div>
          )}
          
          {/* Header */}
          <div className="analytics-header">
            <h2>My Analytics Dashboard</h2>
          </div>

          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button 
              className={activeTab === 'overview' ? 'tab-active' : 'tab-inactive'}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={activeTab === 'quizzes' ? 'tab-active' : 'tab-inactive'}
              onClick={() => setActiveTab('quizzes')}
            >
              Quiz Performance
            </button>
            <button 
              className={activeTab === 'progress' ? 'tab-active' : 'tab-inactive'}
              onClick={() => setActiveTab('progress')}
            >
              Learning Progress
            </button>
            <button 
              className={activeTab === 'engagement' ? 'tab-active' : 'tab-inactive'}
              onClick={() => setActiveTab('engagement')}
            >
              Engagement
            </button>
            
          </div>
          
          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'overview' && (
              <div className="overview-section">
                {dashboardData && (
                  <div className="metrics-grid-clean">
                    <div className="metric-card">
                      <div className="metric-icon">📊</div>
                      <div className="metric-data">
                        <div className="metric-value">{dashboardData.overall_average?.toFixed(1)}%</div>
                        <div className="metric-label">Overall Average</div>
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-icon">✏️</div>
                      <div className="metric-data">
                        <div className="metric-value">{dashboardData.total_quizzes_taken || 0}</div>
                        <div className="metric-label">Total Quizzes</div>
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-icon">📚</div>
                      <div className="metric-data">
                        <div className="metric-value">{Object.keys(dashboardData.course_averages || {}).length}</div>
                        <div className="metric-label">Active Courses</div>
                      </div>
                    </div>
                  </div>
                )}

                {quizSummary && (
                  <div className="section-card">
                    <h3>Quiz Summary</h3>
                    <div className="metrics-grid-clean">
                      <div className="metric-card">
                        <div className="metric-icon">🎯</div>
                        <div className="metric-data">
                          <div className="metric-value">{quizSummary.overall_stats?.overall_completion_rate?.toFixed(1)}%</div>
                          <div className="metric-label">Completion Rate</div>
                        </div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-icon">📈</div>
                        <div className="metric-data">
                          <div className="metric-value">{quizSummary.overall_stats?.average_score?.toFixed(1)}%</div>
                          <div className="metric-label">Average Score</div>
                        </div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-icon">🔄</div>
                        <div className="metric-data">
                          <div className="metric-value">{quizSummary.overall_stats?.total_attempts || 0}</div>
                          <div className="metric-label">Total Attempts</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {dashboardData?.performance_trend && dashboardData.performance_trend.length > 0 && (
                  <div className="section-card">
                    <h3>Recent Performance Trend</h3>
                    <div className="trend-table">
                      <div className="trend-header-row">
                        <div className="trend-col">Quiz</div>
                        <div className="trend-col">Difficulty</div>
                        <div className="trend-col">Score</div>
                        <div className="trend-col">Date</div>
                      </div>
                      {dashboardData.performance_trend.map((trend, index) => (
                        <div key={index} className="trend-row">
                          <div className="trend-col trend-title">{trend.quiz_title}</div>
                          <div className="trend-col">
                            <span className={`difficulty-badge ${trend.difficulty}`}>{trend.difficulty}</span>
                          </div>
                          <div className="trend-col trend-score">{trend.score?.toFixed(1)}%</div>
                          <div className="trend-col trend-date">{trend.date}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'quizzes' && (
              <div className="quizzes-section">
                {availableQuizzes?.summary && (
                  <div className="metrics-grid-clean">
                    <div className="metric-card">
                      <div className="metric-icon">📝</div>
                      <div className="metric-data">
                        <div className="metric-value">{availableQuizzes.summary.total_quizzes}</div>
                        <div className="metric-label">Total Quizzes</div>
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-icon">✅</div>
                      <div className="metric-data">
                        <div className="metric-value">{availableQuizzes.summary.completed_quizzes}</div>
                        <div className="metric-label">Completed</div>
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-icon">🔓</div>
                      <div className="metric-data">
                        <div className="metric-value">{availableQuizzes.summary.accessible_quizzes}</div>
                        <div className="metric-label">Accessible</div>
                      </div>
                    </div>
                  </div>
                )}

                {availableQuizzes?.slides?.map((slide, index) => (
                  <div key={index} className="section-card">
                    <h3>{slide.slide_info.title}</h3>
                    <p className="section-description">
                      {slide.slide_info.course_code} - {slide.slide_info.topic_name}
                    </p>
                    
                    <div className="quiz-list-grid">
                      {slide.quizzes.map((quiz, qIndex) => (
                        <div key={qIndex} className={`quiz-card ${quiz.accessible ? 'accessible' : 'locked'}`}>
                          <div className="quiz-card-header">
                            <span className={`difficulty-badge ${quiz.difficulty}`}>
                              {quiz.difficulty}
                            </span>
                            <span className={`status-badge ${quiz.status}`}>
                              {quiz.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="quiz-card-stats">
                            <div className="quiz-stat-item">
                              <span className="stat-label">Questions</span>
                              <span className="stat-value">{quiz.question_count}</span>
                            </div>
                            <div className="quiz-stat-item">
                              <span className="stat-label">Attempts</span>
                              <span className="stat-value">{quiz.progress.attempts_count}</span>
                            </div>
                            {quiz.progress.best_score !== null && (
                              <div className="quiz-stat-item">
                                <span className="stat-label">Best Score</span>
                                <span className="stat-value">{quiz.progress.best_score?.toFixed(1)}%</span>
                              </div>
                            )}
                          </div>
                          {!quiz.accessible && (
                            <p className="access-reason">{quiz.access_reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'progress' && (
              <div className="progress-section">
                {adaptiveProgress && adaptiveProgress.length > 0 ? (
                  <>
                    <div className="progress-grid">
                      {adaptiveProgress.map((progress, index) => (
                        <div key={index} className="progress-card-clean">
                          <h4>{progress.slide_title}</h4>
                          <p className="progress-course">{progress.course_code}</p>
                          <div className="progress-stats-row">
                            <span className={`difficulty-badge ${progress.difficulty}`}>
                              {progress.difficulty}
                            </span>
                            <span className={progress.completed ? 'status-completed' : 'status-in-progress'}>
                              {progress.completed ? 'Completed' : 'In Progress'}
                            </span>
                          </div>
                          <div className="progress-metrics">
                            <div className="progress-metric">
                              <span className="metric-label">Attempts</span>
                              <span className="metric-value">{progress.attempts_count}</span>
                            </div>
                            <div className="progress-metric">
                              <span className="metric-label">Best</span>
                              <span className="metric-value">{progress.best_score?.toFixed(1)}%</span>
                            </div>
                            <div className="progress-metric">
                              <span className="metric-label">Latest</span>
                              <span className="metric-value">{progress.latest_score?.toFixed(1)}%</span>
                            </div>
                          </div>
                          {progress.last_attempt_at && (
                            <p className="last-attempt-date">
                              Last: {new Date(progress.last_attempt_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">📖</div>
                    <h3>No Progress Data Yet</h3>
                    <p>Start taking quizzes to see your learning progress!</p>
                  </div>
                )}

                {quizSummary?.difficulty_breakdown && (
                  <div className="section-card">
                    <h3>Performance by Difficulty</h3>
                    <div className="difficulty-breakdown-grid">
                      {Object.entries(quizSummary.difficulty_breakdown).map(([difficulty, stats]) => (
                        <div key={difficulty} className={`difficulty-card ${difficulty}`}>
                          <h4>{difficulty.toUpperCase()}</h4>
                          <div className="difficulty-stats-grid">
                            <div className="diff-stat">
                              <span className="diff-label">Total</span>
                              <span className="diff-value">{stats.total}</span>
                            </div>
                            <div className="diff-stat">
                              <span className="diff-label">Completed</span>
                              <span className="diff-value">{stats.completed}</span>
                            </div>
                            <div className="diff-stat">
                              <span className="diff-label">Average</span>
                              <span className="diff-value">{stats.average_score?.toFixed(1)}%</span>
                            </div>
                            <div className="diff-stat">
                              <span className="diff-label">Rate</span>
                              <span className="diff-value">{stats.completion_rate?.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'engagement' && (
              <div className="engagement-section">
                {heatmapData && (
                  <div className="section-card">
                    <h3>Activity Heatmap - {heatmapData.month_name} {heatmapData.year}</h3>
                    <div className="heatmap-wrapper">
                      <div className="weekday-labels">
                        <span>Sun</span>
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                        <span>Sat</span>
                      </div>
                      <div className="heatmap-grid">
                        {heatmapData.engagement_data?.map((week, weekIndex) => (
                          <div key={weekIndex} className="week-row">
                            {week.map((day, dayIndex) => (
                              <div 
                                key={dayIndex} 
                                className={`day-cell ${day ? (day.engaged ? 'engaged' : 'not-engaged') : 'empty'}`}
                                title={day ? `${day.date}: ${day.engaged ? 'Active' : 'Inactive'}` : ''}
                              >
                                {day ? day.day : ''}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {quizSummary?.recent_attempts && quizSummary.recent_attempts.length > 0 && (
                  <div className="section-card">
                    <h3>Recent Activity</h3>
                    <div className="recent-attempts-grid">
                      {quizSummary.recent_attempts.map((attempt, index) => (
                        <div key={index} className="attempt-card">
                          <div className="attempt-card-header">
                            <h4>{attempt.slide_title}</h4>
                            <span className={`difficulty-badge ${attempt.difficulty}`}>
                              {attempt.difficulty}
                            </span>
                          </div>
                          <p className="attempt-course">{attempt.course_code}</p>
                          <div className="attempt-stats-row">
                            <span className="attempt-score">{attempt.score?.toFixed(1)}%</span>
                            <span className={attempt.completed ? 'status-completed' : 'status-incomplete'}>
                              {attempt.completed ? 'Completed' : 'Incomplete'}
                            </span>
                          </div>
                          <p className="attempt-date">
                            {new Date(attempt.started_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'insights' && (
              <div className="StudentInsightsWrapper">
                <StudentInsights studentId={selectedStudentId} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="SideAn">
        <CoursesList 
          compact={true}
          showLoading={true}
        />
      </div>
      
      <div className="BoiAn">
        <Bio showLoading={true} />
      </div>

      <style jsx>{`
        .analytics-content {
          padding: 2rem;
        }

        .analytics-header {
          margin-bottom: 2rem;
        }

        .analytics-header h2 {
          color: #000000;
          font-size: 1.75rem;
          margin: 0;
          font-weight: 600;
        }

        .tab-navigation {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .tab-navigation button {
          padding: 0.75rem 1.5rem;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
        }

        .tab-active {
          color: #2563eb;
          border-bottom-color: #2563eb !important;
        }

        .tab-inactive {
          color: #6b7280;
        }

        .tab-inactive:hover {
          color: #374151;
        }

        .tab-content {
          min-height: 400px;
        }

        /* Metrics Grid */
        .metrics-grid-clean {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .metric-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.2s;
        }

        .metric-card:hover {
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
          transform: translateY(-2px);
        }

        .metric-icon {
          font-size: 2rem;
        }

        .metric-value {
          font-size: 2rem;
          font-weight: bold;
          color: #020202;
        }

        .metric-label {
          font-size: 0.875rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }

        /* Section Card */
        .section-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .section-card h3 {
          color: #000000;
          margin: 0 0 1rem 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .section-description {
          color: #6b7280;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }

        /* Trend Table */
        .trend-table {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .trend-header-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background: #f9fafb;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.875rem;
          color: #374151;
        }

        .trend-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 0.875rem;
          align-items: center;
        }

        .trend-col {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .trend-title {
          color: #1f2937;
          font-weight: 500;
        }

        .trend-score {
          color: #2563eb;
          font-weight: 600;
        }

        .trend-date {
          color: #6b7280;
        }

        /* Difficulty Badge */
        .difficulty-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          display: inline-block;
        }

        .difficulty-badge.easy {
          background: #d1fae5;
          color: #065f46;
        }

        .difficulty-badge.medium {
          background: #fef3c7;
          color: #92400e;
        }

        .difficulty-badge.hard {
          background: #fee2e2;
          color: #991b1b;
        }

        /* Status Badge */
        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
          background: #e0e7ff;
          color: #3730a3;
        }

        .status-completed {
          color: #065f46;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .status-in-progress {
          color: #92400e;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .status-incomplete {
          color: #991b1b;
          font-size: 0.875rem;
          font-weight: 600;
        }

        /* Quiz List Grid */
        .quiz-list-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        .quiz-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 1rem;
          transition: all 0.2s;
        }

        .quiz-card:hover {
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .quiz-card.locked {
          opacity: 0.6;
        }

        .quiz-card-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .quiz-card-stats {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .quiz-stat-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
        }

        .stat-label {
          color: #6b7280;
        }

        .stat-value {
          color: #1f2937;
          font-weight: 600;
        }

        .access-reason {
          margin-top: 0.75rem;
          padding: 0.5rem;
          background: #fef3c7;
          border-radius: 4px;
          font-size: 0.75rem;
          color: #92400e;
        }

        /* Progress Grid */
        .progress-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .progress-card-clean {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
        }

        .progress-card-clean h4 {
          color: #1f2937;
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .progress-course {
          color: #6b7280;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }

        .progress-stats-row {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .progress-metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 0.75rem;
        }

        .progress-metric {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .last-attempt-date {
          font-size: 0.75rem;
          color: #9ca3af;
          margin: 0;
        }

        /* Difficulty Breakdown */
        .difficulty-breakdown-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1rem;
        }

        .difficulty-card {
          padding: 1.5rem;
          border-radius: 8px;
          color: white;
        }

        .difficulty-card.easy {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
        }

        .difficulty-card.medium {
          background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);
        }

        .difficulty-card.hard {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }

        .difficulty-card h4 {
          margin: 0 0 1rem 0;
          font-size: 0.875rem;
          opacity: 0.9;
        }

        .difficulty-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .diff-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .diff-label {
          font-size: 0.75rem;
          opacity: 0.9;
          margin-bottom: 0.25rem;
        }

        .diff-value {
          font-size: 1.25rem;
          font-weight: bold;
        }

        /* Heatmap */
        .heatmap-wrapper {
          margin-top: 1rem;
        }

        .weekday-labels {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          padding: 0 0.5rem;
        }

        .weekday-labels span {
          text-align: center;
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 600;
        }

        .heatmap-grid {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .week-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.5rem;
        }

        .day-cell {
          aspect-ratio: 1;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .day-cell.empty {
          background: transparent;
        }

        .day-cell.not-engaged {
          background: #f3f4f6;
          color: #9ca3af;
        }

        .day-cell.engaged {
          background: #22c55e;
          color: white;
        }

        .day-cell:hover:not(.empty) {
          transform: scale(1.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        /* Recent Attempts Grid */
        .recent-attempts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        .attempt-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1rem;
        }

        .attempt-card-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 0.5rem;
          gap: 0.5rem;
        }

        .attempt-card-header h4 {
          margin: 0;
          font-size: 0.875rem;
          color: #1f2937;
          font-weight: 600;
          flex: 1;
        }

        .attempt-course {
          color: #6b7280;
          font-size: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .attempt-stats-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .attempt-score {
          color: #2563eb;
          font-size: 1.25rem;
          font-weight: bold;
        }

        .attempt-date {
          color: #9ca3af;
          font-size: 0.75rem;
          margin: 0;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          background: white;
          border: 2px dashed #e5e7eb;
          border-radius: 12px;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          color: #1f2937;
          margin-bottom: 0.5rem;
          font-size: 1.25rem;
        }

        .empty-state p {
          color: #6b7280;
          font-size: 0.875rem;
        }

        /* Error Banner */
        .error-banner {
          background: #fee2e2;
          border: 1px solid #ef4444;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .error-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-content p {
          color: #991b1b;
          margin: 0;
        }

        .retry-button {
          background: #ef4444;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: background 0.2s;
        }

        .retry-button:hover {
          background: #dc2626;
        }

        /* Loading Spinner */
        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }

        .loading-spinner {
          text-align: center;
        }

        .spinner {
          border: 4px solid #f3f4f6;
          border-top: 4px solid #2563eb;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-spinner p {
          color: #6b7280;
          font-size: 1rem;
        }

        .slow-load-warning {
          color: #f59e0b;
          font-size: 0.875rem;
          margin-top: 0.5rem;
          font-style: italic;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .metrics-grid-clean {
            grid-template-columns: repeat(2, 1fr);
          }

          .quiz-list-grid {
            grid-template-columns: 1fr;
          }

          .progress-grid {
            grid-template-columns: 1fr;
          }

          .difficulty-breakdown-grid {
            grid-template-columns: 1fr;
          }

          .recent-attempts-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .analytics-content {
            padding: 1rem;
          }

          .metrics-grid-clean {
            grid-template-columns: 1fr;
          }

          .tab-navigation {
            overflow-x: auto;
            white-space: nowrap;
          }

          .trend-header-row,
          .trend-row {
            grid-template-columns: 1.5fr 1fr 1fr 1fr;
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}

export default Analytics;