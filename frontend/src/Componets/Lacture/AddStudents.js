import { useState, useEffect } from "react";
import { getMyCourses, uploadStudentsCSV } from "../../api/courses";
import "./AddStudents.css";

function AddStudents({ 
  onEnrollStudent, 
  courses = [], 
  selectedCourse, 
  onCourseSelect, 
  loading: externalLoading 
}) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localCourses, setLocalCourses] = useState([]);
  const [localSelectedCourse, setLocalSelectedCourse] = useState(null);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const normalizeCourses = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.courses)) return data.courses;
    if (Array.isArray(data?.results)) return data.results;
    if (data && typeof data === 'object') {
      const arrayKey = Object.keys(data).find(key => Array.isArray(data[key]));
      if (arrayKey) return data[arrayKey];
    }
    return [];
  };

  useEffect(() => {
    if (courses.length > 0) {
      setLocalCourses(courses);
      setIsLoadingCourses(false);
      if (selectedCourse) {
        setLocalSelectedCourse(selectedCourse);
      } else if (courses.length > 0 && !localSelectedCourse) {
        setLocalSelectedCourse(courses[0]);
      }
    } else {
      loadCourses();
    }
  }, [courses, selectedCourse]);

  const loadCourses = async () => {
    setIsLoadingCourses(true);
    setError("");
    try {
      const response = await getMyCourses();
      const coursesData = normalizeCourses(response?.data);
      setLocalCourses(coursesData);
      if (coursesData.length > 0 && !localSelectedCourse) {
        setLocalSelectedCourse(coursesData[0]);
      }
      if (coursesData.length === 0) {
        setError('No courses available. Please create a course first before enrolling students.');
      }
    } catch (err) {
      const errorData = err.response?.data;
      const errorMessage = typeof errorData === 'string' 
        ? errorData 
        : (errorData?.detail || errorData?.message || errorData?.error || 'Failed to load courses');
      setError(errorMessage);
      setLocalCourses([]);
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const handleCourseChange = (e) => {
    const courseId = parseInt(e.target.value);
    const course = localCourses.find(c => c.id === courseId);
    setLocalSelectedCourse(course);
    if (onCourseSelect) onCourseSelect(course);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        setError('Please select a CSV file.');
        setFile(null);
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB.');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const summarizeResult = (result, course) => {
    let summary = `CSV processed for ${course.code || course.name}:\n\n`;
    if (result.message) summary += `${result.message}\n`;
    if (result.successful_enrollments !== undefined) summary += `✓ Successfully created and enrolled: ${result.successful_enrollments}\n`;
    if (result.already_enrolled !== undefined) summary += `⚠ Already enrolled: ${result.already_enrolled}\n`;
    if (result.invalid_data !== undefined) summary += `✗ Invalid data: ${result.invalid_data}\n`;
    if (result.duplicate_students !== undefined) summary += `⚠ Duplicate students: ${result.duplicate_students}\n`;
    if (result.created !== undefined) summary += `✓ Students created: ${result.created}\n`;
    if (result.enrolled !== undefined) summary += `✓ Students enrolled: ${result.enrolled}\n`;
    if (result.updated_students !== undefined) summary += `✓ Updated students: ${result.updated_students}\n`;
    if (result.total_enrolled !== undefined) summary += `✓ Total enrolled in course: ${result.total_enrolled}\n`;
    if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
      summary += `\nErrors:\n${result.errors.join('\n')}`;
    }
    return summary.trim();
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) { setError("Please select a CSV file first"); return; }
    if (!localSelectedCourse) { setError("Please select a course first"); return; }
    setIsUploading(true);
    setError("");
    setSuccess("");
    try {
      const formData = new FormData();
      formData.append('csv_file', file);
      const response = await uploadStudentsCSV(localSelectedCourse.id, formData);
      const result = response.data;
      setSuccess(summarizeResult(result, localSelectedCourse));
      setFile(null);
      const fileInput = document.getElementById('csvFile');
      if (fileInput) fileInput.value = '';
      if (onEnrollStudent) onEnrollStudent(result);
    } catch (err) {
      const errorData = err.response?.data;
      let errorMessage = "Error processing CSV file";
      if (typeof errorData === 'string') errorMessage = errorData;
      else if (errorData?.detail) errorMessage = errorData.detail;
      else if (errorData?.message) errorMessage = errorData.message;
      else if (errorData?.error) errorMessage = errorData.error;
      else if (errorData?.errors && Array.isArray(errorData.errors)) errorMessage = `Upload errors:\n${errorData.errors.join('\n')}`;
      else if (errorData?.non_field_errors && Array.isArray(errorData.non_field_errors)) errorMessage = errorData.non_field_errors.join('\n');
      else if (errorData?.csv_file && Array.isArray(errorData.csv_file)) errorMessage = `CSV file error: ${errorData.csv_file.join(', ')}`;
      else if (errorData && typeof errorData === 'object') {
        const fieldErrors = [];
        Object.entries(errorData).forEach(([field, messages]) => {
          if (Array.isArray(messages)) fieldErrors.push(`${field}: ${messages.join(', ')}`);
          else if (typeof messages === 'string') fieldErrors.push(`${field}: ${messages}`);
        });
        if (fieldErrors.length > 0) errorMessage = fieldErrors.join('\n');
      }
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const loading = externalLoading || isUploading;
  const isFormDisabled = loading || isLoadingCourses;

  if (isLoadingCourses) {
    return (
      <div className="student-container">
        <h2>Enroll Students</h2>
        <div className="loading-message">Loading courses...</div>
      </div>
    );
  }

  return (
    <div className="student-container">
      <h2>Enroll Students via CSV Upload</h2>

      <div className="step-section">
        <h3>Step 1: Select Course</h3>
        {localCourses.length > 0 ? (
          <div className="course-selection-field">
            <label htmlFor="course-select">Choose Course *</label>
            <select 
              id="course-select"
              value={localSelectedCourse?.id || ""} 
              onChange={handleCourseChange}
              className="course-select-dropdown"
              disabled={isFormDisabled}
            >
              <option value="">-- Select a Course --</option>
              {localCourses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </select>
            {localSelectedCourse && (
              <p className="selected-course-info">
                Selected: <strong>{localSelectedCourse.code} - {localSelectedCourse.name}</strong>
              </p>
            )}
          </div>
        ) : (
          <div className="no-courses-message">
            <p>No courses available. Please create a course first using the "Create A Course" page.</p>
            <button onClick={loadCourses} className="retry-btn" disabled={isFormDisabled}>
              Retry Loading Courses
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message" role="alert">
          <pre>{error}</pre>
        </div>
      )}
      {success && (
        <div className="success-message" role="alert">
          <pre>{success}</pre>
        </div>
      )}

      {localSelectedCourse && (
        <div className="step-section">
          <h3>Step 2: Upload Student CSV File</h3>
          <div className="student-form-section">
            <div className="upload-instructions">
              <h4>CSV File Requirements:</h4>
              <ul>
                <li>File must be in CSV format (.csv)</li>
                <li>Include headers: <code>first_name,last_name,student_number,password</code></li>
                <li>Each row = one student</li>
              </ul>
              <p><strong>Note:</strong> New students will be created and enrolled in <strong>{localSelectedCourse.code}</strong>. Existing duplicates will be handled by the server according to your rules.</p>
            </div>
            <form onSubmit={handleFileUpload} className="student-form">
              <div className="file-input-wrapper">
                <label htmlFor="csvFile">Select CSV File *</label>
                <input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  required
                  disabled={isFormDisabled}
                />
                {file && (
                  <div className="file-selected">
                    <p>Selected: <strong>{file.name}</strong></p>
                    <p>Size: {(file.size / 1024).toFixed(2)} KB</p>
                    <p>Type: {file.type || 'text/csv'}</p>
                  </div>
                )}
              </div>
              <button 
                type="submit" 
                className={`upload-btn submit-btn ${loading ? 'loading' : ''}`}
                disabled={isFormDisabled || !file || !localSelectedCourse}
              >
                {loading ? (<><span className="loading-spinner"></span>Processing CSV...</>) : ("Upload and Enroll Students")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddStudents;
