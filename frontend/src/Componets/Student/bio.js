import { useState, useEffect } from 'react';
import { getProfile } from '../../api/auth';
import "./bio.css";

function Bio({ name, avatar }) {
  const [profileData, setProfileData] = useState({
    name: name || "Michael Clifford",
    avatar: avatar || "/ID.jpeg"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      // Only fetch if no props provided
      if (!name && !avatar) {
        setLoading(true);
        try {
          const response = await getProfile();
          const user = response.data.user || response.data;
          
          setProfileData({
            name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || "Student",
            avatar: user.profile_picture || user.avatar || "/ID.jpeg"
          });
        } catch (err) {
          console.error('Error fetching profile:', err);
          setError('Failed to load profile');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchProfile();
  }, [name, avatar]);

  if (loading) {
    return (
      <div className="bio-container">
        <div className="bio-avatar skeleton"></div>
        <div className="bio-name skeleton">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bio-container">
        <img 
          className="bio-avatar"
          src="/ID.jpeg" 
          alt="Default avatar"
        />
        <div className="bio-name">
          {profileData.name}
        </div>
      </div>
    );
  }

  return (
    <div className="bio-container">
      <img 
        className="bio-avatar"
        src={profileData.avatar} 
        alt={`${profileData.name}'s avatar`}
        onError={(e) => {
          e.target.src = "/ID.jpeg"; // Fallback image
        }}
      />
      <div className="bio-name">
        {profileData.name}
      </div>
    </div>
  );
}

export default Bio;