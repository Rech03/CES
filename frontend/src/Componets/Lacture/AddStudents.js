import React, { useState } from "react";

export default function StudentForm() {
  const [student, setStudent] = useState({
    name: "",
    email: "",
    studentNumber: "",
  });
  const [file, setFile] = useState(null);

  const handleChange = (e) => {
    setStudent({ ...student, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://196.42.65.174:8000/api/students/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(student),
      });
      alert("Student added successfully!");
    } catch (err) {
      console.error(err);
      alert("Error adding student");
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://196.42.65.174:8000/api/students/upload", {
        method: "POST",
        body: formData,
      });
      alert("CSV uploaded successfully!");
    } catch (err) {
      console.error(err);
      alert("Error uploading CSV");
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-2">Add Student</h2>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={student.name}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={student.email}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          required
        />
        <input
          type="text"
          name="studentNumber"
          placeholder="Student Number"
          value={student.studentNumber}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          required
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add Student
        </button>
      </form>

      <h2 className="text-xl font-bold mt-6 mb-2">Upload CSV</h2>
      <form onSubmit={handleFileUpload} className="space-y-2">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files[0])}
          className="border p-2 w-full rounded"
        />
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Upload CSV
        </button>
      </form>
    </div>
  );
}
