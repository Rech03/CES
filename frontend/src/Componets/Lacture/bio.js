import "./bio.css";

function Bio({ name = "Michael Clifford", avatar = "/ID.jpeg" }) {
  return (
    <div className="bio-container">
      <img 
        className="bio-avatar"
        src={avatar} 
        alt={`${name}'s avatar`}
      />
      <div className="bio-name">
        {name}
      </div>
    </div>
  );
}

export default Bio;