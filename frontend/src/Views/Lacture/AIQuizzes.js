import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import StarRating from "../../Componets/Lacture/StarRating";
import UploadSlides from "../../Componets/Lacture/UploadSlides";
import "./AIQuizzes.css";

function AIQuizzes() {
  return(
    <div>
      <div class="NavBar">
        <NavBar></NavBar>
      </div>
      
        <div className="ContainerAI">
           <div className="UploadSlides">
            <UploadSlides></UploadSlides>
        

      </div>

      </div>
      <div className="SideAI">
       
        <div className="List">
        <CoursesList></CoursesList>
        </div>
      </div>
      <div className="BoiAI">
              <Bio></Bio>
            </div>
     
 
    </div> 
  

  )
}

export default AIQuizzes;