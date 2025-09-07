import Bio from "../../Componets/Lacture/bio";
import NavBar from "../../Componets/Lacture/NavBar";
import PastQuizTile from "../../Componets/Lacture/PastQuizTile";
import "./QuizHistory.css";

function QuizHistory() {
  return(
    <div>
      <div class="NavBar">
        <NavBar></NavBar>
      </div>
    
      
      <div className="Side"></div>
      <div className="Boi">
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