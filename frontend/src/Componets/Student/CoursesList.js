import { useState, useEffect } from 'react';
import { getMyCourses } from '../../api/courses';
import './CoursesList.css';

function CoursesList({ 
  courses: propCourses, 
  selectedCourse,
  onCourseSelect,
  loading: externalLoading = false, 
  onRefresh,
  error: externalError,
  title = "My Courses",
  compact = true,
  showLoading = true
}) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(!Array.isArray(propCourses));
  const [error, setError] = useState('');

  // Normalize course data from different API response formats
  const normalizeCourses = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.courses)) return data.courses;
    if (data && Array.isArray(data.results)) return data.results;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && typeof data === 'object') {
      // Find the first array property
      const arrayKey = Object.keys(data).find((key) => Array.isArray(data[key]));
      if (arrayKey) return data[arrayKey];
    }
    return [];
  };

  // Generate consistent colors for courses based on ID
  const getRandomColor = (id) => {
    const colors = [
      '#1935CA', // Blue
      '#10B981', // Green  
      '#F59E0B', // Orange
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#06B6D4', // Cyan
      '#84CC16', // Lime
    ];
    return colors[id % colors.length];
  };

  // Process and enrich course data
  const processCourses = (rawCourses) => {
    return rawCourses.map((course, index) => {
      // Handle different possible field names for course properties
      const courseId = course.id || course.course_id || index;
      const courseCode = course.code || course.course_code || course.name || `Course ${courseId}`;
      const courseName = course.name || course.title || course.course_name || courseCode;
      
      return {
        id: courseId,
        code: courseCode,
        name: courseName,
        
        // Enrollment and status
        enrollment_date: course.enrollment_date || course.created_at || course.joined_at,
        is_active: course.is_active !== false && course.status !== 'inactive',
        
        // Quiz/activity data (may be null if not available)
        quiz_count: course.quiz_count || course.total_quizzes || 0,
        completed_count: course.completed_count || course.completed_quizzes || 0,
        average_score: course.average_score || course.avg_score || null,
        last_quiz_at: course.last_quiz_at || course.last_activity || course.recent_activity,
        
        // Additional metadata
        instructor: course.instructor || course.lecturer || course.teacher,
        semester: course.semester || course.term,
        year: course.year || course.academic_year,
        
        // UI properties
        color: course.color || getRandomColor(courseId),
        has_quizzes: (course.quiz_count || course.total_quizzes || 0) > 0,
        
        // Store original for debugging
        _original: course
      };
    });
  };

  const fetchCourses = async () => {
    setError('');
    setLoading(true);
    
    try {
      console.log('CoursesList: Fetching courses...');
      
      const coursesResponse = await getMyCourses();
      console.log('CoursesList: Raw response:', coursesResponse);
      
      const rawCourses = normalizeCourses(coursesResponse?.data);
      console.log('CoursesList: Normalized courses:', rawCourses);
      
      if (Array.isArray(rawCourses)) {
        const processedCourses = processCourses(rawCourses);
        setCourses(processedCourses);
        console.log('CoursesList: Processed courses:', processedCourses);
      } else {
        console.warn('CoursesList: No valid courses array found');
        setCourses([]);
      }

    } catch (err) {
      console.error('CoursesList: Error fetching courses:', err);
      
      let errorMessage = 'Failed to load courses';
      
      if (err.response?.status === 403) {
        errorMessage = 'Access denied';
      } else if (err.response?.status === 401) {
        errorMessage = 'Please log in';
      } else if (err.response?.status === 404) {
        errorMessage = 'Courses not found';
      } else if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Use prop courses when provided; otherwise fetch from API
  useEffect(() => {
    if (Array.isArray(propCourses)) {
      console.log('CoursesList: Using provided courses:', propCourses);
      const processedCourses = processCourses(propCourses);
      setCourses(processedCourses);
      setLoading(false);
      setError('');
    } else {
      console.log('CoursesList: No courses provided, fetching from API...');
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

  // Don't show loading if showLoading is false
  if (effectiveLoading && !showLoading) {
    return (
      <div className={`courses-list-container ${compact ? 'compact' : ''}`}>
        <div className="courses-header">
          <div className="courses-title-section">
            <h3 className="courses-title">{compact ? 'Courses' : title}</h3>
            <span className="courses-count">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`courses-list-container ${compact ? 'compact' : ''}`}>
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
        {effectiveLoading && showLoading ? (
          // Loading skeleton
          [1, 2, 3].map((i) => (
            <div key={i} className="course-item skeleton-item">
              <div className="course-icon-container">
                <div className="course-icon skeleton"></div>
              </div>
              <div className="course-info">
                <div className="course-code skeleton skeleton-text"></div>
                <div className="course-stats skeleton skeleton-text-small"></div>
                {!compact && (
                  <div className="course-last-activity skeleton skeleton-text-tiny"></div>
                )}
              </div>
            </div>
          ))
        ) : courses.length === 0 && !effectiveError ? (
          // Empty state
          <div className="no-courses">
            <div className="empty-icon">📚</div>
            <div className="empty-title">No courses enrolled</div>
            <div className="empty-subtitle">
              {compact ? 'Contact instructor' : 'Contact your instructor to get enrolled'}
            </div>
            {(onRefresh || !propCourses) && (
              <button
                className="empty-action-btn"
                onClick={handleRefreshClick}
                disabled={effectiveLoading}
              >
                Refresh
              </button>
            )}
          </div>
        ) : (
          // Course list
          courses.map((course, idx) => (
            <div 
              key={course.id ?? idx}
              className={`course-item ${selectedCourse?.id === course.id ? 'selected' : ''} ${onCourseSelect ? 'clickable' : ''}`}
              onClick={() => handleCourseClick(course)}
              title={compact ? `${course.code}${course.name !== course.code ? ` - ${course.name}` : ''}` : undefined}
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
                    <span className="stat-item quiz-stat" title={`${course.quiz_count} quizzes`}>
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
                  
                  {course.average_score !== null && typeof course.average_score === 'number' && (
                    <span className="stat-item score-stat" title={`Average score: ${course.average_score}%`}>
                      <svg className="stat-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" fill="currentColor"/>
                      </svg>
                      {Math.round(course.average_score)}%
                    </span>
                  )}
                  
                  {course.instructor && !compact && (
                    <span className="stat-item instructor-stat" title={`Instructor: ${course.instructor}`}>
                      <svg className="stat-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      {course.instructor}
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