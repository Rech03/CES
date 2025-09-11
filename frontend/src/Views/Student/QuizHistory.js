import Bio from "../../Componets/Student/bio";
import CoursesList from "../../Componets/Student/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
import PastQuizTile from "../../Componets/Student/PastQuizTile";
import SearchBar from "../../Componets/Student/SearchBar";
import StarRating from "../../Componets/Student/StarRating";
import "./QuizHistory.css";

function QuizHistory() {
  return(
    <div>
      <div class="NavBar">
        <NavBar></NavBar>
      </div>
      <div className="SeachBar">
              <SearchBar />
            </div>
    
      
      <div className="SideH">
        <div className="Rating">
          <StarRating></StarRating>

        </div>
        <div className="List">
                <CoursesList></CoursesList>
                </div>
      </div>
      <div className="BoiH">
        <Bio></Bio>
      </div>
        <div className="ContainerH">
       
       <div className="TitleH">
          Quiz List
        </div>
         <div className="QuizListH">
          <PastQuizTile></PastQuizTile>
          <PastQuizTile></PastQuizTile>
           <PastQuizTile></PastQuizTile>
          <PastQuizTile></PastQuizTile>
          <PastQuizTile></PastQuizTile>
           <PastQuizTile></PastQuizTile>
          <PastQuizTile></PastQuizTile>

        </div>
        </div>
    </div> 
  

  )
}

export default QuizHistory;