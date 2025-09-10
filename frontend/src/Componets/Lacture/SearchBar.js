import "./SearchBar.css";

function SearchBar() {
  return (
    <div className="topnav">
      <div className="search-container">
        <form action="/action_page.php">
          <input 
            type="text" 
            placeholder="Search Quiz" 
            name="search"
          />
        </form>
      </div>
    </div>
  );
}

export default SearchBar;