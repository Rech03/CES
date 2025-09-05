import NavBar from "../../Componets/Lacture/NavBar";
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

      </div>
      <div className="Side"></div>
 
    </div> 
  

  )
}

export default Dashboard;