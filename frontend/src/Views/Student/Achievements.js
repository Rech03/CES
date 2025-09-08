import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import StudentNavBar from "../../Componets/Student/NavBar";
import StarRating from "../../Componets/Lacture/StarRating";
import SearchBar from "../../Componets/Lacture/SearchBar";
import "./Achievements.css";

function StudentAchievements() {
  // Demo values (replace later with backend data)
  const achievements = [
    { icon: "🏅", text: "Completed 10 Quizzes" },
    { icon: "🎯", text: "Scored 90%+ in 3 Quizzes" },
    { icon: "📘", text: "Finished Data Structures Course" },
    { icon: "🔥", text: "7-Day Learning Streak" },
  ];

  const level = 3;
  const xp = 180; // earned XP
  const xpGoal = 250; // goal to next level
  const xpPercent = (xp / xpGoal) * 100;

  return (
    <div>
      {/* Navigation */}
      <div className="NavBar">
        <StudentNavBar />
      </div>

      {/* Search */}
      <div className="SeachBar">
        <SearchBar />
      </div>

      {/* Main Container */}
      <div className="ContainerH">
        <h2 className="Title">My Achievements</h2>
        <p>Track your progress, unlock rewards, and level up as you learn 🎉</p>

        {/* Level and Progress */}
        <div className="ProgressWrapper">
          <div className="ProgressLabel">
            Level {level} — {xp}/{xpGoal} XP
          </div>
          <div className="ProgressBar">
            <div className="ProgressFill" style={{ width: `${xpPercent}%` }}></div>
          </div>
        </div>

        {/* Achievements grid */}
        <div className="AchievementsList">
          {achievements.map((ach, index) => (
            <div key={index} className="AchievementCard">
              {ach.icon} {ach.text}
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div className="SideD">
        <div className="Rating">
          <StarRating />
        </div>
        <div className="List">
          <CoursesList />
        </div>
      </div>

      {/* Bio panel */}
      <div className="BoiD">
        <Bio />
      </div>
    </div>
  );
}

export default StudentAchievements;
