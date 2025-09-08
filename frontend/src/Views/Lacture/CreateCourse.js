import AddCourse from "../../Componets/Lacture/AddCourse";
import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import StarRating from "../../Componets/Lacture/StarRating";
import "./CreateCourse.css";
function CreateCourse() {
  return(
    <div>
      <div className="NavBar">
        <NavBar></NavBar>
      </div>
       
       
      
      <div className="SideC">
        <div className="Rating">
          <StarRating></StarRating>

        </div>
        <div className="List">
        <CoursesList></CoursesList>
        </div>
      </div>
      
      <div className="BoiC">
        <Bio></Bio>

      </div>
      <div className="ContainerC">
      <div className="AddCourseForm">
        <AddCourse></AddCourse>
      </div>
      </div>
    </div> 
  

  )
}

export default CreateCourse;