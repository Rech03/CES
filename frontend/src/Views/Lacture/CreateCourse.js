import AddCourse from "../../Componets/Lacture/AddCourse";
import Bio from "../../Componets/Lacture/bio";
import NavBar from "../../Componets/Lacture/NavBar";
import "./CreateCourse.css";
function CreateCourse() {
  return(
    <div>
      <div className="NavBar">
        <NavBar></NavBar>
      </div>
       
       
      
      <div className="Side"></div>
      
      <div className="Boi">
        <Bio></Bio>

      </div>
      <div className="Container">
      <div className="AddCourseForm">
        <AddCourse></AddCourse>
      </div>
      </div>
    </div> 
  

  )
}

export default CreateCourse;