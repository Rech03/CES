import EnrollStudents from "../../Componets/Lacture/AddStudents";
import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import StarRating from "../../Componets/Lacture/StarRating";
import "./AddStudents.css";

function AddStudents() {
  return(
    <div>
      <div class="NavBar">
        <NavBar></NavBar>
      </div>
      
        <div className="ContainerAS">
           <div className="StudentsAdd">
        <EnrollStudents></EnrollStudents>

      </div>

      </div>
      <div className="SideAS">
        <div className="Rating">
          <StarRating></StarRating>

        </div>
        <div className="List">
        <CoursesList></CoursesList>
        </div>
      </div>
      <div className="BoiAS">
              <Bio></Bio>
            </div>
     
 
    </div> 
  

  )
}

export default AddStudents;