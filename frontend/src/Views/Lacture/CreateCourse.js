import { useState, useEffect } from 'react';
import AddCourse from "../../Componets/Lacture/AddCourse";
import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import StarRating from "../../Componets/Lacture/StarRating";
import { listCourses, createCourse, deleteCourse, myCourses } from '../../api/courses';
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
      console.log('Loading courses...');
      
      // Get courses for the current lecturer
      const response = await myCourses();
      console.log('Courses loaded:', response.data);
      setCourses(response.data);
      
    } catch (err) {
      console.error('Error loading courses:', err);
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (courseData) => {
    try {
      setLoading(true);
      setError("");
      console.log('Creating course:', courseData);
      
      const response = await createCourse(courseData);
      console.log('Course created:', response.data);
      
      // Reload courses list
      await loadCourses();
      
      return response.data;
    } catch (err) {
      console.error('Error creating course:', err);
      const errorMessage = err.response?.data?.detail || 
                           err.response?.data?.message || 
                           'Failed to create course';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    try {
      setLoading(true);
      console.log('Deleting course:', courseId);
      
      await deleteCourse(courseId);
      console.log('Course deleted successfully');
      
      // Reload courses list
      await loadCourses();
      
    } catch (err) {
      console.error('Error deleting course:', err);
      const errorMessage = err.response?.data?.detail || 
                           err.response?.data?.message || 
                           'Failed to delete course';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
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
            onRefresh={loadCourses}
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
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            {error}
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