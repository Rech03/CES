import React, { useEffect, useMemo, useState } from "react";
import "./QuizAnalytics.css";
import {
  studentDashboard,
  getStudentPerformanceBreakdown,
  getQuestionAnalysis,
  getStudentEngagement,
  getDifficultyProgression,
  getProgressAnalytics,
  getTopicStatistics,
  getCourseStatistics
} from "../../api/analytics";
import { getMyCourses } from "../../api/courses";

// Utility functions
const safeNum = (v, d = 0) => (typeof v === "number" && !isNaN(v) ? v : d);
const pct = (v) => `${Math.max(0, Math.min(100, Math.round(safeNum(v))))}%`;
const fmtDate = (d) => {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  } catch {
    return "";
  }
};

const formatTime = (seconds) => {
  if (!seconds) return "0s";
  const totalSeconds = safeNum(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

const getScoreColor = (score) => {
  const numScore = safeNum(score);
  if (numScore >= 90) return '#27AE60';
  if (numScore >= 80) return '#2ECC71';
  if (numScore >= 70) return '#F39C12';
  if (numScore >= 60) return '#E67E22';
  return '#E74C3C';
};

const getPerformanceLevel = (score) => {
  const numScore = safeNum(score);
  if (numScore >= 90) return { level: 'Exceptional', advice: 'You are mastering this material!' };
  if (numScore >= 80) return { level: 'Strong', advice: 'Keep up the excellent work!' };
  if (numScore >= 70) return { level: 'Good', advice: 'You are on the right track!' };
  if (numScore >= 60) return { level: 'Developing', advice: 'Practice will help you improve!' };
  return { level: 'Needs Focus', advice: 'Focus on building these foundational skills!' };
};

const getLearningTrend = (recent) => {
  if (recent.length < 3) return { trend: 'insufficient_data', message: 'Take more quizzes to see trends' };
  
  const recentScores = recent.slice(0, 3).map(q => safeNum(q.score));
  const olderScores = recent.slice(-3).map(q => safeNum(q.score));
  
  const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
  
  const difference = recentAvg - olderAvg;
  
  if (difference > 10) return { trend: 'improving', message: 'Your scores are trending upward!' };
  if (difference < -10) return { trend: 'declining', message: 'Your recent scores show room for improvement' };
  return { trend: 'stable', message: 'Your performance is consistent' };
};

function QuizAnalytics({ studentId = null, courseId = null }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedCourse, setSelectedCourse] = useState(courseId);
  const [questionFocus, setQuestionFocus] = useState(null);

  // Data state - only using available APIs
  const [dashboard, setDashboard] = useState(null);
  const [perf, setPerf] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [progress, setProgress] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [courses, setCourses] = useState([]);

  // Load analytics data using only available endpoints
  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      setLoading(true);
      setErr(null);
      
      try {
        // Core analytics data - using only endpoints that exist
        const loadPromises = [];
        
        // 1. Student dashboard
        loadPromises.push(
          studentDashboard().catch(e => {
            console.warn("studentDashboard failed:", e);
            return { data: {} };
          })
        );

        // 2. Performance breakdown
        loadPromises.push(
          getStudentPerformanceBreakdown({
            student_id: studentId,
            course_id: selectedCourse || undefined,
          }).catch(e => {
            console.warn("getStudentPerformanceBreakdown failed:", e);
            return { data: {} };
          })
        );

        // 3. Student engagement (only if studentId exists)
        if (studentId) {
          loadPromises.push(
            getStudentEngagement(studentId).catch(e => {
              console.warn("getStudentEngagement failed:", e);
              return { data: {} };
            })
          );
        } else {
          loadPromises.push(Promise.resolve({ data: {} }));
        }

        // 4. Progress analytics
        loadPromises.push(
          getProgressAnalytics({
            student_id: studentId,
            course_id: selectedCourse || undefined,
          }).catch(e => {
            console.warn("getProgressAnalytics failed:", e);
            return { data: {} };
          })
        );

        // 5. Difficulty progression
        loadPromises.push(
          getDifficultyProgression({
            student_id: studentId,
            course_id: selectedCourse || undefined,
          }).catch(e => {
            console.warn("getDifficultyProgression failed:", e);
            return { data: {} };
          })
        );

        // 6. Courses list
        loadPromises.push(
          getMyCourses().catch(e => {
            console.warn("getMyCourses failed:", e);
            return { data: [] };
          })
        );

        const results = await Promise.all(loadPromises);

        if (mounted) {
          setDashboard(results[0]?.data || {});
          setPerf(results[1]?.data || {});
          setEngagement(results[2]?.data || {});
          setProgress(results[3]?.data || {});
          setDifficulty(results[4]?.data || {});
          
          const coursesResult = results[5]?.data;
          const coursesList = Array.isArray(coursesResult) 
            ? coursesResult 
            : coursesResult?.results || [];
          setCourses(coursesList);
        }

      } catch (error) {
        console.error("Error loading analytics:", error);
        if (mounted) setErr("Failed to load analytics data. Please refresh to try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => { mounted = false; };
  }, [studentId, selectedCourse]);

  // Enhanced overall statistics
  const overall = useMemo(() => {
    const d = dashboard || {};
    const p = perf || {};
    const e = engagement || {};
    const pr = progress || {};
    
    return {
      totalQuizzes: d.total_quizzes ?? p.total_quizzes ?? d.quizzes_taken ?? 0,
      avgScore: d.average_score ?? p.average_score ?? d.avg_score ?? 0,
      bestScore: d.best_score ?? p.best_score ?? d.highest_score ?? 0,
      streak: e.current_streak ?? d.current_streak ?? d.day_streak ?? 0,
      perfect: d.perfect_scores ?? p.perfect_scores ?? 0,
      totalTime: e.total_time_spent ?? d.total_time_spent ?? 0,
      improvement: pr.improvement_rate ?? p.improvement_rate ?? e.improvement_rate ?? 0,
      completionRate: p.completion_rate ?? d.completion_rate ?? 0,
      weakestTopic: p.weakest_topic || p.lowest_topic || null,
      strongestTopic: p.strongest_topic || p.highest_topic || null,
      consistencyScore: pr.consistency_score ?? e.consistency_score ?? 0,
      learningVelocity: pr.learning_velocity ?? 0,
      retentionRate: pr.retention_rate ?? 0,
    };
  }, [dashboard, perf, engagement, progress]);

  // Enhanced recent quiz analysis
  const recent = useMemo(() => {
    const attempts = dashboard?.recent_quizzes ||
                    dashboard?.recent_attempts ||
                    dashboard?.attempts ||
                    perf?.recent_attempts ||
                    [];
    
    const recentQuizzes = Array.isArray(attempts) ? attempts.slice(0, 10).map((a, idx) => ({
      id: a.id ?? idx,
      title: a.title || a.quiz_title || a.name || `Quiz ${idx + 1}`,
      score: a.score ?? a.percentage ?? a.result ?? a.final_score ?? 0,
      date: a.completed_at || a.submitted_at || a.created_at || a.date,
      duration: a.duration ?? a.time_taken ?? 0,
      attempts: a.attempts ?? a.attempt_count ?? 1,
      difficulty: a.difficulty || a.level || 'medium',
      topic: a.topic || a.topic_name || a.subject || null,
      status: (a.score ?? 0) >= 70 ? 'passed' : 'needs_review',
      quizId: a.quiz_id || a.id,
      correctAnswers: a.correct_answers ?? Math.round((a.score ?? 0) * (a.total_questions ?? 10) / 100),
      totalQuestions: a.total_questions ?? 10,
      timePerQuestion: a.duration ? (a.duration / (a.total_questions ?? 10)) : 0,
    })) : [];

    return recentQuizzes;
  }, [dashboard, perf]);

  // Learning pattern analysis based on available data
  const learningPatterns = useMemo(() => {
    const trend = getLearningTrend(recent);
    const avgTimePerQuiz = recent.length > 0 
      ? recent.reduce((sum, quiz) => sum + safeNum(quiz.duration), 0) / recent.length
      : 0;
    
    const difficultyPerformance = recent.reduce((acc, quiz) => {
      acc[quiz.difficulty] = acc[quiz.difficulty] || { total: 0, sum: 0 };
      acc[quiz.difficulty].total += 1;
      acc[quiz.difficulty].sum += safeNum(quiz.score);
      return acc;
    }, {});

    Object.keys(difficultyPerformance).forEach(diff => {
      difficultyPerformance[diff].avg = difficultyPerformance[diff].sum / difficultyPerformance[diff].total;
    });

    return {
      trend,
      avgTimePerQuiz,
      difficultyPerformance,
      totalStudyTime: overall.totalTime,
      averageScore: overall.avgScore,
    };
  }, [recent, overall]);

  // Enhanced topic insights
  const topicInsights = useMemo(() => {
    const topicData = perf?.topics || perf?.topic_breakdown || perf?.by_topic || [];
    
    const topics = Array.isArray(topicData) ? topicData.map(t => ({
      name: t.name || t.topic || t.title || 'Unknown Topic',
      score: t.average_score ?? t.avg_score ?? t.score ?? t.percentage ?? 0,
      attempts: t.attempts ?? t.attempt_count ?? 0,
      timeSpent: t.time_spent ?? 0,
      improvement: t.improvement_rate ?? 0,
      difficulty: t.difficulty || 'medium',
      mastery: t.mastery_level || (t.average_score >= 85 ? 'mastered' : t.average_score >= 70 ? 'proficient' : 'developing'),
      lastAttempt: t.last_attempt || null,
      commonMistakes: t.common_mistakes || [],
    })) : [];

    const sorted = [...topics].sort((a, b) => b.score - a.score);
    
    return {
      all: topics,
      strengths: sorted.slice(0, 3),
      needsWork: sorted.slice(-3).reverse(),
      mastered: topics.filter(t => t.mastery === 'mastered'),
      developing: topics.filter(t => t.mastery === 'developing'),
    };
  }, [perf]);

  // Smart recommendations based on available data
  const smartRecommendations = useMemo(() => {
    const recs = [];
    
    // Performance-based recommendations
    if (overall.avgScore < 60) {
      recs.push({
        type: 'urgent',
        title: 'Foundation Building Needed',
        message: 'Focus on understanding core concepts before attempting more quizzes. Consider reviewing course materials or seeking help.',
        action: 'Review fundamentals'
      });
    } else if (overall.avgScore < 75) {
      recs.push({
        type: 'important',
        title: 'Strengthen Your Foundation',
        message: 'You are making progress! Focus on consistent practice and review mistakes carefully.',
        action: 'Practice regularly'
      });
    }

    // Consistency recommendations
    if (overall.consistencyScore > 0 && overall.consistencyScore < 50) {
      recs.push({
        type: 'habit',
        title: 'Build Study Consistency',
        message: 'Regular practice leads to better retention. Try to engage with quizzes daily, even if briefly.',
        action: 'Set daily goals'
      });
    }

    // Time management insights
    if (learningPatterns.avgTimePerQuiz > 1800) { // 30 minutes
      recs.push({
        type: 'efficiency',
        title: 'Improve Time Management',
        message: 'You are taking longer than average per quiz. Practice time management or review concepts beforehand.',
        action: 'Practice timing'
      });
    }

    // Topic-specific recommendations
    if (topicInsights.needsWork.length > 0) {
      const weakest = topicInsights.needsWork[0];
      recs.push({
        type: 'topic',
        title: `Focus on ${weakest?.name}`,
        message: `Your ${weakest?.name} scores suggest this area needs attention. Dedicate extra study time here.`,
        action: 'Targeted practice'
      });
    }

    // Difficulty progression
    if (learningPatterns.difficultyPerformance.easy?.avg > 80 && !learningPatterns.difficultyPerformance.medium) {
      recs.push({
        type: 'challenge',
        title: 'Ready for Higher Difficulty',
        message: 'You are excelling at easier questions. Challenge yourself with medium difficulty to grow.',
        action: 'Increase difficulty'
      });
    }

    // Success reinforcement
    if (overall.avgScore >= 85) {
      recs.push({
        type: 'success',
        title: 'Excellent Performance!',
        message: 'You are performing exceptionally well. Consider helping peers or exploring advanced topics.',
        action: 'Mentor others'
      });
    }

    return recs.slice(0, 5); // Limit to 5 most important recommendations
  }, [overall, learningPatterns, topicInsights]);

  const onDrillQuestion = async (quizId) => {
    if (!quizId) return;
    try {
      const r = await getQuestionAnalysis(quizId);
      setQuestionFocus(r?.data || null);
    } catch (e) {
      console.warn("getQuestionAnalysis failed", e);
      setQuestionFocus(null);
    }
  };

  const handleCourseChange = (courseId) => {
    setSelectedCourse(courseId);
  };

  if (loading) {
    return (
      <div className="student-analytics-container">
        <div className="loading-spinner">
          <div className="spinner" />
          <p>Analyzing your learning journey...</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="student-analytics-container">
        <div className="error-message">
          <p>{err}</p>
          <button className="action-btn primary" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const renderOverview = () => {
    const performanceLevel = getPerformanceLevel(overall.avgScore);
    
    return (
      <>
        {/* Enhanced Performance Summary */}
        <div className="performance-summary">
          <div className="summary-card">
            <div className="summary-score">
              <div 
                className="score-circle-small"
                style={{ borderColor: getScoreColor(overall.avgScore) }}
              >
                <span style={{ color: getScoreColor(overall.avgScore) }}>
                  {Math.round(overall.avgScore)}%
                </span>
              </div>
              <div className="score-label">{performanceLevel.level} Performance</div>
              <div style={{ fontSize: '12px', color: '#696F79', marginTop: '4px', textAlign: 'center' }}>
                {performanceLevel.advice}
              </div>
            </div>

            <div className="summary-stats">
              <div className="stat-item-small">
                <div className="stat-value-small">{overall.totalQuizzes}</div>
                <div className="stat-label-small">Total Quizzes</div>
              </div>
              <div className="stat-item-small">
                <div className="stat-value-small">{Math.round(overall.bestScore)}%</div>
                <div className="stat-label-small">Personal Best</div>
              </div>
              <div className="stat-item-small">
                <div className="stat-value-small">{overall.perfect}</div>
                <div className="stat-label-small">Perfect Scores</div>
              </div>
              <div className="stat-item-small">
                <div className="stat-value-small">{overall.streak}</div>
                <div className="stat-label-small">Current Streak</div>
              </div>
              <div className="stat-item-small">
                <div className="stat-value-small">{formatTime(overall.totalTime)}</div>
                <div className="stat-label-small">Study Time</div>
              </div>
              {overall.consistencyScore > 0 && (
                <div className="stat-item-small">
                  <div className="stat-value-small">{Math.round(overall.consistencyScore)}%</div>
                  <div className="stat-label-small">Consistency</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Learning Insights Panel */}
        <div className="recent-performance">
          <h3>Your Learning Insights</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
            <div style={{ padding: '15px', background: '#f8fbff', borderRadius: '12px', borderLeft: '4px solid #1935CA' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#1935CA', fontSize: '14px', fontWeight: '600' }}>Performance Trend</h4>
              <p style={{ margin: '0', fontSize: '13px', color: '#374151' }}>
                {learningPatterns.trend.message}
              </p>
            </div>
            
            <div style={{ padding: '15px', background: '#f0fdf4', borderRadius: '12px', borderLeft: '4px solid #22c55e' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#22c55e', fontSize: '14px', fontWeight: '600' }}>Study Pattern</h4>
              <p style={{ margin: '0', fontSize: '13px', color: '#374151' }}>
                Average {formatTime(learningPatterns.avgTimePerQuiz)} per quiz
                {overall.totalTime > 0 && (
                  <br />
                )}
                Total study time: {formatTime(overall.totalTime)}
              </p>
            </div>

            {overall.improvement > 0 && (
              <div style={{ padding: '15px', background: '#fefce8', borderRadius: '12px', borderLeft: '4px solid #eab308' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#eab308', fontSize: '14px', fontWeight: '600' }}>Improvement Rate</h4>
                <p style={{ margin: '0', fontSize: '13px', color: '#374151' }}>
                  {Math.round(overall.improvement)}% improvement over time
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Performance with Enhanced Details */}
        <div className="recent-performance">
          <h3>Recent Quiz Performance</h3>
          <div className="quiz-history">
            {recent.length > 0 ? recent.map((quiz) => (
              <div key={quiz.id} className="quiz-history-item">
                <div className="quiz-info">
                  <div className="quiz-title-small">
                    {quiz.difficulty === 'hard' ? '🔴' : quiz.difficulty === 'medium' ? '🟡' : '🟢'} 
                    {quiz.title}
                  </div>
                  <div className="quiz-date">
                    {fmtDate(quiz.date)} {quiz.topic && `• ${quiz.topic}`}
                    <br />
                    <small style={{ color: '#9CA3AF' }}>
                      {quiz.correctAnswers}/{quiz.totalQuestions} correct
                      {quiz.timePerQuestion > 0 && ` • ${Math.round(quiz.timePerQuestion)}s per question`}
                    </small>
                  </div>
                </div>
                <div className="quiz-metrics">
                  <div 
                    className="quiz-score"
                    style={{ color: getScoreColor(quiz.score) }}
                  >
                    {Math.round(quiz.score)}%
                  </div>
                  <div className="quiz-duration">
                    {formatTime(quiz.duration)}
                  </div>
                  <div className={`quiz-status ${quiz.status.replace('_', '-')}`}>
                    {quiz.status.replace('_', ' ')}
                  </div>
                  {quiz.attempts > 1 && (
                    <div style={{ fontSize: '10px', color: '#6B7280' }}>
                      Try #{quiz.attempts}
                    </div>
                  )}
                </div>
                {quiz.quizId && (
                  <button
                    onClick={() => onDrillQuestion(quiz.quizId)}
                    className="action-btn secondary"
                    style={{ fontSize: '10px', padding: '4px 8px', minWidth: 'auto' }}
                  >
                    Analyze
                  </button>
                )}
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                <p>Start taking quizzes to see your learning analytics!</p>
                <button className="action-btn primary" style={{ marginTop: '12px' }}>
                  Take Your First Quiz
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Topic Mastery */}
        {topicInsights.all.length > 0 && (
          <div className="category-performance">
            <h3>Topic Mastery Overview</h3>
            <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ padding: '12px 20px', background: '#22c55e', color: 'white', borderRadius: '20px', fontSize: '14px', fontWeight: '600' }}>
                ✅ {topicInsights.mastered.length} Mastered
              </div>
              <div style={{ padding: '12px 20px', background: '#f59e0b', color: 'white', borderRadius: '20px', fontSize: '14px', fontWeight: '600' }}>
                📈 {topicInsights.developing.length} Developing
              </div>
            </div>
            
            <div className="category-bars">
              {topicInsights.all.map((topic, index) => (
                <div key={index} className="category-bar">
                  <div className="category-info">
                    <span className="category-name">
                      {topic.mastery === 'mastered' ? '🎯' : topic.mastery === 'proficient' ? '📈' : '🔄'} 
                      {topic.name}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span 
                        className="category-score"
                        style={{ color: getScoreColor(topic.score) }}
                      >
                        {Math.round(topic.score)}%
                      </span>
                      <span style={{ fontSize: '12px', color: '#6B7280' }}>
                        {topic.attempts} attempts
                      </span>
                      {topic.improvement > 0 && (
                        <span style={{ fontSize: '12px', color: '#22c55e' }}>
                          +{Math.round(topic.improvement)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: pct(topic.score),
                        backgroundColor: getScoreColor(topic.score)
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  const renderInsights = () => (
    <>
      {/* Smart Recommendations */}
      <div className="recommendations-card">
        <h4>Personalized Learning Recommendations</h4>
        <div className="recommendations-list">
          {smartRecommendations.map((rec, index) => (
            <div key={index} className="recommendation-item">
              <div 
                className="recommendation-number"
                style={{ 
                  background: rec.type === 'urgent' ? '#dc2626' : 
                             rec.type === 'important' ? '#f59e0b' : 
                             rec.type === 'success' ? '#22c55e' : '#1935CA' 
                }}
              >
                {index + 1}
              </div>
              <div className="recommendation-text">
                <strong>{rec.title}</strong>
                <br />
                {rec.message}
                <br />
                <small style={{ color: '#6B7280', fontStyle: 'italic' }}>
                  Action: {rec.action}
                </small>
              </div>
            </div>
          ))}
          {smartRecommendations.length === 0 && (
            <div className="recommendation-item">
              <div className="recommendation-number">1</div>
              <div className="recommendation-text">
                <strong>Keep Up the Great Work!</strong>
                <br />
                Continue taking quizzes regularly to maintain your progress and build stronger knowledge foundations.
                <br />
                <small style={{ color: '#6B7280', fontStyle: 'italic' }}>
                  Action: Maintain consistency
                </small>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Learning Strengths and Growth Areas */}
      <div className="feedback-section">
        <div className="feedback-grid">
          <div className="feedback-card strengths">
            <h4>Your Learning Strengths</h4>
            <ul>
              {topicInsights.strengths.length > 0 ? topicInsights.strengths.map((topic, index) => (
                <li key={index}>
                  <strong>{topic.name}</strong> - {Math.round(topic.score)}% mastery
                  {topic.improvement > 0 && (
                    <span style={{ color: '#22c55e', marginLeft: '8px' }}>
                      📈 +{Math.round(topic.improvement)}% improvement
                    </span>
                  )}
                  <br />
                  <small>Time invested: {formatTime(topic.timeSpent)} • {topic.attempts} attempts</small>
                </li>
              )) : (
                <li>Complete more quizzes to identify your strengths!</li>
              )}
            </ul>
          </div>

          <div className="feedback-card weaknesses">
            <h4>Growth Opportunities</h4>
            <ul>
              {topicInsights.needsWork.length > 0 ? topicInsights.needsWork.map((topic, index) => (
                <li key={index}>
                  <strong>{topic.name}</strong> - {Math.round(topic.score)}% mastery
                  <br />
                  <small>
                    {topic.attempts} attempts • Last: {topic.lastAttempt ? fmtDate(topic.lastAttempt) : 'N/A'}
                  </small>
                  {topic.commonMistakes.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>
                      Common issues: {topic.commonMistakes.slice(0, 2).join(', ')}
                    </div>
                  )}
                </li>
              )) : (
                <li>You are performing well across all areas!</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Detailed Progress Analytics */}
      {progress && Object.keys(progress).length > 0 && (
        <div className="recent-performance">
          <h3>Learning Progress Analysis</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {progress.weekly_improvement && (
              <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #dcfce7' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <strong style={{ color: '#166534' }}>Weekly Growth</strong>
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#166534' }}>
                  {Math.round(progress.weekly_improvement)}%
                </div>
                <small style={{ color: '#374151' }}>improvement over last week</small>
              </div>
            )}
            
            {progress.consistency_score && (
              <div style={{ padding: '16px', background: '#fef3c7', borderRadius: '12px', border: '1px solid #fed7aa' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <strong style={{ color: '#92400e' }}>Study Consistency</strong>
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#92400e' }}>
                  {Math.round(progress.consistency_score)}%
                </div>
                <small style={{ color: '#374151' }}>
                  {progress.consistency_score >= 80 ? 'Excellent routine!' : 
                   progress.consistency_score >= 60 ? 'Good habits forming' : 
                   'Try to study more regularly'}
                </small>
              </div>
            )}

            {progress.retention_rate && (
              <div style={{ padding: '16px', background: '#ddd6fe', borderRadius: '12px', border: '1px solid #c4b5fd' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <strong style={{ color: '#5b21b6' }}>Knowledge Retention</strong>
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#5b21b6' }}>
                  {Math.round(progress.retention_rate)}%
                </div>
                <small style={{ color: '#374151' }}>information retained over time</small>
              </div>
            )}
          </div>

          {/* Learning velocity and time insights */}
          {(progress.learning_velocity || learningPatterns.avgTimePerQuiz > 0) && (
            <div style={{ marginTop: '16px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#374151' }}>Study Efficiency Insights</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {progress.learning_velocity && (
                  <div>
                    <strong>Learning Velocity:</strong> {Math.round(progress.learning_velocity * 100)}%
                    <br />
                    <small style={{ color: '#6b7280' }}>How quickly you absorb new concepts</small>
                  </div>
                )}
                <div>
                  <strong>Time per Quiz:</strong> {formatTime(learningPatterns.avgTimePerQuiz)}
                  <br />
                  <small style={{ color: '#6b7280' }}>
                    {learningPatterns.avgTimePerQuiz > 1800 ? 'Consider time management practice' : 
                     learningPatterns.avgTimePerQuiz < 300 ? 'You work efficiently!' : 
                     'Good pacing'}
                  </small>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Study Habits and Patterns */}
      <div className="recent-performance">
        <h3>Study Habits Analysis</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          {/* Difficulty preference */}
          <div style={{ padding: '16px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '16px' }}>Difficulty Performance</h4>
            <div style={{ fontSize: '14px' }}>
              {Object.entries(learningPatterns.difficultyPerformance).map(([diff, data]) => (
                <div key={diff} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ textTransform: 'capitalize' }}>
                    {diff === 'hard' ? '🔴' : diff === 'medium' ? '🟡' : '🟢'} {diff}:
                  </span>
                  <span style={{ fontWeight: '600', color: getScoreColor(data.avg) }}>
                    {Math.round(data.avg)}% ({data.total} taken)
                  </span>
                </div>
              ))}
              {Object.keys(learningPatterns.difficultyPerformance).length === 0 && (
                <p style={{ color: '#6b7280', fontSize: '13px' }}>Take more quizzes to see difficulty patterns</p>
              )}
            </div>
          </div>

          {/* Overall performance insights */}
          <div style={{ padding: '16px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '16px' }}>Performance Summary</h4>
            <div style={{ fontSize: '14px' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Completion Rate:</strong> {Math.round(overall.completionRate)}%
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Study Sessions:</strong> {overall.totalQuizzes} completed
              </div>
              <small style={{ color: '#6b7280' }}>
                {overall.streak > 7 ? 'Amazing consistency!' : 
                 overall.streak > 3 ? 'Building good habits!' : 
                 'Try to build a routine'}
              </small>
            </div>
          </div>

          {/* Time-based insights */}
          <div style={{ padding: '16px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '16px' }}>Learning Schedule</h4>
            <div style={{ fontSize: '14px' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Average Session:</strong> {formatTime(learningPatterns.avgTimePerQuiz)}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Total Study Time:</strong> {formatTime(overall.totalTime)}
              </div>
              <small style={{ color: '#6b7280' }}>
                {learningPatterns.avgTimePerQuiz > 1200 ? 'Consider shorter, focused sessions' :
                 learningPatterns.avgTimePerQuiz < 300 ? 'You work efficiently!' :
                 'Good session length'}
              </small>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="student-analytics-container">
      {/* Header */}
      <div className="analytics-header">
        <h2>Quiz Analytics Dashboard</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Course Filter */}
          {courses.length > 0 && (
            <select 
              value={selectedCourse || ''} 
              onChange={(e) => handleCourseChange(e.target.value || null)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '2px solid #E5E7EB',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <option value="">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name || course.title}
                </option>
              ))}
            </select>
          )}
          
          {/* View Toggle */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
            <button 
              className={activeView === 'overview' ? 'action-btn primary' : 'action-btn secondary'}
              style={{ 
                padding: '6px 12px', 
                fontSize: '12px', 
                minWidth: 'auto',
                margin: '0',
                border: activeView === 'overview' ? 'none' : '1px solid #1935CA'
              }}
              onClick={() => setActiveView('overview')}
            >
              Overview
            </button>
            <button 
              className={activeView === 'insights' ? 'action-btn primary' : 'action-btn secondary'}
              style={{ 
                padding: '6px 12px', 
                fontSize: '12px', 
                minWidth: 'auto',
                margin: '0 0 0 4px',
                border: activeView === 'insights' ? 'none' : '1px solid #1935CA'
              }}
              onClick={() => setActiveView('insights')}
            >
              Insights
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeView === 'overview' && renderOverview()}
      {activeView === 'insights' && renderInsights()}

      {/* Question Analysis Modal */}
      {questionFocus?.questions?.length > 0 && (
        <div className="category-performance">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Question Analysis</h3>
            <button 
              className="action-btn secondary"
              onClick={() => setQuestionFocus(null)}
              style={{ fontSize: '12px', padding: '4px 8px', minWidth: 'auto' }}
            >
              Close
            </button>
          </div>
          <div className="category-bars">
            {questionFocus.questions.slice(0, 6).map((qq, i) => {
              const correctRate = typeof qq.correct_rate === "number" && qq.correct_rate <= 1
                ? qq.correct_rate * 100
                : qq.correct_rate || 0;
              return (
                <div key={i} className="category-bar">
                  <div className="category-info">
                    <span className="category-name">
                      Q{i + 1}: {qq.topic || qq.learning_outcome || 'Question'}
                    </span>
                    <span 
                      className="category-score"
                      style={{ color: getScoreColor(correctRate) }}
                    >
                      {Math.round(correctRate)}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: pct(correctRate),
                        backgroundColor: getScoreColor(correctRate)
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Items */}
      <div className="action-items">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button className="action-btn primary">
            Take New Quiz
          </button>
          {topicInsights.needsWork.length > 0 && (
            <button className="action-btn secondary">
              Practice {topicInsights.needsWork[0]?.name}
            </button>
          )}
          <button className="action-btn secondary">
            Review Mistakes
          </button>
          {overall.avgScore >= 80 && (
            <button className="action-btn secondary">
              Try Harder Difficulty
            </button>
          )}
          <button 
            className="action-btn secondary"
            onClick={() => setActiveView(activeView === 'overview' ? 'insights' : 'overview')}
          >
            {activeView === 'overview' ? 'View Insights' : 'View Overview'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuizAnalytics;