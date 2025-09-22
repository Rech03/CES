import { useState, useEffect } from 'react';
import AddCourse from "../../Componets/Lacture/AddCourse";
import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import { getMyCourses, deleteCourse } from '../../api/courses';
import "./CreateCourse.css";

function CreateCourse() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load courses when component mounts
  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError("");
      console.log('Loading lecturer courses...');
      
      // Get courses for the current lecturer using the correct API
      const response = await getMyCourses();
      console.log('Courses loaded:', response.data);
      
      // Handle different response formats
      let coursesData = [];
      if (Array.isArray(response.data)) {
        coursesData = response.data;
      } else if (response.data?.results && Array.isArray(response.data.results)) {
        coursesData = response.data.results;
      } else if (response.data?.courses && Array.isArray(response.data.courses)) {
        coursesData = response.data.courses;
      }
      
      setCourses(coursesData);
      
    } catch (err) {
      console.error('Error loading courses:', err);
      
      // Handle different error types
      let errorMessage = 'Failed to load courses';
      
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.message) {
          errorMessage = data.message;
        }
      } else if (err.response?.status) {
        switch (err.response.status) {
          case 401:
            errorMessage = 'You are not authorized to view courses';
            break;
          case 403:
            errorMessage = 'You don\'t have permission to access courses';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later';
            break;
          default:
            errorMessage = `Error ${err.response.status}: Failed to load courses`;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setCourses([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (courseData) => {
    try {
      console.log('Course created successfully:', courseData);
      
      // Add the new course to local state for immediate UI update
      setCourses(prev => [courseData, ...prev]);
      setSuccess('Course created successfully!');
      
      // Optionally reload courses list to ensure server consistency
      try {
        await loadCourses();
      } catch (err) {
        console.warn('Error refreshing courses after creation:', err);
        // Don't show error since course was created successfully
      }
      
      return courseData;
    } catch (err) {
      console.error('Error in handleCreateCourse:', err);
      // Error is already handled in AddCourse component
      throw err;
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone and will also delete all associated topics, quizzes, and student enrollments.')) {
      return;
    }

    try {
      setLoading(true);
      console.log('Deleting course:', courseId);
      
      await deleteCourse(courseId);
      console.log('Course deleted successfully');
      
      // Remove the course from local state immediately for better UX
      setCourses(prev => prev.filter(course => course.id !== courseId));
      setSuccess('Course deleted successfully!');
      
      // Clear selection if deleted course was selected
      if (selectedCourse?.id === courseId) {
        setSelectedCourse(null);
      }
      
    } catch (err) {
      console.error('Error deleting course:', err);
      
      let errorMessage = 'Failed to delete course';
      
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.message) {
          errorMessage = data.message;
        }
      } else if (err.response?.status) {
        switch (err.response.status) {
          case 401:
            errorMessage = 'You are not authorized to delete courses';
            break;
          case 403:
            errorMessage = 'You don\'t have permission to delete this course';
            break;
          case 404:
            errorMessage = 'Course not found';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later';
            break;
          default:
            errorMessage = `Error ${err.response.status}: Failed to delete course`;
        }
      }
      
      setError(errorMessage);
      
      // Reload courses to ensure consistency after error
      await loadCourses();
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadCourses();
  };

  const handleCourseSelect = (course) => {
    console.log('Course selected:', course);
    setSelectedCourse(course);
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  return (
    <div>
      <div className="NavBar">
        <NavBar />
      </div>
       
      <div className="SideC">
        
          <CoursesList 
            courses={courses}
            selectedCourse={selectedCourse}
            onCourseSelect={handleCourseSelect}
            loading={loading}
            onDeleteCourse={handleDeleteCourse}
            onRefresh={handleRefresh}
            title="My Courses"
            compact={true}
            showActions={true}
            showStats={true}
            error={error}
          />
        
      </div>
      
      <div className="BoiC">
        <Bio />
      </div>
      
      <div className="ContainerC">
        {/* Messages */}
        {error && (
          <div className="error-message" style={{
            background: '#FEE2E2',
            border: '1px solid #FECACA',
            color: '#DC2626',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            margin: '20px 5% 0 5%',
            fontSize: '0.875rem'
          }}>
            <strong>Error:</strong> {error}
            <button 
              onClick={handleRefresh}
              style={{
                marginLeft: '10px',
                background: 'transparent',
                border: '1px solid #DC2626',
                color: '#DC2626',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        )}

        {success && (
          <div className="success-message" style={{
            background: '#D1FAE5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            margin: '20px 5% 0 5%',
            fontSize: '0.875rem'
          }}>
            {success}
          </div>
        )}
        
        <div className="AddCourseForm">
          <AddCourse 
            onCreateCourse={handleCreateCourse}
            loading={loading}
          />
        </div>

        {/* Recent Courses Section */}
        <div className="RecentCoursesSection">
          <div className="courses-overview-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            marginTop: '30px'
          }}>
            <h3>Recent Courses ({courses.length})</h3>
            {selectedCourse && (
              <div className="selected-course-info" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px'
              }}>
                <span>Selected: <strong>{selectedCourse.code}</strong></span>
                <button 
                  onClick={() => setSelectedCourse(null)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #1935CA',
                    color: '#1935CA',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
          
          {loading ? (
            <div className="loading-spinner" style={{
              textAlign: 'center',
              padding: '40px',
              color: '#666'
            }}>
              Loading courses...
            </div>
          ) : courses.length > 0 ? (
            <div className="courses-overview-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px',
              marginBottom: '20px'
            }}>
              {courses.slice(0, 4).map(course => (
                <div 
                  key={course.id} 
                  className={`course-overview-card ${selectedCourse?.id === course.id ? 'selected' : ''}`}
                  onClick={() => handleCourseSelect(course)}
                  style={{
                    background: selectedCourse?.id === course.id ? '#f0f9ff' : 'white',
                    border: selectedCourse?.id === course.id ? '2px solid #1935CA' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseOver={(e) => {
                    if (selectedCourse?.id !== course.id) {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedCourse?.id !== course.id) {
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <div className="course-overview-header">
                    <h4 style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '18px', 
                      fontWeight: '600',
                      color: '#1f2937'
                    }}>
                      {course.code || course.name}
                    </h4>
                    {course.code && course.name && course.code !== course.name && (
                      <p className="course-overview-name" style={{
                        margin: '0 0 12px 0',
                        fontSize: '14px',
                        color: '#6b7280',
                        lineHeight: '1.4'
                      }}>
                        {course.name}
                      </p>
                    )}
                  </div>
                  <div className="course-overview-stats" style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    {typeof course.student_count === 'number' && (
                      <span className="overview-stat" style={{
                        fontSize: '14px',
                        color: '#374151',
                        background: '#f3f4f6',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontWeight: '500'
                      }}>
                        {course.student_count} students
                      </span>
                    )}
                    {typeof course.quiz_count === 'number' && (
                      <span className="overview-stat" style={{
                        fontSize: '14px',
                        color: '#374151',
                        background: '#f3f4f6',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontWeight: '500'
                      }}>
                        {course.quiz_count} quizzes
                      </span>
                    )}
                  </div>
                  <div className="course-overview-meta" style={{
                    fontSize: '12px',
                    color: '#9ca3af',
                    marginBottom: '12px'
                  }}>
                    <span className="created-date">
                      Created: {course.created_at 
                        ? new Date(course.created_at).toLocaleDateString()
                        : 'Recently'
                      }
                    </span>
                  </div>
                  <div className="course-overview-actions">
                    <button 
                      className="delete-course-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCourse(course.id);
                      }}
                      disabled={loading}
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = '#dc2626';
                        e.target.style.color = 'white';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = '#fef2f2';
                        e.target.style.color = '#dc2626';
                      }}
                    >
                      Delete Course
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-courses" style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#6b7280'
            }}>
              <p>No courses created yet. Create your first course above!</p>
            </div>
          )}
          
          {courses.length > 4 && (
            <div className="view-all-courses" style={{
              textAlign: 'center',
              padding: '20px',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              <p>Showing 4 of {courses.length} courses</p>
            </div>
          )}
        </div>
      </div>
    </div> 
  );
}

export default CreateCourse;