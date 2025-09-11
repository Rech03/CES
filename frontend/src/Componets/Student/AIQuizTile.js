import './AIQuizTile.css';
import { NavLink } from "react-router-dom";

function AIQuizTile({ 
  title = "AI-Generated JavaScript Quiz",
  topic = "JavaScript Fundamentals",
  difficulty = "Medium", // Easy, Medium, Hard, Expert
  aiGenerated = true,
  estimatedDuration = "10-15 min",
  questionCount = "15-20",
  sourceFile = "lecture_notes.pdf",
  adaptiveLevel = "Beginner",
  lastUpdated = "2 hours ago",
  completed = false,
  bestScore = null,
  attempts = 0,
  maxAttempts = "Unlimited",
  backgroundImage = "/logo512.png",
  onStartQuiz,
  onViewResults,
  onClick
}) {

  const getDifficultyInfo = (difficulty) => {
    switch(difficulty) {
      case 'Easy': 
        return { color: '#27AE60', icon: '📗', description: 'Basic concepts' };
      case 'Medium': 
        return { color: '#F39C12', icon: '📙', description: 'Intermediate level' };
      case 'Hard': 
        return { color: '#E74C3C', icon: '📕', description: 'Advanced topics' };
      case 'Expert':
        return { color: '#9B59B6', icon: '📜', description: 'Expert level' };
      default: 
        return { color: '#95A5A6', icon: '📄', description: 'Unknown level' };
    }
  };

  const getAdaptiveLevelColor = (level) => {
    switch(level) {
      case 'Beginner': return '#3498DB';
      case 'Intermediate': return '#F39C12';
      case 'Advanced': return '#E74C3C';
      case 'Expert': return '#9B59B6';
      default: return '#95A5A6';
    }
  };

  const difficultyInfo = getDifficultyInfo(difficulty);

  return (
    <div>
      <NavLink to="/AIQuizCountdownPage">
        <div className="ai-quiz-tile-container" onClick={onClick}>
          <div className="ai-quiz-overlay"></div>
          
          {/* AI Badge */}
          <div className="ai-badge">
            <span className="ai-icon">🤖</span>
            <span className="ai-text">AI Generated</span>
          </div>

          {/* Difficulty Badge */}
          <div className="difficulty-badge" style={{ backgroundColor: difficultyInfo.color }}>
            <span className="difficulty-icon">{difficultyInfo.icon}</span>
            <span className="difficulty-text">{difficulty}</span>
          </div>

          {/* Quiz Info Section */}
          <div className="ai-quiz-info-section">
            <div className="quiz-topic">{topic}</div>
            <div className="quiz-meta-info">
              <span className="question-count">{questionCount} Questions</span>
              <span className="estimated-duration">{estimatedDuration}</span>
            </div>
           
          </div>

          {/* Title Container */}
          <div className="ai-quiz-title-container">
            <div className="ai-quiz-title-text">{title}</div>
          
          </div>

       

        
          {/* Action Buttons */}
          <div className="ai-quiz-actions">
            {!completed && (
              <button 
                className="ai-action-btn ai-start-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartQuiz && onStartQuiz();
                }}
              >
                <span className="btn-icon">🚀</span>
                Start AI Quiz
              </button>
            )}
            
            {completed && (
              <>
                <button 
                  className="ai-action-btn ai-results-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewResults && onViewResults();
                  }}
                >
                  <span className="btn-icon">📊</span>
                  View Results
                </button>
                <button 
                  className="ai-action-btn ai-retake-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartQuiz && onStartQuiz();
                  }}
                >
                  <span className="btn-icon">🔄</span>
                  Retake
                </button>
              </>
            )}
          </div>

          
        </div>
      </NavLink>
    </div>
  );
}

export default AIQuizTile;