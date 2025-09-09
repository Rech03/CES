import './PastQuizTile.css';

function PastQuizTile({ 
  title = "CSC3002F- Parallel Programming",
  duration = "15 min",
  backgroundImage = "/quiz-background.jpg",
  onClick
}) {
  return (
    <div className="quiz-tile-container" onClick={onClick}>

      {/* Title Container */}
      <div className="quiz-title-container">
        <div className="quiz-title-text">{title}</div>
      </div>
    </div>
  );
}

export default PastQuizTile;