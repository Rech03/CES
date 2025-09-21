import { useState, useEffect } from 'react';
import { getMyCourses } from '../../api/courses';
import Bio from "../../Componets/Student/bio";
import CoursesList from "../../Componets/Student/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
import StarRating from "../../Componets/Student/StarRating";
import AIQuizzesDisplay from "../../Componets/Student/AIQuizzesDisplay";
import "./AIQuizzes.css";

function AIQuizzes() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const coursesResponse = await getMyCourses();
        const fetchedCourses = coursesResponse.data.results || coursesResponse.data || [];
        setCourses(fetchedCourses);
      } catch (err) {
        console.error('Error fetching courses for AI Quizzes page:', err);
        setError('Failed to load courses');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  return (
    <div>
      <div className="NavBar">
        <NavBar />
      </div>
      
      {/* Main Container - AI Quizzes Display */}
      <div className="ContainerAI">
  
        <AIQuizzesDisplay />
      </div>

      {/* Side panel */}
      <div className="SideAI">
        <div className="List">
          {loading ? (
            <div className="loading-courses">
              <p>Loading courses...</p>
            </div>
          ) : (
            <CoursesList courses={courses} />
          )}
        </div>
      </div>
    </div>
  );
}

export default AIQuizzes;