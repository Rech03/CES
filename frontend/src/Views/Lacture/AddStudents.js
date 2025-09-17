import { useState, useEffect } from 'react';
import EnrollStudents from "../../Componets/Lacture/AddStudents";
import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import StarRating from "../../Componets/Lacture/StarRating";
import { 
  getMyCourses, // Fixed: was myCourses
  getCourseStudents, // Fixed: was listStudents
  removeStudentFromCourse, // Fixed: was removeStudent
  uploadStudentsCSV // For bulk enrollment
} from '../../api/courses';
import { checkEnrollment } from '../../api/auth';
import "./AddStudents.css";

function AddStudents() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load courses when component mounts
  useEffect(() => {
    loadCourses();
  }, []);

  // Load enrolled students when course is selected
  useEffect(() => {
    if (selectedCourse) {
      loadEnrolledStudents(selectedCourse.id);
    }
  }, [selectedCourse]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError("");
      console.log('Loading lecturer courses...');
      
      const response = await getMyCourses(); // Fixed API call
      console.log('Courses loaded:', response.data);
      
      // Handle different response formats
      let coursesData = [];
      if (Array.isArray(response.data)) {
        coursesData = response.data;
      } else if (response.data?.results && Array.isArray(response.data.results)) {
        coursesData = response.data.results;
      }
      
      setCourses(coursesData);
      
      // Auto-select first course if available
      if (coursesData.length > 0) {
        setSelectedCourse(coursesData[0]);
      }
      
    } catch (err) {
      console.error('Error loading courses:', err);
      let errorMessage = 'Failed to load courses';
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadEnrolledStudents = async (courseId) => {
    try {
      setLoading(true);
      console.log('Loading enrolled students for course:', courseId);
      
      const response = await getCourseStudents(courseId); // Fixed API call
      console.log('Enrolled students loaded:', response.data);
      
      // Handle different response formats
      let studentsData = [];
      if (Array.isArray(response.data)) {
        studentsData = response.data;
      } else if (response.data?.students && Array.isArray(response.data.students)) {
        studentsData = response.data.students;
      } else if (response.data?.results && Array.isArray(response.data.results)) {
        studentsData = response.data.results;
      }
      
      setEnrolledStudents(studentsData);
      
    } catch (err) {
      console.error('Error loading enrolled students:', err);
      setError('Failed to load enrolled students');
      setEnrolledStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollStudent = async (enrollmentData) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      console.log('Enrolling student:', enrollmentData);
      
      // First check if student exists
      if (enrollmentData.student_number) {
        const checkResponse = await checkEnrollment(enrollmentData.student_number);
        console.log('Student check result:', checkResponse.data);
        
        if (!checkResponse.data.exists) {
          setError('Student not found with this student number');
          return;
        }
      }
      
      // Create CSV data for single student enrollment
      const csvData = `student_number,password\n${enrollmentData.student_number},${enrollmentData.password}`;
      const csvFile = new File([csvData], 'single_student.csv', { type: 'text/csv' });
      const formData = new FormData();
      formData.append('csv_file', csvFile);
      
      // Use CSV upload endpoint for enrollment
      const response = await uploadStudentsCSV(selectedCourse.id, formData);
      
      console.log('Student enrolled successfully:', response.data);
      setSuccess('Student enrolled successfully!');
      
      // Reload enrolled students list
      await loadEnrolledStudents(selectedCourse.id);
      
      return response.data;
    } catch (err) {
      console.error('Error enrolling student:', err);
      const errorMessage = err.response?.data?.detail || 
                           err.response?.data?.message || 
                           err.response?.data?.error ||
                           'Failed to enroll student';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      console.log('Removing student:', studentId);
      
      await removeStudentFromCourse(selectedCourse.id, { student_id: studentId }); // Fixed API call
      console.log('Student removed successfully');
      
      setSuccess('Student removed successfully!');
      
      // Reload enrolled students list
      await loadEnrolledStudents(selectedCourse.id);
      
    } catch (err) {
      console.error('Error removing student:', err);
      const errorMessage = err.response?.data?.detail || 
                           err.response?.data?.message || 
                           'Failed to remove student';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Note: regenerateCode API doesn't exist in your courses.js, you might need to add it
  const handleRegenerateCode = async (courseId) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      console.log('Regenerating enrollment code for course:', courseId);
      
      // This API endpoint doesn't exist in your courses.js - you may need to add it
      // For now, we'll show a message that this feature needs implementation
      setError('Regenerate enrollment code feature needs to be implemented in the API');
      
      // If you add this endpoint to courses.js:
      // const response = await regenerateEnrollmentCode(courseId);
      // setSuccess('New enrollment code generated successfully!');
      // await loadCourses();
      
    } catch (err) {
      console.error('Error regenerating code:', err);
      const errorMessage = err.response?.data?.detail || 
                           err.response?.data?.message || 
                           'Failed to regenerate enrollment code';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
    setError("");
    setSuccess("");
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
      
      <div className="ContainerAS">
        {/* Success/Error Messages */}
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
        
        {success && (
          <div className="success-message" style={{
            background: '#D1FAE5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            {success}
          </div>
        )}
        
        <div className="StudentsAdd">
          <EnrollStudents 
            onEnrollStudent={handleEnrollStudent}
            onRemoveStudent={handleRemoveStudent}
            onRegenerateCode={handleRegenerateCode}
            courses={courses}
            selectedCourse={selectedCourse}
            enrolledStudents={enrolledStudents}
            loading={loading}
            onCourseSelect={handleCourseSelect}
          />
        </div>
      </div>

      <div className="SideAS">
        <div className="Rating">
          <StarRating />
        </div>
        <div className="List">
          <CoursesList 
            courses={courses}
            selectedCourse={selectedCourse}
            onCourseSelect={handleCourseSelect}
            loading={loading}
            onRefresh={loadCourses}
          />
        </div>
      </div>
      
      <div className="BoiAS">
        <Bio />
      </div>
    </div> 
  );
}

export default AddStudents;