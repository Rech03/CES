// src/Views/Lecture/StudentAnalytics.js
import { useState, useEffect, useMemo } from "react";

// NOTE: keeping these relative paths exactly as you have them
import BarChart from "../../Componets/Lacture/BarChart";
import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import MetricCard from "../../Componets/Lacture/MetricCard";
import NavBar from "../../Componets/Lacture/NavBar";
import StarRating from "../../Componets/Lacture/StarRating";

import {
  lecturerDashboard,
  lecturerChart,
  lecturerCourseOptions,
  getEngagementTrends,
  getPerformanceTrends,
  // optional: update backend-derived aggregates before fetching dashboards
  updateStudentMetrics,
} from "../../api/analytics";

import "./StudentAnalytics.css";

/**
 * Lecturer Student Analytics
 * - Uses the correct lecturer analytics endpoints
 * - Uses lecturerCourseOptions() for the course list
 * - Defensive parsing for API shapes { courses: [...] } vs [...]
 * - Normalizes IDs to numbers when calling APIs
 */
function StudentAnalytics() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [chartData, setChartData] = useState({});
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
    // Safe to ignore failures
    updateStudentMetrics()
      .catch(() => {})
      .finally(() => {
        loadInitialData();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (normalizedCourseId !== null) {
      loadCourseAnalytics(normalizedCourseId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedCourseId]);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError("");

      // Fetch lecturer dashboard + course options in parallel
      const [dashboardRes, courseOptsRes] = await Promise.all([
        lecturerDashboard(),
        lecturerCourseOptions(),
      ]);

      setAnalyticsData(dashboardRes?.data ?? null);

      // Handle courses response that might be { courses: [...] } or [...]
      let coursesData = [];
      const payload = courseOptsRes?.data;

      if (Array.isArray(payload)) {
        coursesData = payload;
      } else if (payload?.courses && Array.isArray(payload.courses)) {
        coursesData = payload.courses;
      }
      setCourses(coursesData);

      // Auto-select the first available course
      if (coursesData.length > 0) {
        setSelectedCourseId(String(coursesData[0].id));
      } else {
        // No courses → clear charts
        setSelectedCourseId("");
        setChartData({});
      }
    } catch (err) {
      console.error("Error loading lecturer analytics:", err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.statusText ||
        "Failed to load analytics data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function loadCourseAnalytics(courseId) {
    try {
      setLoadingCourse(true);

      const [
        engagementRes,
        performanceRes,
        participationRes,
        strugglingRes,
      ] = await Promise.all([
        getEngagementTrends({ period: "month", course_id: courseId }).catch(
          () => null
        ),
        getPerformanceTrends({ period: "month", course_id: courseId }).catch(
          () => null
        ),
        // Custom per-course charts
        lecturerChart({
          chart_type: "participation",
          target_id: courseId,
        }).catch(() => null),
        lecturerChart({
          chart_type: "struggling_students",
          target_id: courseId,
        }).catch(() => null),
      ]);

      setChartData({
        engagement: engagementRes?.data ?? null,
        performance: performanceRes?.data ?? null,
        participation: participationRes?.data ?? null,
        struggling: strugglingRes?.data ?? null,
      });
    } catch (err) {
      console.error("Error loading course analytics:", err);
      // Non-fatal: keep UI visible
    } finally {
      setLoadingCourse(false);
    }
  }

  const handleCourseChange = (e) => {
    setSelectedCourseId(e.target.value);
  };

  // ===== Helpers to shape chart data safely =====
  function processQuizParticipationData() {
    const quizzes = chartData?.participation?.quizzes;
    if (!Array.isArray(quizzes)) return [];
    return quizzes.map((q) => ({
      quiz: q.title || `Quiz ${q.id}`,
      attempted: Number(q.attempted_count || 0),
      total: Number(q.total_students || 0),
    }));
  }

  function processPerformanceData() {
    const trends = chartData?.performance?.trends;
    if (!Array.isArray(trends)) return [];
    return trends.map((t) => ({
      month: new Date(t.date).toLocaleDateString("en", { month: "short" }),
      score: Math.round(Number(t.average_score || 0)),
    }));
  }

  function processConceptStruggles() {
    const concepts = chartData?.struggling?.concepts;
    if (!Array.isArray(concepts)) return [];
    return concepts.map((c) => ({
      concept: c.name,
      struggling: Number(c.struggling_count || 0),
      total: Number(c.total_students || 0),
    }));
  }

  function processStrugglingStudents() {
    const students = chartData?.struggling?.students;
    if (!Array.isArray(students)) return [];
    return students.map((s) => ({
      name: s.name || "Anonymous",
      trend: s.trend || "stable",
      lastScore: `${Math.round(Number(s.last_score || 0))}%`,
      needsHelp: s.weak_areas?.[0] || "General Support",
    }));
  }

  // ===== Derived UI data =====
  const metrics = analyticsData?.metrics || {};
  const quizParticipationData = processQuizParticipationData();
  const performanceSeries = processPerformanceData();
  const conceptStruggles = processConceptStruggles();
  const strugglingStudents = processStrugglingStudents();

  if (loading && !analyticsData) {
    return (
      <div>
        <div className="NavBar">
          <NavBar />
        </div>
        <div className="Container">
          <div className="analytics-content">
            <div className="loading-state">
              <h3>Loading Student Analytics...</h3>
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
            <h2>Student Support Analytics</h2>

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

          {/* Metrics Grid */}
          <div className="metrics-grid">
            <MetricCard
              title="Students Needing Support"
              value={metrics.students_needing_support || "0"}
              subtitle="Below 60% average"
              trend={metrics.support_trend || 0}
            />
            <MetricCard
              title="Improving Students"
              value={metrics.improving_students || "0"}
              subtitle="Upward trend this month"
              trend={metrics.improvement_trend || 0}
            />
            <MetricCard
              title="Participation Rate"
              value={`${metrics.participation_rate || 0}%`}
              subtitle="Recent quiz attempts"
              trend={metrics.participation_trend || 0}
            />
            <MetricCard
              title="Help Requests"
              value={metrics.help_requests || "0"}
              subtitle="This week"
              trend={metrics.help_trend || 0}
            />
          </div>

          {/* Charts Grid */}
          <div className="charts-grid">
            {/* Quiz Participation Chart */}
            <div className="chart-section">
              {quizParticipationData.length > 0 ? (
                <BarChart
                  data={quizParticipationData}
                  title="Quiz Participation Tracking"
                />
              ) : (
                <div className="chart-placeholder">
                  <h4>Quiz Participation Tracking</h4>
                  <p>No participation data available</p>
                </div>
              )}
            </div>

            {/* Performance Trend */}
            <div className="chart-section">
              <div className="chart-container">
                <div className="chart-title">Class Performance Trend</div>
                {performanceSeries.length > 0 ? (
                  <div className="line-chart">
                    {performanceSeries.map((pt, idx) => (
                      <div key={idx} className="performance-point">
                        <div className="point-value">{pt.score}%</div>
                        <div
                          className="point-bar"
                          style={{ height: `${Math.max(pt.score, 10)}%` }}
                        ></div>
                        <div className="point-label">{pt.month}</div>
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

            {/* Concepts Needing Attention */}
            <div className="chart-section">
              <div className="chart-container">
                <div className="chart-title">Concepts Needing Attention</div>
                {conceptStruggles.length > 0 ? (
                  <div className="concept-struggles">
                    {conceptStruggles.map((it, idx) => {
                      const pct =
                        it.total > 0
                          ? Math.round((it.struggling / it.total) * 100)
                          : 0;
                      return (
                        <div key={idx} className="concept-item">
                          <div className="concept-name">{it.concept}</div>
                          <div className="struggle-bar">
                            <div
                              className="struggle-fill"
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                          <div className="struggle-count">
                            {it.struggling}/{it.total} struggling
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="chart-placeholder">
                    <p>No concept struggle data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Students Requiring Support */}
            <div className="chart-section">
              <div className="chart-container">
                <div className="chart-title">Students Requiring Support</div>
                {strugglingStudents.length > 0 ? (
                  <div className="support-list">
                    {strugglingStudents.slice(0, 6).map((s, idx) => (
                      <div key={idx} className="support-item">
                        <div className={`trend-indicator ${s.trend}`}></div>
                        <div className="student-info">
                          <div className="student-name">{s.name}</div>
                          <div className="student-details">
                            <span className="last-score">Last: {s.lastScore}</span>
                            <span className="help-area">Focus: {s.needsHelp}</span>
                          </div>
                        </div>
                        <div className="action-button">Reach Out</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="chart-placeholder">
                    <p>No students requiring support at this time</p>
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

          {/* Support Actions Section */}
          <div className="support-actions">
            <h3>Recommended Actions</h3>
            <div className="actions-grid">
              <div className="action-card urgent">
                <div className="action-header">
                  <div className="action-icon">🚨</div>
                  <div className="action-title">Immediate Attention</div>
                </div>
                <div className="action-content">
                  <p>
                    {metrics.urgent_students || 0} students have missed multiple
                    quizzes and are falling behind
                  </p>
                  <button className="action-btn">Send Check-in Email</button>
                </div>
              </div>

              <div className="action-card moderate">
                <div className="action-header">
                  <div className="action-icon">📚</div>
                  <div className="action-title">Study Support</div>
                </div>
                <div className="action-content">
                  <p>Create study group for challenging concepts</p>
                  <button className="action-btn">Organize Session</button>
                </div>
              </div>

              <div className="action-card positive">
                <div className="action-header">
                  <div className="action-icon">🎯</div>
                  <div className="action-title">Encourage Progress</div>
                </div>
                <div className="action-content">
                  <p>
                    {metrics.improving_students || 0} students showing improvement
                    — send motivational message
                  </p>
                  <button className="action-btn">Send Encouragement</button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Insights */}
          <div className="insights-section">
            <h3>Support Insights</h3>
            <div className="insights-grid">
              <div className="insight-card">
                <div className="insight-icon">⏰</div>
                <div className="insight-content">
                  <div className="insight-title">Timing Patterns</div>
                  <div className="insight-description">
                    {analyticsData?.insights?.timing_insight ||
                      "Students who attempt quizzes late tend to score lower"}
                  </div>
                </div>
              </div>

              <div className="insight-card">
                <div className="insight-icon">🤝</div>
                <div className="insight-content">
                  <div className="insight-title">Peer Support</div>
                  <div className="insight-description">
                    {analyticsData?.insights?.peer_insight ||
                      "Study groups improve struggling student scores significantly"}
                  </div>
                </div>
              </div>

              <div className="insight-card">
                <div className="insight-icon">💡</div>
                <div className="insight-content">
                  <div className="insight-title">Learning Strategy</div>
                  <div className="insight-description">
                    {analyticsData?.insights?.strategy_insight ||
                      "Concept review sessions reduce quiz anxiety and improve performance"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right rail */}
      <div className="SideST">
        <div className="Rating">
          <StarRating initialRating={4} />
        </div>
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
