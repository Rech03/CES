import { useState, useEffect } from "react";
import { myCourses, enrollStudent } from "../../api/courses";
import { checkEnrollment } from "../../api/auth";
import "./AddStudents.css";

function AddStudents({ 
  onEnrollStudent, 
  courses = [], 
  selectedCourse, 
  onCourseSelect, 
  loading: externalLoading 
}) {
  const [selectedMethod, setSelectedMethod] = useState(null); // null, 'manual', or 'upload'
  const [student, setStudent] = useState({
    studentNumber: "",
    password: "",
    enrollmentCode: "",
  });
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [localCourses, setLocalCourses] = useState([]);
  const [localSelectedCourse, setLocalSelectedCourse] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load courses if not provided via props
  useEffect(() => {
    if (courses.length > 0) {
      // Use courses from props
      setLocalCourses(courses);
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
    try {
      const response = await myCourses();
      
      let coursesData = [];
      
      if (response.data?.courses && Array.isArray(response.data.courses)) {
        coursesData = response.data.courses;
      } else if (Array.isArray(response.data)) {
        coursesData = response.data;
      }
      
      setLocalCourses(coursesData);
      
      if (coursesData.length > 0 && !localSelectedCourse) {
        setLocalSelectedCourse(coursesData[0]);
      }
      
    } catch (err) {
      console.error('Error loading courses:', err);
      setError('Failed to load courses');
    }
  };

  const handleMethodSelection = (method) => {
    setSelectedMethod(method);
    setStudent({ studentNumber: "", password: "", enrollmentCode: "" });
    setFile(null);
    setError("");
    setSuccess("");
  };

  const handleChange = (e) => {
    setStudent({ ...student, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleCourseChange = (e) => {
    const courseId = parseInt(e.target.value);
    const course = localCourses.find(c => c.id === courseId);
    setLocalSelectedCourse(course);
    
    if (onCourseSelect) {
      onCourseSelect(course);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");
    
    try {
      if (!localSelectedCourse) {
        throw new Error("Please select a course");
      }

      if (!student.studentNumber.trim()) {
        throw new Error("Student number is required");
      }

      if (!student.password.trim()) {
        throw new Error("Password is required");
      }

      if (student.password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      // Check if student exists first
      const checkResponse = await checkEnrollment(student.studentNumber.trim());
      
      if (checkResponse.data.exists) {
        // Student exists, check if already enrolled in this course
        if (checkResponse.data.enrolled_courses && 
            checkResponse.data.enrolled_courses.includes(localSelectedCourse.id)) {
          throw new Error(`Student ${student.studentNumber} is already enrolled in ${localSelectedCourse.code}`);
        }
        
        // Student exists but not enrolled in this course - show info message
        setSuccess(`Student ${student.studentNumber} found. Proceeding with enrollment...`);
      } else {
        throw new Error(`Student with number ${student.studentNumber} not found in the system. Please verify the student number.`);
      }

      // Prepare enrollment data including password
      const enrollmentData = {
        student_number: student.studentNumber.trim(),
        password: student.password.trim(),
        enrollment_code: student.enrollmentCode.trim() || localSelectedCourse.enrollment_code
      };

      // Use parent callback if provided, otherwise call API directly
      if (onEnrollStudent) {
        await onEnrollStudent(enrollmentData);
      } else {
        await enrollStudent(localSelectedCourse.id, enrollmentData);
      }
      
      setSuccess(`Student ${student.studentNumber} enrolled successfully in ${localSelectedCourse.code}!`);
      setStudent({ studentNumber: "", password: "", enrollmentCode: "" });
      
    } catch (err) {
      const errorMessage = err.message || 
                          err.response?.data?.detail || 
                          err.response?.data?.message || 
                          err.response?.data?.error ||
                          "Failed to enroll student";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
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

      // Read and parse CSV file
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error("CSV file must contain at least a header row and one data row");
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const studentNumberIndex = headers.indexOf('student_number');
      const passwordIndex = headers.indexOf('password');

      if (studentNumberIndex === -1) {
        throw new Error("CSV file must contain 'student_number' column");
      }

      if (passwordIndex === -1) {
        throw new Error("CSV file must contain 'password' column");
      }

      // Process students
      const students = [];
      const duplicates = [];
      const errors = [];
      const processed = new Set(); // Track duplicates within CSV

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim());
        
        if (row.length < headers.length) {
          errors.push(`Row ${i + 1}: Incomplete data`);
          continue;
        }

        const studentNumber = row[studentNumberIndex];
        const password = row[passwordIndex];

        if (!studentNumber) {
          errors.push(`Row ${i + 1}: Missing student number`);
          continue;
        }

        if (!password) {
          errors.push(`Row ${i + 1}: Missing password for ${studentNumber}`);
          continue;
        }

        if (password.length < 6) {
          errors.push(`Row ${i + 1}: Password too short for ${studentNumber} (minimum 6 characters)`);
          continue;
        }

        // Check for duplicates within CSV
        if (processed.has(studentNumber)) {
          duplicates.push(`${studentNumber} (appears multiple times in CSV)`);
          continue;
        }

        processed.add(studentNumber);
        students.push({ studentNumber, password });
      }

      if (errors.length > 0) {
        throw new Error(`CSV validation errors:\n${errors.join('\n')}`);
      }

      if (students.length === 0) {
        throw new Error("No valid students found in CSV file");
      }

      // Check each student's existence and enrollment status
      const enrollmentResults = {
        successful: [],
        alreadyEnrolled: [],
        notFound: [],
        apiErrors: []
      };

      for (const { studentNumber, password } of students) {
        try {
          // Check if student exists
          const checkResponse = await checkEnrollment(studentNumber);
          
          if (!checkResponse.data.exists) {
            enrollmentResults.notFound.push(studentNumber);
            continue;
          }

          // Check if already enrolled in this course
          if (checkResponse.data.enrolled_courses && 
              checkResponse.data.enrolled_courses.includes(localSelectedCourse.id)) {
            enrollmentResults.alreadyEnrolled.push(studentNumber);
            continue;
          }

          // Enroll student
          const enrollmentData = {
            student_number: studentNumber,
            password: password,
            enrollment_code: localSelectedCourse.enrollment_code
          };

          if (onEnrollStudent) {
            await onEnrollStudent(enrollmentData);
          } else {
            await enrollStudent(localSelectedCourse.id, enrollmentData);
          }

          enrollmentResults.successful.push(studentNumber);

        } catch (apiError) {
          enrollmentResults.apiErrors.push(`${studentNumber}: ${apiError.message}`);
        }

        // Add small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Generate summary message
      let summaryMessage = `CSV Upload Complete for ${localSelectedCourse.code}:\n\n`;
      
      if (enrollmentResults.successful.length > 0) {
        summaryMessage += `âœ“ Successfully enrolled: ${enrollmentResults.successful.length} students\n`;
      }
      
      if (enrollmentResults.alreadyEnrolled.length > 0) {
        summaryMessage += `âš  Already enrolled: ${enrollmentResults.alreadyEnrolled.length} students\n`;
      }
      
      if (enrollmentResults.notFound.length > 0) {
        summaryMessage += `âœ— Students not found: ${enrollmentResults.notFound.length}\n`;
      }
      
      if (duplicates.length > 0) {
        summaryMessage += `âš  Duplicates in CSV: ${duplicates.length}\n`;
      }
      
      if (enrollmentResults.apiErrors.length > 0) {
        summaryMessage += `âœ— API errors: ${enrollmentResults.apiErrors.length}\n`;
      }

      // Show detailed results if there were issues
      if (enrollmentResults.notFound.length > 0 || enrollmentResults.alreadyEnrolled.length > 0 || 
          duplicates.length > 0 || enrollmentResults.apiErrors.length > 0) {
        
        summaryMessage += '\nDetails:\n';
        
        if (enrollmentResults.alreadyEnrolled.length > 0) {
          summaryMessage += `\nAlready enrolled: ${enrollmentResults.alreadyEnrolled.join(', ')}`;
        }
        
        if (enrollmentResults.notFound.length > 0) {
          summaryMessage += `\nNot found: ${enrollmentResults.notFound.join(', ')}`;
        }
        
        if (duplicates.length > 0) {
          summaryMessage += `\nDuplicates: ${duplicates.join(', ')}`;
        }
        
        if (enrollmentResults.apiErrors.length > 0) {
          summaryMessage += `\nErrors: ${enrollmentResults.apiErrors.join(', ')}`;
        }
      }

      if (enrollmentResults.successful.length > 0) {
        setSuccess(summaryMessage);
      } else {
        setError("No students were enrolled. " + summaryMessage);
      }

      // Reset form
      setFile(null);
      e.target.reset();
      
    } catch (err) {
      const errorMessage = err.message || "Error processing CSV file";
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const goBack = () => {
    setSelectedMethod(null);
    setError("");
    setSuccess("");
  };

  const loading = externalLoading || isSubmitting || isUploading;

  // Method Selection Screen
  if (!selectedMethod) {
    return (
      <div className="student-container">
        <h2>Enroll Students</h2>
        
        {/* STEP 1: Course Selection - Always shown first */}
        <div className="step-section">
          <h3>Step 1: Select Course to Enroll Students Into</h3>
          
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

        {/* Course Info Display - Only show when course is selected */}
        {localSelectedCourse && (
          <div className="step-section">
            <h4>Selected Course Information:</h4>
            <div className="selected-course-card">
              <p><strong>Course Code:</strong> {localSelectedCourse.code}</p>
              <p><strong>Course Name:</strong> {localSelectedCourse.name}</p>
              <p><strong>Enrollment Code:</strong> {localSelectedCourse.enrollment_code || 'Not set'}</p>
              {localSelectedCourse.description && (
                <p><strong>Description:</strong> {localSelectedCourse.description}</p>
              )}
            </div>
          </div>
        )}

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

        {/* STEP 2: Method Selection - Only show if course is selected */}
        {localSelectedCourse && (
          <div className="step-section">
            <h3>Step 2: Choose Enrollment Method</h3>
            
            <div className="method-options">
              <div className="method-option" onClick={() => handleMethodSelection('manual')}>
                <div className="method-icon">ðŸ‘¤</div>
                <h4>Enroll Individual Student</h4>
                <p>Enter student number to enroll in {localSelectedCourse.code}</p>
              </div>
              
              <div className="method-option" onClick={() => handleMethodSelection('upload')}>
                <div className="method-icon">ðŸ“„</div>
                <h4>Upload CSV File</h4>
                <p>Upload multiple students at once into {localSelectedCourse.code}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Manual Entry Form
  if (selectedMethod === 'manual') {
    return (
      <div className="student-container">
        <div className="form-header">
          <button className="back-btn" onClick={goBack}>â† Back</button>
          <h2>Enroll Individual Student</h2>
        </div>

        {localSelectedCourse && (
          <div className="selected-course-display">
            <h4>Enrolling in: {localSelectedCourse.code} - {localSelectedCourse.name}</h4>
            <p>Course Enrollment Code: {localSelectedCourse.enrollment_code || 'Not set'}</p>
          </div>
        )}
        
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
        
        <div className="student-form-section">
          <form onSubmit={handleSubmit} className="student-form">
            <div className="student-field">
              <label htmlFor="studentNumber">Student Number *</label>
              <input
                id="studentNumber"
                type="text"
                name="studentNumber"
                placeholder="Enter student number (e.g., STDXXX001)"
                value={student.studentNumber}
                onChange={handleChange}
                required
                disabled={loading}
                autoComplete="off"
              />
            </div>

            <div className="student-field">
              <label htmlFor="password">Student Password *</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Enter password for student (min. 6 characters)"
                value={student.password}
                onChange={handleChange}
                required
                disabled={loading}
                autoComplete="new-password"
                minLength={6}
              />
              <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                This password will be used by the student to log into their account
              </small>
            </div>
            
            <div className="student-field">
              <label htmlFor="enrollmentCode">
                Enrollment Code (Optional)
                <small>Leave blank to use course default</small>
              </label>
              <input
                id="enrollmentCode"
                type="text"
                name="enrollmentCode"
                placeholder={`Default: ${localSelectedCourse?.enrollment_code || 'Not set'}`}
                value={student.enrollmentCode}
                onChange={handleChange}
                disabled={loading}
                autoComplete="off"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className={loading ? 'loading' : ''}
            >
              {loading ? "Enrolling Student..." : "Enroll Student"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // CSV Upload Form
  if (selectedMethod === 'upload') {
    return (
      <div className="student-container">
        <div className="form-header">
          <button className="back-btn" onClick={goBack}>â† Back</button>
          <h2>Upload CSV File</h2>
        </div>

        {localSelectedCourse && (
          <div className="selected-course-display">
            <h4>Enrolling in: {localSelectedCourse.code} - {localSelectedCourse.name}</h4>
          </div>
        )}
        
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
        
        <div className="student-form-section">
          <div className="upload-instructions">
            <h4>CSV File Requirements:</h4>
            <ul>
              <li>File must be in CSV format (.csv)</li>
              <li>Include headers: student_number, password</li>
              <li>Each row should contain one student's information</li>
              <li>Passwords must be at least 6 characters long</li>
              <li>Duplicate student numbers will be skipped</li>
              <li>Students already enrolled in this course will be skipped</li>
            </ul>
            <h5>Example CSV format:</h5>
            <pre className="csv-example">
student_number,password
STDXXX001,student123
STDXXX002,mypassword
STDXXX003,secure456
            </pre>
            <p><strong>Note:</strong> The system will check for existing students and enrollment status automatically.</p>
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
            </div>
            
            <button 
              type="submit" 
              className={`upload-btn ${loading ? 'loading' : ''}`}
              disabled={loading || !file}
            >
              {loading ? "Uploading..." : "Upload CSV"}
            </button>
          </form>
        </div>
      </div>
    );
  }
}

export default AddStudents;