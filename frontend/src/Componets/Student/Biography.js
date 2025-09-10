import './Biography.css';

function Biography({ 
  name = "Simphiwe Cele",
  title = "BCS Computer Science Student",
  avatar = "/ID.jpeg",
  quizzesCompleted = "15",
  correctAnswers = "142",
  currentStreak = "7"
}) {
  return (
    <div className="biography-container">
      {/* Profile Image */}
      <img 
        className="biography-avatar"
        src={avatar} 
        alt={`${name}'s profile`}
      />
      
      {/* Name */}
      <div className="biography-name">
        {name}
      </div>
      
      {/* Title/Position */}
      <div className="biography-title">
        {title}
      </div>
      
      {/* Quizzes Completed Section */}
      <div className="quiz-section">
        <div className="quiz-icon-container">
          <div className="quiz-icon"></div>
        </div>
        <div className="quiz-count">{quizzesCompleted}</div>
        <div className="quiz-label">Quizzes Completed</div>
      </div>
      
      {/* Correct Answers Section */}
      <div className="students-section">
        <div className="students-icon-container">
          <div className="students-icon"></div>
        </div>
        <div className="students-count">{correctAnswers}</div>
        <div className="students-label">Correct Answers</div>
      </div>

      {/* Streak Section */}
      <div className="streak-section">
        <div className="streak-icon-container">
          <div className="streak-icon"></div>
        </div>
        <div className="streak-count">{currentStreak}</div>
        <div className="streak-label">Day Streak</div>
      </div>
    </div>
  );
}

export default Biography;