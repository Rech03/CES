import { useState, useEffect } from 'react';

const LiveQnALectures = ({ topic, course, onBackToTopics, onStartSession }) => {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    lecture_id: null
  });

  useEffect(() => {
    const loadLectures = async () => {
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const dummyLectures = [
        {
          id: 1,
          title: 'Introduction to Design Patterns',
          description: 'Overview of GoF patterns and their classifications',
          date: '2025-01-15',
          duration: 90,
          attendance_count: 78,
          active_sessions: 0,
          recent_sessions: 3,
          last_qna: '2 days ago'
        },
        {
          id: 2,
          title: 'Creational Patterns',
          description: 'Factory, Builder, Singleton, and Prototype patterns',
          date: '2025-01-17',
          duration: 120,
          attendance_count: 82,
          active_sessions: 1,
          recent_sessions: 5,
          last_qna: '1 hour ago'
        },
        {
          id: 3,
          title: 'Structural Patterns',
          description: 'Adapter, Bridge, Composite, and Facade patterns',
          date: '2025-01-22',
          duration: 105,
          attendance_count: 75,
          active_sessions: 0,
          recent_sessions: 2,
          last_qna: '1 week ago'
        },
        {
          id: 4,
          title: 'Behavioral Patterns - Part 1',
          description: 'Observer, Strategy, Command, and State patterns',
          date: '2025-01-24',
          duration: 110,
          attendance_count: 80,
          active_sessions: 0,
          recent_sessions: 4,
          last_qna: '3 days ago'
        }
      ];
      
      setLectures(dummyLectures);
      setLoading(false);
    };

    loadLectures();
  }, [topic.id]);

  const handleCreateSession = () => {
    if (!newSession.title.trim() || !newSession.lecture_id) return;
    
    const sessionData = {
      ...newSession,
      topic_id: topic.id,
      course_id: course.id,
      session_code: generateSessionCode()
    };

    console.log('Creating session:', sessionData);
    
    setLectures(prev => prev.map(lecture => 
      lecture.id === newSession.lecture_id 
        ? { ...lecture, active_sessions: lecture.active_sessions + 1 }
        : lecture
    ));
    
    setShowCreateModal(false);
    setNewSession({ title: '', description: '', lecture_id: null });
    
    if (onStartSession) {
      onStartSession(sessionData);
    }
  };

  const handleQuickStart = (lectureId, lectureTitle) => {
    const quickSession = {
      lecture_id: lectureId,
      title: `Live Q&A - ${lectureTitle}`,
      description: 'Quick Q&A session for today\'s lecture',
      topic_id: topic.id,
      course_id: course.id,
      session_code: generateSessionCode()
    };
    
    console.log('Starting quick session:', quickSession);
    
    setLectures(prev => prev.map(lecture => 
      lecture.id === lectureId 
        ? { ...lecture, active_sessions: lecture.active_sessions + 1 }
        : lecture
    ));

    if (onStartSession) {
      onStartSession(quickSession);
    }
  };

  const generateSessionCode = () => {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
  };

  if (loading) {
    return (
      <div className="qna-loading">
        <div className="loading-spinner"></div>
        <p>Loading lectures...</p>
      </div>
    );
  }

  return (
    <div className="live-qna-container">
      <div className="breadcrumb">
        <span onClick={() => console.log('Navigate to courses')} className="breadcrumb-link">
          Live Q&A
        </span>
        <span className="breadcrumb-separator">{'>'}</span>
        <span onClick={onBackToTopics} className="breadcrumb-link">
          {course.code}
        </span>
        <span className="breadcrumb-separator">{'>'}</span>
        <span>{topic.name}</span>
      </div>

      <div className="qna-header">
        <div className="header-content">
          <h1>{topic.name} - Lectures</h1>
          <p>Create interactive Q&A sessions for your lectures</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="create-session-btn"
        >
          + Create Q&A Session
        </button>
      </div>

      <div className="qna-lectures-grid">
        {lectures.map(lecture => (
          <div key={lecture.id} className="qna-lecture-card">
            {lecture.active_sessions > 0 && (
              <div className="live-indicator">
                <div className="pulse-dot"></div>
                {lecture.active_sessions} Live
              </div>
            )}

            <div className="lecture-title">
              {lecture.title}
            </div>

            <div className="lecture-description">
              {lecture.description}
            </div>

            <div className="lecture-details">
              <div className="detail-item">
                <span className="detail-icon">📅</span>
                <span>{new Date(lecture.date).toLocaleDateString()}</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon">⏱️</span>
                <span>{lecture.duration} min</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon">👥</span>
                <span>{lecture.attendance_count} attended</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon">💬</span>
                <span>{lecture.recent_sessions} Q&A sessions</span>
              </div>
            </div>

            <div className="lecture-actions">
              <button
                onClick={() => handleQuickStart(lecture.id, lecture.title)}
                className="quick-start-btn"
              >
                Quick Start
              </button>
              <button
                onClick={() => {
                  setNewSession(prev => ({ ...prev, lecture_id: lecture.id }));
                  setShowCreateModal(true);
                }}
                className="custom-setup-btn"
              >
                Custom Setup
              </button>
            </div>

            {lecture.last_qna && (
              <div className="last-qna">
                Last Q&A: {lecture.last_qna}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Create Q&A Session</h2>
            <p>Set up an interactive Q&A session for your students</p>

            <div className="form-group">
              <label>Session Title *</label>
              <input
                type="text"
                value={newSession.title}
                onChange={(e) => setNewSession(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Live Q&A - Design Patterns Discussion"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Associated Lecture *</label>
              <select
                value={newSession.lecture_id || ''}
                onChange={(e) => setNewSession(prev => ({ ...prev, lecture_id: parseInt(e.target.value) }))}
                className="form-select"
              >
                <option value="">Select a lecture...</option>
                {lectures.map(lecture => (
                  <option key={lecture.id} value={lecture.id}>
                    {lecture.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Description (Optional)</label>
              <textarea
                value={newSession.description}
                onChange={(e) => setNewSession(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of what this Q&A session will cover..."
                className="form-textarea"
              />
            </div>

            <div className="modal-actions">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewSession({ title: '', description: '', lecture_id: null });
                }}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSession}
                disabled={!newSession.title.trim() || !newSession.lecture_id}
                className="create-btn"
              >
                Create & Start Session
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .live-qna-container {
          font-family: 'Poppins', sans-serif;
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
          font-size: 14px;
          color: #666;
        }

        .breadcrumb-link {
          color: #1935CA;
          cursor: pointer;
          text-decoration: underline;
        }

        .breadcrumb-separator {
          color: #9CA3AF;
        }

        .qna-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .header-content h1 {
          font-size: 28px;
          font-weight: 600;
          color: #333;
          margin: 0 0 8px 0;
        }

        .header-content p {
          font-size: 16px;
          color: #666;
          margin: 0;
        }

        .create-session-btn {
          background: #10B981;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background-color 0.2s ease;
        }

        .create-session-btn:hover {
          background: #059669;
        }

        .qna-lectures-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 20px;
        }

        .qna-lecture-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          border: 1px solid #E5E7EB;
          transition: all 0.2s ease;
          position: relative;
        }

        .live-indicator {
          position: absolute;
          top: 16px;
          right: 16px;
          background: #10B981;
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: white;
          animation: pulse 2s infinite;
        }

        .lecture-title {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
          line-height: 1.3;
          padding-right: 60px;
        }

        .lecture-description {
          font-size: 14px;
          color: #666;
          margin-bottom: 16px;
          line-height: 1.4;
        }

        .lecture-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #666;
        }

        .lecture-actions {
          display: flex;
          gap: 12px;
          padding-top: 12px;
          border-top: 1px solid #F3F4F6;
          margin-bottom: 8px;
        }

        .quick-start-btn {
          flex: 1;
          background: #1935CA;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .quick-start-btn:hover {
          background: #1e40af;
        }

        .custom-setup-btn {
          background: transparent;
          color: #1935CA;
          border: 1px solid #1935CA;
          padding: 10px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .custom-setup-btn:hover {
          background: #1935CA;
          color: white;
        }

        .last-qna {
          font-size: 12px;
          color: #9CA3AF;
          text-align: center;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 32px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .modal-content h2 {
          font-size: 24px;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
        }

        .modal-content p {
          font-size: 14px;
          color: #666;
          margin-bottom: 24px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
        }

        .form-input, .form-select, .form-textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #E5E7EB;
          border-radius: 6px;
          font-size: 16px;
          font-family: 'Poppins', sans-serif;
          outline: none;
          transition: border-color 0.2s ease;
        }

        .form-input:focus, .form-select:focus, .form-textarea:focus {
          border-color: #1935CA;
        }

        .form-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .cancel-btn {
          background: transparent;
          color: #6B7280;
          border: 1px solid #D1D5DB;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }

        .create-btn {
          background: #10B981;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }

        .create-btn:disabled {
          background: #D1D5DB;
          cursor: not-allowed;
        }

        .qna-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #666;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #1935CA;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 768px) {
          .qna-lectures-grid {
            grid-template-columns: 1fr;
          }
          
          .qna-header {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default LiveQnALectures;