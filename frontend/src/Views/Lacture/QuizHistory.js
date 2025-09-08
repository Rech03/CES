import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import PastQuizTile from "../../Componets/Lacture/PastQuizTile";
<<<<<<< HEAD
=======
import SearchBar from "../../Componets/Lacture/SearchBar";
>>>>>>> c1fa26119bd1f3c9749e0cacdd5b0e743963735b
import StarRating from "../../Componets/Lacture/StarRating";
import "./QuizHistory.css";

function QuizHistory() {
  return(
    <div>
      <div class="NavBar">
        <NavBar></NavBar>
      </div>
<<<<<<< HEAD
=======
      <div className="SeachBar">
              <SearchBar />
            </div>
>>>>>>> c1fa26119bd1f3c9749e0cacdd5b0e743963735b
    
      
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