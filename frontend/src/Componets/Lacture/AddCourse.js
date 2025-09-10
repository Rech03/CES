import { useState } from "react";
import { createCourse } from "../../api/courses"; // adjust path if needed
import "./AddCourse.css";

export default function CreateCourseForm() {
  const [courseData, setCourseData] = useState({
    name: "",
    code: "",
    capacity: "",
    startDate: "",
    endDate: "",
    lectureRoom: "",
    description: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCourseData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const payload = {
        name: courseData.name,
        code: courseData.code,
        description: courseData.description || "",
        max_students: Number(courseData.capacity || 0),
      };
      await createCourse(payload);
      alert("Course created successfully!");
      setCourseData({
        name: "",
        code: "",
        capacity: "",
        startDate: "",
        endDate: "",
        lectureRoom: "",
        description: "",
      });
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Failed to create course";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="course-form_container">
      <h2>Create New Course</h2>

      {error && <div className="error">{error}</div>}

      <form className="course-form" onSubmit={handleSubmit}>
        {/* Course Name */}
        <div className="Course_Name">
          <label>Course Name *</label>
          <input
            type="text"
            name="name"
            value={courseData.name}
            onChange={handleChange}
            placeholder="Enter course name"
            required
          />
        </div>

        {/* Course Code */}
        <div className="Course_Code">
          <label>Course Code *</label>
          <input
            type="text"
            name="code"
            value={courseData.code}
            onChange={handleChange}
            placeholder="e.g., CSC3003F"
            required
          />
        </div>

        {/* Description - Full width */}
        <div className="Course_Description">
          <label>Course Description</label>
          <textarea
            name="description"
            value={courseData.description}
            onChange={handleChange}
            placeholder="Provide a brief description of the course content and objectives..."
            rows="4"
          />
        </div>

        {/* Submit Button - Full width */}
        <div className="submit-btn-container">
          <button 
            type="submit" 
            className={`submit-btn ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? "Creating Course..." : "Create Course"}
          </button>
        </div>
      </form>
    </div>
  );
}