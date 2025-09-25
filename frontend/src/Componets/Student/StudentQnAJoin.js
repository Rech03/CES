import { useState } from 'react';

const StudentQnAJoin = () => {
  const [sessionCode, setSessionCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinedSession, setJoinedSession] = useState(null);
  const [newQuestion, setNewQuestion] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [myQuestions, setMyQuestions] = useState([]);

  const handleJoinSession = async () => {
    if (!sessionCode.trim()) {
      setJoinError('Please enter a session code');
      return;
    }

    setIsJoining(true);
    setJoinError('');

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful join - you can test with any code
      const session = {
        id: 1,
        code: sessionCode.toUpperCase(),
        title: 'Live Q&A Session',
        course: 'CSC3003S',
        instructor: 'Dr. Smith',
        participants: 45
      };

      setJoinedSession(session);
    } catch (error) {
      setJoinError('Failed to join session. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleSubmitQuestion = async () => {
    if (!newQuestion.trim()) return;

    const question = {
      id: Date.now(),
      text: newQuestion,
      likes: 0,
      submitted_at: new Date(),
      is_anonymous: isAnonymous,
      status: 'submitted'
    };

    setMyQuestions(prev => [question, ...prev]);
    setNewQuestion('');
  };

  const handleLeaveSession = () => {
    if (window.confirm('Leave this Q&A session?')) {
      setJoinedSession(null);
      setMyQuestions([]);
      setSessionCode('');
    }
  };

  const formatTime = (date) => {
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
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #b9c0e6ff 0%, #3B82F6 100%)',
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
            placeholder="Enter session code"
            value={sessionCode}
            onChange={(e) => {
              setSessionCode(e.target.value.toUpperCase());
              setJoinError('');
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
              marginBottom: '16px'
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

          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: '#F3F4F6',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#666'
          }}>
            Try any code to see the demo interface
          </div>
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
      {/* Header */}
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
            {joinedSession.title}
          </h1>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            {joinedSession.course} • Code: <strong>{joinedSession.code}</strong> • {joinedSession.participants} online
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
        {/* Question Submission */}
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
              marginBottom: '16px'
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
                style={{ accentColor: '#1935CA' }}
              />
              Ask anonymously
            </label>
            
            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
              {newQuestion.length}/500
            </div>
          </div>

          <button
            onClick={handleSubmitQuestion}
            disabled={!newQuestion.trim()}
            style={{
              width: '100%',
              background: !newQuestion.trim() ? '#D1D5DB' : 'linear-gradient(135deg, #1935CA 0%, #3B82F6 100%)',
              color: 'white',
              border: 'none',
              padding: '14px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: !newQuestion.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            Submit Question
          </button>
        </div>

        {/* My Questions */}
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
                    background: '#F9FAFB'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '6px'
                  }}>
                    <div style={{
                      background: '#6B7280',
                      color: 'white',
                      padding: '1px 6px',
                      borderRadius: '8px',
                      fontSize: '10px',
                      textTransform: 'uppercase'
                    }}>
                      {question.status}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      👍 {question.likes}
                    </div>
                  </div>

                  <div style={{ fontSize: '14px', marginBottom: '6px' }}>
                    {question.text}
                  </div>

                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                    {formatTime(question.submitted_at)} • {question.is_anonymous ? 'Anonymous' : 'Named'}
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