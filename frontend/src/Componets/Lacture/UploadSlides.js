import { useState, useEffect } from 'react';
import { listCourses, listTopics } from '../../api/courses';
import './UploadSlides.css';

const UploadSlides = () => {
  const [courses, setCourses] = useState([]);
  const [topics, setTopics] = useState([]);
  const [formData, setFormData] = useState({
    course: '',
    topic: '',
    title: '',
    description: ''
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Load courses on component mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await listCourses();
        setCourses(response.data.results || response.data);
      } catch (err) {
        setError('Failed to load courses');
      }
    };
    fetchCourses();
  }, []);

  // Load topics when course is selected
  useEffect(() => {
    if (formData.course) {
      const fetchTopics = async () => {
        try {
          const response = await listTopics({ course: formData.course });
          setTopics(response.data.results || response.data);
        } catch (err) {
          setError('Failed to load topics');
        }
      };
      fetchTopics();
    } else {
      setTopics([]);
    }
  }, [formData.course]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate file types
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const validFiles = files.filter(file => 
      allowedTypes.includes(file.type) || 
      file.name.toLowerCase().endsWith('.pdf') ||
      file.name.toLowerCase().endsWith('.ppt') ||
      file.name.toLowerCase().endsWith('.pptx') ||
      file.name.toLowerCase().endsWith('.doc') ||
      file.name.toLowerCase().endsWith('.docx')
    );
    
    if (validFiles.length !== files.length) {
      setError('Some files were rejected. Please upload only PDF, PowerPoint, or Word documents.');
    }
    
    setSelectedFiles(validFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.course || !formData.topic || selectedFiles.length === 0) {
      setError('Please fill in all fields and select at least one file');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('course_id', formData.course);
      uploadFormData.append('topic_id', formData.topic);
      uploadFormData.append('title', formData.title);
      uploadFormData.append('description', formData.description);
      
      selectedFiles.forEach((file) => {
        uploadFormData.append('slides', file);
      });
      
      // TODO: Replace with actual API call
      // const response = await uploadSlides(uploadFormData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess(`Successfully uploaded ${selectedFiles.length} slide(s). AI quiz generation started!`);
      
      // Reset form
      setFormData({
        course: '',
        topic: '',
        title: '',
        description: ''
      });
      setSelectedFiles([]);
      
      // Reset file input
      const fileInput = document.getElementById('slide-files');
      if (fileInput) fileInput.value = '';
      
    } catch (err) {
      setError('Failed to upload slides. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="slides-container">
      <h2>Upload Slides for AI Quiz Generation</h2>
      
      <div className="slides-form-section">
        <form onSubmit={handleSubmit} className="slides-form">
          <div className="form-row">
            <div className="slides-field">
              <label>Select Course *</label>
              <select
                name="course"
                value={formData.course}
                onChange={handleInputChange}
                required
              >
                <option value="">Choose a course...</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="slides-field">
              <label>Select Topic *</label>
              <select
                name="topic"
                value={formData.topic}
                onChange={handleInputChange}
                required
                disabled={!formData.course}
              >
                <option value="">Choose a topic...</option>
                {topics.map(topic => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* File Upload */}
          <div className="form-group">
            <label htmlFor="slide-files">Upload Slides *</label>
            <div className="file-upload-area">
              <input
                type="file"
                id="slide-files"
                multiple
                accept=".pdf,.ppt,.pptx,.doc,.docx"
                onChange={handleFileChange}
                required
                className="file-input"
              />
              <div className="upload-prompt">
                <div className="upload-icon">📁</div>
                <div className="upload-text">
                  <p>Click to browse or drag files here</p>
                  <small>PDF, PowerPoint (.ppt, .pptx), Word (.doc, .docx)</small>
                </div>
              </div>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="selected-files">
              <h4>Selected Files ({selectedFiles.length})</h4>
              <div className="file-list">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="file-item">
                    <div className="file-icon">
                      {file.name.endsWith('.pdf') ? '📄' : 
                       file.name.endsWith('.ppt') || file.name.endsWith('.pptx') ? '📊' : '📝'}
                    </div>
                    <div className="file-details">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="remove-file-btn"
                      title="Remove file"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="submit"
              className="submit-btn"
              disabled={loading || !formData.course || !formData.topic || selectedFiles.length === 0}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Processing...
                </>
              ) : (
                <>
                  <span className="btn-icon">🚀</span>
                  Generate AI Quizzes
                </>
              )}
            </button>
          </div>
        </form>

      
        
      </div>
    </div>
  );
};

export default UploadSlides;