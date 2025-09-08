import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
import QuizTile from "../../Componets/Lacture/QuizTile";
import StarRating from "../../Componets/Lacture/StarRating";
import SearchBar from "../../Componets/Lacture/SearchBar";
import "./Dashboard.css";

function StudentDashboard() {
  return (
    <div>
      <div className="NavBar">
        <NavBar />
      </div>
      <div className="SeachBar">
        <SearchBar />
      </div>
    
     

      <div className="ContainerH">
        <h2 className="Title">Welcome Michael😊</h2>

        <div className="quiz-header">
          <div className="Title">Available Quizzes</div>
          <div className="More">View All</div>
        </div>

        <div className="QuizList">
          <QuizTile title="Intro to Programming" duration="15 min" />
          <QuizTile title="Data Structures Basics" duration="20 min" />
          <QuizTile title="Computer Systems" duration="25 min" />
        </div>
      </div>

      <div className="SideD">
        <div className="Rating">
          <StarRating />
        </div>
        <div className="List">
          <CoursesList />
        </div>
      </div>

      <div className="BoiD">
        <Bio />
      </div>
    </div>
  );
}

export default StudentDashboard;
