// src/Views/Lacture/StudentAnalytics.js
import { useState, useEffect, useMemo } from "react";
import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";

import {
  lecturerDashboard,
  lecturerCourseOptions,
  updateStudentMetrics,
  getCourseStatistics,
  getEngagementTrends,
  getPerformanceTrends,
  getStudentsNeedingAttention,
  triggerInterventionEmail,
  getEngagementAlerts,
} from "../../api/analytics";

import { getMyCourses } from "../../api/courses";
import "./StudentAnalytics.css";

function StudentAnalytics() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [courseData, setCourseData] = useState(null);
  const [engagementData, setEngagementData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [studentsNeedingHelp, setStudentsNeedingHelp] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState({});
  const [error, setError] = useState("");

  const normalizedCourseId = useMemo(() => {
    if (!selectedCourseId) return null;
    const asNum = Number(selectedCourseId);
    return Number.isNaN(asNum) ? null : asNum;
  }, [selectedCourseId]);

  useEffect(() => {
    updateStudentMetrics()
      .catch(() => {})
      .finally(() => loadInitialData());
  }, []);

  useEffect(() => {
    if (normalizedCourseId) {
      loadCourseData(normalizedCourseId);
    } else {
      loadAllCoursesData();
    }
  }, [normalizedCourseId]);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError("");

      let coursesData = [];
      try {
        const res = await lecturerCourseOptions();
        coursesData = res?.data?.courses || res?.data || [];
      } catch {
        const res = await getMyCourses();
        coursesData = res?.data || [];
      }

      setCourses(coursesData);
      if (coursesData.length > 0) {
        setSelectedCourseId(String(coursesData[0].id));
      }

      // Load engagement alerts
      try {
        const alertsRes = await getEngagementAlerts();
        setAlerts(alertsRes?.data || []);
      } catch (err) {
        console.log('Failed to load alerts:', err);
      }
    } catch (err) {
      setError("Failed to load courses");
    } finally {
      setLoading(false);
    }
  }

  async function loadAllCoursesData() {
    try {
      const [dashboardRes, engagementRes, performanceRes] = await Promise.all([
        lecturerDashboard().catch(() => null),
        getEngagementTrends({ period: "30" }).catch(() => null),
        getPerformanceTrends({ period: "30" }).catch(() => null),
      ]);

      setCourseData(dashboardRes?.data || null);
      setEngagementData(engagementRes?.data || null);
      setPerformanceData(performanceRes?.data || null);

      // Load at-risk students from all courses
      const allStudents = [];
      for (const course of courses) {
        try {
          const studentsRes = await getStudentsNeedingAttention(course.id);
          const students = studentsRes?.data || [];
          students.forEach(student => {
            allStudents.push({
              ...student,
              course_code: course.code,
              course_name: course.name,
              course_id: course.id
            });
          });
        } catch (err) {
          console.log(`Failed to load students for course ${course.id}`);
        }
      }
      setStudentsNeedingHelp(allStudents);
    } catch (err) {
      console.error("Error loading all courses data:", err);
    }
  }

  async function loadCourseData(courseId) {
    try {
      const [courseRes, engagementRes, performanceRes, studentsRes] = await Promise.all([
        getCourseStatistics(courseId).catch(() => null),
        getEngagementTrends({ period: "30", course_id: courseId }).catch(() => null),
        getPerformanceTrends({ period: "30", course_id: courseId }).catch(() => null),
        getStudentsNeedingAttention(courseId).catch(() => null),
      ]);

      setCourseData(courseRes?.data || null);
      setEngagementData(engagementRes?.data || null);
      setPerformanceData(performanceRes?.data || null);
      setStudentsNeedingHelp(studentsRes?.data || []);
    } catch (err) {
      console.error("Error loading course data:", err);
    }
  }

  const handleCourseChange = (e) => {
    setSelectedCourseId(e.target.value);
  };

  const handleSendHelpEmail = async (student) => {
    const studentId = student.student_id || student.id;
    const courseId = student.course_id || normalizedCourseId;
    
    if (!courseId) {
      alert('Unable to send email: Course information missing');
      return;
    }
    
    setSendingEmail(prev => ({ ...prev, [studentId]: true }));

    try {
      await triggerInterventionEmail({
        student_id: studentId,
        course_id: courseId
      });
      alert(`Support email sent to ${student.name || student.student_name}`);
      
      // Reload students based on current view
      if (normalizedCourseId) {
        await loadCourseData(normalizedCourseId);
      } else {
        await loadAllCoursesData();
      }
    } catch (err) {
      alert('Failed to send email. Please try again.');
      console.error('Email error:', err);
    } finally {
      setSendingEmail(prev => ({ ...prev, [studentId]: false }));
    }
  };

  // Extract key metrics
  const getMetrics = () => {
    if (!courseData) return { enrolled: 0, attempts: 0, avgScore: 0, quizzes: 0, needsHelp: 0 };

    if (courseData.course_overview) {
      const totals = courseData.course_overview.reduce(
        (acc, course) => ({
          enrolled: acc.enrolled + (course.total_students || 0),
          attempts: acc.attempts + (course.total_attempts || 0),
          avgScore: acc.avgScore + (course.average_score || 0),
          quizzes: acc.quizzes + (course.total_ai_quizzes || 0),
        }),
        { enrolled: 0, attempts: 0, avgScore: 0, quizzes: 0 }
      );
      return {
        ...totals,
        avgScore: courseData.course_overview.length > 0 
          ? totals.avgScore / courseData.course_overview.length 
          : 0,
        needsHelp: courseData.recent_performance?.students_needing_attention || 0,
      };
    } else {
      return {
        enrolled: courseData.student_engagement?.total_enrolled || 0,
        attempts: courseData.total_attempts || 0,
        avgScore: courseData.overall_average || 0,
        quizzes: courseData.total_ai_quizzes || 0,
        needsHelp: courseData.student_engagement?.students_needing_attention || 0,
      };
    }
  };

  const metrics = getMetrics();

  // Get recent activity (last 7 days)
  const getRecentActivity = () => {
    if (!engagementData?.daily_engagement) return [];
    return engagementData.daily_engagement.slice(-7);
  };

  const recentActivity = getRecentActivity();

  // Calculate engagement rate
  const calculateEngagementRate = () => {
    if (!engagementData?.summary) return 0;
    const { total_attempts } = engagementData.summary;
    const enrolled = metrics.enrolled;
    if (enrolled === 0) return 0;
    return Math.min(100, Math.round((total_attempts / enrolled) * 10));
  };

  // Get performance distribution
  const getPerformanceDistribution = () => {
    if (!courseData) return null;

    if (courseData.student_distribution) {
      return courseData.student_distribution;
    } else if (courseData.student_engagement?.performance_distribution) {
      const dist = courseData.student_engagement.performance_distribution;
      return [
        { performance_category: 'excellent', count: dist.excellent || 0, percentage: 0 },
        { performance_category: 'good', count: dist.good || 0, percentage: 0 },
        { performance_category: 'danger', count: dist.danger || 0, percentage: 0 },
      ].filter(item => item.count > 0);
    }
    return null;
  };

  const distribution = getPerformanceDistribution();
  const totalStudents = distribution?.reduce((sum, d) => sum + d.count, 0) || 0;

  if (loading) {
    return (
      <div>
        <div className="NavBar"><NavBar /></div>
        <div className="Container">
          <div className="analytics-content">
            <div className="loading-state">Loading Analytics...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="NavBar"><NavBar /></div>

      <div className="Container">
        <div className="analytics-content">
          {/* Header */}
          <div className="analytics-header">
            <h2>Student Quiz Analytics</h2>
            {courses.length > 0 && (
              <div className="course-selector">
                <label htmlFor="course-select">Course:</label>
                <select id="course-select" value={selectedCourseId} onChange={handleCourseChange}>
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

          {/* Key Metrics */}
          <div className="metrics-grid-clean">
            <div className="metric-card">
              <div className="metric-icon">👥</div>
              <div className="metric-data">
                <div className="metric-value">{metrics.enrolled}</div>
                <div className="metric-label">Students Enrolled</div>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">📝</div>
              <div className="metric-data">
                <div className="metric-value">{metrics.quizzes}</div>
                <div className="metric-label">Quizzes Available</div>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">✍️</div>
              <div className="metric-data">
                <div className="metric-value">{metrics.attempts}</div>
                <div className="metric-label">Total Attempts</div>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">📊</div>
              <div className="metric-data">
                <div className="metric-value">{Math.round(metrics.avgScore)}%</div>
                <div className="metric-label">Average Score</div>
              </div>
            </div>
            <div className="metric-card alert">
              <div className="metric-icon">⚠️</div>
              <div className="metric-data">
                <div className="metric-value">{metrics.needsHelp}</div>
                <div className="metric-label">Need Support</div>
              </div>
            </div>
          </div>

          {/* Students Needing Help - Always Show */}
          {studentsNeedingHelp.length > 0 && (
            <div className="section-card urgent">
              <h3>Students Requiring Immediate Attention ({studentsNeedingHelp.length})</h3>
              <div className="students-help-grid">
                {studentsNeedingHelp.map((student, idx) => {
                  const studentId = student.student_id || student.id;
                  const studentName = student.name || student.student_name || 'Unknown Student';
                  const studentNumber = student.student_number || 'N/A';
                  const lastScore = Math.round(student.last_score || student.latest_score || 0);
                  const attempts = student.quiz_attempts || student.total_attempts || 0;
                  const missed = student.consecutive_missed || student.consecutive_missed_quizzes || 0;
                  const courseInfo = student.course_code ? `${student.course_code}` : '';
                  
                  return (
                    <div key={idx} className="student-help-card">
                      <div className="student-header">
                        <div className="student-avatar">
                          {studentName[0].toUpperCase()}
                        </div>
                        <div className="student-info">
                          <div className="student-name">{studentName}</div>
                          <div className="student-number">{studentNumber}</div>
                          {courseInfo && <div className="student-course">{courseInfo}</div>}
                        </div>
                      </div>
                      <div className="student-stats">
                        <div className="stat-item">
                          <span className="stat-label">Last Score:</span>
                          <span className="stat-value danger">{lastScore}%</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Quiz Attempts:</span>
                          <span className="stat-value">{attempts}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Consecutive Missed:</span>
                          <span className="stat-value">{missed} quizzes</span>
                        </div>
                      </div>
                      <button 
                        className="help-button"
                        onClick={() => handleSendHelpEmail(student)}
                        disabled={sendingEmail[studentId]}
                      >
                        {sendingEmail[studentId] ? 'Sending...' : 'Send Support Email'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Performance Overview Chart */}
          {distribution && totalStudents > 0 && (
            <div className="section-card">
              <h3>Student Performance Overview</h3>
              <div className="chart-container">
                <div className="donut-chart">
                  {distribution.map((item, idx) => {
                    const percentage = Math.round((item.count / totalStudents) * 100);
                    const colors = {
                      excellent: '#2563eb',
                      good: '#60a5fa',
                      danger: '#f87171'
                    };
                    const labels = {
                      excellent: 'Excellent',
                      good: 'Good',
                      danger: 'At Risk'
                    };
                    
                    return (
                      <div key={idx} className="chart-segment">
                        <div className="chart-bar-wrapper">
                          <div className="chart-label-group">
                            <div 
                              className="color-indicator" 
                              style={{ backgroundColor: colors[item.performance_category] }}
                            />
                            <span className="chart-label">{labels[item.performance_category]}</span>
                          </div>
                          <div className="chart-bar-bg">
                            <div 
                              className="chart-bar-fill"
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: colors[item.performance_category]
                              }}
                            />
                          </div>
                          <span className="chart-percentage">{item.count} ({percentage}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Engagement Trend */}
          <div className="section-card">
            <h3>Weekly Engagement Trend</h3>
            {recentActivity.length > 0 ? (
              <div className="trend-chart">
                {recentActivity.map((day, idx) => {
                  const maxAttempts = Math.max(...recentActivity.map(d => d.total_attempts), 1);
                  const heightPercent = (day.total_attempts / maxAttempts) * 100;
                  
                  return (
                    <div key={idx} className="trend-bar-wrapper">
                      <div className="trend-bar-container">
                        <div 
                          className="trend-bar"
                          style={{ height: `${Math.max(heightPercent, 5)}%` }}
                          title={`${day.total_attempts} attempts`}
                        />
                      </div>
                      <div className="trend-label">
                        {new Date(day.date).toLocaleDateString("en", { weekday: "short" })}
                      </div>
                      <div className="trend-value">{day.total_attempts}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="no-data">No activity data available</p>
            )}
          </div>

          {/* Weekly Performance */}
          {performanceData?.weekly_performance && performanceData.weekly_performance.length > 0 && (
            <div className="section-card">
              <h3>Performance Trend (Weekly Averages)</h3>
              <div className="performance-chart">
                {performanceData.weekly_performance.map((week, idx) => (
                  <div key={idx} className="performance-item">
                    <div className="week-label">
                      {new Date(week.week_start).toLocaleDateString("en", { month: "short", day: "numeric" })}
                    </div>
                    <div className="score-bar-bg">
                      <div 
                        className="score-bar"
                        style={{ 
                          width: `${Math.round(week.average_score)}%`,
                          backgroundColor: week.average_score >= 70 ? '#2563eb' : week.average_score >= 50 ? '#60a5fa' : '#f87171'
                        }}
                      />
                    </div>
                    <div className="score-value">{Math.round(week.average_score)}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Engagement Alerts */}
          {alerts.length > 0 && (
            <div className="section-card alert">
              <h3>Engagement Alerts</h3>
              <div className="alerts-list">
                {alerts.map((alert, idx) => (
                  <div key={idx} className={`alert-item severity-${alert.severity || 'medium'}`}>
                    <div className="alert-icon">⚠️</div>
                    <div className="alert-content">
                      <div className="alert-title">{alert.title || 'Alert'}</div>
                      <div className="alert-message">{alert.message}</div>
                      <div className="alert-time">
                        {new Date(alert.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {metrics.attempts === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3>No Quiz Data Available</h3>
              <p>Students haven't taken any quizzes yet. Once they start, you'll see detailed analytics here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="SideST">
        <CoursesList
          courses={courses}
          selectedCourse={courses.find(c => String(c.id) === String(selectedCourseId))}
          onCourseSelect={(course) => setSelectedCourseId(String(course.id))}
        />
      </div>

      <div className="BoiST">
        <Bio />
      </div>

      <style jsx>{`
        .analytics-content {
          padding: 2rem;
          max-width: 1400px;
        }

        .analytics-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .analytics-header h2 {
          color: #1e40af;
          font-size: 1.75rem;
          margin: 0;
        }

        .course-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .course-selector select {
          padding: 0.5rem 1rem;
          border: 2px solid #2563eb;
          border-radius: 6px;
          font-size: 1rem;
          background: white;
          color: #1e40af;
          cursor: pointer;
        }

        /* Metrics Grid */
        .metrics-grid-clean {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
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

        .metric-card.alert {
          border-color: #fbbf24;
          background: #fef3c7;
        }

        .metric-icon {
          font-size: 2rem;
        }

        .metric-value {
          font-size: 2rem;
          font-weight: bold;
          color: #1e40af;
        }

        .metric-label {
          font-size: 0.875rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }

        /* Section Cards */
        .section-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .section-card.urgent {
          border-color: #fbbf24;
          background: linear-gradient(to bottom, #fffbeb, white);
        }

        .section-card.alert {
          border-color: #f87171;
          background: #fef2f2;
        }

        .section-card h3 {
          color: #1e40af;
          margin: 0 0 1.5rem 0;
          font-size: 1.25rem;
        }

        /* Students Help Cards */
        .students-help-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        .student-help-card {
          background: white;
          border: 2px solid #fbbf24;
          border-radius: 8px;
          padding: 1rem;
        }

        .student-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .student-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #2563eb;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: bold;
        }

        .student-name {
          font-weight: 600;
          color: #1f2937;
        }

        .student-number {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .student-course {
          font-size: 0.75rem;
          color: #2563eb;
          font-weight: 600;
          margin-top: 0.25rem;
        }

        .student-stats {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
          padding: 0.75rem;
          background: #f9fafb;
          border-radius: 6px;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
        }

        .stat-label {
          color: #6b7280;
        }

        .stat-value {
          font-weight: 600;
          color: #1f2937;
        }

        .stat-value.danger {
          color: #dc2626;
        }

        .help-button {
          width: 100%;
          padding: 0.75rem;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .help-button:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .help-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        /* Charts */
        .chart-container {
          padding: 1rem 0;
        }

        .chart-segment {
          margin-bottom: 1.5rem;
        }

        .chart-bar-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .chart-label-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .color-indicator {
          width: 16px;
          height: 16px;
          border-radius: 4px;
        }

        .chart-label {
          font-weight: 600;
          color: #374151;
        }

        .chart-bar-bg {
          height: 32px;
          background: #f3f4f6;
          border-radius: 6px;
          overflow: hidden;
        }

        .chart-bar-fill {
          height: 100%;
          transition: width 0.5s ease;
        }

        .chart-percentage {
          font-size: 0.875rem;
          color: #6b7280;
          align-self: flex-end;
        }

        /* Trend Chart */
        .trend-chart {
          display: flex;
          align-items: flex-end;
          justify-content: space-around;
          height: 200px;
          padding: 1rem;
          gap: 0.5rem;
        }

        .trend-bar-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
        }

        .trend-bar-container {
          width: 100%;
          height: 150px;
          display: flex;
          align-items: flex-end;
        }

        .trend-bar {
          width: 100%;
          background: linear-gradient(to top, #2563eb, #60a5fa);
          border-radius: 4px 4px 0 0;
          transition: height 0.3s ease;
        }

        .trend-label {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.5rem;
        }

        .trend-value {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1e40af;
        }

        /* Performance Chart */
        .performance-chart {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .performance-item {
          display: grid;
          grid-template-columns: 100px 1fr 80px;
          align-items: center;
          gap: 1rem;
        }

        .week-label {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .score-bar-bg {
          height: 32px;
          background: #f3f4f6;
          border-radius: 6px;
          overflow: hidden;
        }

        .score-bar {
          height: 100%;
          transition: width 0.5s ease;
        }

        .score-value {
          font-weight: 600;
          color: #1e40af;
          text-align: right;
        }

        /* Alerts */
        .alerts-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .alert-item {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: white;
          border: 2px solid #fbbf24;
          border-radius: 8px;
        }

        .alert-icon {
          font-size: 1.5rem;
        }

        .alert-title {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.25rem;
        }

        .alert-message {
          color: #6b7280;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }

        .alert-time {
          font-size: 0.75rem;
          color: #9ca3af;
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
          color: #1e40af;
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          color: #6b7280;
        }

        .no-data {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        .loading-state {
          text-align: center;
          padding: 4rem;
          color: #2563eb;
          font-size: 1.25rem;
        }
      `}</style>
    </div>
  );
}

export default StudentAnalytics;