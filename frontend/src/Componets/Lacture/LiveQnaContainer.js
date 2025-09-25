import { useState } from 'react';

// Dummy data for lectures by course
const dummyLecturesByCourse = {
  1: [ // CSC3003S lectures
    { id: 101, title: 'Introduction to Design Patterns', description: 'Overview and classification of software design patterns', code: 'L001' },
    { id: 102, title: 'Creational Patterns', description: 'Factory, Builder, Singleton patterns in depth', code: 'L002' },
    { id: 103, title: 'Structural Patterns', description: 'Adapter, Decorator, and Facade patterns', code: 'L003' },
    { id: 104, title: 'Behavioral Patterns', description: 'Observer, Strategy, and Command patterns', code: 'L004' }
  ],
  2: [ // CSC1015F lectures
    { id: 201, title: 'Programming Fundamentals', description: 'Basic programming concepts and syntax', code: 'L101' },
    { id: 202, title: 'Data Structures', description: 'Arrays, lists, and basic data organization', code: 'L102' },
    { id: 203, title: 'Algorithms Introduction', description: 'Sorting and searching algorithms', code: 'L103' }
  ]
};

const LiveQnACourses = ({ onCourseSelect }) => {
  const courses = [
    { id: 1, code: 'CSC3003S', name: 'Advanced Software Development', color: '#1935CA' },
    { id: 2, code: 'CSC1015F', name: 'Computer Science Fundamentals', color: '#10B981' },
    { id: 3, code: 'CSC2001F', name: 'Data Structures & Algorithms', color: '#F59E0B' },
    { id: 4, code: 'CSC2002S', name: 'Object-Oriented Programming', color: '#EF4444' }
  ];

  return (
    <div style={{ padding: '20px', background: '#f8fafc', minHeight: '100vh' }}>
      <h2 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '24px', color: '#1f2937' }}>
        Live Q&A Courses
      </h2>
      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {courses.map(course => (
          <div
            key={course.id}
            onClick={() => onCourseSelect(course)}
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              border: `3px solid ${course.color}`,
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
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
              position: 'absolute',
              top: 0,
              right: 0,
              width: '60px',
              height: '60px',
              background: `linear-gradient(135deg, ${course.color}20, ${course.color}40)`,
              borderRadius: '0 0 0 60px'
            }} />
            
            <div style={{ 
              color: course.color, 
              fontWeight: '700', 
              marginBottom: '12px', 
              fontSize: '18px',
              position: 'relative',
              zIndex: 1
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
            <div style={{
              marginTop: '16px',
              padding: '8px 16px',
              background: `${course.color}10`,
              borderRadius: '20px',
              display: 'inline-block',
              fontSize: '12px',
              color: course.color,
              fontWeight: '500'
            }}>
              Click to view lectures
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const LiveQnALectures = ({ course, onBackToCourses, onStartSession }) => {
  const [lectures, setLectures] = useState(dummyLecturesByCourse[course.id] || []);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const generateLectureCode = () => {
    const prefix = course.code.substring(0, 3);
    const number = String(lectures.length + 1).padStart(3, '0');
    return `${prefix}${number}`;
  };

  const handleAddLecture = () => {
    const newLecture = {
      id: Date.now(),
      title: `New Lecture ${lectures.length + 1}`,
      description: 'Click to edit description',
      code: generateLectureCode()
    };
    
    setLectures([...lectures, newLecture]);
    setShowCreateModal(false);
  };

  const handleQuickStart = (lectureId, lectureTitle) => {
    const session = {
      id: Date.now(),
      title: `Live Q&A - ${lectureTitle}`,
      code: Math.random().toString(36).substr(2, 6).toUpperCase(),
      lecture_id: lectureId,
      course: course
    };
    onStartSession(session);
  };

  return (
    <div style={{ padding: '20px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <span 
          onClick={onBackToCourses} 
          style={{ 
            color: course.color, 
            cursor: 'pointer', 
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: 'fit-content'
          }}
          onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
          onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
        >
          ← Back to Courses
        </span>
      </div>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{ 
            fontSize: '28px', 
            fontWeight: '600', 
            color: '#1f2937', 
            marginBottom: '4px' 
          }}>
            {course.code} - Lectures
          </h2>
          <p style={{ 
            color: '#6b7280', 
            fontSize: '16px',
            margin: 0
          }}>
            {course.name}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            background: `linear-gradient(135deg, ${course.color}, ${course.color}dd)`,
            color: 'white',
            border: 'none',
            padding: '14px 24px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
        >
          + Add New Lecture
        </button>
      </div>

      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))' }}>
        {lectures.map(lecture => (
          <div
            key={lecture.id}
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease',
              border: '1px solid #e5e7eb'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              marginBottom: '12px'
            }}>
              <div>
                <div style={{ 
                  fontSize: '20px', 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  color: '#1f2937'
                }}>
                  {lecture.title}
                </div>
                <div style={{ 
                  color: '#6b7280', 
                  fontSize: '14px', 
                  marginBottom: '16px',
                  lineHeight: '1.5'
                }}>
                  {lecture.description}
                </div>
              </div>
              <div style={{
                background: `${course.color}15`,
                color: course.color,
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {lecture.code}
              </div>
            </div>
            
            <button
              onClick={() => handleQuickStart(lecture.id, lecture.title)}
              style={{
                background: course.color,
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '10px',
                cursor: 'pointer',
                width: '100%',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.opacity = '0.9';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = '1';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Start Q&A Session
            </button>
          </div>
        ))}
      </div>

      {lectures.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '80px 20px', 
          color: '#6b7280',
          background: 'white',
          borderRadius: '16px',
          border: '2px dashed #d1d5db'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
          <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
            No lectures yet
          </h3>
          <p style={{ fontSize: '16px', margin: 0 }}>
            Click "Add New Lecture" to get started
          </p>
        </div>
      )}

      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '20px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            position: 'relative'
          }}>
            <h3 style={{ 
              fontSize: '24px', 
              fontWeight: '600', 
              marginBottom: '16px',
              color: '#1f2937'
            }}>
              Add New Lecture
            </h3>
            <p style={{ 
              color: '#6b7280', 
              marginBottom: '24px',
              fontSize: '16px'
            }}>
              A new lecture will be created automatically with code: <strong>{generateLectureCode()}</strong>
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddLecture}
                style={{
                  background: course.color,
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Add Lecture
              </button>
            </div>
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
      background: '#f8fafc',
      color: 'black',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '600' }}>
            {session.title}
          </h1>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>
            Session Code: <strong style={{ color: session.course.color }}>{session.code}</strong> • 
            <span style={{ marginLeft: '8px' }}>45 participants online</span>
          </div>
        </div>
        <button
          onClick={onEndSession}
          style={{
            background: '#EF4444',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
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
                borderRadius: '16px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                minHeight: '160px',
                color: 'white'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255,255,255,0.2)',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '10px',
                textTransform: 'uppercase',
                fontWeight: '600'
              }}>
                {question.status}
              </div>

              <div style={{
                fontSize: '16px',
                lineHeight: '1.6',
                marginBottom: '20px',
                paddingRight: '60px',
                fontWeight: '500'
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
                opacity: 0.9
              }}>
                <span>Anonymous • {formatTime(question.timestamp)}</span>
                <div style={{
                  background: 'rgba(255,255,255,0.2)',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '600'
                }}>
                  👍 {question.likes}
                </div>
              </div>
            </div>
          ))}
        </div>

        {questions.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '80px 20px', 
            color: '#6b7280',
            background: 'white',
            borderRadius: '16px',
            border: '2px dashed #d1d5db'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>💬</div>
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
              No questions yet
            </h2>
            <p style={{ fontSize: '16px', margin: 0 }}>
              Students can ask questions using code: <strong style={{ color: session.course.color }}>{session.code}</strong>
            </p>
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
          padding: '40px',
          color: 'white'
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
              fontSize: '24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>

          <div style={{ textAlign: 'center', maxWidth: '800px' }}>
            <div style={{
              fontSize: '42px',
              fontWeight: '600',
              lineHeight: '1.3',
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
              opacity: 0.8,
              flexWrap: 'wrap'
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

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                style={{
                  background: selectedQuestion.status === 'highlighted' ? '#EF4444' : '#F59E0B',
                  color: 'white',
                  border: 'none',
                  padding: '14px 28px',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {selectedQuestion.status === 'highlighted' ? 'Remove Highlight' : 'Highlight Question'}
              </button>
              <button
                style={{
                  background: '#10B981',
                  color: 'white',
                  border: 'none',
                  padding: '14px 28px',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
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
  const [activeSession, setActiveSession] = useState(null);

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

  // Render the appropriate view
  switch (currentView) {
    case 'lectures':
      return (
        <LiveQnALectures
          course={selectedCourse}
          onBackToCourses={handleBackToCourses}
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