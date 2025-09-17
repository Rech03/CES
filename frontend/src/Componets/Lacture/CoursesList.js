import { useState, useEffect } from 'react';
import { getMyCourses } from '../../api/courses';
import { listQuizzes } from '../../api/quizzes';
import './CoursesList.css';

function CoursesList({ courses }) {
  const [coursesData, setCoursesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const defaultCourses = [
    {
      id: 1,
      code: 'CSC3002F',
      lastQuiz: '10 July 2025',
      isActive: true
    },
    {
      id: 2,
      code: 'CSC3001F',
      lastQuiz: '12 June 2025',
      isActive: true
    },
    {
      id: 3,
      code: 'CSC3003S',
      lastQuiz: '12 July 2025',
      isActive: false
    },
    {
      id: 4,
      code: 'CSC2001F',
      lastQuiz: '12 May 2025',
      isActive: true
    }
  ];

  useEffect(() => {
    const fetchCourses = async () => {
      // Only fetch if no courses prop provided
      if (!courses || courses.length === 0) {
        setLoading(true);
        try {
          // Fetch user's courses
          const coursesResponse = await getMyCourses();
          const fetchedCourses = coursesResponse.data.results || coursesResponse.data || [];
          
          // For each course, get the latest quiz date
          const coursesWithQuizData = await Promise.all(
            fetchedCourses.map(async (course) => {
              try {
                // Fetch quizzes for this course/topic
                const quizzesResponse = await listQuizzes({ 
                  topic: course.id,
                  ordering: '-created_at' // Get most recent first
                });
                
                const quizzes = quizzesResponse.data.results || quizzesResponse.data || [];
                const latestQuiz = quizzes[0];
                
                return {
                  id: course.id,
                  code: course.code || course.name || `Course ${course.id}`,
                  name: course.name || course.title,
                  lastQuiz: latestQuiz ? 
                    new Date(latestQuiz.created_at || latestQuiz.date_created).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long', 
                      year: 'numeric'
                    }) : 
                    'No quizzes yet',
                  isActive: course.is_active !== false, // Default to true unless explicitly false
                  quizCount: quizzes.length,
                  studentCount: course.student_count || course.enrolled_students || 0
                };
              } catch (quizErr) {
                console.warn(`Could not fetch quizzes for course ${course.id}:`, quizErr);
                return {
                  id: course.id,
                  code: course.code || course.name || `Course ${course.id}`,
                  name: course.name || course.title,
                  lastQuiz: 'Unable to load',
                  isActive: course.is_active !== false,
                  quizCount: 0,
                  studentCount: course.student_count || course.enrolled_students || 0
                };
              }
            })
          );

          setCoursesData(coursesWithQuizData);
        } catch (err) {
          console.error('Error fetching courses:', err);
          setError('Failed to load courses');
          setCoursesData(defaultCourses); // Fallback to default
        } finally {
          setLoading(false);
        }
      } else {
        setCoursesData(courses);
      }
    };

    fetchCourses();
  }, [courses]);

  const renderIcon = (isActive) => {
    return (
      <div className="course-icon-container">
        <div className="course-icon">
          <svg 
            className="icon-svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {isActive ? (
              <path 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            ) : (
              <path 
                d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" 
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

  const displayCourses = coursesData.length > 0 ? coursesData : defaultCourses;

  if (loading) {
    return (
      <div className="courses-list-container">
        <div className="courses-header">
          <div className="courses-title">Courses</div>
        </div>
        <div className="courses-content">
          {[1, 2, 3].map((index) => (
            <div key={index}>
              <div className="course-item">
                <div className="course-icon-container">
                  <div className="course-icon skeleton"></div>
                </div>
                <div className="course-info">
                  <div className="course-code skeleton">Loading...</div>
                  <div className="course-last-quiz skeleton">Loading...</div>
                </div>
              </div>
              {index < 3 && <div className="course-divider"></div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="courses-list-container">
      <div className="courses-header">
        <div className="courses-title">Courses</div>
        {error && <div className="error-text">{error}</div>}
      </div>
      
      <div className="courses-content">
        {displayCourses.map((course, index) => (
          <div key={course.id || index}>
            <div className="course-item">
              {renderIcon(course.isActive)}
              <div className="course-info">
                <div className="course-code" title={course.name}>
                  {course.code}
                </div>
                <div className="course-last-quiz">
                  Last Quiz: {course.lastQuiz}
                </div>
                {course.quizCount !== undefined && (
                  <div className="course-stats">
                    {course.quizCount} quiz{course.quizCount !== 1 ? 'es' : ''} • {course.studentCount} student{course.studentCount !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
            {index < displayCourses.length - 1 && <div className="course-divider"></div>}
          </div>
        ))}
      </div>
      
      {displayCourses.length === 0 && !loading && (
        <div className="no-courses">
          <p>No courses found. Create your first course to get started!</p>
        </div>
      )}
    </div>
  );
}

export default CoursesList;