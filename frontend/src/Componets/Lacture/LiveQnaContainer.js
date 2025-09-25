import { useState } from 'react';

// Import the individual components (these would be in separate files in your project)
// import LiveQnACourses from './LiveQnACourses';
// import LiveQnATopics from './LiveQnATopics'; 
// import LiveQnALectures from './LiveQnALectures';

// For this demo, I'll include simplified versions of the components inline
const LiveQnACourses = ({ onCourseSelect }) => {
  const courses = [
    { id: 1, code: 'CSC3003S', name: 'Advanced Software Development', color: '#1935CA' },
    { id: 2, code: 'CSC1015F', name: 'Computer Science Fundamentals', color: '#10B981' }
  ];

  return (
    <div style={{ padding: '20px' }}>
      <h2>Live Q&A Courses</h2>
      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {courses.map(course => (
          <div
            key={course.id}
            onClick={() => onCourseSelect(course)}
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              border: `3px solid ${course.color}`,
              transition: 'transform 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            <div style={{ color: course.color, fontWeight: '600', marginBottom: '8px' }}>
              {course.code}
            </div>
            <div style={{ fontSize: '18px', fontWeight: '500', color: '#333' }}>
              {course.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const LiveQnATopics = ({ course, onTopicSelect, onBackToCourses }) => {
  const topics = [
    { id: 1, name: 'Design Patterns', description: 'Gang of Four patterns and modern approaches' },
    { id: 2, name: 'Software Architecture', description: 'Microservices and system design' }
  ];

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <span onClick={onBackToCourses} style={{ color: '#1935CA', cursor: 'pointer', textDecoration: 'underline' }}>
          ← Back to Courses
        </span>
      </div>
      <h2>{course.code} - Topics</h2>
      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {topics.map(topic => (
          <div
            key={topic.id}
            onClick={() => onTopicSelect(topic)}
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'transform 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
              {topic.name}
            </div>
            <div style={{ color: '#666', fontSize: '14px' }}>
              {topic.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const LiveQnALectures = ({ topic, course, onBackToTopics, onStartSession }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const lectures = [
    { id: 1, title: 'Introduction to Design Patterns', description: 'Overview and classification' },
    { id: 2, title: 'Creational Patterns', description: 'Factory, Builder, Singleton patterns' }
  ];

  const handleQuickStart = (lectureId, lectureTitle) => {
    const session = {
      id: Date.now(),
      title: `Live Q&A - ${lectureTitle}`,
      code: Math.random().toString(36).substr(2, 6).toUpperCase(),
      lecture_id: lectureId
    };
    onStartSession(session);
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <span onClick={onBackToTopics} style={{ color: '#1935CA', cursor: 'pointer', textDecoration: 'underline' }}>
          ← Back to Topics
        </span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>{topic.name} - Lectures</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            background: '#10B981',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          + Create Q&A Session
        </button>
      </div>

      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
        {lectures.map(lecture => (
          <div
            key={lecture.id}
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
              {lecture.title}
            </div>
            <div style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
              {lecture.description}
            </div>
            <button
              onClick={() => handleQuickStart(lecture.id, lecture.title)}
              style={{
                background: '#1935CA',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Quick Start Q&A
            </button>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px'
          }}>
            <h3>Create Custom Q&A Session</h3>
            <p>Feature coming soon - use Quick Start for now!</p>
            <button
              onClick={() => setShowCreateModal(false)}
              style={{
                background: '#6B7280',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const LiveQnAPresentation = ({ session, onEndSession }) => {
  const [questions, setQuestions] = useState([
    {
      id: 1,
      text: 'Can you explain when to use Factory Pattern vs Builder Pattern?',
      likes: 12,
      timestamp: Date.now() - 300000,
      status: 'new'
    },
    {
      id: 2,
      text: 'What are the main disadvantages of using Singleton pattern?',
      likes: 8,
      timestamp: Date.now() - 180000,
      status: 'highlighted'
    }
  ]);

  const [selectedQuestion, setSelectedQuestion] = useState(null);

  const formatTime = (timestamp) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div style={{
      background: '#fafafaff',
      color: 'black',
      minHeight: '100vh',
      fontFamily: 'Poppins, sans-serif'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #fdfdfdff 0%, #ffffffff 100%)',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '24px' }}>{session.title}</h1>
          <div style={{ opacity: 0.9 }}>
            Session Code: <strong>{session.code}</strong> • 45 participants
          </div>
        </div>
        <button
          onClick={onEndSession}
          style={{
            background: '#EF4444',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          End Session
        </button>
      </div>

      <div style={{ padding: '40px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
          gap: '24px'
        }}>
          {questions.map(question => (
            <div
              key={question.id}
              onClick={() => setSelectedQuestion(question)}
              style={{
                background: question.status === 'highlighted' 
                  ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                  : 'linear-gradient(135deg, #334155 0%, #1E293B 100%)',
                borderRadius: '12px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                minHeight: '150px'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255,255,255,0.2)',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '10px',
                textTransform: 'uppercase'
              }}>
                {question.status}
              </div>

              <div style={{
                fontSize: '16px',
                lineHeight: '1.5',
                marginBottom: '20px',
                paddingRight: '60px'
              }}>
                {question.text}
              </div>

              <div style={{
                position: 'absolute',
                bottom: '16px',
                left: '24px',
                right: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                opacity: 0.8
              }}>
                <span>Anonymous • {formatTime(question.timestamp)}</span>
                <div style={{
                  background: 'rgba(255,255,255,0.2)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  👍 {question.likes}
                </div>
              </div>
            </div>
          ))}
        </div>

        {questions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', opacity: 0.6 }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>💬</div>
            <h2>No questions yet</h2>
            <p>Students can ask questions using code: <strong>{session.code}</strong></p>
          </div>
        )}
      </div>

      {selectedQuestion && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '40px'
        }}>
          <button
            onClick={() => setSelectedQuestion(null)}
            style={{
              position: 'absolute',
              top: '40px',
              right: '40px',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: 'none',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              fontSize: '20px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>

          <div style={{ textAlign: 'center', maxWidth: '800px' }}>
            <div style={{
              fontSize: '48px',
              fontWeight: '600',
              lineHeight: '1.2',
              marginBottom: '40px'
            }}>
              {selectedQuestion.text}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '40px',
              marginBottom: '40px',
              fontSize: '18px',
              opacity: 0.8
            }}>
              <span>Anonymous Student</span>
              <span>•</span>
              <span>{formatTime(selectedQuestion.timestamp)}</span>
              <span>•</span>
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '8px 16px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                👍 <span style={{ fontWeight: '600' }}>{selectedQuestion.likes}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button
                style={{
                  background: selectedQuestion.status === 'highlighted' ? '#EF4444' : '#F59E0B',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                {selectedQuestion.status === 'highlighted' ? 'Remove Highlight' : 'Highlight'}
              </button>
              <button
                style={{
                  background: '#10B981',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Answer Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main container component
const LiveQnAContainer = () => {
  const [currentView, setCurrentView] = useState('courses');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [activeSession, setActiveSession] = useState(null);

  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
    setCurrentView('topics');
  };

  const handleTopicSelect = (topic) => {
    setSelectedTopic(topic);
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
    setSelectedTopic(null);
    setCurrentView('courses');
  };

  const handleBackToTopics = () => {
    setSelectedTopic(null);
    setCurrentView('topics');
  };

  // Render the appropriate view
  switch (currentView) {
    case 'topics':
      return (
        <LiveQnATopics
          course={selectedCourse}
          onTopicSelect={handleTopicSelect}
          onBackToCourses={handleBackToCourses}
        />
      );
    
    case 'lectures':
      return (
        <LiveQnALectures
          topic={selectedTopic}
          course={selectedCourse}
          onBackToTopics={handleBackToTopics}
          onStartSession={handleStartSession}
        />
      );
    
    case 'presentation':
      return (
        <LiveQnAPresentation
          session={activeSession}
          onEndSession={handleEndSession}
        />
      );
    
    default:
      return <LiveQnACourses onCourseSelect={handleCourseSelect} />;
  }
};

export default LiveQnAContainer;