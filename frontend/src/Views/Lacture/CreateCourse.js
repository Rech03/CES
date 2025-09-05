import AddCourse from "../../Componets/Lacture/AddCourse";
import NavBar from "../../Componets/Lacture/NavBar";
import SearchBar from "../../Componets/Lacture/SearchBar";
function CreateCourse() {
  return(
    <div>
      <div className="NavBar">
        <NavBar></NavBar>
      </div>
      <div className="SeachBar">
         <SearchBar></SearchBar>
      </div>
      <AddCourse></AddCourse>
    </div> 
  

  )
}

export default CreateCourse;