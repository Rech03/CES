import { useState } from "react";
import "./AddStudents.css";

function AddStudents() {
  const [selectedMethod, setSelectedMethod] = useState(null); // null, 'manual', or 'upload'
  const [student, setStudent] = useState({
    name: "",
    email: "",
    studentNumber: "",
  });
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleMethodSelection = (method) => {
    setSelectedMethod(method);
    // Reset forms when switching methods
    setStudent({ name: "", email: "", studentNumber: "" });
    setFile(null);
  };

  const handleChange = (e) => {
    setStudent({ ...student, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const res = await fetch("http://196.42.65.174:8000/api/students/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(student),
      });
      
      if (res.ok) {
        alert("Student added successfully!");
        setStudent({ name: "", email: "", studentNumber: "" });
      } else {
        throw new Error("Failed to add student");
      }
    } catch (err) {
      console.error(err);
      alert("Error adding student");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://196.42.65.174:8000/api/students/upload", {
        method: "POST",
        body: formData,
      });
      
      if (res.ok) {
        alert("CSV uploaded successfully!");
        setFile(null);
        e.target.reset();
      } else {
        throw new Error("Failed to upload CSV");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading CSV");
    } finally {
      setIsUploading(false);
    }
  };

  const goBack = () => {
    setSelectedMethod(null);
  };

  // Method Selection Screen
  if (!selectedMethod) {
    return (
      <div className="student-container">
        <h2>Add Students</h2>
        <div className="method-selection">
          <h3>Choose how you want to add students:</h3>
          
          <div className="method-options">
            <div className="method-option" onClick={() => handleMethodSelection('manual')}>
              <div className="method-icon">👤</div>
              <h4>Add Individual Student</h4>
              <p>Manually enter student details one by one</p>
            </div>
            
            <div className="method-option" onClick={() => handleMethodSelection('upload')}>
              <div className="method-icon">📄</div>
              <h4>Upload CSV File</h4>
              <p>Upload multiple students at once using a CSV file</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Manual Entry Form
  if (selectedMethod === 'manual') {
    return (
      <div className="student-container">
        <div className="form-header">
          <button className="back-btn" onClick={goBack}>← Back</button>
          <h2>Add Individual Student</h2>
        </div>
        
        <div className="student-form-section">
          <form onSubmit={handleSubmit} className="student-form">
            <div className="student-field">
              <label>Full Name *</label>
              <input
                type="text"
                name="name"
                placeholder="Enter student's full name"
                value={student.name}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="student-field">
              <label>Email Address *</label>
              <input
                type="email"
                name="email"
                placeholder="Enter student's email"
                value={student.email}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="student-field">
              <label>Student Number *</label>
              <input
                type="text"
                name="studentNumber"
                placeholder="Enter student number"
                value={student.studentNumber}
                onChange={handleChange}
                required
              />
            </div>
            
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding Student..." : "Add Student"}
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
          <button className="back-btn" onClick={goBack}>← Back</button>
          <h2>Upload CSV File</h2>
        </div>
        
        <div className="student-form-section">
          <div className="upload-instructions">
            <h4>CSV File Requirements:</h4>
            <ul>
              <li>File must be in CSV format (.csv)</li>
              <li>Include headers: name, email, studentNumber</li>
              <li>Each row should contain one student's information</li>
            </ul>
          </div>
          
          <form onSubmit={handleFileUpload} className="student-form">
            <div className="file-input-wrapper">
              <label>Select CSV File *</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files[0])}
                required
              />
            </div>
            
            <button 
              type="submit" 
              className="upload-btn"
              disabled={isUploading || !file}
            >
              {isUploading ? "Uploading..." : "Upload CSV"}
            </button>
          </form>
        </div>
      </div>
    );
  }
}

export default AddStudents;