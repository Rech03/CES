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
    setError("");
    
    try {
      console.log('Loading courses...');
      const response = await getMyCourses();
      console.log('Courses API response:', response);
      
      let coursesData = [];
      
      // Handle different possible response formats
      if (response.data) {
        if (Array.isArray(response.data)) {
          // Direct array response
          coursesData = response.data;
          console.log('Using direct array response');
        } else if (response.data.results && Array.isArray(response.data.results)) {
          // Paginated response
          coursesData = response.data.results;
          console.log('Using paginated response');
        } else if (response.data.courses && Array.isArray(response.data.courses)) {
          // Response with courses property
          coursesData = response.data.courses;
          console.log('Using courses property');
        } else if (response.data.data && Array.isArray(response.data.data)) {
          // Response with data property
          coursesData = response.data.data;
          console.log('Using data property');
        } else {
          // Try to find any array property in the response
          console.log('Response data keys:', Object.keys(response.data));
          const arrayProperty = Object.keys(response.data).find(key => 
            Array.isArray(response.data[key])
          );
          
          if (arrayProperty) {
            coursesData = response.data[arrayProperty];
            console.log(`Using array property: ${arrayProperty}`);
          } else {
            console.warn('No array found in response data:', response.data);
            // If it's an object but not an array, try to convert or handle it
            if (typeof response.data === 'object' && response.data !== null) {
              // Maybe it's a single course object? Convert to array
              if (response.data.id && response.data.name) {
                coursesData = [response.data];
                console.log('Converting single course object to array');
              }
            }
          }
        }
      }
      
      console.log('Final courses data:', coursesData);
      console.log('Courses count:', coursesData.length);
      
      setLocalCourses(coursesData);
      
      if (coursesData.length > 0 && !localSelectedCourse) {
        setLocalSelectedCourse(coursesData[0]);
      }
      
      if (coursesData.length === 0) {
        setError('No courses available. Please create a course first before enrolling students.');
      }
      
    } catch (err) {
      console.error('Error loading courses:', err);
      console.error('Error response:', err.response);
      
      let errorMessage = 'Failed to load courses';
      
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
        } else if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
          errorMessage = data.non_field_errors[0];
        } else {
          errorMessage = `Failed to load courses: ${JSON.stringify(data)}`;
        }
      } else if (err.message) {
        errorMessage = `Failed to load courses: ${err.message}`;
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
      console.log(`Processing CSV file for course: ${localSelectedCourse.id}`);
      console.log('Selected file:', file);

      // Create FormData with the file
      const formData = new FormData();
      formData.append('csv_file', file);
      
      // Log FormData contents for debugging
      console.log('FormData contents:');
      for (let pair of formData.entries()) {
        console.log(`${pair[0]}:`, pair[1]);
      }
      
      const response = await uploadStudentsCSV(localSelectedCourse.id, formData);
      console.log('CSV upload response:', response);

      // Handle response based on your API's response format
      if (response.data) {
        const result = response.data;
        console.log('Upload result:', result);
        
        let summaryMessage = `CSV Processing Complete for ${localSelectedCourse.code || localSelectedCourse.name}:\n\n`;
        
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
          summaryMessage += `\n✗ Errors (${result.errors.length}):\n${result.errors.join('\n')}`;
        }
        
        if (result.details && Array.isArray(result.details)) {
          summaryMessage += `\nDetails:\n${result.details.join('\n')}`;
        }
        
        // Show success if any students were processed successfully
        const hasSuccesses = (result.successful_enrollments || 0) > 0 || 
                            (result.created || 0) > 0 || 
                            (result.enrolled || 0) > 0;
        
        if (hasSuccesses || summaryMessage.includes('✓')) {
          setSuccess(summaryMessage);
        } else {
          // If no clear successes, but no explicit errors, still show as success
          setSuccess(summaryMessage || "CSV file processed successfully!");
        }
      } else {
        setSuccess("CSV file processed successfully!");
      }

      // Reset form on successful processing
      setFile(null);
      e.target.reset();
      
    } catch (err) {
      console.error('Error uploading CSV file:', err);
      console.error('Error response data:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      let errorMessage = "Error processing CSV file";
      
      if (err.response?.data) {
        const data = err.response.data;
        console.log('Error data type:', typeof data);
        console.log('Error data keys:', Object.keys(data || {}));
        
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.errors && Array.isArray(data.errors)) {
          errorMessage = `Upload errors:\n${data.errors.join('\n')}`;
        } else if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
          errorMessage = data.non_field_errors.join('\n');
        } else if (data.csv_file && Array.isArray(data.csv_file)) {
          errorMessage = `CSV file error: ${data.csv_file.join(', ')}`;
        } else {
          // Handle field-specific errors
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
          } else {
            errorMessage = `Upload failed: ${JSON.stringify(data)}`;
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
            {localSelectedCourse && (
              <p className="selected-course-info">
                Selected: <strong>{localSelectedCourse.code} - {localSelectedCourse.name}</strong>
              </p>
            )}
          </div>
        ) : (
          <div className="no-courses-message">
            <p>No courses available. Please create a course first using the "Create A Course" page.</p>
            <button onClick={loadCourses} className="retry-btn">
              Retry Loading Courses
            </button>
          </div>
        )}
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="error-message">
          <pre>{error}</pre>
        </div>
      )}
      
      {success && (
        <div className="success-message">
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
                  onChange={(e) => setFile(e.target.files[0])}
                  required
                  disabled={loading}
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
                disabled={loading || !file || !localSelectedCourse}
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