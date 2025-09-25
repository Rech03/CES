import { useState, useEffect } from 'react';

const LecturerQnaCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Dummy data
  useEffect(() => {
    const loadCourses = async () => {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const dummyCourses = [
        {
          id: 1,
          code: 'CSC3003S',
          name: 'Advanced Software Development',
          description: 'Object-oriented programming, design patterns, and software architecture.',
          student_count: 85,
          topics_count: 8,
          active_sessions: 2,
          recent_activity: '2 hours ago',
          color: '#1935CA'
        },
        {
          id: 2,
          code: 'CSC1015F',
          name: 'Computer Science Fundamentals',
          description: 'Introduction to programming, data structures, and algorithms.',
          student_count: 120,
          topics_count: 12,
          active_sessions: 0,
          recent_activity: '1 day ago',
          color: '#10B981'
        },
        {
          id: 3,
          code: 'CSC2001F',
          name: 'Data Structures & Algorithms',
          description: 'Advanced data structures, algorithm analysis, and complexity theory.',
          student_count: 95,
          topics_count: 10,
          active_sessions: 1,
          recent_activity: '3 hours ago',
          color: '#F59E0B'
        },
        {
          id: 4,
          code: 'MAT1000W',
          name: 'Mathematics for Computer Science',
          description: 'Discrete mathematics, logic, and mathematical foundations.',
          student_count: 110,
          topics_count: 6,
          active_sessions: 0,
          recent_activity: '5 days ago',
          color: '#EF4444'
        }
      ];
      
      setCourses(dummyCourses);
      setLoading(false);
    };

    loadCourses();
  }, []);

  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCourseClick = (courseId) => {
    console.log(`Navigate to course ${courseId} topics`);
    // In your app, this would navigate to /live-qna/course/${courseId}/topics
  };

  if (loading) {
    return (
      <div style={{ fontFamily: 'Poppins, sans-serif' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #1935CA',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div style={{ color: '#1935CA', fontSize: '16px' }}>Loading courses...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: 'Poppins, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          padding: '0 20px'
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '600',
              color: '#333',
              margin: '0 0 8px 0'
            }}>
              Live Q&A Sessions
            </h1>
            <p style={{
              fontSize: '16px',
              color: '#666',
              margin: 0
            }}>
              Create interactive Q&A sessions for your courses
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{
          marginBottom: '30px',
          position: 'relative',
          padding: '0 20px'
        }}>
          <input
            type="text"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '12px 16px 12px 45px',
              border: '2px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '16px',
              fontFamily: 'Poppins, sans-serif',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#1935CA'}
            onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
          />
          <div style={{
            position: 'absolute',
            left: '36px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9CA3AF',
            fontSize: '18px'
          }}>
            🔍
          </div>
        </div>

        {/* Courses Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: '24px',
          padding: '0 20px',
          marginBottom: '40px'
        }}>
          {filteredCourses.map(course => (
            <div
              key={course.id}
              onClick={() => handleCourseClick(course.id)}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: '1px solid #E5E7EB',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
            >
              {/* Course Color Bar */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '4px',
                height: '100%',
                background: course.color
              }}></div>

              {/* Active Sessions Indicator */}
              {course.active_sessions > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: '#10B981',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'white',
                    animation: 'pulse 2s infinite'
                  }}></div>
                  {course.active_sessions} Live
                </div>
              )}

              {/* Course Code */}
              <div style={{
                color: course.color,
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                {course.code}
              </div>

              {/* Course Name */}
              <div style={{
                fontSize: '20px',
                fontWeight: '500',
                color: '#333',
                marginBottom: '8px',
                lineHeight: '1.3'
              }}>
                {course.name}
              </div>

              {/* Description */}
              <div style={{
                fontSize: '14px',
                color: '#666',
                marginBottom: '20px',
                lineHeight: '1.4'
              }}>
                {course.description}
              </div>

              {/* Stats */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '16px',
                borderTop: '1px solid #F3F4F6'
              }}>
                <div style={{
                  display: 'flex',
                  gap: '20px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    color: '#666'
                  }}>
                    <span>👥</span>
                    <span>{course.student_count} students</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    color: '#666'
                  }}>
                    <span>📚</span>
                    <span>{course.topics_count} topics</span>
                  </div>
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#9CA3AF'
                }}>
                  {course.recent_activity}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCourses.length === 0 && !loading && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#666'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>
              📚
            </div>
            <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#333' }}>
              No courses found
            </h3>
            <p style={{ fontSize: '14px' }}>
              {searchTerm ? 'Try adjusting your search terms' : 'No courses available for Live Q&A'}
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default LecturerQnaCourses;