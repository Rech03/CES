import AddQuiz from "../../Componets/Lacture/AddQuiz";
import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import StarRating from "../../Componets/Lacture/StarRating";
import "./Createquiz.css";

function Createquiz() {
  return (
    <div>
      <div className="NavBar">
        <NavBar />
      </div>
      <div className="BoiCQ">
        <Bio />
      </div>
      {/* Main Container - AddQuiz form will be contained inside */}
      <div className="ContainerH">
        <div className="AddQuizForm"> 
          <AddQuiz />
        </div>
      </div>

      {/* Side panel remains outside */}
      <div className="SideCQ">
     
        <div className="List">
        <CoursesList></CoursesList>
        </div>
      </div>
      
      
    </div>
  );
}

export default Createquiz;