import Bio from "../../Componets/Student/bio";
import CoursesList from "../../Componets/Student/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
import StarRating from "../../Componets/Student/StarRating";
import AIQuizzesDisplay from "../../Componets/Student/AIQuizzesDiaplay";
import "./AIQuizzes.css";

function AIQuizzes() {
  return (
    <div>
      <div className="NavBar">
        <NavBar />
      </div>
      
      {/* Main Container - AI Quizzes Display */}
      <div className="ContainerAI">
        <AIQuizzesDisplay />
      </div>

      {/* Side panel */}
      <div className="SideAI">
        <div className="Rating">
          <StarRating />
        </div>
        <div className="List">
          <CoursesList />
        </div>
      </div>
      
   
    </div>
  );
}

export default AIQuizzes;