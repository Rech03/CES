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

  // Normalize courses response - same pattern as UploadSlides.js
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

  // Load courses if not provided via props
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
      console.error('Error loading courses:', err);
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
    
    if (onCourseSelect) {
      onCourseSelect(course);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        setError('Please select a CSV file.');
        setFile(null);
        return;
      }
      
      // Validate file size (10MB limit)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB.');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError('');
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError("Please select a CSV file first");
      return;
    }
    
    if (!localSelectedCourse) {
      setError("Please select a course first");
      return;
    }
    
    setIsUploading(true);
    setError("");
    setSuccess("");

    try {
      // Create FormData - same pattern as UploadSlides.js
      const formData = new FormData();
      formData.append('csv_file', file);
      
      const response = await uploadStudentsCSV(localSelectedCourse.id, formData);
      const result = response.data;
      
      // Handle success response - similar to UploadSlides success handling
      let summaryMessage = `CSV Processing Complete for ${localSelectedCourse.code || localSelectedCourse.name}:\n\n`;
      
      // Handle different response formats
      if (result.successful_enrollments !== undefined) {
        summaryMessage += `✓ Successfully created and enrolled: ${result.successful_enrollments} students\n`;
      }
      
      if (result.already_enrolled !== undefined) {
        summaryMessage += `⚠ Already enrolled: ${result.already_enrolled} students\n`;
      }
      
      if (result.invalid_data !== undefined) {
        summaryMessage += `✗ Invalid data: ${result.invalid_data} students\n`;
      }
      
      if (result.duplicate_students !== undefined) {
        summaryMessage += `⚠ Duplicate students: ${result.duplicate_students} students\n`;
      }
      
      if (result.created !== undefined) {
        summaryMessage += `✓ Students created: ${result.created}\n`;
      }
      
      if (result.enrolled !== undefined) {
        summaryMessage += `✓ Students enrolled: ${result.enrolled}\n`;
      }
      
      if (result.failed !== undefined && result.failed > 0) {
        summaryMessage += `✗ Failed: ${result.failed} students\n`;
      }
      
      if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
        summaryMessage += `\nErrors:\n${result.errors.join('\n')}`;
      }
      
      setSuccess(summaryMessage || "CSV file processed successfully!");

      // Reset form - same pattern as UploadSlides.js
      setFile(null);
      const fileInput = document.getElementById('csvFile');
      if (fileInput) fileInput.value = '';
      
      if (onEnrollStudent) {
        onEnrollStudent(result);
      }
      
    } catch (err) {
      console.error('Error uploading CSV file:', err);
      const errorData = err.response?.data;
      
      let errorMessage = "Error processing CSV file";
      
      if (typeof errorData === 'string') {
        errorMessage = errorData;
      } else if (errorData?.detail) {
        errorMessage = errorData.detail;
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (errorData?.error) {
        errorMessage = errorData.error;
      } else if (errorData?.errors && Array.isArray(errorData.errors)) {
        errorMessage = `Upload errors:\n${errorData.errors.join('\n')}`;
      } else if (errorData?.non_field_errors && Array.isArray(errorData.non_field_errors)) {
        errorMessage = errorData.non_field_errors.join('\n');
      } else if (errorData?.csv_file && Array.isArray(errorData.csv_file)) {
        errorMessage = `CSV file error: ${errorData.csv_file.join(', ')}`;
      } else if (errorData && typeof errorData === 'object') {
        // Handle field-specific errors
        const fieldErrors = [];
        Object.entries(errorData).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            fieldErrors.push(`${field}: ${messages.join(', ')}`);
          } else if (typeof messages === 'string') {
            fieldErrors.push(`${field}: ${messages}`);
          }
        });
        
        if (fieldErrors.length > 0) {
          errorMessage = fieldErrors.join('\n');
        }
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
        <div className="loading-message">
          Loading courses...
        </div>
      </div>
    );
  }

  return (
    <div className="student-container">
      <h2>Enroll Students via CSV Upload</h2>
      
      {/* Course Selection */}
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
            <button 
              onClick={loadCourses} 
              className="retry-btn"
              disabled={isFormDisabled}
            >
              Retry Loading Courses
            </button>
          </div>
        )}
      </div>

      {/* Error/Success Messages */}
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

      {/* CSV Upload Section */}
      {localSelectedCourse && (
        <div className="step-section">
          <h3>Step 2: Upload Student CSV File</h3>
          
          <div className="student-form-section">
            <div className="upload-instructions">
              <h4>CSV File Requirements:</h4>
              <ul>
                <li>File must be in CSV format (.csv)</li>
                <li>Include headers: first_name, last_name, student_number, password</li>
                <li>Each row should contain one student's complete information</li>
                <li>Passwords must be at least 6 characters long</li>
                <li>Student accounts will be created automatically if they don't exist</li>
                <li>Existing students will be updated and enrolled in the course</li>
              </ul>
              <p><strong>Note:</strong> The system will automatically create student accounts for new students and enroll them in <strong>{localSelectedCourse.code}</strong>.</p>
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
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Processing CSV...
                  </>
                ) : (
                  "Upload and Enroll Students"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddStudents;