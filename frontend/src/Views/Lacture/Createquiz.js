import AddQuiz from "../../Componets/Lacture/AddQuiz";
import Bio from "../../Componets/Lacture/bio";
import NavBar from "../../Componets/Lacture/NavBar";
import "./Createquiz.css";


function Createquiz() {
  return(
    <div>
      <div class="NavBar">
        <NavBar></NavBar>
      </div>
      
       
      <div className="Side"></div>
      <div className="Boi">
        <Bio></Bio>
      </div>
       <div className="Container">
        <AddQuiz></AddQuiz>
       
      </div>
 
    </div> 
  

  )
}

export default Createquiz;