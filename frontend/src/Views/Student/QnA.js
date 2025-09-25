import React from 'react';
import Bio from "../../Componets/Student/bio";
import CoursesList from "../../Componets/Student/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
import StudentQnAJoin from '../../Componets/Student/StudentQnAJoin.js';
import "./QnA.css";

function QnA() {
  return (
    <div>
      <div className="NavBar">
        <NavBar />
      </div>
      
      <div className="ContainerAI">
        <StudentQnAJoin />
      </div>
      
      <div className="SideAI">
        <CoursesList />
      </div>
      
      <div className="BoiAI">
        <Bio />
      </div>
    </div> 
  );
}

export default QnA;