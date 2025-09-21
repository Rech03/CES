import { useState } from "react";
import { createCourse } from "../../api/courses";
import "./AddCourse.css";

export default function CreateCourseForm({ onCreateCourse, loading: externalLoading }) {
  const [courseData, setCourseData] = useState({
    name: "",
    code: "",
    description: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCourseData((prev) => ({ ...prev, [name]: value }));
    
    // Clear messages when user starts typing
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      // Validate required fields
      if (!courseData.name.trim()) {
        throw new Error("Course name is required");
      }
      if (!courseData.code.trim()) {
        throw new Error("Course code is required");
      }

      // Prepare payload to match your API expectations
      const payload = {
        name: courseData.name.trim(),
        code: courseData.code.trim().toUpperCase(), // Typically course codes are uppercase
        description: courseData.description.trim() || "",
        max_students: 600, // Fixed maximum of 600 students per course
      };

      console.log('Creating course with payload:', payload);

      // Call the API
      const response = await createCourse(payload);
      console.log('Course creation response:', response);

      // Show success message
      setSuccess("Course created successfully!");
      
      // Reset form
      setCourseData({
        name: "",
        code: "",
        description: "",
      });

      // Call parent callback if provided (for CreateCourse page integration)
      if (onCreateCourse) {
        await onCreateCourse(response.data);
      }

    } catch (err) {
      console.error('Course creation error:', err);
      
      // Handle different types of errors
      let errorMessage = "Failed to create course";
      
      if (err.message && !err.response) {
        // Client-side validation errors
        errorMessage = err.message;
      } else if (err.response?.data) {
        // Server validation errors - Django REST framework format
        const data = err.response.data;
        
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.non_field_errors) {
          errorMessage = data.non_field_errors[0];
        } else if (data.name) {
          errorMessage = `Course name: ${Array.isArray(data.name) ? data.name[0] : data.name}`;
        } else if (data.code) {
          errorMessage = `Course code: ${Array.isArray(data.code) ? data.code[0] : data.code}`;
        } else {
          // If we have field-specific errors, show the first one
          const fieldErrors = Object.entries(data).find(([key, value]) => Array.isArray(value) || typeof value === 'string');
          if (fieldErrors) {
            const [field, messages] = fieldErrors;
            const message = Array.isArray(messages) ? messages[0] : messages;
            errorMessage = `${field}: ${message}`;
          }
        }
      } else if (err.response?.status) {
        // HTTP status errors
        switch (err.response.status) {
          case 400:
            errorMessage = "Invalid course data provided";
            break;
          case 401:
            errorMessage = "You are not authorized to create courses";
            break;
          case 403:
            errorMessage = "You don't have permission to create courses";
            break;
          case 500:
            errorMessage = "Server error. Please try again later";
            break;
          default:
            errorMessage = `Error ${err.response.status}: ${err.response.statusText}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Use external loading state if provided, otherwise use internal state
  const loading = externalLoading || isLoading;

  return (
    <div className="course-form_container">
      <h2>Create New Course</h2>

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="success" role="alert" style={{
          background: '#ECFDF5',
          border: '1px solid #A7F3D0',
          color: '#065F46',
          padding: '12px 0',
          borderBottom: '1px solid #A7F3D0',
          marginBottom: '30px',
          fontFamily: 'Poppins, sans-serif',
          fontSize: '14px'
        }}>
          {success}
        </div>
      )}

      <form className="course-form" onSubmit={handleSubmit}>
        {/* Course Name */}
        <div className="Course_Name">
          <label htmlFor="course-name">Course Name *</label>
          <input
            id="course-name"
            type="text"
            name="name"
            value={courseData.name}
            onChange={handleChange}
            placeholder="Enter course name"
            required
            disabled={loading}
            autoComplete="off"
          />
        </div>

        {/* Course Code */}
        <div className="Course_Code">
          <label htmlFor="course-code">Course Code *</label>
          <input
            id="course-code"
            type="text"
            name="code"
            value={courseData.code}
            onChange={handleChange}
            placeholder="e.g., CSC3003F"
            required
            disabled={loading}
            autoComplete="off"
            style={{ textTransform: 'uppercase' }}
          />
        </div>

        {/* Description - Full width */}
        <div className="Course_Description">
          <label htmlFor="course-description">Course Description</label>
          <textarea
            id="course-description"
            name="description"
            value={courseData.description}
            onChange={handleChange}
            placeholder="Provide a brief description of the course content and objectives..."
            rows="4"
            disabled={loading}
          />
        </div>

        {/* Submit Button - Full width */}
        <div className="submit-btn-container">
          <button 
            type="submit" 
            className={`submit-btn ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? "Creating Course..." : "Create Course"}
          </button>
        </div>
      </form>
    </div>
  );
}