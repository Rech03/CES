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
      <form className="space-y-4" onSubmit={handleSubmit}>
        
        {/* Course Name */}
        <div>
          <label className="course-form label">Course Name</label>
          <input
            type="text"
            name="name"
            value={courseData.name}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg"
            placeholder="Enter course name"
            required
          />
        </div>

        {/* Capacity */}
        <div>
          <label className="course-form label">Capacity</label>
          <input
            type="number"
            name="capacity"
            value={courseData.capacity}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg"
            placeholder="Enter number of students"
            required
          />
        </div>

        {/* Start Date */}
        <div>
          <label className="course-form label">Start Date</label>
          <input
            type="date"
            name="startDate"
            value={courseData.startDate}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg"
            required
          />
        </div>

        {/* End Date */}
        <div>
          <label className="course-form label">End Date</label>
          <input
            type="date"
            name="endDate"
            value={courseData.endDate}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg"
            required
          />
        </div>

        {/* Lecture Room */}
        <div>
          <label className="course-form label">Lecture Room</label>
          <input
            type="text"
            name="lectureRoom"
            value={courseData.lectureRoom}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg"
            placeholder="Enter lecture room"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="course-form label">Description</label>
          <textarea
            name="description"
            value={courseData.description}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg"
            placeholder="Short course description"
          />
        </div>

        {/* Preview uploaded students */}
        {students.length > 0 && (
          <div className="bg-gray-100 p-3 rounded-lg mt-2">
            <h3 className="font-medium mb-2">Students Preview</h3>
            <ul className="list-disc pl-5 text-sm">
              {students.map((student, index) => (
                <li key={index}>{student.name || JSON.stringify(student)}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="course-form label"
        >
          Create Course
        </button>
      </form>
    </div>
  );
}
