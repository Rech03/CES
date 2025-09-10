import { useState } from 'react';
import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import SearchBar from "../../Componets/Lacture/SearchBar";
import StarRating from "../../Componets/Lacture/StarRating";
import QuizAnalysisComponent from '../../Componets/Lacture/QuizAnalysisComponent';
import "./QuizAnalytics.css";

function QuizAnalytics() {
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
          <QuizAnalysisComponent quizId={selectedQuizId} />
        </div>
      </div>
    </div> 
  );
}

export default QuizAnalytics;