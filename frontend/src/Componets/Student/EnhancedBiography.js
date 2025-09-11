import './EnhancedBiography.css';

function EnhancedBiography({ 
  name = "Simphiwe Cele",
  title = "BCS Computer Science Student",
  avatar = "/ID.jpeg",
  quizzesCompleted = "15",
  aiQuizzesGenerated = "8",
  studyStreak = "7",
  adaptiveLearningLevel = "Intermediate",
  totalStudyTime = "45h",
  averageAIQuizScore = "82%",
  showAIMetrics = true
}) {
  return (
    <div className="enhanced-biography-container">
      {/* Profile Image */}
      <img 
        className="enhanced-biography-avatar"
        src={avatar} 
        alt={`${name}'s profile`}
      />
      
      {/* Name */}
      <div className="enhanced-biography-name">
        {name}
      </div>
      
      {/* Title/Position */}
      <div className="enhanced-biography-title">
        {title}
      </div>
      
      {/* Traditional Metrics Row */}
      <div className="metrics-row">
        {/* Quizzes Completed Section */}
        <div className="metric-section quiz-section">
          <div className="metric-icon-container">
            <div className="quiz-icon"></div>
          </div>
          <div className="metric-count">{quizzesCompleted}</div>
          <div className="metric-label">Total Quizzes</div>
        </div>
        
        {/* Study Time Section */}
        <div className="metric-section time-section">
          <div className="metric-icon-container">
            <div className="time-icon"></div>
          </div>
          <div className="metric-count">{totalStudyTime}</div>
          <div className="metric-label">Study Time</div>
        </div>

        {/* Streak Section */}
        <div className="metric-section streak-section">
          <div className="metric-icon-container">
            <div className="streak-icon"></div>
          </div>
          <div className="metric-count">{studyStreak}</div>
          <div className="metric-label">Day Streak</div>
        </div>
      </div>

      {/* AI Metrics Row */}
      {showAIMetrics && (
        <div className="ai-metrics-row">
          {/* AI Quizzes Generated */}
          <div className="metric-section ai-quiz-section">
            <div className="metric-icon-container ai-glow">
              <div className="ai-quiz-icon"></div>
            </div>
            <div className="metric-count ai-count">{aiQuizzesGenerated}</div>
            <div className="metric-label">AI Quizzes</div>
          </div>
          
          {/* Average AI Score */}
          <div className="metric-section ai-score-section">
            <div className="metric-icon-container">
              <div className="ai-score-icon"></div>
            </div>
            <div className="metric-count ai-score">{averageAIQuizScore}</div>
            <div className="metric-label">AI Avg Score</div>
          </div>

          {/* Adaptive Level */}
          <div className="metric-section adaptive-section">
            <div className="metric-icon-container">
              <div className="adaptive-icon"></div>
            </div>
            <div className="metric-count adaptive-level">{adaptiveLearningLevel}</div>
            <div className="metric-label">AI Level</div>
          </div>
        </div>
      )}

      {/* AI Learning Progress Bar */}
      {showAIMetrics && (
        <div className="ai-progress-section">
          <div className="progress-label">
            <span className="ai-brain">🧠</span>
            <span>AI Learning Progress</span>
          </div>
          <div className="ai-progress-bar">
            <div className="ai-progress-fill" style={{width: '65%'}}></div>
          </div>
          <div className="progress-stats">
            <span>Next: Advanced Level</span>
            <span>65% Complete</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnhancedBiography;