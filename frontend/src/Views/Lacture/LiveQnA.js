import React from 'react';
import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import LiveQnAContainer from "../../Componets/Lacture/LiveQnaContainer";
import "./LiveQ&A.css";

function LiveQnA() {
  return (
    <div>
      <div className="NavBar">
        <NavBar />
      </div>
      
      <div className="ContainerAI">
        <LiveQnAContainer />
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

export default LiveQnA;