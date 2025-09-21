import { useState, useEffect } from 'react';
import { getProfile } from '../../api/auth';
import { getDashboard } from '../../api/auth';
import { listQuizzes } from '../../api/quizzes';
import { getMyCourses } from '../../api/courses';
import './Biography.css';

function Biography({ 
  name,
  title,
  avatar,
  quizCount,
  studentCount,
  StudentLabel = "Number of Students"
}) {
  const [profileData, setProfileData] = useState({
    name: name || "Simphiwe Cele",
    title: title || "Bcs Computer Science and Business Computing Lecturer",
    avatar: avatar || "/ID.jpeg",
    quizCount: quizCount || "27",
    studentCount: studentCount || "400"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfileStats = async () => {
      // Only fetch if no props provided
      if (!name && !title && !quizCount && !studentCount) {
        setLoading(true);
        try {
          // Fetch profile data
          const profileResponse = await getProfile();
          const user = profileResponse.data.user || profileResponse.data;
          
          // Fetch dashboard data for stats
          let dashboardData = null;
          try {
            const dashboardResponse = await getDashboard();
            dashboardData = dashboardResponse.data;
          } catch (dashErr) {
            console.warn('Dashboard not available, fetching individual stats');
          }

          // Fetch quiz count
          let totalQuizzes = 0;
          try {
            const quizzesResponse = await listQuizzes();
            totalQuizzes = quizzesResponse.data.results ? 
              quizzesResponse.data.results.length : 
              (Array.isArray(quizzesResponse.data) ? quizzesResponse.data.length : 0);
          } catch (quizErr) {
            console.warn('Could not fetch quiz count:', quizErr);
          }

          // Fetch student count from courses
          let totalStudents = 0;
          try {
            const coursesResponse = await getMyCourses();
            const courses = coursesResponse.data.results || coursesResponse.data || [];
            
            // Sum up students from all courses
            totalStudents = courses.reduce((sum, course) => {
              return sum + (course.student_count || course.enrolled_students || 0);
            }, 0);
          } catch (courseErr) {
            console.warn('Could not fetch student count:', courseErr);
          }

          // Update state with fetched data
          setProfileData({
            name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || "Lecturer",
            title: user.title || user.position || dashboardData?.user_role || "Lecturer",
            avatar: user.profile_picture || user.avatar || "/ID.jpeg",
            quizCount: dashboardData?.total_quizzes?.toString() || totalQuizzes.toString() || "0",
            studentCount: dashboardData?.total_students?.toString() || totalStudents.toString() || "0"
          });

        } catch (err) {
          console.error('Error fetching profile stats:', err);
          setError('Failed to load profile data');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchProfileStats();
  }, [name, title, quizCount, studentCount]);

  if (loading) {
    return (
      <div className="biography-container">
        <div className="biography-avatar skeleton"></div>
        <div className="biography-name skeleton">Loading...</div>
        <div className="biography-title skeleton">Loading...</div>
        <div className="quiz-section">
          <div className="quiz-icon-container">
            <div className="quiz-icon"></div>
          </div>
          <div className="quiz-count skeleton">--</div>
          <div className="quiz-label">Quiz Created</div>
        </div>
        <div className="students-section">
          <div className="students-icon-container">
            <div className="students-icon"></div>
          </div>
          <div className="students-count skeleton">--</div>
          <div className="students-label">{StudentLabel}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="biography-container">
      {/* Profile Image */}
      <img 
        className="biography-avatar"
        src={profileData.avatar} 
        alt={`${profileData.name}'s profile`}
        onError={(e) => {
          e.target.src = "/ID.jpeg"; // Fallback image
        }}
      />
      
      {/* Name */}
      <div className="biography-name">
        {profileData.name}
      </div>
      
      {/* Title/Position */}
      <div className="biography-title">
        {profileData.title}
      </div>
      
      {/* Quiz Created Section */}
      <div className="quiz-section">
        <div className="quiz-icon-container">
          <div className="quiz-icon"></div>
        </div>
        <div className="quiz-count">{profileData.quizCount}</div>
        <div className="quiz-label">Quiz Created</div>
      </div>
      
      {/* Students Section */}
      <div className="students-section">
        <div className="students-icon-container">
          <div className="students-icon"></div>
        </div>
        <div className="students-count">{profileData.studentCount}</div>
        <div className="students-label">{StudentLabel}</div>
      </div>
      
      {error && (
        <div className="error-message">
          <small>{error}</small>
        </div>
      )}
    </div>
  );
}

export default Biography;