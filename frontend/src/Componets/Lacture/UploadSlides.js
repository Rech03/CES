// src/Componets/Lacture/UploadSlides.js
import { useState, useEffect } from 'react';
import { getMyCourses, listTopics } from '../../api/courses';
import { uploadLectureSlide, generateQuestions } from '../../api/ai-quiz';
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

  // Normalize any server shape to a clean array (my-courses may return {courses:[...]})
  const normalizeCourses = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.courses)) return data.courses;
    if (data && Array.isArray(data.results)) return data.results;
    if (data && typeof data === 'object') {
      const key = Object.keys(data).find((k) => Array.isArray(data[k]));
      if (key) return data[key];
    }
    return [];
  };

  const normalizeTopics = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  };

  useEffect(() => { loadInitialData(); }, []);

  useEffect(() => {
    if (formData.course) {
      const courseId = parseInt(formData.course, 10);
      const courseTopics = allTopics.filter(t => (t.course === courseId) || (t.course_id === courseId) || (t.course?.id === courseId));
      setFilteredTopics(courseTopics);
      setFormData(prev => ({ ...prev, topic: '' }));
    } else {
      setFilteredTopics([]);
    }
  }, [formData.course, allTopics]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');
      const [coursesResp, topicsResp] = await Promise.all([
        getMyCourses(),           // courses/my-courses/
        listTopics()              // courses/topics/
      ]);

      const coursesData = normalizeCourses(coursesResp?.data);
      const topicsData  = normalizeTopics(topicsResp?.data);

      setCourses(coursesData);
      setAllTopics(topicsData);

      if (!coursesData.length) setError('No courses available. Please create a course first.');
      else if (!topicsData.length) setError('No topics available. Please create topics first.');
    } catch (err) {
      console.error('Error loading courses/topics:', err);
      const d = err.response?.data;
      const msg = typeof d === 'string' ? d : (d?.detail || d?.message || d?.error || 'Failed to load courses and topics');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const validFiles = files.filter(file => {
      const typeOK = allowedTypes.includes(file.type);
      const extOK = ['.pdf', '.ppt', '.pptx', '.doc', '.docx'].some(ext => file.name.toLowerCase().endsWith(ext));
      const sizeOK = file.size <= 10 * 1024 * 1024;
      return (typeOK || extOK) && sizeOK;
    });
    if (validFiles.length !== files.length) {
      setError('Some files were rejected. Upload PDF, PPT/PPTX, or DOC/DOCX under 10MB each.');
    }
    setSelectedFiles(validFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.course || !formData.topic || selectedFiles.length === 0) {
      setError('Please select course, topic, and at least one file.');
      return;
    }
    if (!formData.title.trim()) {
      setError('Please enter a title.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setUploadProgress({});

    try {
      const uploadedSlides = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileKey = `file_${i}`;
        setUploadProgress(prev => ({ ...prev, [fileKey]: { status: 'uploading', progress: 0 } }));

        const fd = new FormData();
        fd.append('topic_id', formData.topic);
        fd.append('title', `${formData.title} - ${file.name}`);
        fd.append('slide_file', file);

        try {
          // 1) Upload the slide (lecturer/upload-slide/)
          const slideRes = await uploadLectureSlide(fd);
          setUploadProgress(prev => ({ ...prev, [fileKey]: { status: 'generating', progress: 50 } }));

          // 2) Generate questions for that slide (lecturer/generate-questions/)
          const qRes = await generateQuestions({ lecture_slide_id: slideRes.data.id });
          setUploadProgress(prev => ({ ...prev, [fileKey]: { status: 'completed', progress: 100 } }));

          uploadedSlides.push({
            slide: slideRes.data,
            questions: qRes.data,
            file_name: file.name
          });
        } catch (fileErr) {
          console.error(`Error processing ${file.name}:`, fileErr);
          setUploadProgress(prev => ({ ...prev, [fileKey]: { status: 'error', progress: 0 } }));

          let msg = `Failed to process ${file.name}`;
          const d = fileErr.response?.data;
          if (typeof d === 'string') msg = `${file.name}: ${d}`;
          else if (d?.detail) msg = `${file.name}: ${d.detail}`;
          else if (d?.message) msg = `${file.name}: ${d.message}`;
          else if (d?.error) msg = `${file.name}: ${d.error}`;
          setError(prev => prev ? `${prev}\n${msg}` : msg);
        }
      }

      if (uploadedSlides.length) {
        const courseCode = courses.find(c => c.id === parseInt(formData.course, 10))?.code || 'course';
        const topicName  = filteredTopics.find(t => t.id === parseInt(formData.topic, 10))?.name || 'topic';
        setSuccess(
          `Uploaded ${uploadedSlides.length} slide(s) for ${courseCode} – ${topicName}.\n` +
          `AI quizzes created in DRAFT. Review & EDIT from the Dashboard, then PUBLISH to make them live to students.`
        );

        // Reset
        setFormData({ course: '', topic: '', title: '', description: '' });
        setSelectedFiles([]);
        setUploadProgress({});
        const fileInput = document.getElementById('slide-files');
        if (fileInput) fileInput.value = '';

        if (onSlideUploaded) await onSlideUploaded(uploadedSlides);
      } else {
        throw new Error('No files were successfully processed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      const d = err.response?.data;
      const msg = typeof d === 'string' ? d : (d?.detail || d?.message || d?.error || err.message || 'Failed to upload slides and generate quizzes');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const fileIcon = (name) => {
    const ext = name.toLowerCase().split('.').pop();
    if (ext === 'pdf') return '📄';
    if (ext === 'ppt' || ext === 'pptx') return '📊';
    if (ext === 'doc' || ext === 'docx') return '📝';
    return '📄';
  };

  const statusColor = (s) => ({ uploading:'#1565D8', generating:'#FF9800', completed:'#4CAF50', error:'#F44336' }[s] || '#E0E0E0');
  const statusText  = (s) => ({ uploading:'Uploading slide...', generating:'Generating AI questions...', completed:'Complete! Review on Dashboard', error:'Error occurred' }[s] || 'Waiting...');

  const isFormDisabled = loading || externalLoading;

  return (
    <div className="slides-container">
      <h2>Upload Slides for AI Quiz Generation</h2>
      <p className="slides-description">
        Upload slides for a <strong>course</strong> and <strong>topic</strong>. The AI creates draft quizzes (with levels).
        Review & edit on the Dashboard, then publish to make them live to students.
      </p>

      <div className="slides-form-section">
        <form onSubmit={handleSubmit} className="slides-form">
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
                {courses.map(c => (<option key={c.id} value={c.id}>{c.code} - {c.name}</option>))}
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
                    : (filteredTopics.length ? 'Choose a topic...' : 'No topics for this course')}
                </option>
                {filteredTopics.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="slides-field">
              <label htmlFor="slide-title">Slide Title *</label>
              <input
                id="slide-title"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Week 1 – Intro to Functions"
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
                placeholder="Brief description"
                disabled={isFormDisabled}
              />
            </div>
          </div>

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
                  <small>PDF, PPT/PPTX, DOC/DOCX – Max 10MB each</small>
                </div>
              </div>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="selected-files">
              <h4>Selected Files ({selectedFiles.length})</h4>
              <div className="file-list">
                {selectedFiles.map((file, index) => {
                  const k = `file_${index}`;
                  const prog = uploadProgress[k];
                  return (
                    <div key={index} className="file-item">
                      <div className="file-icon">{fileIcon(file.name)}</div>
                      <div className="file-details">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        {prog && (
                          <div className="file-progress">
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${prog.progress}%`, backgroundColor: statusColor(prog.status) }} />
                            </div>
                            <span className="progress-text">{statusText(prog.status)}</span>
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

          {error && <div className="error-message" role="alert">{error.split('\n').map((l,i)=><div key={i}>{l}</div>)}</div>}
          {success && <div className="success-message" role="alert">{success}</div>}

          <div className="form-actions">
            <button
              type="submit"
              className={`submit-btn ${loading ? 'loading' : ''}`}
              disabled={isFormDisabled || !formData.course || !formData.topic || !formData.title.trim() || !selectedFiles.length}
            >
              {loading ? (<><span className="loading-spinner"></span>Processing Slides & Generating Quizzes...</>) : (<><span className="btn-icon">🚀</span>Upload & Generate AI Quizzes</>)}
            </button>
          </div>

          <div className="info-box" style={{ marginTop:'20px', padding:'16px', background:'#E3F2FD', border:'1px solid #1976D2', borderRadius:'8px', fontSize:'14px' }}>
            <h4 style={{ margin:'0 0 8px 0', color:'#1976D2' }}>How it works:</h4>
            <ul style={{ margin:0, paddingLeft:'20px', color:'#1565C0' }}>
              <li>Upload slides for a <strong>course</strong> and <strong>topic</strong></li>
              <li>AI analyzes and creates <strong>difficulty levels</strong> (e.g., Easy/Medium/Hard)</li>
              <li>Quizzes appear on your <strong>Dashboard as tiles</strong> (Draft)</li>
              <li><strong>Edit</strong> questions, then <strong>Publish</strong> to make live for students</li>
              <li>You can <strong>Delete</strong> a draft or closed quiz</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadSlides;
