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

  // Load courses if not provided via props
  useEffect(() => {
    if (courses.length > 0) {
      // Use courses from props
      setLocalCourses(courses);
      setIsLoadingCourses(false);
      if (selectedCourse) {
        setLocalSelectedCourse(selectedCourse);
      } else if (courses.length > 0 && !localSelectedCourse) {
        setLocalSelectedCourse(courses[0]);
      }
    } else {
      // Load courses from API
      loadCourses();
    }
  }, [courses, selectedCourse]);

  const loadCourses = async () => {
    setIsLoadingCourses(true);
    try {
      // Use getMyCourses API from the courses API file
      const response = await getMyCourses();
      
      let coursesData = [];
      
      if (response.data && Array.isArray(response.data)) {
        // Direct array response
        coursesData = response.data;
      } else if (response.data?.courses && Array.isArray(response.data.courses)) {
        // Response with courses property
        coursesData = response.data.courses;
      } else if (response.data?.results && Array.isArray(response.data.results)) {
        // Paginated response
        coursesData = response.data.results;
      }
      
      setLocalCourses(coursesData);
      
      if (coursesData.length > 0 && !localSelectedCourse) {
        setLocalSelectedCourse(coursesData[0]);
      }
      
      if (coursesData.length === 0) {
        setError('No courses available. Please create a course first before enrolling students.');
      }
      
    } catch (err) {
      console.error('Error loading courses:', err);
      
      let errorMessage = 'Failed to load courses';
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
          errorMessage = data.non_field_errors[0];
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
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

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    
    setIsUploading(true);
    setError("");
    setSuccess("");

    try {
      if (!localSelectedCourse) {
        throw new Error("Please select a course first");
      }

      console.log(`Processing CSV file for course: ${localSelectedCourse.id}`);

      // Use the uploadStudentsCSV API with correct parameter name
      const formData = new FormData();
      formData.append('csv_file', file); // Note: using 'csv_file' as per API spec
      
      const response = await uploadStudentsCSV(localSelectedCourse.id, formData);
      console.log('CSV upload response:', response.data);

      // Handle response based on your API's response format
      if (response.data) {
        const result = response.data;
        
        let summaryMessage = `CSV Processing Complete for ${localSelectedCourse.code}:\n\n`;
        
        // Handle different possible response formats
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
        
        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          summaryMessage += `✗ Errors: ${result.errors.length}\n`;
          summaryMessage += `\nError details:\n${result.errors.join('\n')}`;
        }
        
        // Alternative response format handling
        if (result.created !== undefined) {
          summaryMessage += `✓ Students created: ${result.created}\n`;
        }
        
        if (result.enrolled !== undefined) {
          summaryMessage += `✓ Students enrolled: ${result.enrolled}\n`;
        }
        
        if (result.failed !== undefined && result.failed > 0) {
          summaryMessage += `✗ Failed: ${result.failed} students\n`;
        }
        
        // Show success if any students were processed successfully
        const hasSuccesses = (result.successful_enrollments || 0) > 0 || 
                            (result.created || 0) > 0 || 
                            (result.enrolled || 0) > 0;
        
        if (hasSuccesses) {
          setSuccess(summaryMessage);
        } else {
           setSuccess(summaryMessage);
        }
      } else {
        setSuccess("CSV file processed successfully!");
      }

      // Reset form on successful processing
      setFile(null);
      e.target.reset();
      
    } catch (err) {
      console.error('Error uploading CSV file:', err);
      
      let errorMessage = "Error processing CSV file";
      
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.errors && Array.isArray(data.errors)) {
          errorMessage = data.errors.join('\n');
        } else if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
          errorMessage = data.non_field_errors.join('\n');
        } else if (data.csv_file && Array.isArray(data.csv_file)) {
          errorMessage = `CSV file error: ${data.csv_file.join(', ')}`;
        } else {
          // Handle other possible field errors
          const fieldErrors = [];
          Object.entries(data).forEach(([field, messages]) => {
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
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const loading = externalLoading || isUploading;

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
            >
              <option value="">-- Select a Course --</option>
              {localCourses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="no-courses-message">
            <p>No courses available. Please create a course first using the "Create A Course" page.</p>
          </div>
        )}
      </div>

  

      {/* Error/Success Messages */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {success && (
        <div className="success-message">
          {success}
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
                  onChange={(e) => setFile(e.target.files[0])}
                  required
                  disabled={loading}
                />
                {file && (
                  <p className="file-selected">Selected: {file.name}</p>
                )}
              </div>
              
              <button 
                type="submit" 
                className={`upload-btn submit-btn ${loading ? 'loading' : ''}`}
                disabled={loading || !file}
              >
                {loading ? "Processing CSV..." : "Upload and Enroll Students"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddStudents;