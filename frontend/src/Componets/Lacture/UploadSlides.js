import { useState, useEffect } from 'react';
import { getMyCourses, listTopics } from '../../api/courses'; // Fixed: was myCourses
import { uploadLectureSlide, generateQuestions } from '../../api/ai-quiz'; // Fixed: was from analytics
import './UploadSlides.css';

const UploadSlides = ({ onSlideUploaded, loading: externalLoading }) => {
  const [courses, setCourses] = useState([]);
  const [allTopics, setAllTopics] = useState([]);
  const [filteredTopics, setFilteredTopics] = useState([]);
  const [formData, setFormData] = useState({
    course: '',
    topic: '',
    title: '',
    description: ''
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Load courses and topics on component mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Filter topics when course is selected
  useEffect(() => {
    if (formData.course) {
      const courseTopics = allTopics.filter(topic => topic.course === parseInt(formData.course));
      setFilteredTopics(courseTopics);
      setFormData(prev => ({ ...prev, topic: '' })); // Reset topic selection
    } else {
      setFilteredTopics([]);
    }
  }, [formData.course, allTopics]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load courses and topics in parallel - using correct API calls
      const [coursesResponse, topicsResponse] = await Promise.all([
        getMyCourses(), // Fixed: was myCourses()
        listTopics()
      ]);

      // Handle courses data - getMyCourses returns direct array
      let coursesData = [];
      if (Array.isArray(coursesResponse.data)) {
        coursesData = coursesResponse.data;
      } else if (coursesResponse.data?.results && Array.isArray(coursesResponse.data.results)) {
        coursesData = coursesResponse.data.results;
      }
      setCourses(coursesData);

      // Handle topics data
      let topicsData = [];
      if (Array.isArray(topicsResponse.data)) {
        topicsData = topicsResponse.data;
      } else if (Array.isArray(topicsResponse.data?.results)) {
        topicsData = topicsResponse.data.results;
      }
      setAllTopics(topicsData);

      if (coursesData.length === 0) {
        setError('No courses available. Please create a course first.');
      } else if (topicsData.length === 0) {
        setError('No topics available. Please create topics first.');
      }

    } catch (err) {
      console.error('Error loading initial data:', err);
      let errorMessage = 'Failed to load courses and topics';
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
    
    const validFiles = files.filter(file => {
      const isValidType = allowedTypes.includes(file.type);
      const hasValidExtension = ['.pdf', '.ppt', '.pptx', '.doc', '.docx']
        .some(ext => file.name.toLowerCase().endsWith(ext));
      
      // Check file size (limit to 10MB per file)
      const isValidSize = file.size <= 10 * 1024 * 1024;
      
      return (isValidType || hasValidExtension) && isValidSize;
    });
    
    if (validFiles.length !== files.length) {
      setError('Some files were rejected. Please upload only PDF, PowerPoint, or Word documents under 10MB each.');
    }
    
    setSelectedFiles(validFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.course || !formData.topic || selectedFiles.length === 0) {
      setError('Please fill in all required fields and select at least one file');
      return;
    }

    if (!formData.title.trim()) {
      setError('Please enter a title for your slides');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    setUploadProgress({});
    
    try {
      const uploadedSlides = [];
      
      // Upload each file individually
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileKey = `file_${i}`;
        
        setUploadProgress(prev => ({
          ...prev,
          [fileKey]: { status: 'uploading', progress: 0 }
        }));

        // Prepare FormData for this file
        const uploadFormData = new FormData();
        uploadFormData.append('topic_id', formData.topic);
        uploadFormData.append('title', `${formData.title} - ${file.name}`);
        uploadFormData.append('slide_file', file);

        try {
          // Upload slide using the correct AI quiz API
          const slideResponse = await uploadLectureSlide(uploadFormData);
          console.log('Slide uploaded:', slideResponse.data);

          setUploadProgress(prev => ({
            ...prev,
            [fileKey]: { status: 'generating', progress: 50 }
          }));

          // Generate questions for the uploaded slide
          const questionsResponse = await generateQuestions({
            lecture_slide_id: slideResponse.data.id
          });
          console.log('Questions generated:', questionsResponse.data);

          setUploadProgress(prev => ({
            ...prev,
            [fileKey]: { status: 'completed', progress: 100 }
          }));

          uploadedSlides.push({
            slide: slideResponse.data,
            questions: questionsResponse.data,
            file_name: file.name
          });

        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          
          setUploadProgress(prev => ({
            ...prev,
            [fileKey]: { status: 'error', progress: 0 }
          }));

          // Continue with other files but log the error
          let errorMsg = `Failed to process ${file.name}`;
          if (fileError.response?.data) {
            const data = fileError.response.data;
            if (typeof data === 'string') {
              errorMsg = `${file.name}: ${data}`;
            } else if (data.detail) {
              errorMsg = `${file.name}: ${data.detail}`;
            } else if (data.message) {
              errorMsg = `${file.name}: ${data.message}`;
            } else if (data.error) {
              errorMsg = `${file.name}: ${data.error}`;
            }
          }
          
          setError(prev => prev ? `${prev}\n${errorMsg}` : errorMsg);
        }
      }

      if (uploadedSlides.length > 0) {
        const courseName = courses.find(c => c.id === parseInt(formData.course))?.code || 'selected course';
        const topicName = filteredTopics.find(t => t.id === parseInt(formData.topic))?.name || 'selected topic';
        
        const successMsg = `Successfully uploaded ${uploadedSlides.length} slide(s) for ${courseName} - ${topicName} and generated AI quizzes! Students can now access these adaptive quizzes.`;
        setSuccess(successMsg);
        
        // Reset form
        setFormData({
          course: '',
          topic: '',
          title: '',
          description: ''
        });
        setSelectedFiles([]);
        setUploadProgress({});
        
        // Reset file input
        const fileInput = document.getElementById('slide-files');
        if (fileInput) fileInput.value = '';

        // Call parent callback if provided
        if (onSlideUploaded) {
          await onSlideUploaded(uploadedSlides);
        }
      } else {
        throw new Error('No files were successfully processed');
      }
      
    } catch (err) {
      console.error('Upload error:', err);
      
      let errorMessage = 'Failed to upload slides and generate quizzes';
      if (err.message && !err.response) {
        errorMessage = err.message;
      } else if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf': return '📄';
      case 'ppt':
      case 'pptx': return '📊';
      case 'doc':
      case 'docx': return '📝';
      default: return '📄';
    }
  };

  const getProgressColor = (status) => {
    switch (status) {
      case 'uploading': return '#1565D8';
      case 'generating': return '#FF9800';
      case 'completed': return '#4CAF50';
      case 'error': return '#F44336';
      default: return '#E0E0E0';
    }
  };

  const getProgressText = (status) => {
    switch (status) {
      case 'uploading': return 'Uploading slide...';
      case 'generating': return 'Generating AI quiz questions...';
      case 'completed': return 'Complete! Quiz available for students';
      case 'error': return 'Error occurred';
      default: return 'Waiting...';
    }
  };

  const isFormDisabled = loading || externalLoading;

  return (
    <div className="slides-container">
      <h2>Upload Slides for AI Quiz Generation</h2>
      <p className="slides-description">
        Upload your lecture slides and our AI will automatically generate adaptive quizzes for students based on the content. 
        These quizzes will be immediately available to students in their dashboard.
      </p>
      
      <div className="slides-form-section">
        <form onSubmit={handleSubmit} className="slides-form">
          {/* Course and Topic Selection */}
          <div className="form-row">
            <div className="slides-field">
              <label htmlFor="course-select">Select Course *</label>
              <select
                id="course-select"
                name="course"
                value={formData.course}
                onChange={handleInputChange}
                required
                disabled={isFormDisabled}
              >
                <option value="">Choose a course...</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="slides-field">
              <label htmlFor="topic-select">Select Topic *</label>
              <select
                id="topic-select"
                name="topic"
                value={formData.topic}
                onChange={handleInputChange}
                required
                disabled={isFormDisabled || !formData.course}
              >
                <option value="">
                  {!formData.course 
                    ? 'Select a course first' 
                    : filteredTopics.length === 0 
                      ? 'No topics available for this course' 
                      : 'Choose a topic...'
                  }
                </option>
                {filteredTopics.map(topic => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title and Description */}
          <div className="form-row">
            <div className="slides-field">
              <label htmlFor="slide-title">Slide Title *</label>
              <input
                id="slide-title"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Week 1 - Introduction to Programming"
                required
                disabled={isFormDisabled}
              />
            </div>

            <div className="slides-field">
              <label htmlFor="slide-description">Description (Optional)</label>
              <input
                id="slide-description"
                type="text"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Brief description of the slides content"
                disabled={isFormDisabled}
              />
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
                disabled={isFormDisabled}
              />
              <div className="upload-prompt">
                <div className="upload-icon">📁</div>
                <div className="upload-text">
                  <p>Click to browse or drag files here</p>
                  <small>PDF, PowerPoint (.ppt, .pptx), Word (.doc, .docx) - Max 10MB each</small>
                </div>
              </div>
            </div>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="selected-files">
              <h4>Selected Files ({selectedFiles.length})</h4>
              <div className="file-list">
                {selectedFiles.map((file, index) => {
                  const fileKey = `file_${index}`;
                  const progress = uploadProgress[fileKey];
                  
                  return (
                    <div key={index} className="file-item">
                      <div className="file-icon">
                        {getFileIcon(file.name)}
                      </div>
                      <div className="file-details">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        
                        {progress && (
                          <div className="file-progress">
                            <div className="progress-bar">
                              <div 
                                className="progress-fill" 
                                style={{ 
                                  width: `${progress.progress}%`,
                                  backgroundColor: getProgressColor(progress.status)
                                }}
                              ></div>
                            </div>
                            <span className="progress-text">
                              {getProgressText(progress.status)}
                            </span>
                          </div>
                        )}
                      </div>
                      {!loading && (
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="remove-file-btn"
                          title="Remove file"
                          disabled={isFormDisabled}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="error-message" role="alert">
              {error.split('\n').map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </div>
          )}
          
          {success && (
            <div className="success-message" role="alert">
              {success}
            </div>
          )}

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="submit"
              className={`submit-btn ${loading ? 'loading' : ''}`}
              disabled={isFormDisabled || !formData.course || !formData.topic || !formData.title.trim() || selectedFiles.length === 0}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Processing Slides & Generating Quizzes...
                </>
              ) : (
                <>
                  <span className="btn-icon">🚀</span>
                  Upload & Generate AI Quizzes for Students
                </>
              )}
            </button>
          </div>

          {/* Info Box */}
          <div className="info-box" style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: '#E3F2FD',
            border: '1px solid #1976D2',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#1976D2' }}>How it works:</h4>
            <ul style={{ margin: '0', paddingLeft: '20px', color: '#1565C0' }}>
              <li>Upload your lecture slides (PDF, PowerPoint, or Word documents)</li>
              <li>AI analyzes the content and generates adaptive quiz questions</li>
              <li>Students can immediately access these quizzes in their dashboard</li>
              <li>Quiz difficulty adapts based on student performance</li>
              <li>Track student progress through the analytics dashboard</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadSlides;