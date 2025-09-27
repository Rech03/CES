import { useState, useEffect } from 'react';
import { 
  getLecturerCourses,
  createLiveSession, 
  endSession, 
  getSessionMessages,
  getLecturerSessions
} from '../../api/live-qna';

// Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: { bg: '#10B981', icon: '✓' },
    error: { bg: '#EF4444', icon: '✕' },
    info: { bg: '#1d4ed8', icon: 'ℹ' }
  };

  const color = colors[type] || colors.info;

  return (
    <div style={{
      position: 'fixed', top: '20px', right: '20px',
      background: color.bg, color: 'white',
      padding: '16px 24px', borderRadius: '12px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', gap: '12px',
      zIndex: 10000, animation: 'slideIn 0.3s ease-out',
      fontFamily: 'Poppins, sans-serif', maxWidth: '400px'
    }}>
      <div style={{
        width: '24px', height: '24px',
        background: 'rgba(255,255,255,0.2)',
        borderRadius: '50%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontWeight: 'bold'
      }}>{color.icon}</div>
      <div style={{ flex: 1, fontSize: '14px' }}>{message}</div>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', color: 'white',
        cursor: 'pointer', fontSize: '20px', padding: 0, opacity: 0.8
      }}>×</button>
    </div>
  );
};

// Mentimeter-Style Presentation
const MentimeterPresentation = ({ session, onEndSession }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [showCodeModal, setShowCodeModal] = useState(false);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const sessionId = session.id || session.session_id;
        
        if (!sessionId) {
          console.error('No session ID available:', session);
          return;
        }
        
        const response = await getSessionMessages(sessionId);
        const messagesArray = response.data.messages || response.data || [];
        
        const sortedQuestions = [...messagesArray].sort((a, b) => 
          (b.likes || 0) - (a.likes || 0)
        );
        setQuestions(sortedQuestions);
      } catch (err) {
        console.error('Error fetching messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [session]);

  const handleEndSession = async () => {
    if (!window.confirm('End this live session?')) return;
    try {
      const sessionId = session.id || session.session_id;
      await endSession(sessionId);
      onEndSession();
    } catch (err) {
      console.error('Error ending session:', err);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Fullscreen Presentation Mode
  if (viewMode === 'fullscreen' && questions[currentQuestionIndex]) {
    const currentQ = questions[currentQuestionIndex];
    const displayCode = session.code || session.session_code || 'N/A';
    
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        display: 'flex', flexDirection: 'column', color: 'white',
        fontFamily: 'Poppins, sans-serif',
        zIndex: 9999
      }}>
        <div style={{
          padding: '20px 40px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(0,0,0,0.2)'
        }}>
          <div style={{ fontSize: '18px', fontWeight: '600' }}>
            {session.title}
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div onClick={() => setShowCodeModal(true)} style={{ 
              background: 'rgba(255,255,255,0.2)', 
              padding: '8px 16px', borderRadius: '8px',
              fontSize: '14px', cursor: 'pointer'
            }}>
              Code: <strong>{displayCode}</strong>
            </div>
            <button onClick={() => setViewMode('grid')} style={{
              background: 'rgba(255,255,255,0.2)', color: 'white',
              border: 'none', padding: '8px 16px', borderRadius: '8px',
              cursor: 'pointer', fontSize: '14px'
            }}>
              Grid View
            </button>
            <button onClick={handleEndSession} style={{
              background: '#EF4444', color: 'white', border: 'none',
              padding: '8px 16px', borderRadius: '8px',
              cursor: 'pointer', fontSize: '14px'
            }}>
              End Session
            </button>
          </div>
        </div>

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center', padding: '40px'
        }}>
          <div style={{
            fontSize: '48px', fontWeight: '600', textAlign: 'center',
            maxWidth: '900px', lineHeight: '1.3', marginBottom: '40px',
            animation: 'fadeIn 0.5s ease'
          }}>
            {currentQ.text || currentQ.message_text || currentQ.message || 'No message'}
          </div>

          <div style={{
            display: 'flex', gap: '32px', fontSize: '20px', opacity: 0.9
          }}>
            <div>{currentQ.is_anonymous ? 'Anonymous' : currentQ.student_name}</div>
            <div>•</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              👍 {currentQ.likes || 0}
            </div>
          </div>
        </div>

        <div style={{
          padding: '20px 40px', display: 'flex',
          justifyContent: 'center', alignItems: 'center', gap: '20px',
          background: 'rgba(0,0,0,0.2)'
        }}>
          <button onClick={prevQuestion} disabled={currentQuestionIndex === 0} style={{
            background: 'rgba(255,255,255,0.2)', color: 'white',
            border: 'none', padding: '12px 24px', borderRadius: '8px',
            cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
            fontSize: '16px', opacity: currentQuestionIndex === 0 ? 0.5 : 1
          }}>
            ← Previous
          </button>

          <div style={{ fontSize: '16px' }}>
            {currentQuestionIndex + 1} / {questions.length}
          </div>

          <button onClick={nextQuestion} disabled={currentQuestionIndex === questions.length - 1} style={{
            background: 'rgba(255,255,255,0.2)', color: 'white',
            border: 'none', padding: '12px 24px', borderRadius: '8px',
            cursor: currentQuestionIndex === questions.length - 1 ? 'not-allowed' : 'pointer',
            fontSize: '16px', opacity: currentQuestionIndex === questions.length - 1 ? 0.5 : 1
          }}>
            Next →
          </button>
        </div>

        {showCodeModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 10000
          }} onClick={() => setShowCodeModal(false)}>
            <div style={{
              background: 'white', padding: '48px', borderRadius: '24px',
              textAlign: 'center', maxWidth: '500px'
            }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '16px', color: '#333' }}>
                Students Join With:
              </h2>
              <div style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                color: 'white', padding: '32px', borderRadius: '16px',
                fontSize: '72px', fontWeight: 'bold', letterSpacing: '8px',
                marginBottom: '24px'
              }}>
                {session.code}
              </div>
              <button onClick={() => setShowCodeModal(false)} style={{
                background: '#10B981', color: 'white', border: 'none',
                padding: '12px 32px', borderRadius: '8px',
                fontSize: '16px', fontWeight: '600', cursor: 'pointer'
              }}>
                Close
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // Grid View
  const displayCode = session.code || session.session_code || 'N/A';
  
  return (
    <div style={{
      background: '#f8fafc', minHeight: '100vh',
      fontFamily: 'Poppins, sans-serif'
    }}>
      <div style={{
        background: 'white', padding: '20px 40px',
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '600' }}>
            {session.title}
          </h1>
          <div style={{ color: '#6b7280', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div>
              Session Code: <strong style={{ color: '#1935CA' }}>{displayCode}</strong> • {questions.length} Questions
            </div>
            <button onClick={() => setShowCodeModal(true)} style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
              color: 'white', border: 'none', padding: '6px 16px',
              borderRadius: '6px', fontSize: '12px', fontWeight: '600',
              cursor: 'pointer'
            }}>
              📱 Show Code for Students
            </button>
          </div>
        </div>
        <button onClick={handleEndSession} style={{
          background: '#EF4444', color: 'white', border: 'none',
          padding: '10px 20px', borderRadius: '8px',
          cursor: 'pointer', fontSize: '14px', fontWeight: '600'
        }}>
          End Session
        </button>
      </div>

      <div style={{ padding: '40px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <div style={{
              width: '50px', height: '50px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #1935CA',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          </div>
        ) : questions.length === 0 ? (
          <div style={{ 
            textAlign: 'center', padding: '80px 20px',
            color: '#6b7280', background: 'white',
            borderRadius: '16px', border: '2px dashed #d1d5db'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>💬</div>
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
              Waiting for questions...
            </h2>
            <p style={{ fontSize: '18px', margin: '0 0 16px 0', fontWeight: '600', color: '#1935CA' }}>
              Students join with code: <span style={{ 
                fontSize: '32px', 
                background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 'bold'
              }}>{displayCode}</span>
            </p>
            <p style={{ fontSize: '14px', margin: 0, color: '#6b7280' }}>
              Students can submit questions anonymously or with their name
            </p>
          </div>
        ) : (
          <div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
                Live Questions
              </h3>
              {questions.length > 0 && (
                <button onClick={() => setViewMode('fullscreen')} style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', 
                  color: 'white', border: 'none',
                  padding: '10px 20px', borderRadius: '8px',
                  cursor: 'pointer', fontSize: '14px', fontWeight: '600'
                }}>
                  Present Mode
                </button>
              )}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '20px'
            }}>
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  style={{
                    background: question.is_highlighted 
                      ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                      : 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                    borderRadius: '16px', padding: '24px',
                    color: 'white', position: 'relative',
                    minHeight: '140px', display: 'flex',
                    flexDirection: 'column',
                    animation: index < 3 ? 'popIn 0.3s ease' : 'none',
                    cursor: 'pointer', transition: 'transform 0.2s ease'
                  }}
                  onClick={() => {
                    setCurrentQuestionIndex(index);
                    setViewMode('fullscreen');
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{
                    fontSize: '18px', lineHeight: '1.5',
                    marginBottom: 'auto', fontWeight: '500'
                  }}>
                    {question.text || question.message_text || question.message || 'No message'}
                  </div>

                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', fontSize: '13px',
                    opacity: 0.9, marginTop: '16px'
                  }}>
                    <span>{question.is_anonymous ? 'Anonymous' : question.student_name}</span>
                    <div style={{
                      background: 'rgba(255,255,255,0.2)',
                      padding: '4px 12px', borderRadius: '16px',
                      fontWeight: '600'
                    }}>
                      👍 {question.likes || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showCodeModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }} onClick={() => setShowCodeModal(false)}>
          <div style={{
            background: 'white', padding: '48px', borderRadius: '24px',
            textAlign: 'center', maxWidth: '500px'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '16px', color: '#333' }}>
              Students Join With:
            </h2>
            <div style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
              color: 'white', padding: '32px', borderRadius: '16px',
              fontSize: '72px', fontWeight: 'bold', letterSpacing: '8px',
              marginBottom: '24px'
            }}>
              {session.code || session.session_code || 'N/A'}
            </div>
            <button onClick={() => setShowCodeModal(false)} style={{
              background: '#10B981', color: 'white', border: 'none',
              padding: '12px 32px', borderRadius: '8px',
              fontSize: '16px', fontWeight: '600', cursor: 'pointer'
            }}>
              Close
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// Lectures/Topics Selection with Past Sessions
const LecturesView = ({ course, onBackToCourses, onStartSession, onViewPastSession }) => {
  const [lectures, setLectures] = useState([]);
  const [pastSessions, setPastSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let lecturesData = [];
        if (course.lectures && Array.isArray(course.lectures)) {
          lecturesData = course.lectures;
        } else if (course.topics && Array.isArray(course.topics)) {
          lecturesData = course.topics;
        }
        
        const sortedLectures = [...lecturesData].sort((a, b) => {
          const dateA = new Date(a.created_at || a.date || 0);
          const dateB = new Date(b.created_at || b.date || 0);
          return dateB - dateA;
        });
        
        setLectures(sortedLectures);

        try {
          const sessionsResponse = await getLecturerSessions({ course_id: course.id });
          setPastSessions(sessionsResponse.data || []);
        } catch (err) {
          console.log('No past sessions or API not available:', err);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [course]);

  const generateSessionName = (lectureName = null) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', minute: '2-digit' 
    });
    return lectureName 
      ? `${course.code} - ${lectureName} - ${dateStr} ${timeStr}`
      : `${course.code} - ${dateStr} ${timeStr}`;
  };

  const handleStartSession = async (lecture = null) => {
    setCreating(true);
    try {
      const sessionName = generateSessionName(lecture?.name || lecture?.title);
      
      const payload = {
        course: course.id,
        ...(lecture && { lecture: lecture.id }),
        title: sessionName,
        description: `Live Q&A session for ${course.name}`
      };

      const response = await createLiveSession(payload);
      const sessionData = response.data.session || response.data;
      
      setToast({ message: `Session created! Code: ${sessionData.code}`, type: 'success' });
      
      setTimeout(() => {
        onStartSession({
          ...sessionData,
          id: sessionData.id || sessionData.session_id,
          code: sessionData.code || sessionData.session_code,
          title: sessionData.title || sessionName,
          course: course,
          lecture: lecture
        });
      }, 1000);
    } catch (err) {
      console.error('Error creating session:', err);
      const errorMessage = err.response?.data?.course?.[0] 
        || err.response?.data?.error 
        || 'Failed to create session';
      
      setToast({ message: errorMessage, type: 'error' });
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{
          width: '50px', height: '50px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #1935CA',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Poppins, sans-serif' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div style={{ marginBottom: '24px' }}>
        <span onClick={onBackToCourses} style={{ 
          color: course.color || '#1935CA', cursor: 'pointer',
          fontSize: '16px', fontWeight: '500', textDecoration: 'underline'
        }}>
          ← Back to Courses
        </span>
      </div>
      
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
          {course.code} - Live Q&A
        </h2>
        <p style={{ color: '#6b7280', fontSize: '16px', margin: 0 }}>
          Start a new session or view past sessions
        </p>
      </div>

      <div onClick={() => !creating && handleStartSession()} style={{
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        color: 'white', padding: '32px', borderRadius: '16px',
        marginBottom: '32px', cursor: creating ? 'not-allowed' : 'pointer',
        boxShadow: '0 10px 40px rgba(16, 185, 129, 0.3)',
        transition: 'all 0.3s ease', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between'
      }}
      onMouseEnter={(e) => !creating && (e.currentTarget.style.transform = 'translateY(-4px)')}
      onMouseLeave={(e) => !creating && (e.currentTarget.style.transform = 'translateY(0)')}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
            {creating ? 'Creating Session...' : '+ Start New Live Session'}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9}}>
            Create a Q&A session for this course
          </div>
        </div>
        <div style={{ fontSize: '48px' }}>🚀</div>
      </div>

      {lectures.length > 0 && (
        <>
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#374151', marginBottom: '20px' }}>
            Or start for a specific lecture/topic:
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px', marginBottom: '40px'
          }}>
            {lectures.map(lecture => (
              <div
                key={lecture.id}
                onClick={() => !creating && handleStartSession(lecture)}
                style={{
                  background: 'white', padding: '24px',
                  borderRadius: '16px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  border: `2px solid ${course.color || '#1935CA'}`,
                  transition: 'all 0.3s ease',
                  position: 'relative', overflow: 'hidden'
                }}
                onMouseEnter={(e) => !creating && (e.currentTarget.style.transform = 'translateY(-4px)')}
                onMouseLeave={(e) => !creating && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div style={{
                  position: 'absolute', top: 0, right: 0,
                  width: '80px', height: '80px',
                  background: `linear-gradient(135deg, ${course.color || '#1935CA'}20, ${course.color || '#1935CA'}40)`,
                  borderRadius: '0 0 0 80px'
                }} />
                
                <div style={{ 
                  fontSize: '18px', fontWeight: '600',
                  marginBottom: '12px', color: '#1f2937',
                  position: 'relative', zIndex: 1
                }}>
                  {lecture.name || lecture.title}
                </div>
                
                <div style={{ 
                  color: '#6b7280', fontSize: '14px', lineHeight: '1.5'
                }}>
                  {lecture.description || 'Click to start Q&A session'}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {pastSessions.length > 0 && (
        <>
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#374151', marginBottom: '20px' }}>
            Past Sessions ({pastSessions.length})
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px'
          }}>
            {pastSessions.map(session => (
              <div
                key={session.id}
                onClick={() => onViewPastSession && onViewPastSession(session)}
                style={{
                  background: 'white', padding: '20px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  border: '1px solid #e5e7eb'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  {session.title}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
                  Code: <strong>{session.code}</strong>
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                  {session.created_at && new Date(session.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Main Container
const LiveQnAContainer = () => {
  const [currentView, setCurrentView] = useState('courses');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await getLecturerCourses();
        const coursesData = Array.isArray(response.data) 
          ? response.data 
          : response.data.courses || [];
        setCourses(coursesData);
      } catch (err) {
        console.error('Error fetching courses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
    setCurrentView('lectures');
  };

  const handleStartSession = (session) => {
    setActiveSession(session);
    setCurrentView('presentation');
  };

  const handleEndSession = () => {
    setActiveSession(null);
    setCurrentView('lectures');
  };

  const handleBackToCourses = () => {
    setSelectedCourse(null);
    setCurrentView('courses');
  };

  const handleViewPastSession = (session) => {
    setActiveSession(session);
    setCurrentView('presentation');
  };

  if (currentView === 'presentation') {
    return (
      <MentimeterPresentation
        session={activeSession}
        onEndSession={handleEndSession}
      />
    );
  }

  if (currentView === 'lectures') {
    return (
      <LecturesView
        course={selectedCourse}
        onBackToCourses={handleBackToCourses}
        onStartSession={handleStartSession}
        onViewPastSession={handleViewPastSession}
      />
    );
  }

  return (
    <div style={{ padding: '20px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Poppins, sans-serif' }}>
      <h2 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '24px', color: '#1f2937' }}>
        Live Q&A Courses
      </h2>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div style={{
            width: '50px', height: '50px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #1935CA',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {courses.map(course => (
            <div
              key={course.id}
              onClick={() => handleCourseSelect(course)}
              style={{
                background: 'white', padding: '24px',
                borderRadius: '16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                border: `3px solid ${course.color || '#1935CA'}`,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
            >
              <div style={{ 
                color: course.color || '#1935CA', 
                fontWeight: '700', 
                marginBottom: '12px', 
                fontSize: '18px'
              }}>
                {course.code}
              </div>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: '#374151',
                lineHeight: '1.4'
              }}>
                {course.name}
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LiveQnAContainer;