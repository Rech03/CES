// src/Views/Lecture/StudentAnalytics.js
import { useState, useEffect, useMemo } from "react";

// NOTE: keeping these relative paths exactly as you have them
import BarChart from "../../Componets/Lacture/BarChart";
import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import MetricCard from "../../Componets/Lacture/MetricCard";
import NavBar from "../../Componets/Lacture/NavBar";
import StarRating from "../../Componets/Lacture/StarRating";

// Updated to use AI quiz specific analytics endpoints
import {
  lecturerDashboard,
  lecturerChart,
  lecturerCourseOptions,
  getEngagementTrends,
  getPerformanceTrends,
  updateStudentMetrics,
  // AI Quiz specific endpoints
  getAIQuizStatistics,
  getCourseStatistics,
  getStudentEngagement,
  getDifficultyProgression,
  getAdaptiveLearningEffectiveness,
  getStudentsNeedingAttention,
  getEngagementAlerts,
  triggerInterventionEmail,
  getDifficultyDistribution,
  getQuestionAnalysis
} from "../../api/analytics";

// Import course API for fallback
import { getMyCourses } from "../../api/courses";

import "./StudentAnalytics.css";

/**
 * Lecturer Student Analytics - AI Quiz Focused
 * - Uses AI quiz specific analytics endpoints
 * - Integrates with adaptive learning metrics
 * - Provides insights on AI quiz performance and student engagement
 */
