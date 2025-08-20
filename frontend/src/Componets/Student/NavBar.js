import "./NavBar.css";

function NavBar(){
    return (
        <div class="Navigation_Bar">
            <img src="/Amandla.png" alt="Example" class="Logo"/>
        <ul>
        <li><a class="active" href="#home">Dashboard</a></li>
        <li><a href="#news">Create A Course</a></li>
        <li><a href="#contact">Create New Quiz</a></li>
        <li><a href="#about">Student Analysis</a></li>
        <li><a href="#about">Quiz History</a></li>

        </ul>
        </div>

    )
}

export default NavBar;