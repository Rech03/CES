import './QuizTile.css';

function QuizTile({ 
  title = "CSC3002F- Parallel Programming",
  duration = "15 min",
  backgroundImage = "/quiz-background.jpg",
  onClick
}) {
  return (
    <div className="quiz-tile-container" onClick={onClick}>
      
      {/* Duration Badge */}
      <div className="quiz-duration-badge">
        <div className="quiz-duration-text">{duration}</div>
      </div>
      
      {/* Title Container */}
      <div className="quiz-title-container">
        <div className="quiz-title-text">{title}</div>
      </div>
    </div>
  );
}

export default QuizTile;