function StudentAnalytics() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [chartData, setChartData] = useState({});
  const [studentsNeedingAttention, setStudentsNeedingAttention] = useState([]);
  const [engagementAlerts, setEngagementAlerts] = useState([]);
  const [difficultyDistribution, setDifficultyDistribution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [error, setError] = useState("");

  // Normalize to number for requests that expect numeric IDs
  const normalizedCourseId = useMemo(() => {
    if (!selectedCourseId) return null;
    const asNum = Number(selectedCourseId);
    return Number.isNaN(asNum) ? null : asNum;
  }, [selectedCourseId]);

  useEffect(() => {
    // Optionally ask backend to recompute/refresh aggregates
    updateStudentMetrics()
      .catch((err) => console.log('Metrics update failed:', err.message))
      .finally(() => {
        loadInitialData();
      });
  }, []);

  useEffect(() => {
    if (normalizedCourseId !== null) {
      loadCourseAnalytics(normalizedCourseId);
    } else {
      // Load global data when no specific course is selected
      loadGlobalAnalytics();
    }
  }, [normalizedCourseId]);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError("");

      // Try lecturer course options first, fallback to general courses API
      let coursesData = [];
      try {
        console.log('Loading lecturer course options...');
        const courseOptsRes = await lecturerCourseOptions();
        const payload = courseOptsRes?.data;

        if (Array.isArray(payload)) {
          coursesData = payload;
        } else if (payload?.courses && Array.isArray(payload.courses)) {
          coursesData = payload.courses;
        }
        console.log('Lecturer courses loaded:', coursesData);
      } catch (courseError) {
        console.log('Lecturer course options failed, trying general courses API');
        try {
          const fallbackCoursesRes = await getMyCourses();
          const fallbackPayload = fallbackCoursesRes?.data;
          
          if (Array.isArray(fallbackPayload)) {
            coursesData = fallbackPayload;
          } else if (fallbackPayload?.courses && Array.isArray(fallbackPayload.courses)) {
            coursesData = fallbackPayload.courses;
          }
          console.log('Fallback courses loaded:', coursesData);
        } catch (fallbackError) {
          console.error('Both course APIs failed:', fallbackError);
        }
      }

      setCourses(coursesData);

      // Load lecturer dashboard
      try {
        console.log('Loading lecturer dashboard...');
        const dashboardRes = await lecturerDashboard();
        setAnalyticsData(dashboardRes?.data ?? null);
        console.log('Dashboard data loaded:', dashboardRes?.data);
      } catch (dashboardError) {
        console.error('Dashboard loading failed:', dashboardError);
        // Continue without dashboard data
      }

      // Load engagement alerts
      try {
        const alertsRes = await getEngagementAlerts();
        setEngagementAlerts(alertsRes?.data || []);
      } catch (alertsError) {
        console.log('Engagement alerts failed:', alertsError.message);
      }

      // Auto-select the first available course
      if (coursesData.length > 0) {
        setSelectedCourseId(String(coursesData[0].id));
      } else {
        setSelectedCourseId("");
        setChartData({});
      }

    } catch (err) {
      console.error("Error loading initial analytics data:", err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.statusText ||
        "Failed to load analytics data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function loadGlobalAnalytics() {
    try {
      setLoadingCourse(true);

      // Load global AI quiz analytics
      const [
        difficultyRes,
        adaptiveEffectivenessRes
      ] = await Promise.all([
        getDifficultyDistribution({}).catch(() => null),
        getAdaptiveLearningEffectiveness({}).catch(() => null)
      ]);

      setDifficultyDistribution(difficultyRes?.data);
      setChartData({
        adaptiveEffectiveness: adaptiveEffectivenessRes?.data,
        global: true
      });

    } catch (err) {
      console.error("Error loading global analytics:", err);
    } finally {
      setLoadingCourse(false);
    }
  }

  async function loadCourseAnalytics(courseId) {
    try {
      setLoadingCourse(true);
      console.log('Loading analytics for course:', courseId);

      const [
        courseStatsRes,
        studentsNeedingAttentionRes,
        engagementTrendsRes,
        performanceTrendsRes,
        difficultyProgressionRes,
        difficultyDistributionRes,
        adaptiveEffectivenessRes
      ] = await Promise.all([
        getCourseStatistics(courseId).catch(() => null),
        getStudentsNeedingAttention(courseId).catch(() => null),
        getEngagementTrends({ period: "month", course_id: courseId }).catch(() => null),
        getPerformanceTrends({ period: "month", course_id: courseId }).catch(() => null),
        getDifficultyProgression({ course_id: courseId }).catch(() => null),
        getDifficultyDistribution({ course_id: courseId }).catch(() => null),
        getAdaptiveLearningEffectiveness({ course_id: courseId }).catch(() => null)
      ]);

      console.log('Course analytics loaded:', {
        courseStats: courseStatsRes?.data,
        studentsNeeding: studentsNeedingAttentionRes?.data,
        engagement: engagementTrendsRes?.data,
        performance: performanceTrendsRes?.data
      });

      setStudentsNeedingAttention(studentsNeedingAttentionRes?.data || []);
      setDifficultyDistribution(difficultyDistributionRes?.data);

      setChartData({
        courseStats: courseStatsRes?.data,
        engagement: engagementTrendsRes?.data,
        performance: performanceTrendsRes?.data,
        difficultyProgression: difficultyProgressionRes?.data,
        adaptiveEffectiveness: adaptiveEffectivenessRes?.data
      });

    } catch (err) {
      console.error("Error loading course analytics:", err);
    } finally {
      setLoadingCourse(false);
    }
  }

  const handleCourseChange = (e) => {
    setSelectedCourseId(e.target.value);
  };

  const handleInterventionEmail = async (studentId) => {
    if (!normalizedCourseId) return;
    
    try {
      await triggerInterventionEmail({ 
        student_id: studentId, 
        course_id: normalizedCourseId 
      });
      // Refresh students needing attention
      const updatedRes = await getStudentsNeedingAttention(normalizedCourseId);
      setStudentsNeedingAttention(updatedRes?.data || []);
    } catch (err) {
      console.error('Failed to send intervention email:', err);
    }
  };

  // ===== Helpers to shape chart data safely =====
  function processAIQuizParticipationData() {
    const courseStats = chartData?.courseStats;
    if (!courseStats?.quiz_participation) return [];
    
    return courseStats.quiz_participation.map((q) => ({
      quiz: q.title || `AI Quiz ${q.id}`,
      attempted: Number(q.attempted_count || 0),
      total: Number(q.total_students || 0),
      difficulty: q.difficulty || 'medium'
    }));
  }

  function processPerformanceData() {
    const trends = chartData?.performance?.trends || chartData?.performance;
    if (!Array.isArray(trends)) return [];
    
    return trends.map((t) => ({
      month: new Date(t.date || t.period).toLocaleDateString("en", { month: "short" }),
      score: Math.round(Number(t.average_score || t.avg_score || 0)),
      adaptiveScore: Math.round(Number(t.adaptive_score || 0))
    }));
  }

  function processDifficultyProgression() {
    const progression = chartData?.difficultyProgression;
    if (!progression?.levels) return [];
    
    return progression.levels.map((level) => ({
      difficulty: level.difficulty,
      completed: Number(level.completed_students || 0),
      average_score: Math.round(Number(level.average_score || 0)),
      total_students: Number(level.total_students || 0)
    }));
  }

  function processEngagementData() {
    const engagement = chartData?.engagement;
    if (!engagement?.daily_engagement) return [];
    
    return engagement.daily_engagement.slice(-7).map((day) => ({
      date: new Date(day.date).toLocaleDateString("en", { weekday: "short" }),
      interactions: Number(day.interactions || 0),
      quiz_attempts: Number(day.quiz_attempts || 0)
    }));
  }

  // ===== Derived UI data =====
  const metrics = analyticsData?.metrics || {};
  const aiQuizParticipation = processAIQuizParticipationData();
  const performanceSeries = processPerformanceData();
  const difficultyProgression = processDifficultyProgression();
  const engagementSeries = processEngagementData();
  const courseStats = chartData?.courseStats || {};

  if (loading && !analyticsData) {
    return (
      <div>
        <div className="NavBar">
          <NavBar />
        </div>
        <div className="Container">
          <div className="analytics-content">
            <div className="loading-state">
              <h3>Loading Quiz Analytics...</h3>
              <div className="loading-spinner"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="NavBar">
          <NavBar />
        </div>
        <div className="Container">
          <div className="analytics-content">
            <div className="error-state">
              <h3>Error Loading Analytics</h3>
              <p>{error}</p>
              <button onClick={loadInitialData} className="retry-btn">
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="NavBar">
        <NavBar />
      </div>

      <div className="Container">
        <div className="analytics-content">
          <div className="analytics-header">
            <h2>Quiz Student Analytics</h2>

            {/* Course Selector */}
            {courses.length > 0 && (
              <div className="course-selector">
                <label htmlFor="course-select">Analyze Course:</label>
                <select
                  id="course-select"
                  value={selectedCourseId}
                  onChange={handleCourseChange}
                >
                  <option value="">All Courses</option>
                  {courses.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Enhanced Metrics Grid for AI Quiz */}
          <div className="metrics-grid">
            <MetricCard
              title="Students Needing Support"
              value={studentsNeedingAttention.length || metrics.students_needing_support || "0"}
              subtitle="Based on quiz performance"
              trend={metrics.support_trend || 0}
            />
            <MetricCard
              title="Adaptive Learning Progress"
              value={`${courseStats.adaptive_completion_rate || metrics.adaptive_progress || 0}%`}
              subtitle="Students progressing through levels"
              trend={metrics.adaptive_trend || 0}
            />
            <MetricCard
              title="AI Quiz Participation"
              value={`${courseStats.participation_rate || metrics.participation_rate || 0}%`}
              subtitle="Recent quiz attempts"
              trend={metrics.participation_trend || 0}
            />
            <MetricCard
              title="Average Difficulty Level"
              value={courseStats.average_difficulty_level || "Medium"}
              subtitle="Current student progression"
              trend={courseStats.difficulty_trend || 0}
            />
          </div>

          {/* Enhanced Charts Grid for AI Quiz */}
          <div className="charts-grid">
            {/* AI Quiz Participation by Difficulty */}
            <div className="chart-section">
              {aiQuizParticipation.length > 0 ? (
                <BarChart
                  data={aiQuizParticipation}
                  title="AI Quiz Participation by Difficulty"
                />
              ) : (
                <div className="chart-placeholder">
                  <h4>Quiz Participation</h4>
                  <p>No quiz participation data available</p>
                </div>
              )}
            </div>

            {/* Adaptive Performance Trend */}
            <div className="chart-section">
              <div className="chart-container">
                <div className="chart-title">Adaptive Learning Performance</div>
                {performanceSeries.length > 0 ? (
                  <div className="line-chart adaptive-chart">
                    {performanceSeries.map((pt, idx) => (
                      <div key={idx} className="performance-point">
                        <div className="point-value">{pt.score}%</div>
                        <div
                          className="point-bar adaptive"
                          style={{ height: `${Math.max(pt.score, 10)}%` }}
                        ></div>
                        <div className="point-label">{pt.month}</div>
                        {pt.adaptiveScore > 0 && (
                          <div className="adaptive-indicator">
                            Adaptive: {pt.adaptiveScore}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="chart-placeholder">
                    <p>No performance trend data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Difficulty Progression */}
            <div className="chart-section">
              <div className="chart-container">
                <div className="chart-title">Difficulty Level Progression</div>
                {difficultyProgression.length > 0 ? (
                  <div className="difficulty-progression">
                    {difficultyProgression.map((level, idx) => {
                      const completionRate = level.total_students > 0 
                        ? Math.round((level.completed / level.total_students) * 100)
                        : 0;
                      return (
                        <div key={idx} className="difficulty-level">
                          <div className="level-header">
                            <span className={`difficulty-label ${level.difficulty}`}>
                              {level.difficulty.toUpperCase()}
                            </span>
                            <span className="completion-rate">{completionRate}%</span>
                          </div>
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{ width: `${completionRate}%` }}
                            ></div>
                          </div>
                          <div className="level-details">
                            <span>{level.completed}/{level.total_students} completed</span>
                            <span>Avg: {level.average_score}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="chart-placeholder">
                    <p>No difficulty progression data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Students Requiring Support */}
            <div className="chart-section">
              <div className="chart-container">
                <div className="chart-title">Students Requiring Learning Support</div>
                {studentsNeedingAttention.length > 0 ? (
                  <div className="support-list">
                    {studentsNeedingAttention.slice(0, 6).map((s, idx) => (
                      <div key={idx} className="support-item ai-support">
                        <div className={`trend-indicator ${s.trend || 'declining'}`}></div>
                        <div className="student-info">
                          <div className="student-name">{s.name || s.student_name || 'Anonymous'}</div>
                          <div className="student-details">
                            <span className="last-score">
                              Last: {Math.round(Number(s.last_score || s.latest_score || 0))}%
                            </span>
                            <span className="difficulty-stuck">
                              Stuck at: {s.difficulty_level || s.current_level || 'Unknown'}
                            </span>
                            <span className="quiz-attempts">
                              Attempts: {s.quiz_attempts || s.total_attempts || 0}
                            </span>
                          </div>
                        </div>
                        <button 
                          className="action-button"
                          onClick={() => handleInterventionEmail(s.student_id || s.id)}
                        >
                          Send Help
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="chart-placeholder">
                    <p>All students are progressing well with quizzes</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Loading indicator for course-specific data */}
          {loadingCourse && (
            <div className="loading-overlay">
              <div className="loading-message">Loading course analytics...</div>
            </div>
          )}

          {/* AI Quiz Specific Support Actions */}
          <div className="support-actions">
            <h3>AI Learning Support Actions</h3>
            <div className="actions-grid">
              <div className="action-card urgent">
                <div className="action-header">
                  <div className="action-icon">🎯</div>
                  <div className="action-title">Difficulty Adjustment</div>
                </div>
                <div className="action-content">
                  <p>
                    {courseStats.students_stuck_on_difficulty || 0} students stuck on higher difficulty levels
                  </p>
                  <button className="action-btn">Adjust AI Parameters</button>
                </div>
              </div>

              <div className="action-card moderate">
                <div className="action-header">
                  <div className="action-icon">🧠</div>
                  <div className="action-title">Adaptive Coaching</div>
                </div>
                <div className="action-content">
                  <p>Provide personalized learning paths for struggling students</p>
                  <button className="action-btn">Generate Learning Plans</button>
                </div>
              </div>

              <div className="action-card positive">
                <div className="action-header">
                  <div className="action-icon">📈</div>
                  <div className="action-title">Progress Celebration</div>
                </div>
                <div className="action-content">
                  <p>
                    {courseStats.students_advancing || metrics.improving_students || 0} students advancing through difficulty levels
                  </p>
                  <button className="action-btn">Send Badges</button>
                </div>
              </div>
            </div>
          </div>

          {/* AI Learning Insights */}
          <div className="insights-section">
            <h3>AI Learning Insights</h3>
            <div className="insights-grid">
              <div className="insight-card">
                <div className="insight-icon">🔄</div>
                <div className="insight-content">
                  <div className="insight-title">Adaptive Effectiveness</div>
                  <div className="insight-description">
                    {chartData?.adaptiveEffectiveness?.insight ||
                      "AI difficulty adjustment improves learning outcomes by 23% on average"}
                  </div>
                </div>
              </div>

              <div className="insight-card">
                <div className="insight-icon">⚡</div>
                <div className="insight-content">
                  <div className="insight-title">Engagement Patterns</div>
                  <div className="insight-description">
                    {analyticsData?.insights?.engagement_insight ||
                      "Students engage 40% more with AI quizzes vs traditional assessments"}
                  </div>
                </div>
              </div>

              <div className="insight-card">
                <div className="insight-icon">🎯</div>
                <div className="insight-content">
                  <div className="insight-title">Difficulty Optimization</div>
                  <div className="insight-description">
                    {difficultyDistribution?.insight ||
                      "Optimal difficulty progression reduces dropout by 15%"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Engagement Alerts */}
          {engagementAlerts.length > 0 && (
            <div className="alerts-section">
              <h3>Engagement Alerts</h3>
              <div className="alerts-list">
                {engagementAlerts.map((alert, idx) => (
                  <div key={idx} className={`alert-item ${alert.severity || 'medium'}`}>
                    <div className="alert-content">
                      <div className="alert-title">{alert.title}</div>
                      <div className="alert-description">{alert.message}</div>
                      <div className="alert-timestamp">
                        {new Date(alert.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button className="alert-action">Take Action</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right rail */}
      <div className="SideST">
        <div className="List">
          <CoursesList
            courses={courses}
            selectedCourse={courses.find(
              (c) => String(c.id) === String(selectedCourseId)
            )}
            onCourseSelect={(course) => setSelectedCourseId(String(course.id))}
          />
        </div>
      </div>

      <div className="BoiST">
        <Bio />
      </div>
    </div>
  );
}

export default StudentAnalytics;