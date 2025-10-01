import { useState, useEffect } from 'react';
import EnrollStudents from "../../Componets/Lacture/AddStudents";
import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import { 
  getMyCourses,
  getCourseStudents,
  removeStudentFromCourse,
  uploadStudentsCSV
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

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadEnrolledStudents(selectedCourse.id);
    } else {
      setEnrolledStudents([]);
    }
  }, [selectedCourse]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getMyCourses();
      let coursesData = [];
      if (Array.isArray(response.data)) {
        coursesData = response.data;
      } else if (response.data?.results && Array.isArray(response.data.results)) {
        coursesData = response.data.results;
      } else if (response.data?.courses && Array.isArray(response.data.courses)) {
        coursesData = response.data.courses;
      }
      setCourses(coursesData);
      if (coursesData.length > 0 && !selectedCourse) {
        setSelectedCourse(coursesData[0]);
      }
    } catch (err) {
      let errorMessage = 'Failed to load courses';
      if (err.response?.data?.detail) errorMessage = err.response.data.detail;
      else if (err.response?.status === 403) errorMessage = 'You do not have permission to view courses';
      else if (err.response?.status === 401) errorMessage = 'Please log in to continue';
      setError(errorMessage);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const loadEnrolledStudents = async (courseId) => {
    if (!courseId) return;
    try {
      setLoading(true);
      const response = await getCourseStudents(courseId);
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
      setError('Failed to load enrolled students');
      setEnrolledStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollStudent = async (enrollmentData) => {
    if (!selectedCourse) {
      setError('Please select a course first');
      return;
    }
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      if (enrollmentData.student_number) {
        const checkResponse = await checkEnrollment(enrollmentData.student_number);
        if (!checkResponse.data.exists) {
          setError('Student not found with this student number');
          return;
        }
      }
      const csvData = `first_name,last_name,student_number,password
${enrollmentData.first_name || ''},${enrollmentData.last_name || ''},${enrollmentData.student_number},${enrollmentData.password}`;
      const csvFile = new File([csvData], 'single_student.csv', { type: 'text/csv' });
      const formData = new FormData();
      formData.append('csv_file', csvFile);
      const response = await uploadStudentsCSV(selectedCourse.id, formData);
      setSuccess('Student enrolled successfully!');
      await loadEnrolledStudents(selectedCourse.id);
      return response.data;
    } catch (err) {
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
    if (!selectedCourse) {
      setError('Please select a course first');
      return;
    }
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await removeStudentFromCourse(selectedCourse.id, { student_id: studentId });
      setSuccess('Student removed successfully!');
      await loadEnrolledStudents(selectedCourse.id);
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 
                           err.response?.data?.message || 
                           'Failed to remove student';
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
            courses={courses}
            selectedCourse={selectedCourse}
            enrolledStudents={enrolledStudents}
            loading={loading}
            onCourseSelect={handleCourseSelect}
          />
        </div>
      </div>
      <div className="SideAS">
        <CoursesList 
          courses={courses}
          selectedCourse={selectedCourse}
          onCourseSelect={handleCourseSelect}
          loading={loading}
          onRefresh={loadCourses}
          title="Courses"
          compact={true}
          showStats={true}
          error={error}
        />
      </div>
      <div className="BoiAS">
        <Bio />
      </div>
    </div> 
  );
}

export default AddStudents;
