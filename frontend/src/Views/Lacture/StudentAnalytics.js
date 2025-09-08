import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import StarRating from "../../Componets/Lacture/StarRating";
import "./StudentAnalytics.css";

function StudentAnalytics() {
  return(
    <div>
      <div class="NavBar">
        <NavBar></NavBar>
      </div>
      <div className="Container">
       
      </div>
      <div className="SideST">
        <div className="Rating">
          <StarRating></StarRating>

        </div>
        <div className="List">
                <CoursesList></CoursesList>
                </div>
      </div>
      <div className="BoiST">
        <Bio></Bio>
      </div>
    </div> 
  

  )
}

export default StudentAnalytics;