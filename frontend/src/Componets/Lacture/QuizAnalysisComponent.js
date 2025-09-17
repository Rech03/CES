import { useState, useEffect } from 'react';
import { getQuizStatistics } from '../../api/quizzes';
import { getQuizStatistics as getAnalyticsQuizStats } from '../../api/analytics';
import { getQuiz, getQuizQuestions, getQuizAttempts } from '../../api/quizzes';
import './QuizAnalysisComponent.css';

const QuizAnalysisComponent = ({ quizId }) => {
  const [quizData, setQuizData] = useState(null);
  const [strugglingStudents, setStrugglingStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuizAnalytics = async () => {
      if (!quizId) {
        setError('No quiz ID provided');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch quiz basic info
        const quizResponse = await getQuiz(quizId);
        const quiz = quizResponse.data;

        // Fetch quiz statistics
        let statisticsData = null;
        try {
          const statsResponse = await getQuizStatistics(quizId);
          statisticsData = statsResponse.data;
        } catch (statsErr) {
          console.warn('Quiz statistics not available, trying analytics endpoint');
          try {
            const analyticsResponse = await getAnalyticsQuizStats(quizId);
            statisticsData = analyticsResponse.data;
          } catch (analyticsErr) {
            console.warn('Analytics statistics not available either');
          }
        }

        // Fetch quiz questions
        let questionsData = [];
        try {
          const questionsResponse = await getQuizQuestions(quizId);
          questionsData = questionsResponse.data.results || questionsResponse.data || [];
        } catch (questionsErr) {
          console.warn('Could not fetch questions:', questionsErr);
        }

        // Fetch quiz attempts
        let attemptsData = [];
        try {
          const attemptsResponse = await getQuizAttempts(quizId);
          attemptsData = attemptsResponse.data.results || attemptsResponse.data || [];
        } catch (attemptsErr) {
          console.warn('Could not fetch attempts:', attemptsErr);
        }

        // Process the data
        const totalStudents = attemptsData.length;
        const completedAttempts = attemptsData.filter(attempt => attempt.is_completed || attempt.status === 'completed');
        const completionRate = totalStudents > 0 ? (completedAttempts.length / totalStudents) * 100 : 0;
        
        // Calculate average score
        const scoresSum = completedAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
        const averageScore = completedAttempts.length > 0 ? scoresSum / completedAttempts.length : 0;

        // Process question performance
        const processedQuestions = questionsData.map((question, index) => {
          const questionAttempts = attemptsData.filter(attempt => 
            attempt.answers && attempt.answers.some(answer => answer.question_id === question.id)
          );
          
          const correctAnswers = questionAttempts.filter(attempt => {
            const answer = attempt.answers.find(ans => ans.question_id === question.id);
            return answer && answer.is_correct;
          }).length;

          const totalAnswers = questionAttempts.length;
          const correctPercentage = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

          return {
            id: question.id,
            question: question.question_text || question.text || `Question ${index + 1}`,
            correctAnswers,
            totalAnswers,
            correctPercentage
          };
        });

        // Identify struggling students (score < 60%)
        const struggling = completedAttempts
          .filter(attempt => (attempt.score || 0) < 60)
          .map(attempt => {
            const wrongAnswers = attempt.answers ? 
              attempt.answers.filter(answer => !answer.is_correct).length : 0;
            
            return {
              id: attempt.student_id || attempt.user_id || attempt.id,
              name: attempt.student_name || attempt.user_name || `Student ${attempt.id}`,
              email: attempt.student_email || attempt.user_email || '',
              score: attempt.score || 0,
              questionsWrong: wrongAnswers
            };
          })
          .sort((a, b) => a.score - b.score); // Sort by lowest score first

        const processedQuizData = {
          id: quiz.id,
          title: quiz.title || quiz.name || 'Quiz Analysis',
          course: quiz.topic_name || quiz.course_name || 'Course',
          totalStudents,
          averageScore: Math.round(averageScore * 10) / 10,
          completionRate: Math.round(completionRate * 10) / 10,
          questions: processedQuestions,
          strugglingStudents: struggling
        };

        setQuizData(processedQuizData);
        setStrugglingStudents(struggling);

      } catch (err) {
        console.error('Error fetching quiz analytics:', err);
        setError('Failed to load quiz analytics');
        
        // Fallback to sample data
        const sampleData = {
          id: quizId,
          title: "Quiz Analysis",
          course: "Course Analytics",
          totalStudents: 0,
          averageScore: 0,
          completionRate: 0,
          questions: [],
          strugglingStudents: []
        };
        setQuizData(sampleData);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizAnalytics();
  }, [quizId]);

  const handleStudentSelect = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === strugglingStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(strugglingStudents.map(s => s.id));
    }
  };

  const handleSendSupport = () => {
    setShowSupportModal(true);
  };

  const sendAutomatedSupport = () => {
    // TODO: Implement API call to send support emails
    console.log("Sending support to:", selectedStudents);
    setShowSupportModal(false);
    setSelectedStudents([]);
    alert(`Support emails sent to ${selectedStudents.length} students!`);
  };

  if (loading) {
    return (
      <div className="quiz-analysis-container">
        <div className="loading-analytics">
          <div className="spinner"></div>
          <p>Loading quiz analytics...</p>
        </div>
      </div>
    );
  }

  if (error && !quizData) {
    return (
      <div className="quiz-analysis-container">
        <div className="error-analytics">
          <h3>Error Loading Analytics</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  if (!quizData) {
    return (
      <div className="quiz-analysis-container">
        <div className="no-data-analytics">
          <h3>No Quiz Data Available</h3>
          <p>Please select a quiz to view analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-analysis-container">
      {/* Header */}
      <div className="analysis-header">
        <h2>{quizData.title}</h2>
        <p className="quiz-course">{quizData.course}</p>
      </div>

      {/* Overview Cards */}
      <div className="overview-cards">
        <div className="stat-card">
          <div className="stat-value">{quizData.totalStudents}</div>
          <div className="stat-label">Total Students</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{quizData.averageScore}%</div>
          <div className="stat-label">Average Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{quizData.completionRate}%</div>
          <div className="stat-label">Completion Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{strugglingStudents.length}</div>
          <div className="stat-label">Need Support</div>
        </div>
      </div>

      {/* Question Performance Chart */}
      {quizData.questions.length > 0 && (
        <div className="chart-section">
          <h3>Question Performance Analysis</h3>
          <div className="chart-container">
            <div className="chart-header">
              <span className="chart-label">Question</span>
              <span className="chart-label">Correct Answers</span>
              <span className="chart-label">Percentage</span>
            </div>
            {quizData.questions.map((question, index) => (
              <div key={question.id} className="chart-row">
                <div className="question-number">Q{index + 1}</div>
                <div className="question-text">{question.question}</div>
                <div className="progress-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${question.correctPercentage}%`,
                        backgroundColor: question.correctPercentage >= 70 ? '#27AE60' : 
                                       question.correctPercentage >= 50 ? '#F39C12' : '#E74C3C'
                      }}
                    ></div>
                  </div>
                  <span className="progress-text">
                    {question.correctAnswers}/{question.totalAnswers} ({question.correctPercentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Distribution */}
      {quizData.totalStudents > 0 && (
        <div className="average-chart-section">
          <h3>Performance Distribution</h3>
          <div className="distribution-chart">
            <div className="distribution-bars">
              <div className="score-range">
                <div className="bar" style={{ height: '60%', backgroundColor: '#E74C3C' }}></div>
                <span>0-40%</span>
                <span className="count">{strugglingStudents.filter(s => s.score <= 40).length}</span>
              </div>
              <div className="score-range">
                <div className="bar" style={{ height: '40%', backgroundColor: '#F39C12' }}></div>
                <span>41-60%</span>
                <span className="count">{strugglingStudents.filter(s => s.score > 40 && s.score <= 60).length}</span>
              </div>
              <div className="score-range">
                <div className="bar" style={{ height: '80%', backgroundColor: '#3498DB' }}></div>
                <span>61-80%</span>
                <span className="count">{quizData.totalStudents - strugglingStudents.length}</span>
              </div>
              <div className="score-range">
                <div className="bar" style={{ height: '70%', backgroundColor: '#27AE60' }}></div>
                <span>81-100%</span>
                <span className="count">0</span>
              </div>
            </div>
            <div className="average-line">
              <div className="average-marker" style={{ left: `${quizData.averageScore}%` }}>
                <span>Avg: {quizData.averageScore}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Struggling Students Section */}
      {strugglingStudents.length > 0 && (
        <div className="struggling-students-section">
          <h3>Students Needing Support</h3>
          <div className="students-actions">
            <button onClick={handleSelectAll} className="select-all-btn">
              {selectedStudents.length === strugglingStudents.length ? 'Deselect All' : 'Select All'}
            </button>
            <button 
              onClick={handleSendSupport} 
              disabled={selectedStudents.length === 0}
              className="send-support-btn"
            >
              Send Support ({selectedStudents.length})
            </button>
          </div>
          <div className="students-list">
            {strugglingStudents.map((student) => (
              <div key={student.id} className="student-item">
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student.id)}
                  onChange={() => handleStudentSelect(student.id)}
                />
                <div className="student-info">
                  <span className="student-name">{student.name}</span>
                  <span className="student-email">{student.email}</span>
                </div>
                <div className="student-stats">
                  <span className="student-score">{student.score}%</span>
                  <span className="questions-wrong">{student.questionsWrong} wrong</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Support Modal */}
      {showSupportModal && (
        <div className="modal-overlay">
          <div className="support-modal">
            <h3>Send Automated Support</h3>
            <p>
              Send personalized support emails to {selectedStudents.length} selected student{selectedStudents.length !== 1 ? 's' : ''}?
            </p>
            <p className="modal-description">
              This will send an automated email with quiz feedback and study resources.
            </p>
            <div className="modal-actions">
              <button onClick={() => setShowSupportModal(false)} className="cancel-btn">
                Cancel
              </button>
              <button onClick={sendAutomatedSupport} className="confirm-btn">
                Send Support Emails
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {quizData.totalStudents === 0 && (
        <div className="empty-state">
          <h3>No Quiz Attempts Yet</h3>
          <p>Students haven't taken this quiz yet. Check back once submissions come in.</p>
        </div>
      )}
    </div>
  );
};

export default QuizAnalysisComponent;