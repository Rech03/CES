import './Biography.css';

function Biography({ 
  name = "Simphiwe Cele",
  title = "Bcs Computer Science and Business Computing Lecture",
  avatar = "/ID.jpeg",
  quizCount = "27",
  studentCount = "400",
  StudentLabel = "Number of Students"
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
      
      {/* Quiz Created Section */}
      <div className="quiz-section">
        <div className="quiz-icon-container">
          <div className="quiz-icon"></div>
        </div>
        <div className="quiz-count">{quizCount}</div>
        <div className="quiz-label">Quiz Created</div>
      </div>
      
      {/* Students Section */}
      <div className="students-section">
        <div className="students-icon-container">
          <div className="students-icon"></div>
        </div>
        <div className="students-count">{studentCount}</div>
        <div className="students-label">{StudentLabel}</div>
      </div>
    </div>
  );
}

export default Biography;