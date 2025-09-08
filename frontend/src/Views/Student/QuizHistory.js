import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
import PastQuizTile from "../../Componets/Lacture/PastQuizTile";
import StarRating from "../../Componets/Lacture/StarRating";
import SearchBar from "../../Componets/Lacture/SearchBar";
import "./QuizHistory.css";

function StudentQuizHistory() {
  return (
    <div>
      <div className="NavBar">
        <NavBar />
      </div>
      <div className="SeachBar">
        <SearchBar />
      </div>
    

      <div className="ContainerH">
        <h2 className="TitleH">Your Quiz History</h2>
        <div className="QuizListH">
          <PastQuizTile title="Intro to Programming" score="80%" />
          <PastQuizTile title="Data Structures Basics" score="70%" />
          <PastQuizTile title="Computer Systems" score="90%" />
        </div>
      </div>

      <div className="SideH">
        <div className="Rating">
          <StarRating />
        </div>
        <div className="List">
          <CoursesList />
        </div>
      </div>

      <div className="BoiH">
        <Bio />
      </div>
    </div>
  );
}

export default StudentQuizHistory;
