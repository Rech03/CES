import Bio from "../../Componets/Lacture/bio";
import Biography from "../../Componets/Lacture/Biography";
import NavBar from "../../Componets/Lacture/NavBar";
import QuizTile from "../../Componets/Lacture/QuizTile";
import SearchBar from "../../Componets/Lacture/SearchBar";
import "./Dashboard.css";

function Dashboard() {
  return (
    <div>
      <div className="NavBar">
        <NavBar />
      </div>
      <div className="SeachBar">
        <SearchBar />
      </div>
      
      {/* Main Container - everything inside will be contained */}
      <div className="ContainerH">
        {/* Biography Section */}
        <div className="Boigraphy">
          <Biography />
        </div>

        {/* Quiz Section Header */}
        <div className="quiz-header">
          <div className="Title">Quiz List</div>
          <div className="More">View All</div>
        </div>

        {/* Quiz Grid - exactly 3 per row */}
        <div className="QuizList">
          <QuizTile />
          <QuizTile title="CSC2001F - Data Structures" duration="20 min" />
          <QuizTile title="CSC3003S - Computer Systems" duration="25 min" />
          <QuizTile title="CSC3002F - Parallel Programming" duration="15 min" />
          <QuizTile title="CSC1015F - Computer Science" duration="30 min" />
          <QuizTile title="CSC3022F - Machine Learning" duration="45 min" />
          {/* Add more QuizTile components as needed - they'll automatically wrap to next row after 3 */}
        </div>
      </div>

      {/* Side panel remains outside */}
      <div className="Side"></div>
      <div className="Boi">
        <Bio />
      </div>
    </div>
  );
}

export default Dashboard;