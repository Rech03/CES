import { useState, useEffect } from 'react';
import { getMyCourses } from '../../api/courses';
import { getMyAttempts } from '../../api/quizzes';
import './CoursesList.css';

function CoursesList({ 
  courses: propCourses, 
  selectedCourse,
  onCourseSelect,
  loading: externalLoading = false, 
  onRefresh,
  error: externalError,
  title = "My Courses",
  compact = true
}) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(!Array.isArray(propCourses));
  const [error, setError] = useState('');

  // Normalize course data from different API responses
  const normalizeCourses = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.courses)) return data.courses;
    if (data && Array.isArray(data.results)) return data.results;
    if (data && typeof data === 'object') {
      const k = Object.keys(data).find((key) => Array.isArray(data[key]));
      if (k) return data[k];
    }
    return [];
  };

  const fetchCourses = async () => {
    setError('');
    setLoading(true);
    try {
      console.log('Fetching student courses...');
      
      // Fetch enrolled courses
      const coursesResponse = await getMyCourses();
      console.log('Student courses response:', coursesResponse);
      
      const enrolledCourses = normalizeCourses(coursesResponse?.data);
      
      if (enrolledCourses.length > 0) {
        // Fetch quiz attempts to determine last quiz activity
        let attempts = [];
        try {
          const attemptsResponse = await getMyAttempts();
          attempts = Array.isArray(attemptsResponse.data) 
            ? attemptsResponse.data 
            : attemptsResponse.data?.results || [];
        } catch (attemptsErr) {
          console.warn('Could not fetch attempts for last quiz dates:', attemptsErr);
        }

        // Process courses with enriched data
        const processedCourses = enrolledCourses.map(course => {
          // Find quiz attempts for this course
          const courseAttempts = attempts.filter(attempt => 
            attempt.quiz_course_id === course.id || 
            attempt.course_id === course.id ||
            (attempt.quiz_title && course.code && 
             attempt.quiz_title.toLowerCase().includes(course.code.toLowerCase()))
          );

          // Calculate stats
          const completedAttempts = courseAttempts.filter(a => a.is_completed);
          const totalQuizzes = [...new Set(courseAttempts.map(a => a.quiz || a.quiz_id))].length;
          
          let lastQuizDate = null;
          if (courseAttempts.length > 0) {
            const sortedAttempts = courseAttempts.sort((a, b) => 
              new Date(b.created_at || b.date_created) - new Date(a.created_at || a.date_created)
            );
            lastQuizDate = sortedAttempts[0].created_at || sortedAttempts[0].date_created;
          }

          // Calculate average score
          let averageScore = null;
          if (completedAttempts.length > 0) {
            const totalScore = completedAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
            averageScore = Math.round(totalScore / completedAttempts.length);
          }

          return {
            id: course.id,
            code: course.code || course.name || `Course ${course.id}`,
            name: course.name || course.title,
            last_quiz_at: lastQuizDate,
            quiz_count: totalQuizzes,
            completed_count: completedAttempts.length,
            average_score: averageScore,
            enrollment_date: course.enrollment_date || course.created_at,
            is_active: course.is_active !== false,
            has_quizzes: courseAttempts.length > 0,
            color: course.color || getRandomColor(course.id)
          };
        });

        setCourses(processedCourses);
      } else {
        setCourses([]);
      }

    } catch (err) {
      console.error('Error fetching student courses:', err);
      const d = err.response?.data;
      let msg = 'Failed to load courses';
      
      if (err.response?.status === 403) {
        msg = 'Access denied to courses';
      } else if (err.response?.status === 401) {
        msg = 'Please log in';
      } else if (typeof d === 'string') {
        msg = d;
      } else if (d?.detail) {
        msg = d.detail;
      } else if (d?.message) {
        msg = d.message;
      }
      
      setError(msg);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Generate consistent colors for courses
  const getRandomColor = (id) => {
    const colors = ['#1935CA', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    return colors[id % colors.length];
  };

  // Use prop courses when provided; otherwise fetch
  useEffect(() => {
    if (Array.isArray(propCourses)) {
      console.log('Using prop courses for student:', propCourses);
      setCourses(propCourses);
      setLoading(false);
      setError('');
    } else {
      console.log('Fetching courses for student...');
      fetchCourses();
    }
  }, [propCourses]);

  // Handle external errors
  useEffect(() => {
    if (externalError) {
      setError(externalError);
    }
  }, [externalError]);

  const effectiveLoading = loading || externalLoading;
  const effectiveError = error || externalError;

  const handleCourseClick = (course) => {
    if (onCourseSelect) {
      onCourseSelect(course);
    }
  };

  const handleRefreshClick = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      fetchCourses();
    }
  };

  return (
    <div className={`courses-list-container student-courses ${compact ? 'compact' : ''}`}>
      {/* Header */}
      <div className="courses-header">
        <div className="courses-title-section">
          <h3 className="courses-title">{compact ? 'Courses' : title}</h3>
          <span className="courses-count">
            {effectiveLoading ? '...' : `${courses.length} enrolled`}
          </span>
        </div>
        
        {(onRefresh || !propCourses) && (
          <button 
            className="refresh-btn"
            onClick={handleRefreshClick}
            disabled={effectiveLoading}
            title="Refresh courses"
          >
            <svg className="refresh-icon" viewBox="0 0 24 24" fill="none">
              <path d="M1 4v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Error Message */}
      {effectiveError && (
        <div className="courses-error">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <div className="error-message">{effectiveError}</div>
            <button 
              className="retry-btn"
              onClick={handleRefreshClick}
              disabled={effectiveLoading}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Courses Content */}
      <div className="courses-content">
        {effectiveLoading ? (
          // Loading skeleton
          [1, 2, 3].map((i) => (
            <div key={i} className="course-item skeleton-item">
              <div className="course-icon-container">
                <div className="course-icon skeleton"></div>
              </div>
              <div className="course-info">
                <div className="course-code skeleton skeleton-text"></div>
                <div className="course-last-quiz skeleton skeleton-text-small"></div>
                <div className="course-stats skeleton skeleton-text-tiny"></div>
              </div>
            </div>
          ))
        ) : courses.length === 0 && !effectiveError ? (
          // Empty state
          <div className="no-courses">
            <div className="empty-icon">📚</div>
            <div className="empty-title">No courses enrolled</div>
            <div className="empty-subtitle">Contact your instructor to get enrolled</div>
          </div>
        ) : (
          // Course list
          courses.map((course, idx) => (
            <div 
              key={course.id ?? idx}
              className={`course-item ${selectedCourse?.id === course.id ? 'selected' : ''} ${onCourseSelect ? 'clickable' : ''}`}
              onClick={() => handleCourseClick(course)}
              title={compact ? `${course.code} - ${course.name}` : undefined}
            >
              <div className="course-icon-container">
                <div className="course-icon" style={{ backgroundColor: course.color }}>
                  <svg className="icon-svg" viewBox="0 0 24 24" fill="none">
                    {course.has_quizzes ? (
                      // Course with quizzes - graduation cap
                      <path 
                        d="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    ) : (
                      // Course without quizzes - book
                      <path 
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    )}
                  </svg>
                </div>
              </div>
              
              <div className="course-info">
                <div className="course-code">
                  {course.code}
                </div>
                
                {!compact && course.name && course.code !== course.name && (
                  <div className="course-name">
                    {course.name}
                  </div>
                )}
                
                <div className="course-stats">
                  {course.quiz_count > 0 && (
                    <span className="stat-item quiz-stat" title={`${course.quiz_count} quizzes attempted`}>
                      <svg className="stat-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M9 11H3v8h6v-8zM21 11h-6v8h6v-8zM15 3H9v8h6V3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {compact ? course.quiz_count : `${course.quiz_count} quiz${course.quiz_count !== 1 ? 'es' : ''}`}
                    </span>
                  )}
                  
                  {course.completed_count > 0 && (
                    <span className="stat-item completed-stat" title={`${course.completed_count} completed`}>
                      <svg className="stat-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {compact ? course.completed_count : `${course.completed_count} done`}
                    </span>
                  )}
                  
                  {course.average_score !== null && (
                    <span className="stat-item score-stat" title={`Average score: ${course.average_score}%`}>
                      <svg className="stat-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" fill="currentColor"/>
                      </svg>
                      {course.average_score}%
                    </span>
                  )}
                </div>
                
                {course.last_quiz_at && !compact && (
                  <div className="course-last-activity">
                    Last activity: {new Date(course.last_quiz_at).toLocaleDateString('en-GB', { 
                      day: 'numeric', 
                      month: 'short' 
                    })}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default CoursesList;