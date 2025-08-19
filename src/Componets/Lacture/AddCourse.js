import Papa from "papaparse";
import { useState } from "react";
import "./AddCourse.css";

export default function CreateCourseForm() {
  const [courseData, setCourseData] = useState({
    name: "",
    capacity: "",
    startDate: "",
    endDate: "",
    lectureRoom: "",
    description: "",
  });

  const [students, setStudents] = useState([]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCourseData((prev) => ({ ...prev, [name]: value }));
  };

  
  // Submit form
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Course Data:", courseData);
    console.log("Enrolled Students:", students);
    alert("Course created successfully!");
  };

  return (
    <div className="course_form_Container">
      <h2>Create New Course</h2>
      <form className="course-form" onSubmit={handleSubmit}>
        
        {/* Course Name */}
        <div class="Course_Name">
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

        {/* Capacity */}
        <div class="Course_Capacity">
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

        {/* Start Date */}
        <div class="Course_Start">
          <label className="course-form label">Start Date</label>
          <input
            type="date"
            name="startDate"
            value={courseData.startDate}
            onChange={handleChange}
            className="course-form select"
            required
          />
        </div>

        {/* End Date */}
        <div class="Course_End">
          <label className="course-form label">End Date</label>
          <input
            type="date"
            name="endDate"
            value={courseData.endDate}
            onChange={handleChange}
            className="course-form select"
            required
          />
        </div>

        {/* Lecture Room */}
        <div class="Course_Room"> 
          <label className="course-form label">Lecture Room</label>
          <input
            type="text"
            name="lectureRoom"
            value={courseData.lectureRoom}
            onChange={handleChange}
            className="course-form inpu"
            placeholder="Enter lecture room"
            required
          />
        </div>

        {/* Description */}
        <div class="Course_Description">
          <label className="course-form label">Description</label>
          <textarea
            name="description"
            value={courseData.description}
            onChange={handleChange}
            className="course-form textarea"
            placeholder="Short course description"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="submit-btn"
        >
          Create Course
        </button>
      </form>
    </div>
  );
}
