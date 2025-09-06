import Bio from "../../Componets/Lacture/bio";
import Biography from "../../Componets/Lacture/Biography";
import NavBar from "../../Componets/Lacture/NavBar";
import QuizTile from "../../Componets/Lacture/QuizTile";
import SearchBar from "../../Componets/Lacture/SearchBar";
import "./Dashboard.css";


function Dashboard() {
  return(
    <div>
      <div class="NavBar">
        <NavBar></NavBar>
      </div>
      <div class="SeachBar">
         <SearchBar></SearchBar>
      </div>
      <div className="Container">
        <div className="Boigraphy">
          <Biography></Biography>

        </div>

      </div>
      <div className="Side"></div>
      <div className="Boi">
        <Bio></Bio>
      </div>
      
        <div className="Title">
          Quiz List
        </div>
        <div className="More">
          View All
        </div>
        <div className="QuizList">
          <QuizTile></QuizTile>

        </div>


      
 
    </div> 
  

  )
}

export default Dashboard;