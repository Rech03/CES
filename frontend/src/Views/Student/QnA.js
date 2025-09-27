import React from 'react';
import Bio from "../../Componets/Student/bio";
import CoursesList from "../../Componets/Student/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
import StudentQnAJoin from '../../Componets/Student/StudentQnAJoin.js';
import "./QnA.css";

function QnA() {
  return (
    <div className="QnAPage">
      {/* Navbar stays on left (slides out on mobile) */}
      <NavBar />
      
      {/* Main content area */}
      <div className="QnAContent">
        <div className="ContainerQA">
          <StudentQnAJoin />
        </div>
        
        <div className="SideAI">
          <CoursesList />
        </div>
        
        <div className="BoiAI">
          <Bio />
        </div>
      </div>
    </div> 
  );
}

export default QnA;