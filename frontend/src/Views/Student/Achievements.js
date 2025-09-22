import Bio from "../../Componets/Student/bio";
import CoursesList from "../../Componets/Student/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
import StarRating from "../../Componets/Student/StarRating";
import StudentAchievements from "../../Componets/Student/StudentAchievements";
import "./Achievements.css";

function Achievements() {
  return (
    <div>
      <div className="NavBar">
        <NavBar />
      </div>
      
      {/* Main Container - everything inside will be contained */}
      <div className="ContainerA">
        <StudentAchievements studentId={1} />
      </div>

      {/* Side panel remains outside */}
      <div className="SideA">
          <CoursesList />
      </div>
      
      <div className="BoiA">
        <Bio />
      </div>
    </div>
  );
}

export default Achievements;