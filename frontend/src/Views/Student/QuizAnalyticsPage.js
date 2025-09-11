import { useState } from 'react';
import Bio from "../../Componets/Student/bio";
import CoursesList from "../../Componets/Student/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
import StarRating from "../../Componets/Student/StarRating";
import QuizAnalysic from '../../Componets/Student/QuizAnalysic';
import "./QuizAnalytics.css";

function QuizAnalyticsPage() {
  const [selectedQuizId, setSelectedQuizId] = useState(1); // Default quiz ID
  
  return(
    <div>
      <div className="NavBar">
        <NavBar></NavBar>
      </div>
  
      <div className="SideH">
        <div className="Rating">
          <StarRating></StarRating>
        </div>
        <div className="List">
          <CoursesList></CoursesList>
        </div>
      </div>
      
      <div className="BoiH">
        <Bio></Bio>
      </div>
      
      <div className="ContainerH">
        <div className="QuizAnliysis">
          <QuizAnalysic quizId={selectedQuizId} />
        </div>
      </div>
    </div> 
  );
}

export default QuizAnalyticsPage