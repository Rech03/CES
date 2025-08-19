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

  // Handle CSV upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setStudents(results.data);
      },
    });
  };

  // Submit form
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Course Data:", courseData);
    console.log("Enrolled Students:", students);
    alert("Course created successfully!");
  };

  return (
    <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-2xl p-6 mt-8">
      <h2 className="text-xl font-bold mb-4">Create New Course</h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        
        {/* Course Name */}
        <div>
          <label className="block text-gray-700 font-medium">Course Name</label>
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
          <label className="block text-gray-700 font-medium">Capacity</label>
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
          <label className="block text-gray-700 font-medium">Start Date</label>
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
          <label className="block text-gray-700 font-medium">End Date</label>
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
          <label className="block text-gray-700 font-medium">Lecture Room</label>
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
          <label className="block text-gray-700 font-medium">Description</label>
          <textarea
            name="description"
            value={courseData.description}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg"
            placeholder="Short course description"
          />
        </div>

        {/* Upload CSV */}
        <div>
          <label className="block text-gray-700 font-medium">
            Upload Students (CSV)
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="w-full p-2 border rounded-lg"
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
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Create Course
        </button>
      </form>
    </div>
  );
}
