import Bio from "../../Componets/Student/bio";
import CoursesList from "../../Componets/Student/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
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
        <CoursesList 
          compact={true}
          showLoading={true}
        />
      </div>
      
      <div className="BoiA">
        <Bio showLoading={true} />
      </div>
    </div>
  );
}

export default Achievements;