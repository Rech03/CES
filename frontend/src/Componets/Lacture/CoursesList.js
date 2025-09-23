import { useEffect, useState } from 'react';
import { getMyCourses } from '../../api/courses';
import './CoursesList.css';

function CoursesList({ 
  courses: propCourses, 
  selectedCourse,
  onCourseSelect,
  loading: externalLoading = false, 
  onRefresh,
  onDeleteCourse,
  showActions = false,
  showStats = true,
  error: externalError,
  title = "Course List",
  compact = true // Default to compact mode for sidebar
}) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(!Array.isArray(propCourses));
  const [error, setError] = useState('');

  // Normalize any server shape to a plain array
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
      console.log('Fetching courses from CoursesList component...');
      const resp = await getMyCourses();
      console.log('CoursesList - Raw response:', resp);
      
      const list = normalizeCourses(resp?.data);
      console.log('CoursesList - Normalized courses:', list);
      
      setCourses(list);
    } catch (err) {
      console.error('CoursesList - Error fetching courses:', err);
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
      } else if (d?.error) {
        msg = d.error;
      }
      
      setError(msg);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Use prop courses when provided by parent; otherwise fetch here
  useEffect(() => {
    if (Array.isArray(propCourses)) {
      console.log('CoursesList - Using prop courses:', propCourses);
      setCourses(propCourses);
      setLoading(false);
      setError(''); // Clear any previous errors when using prop data
    } else {
      console.log('CoursesList - No prop courses, fetching...');
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

  const handleDeleteClick = (e, courseId) => {
    e.stopPropagation(); // Prevent course selection when clicking delete
    if (onDeleteCourse) {
      onDeleteCourse(courseId);
    }
  };

  // Get display title based on loading state and course count
  const getDisplayTitle = () => {
    if (compact && courses.length > 0) {
      return title.split(' ')[0]; // Just "Course" instead of "Course List"
    }
    return title;
  };

  return (
    <div className={`courses-list-container ${compact ? 'compact' : ''}`}>
      {/* Header */}
      <div className="courses-header">
        <div className="courses-title-section">
          <h3 className="courses-title">{getDisplayTitle()}</h3>
          <span className="courses-count">
            {effectiveLoading ? '...' : `${courses.length} course${courses.length !== 1 ? 's' : ''}`}
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
          // Loading skeleton - fewer items for compact mode
          [1, 2, compact ? 2 : 3].map((i) => (
            <div key={i} className="course-item skeleton-item">
              <div className="course-icon-container">
                <div className="course-icon skeleton"></div>
              </div>
              <div className="course-info">
                <div className="course-code skeleton skeleton-text"></div>
                {!compact && <div className="course-name skeleton skeleton-text-small"></div>}
                {showStats && !compact && (
                  <div className="course-stats skeleton skeleton-text-tiny"></div>
                )}
              </div>
            </div>
          ))
        ) : courses.length === 0 && !effectiveError ? (
          // Empty state
          <div className="no-courses">
            <div className="empty-icon">📚</div>
            <div className="empty-title">No courses</div>
            {!compact && <div className="empty-subtitle">Create your first course!</div>}
          </div>
        ) : (
          // Course list
          courses.map((course, idx) => (
            <div 
              key={course.id ?? idx}
              className={`course-item ${selectedCourse?.id === course.id ? 'selected' : ''} ${onCourseSelect ? 'clickable' : ''}`}
              onClick={() => handleCourseClick(course)}
              title={compact ? `${course.code || course.name} - ${course.name}` : undefined}
            >
              <div className="course-icon-container">
                <div className="course-icon">
                  <svg className="icon-svg" viewBox="0 0 24 24" fill="none">
                    <path 
                      d="M12 14l9-5-9-5-9 5 9 5z" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
              
              <div className="course-info">
                <div className="course-code">
                  {course.code || course.name || `Course ${course.id}`}
                </div>
                
                {!compact && course.name && course.code !== course.name && (
                  <div className="course-name">
                    {course.name}
                  </div>
                )}
                
                {showStats && (
                  <div className="course-stats">
                    {typeof course.student_count === 'number' && (
                      <span className="stat-item" title={`${course.student_count} students`}>
                        <svg className="stat-icon" viewBox="0 0 24 24" fill="none">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {compact ? course.student_count : `${course.student_count} students`}
                      </span>
                    )}
                    
                    {typeof course.quiz_count === 'number' && (
                      <span className="stat-item" title={`${course.quiz_count} quizzes`}>
                        <svg className="stat-icon" viewBox="0 0 24 24" fill="none">
                          <path d="M9 11H3v8h6v-8zM21 11h-6v8h6v-8zM15 3H9v8h6V3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {compact ? course.quiz_count : `${course.quiz_count} quizzes`}
                      </span>
                    )}
                    
                    {!compact && course.last_quiz_at && (
                      <span className="stat-item last-activity">
                        {new Date(course.last_quiz_at).toLocaleDateString('en-GB', { 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              {showActions && onDeleteCourse && (
                <div className="course-actions">
                  <button
                    className="delete-btn"
                    onClick={(e) => handleDeleteClick(e, course.id)}
                    title="Delete course"
                    disabled={effectiveLoading}
                  >
                    <svg className="delete-icon" viewBox="0 0 24 24" fill="none">
                      <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 6v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default CoursesList;