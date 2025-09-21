import { useState, useEffect } from 'react';
import { getProfile } from '../../api/auth';
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
      try {
        // Get current user profile to set student ID
        const profileResponse = await getProfile();
        const user = profileResponse.data.user || profileResponse.data;
        setSelectedStudentId(user.id);

        // Fetch courses for sidebar
        const coursesResponse = await getMyCourses();
        const fetchedCourses = coursesResponse.data.results || coursesResponse.data || [];
        setCourses(fetchedCourses);

      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data');
        // Set default student ID if profile fetch fails
        setSelectedStudentId(1);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}
        <div className="StudentAnalyticsWrapper">
          <StudentAnalytics studentId={selectedStudentId} />
        </div>
      </div>

      {/* Side panel remains outside */}
      <div className="SideAI">
        <div className="List">
          <CoursesList courses={courses} />
        </div>
      </div>
      <div className="BoiAI">
        <Bio />
      </div>
    </div>
  );
}

export default Analytics;