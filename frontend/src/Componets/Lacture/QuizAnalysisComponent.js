import { useState, useEffect } from 'react';
import './QuizAnalysisComponent.css';

const QuizAnalysisComponent = ({ quizId }) => {
  const [quizData, setQuizData] = useState(null);
  const [strugglingStudents, setStrugglingStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Sample data - replace with actual API calls
  useEffect(() => {
    // Simulate API call
    const sampleQuizData = {
      id: quizId || 1,
      title: "Introduction to Variables",
      course: "CSC3002F - Parallel Programming",
      totalStudents: 45,
      averageScore: 72.4,
      completionRate: 89,
      questions: [
        {
          id: 1,
          question: "What is a variable in programming?",
          correctAnswers: 38,
          totalAnswers: 42,
          correctPercentage: 90.5
        },
        {
          id: 2,
          question: "Which is a valid variable name?",
          correctAnswers: 35,
          totalAnswers: 42,
          correctPercentage: 83.3
        },
        {
          id: 3,
          question: "What happens when you declare: int age = 25?",
          correctAnswers: 28,
          totalAnswers: 42,
          correctPercentage: 66.7
        },
        {
          id: 4,
          question: "Identify the variable redeclaration error",
          correctAnswers: 18,
          totalAnswers: 42,
          correctPercentage: 42.9
        },
        {
          id: 5,
          question: "What is variable scope?",
          correctAnswers: 22,
          totalAnswers: 42,
          correctPercentage: 52.4
        }
      ],
      strugglingStudents: [
        { id: 1, name: "Alice Johnson", email: "alice@uct.ac.za", score: 45, questionsWrong: 3 },
        { id: 2, name: "Bob Smith", email: "bob@uct.ac.za", score: 38, questionsWrong: 4 },
        { id: 3, name: "Carol Davis", email: "carol@uct.ac.za", score: 42, questionsWrong: 3 },
        { id: 4, name: "David Wilson", email: "david@uct.ac.za", score: 35, questionsWrong: 4 },
        { id: 5, name: "Eva Brown", email: "eva@uct.ac.za", score: 48, questionsWrong: 3 }
      ]
    };

    setQuizData(sampleQuizData);
    setStrugglingStudents(sampleQuizData.strugglingStudents);
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
    // API call to send support emails
    console.log("Sending support to:", selectedStudents);
    setShowSupportModal(false);
    setSelectedStudents([]);
    alert(`Support emails sent to ${selectedStudents.length} students!`);
  };

  if (!quizData) {
    return <div className="loading-analytics">Loading quiz analytics...</div>;
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

      {/* Average Line Chart Simulation */}
      <div className="average-chart-section">
        <h3>Performance Distribution</h3>
        <div className="distribution-chart">
          <div className="distribution-bars">
            <div className="score-range">
              <div className="bar" style={{ height: '60%', backgroundColor: '#E74C3C' }}></div>
              <span>0-40%</span>
              <span className="count">5</span>
            </div>
            <div className="score-range">
              <div className="bar" style={{ height: '40%', backgroundColor: '#F39C12' }}></div>
              <span>41-60%</span>
              <span className="count">8</span>
            </div>
            <div className="score-range">
              <div className="bar" style={{ height: '80%', backgroundColor: '#3498DB' }}></div>
              <span>61-80%</span>
              <span className="count">18</span>
            </div>
            <div className="score-range">
              <div className="bar" style={{ height: '70%', backgroundColor: '#27AE60' }}></div>
              <span>81-100%</span>
              <span className="count">14</span>
            </div>
          </div>
          <div className="average-line">
            <div className="average-marker" style={{ left: '72.4%' }}>
              <span>Avg: {quizData.averageScore}%</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default QuizAnalysisComponent;