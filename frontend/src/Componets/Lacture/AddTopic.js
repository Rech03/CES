import { useState, useEffect } from "react";
import { getMyCourses, createTopic } from "../../api/courses";
import "./AddTopic.css";

export default function AddTopic({ onTopicCreated, loading: externalLoading }) {
  const [topicData, setTopicData] = useState({
    name: "",
    course: "",
    description: "",
  });
  
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load courses when component mounts
  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setIsLoadingCourses(true);
    try {
      // Use getMyCourses API from the courses API file
      const response = await getMyCourses();
      
      // Handle the specific response format from your API
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
      
      setCourses(coursesData);
      
      if (coursesData.length === 0) {
        setError('No courses available. Please create a course first before adding topics.');
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
      setCourses([]);
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTopicData((prev) => ({ ...prev, [name]: value }));
    
    // Clear messages when user starts typing
    if (success) setSuccess("");
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      // Validate required fields
      if (!topicData.name.trim()) {
        throw new Error("Topic name is required");
      }
      if (!topicData.course) {
        throw new Error("Please select a course");
      }

      // Prepare payload to match your API expectations
      const payload = {
        course: parseInt(topicData.course), // Course ID as integer
        name: topicData.name.trim(),
        description: topicData.description.trim() || "",
      };

      console.log('Creating topic with payload:', payload);

      // Call the createTopic API
      const response = await createTopic(payload);
      console.log('Topic created successfully:', response.data);
      
      setSuccess(`Topic "${topicData.name}" created successfully!`);
      
      // Reset form
      setTopicData({
        name: "",
        course: "",
        description: "",
      });

      // Call parent callback if provided
      if (onTopicCreated) {
        await onTopicCreated(response.data);
      }

    } catch (err) {
      console.error('Error creating topic:', err);
      
      // Handle different types of errors
      let errorMessage = "Failed to create topic";
      
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
          errorMessage = Array.isArray(data.non_field_errors) 
            ? data.non_field_errors[0] 
            : data.non_field_errors;
        } else if (data.name) {
          errorMessage = `Topic name: ${Array.isArray(data.name) ? data.name[0] : data.name}`;
        } else if (data.course) {
          errorMessage = `Course: ${Array.isArray(data.course) ? data.course[0] : data.course}`;
        } else if (data.description) {
          errorMessage = `Description: ${Array.isArray(data.description) ? data.description[0] : data.description}`;
        } else {
          // If we have field-specific errors, show them
          const fieldErrors = [];
          Object.entries(data).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              fieldErrors.push(`${field}: ${messages.join(', ')}`);
            } else if (typeof messages === 'string') {
              fieldErrors.push(`${field}: ${messages}`);
            }
          });
          
          if (fieldErrors.length > 0) {
            errorMessage = fieldErrors.join('; ');
          }
        }
      } else if (err.response?.status) {
        // HTTP status errors
        switch (err.response.status) {
          case 400:
            errorMessage = "Invalid topic data provided";
            break;
          case 401:
            errorMessage = "You are not authorized to create topics";
            break;
          case 403:
            errorMessage = "You don't have permission to create topics for this course";
            break;
          case 404:
            errorMessage = "Selected course not found";
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

  const selectedCourse = courses.find(course => course.id === parseInt(topicData.course));

  if (isLoadingCourses) {
    return (
      <div className="topic-form-container">
        <h2>Add New Topic</h2>
        <div className="loading-message">
          Loading courses...
        </div>
      </div>
    );
  }

  return (
    <div className="topic-form-container">
      <h2>Add New Topic</h2>

      {error && (
        <div className="message error-message" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="message success-message" role="alert">
          {success}
        </div>
      )}

      <form className="topic-form" onSubmit={handleSubmit}>
        {/* Topic Name */}
        <div className="form-field">
          <label htmlFor="topic-name">Topic Name *</label>
          <input
            id="topic-name"
            type="text"
            name="name"
            value={topicData.name}
            onChange={handleChange}
            placeholder="Enter topic name"
            required
            disabled={loading}
            autoComplete="off"
          />
        </div>

        {/* Course Selection */}
        <div className="form-field">
          <label htmlFor="topic-course">Course *</label>
          <select
            id="topic-course"
            name="course"
            value={topicData.course}
            onChange={handleChange}
            required
            disabled={loading}
          >
            <option value="">
              {courses.length === 0 ? 'No courses available - Create a course first' : 'Select a course'}
            </option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.code} - {course.name}
              </option>
            ))}
          </select>
          {courses.length === 0 && !loading && (
            <small className="field-hint warning">
              No courses found. Please create a course first using the "Create A Course" page.
            </small>
          )}
          {selectedCourse && (
            <small className="field-hint">
              Selected: {selectedCourse.code}
            </small>
          )}
        </div>

        {/* Topic Description - Full width */}
        <div className="form-field full-width">
          <label htmlFor="topic-description">Description</label>
          <textarea
            id="topic-description"
            name="description"
            value={topicData.description}
            onChange={handleChange}
            placeholder="Provide a brief description of the topic..."
            rows="3"
            disabled={loading}
          />
          <small className="field-hint">
            Optional: Add additional details about this topic
          </small>
        </div>

        {/* Selected Course Info */}
        {selectedCourse && (
          <div className="form-field full-width course-info">
            <div className="course-info-card">
              <h4>Selected Course:</h4>
              <p><strong>{selectedCourse.code}</strong> - {selectedCourse.name}</p>
              {selectedCourse.description && (
                <p className="course-description">{selectedCourse.description}</p>
              )}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="form-field full-width">
          <button 
            type="submit" 
            className={`submit-btn ${loading ? 'loading' : ''}`}
            disabled={loading || courses.length === 0}
          >
            {loading ? "Adding Topic..." : "Add Topic"}
          </button>
        </div>
      </form>
    </div>
  );
}