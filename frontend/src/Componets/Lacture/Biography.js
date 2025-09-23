import { useState, useEffect } from 'react';
import { getProfile } from '../../api/auth';
import { getDashboard } from '../../api/auth';
import { getQuizzesForReview, lecturerSlides } from '../../api/ai-quiz';
import { getMyCourses } from '../../api/courses';
import api from '../../api/client';
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
    name: name || "Loading ....",
    title: title || "Loading...",
    avatar: avatar || "/ID.jpeg",
    quizCount: quizCount || "27",
    studentCount: studentCount || "400"
  });
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    ready: 0,
    live: 0
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

          // Fetch AI quiz data and calculate stats
          let totalQuizzes = 0;
          let quizStats = { total: 0, draft: 0, ready: 0, live: 0 };
          
          try {
            // Try different AI quiz endpoints
            const endpointsToTry = [
              { name: 'getQuizzesForReview', fn: () => getQuizzesForReview() },
              { name: 'lecturerSlides', fn: () => lecturerSlides() },
              { name: 'direct slides API', fn: () => api.get('ai-quiz/lecturer/slides/') },
              { name: 'direct quizzes API', fn: () => api.get('ai-quiz/lecturer/quizzes-for-review/') }
            ];

            for (const endpoint of endpointsToTry) {
              try {
                const response = await endpoint.fn();
                
                if (response.data && (
                  Array.isArray(response.data) || 
                  response.data.results || 
                  response.data.slides ||
                  response.data.quizzes
                )) {
                  let aiQuizzesData = [];
                  
                  // Extract data based on structure
                  if (Array.isArray(response.data)) {
                    aiQuizzesData = response.data;
                  } else if (response.data.results && Array.isArray(response.data.results)) {
                    aiQuizzesData = response.data.results;
                  } else if (response.data.slides && Array.isArray(response.data.slides)) {
                    aiQuizzesData = response.data.slides;
                  } else if (response.data.quizzes && Array.isArray(response.data.quizzes)) {
                    aiQuizzesData = response.data.quizzes;
                  }

                  // Calculate quiz statistics
                  totalQuizzes = aiQuizzesData.length;
                  
                  const draft = aiQuizzesData.filter(q => 
                    !q.is_live && !q.published && (q.questions_count || q.total_questions || 0) === 0
                  ).length;
                  
                  const ready = aiQuizzesData.filter(q => 
                    !q.is_live && !q.published && (q.questions_count || q.total_questions || 0) > 0
                  ).length;
                  
                  const live = aiQuizzesData.filter(q => 
                    q.is_live || q.published || q.status === 'published'
                  ).length;

                  quizStats = {
                    total: totalQuizzes,
                    draft,
                    ready,
                    live
                  };
                  
                  console.log(`Biography: Found AI quiz data from ${endpoint.name}:`, quizStats);
                  break; // Found data, stop trying other endpoints
                }
              } catch (error) {
                console.log(`Biography: ${endpoint.name} failed:`, error.message);
              }
            }
          } catch (quizErr) {
            console.warn('Could not fetch AI quiz count:', quizErr);
          }

          // Fetch student count from courses
          let totalStudents = 0;
          try {
            const coursesResponse = await getMyCourses();
            let courses = [];
            
            if (coursesResponse.data?.courses && Array.isArray(coursesResponse.data.courses)) {
              courses = coursesResponse.data.courses;
            } else if (Array.isArray(coursesResponse.data)) {
              courses = coursesResponse.data;
            } else if (coursesResponse.data?.results && Array.isArray(coursesResponse.data.results)) {
              courses = coursesResponse.data.results;
            }
            
            // Sum up students from all courses
            totalStudents = courses.reduce((sum, course) => {
              return sum + (course.student_count || course.enrolled_students || course.students?.length || 0);
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

          setStats(quizStats);

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
      

      
   <div className="quiz-section" style={{ top: '100px', left: '230px', width: '90px' }}>
  <div className="quiz-icon-container" style={{ width: '50px', height: '50px' }}>
    <div className="quiz-icon" style={{ width: '20px', height: '20px', background: '#1935CA' }}></div>
  </div>
  <div className="quiz-count" style={{ left: '70px', fontSize: '23px' }}>{stats.total}</div>
  <div className="quiz-label" style={{ left: '60px', fontSize: '15px' }}>Total</div>
</div>

<div className="quiz-section" style={{ top: '100px', left: '380px', width: '90px' }}>
  <div className="quiz-icon-container" style={{ width: '50px', height: '50px' }}>
    <div className="quiz-icon" style={{ width: '20px', height: '20px', background: '#95A5A6' }}></div>
  </div>
  <div className="quiz-count" style={{ left: '70px', fontSize: '23px' }}>{stats.draft}</div>
  <div className="quiz-label" style={{ left: '60px', fontSize: '15px' }}>Draft</div>
</div>

<div className="quiz-section" style={{ top: '100px', left: '530px', width: '90px' }}>
  <div className="quiz-icon-container" style={{ width: '50px', height: '50px' }}>
    <div className="quiz-icon" style={{ width: '20px', height: '20px', background: '#F39C12' }}></div>
  </div>
  <div className="quiz-count" style={{ left: '70px', fontSize: '23px' }}>{stats.ready}</div>
  <div className="quiz-label" style={{ left: '60px', fontSize: '15px' }}>Ready</div>
</div>

<div className="quiz-section" style={{ top: '100px', left: '680px', width: '90px' }}>
  <div className="quiz-icon-container" style={{ width: '50px', height: '50px' }}>
    <div className="quiz-icon" style={{ width: '20px', height: '20px', background: '#27AE60' }}></div>
  </div>
  <div className="quiz-count" style={{ left: '70px', fontSize: '23px' }}>{stats.live}</div>
  <div className="quiz-label" style={{ left: '60px', fontSize: '15px' }}>Published</div>
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