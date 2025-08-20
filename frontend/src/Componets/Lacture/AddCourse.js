import { useState } from "react";
import "./AddCourse.css";
import { createCourse } from "../../api/courses"; // adjust path if needed

export default function CreateCourseForm() {
  const [courseData, setCourseData] = useState({
    name: "",
    code: "",            // added for API
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
        code: courseData.code,                      // required by API
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
    <div className="course_form_Container">
      <h2>Create New Course</h2>

      {error && <p className="error">{error}</p>}

      <form className="course-form" onSubmit={handleSubmit}>
        {/* Course Name */}
        <div className="Course_Name">
          <label className="course-form label">Course Name</label>
          <input
            type="text"
            name="name"
            value={courseData.name}
            onChange={handleChange}
            className="course-form input"
            placeholder="Enter course name"
            required
          />
        </div>

        {/* Course Code (added) */}
        <div className="Course_Code">
          <label className="course-form label">Course Code</label>
          <input
            type="text"
            name="code"
            value={courseData.code}
            onChange={handleChange}
            className="course-form input"
            placeholder="e.g., CSC3003F"
            required
          />
        </div>

        {/* Capacity */}
        <div className="Course_Capacity">
          <label className="course-form label">Capacity</label>
          <input
            type="number"
            name="capacity"
            value={courseData.capacity}
            onChange={handleChange}
            className="course-form input"
            placeholder="Enter number of students"
            required
          />
        </div>

        {/* (Optional UI-only fields retained) */}
        <div className="Course_Start">
          <label className="course-form label">Start Date</label>
          <input
            type="date"
            name="startDate"
            value={courseData.startDate}
            onChange={handleChange}
            className="course-form select"
          />
        </div>

        <div className="Course_End">
          <label className="course-form label">End Date</label>
          <input
            type="date"
            name="endDate"
            value={courseData.endDate}
            onChange={handleChange}
            className="course-form select"
          />
        </div>

        <div className="Course_Room">
          <label className="course-form label">Lecture Room</label>
          <input
            type="text"
            name="lectureRoom"
            value={courseData.lectureRoom}
            onChange={handleChange}
            className="course-form input"
            placeholder="Enter lecture room"
          />
        </div>

        <div className="Course_Description">
          <label className="course-form label">Description</label>
          <textarea
            name="description"
            value={courseData.description}
            onChange={handleChange}
            className="Dcourse-form textarea"
            placeholder="Short course description"
          />
        </div>

        <button type="submit" className="submit-btn" disabled={isLoading}>
          {isLoading ? "Creating..." : "Create Course"}
        </button>
      </form>
    </div>
  );
}
