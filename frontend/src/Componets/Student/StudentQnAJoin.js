import { useState, useEffect } from 'react';
import { validateSessionCode, joinSession, sendMessage, getSessionMessagesStudent } from '../../api/live-qna';
import './StudentQnAJoin.css';

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: { bg: '#10B981', icon: '✓' },
    error: { bg: '#EF4444', icon: '✕' },
    info: { bg: '#3B82F6', icon: 'ℹ' }
  };

  const color = colors[type] || colors.info;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: color.bg,
      color: 'white',
      padding: '16px 24px',
      borderRadius: '12px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 10000,
      animation: 'slideIn 0.3s ease-out',
      fontFamily: 'Poppins, sans-serif',
      maxWidth: '400px'
    }}>
      <div style={{
        width: '24px',
        height: '24px',
        background: 'rgba(255,255,255,0.2)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold'
      }}>
        {color.icon}
      </div>
      <div style={{ flex: 1, fontSize: '14px' }}>{message}</div>
      <button onClick={onClose} style={{
        background: 'none',
        border: 'none',
        color: 'white',
        cursor: 'pointer',
        fontSize: '20px',
        padding: 0,
        opacity: 0.8
      }}>×</button>
    </div>
  );
};

const StudentQnAJoin = () => {
  const [sessionCode, setSessionCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinedSession, setJoinedSession] = useState(null);
  const [newQuestion, setNewQuestion] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [myQuestions, setMyQuestions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!joinedSession) return;

    const fetchMessages = async () => {
      try {
        const response = await getSessionMessagesStudent(joinedSession.code);
        const messages = response.data.messages || response.data || [];
        const studentQuestions = Array.isArray(messages) ? messages : [];
        setMyQuestions(studentQuestions);
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [joinedSession]);

  const handleJoinSession = async () => {
    if (!sessionCode.trim()) {
      setJoinError('Please enter a session code');
      return;
    }

    setIsJoining(true);
    setJoinError('');

    try {
      const validateResponse = await validateSessionCode(sessionCode);
      
      if (!validateResponse.data.valid) {
        setJoinError('Invalid session code. Please check and try again.');
        setIsJoining(false);
        return;
      }

      const joinResponse = await joinSession({
        session_code: sessionCode.toUpperCase()
      });

      setJoinedSession({
        code: sessionCode.toUpperCase(),
        ...joinResponse.data,
        ...validateResponse.data.session
      });
    } catch (error) {
      console.error('Error joining session:', error);
      setJoinError(error.response?.data?.error || 'Failed to join session. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleSubmitQuestion = async () => {
    if (!newQuestion.trim()) return;

    setSubmitting(true);
    
    try {
      const payload = { text: newQuestion, is_anonymous: isAnonymous };
      const response = await sendMessage(joinedSession.code, payload);
      const questionData = response.data.data || response.data;
      setMyQuestions(prev => [questionData, ...prev]);
      setNewQuestion('');
      setToast({ message: 'Question submitted successfully!', type: 'success' });
      setSubmitting(false);
      return;
    } catch (error) {
      console.log('Attempt 1 failed, trying alternative field names...');
    }
    
    try {
      const payload = { message_text: newQuestion, is_anonymous: isAnonymous };
      const response = await sendMessage(joinedSession.code, payload);
      const questionData = response.data.data || response.data;
      setMyQuestions(prev => [questionData, ...prev]);
      setNewQuestion('');
      setToast({ message: 'Question submitted successfully!', type: 'success' });
      setSubmitting(false);
      return;
    } catch (error) {
      console.log('Attempt 2 failed, trying final alternative...');
    }
    
    try {
      const payload = { message: newQuestion, is_anonymous: isAnonymous };
      const response = await sendMessage(joinedSession.code, payload);
      const questionData = response.data.data || response.data;
      setMyQuestions(prev => [questionData, ...prev]);
      setNewQuestion('');
      setToast({ message: 'Question submitted successfully!', type: 'success' });
      setSubmitting(false);
      return;
    } catch (error) {
      let errorMessage = 'Failed to submit question';
      if (error.response?.data) {
        errorMessage = JSON.stringify(error.response.data);
      }
      setToast({ message: errorMessage, type: 'error' });
      setSubmitting(false);
    }
  };

  const handleLeaveSession = () => {
    if (window.confirm('Leave this Q&A session?')) {
      setJoinedSession(null);
      setMyQuestions([]);
      setSessionCode('');
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  if (!joinedSession) {
    return (
      <div style={{
        fontFamily: 'Poppins, sans-serif',
        padding: '40px 20px',
        maxWidth: '500px',
        margin: '0 auto'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #1935CA 0%, #3B82F6 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '32px'
          }}>
            💬
          </div>

          <h1 style={{
            fontSize: '28px',
            fontWeight: '600',
            color: '#333',
            marginBottom: '8px'
          }}>
            Join Live Q&A
          </h1>
          
          <p style={{
            fontSize: '16px',
            color: '#666',
            marginBottom: '32px',
            lineHeight: '1.5'
          }}>
            Enter the session code provided by your instructor
          </p>

          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            placeholder="Enter session code"
            value={sessionCode}
            onChange={(e) => {
              setSessionCode(e.target.value.toUpperCase());
              setJoinError('');
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.currentTarget.focus();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              e.currentTarget.focus();
            }}
            style={{
              width: '100%',
              padding: '16px',
              border: '2px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '18px',
              textAlign: 'center',
              fontFamily: 'Poppins, sans-serif',
              fontWeight: '600',
              letterSpacing: '2px',
              outline: 'none',
              marginBottom: '16px',
              WebkitAppearance: 'none',
              WebkitUserSelect: 'text',
              userSelect: 'text',
              pointerEvents: 'auto',
              touchAction: 'manipulation',
              position: 'relative',
              zIndex: 100
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleJoinSession()}
          />

          {joinError && (
            <div style={{
              background: '#FEE2E2',
              color: '#DC2626',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              {joinError}
            </div>
          )}

          <button
            onClick={handleJoinSession}
            disabled={isJoining || !sessionCode.trim()}
            style={{
              width: '100%',
              background: isJoining || !sessionCode.trim() ? '#D1D5DB' : 'linear-gradient(135deg, #1935CA 0%, #3B82F6 100%)',
              color: 'white',
              border: 'none',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isJoining || !sessionCode.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isJoining ? 'Joining...' : 'Join Session'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: 'Poppins, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div style={{
        background: 'linear-gradient(135deg, #1935CA 0%, #3B82F6 100%)',
        color: 'white',
        padding: '20px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 4px 0' }}>
            {joinedSession.title || joinedSession.session_title || 'Live Q&A Session'}
          </h1>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            {joinedSession.course_code || joinedSession.course_name} • Code: <strong>{joinedSession.code}</strong>
          </div>
        </div>

        <button
          onClick={handleLeaveSession}
          style={{
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          Leave
        </button>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: window.innerWidth > 768 ? '1fr 350px' : '1fr',
        gap: '20px', 
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          height: 'fit-content'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            Ask a Question
          </h2>

          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Type your question here..."
            maxLength={500}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '16px',
              border: '2px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '16px',
              fontFamily: 'Poppins, sans-serif',
              outline: 'none',
              resize: 'vertical',
              marginBottom: '16px',
              boxSizing: 'border-box'
            }}
          />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: '#666',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                style={{ accentColor: '#1935CA', width: '16px', height: '16px' }}
              />
              Ask anonymously
            </label>
            
            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
              {newQuestion.length}/500
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmitQuestion}
            disabled={!newQuestion.trim() || submitting}
            style={{
              width: '100%',
              background: !newQuestion.trim() || submitting ? '#D1D5DB' : 'linear-gradient(135deg, #1935CA 0%, #3B82F6 100%)',
              color: 'white',
              border: 'none',
              padding: '14px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: !newQuestion.trim() || submitting ? 'not-allowed' : 'pointer',
              boxSizing: 'border-box'
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Question'}
          </button>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          maxHeight: '500px',
          overflowY: 'auto'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            My Questions ({myQuestions.length})
          </h3>

          {myQuestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>💭</div>
              <p style={{ fontSize: '14px' }}>
                No questions yet.<br/>Submit your first question!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myQuestions.map(question => (
                <div
                  key={question.id}
                  style={{
                    padding: '12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    background: question.is_highlighted ? '#FEF3C7' : '#F9FAFB'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '6px'
                  }}>
                    <div style={{
                      background: question.is_highlighted ? '#F59E0B' : '#6B7280',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '8px',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      fontWeight: '600'
                    }}>
                      {question.is_highlighted ? 'highlighted' : question.is_answered ? 'answered' : 'submitted'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      👍 {question.likes || 0}
                    </div>
                  </div>

                  <div style={{ fontSize: '14px', marginBottom: '6px' }}>
                    {question.text || question.message_text || question.message || 'No message'}
                  </div>

                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                    {question.created_at && formatTime(question.created_at)} • {question.is_anonymous ? 'Anonymous' : 'Named'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentQnAJoin;