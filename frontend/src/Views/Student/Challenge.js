import React from "react";
import NavBar from "../../Componets/Student/NavBar";
import SearchBar from "../../Componets/Lacture/SearchBar";
import CoursesList from "../../Componets/Lacture/CoursesList";
import StarRating from "../../Componets/Lacture/StarRating";
import Bio from "../../Componets/Lacture/bio";
import "./Challenge.css";

function ChallengePage() {
  return (
    <div>
      {/* Top Nav */}
      <div className="NavBar">
        <NavBar />
      </div>
      
      {/* Search Bar */}
      <div className="SeachBar">
        <SearchBar />
      </div>
      
      {/* Main Challenge Container */}
      <div className="ChallengeContainer">
        <h2 className="ChallengeTitle">🔥 Today's Challenge</h2>
        <p className="ChallengeSubtitle">
          Test your knowledge and level up your skills! Pick a difficulty and
          start earning points 🏆
        </p>
        <div className="ChallengeGrid">
          <div className="ChallengeCard easy">
            <h3>🌱 Easy</h3>
            <p>Warm up with simple questions. Great for revision!</p>
            <div className="ChallengeStats">
              <span>5 Questions</span>
              <span>+10 XP</span>
            </div>
            <button className="ChallengeButton">Start Easy</button>
          </div>
          <div className="ChallengeCard moderate">
            <h3>⚡ Moderate</h3>
            <p>Step it up! Test yourself with trickier problems.</p>
            <div className="ChallengeStats">
              <span>8 Questions</span>
              <span>+25 XP</span>
            </div>
            <button className="ChallengeButton">Start Moderate</button>
          </div>
          <div className="ChallengeCard hard">
            <h3>🔥 Hard</h3>
            <p>Only the brave! Prove your mastery and earn big rewards.</p>
            <div className="ChallengeStats">
              <span>12 Questions</span>
              <span>+50 XP</span>
            </div>
            <button className="ChallengeButton">Start Hard</button>
          </div>
        </div>
        <div className="MotivationBox">
          <h3>💡 Did you know?</h3>
          <p>
            Students who attempt daily challenges improve their quiz scores by{" "}
            <strong>30%</strong> on average! Stay consistent and collect badges 🎖️
          </p>
        </div>
      </div>
      
      {/* Sidebar */}
      <div className="SideST">
        <div className="Rating">
          <StarRating />
        </div>
        <div className="List">
          <CoursesList />
        </div>
      </div>
      
      {/* Floating Bio */}
      <div className="BoiST">
        <Bio />
      </div>
    </div>
  );
}

export default ChallengePage;