import { useState, useEffect } from 'react';
import './Profile.css';

function Profile() {
  const [profileData, setProfileData] = useState({
    name: 'John Doe',
    degree: 'BSc Computer Science',
    quizzesCompleted: 5,
    email: 'john.doe@uct.ac.za',
  });

  useEffect(() => {
    // Placeholder for backend fetch
    // fetch('/api/profile')
    //   .then(response => response.json())
    //   .then(data => setProfileData(data));
  }, []);

  return (
    <div className="profile-container">
      <div className="profile-image">
        <img src="/assets/profile-pic.jpg" alt="Profile" />
      </div>
      <div className="profile-details">
        <h3>{profileData.name}</h3>
        <p><strong>Degree:</strong> {profileData.degree}</p>
        <p><strong>Quizzes Completed:</strong> {profileData.quizzesCompleted}</p>
        <p><strong>Email:</strong> {profileData.email}</p>
      </div>
    </div>
  );
}

export default Profile;