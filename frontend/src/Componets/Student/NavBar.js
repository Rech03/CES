import "./NavBar.css";

function NavBar(){
    return (
        <div class="Navigation_Bar">
            <img src="/Amandla.png" alt="Example" class="Logo"/>
        <ul>
        <li><a class="active" href="#home">Dashboard</a></li>
        <li><a href="#contact">Achievements</a></li>
        <li><a href="#about">Analytics</a></li>
        <li><a href="#about">Quiz History</a></li>

        </ul>
        </div>

    )
}

export default NavBar;