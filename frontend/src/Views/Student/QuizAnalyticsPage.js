import { useState } from 'react';
import Bio from "../../Componets/Student/bio";
import CoursesList from "../../Componets/Student/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
import StarRating from "../../Componets/Student/StarRating";
import QuizResultsDisplay from '../../Componets/Student/QuizResultsDisplay';
import "./QuizAnalyticsPage.css";

function QuizAnalyticsPage() {
  const [selectedStudentId, setSelectedStudentId] = useState(1); // Default student ID
  
  return(
    <div>
      <div className="NavBar">
        <NavBar></NavBar>
      </div>
  
      <div className="SideHA">
        <div className="Rating">
          <StarRating></StarRating>
        </div>
        <div className="List">
          <CoursesList></CoursesList>
        </div>
      </div>
      
      <div className="BoiHA">
        <Bio></Bio>
      </div>
      
      <div className="ContainerHA">
        <div className="QuizResultsWrapper">
          <QuizResultsDisplay quizId={selectedStudentId} />
        </div>
      </div>
    </div> 
  );
}

export default QuizAnalyticsPage