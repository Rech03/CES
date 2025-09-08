import "./SearchBar.css";
function SearchBar(){
    return(
        <div class="topnav">
        <div class="search-container">
            <form action="/action_page.php">
            <input type="text" placeholder="Search Quiz" name="search"/>
            
            </form>
        </div>
        </div>

    )
}

export default SearchBar;