import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import PastQuizTile from "../../Componets/Lacture/PastQuizTile";
import SearchBar from "../../Componets/Lacture/SearchBar";
import StarRating from "../../Componets/Lacture/StarRating";
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