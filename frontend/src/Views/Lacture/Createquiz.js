import AddQuiz from "../../Componets/Lacture/AddQuiz";
import NavBar from "../../Componets/Lacture/NavBar";
import SearchBar from "../../Componets/Lacture/SearchBar";


function Createquiz() {
  return(
    <div>
      <div class="NavBar">
        <NavBar></NavBar>
      </div>
      <div class="SeachBar">
         <SearchBar></SearchBar>
      </div>
      <div>
        <AddQuiz></AddQuiz>

      </div>
 
    </div> 
  

  )
}

export default Createquiz;