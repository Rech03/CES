import { useState, useEffect } from 'react';
import { getProfile } from '../../api/auth';
import "./bio.css";

function Bio({ name, avatar, showLoading = true, compact = false }) {
  const [profileData, setProfileData] = useState({
    name: name || "Student",
    avatar: avatar || "/ID.jpeg"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      // Only fetch if no props provided
      if (!name && !avatar) {
        setLoading(true);
        setError(null);
        
        try {
          const response = await getProfile();
          const user = response.data.user || response.data; // Handle both formats
          
          // Extract name with multiple fallbacks
          const userName = 
            user?.full_name ||
            (user?.first_name && user?.last_name 
              ? `${user.first_name} ${user.last_name}`.trim() 
              : null) ||
            user?.username ||
            user?.email?.split('@')[0] ||
            "Student";
          
          // Extract avatar with fallback
          const userAvatar = 
            user?.profile_picture || 
            user?.avatar || 
            "/ID.jpeg";
          
          setProfileData({
            name: userName,
            avatar: userAvatar
          });
          
          setError(null);
        } catch (err) {
          console.warn('Bio: Failed to fetch profile, using defaults', err.message);
          
          // Silently fail and use defaults - don't show error to user
          setError(null);
          
          // Keep default values already set in state
          if (err.response?.status === 404 || err.response?.status === 401) {
            console.info('Bio: Using default profile (endpoint unavailable)');
            return;
          }
        } finally {
          setLoading(false);
        }
      }
    };

    fetchProfile();
  }, [name, avatar]);

  // Show loading state only if showLoading prop is true
  if (loading && showLoading) {
    return (
      <div className={`bio-container ${compact ? 'bio-compact' : ''}`}>
        <div className="bio-avatar skeleton"></div>
        <div className="bio-name skeleton" style={{ height: '16px', width: '80px' }}>
          <span style={{ opacity: 0 }}>Loading</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bio-container ${compact ? 'bio-compact' : ''}`}>
      <img 
        className="bio-avatar"
        src={profileData.avatar} 
        alt={`${profileData.name}'s avatar`}
        onError={(e) => {
          // Prevent infinite loop if fallback also fails
          if (e.target.src !== "/ID.jpeg") {
            e.target.src = "/ID.jpeg";
          }
        }}
        loading="lazy"
      />
      <div className="bio-name" title={profileData.name}>
        {profileData.name}
      </div>
    </div>
  );
}

export default Bio;