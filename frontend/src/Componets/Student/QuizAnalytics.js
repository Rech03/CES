import React, { useState, useEffect } from 'react';
import './QuizAnalytics.css';
// Import correct APIs
import { getProfile } from '../../api/users';
import { getStats as getAchievementStats } from '../../api/achievements';
import { studentDashboard as getAnalyticsDashboard } from '../../api/analytics';
import { getStudentDashboard as getCoursesDashboard } from '../../api/courses';

const QuizAnalytics = ({ studentId = null }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 1. Get user profile
        let userProfile = {
          name: "Student",
          studentId: "Unknown",
          enrollmentDate: new Date().toISOString().split('T')[0]
        };

        try {
          const profileResponse = await getProfile();
          const user = profileResponse.data;
          userProfile = {
            name: user?.full_name || 
                  user?.name ||
                  `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
                  user?.username ||
                  "Student",
            studentId: user?.student_number || user?.id || "Unknown",
            enrollmentDate: user?.date_joined || user?.created_at || new Date().toISOString().split('T')[0]
          };
        } catch (err) {
          console.warn('Could not fetch user profile:', err);
        }

        // 2. Get achievement stats (primary source)
        let stats = {
          totalQuizzes: 0,
          completedQuizzes: 0,
          averageScore: 0,
          totalTimeSpent: 0,
          passRate: 0,
          lastActivity: null,
          currentStreak: 0
        };

        try {
          const achievementResponse = await getAchievementStats();
          const achievementData = achievementResponse.data;
          console.log('Achievement stats:', achievementData);

          stats = {
            totalQuizzes: achievementData?.total_quizzes || achievementData?.quizzes_attempted || 0,
            completedQuizzes: achievementData?.quizzes_completed || achievementData?.completed_quizzes || 0,
            averageScore: achievementData?.average_score || achievementData?.avg_score || 0,
            totalTimeSpent: achievementData?.total_time_spent || achievementData?.study_time || 0,
            passRate: achievementData?.pass_rate || achievementData?.success_rate || 0,
            lastActivity: achievementData?.last_activity || achievementData?.last_quiz_date,
            currentStreak: achievementData?.current_streak || achievementData?.day_streak || 0
          };
        } catch (err) {
          console.warn('Could not fetch achievement stats, trying analytics dashboard:', err);
          
          // Fallback to analytics dashboard
          try {
            const analyticsResponse = await getAnalyticsDashboard();
            const analyticsData = analyticsResponse.data;
            console.log('Analytics dashboard:', analyticsData);

            stats = {
              totalQuizzes: analyticsData?.total_quizzes || analyticsData?.quizzes_attempted || 0,
              completedQuizzes: analyticsData?.quizzes_completed || analyticsData?.completed_quizzes || 0,
              averageScore: analyticsData?.average_score || analyticsData?.avg_score || 0,
              totalTimeSpent: analyticsData?.total_time_spent || analyticsData?.study_time || 0,
              passRate: analyticsData?.pass_rate || analyticsData?.success_rate || 0,
              lastActivity: analyticsData?.last_activity || analyticsData?.last_quiz_date,
              currentStreak: analyticsData?.current_streak || analyticsData?.day_streak || 0
            };
          } catch (err2) {
            console.warn('Could not fetch analytics dashboard, trying courses dashboard:', err2);
            
            // Final fallback to courses dashboard
            try {
              const coursesResponse = await getCoursesDashboard();
              const coursesData = coursesResponse.data;
              console.log('Courses dashboard:', coursesData);

              stats = {
                totalQuizzes: coursesData?.total_quizzes || coursesData?.quizzes_attempted || 0,
                completedQuizzes: coursesData?.quizzes_completed || coursesData?.completed_quizzes || 0,
                averageScore: coursesData?.average_score || coursesData?.avg_score || 0,
                totalTimeSpent: coursesData?.total_time_spent || coursesData?.study_time || 0,
                passRate: coursesData?.pass_rate || coursesData?.success_rate || 0,
                lastActivity: coursesData?.last_activity || coursesData?.last_quiz_date,
                currentStreak: coursesData?.current_streak || coursesData?.day_streak || 0
              };
            } catch (err3) {
              console.warn('All dashboard APIs failed, using mock data:', err3);
            }
          }
        }

        // 3. Mock data for recent quizzes and detailed analytics (replace when real API available)
        const mockDetailedData = {
          recentQuizzes: [
            { id: 1, title: "Recent Quiz 1", score: stats.averageScore || 75, date: new Date().toISOString().split('T')[0], duration: 420, passed: true },
            { id: 2, title: "Recent Quiz 2", score: Math.max(0, (stats.averageScore || 75) - 10), date: new Date(Date.now() - 86400000).toISOString().split('T')[0], duration: 380, passed: true },
          ],
          strengths: [
            "Consistent quiz completion",
            "Good overall performance",
            "Regular study habits"
          ],
          weaknesses: [
            "Areas for improvement based on quiz performance",
            "Consider reviewing challenging topics"
          ],
          recommendations: [
            "Continue regular quiz practice",
            "Review incorrect answers",
            "Focus on weaker subject areas",
            "Maintain consistent study schedule"
          ],
          performanceByCategory: {
            "Overall": Math.max(0, (stats.averageScore || 75) - 5),
            "Recent Performance" : stats.averageScore || 75,
            "Time Management": 85,
            "Consistency": stats.currentStreak > 5 ? 90 : 70
          }
        };

        const finalData = {
          studentInfo: userProfile,
          overallStats: {
            totalQuizzes: stats.totalQuizzes,
            completedQuizzes: stats.completedQuizzes,
            averageScore: stats.averageScore,
            totalTimeSpent: stats.totalTimeSpent,
            passRate: stats.passRate,
            lastActivity: stats.lastActivity || new Date().toISOString().split('T')[0],
            currentStreak: stats.currentStreak
          },
          ...mockDetailedData
        };

        console.log('Final analytics data:', finalData);
        setAnalyticsData(finalData);

      } catch (error) {
        console.error('Error fetching analytics data:', error);
        setError('Failed to load analytics data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [studentId]);

  const getGradeColor = (score) => {
    if (score >= 80) return '#27AE60';
    if (score >= 70) return '#3498DB';
    if (score >= 50) return '#F39C12';
    return '#E74C3C';
  };

  const getPerformanceLevel = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Average';
    return 'Needs Improvement';
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="student-analytics-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-analytics-container">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="student-analytics-container">
        <div className="error-message">
          <p>Unable to load analytics data</p>
        </div>
      </div>
    );
  }

  const { studentInfo, overallStats, recentQuizzes, strengths, weaknesses, recommendations, performanceByCategory } = analyticsData;

  return (
    <div className="student-analytics-container">
      {/* Header */}
      <div className="analytics-header">
        <h2>Student Performance Analytics</h2>
        <div className="student-info">
          <span className="student-name">{studentInfo.name}</span>
          <span className="student-id">ID: {studentInfo.studentId}</span>
        </div>
      </div>

      {/* Overall Performance Summary */}
      <div className="performance-summary">
        <div className="summary-card">
          <div className="summary-score">
            <div 
              className="score-circle-small" 
              style={{ borderColor: getGradeColor(overallStats.averageScore) }}
            >
              <span style={{ color: getGradeColor(overallStats.averageScore) }}>
                {overallStats.averageScore}%
              </span>
            </div>
            <div className="score-label">Overall Average</div>
          </div>
          <div className="summary-stats">
            <div className="stat-item-small">
              <span className="stat-value-small">{overallStats.completedQuizzes}/{overallStats.totalQuizzes}</span>
              <span className="stat-label-small">Quizzes Completed</span>
            </div>
            <div className="stat-item-small">
              <span className="stat-value-small">{overallStats.passRate}%</span>
              <span className="stat-label-small">Pass Rate</span>
            </div>
            <div className="stat-item-small">
              <span className="stat-value-small">{formatTime(overallStats.totalTimeSpent)}</span>
              <span className="stat-label-small">Total Study Time</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Quiz Performance */}
      <div className="recent-performance">
        <h3>Recent Quiz Performance</h3>
        <div className="quiz-history">
          {recentQuizzes.map(quiz => (
            <div key={quiz.id} className="quiz-history-item">
              <div className="quiz-info">
                <span className="quiz-title-small">{quiz.title}</span>
                <span className="quiz-date">{formatDate(quiz.date)}</span>
              </div>
              <div className="quiz-metrics">
                <div className="Aquiz-score" style={{ color: getGradeColor(quiz.score) }}>
                  {quiz.score}%
                </div>
                <div className="quiz-duration">{formatTime(quiz.duration)}</div>
                <div className={`quiz-status ${quiz.passed ? 'passed' : 'failed'}`}>
                  {quiz.passed ? 'Passed' : 'Failed'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance by Category */}
      <div className="category-performance">
        <h3>Performance by Topic</h3>
        <div className="category-bars">
          {Object.entries(performanceByCategory).map(([category, score]) => (
            <div key={category} className="category-bar">
              <div className="category-info">
                <span className="category-name">{category}</span>
                <span className="category-score" style={{ color: getGradeColor(score) }}>
                  {score}%
                </span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${score}%`, 
                    backgroundColor: getGradeColor(score) 
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback Section */}
      <div className="feedback-section">
        <div className="feedback-grid">
          <div className="feedback-card strengths">
            <h4>💪 Strengths</h4>
            <ul>
              {strengths.map((strength, index) => (
                <li key={index}>{strength}</li>
              ))}
            </ul>
          </div>
          
          <div className="feedback-card weaknesses">
            <h4>📈 Areas for Improvement</h4>
            <ul>
              {weaknesses.map((weakness, index) => (
                <li key={index}>{weakness}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="recommendations-card">
          <h4>🎯 Personalized Recommendations</h4>
          <div className="recommendations-list">
            {recommendations.map((recommendation, index) => (
              <div key={index} className="recommendation-item">
                <span className="recommendation-number">{index + 1}</span>
                <span className="recommendation-text">{recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizAnalytics;