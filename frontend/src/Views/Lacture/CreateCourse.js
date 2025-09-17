import { useState, useEffect } from 'react';
import AddCourse from "../../Componets/Lacture/AddCourse";
import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import StarRating from "../../Componets/Lacture/StarRating";
import { getMyCourses, deleteCourse } from '../../api/courses'; // Fixed: was myCourses
import "./CreateCourse.css";

function CreateCourse() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      const response = await getMyCourses(); // Fixed: was myCourses()
      console.log('Courses loaded:', response.data);
      
      // Handle different response formats - getMyCourses returns direct array
      let coursesData = [];
      if (Array.isArray(response.data)) {
        coursesData = response.data;
      } else if (response.data?.results && Array.isArray(response.data.results)) {
        coursesData = response.data.results;
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
      
      // Reload courses list to include the new course
      await loadCourses();
      
      return courseData;
    } catch (err) {
      console.error('Error in handleCreateCourse:', err);
      // Error is already handled in AddCourse component
      throw err;
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      console.log('Deleting course:', courseId);
      
      await deleteCourse(courseId);
      console.log('Course deleted successfully');
      
      // Remove the course from local state immediately for better UX
      setCourses(prev => prev.filter(course => course.id !== courseId));
      
      // Optionally reload all courses to ensure consistency
      // await loadCourses();
      
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

  return (
    <div>
      <div className="NavBar">
        <NavBar />
      </div>
       
      <div className="SideC">
        <div className="Rating">
          <StarRating />
        </div>
        <div className="List">
          <CoursesList 
            courses={courses}
            loading={loading}
            onDeleteCourse={handleDeleteCourse}
            onRefresh={handleRefresh}
            error={error}
          />
        </div>
      </div>
      
      <div className="BoiC">
        <Bio />
      </div>
      
      <div className="ContainerC">
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
        
        <div className="AddCourseForm">
          <AddCourse 
            onCreateCourse={handleCreateCourse}
            loading={loading}
          />
        </div>
      </div>
    </div> 
  );
}

export default CreateCourse;