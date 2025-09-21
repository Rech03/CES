import { useState, useEffect } from 'react';
import { getMyCourses } from '../../api/courses';
import { getMyAttempts } from '../../api/quizzes';
import './CoursesList.css';

function CoursesList({ courses = [] }) {
  const [courseData, setCourseData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCoursesData = async () => {
      // Only fetch if no courses provided as props
      if (courses.length === 0) {
        setLoading(true);
        try {
          // Fetch enrolled courses
          const coursesResponse = await getMyCourses();
          const enrolledCourses = Array.isArray(coursesResponse.data) 
            ? coursesResponse.data 
            : coursesResponse.data?.results || [];

          if (enrolledCourses.length > 0) {
            // Fetch quiz attempts to determine last quiz dates
            let attempts = [];
            try {
              const attemptsResponse = await getMyAttempts();
              attempts = Array.isArray(attemptsResponse.data) 
                ? attemptsResponse.data 
                : attemptsResponse.data?.results || [];
            } catch (attemptsErr) {
              console.warn('Could not fetch attempts for last quiz dates:', attemptsErr);
            }

            // Process courses with last quiz information
            const processedCourses = enrolledCourses.map(course => {
              // Find the most recent quiz attempt for this course
              const courseAttempts = attempts.filter(attempt => 
                attempt.quiz_course_id === course.id || 
                attempt.course_id === course.id ||
                (attempt.quiz_title && attempt.quiz_title.toLowerCase().includes(course.code?.toLowerCase()))
              );

              let lastQuizDate = null;
              if (courseAttempts.length > 0) {
                // Get the most recent attempt
                const sortedAttempts = courseAttempts.sort((a, b) => 
                  new Date(b.created_at || b.date_created) - new Date(a.created_at || a.date_created)
                );
                lastQuizDate = sortedAttempts[0].created_at || sortedAttempts[0].date_created;
              }

              return {
                id: course.id,
                code: course.code || course.name || `Course ${course.id}`,
                name: course.name || course.title,
                lastQuiz: lastQuizDate ? 
                  new Date(lastQuizDate).toLocaleDateString('en-US', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  }) : 'No quizzes yet',
                isActive: course.is_active !== false, // Default to active unless explicitly false
                enrollmentDate: course.enrollment_date || course.created_at,
                hasQuizzes: courseAttempts.length > 0
              };
            });

            setCourseData(processedCourses);
          } else {
            // No enrolled courses
            setCourseData([]);
          }

        } catch (err) {
          console.error('Error fetching courses data:', err);
          setError('Unable to load courses');
          // Use fallback data for development
          setCourseData([
            {
              id: 1,
              code: 'No Courses',
              lastQuiz: 'Not enrolled',
              isActive: false,
              hasQuizzes: false
            }
          ]);
        } finally {
          setLoading(false);
        }
      } else {
        // Use provided courses
        setCourseData(courses);
      }
    };

    fetchCoursesData();
  }, [courses]);

  const renderIcon = (isActive, hasQuizzes) => {
    return (
      <div className="course-icon-container">
        <div className="course-icon">
          <svg 
            className="icon-svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {isActive && hasQuizzes ? (
              // Active course with quizzes - checkmark
              <path 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            ) : isActive ? (
              // Active course without quizzes - book icon
              <path 
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            ) : (
              // Inactive course - pause icon
              <path 
                d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            )}
          </svg>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="courses-list-container">
        <div className="courses-header">
          <div className="courses-title">Courses</div>
        </div>
        <div className="courses-content">
          <div className="loading-courses">
            <div className="course-item skeleton">
              <div className="course-icon-container skeleton"></div>
              <div className="course-info">
                <div className="course-code skeleton">Loading...</div>
                <div className="course-last-quiz skeleton">Loading...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="courses-list-container">
      <div className="courses-header">
        <div className="courses-title">Courses</div>
      </div>
      
      <div className="courses-content">
        {courseData.length > 0 ? (
          courseData.map((course, index) => (
            <div key={course.id || index}>
              <div className="course-item">
                {renderIcon(course.isActive, course.hasQuizzes)}
                <div className="course-info">
                  <div className="course-code">{course.code}</div>
                  <div className="course-last-quiz">
                    {course.hasQuizzes ? `Last Quiz: ${course.lastQuiz}` : course.lastQuiz}
                  </div>
                  {course.name && course.name !== course.code && (
                    <div className="course-name">{course.name}</div>
                  )}
                </div>
              </div>
              {index < courseData.length - 1 && <div className="course-divider"></div>}
            </div>
          ))
        ) : (
          <div className="no-courses">
            <div className="no-courses-icon">📚</div>
            <div className="no-courses-text">No courses enrolled</div>
            <div className="no-courses-subtext">Contact your administrator to enroll in courses</div>
          </div>
        )}
        
        {error && (
          <div className="courses-error">
            <small>{error}</small>
          </div>
        )}
      </div>
    </div>
  );
}

export default CoursesList;