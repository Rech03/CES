import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
import StarRating from "../../Componets/Lacture/StarRating";
import SearchBar from "../../Componets/Lacture/SearchBar";
import "./StudentAnalytics.css";

function StudentAnalytics() {
  const completedQuizzes = 15;
  const avgScore = 82;
  const bestTopic = "Data Structures";
  const streak = 5;

  return (
    <div>
      {/* Navigation */}
      <div className="NavBar">
        <NavBar />
      </div>

      {/* Search Bar centered at top */}
      <div className="SearchBarWrapper">
        <SearchBar />
      </div>

      {/* Main Analytics Container */}
      <div className="Container">
        <h2 className="Title">Your Performance</h2>
        <p className="Subtitle">Track your quiz scores and progress here 📊</p>

        <div className="AnalyticsGrid">
          <div className="AnalyticsCard">
            <h3>{completedQuizzes}</h3>
            <p>Quizzes Completed</p>
          </div>
          <div className="AnalyticsCard">
            <h3>{avgScore}%</h3>
            <p>Average Score</p>
            <div className="ProgressBar">
              <div
                className="ProgressFill"
                style={{ width: `${avgScore}%` }}
              ></div>
            </div>
          </div>
          <div className="AnalyticsCard">
            <h3>{bestTopic}</h3>
            <p>Best Topic</p>
          </div>
          <div className="AnalyticsCard">
            <h3>🔥 {streak}</h3>
            <p>Day Streak</p>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="SideST">
        <div className="Rating">
          <StarRating />
        </div>
        <div className="List">
          <CoursesList />
        </div>
      </div>

      {/* Bio */}
      <div className="BoiST">
        <Bio />
      </div>
    </div>
  );
}

export default StudentAnalytics;
