import Bio from "../../Componets/Lacture/bio";
import NavBar from "../../Componets/Lacture/NavBar";
import SearchBar from "../../Componets/Lacture/SearchBar";
import "./AddStudents.css";

function AddStudents() {
  return(
    <div>
      <div class="NavBar">
        <NavBar></NavBar>
      </div>
      <div class="SeachBar">
         <SearchBar></SearchBar>
      </div>
        <div className="Container">

      </div>
      <div className="Side"></div>
      <div className="Boi">
              <Bio></Bio>
            </div>
 
    </div> 
  

  )
}

export default AddStudents;