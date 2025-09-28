import React, { useState, useEffect, useMemo } from 'react';
import { studentAdaptiveProgress, getStudentAvailableQuizzes } from '../../api/ai-quiz';
import './StudentInsights.css';

const StudentInsights = ({ studentId }) => {
  const [progress, setProgress] = useState([]);
  const [availableQuizzes, setAvailableQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30'); // days
  const [heatmapData, setHeatmapData] = useState([]);

  useEffect(() => {
    fetchData();
  }, [studentId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [progressResp, quizzesResp] = await Promise.all([
        studentAdaptiveProgress(),
        getStudentAvailableQuizzes()
      ]);

      const progressData = Array.isArray(progressResp.data) 
        ? progressResp.data 
        : progressResp.data?.attempts || [];
      
      setProgress(progressData);
      setAvailableQuizzes(quizzesResp.data?.slides || []);
      generateHeatmapData(progressData);
      
    } catch (err) {
      console.error('Error fetching student insights:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const generateHeatmapData = (progressData) => {
    const now = new Date();
    const daysToShow = parseInt(selectedPeriod);
    const heatmapDays = [];

    // Generate last N days
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const dateString = date.toISOString().split('T')[0];
      const dayProgress = progressData.filter(p => {
        const progressDate = new Date(p.last_attempt_at || p.created_at);
        return progressDate.toISOString().split('T')[0] === dateString;
      });

      const totalAttempts = dayProgress.length;
      const avgScore = dayProgress.length > 0 
        ? dayProgress.reduce((sum, p) => sum + (p.best_score || 0), 0) / dayProgress.length
        : 0;

      heatmapDays.push({
        date: dateString,
        dayName: date.toLocaleDateString('en', { weekday: 'short' }),
        dayNum: date.getDate(),
        attempts: totalAttempts,
        avgScore: Math.round(avgScore),
        intensity: totalAttempts > 0 ? Math.min(totalAttempts / 3, 1) : 0
      });
    }

    setHeatmapData(heatmapDays);
  };

  useEffect(() => {
    if (progress.length > 0) {
      generateHeatmapData(progress);
    }
  }, [selectedPeriod, progress]);

  const analytics = useMemo(() => {
    if (progress.length === 0) {
      return {
        totalQuizzes: 0,
        completedQuizzes: 0,
        averageScore: 0,
        bestScore: 0,
        totalAttempts: 0,
        streak: 0,
        improvementRate: 0,
        difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
        recentTrend: 'stable'
      };
    }

    const completed = progress.filter(p => p.completed || p.best_score > 0);
    const scores = completed.map(p => p.best_score || 0);
    const totalAttempts = progress.reduce((sum, p) => sum + (p.attempts_count || 1), 0);

    // Calculate streak (consecutive days with activity)
    const sortedDates = progress
      .map(p => new Date(p.last_attempt_at || p.created_at))
      .sort((a, b) => b - a);
    
    let streak = 0;
    let currentDate = new Date();
    for (const date of sortedDates) {
      const daysDiff = Math.floor((currentDate - date) / (1000 * 60 * 60 * 24));
      if (daysDiff <= streak + 1) {
        streak++;
        currentDate = date;
      } else {
        break;
      }
    }

    // Difficulty breakdown
    const difficultyBreakdown = { easy: 0, medium: 0, hard: 0 };
    progress.forEach(p => {
      const diff = p.difficulty || 'easy';
      if (difficultyBreakdown.hasOwnProperty(diff)) {
        difficultyBreakdown[diff]++;
      }
    });

    // Recent trend (last 5 vs previous 5 attempts)
    const recentScores = completed.slice(0, 5).map(p => p.best_score || 0);
    const previousScores = completed.slice(5, 10).map(p => p.best_score || 0);
    const recentAvg = recentScores.length > 0 
      ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length 
      : 0;
    const previousAvg = previousScores.length > 0 
      ? previousScores.reduce((a, b) => a + b, 0) / previousScores.length 
      : 0;
    
    let recentTrend = 'stable';
    if (recentAvg > previousAvg + 5) recentTrend = 'improving';
    else if (recentAvg < previousAvg - 5) recentTrend = 'declining';

    return {
      totalQuizzes: availableQuizzes.reduce((sum, slide) => sum + (slide.quizzes?.length || 0), 0),
      completedQuizzes: completed.length,
      averageScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      bestScore: Math.max(...scores, 0),
      totalAttempts,
      streak,
      improvementRate: recentTrend === 'improving' ? Math.round(recentAvg - previousAvg) : 0,
      difficultyBreakdown,
      recentTrend
    };
  }, [progress, availableQuizzes]);

  const getPerformanceLevel = (score) => {
    if (score >= 85) return { level: 'Excellent', color: '#22c55e', advice: 'Outstanding work! Keep challenging yourself.' };
    if (score >= 75) return { level: 'Good', color: '#3b82f6', advice: 'Great progress! Focus on consistency.' };
    if (score >= 65) return { level: 'Fair', color: '#f59e0b', advice: 'Good effort! Practice more for improvement.' };
    return { level: 'Needs Work', color: '#ef4444', advice: 'Keep practicing. Focus on understanding concepts.' };
  };

  const getTrendIcon = (trend) => {
    if (trend === 'improving') return '📈';
    if (trend === 'declining') return '📉';
    return '➡️';
  };

  if (loading) {
    return (
      <div className="student-insights-loading">
        <div className="spinner"></div>
        <p>Loading your learning insights...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-insights-error">
        <p>{error}</p>
        <button onClick={fetchData} className="retry-btn">Try Again</button>
      </div>
    );
  }

  const performanceLevel = getPerformanceLevel(analytics.averageScore);

  return (
    <div className="student-insights">
      <div className="insights-header">
        <h2>Your Learning Insights</h2>
        <div className="period-selector">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="period-select"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-value">{analytics.averageScore}%</div>
          <div className="metric-label">Average Score</div>
          <div className="metric-sublabel" style={{ color: performanceLevel.color }}>
            {performanceLevel.level}
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-value">{analytics.completedQuizzes}</div>
          <div className="metric-label">Quizzes Completed</div>
          <div className="metric-sublabel">
            of {analytics.totalQuizzes} available
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-value">{analytics.streak}</div>
          <div className="metric-label">Day Streak</div>
          <div className="metric-sublabel">
            {analytics.streak > 0 ? 'Keep it up!' : 'Start your streak!'}
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-value">
            {getTrendIcon(analytics.recentTrend)} {analytics.recentTrend}
          </div>
          <div className="metric-label">Recent Trend</div>
          <div className="metric-sublabel">
            {analytics.improvementRate > 0 && `+${analytics.improvementRate}% improvement`}
          </div>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="heatmap-section">
        <h3>Activity Heatmap</h3>
        <div className="heatmap-container">
          <div className="heatmap-grid">
            {heatmapData.map((day, index) => (
              <div
                key={day.date}
                className="heatmap-day"
                style={{
                  backgroundColor: day.intensity > 0 
                    ? `rgba(34, 197, 94, ${0.2 + day.intensity * 0.8})` 
                    : '#f3f4f6',
                  border: day.intensity > 0 ? '1px solid #22c55e' : '1px solid #e5e7eb'
                }}
                title={`${day.date}: ${day.attempts} attempts, ${day.avgScore}% avg score`}
              >
                <div className="heatmap-day-num">{day.dayNum}</div>
                {day.attempts > 0 && (
                  <div className="heatmap-attempts">{day.attempts}</div>
                )}
              </div>
            ))}
          </div>
          <div className="heatmap-legend">
            <span>Less</span>
            <div className="legend-scale">
              <div className="legend-item" style={{ backgroundColor: '#f3f4f6' }}></div>
              <div className="legend-item" style={{ backgroundColor: 'rgba(34, 197, 94, 0.3)' }}></div>
              <div className="legend-item" style={{ backgroundColor: 'rgba(34, 197, 94, 0.6)' }}></div>
              <div className="legend-item" style={{ backgroundColor: 'rgba(34, 197, 94, 1)' }}></div>
            </div>
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Difficulty Breakdown */}
      <div className="difficulty-section">
        <h3>Progress by Difficulty</h3>
        <div className="difficulty-grid">
          {Object.entries(analytics.difficultyBreakdown).map(([difficulty, count]) => (
            <div key={difficulty} className="difficulty-card">
              <div className={`difficulty-icon ${difficulty}`}>
                {difficulty === 'easy' ? '🟢' : difficulty === 'medium' ? '🟡' : '🔴'}
              </div>
              <div className="difficulty-info">
                <div className="difficulty-name">{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</div>
                <div className="difficulty-count">{count} attempted</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights and Recommendations */}
      <div className="insights-recommendations">
        <h3>Personalized Recommendations</h3>
        <div className="recommendation-card">
          <div className="recommendation-icon">💡</div>
          <div className="recommendation-content">
            <p>{performanceLevel.advice}</p>
            {analytics.streak === 0 && (
              <p>Try to practice daily for better retention and build a learning streak!</p>
            )}
            {analytics.recentTrend === 'declining' && (
              <p>Your recent scores show room for improvement. Review previous quiz explanations and focus on weak areas.</p>
            )}
            {analytics.averageScore > 80 && (
              <p>Excellent performance! Consider challenging yourself with harder difficulty levels.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentInsights;