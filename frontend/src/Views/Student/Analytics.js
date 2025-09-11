import Bio from "../../Componets/Student/bio";
import Biography from "../../Componets/Student/Biography";
import CoursesList from "../../Componets/Student/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
import QuizTile from "../../Componets/Student/QuizTile";
import SearchBar from "../../Componets/Student/SearchBar";
import StarRating from "../../Componets/Student/StarRating";
import StudentAnalytics from '../../Componets/Student/QuizAnalytics'; // Import the new component
import { useState } from 'react';
import "./AIQuizzes.css";


function Analytics() {
    const [selectedStudentId, setSelectedStudentId] = useState(1); // Default student ID
  return (
    <div>
      <div className="NavBar">
        <NavBar />
      </div>
      
      {/* Main Container - everything inside will be contained */}
      <div className="ContainerAI">
         <div className="StudentAnalyticsWrapper">
                  <StudentAnalytics studentId={selectedStudentId} />
                </div>
     
      </div>

      {/* Side panel remains outside */}
      <div className="SideAI">
        <div className="Rating">
          <StarRating></StarRating>

        </div>
        <div className="List">
        <CoursesList></CoursesList>
        </div>
      </div>
      <div className="BoiAI">
        <Bio />
      </div>
    </div>
  );
}

export default Analytics;