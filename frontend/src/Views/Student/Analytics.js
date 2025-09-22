import { useState, useEffect } from 'react';
// Correct API imports
import { getProfile } from '../../api/users';
import { getMyCourses } from '../../api/courses';
import Bio from "../../Componets/Student/bio";
import Biography from "../../Componets/Student/Biography";
import CoursesList from "../../Componets/Student/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
import StarRating from "../../Componets/Student/StarRating";
import StudentAnalytics from '../../Componets/Student/QuizAnalytics';
import "./AIQuizzes.css";

function Analytics() {
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Get current user profile to set student ID
        try {
          const profileResponse = await getProfile();
          const user = profileResponse.data;
          console.log('Profile response for analytics:', user);
          
          // Extract user ID from response
          setSelectedStudentId(user?.id || user?.user_id || 1);
        } catch (profileErr) {
          console.warn('Error fetching user profile:', profileErr);
          // Set default student ID if profile fetch fails
          setSelectedStudentId(1);
        }

        // Fetch courses for sidebar
        try {
          const coursesResponse = await getMyCourses();
          console.log('Courses response for analytics:', coursesResponse);
          
          // Handle different response structures
          let fetchedCourses = [];
          if (Array.isArray(coursesResponse.data)) {
            fetchedCourses = coursesResponse.data;
          } else if (coursesResponse.data?.results) {
            fetchedCourses = coursesResponse.data.results;
          } else if (coursesResponse.data?.courses) {
            fetchedCourses = coursesResponse.data.courses;
          } else if (coursesResponse.data && typeof coursesResponse.data === 'object') {
            // Check if the data object has an array property
            const arrayKey = Object.keys(coursesResponse.data).find(key => 
              Array.isArray(coursesResponse.data[key])
            );
            if (arrayKey) {
              fetchedCourses = coursesResponse.data[arrayKey];
            }
          }
          
          setCourses(fetchedCourses);
        } catch (coursesErr) {
          console.warn('Error fetching courses:', coursesErr);
          setCourses([]); // Set empty array if courses fetch fails
        }

      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data');
        // Set defaults if everything fails
        setSelectedStudentId(1);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRefresh = () => {
    // Reload the page data
    window.location.reload();
  };

  if (loading) {
    return (
      <div>
        <div className="NavBar">
          <NavBar />
        </div>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="NavBar">
        <NavBar />
      </div>
      
      {/* Main Container - everything inside will be contained */}
      <div className="ContainerAI">
        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={handleRefresh}>Retry</button>
          </div>
        )}
        <div className="StudentAnalyticsWrapper">
          <StudentAnalytics studentId={selectedStudentId} />
        </div>
      </div>

      {/* Side panel remains outside */}
      <div className="SideAI">
          <CoursesList courses={courses} />
      </div>
      <div className="BoiAI">
        <Bio />
      </div>
    </div>
  );
}

export default Analytics;