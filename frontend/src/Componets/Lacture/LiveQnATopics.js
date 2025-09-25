import { useState, useEffect } from 'react';

const LiveQnATopics = ({ course, onTopicSelect, onBackToCourses }) => {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadTopics = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate topics based on course
      let dummyTopics = [];
      
      if (course.code === 'CSC3003S') {
        dummyTopics = [
          {
            id: 1,
            name: 'Design Patterns',
            description: 'Gang of Four patterns, architectural patterns, and modern design approaches for software engineering.',
            lecture_count: 6,
            active_sessions: 1,
            last_session: '2 hours ago',
            completion_rate: 85,
            student_engagement: 92,
            difficulty: 'Advanced'
          },
          {
            id: 2,
            name: 'Object-Oriented Programming',
            description: 'Inheritance, polymorphism, encapsulation, abstraction, and SOLID principles in practice.',
            lecture_count: 8,
            active_sessions: 0,
            last_session: '3 days ago',
            completion_rate: 78,
            student_engagement: 88,
            difficulty: 'Intermediate'
          },
          {
            id: 3,
            name: 'Software Architecture',
            description: 'Microservices, monoliths, distributed systems, scalability patterns, and system design.',
            lecture_count: 5,
            active_sessions: 1,
            last_session: '1 hour ago',
            completion_rate: 72,
            student_engagement: 95,
            difficulty: 'Advanced'
          },
          {
            id: 4,
            name: 'Testing & Quality Assurance',
            description: 'Unit testing, integration testing, TDD, BDD, and automated testing frameworks.',
            lecture_count: 4,
            active_sessions: 0,
            last_session: '1 week ago',
            completion_rate: 90,
            student_engagement: 83,
            difficulty: 'Intermediate'
          },
          {
            id: 5,
            name: 'Version Control & CI/CD',
            description: 'Git workflows, branching strategies, continuous integration and deployment pipelines.',
            lecture_count: 3,
            active_sessions: 0,
            last_session: '5 days ago',
            completion_rate: 95,
            student_engagement: 87,
            difficulty: 'Beginner'
          },
          {
            id: 6,
            name: 'Agile Development',
            description: 'Scrum, Kanban, sprint planning, retrospectives, and agile project management.',
            lecture_count: 4,
            active_sessions: 0,
            last_session: '2 days ago',
            completion_rate: 82,
            student_engagement: 91,
            difficulty: 'Intermediate'
          }
        ];
      } else if (course.code === 'CSC1015F') {
        dummyTopics = [
          {
            id: 7,
            name: 'Variables & Data Types',
            description: 'Primitive data types, variables, constants, and basic memory management concepts.',
            lecture_count: 4,
            active_sessions: 0,
            last_session: '4 hours ago',
            completion_rate: 95,
            student_engagement: 89,
            difficulty: 'Beginner'
          },
          {
            id: 8,
            name: 'Control Structures',
            description: 'Conditional statements, loops, switch statements, and program flow control.',
            lecture_count: 5,
            active_sessions: 1,
            last_session: '30 minutes ago',
            completion_rate: 88,
            student_engagement: 92,
            difficulty: 'Beginner'
          },
          {
            id: 9,
            name: 'Functions & Methods',
            description: 'Function definition, parameters, return values, scope, and modular programming.',
            lecture_count: 6,
            active_sessions: 0,
            last_session: '2 days ago',
            completion_rate: 81,
            student_engagement: 85,
            difficulty: 'Intermediate'
          },
          {
            id: 10,
            name: 'Data Structures',
            description: 'Arrays, lists, stacks, queues, and basic algorithmic thinking.',
            lecture_count: 7,
            active_sessions: 0,
            last_session: '1 week ago',
            completion_rate: 74,
            student_engagement: 88,
            difficulty: 'Intermediate'
          },
          {
            id: 11,
            name: 'File I/O & Exception Handling',
            description: 'Reading and writing files, error handling, and robust program design.',
            lecture_count: 3,
            active_sessions: 0,
            last_session: '3 days ago',
            completion_rate: 79,
            student_engagement: 82,
            difficulty: 'Intermediate'
          }
        ];
      } else {
        // Default topics for other courses
        dummyTopics = [
          {
            id: 12,
            name: 'Introduction',
            description: 'Course overview and fundamental concepts.',
            lecture_count: 2,
            active_sessions: 0,
            last_session: '1 week ago',
            completion_rate: 100,
            student_engagement: 85,
            difficulty: 'Beginner'
          },
          {
            id: 13,
            name: 'Core Concepts',
            description: 'Main theoretical and practical concepts for the course.',
            lecture_count: 8,
            active_sessions: 1,
            last_session: '2 hours ago',
            completion_rate: 67,
            student_engagement: 91,
            difficulty: 'Intermediate'
          },
          {
            id: 14,
            name: 'Advanced Topics',
            description: 'Complex applications and real-world scenarios.',
            lecture_count: 5,
            active_sessions: 0,
            last_session: '4 days ago',
            completion_rate: 45,
            student_engagement: 88,
            difficulty: 'Advanced'
          }
        ];
      }
      
      setTopics(dummyTopics);
      setLoading(false);
    };

    loadTopics();
  }, [course.id, course.code]);

  const filteredTopics = topics.filter(topic =>
    topic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    topic.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    topic.difficulty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEngagementColor = (engagement) => {
    if (engagement >= 90) return '#10B981';
    if (engagement >= 80) return '#F59E0B';
    return '#EF4444';
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      'Beginner': '#22C55E',
      'Intermediate': '#F59E0B', 
      'Advanced': '#EF4444'
    };
    return colors[difficulty] || '#6B7280';
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        fontFamily: 'Poppins, sans-serif',
        color: '#666'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #1935CA',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }}></div>
        <div style={{ color: '#1935CA', fontSize: '16px' }}>Loading topics...</div>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: 'Poppins, sans-serif',
      padding: '20px',
      maxWidth: '1400px',
      margin: '0 auto'
    }}>
      {/* Breadcrumb Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '24px',
        fontSize: '14px',
        color: '#666'
      }}>
        <span 
          onClick={onBackToCourses}
          style={{ 
            color: '#1935CA', 
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          Live Q&A
        </span>
        <span style={{ color: '#9CA3AF' }}>{'>'}</span>
        <span>{course.code} - {course.name}</span>
      </div>

      {/* Header Section */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '12px'
        }}>
          <div style={{
            width: '6px',
            height: '60px',
            background: course.color,
            borderRadius: '3px'
          }}></div>
          <div>
            <div style={{
              color: course.color,
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '4px'
            }}>
              {course.code}
            </div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '600',
              color: '#333',
              margin: '0',
              lineHeight: '1.2'
            }}>
              {course.name}
            </h1>
          </div>
        </div>
        <p style={{
          fontSize: '18px',
          color: '#666',
          margin: '0',
          lineHeight: '1.5'
        }}>
          Select a topic to view lectures and create interactive Q&A sessions
        </p>
      </div>

      {/* Search Bar */}
      <div style={{
        position: 'relative',
        marginBottom: '32px'
      }}>
        <input
          type="text"
          placeholder="Search topics by name, description, or difficulty level..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '500px',
            padding: '14px 20px 14px 50px',
            border: '2px solid #E5E7EB',
            borderRadius: '12px',
            fontSize: '16px',
            fontFamily: 'Poppins, sans-serif',
            outline: 'none',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#1935CA';
            e.target.style.boxShadow = '0 0 0 3px rgba(25, 53, 202, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#E5E7EB';
            e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
          }}
        />
        <div style={{
          position: 'absolute',
          left: '18px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#9CA3AF',
          fontSize: '20px'
        }}>
          🔍
        </div>
      </div>

      {/* Topics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
        gap: '24px',
        marginBottom: '40px'
      }}>
        {filteredTopics.map(topic => (
          <div
            key={topic.id}
            onClick={() => onTopicSelect(topic)}
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: '1px solid #E5E7EB',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
              e.currentTarget.style.borderColor = course.color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              e.currentTarget.style.borderColor = '#E5E7EB';
            }}
          >
            {/* Active Sessions Badge */}
            {topic.active_sessions > 0 && (
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: '#10B981',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'white',
                  animation: 'pulse 2s infinite'
                }}></div>
                {topic.active_sessions} Live
              </div>
            )}

            {/* Difficulty Badge */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              background: getDifficultyColor(topic.difficulty),
              color: 'white',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {topic.difficulty}
            </div>

            {/* Topic Name */}
            <div style={{
              fontSize: '22px',
              fontWeight: '600',
              color: '#1F2937',
              marginBottom: '12px',
              marginTop: '12px',
              lineHeight: '1.3',
              paddingRight: topic.active_sessions > 0 ? '80px' : '60px'
            }}>
              {topic.name}
            </div>

            {/* Description */}
            <div style={{
              fontSize: '15px',
              color: '#6B7280',
              marginBottom: '24px',
              lineHeight: '1.5',
              minHeight: '45px'
            }}>
              {topic.description}
            </div>

            {/* Metrics Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '20px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: '#4B5563'
              }}>
                <span style={{ fontSize: '16px' }}>📚</span>
                <span><strong>{topic.lecture_count}</strong> lectures</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: '#4B5563'
              }}>
                <span style={{ fontSize: '16px' }}>✅</span>
                <span><strong>{topic.completion_rate}%</strong> complete</span>
              </div>
            </div>

            {/* Footer Section */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '20px',
              borderTop: '1px solid #F3F4F6'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{ 
                  fontSize: '14px', 
                  color: '#6B7280',
                  fontWeight: '500'
                }}>
                  Student Engagement:
                </div>
                <div style={{
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'white',
                  background: getEngagementColor(topic.student_engagement),
                  minWidth: '45px',
                  textAlign: 'center'
                }}>
                  {topic.student_engagement}%
                </div>
              </div>
              <div style={{
                fontSize: '13px',
                color: '#9CA3AF',
                fontWeight: '500'
              }}>
                Last: {topic.last_session}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTopics.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          color: '#6B7280'
        }}>
          <div style={{ 
            fontSize: '64px', 
            marginBottom: '24px', 
            opacity: 0.4 
          }}>
            📖
          </div>
          <h3 style={{ 
            fontSize: '24px', 
            fontWeight: '600',
            marginBottom: '12px', 
            color: '#374151' 
          }}>
            No topics found
          </h3>
          <p style={{ 
            fontSize: '16px',
            lineHeight: '1.5',
            maxWidth: '400px',
            margin: '0 auto'
          }}>
            {searchTerm ? 
              `No topics match "${searchTerm}". Try adjusting your search terms or browse all available topics.` : 
              'No topics are available for this course yet.'
            }
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                background: 'transparent',
                color: '#1935CA',
                border: '2px solid #1935CA',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                marginTop: '20px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#1935CA';
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#1935CA';
              }}
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* Summary Stats */}
      {filteredTopics.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid #E5E7EB'
        }}>
          <h4 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '16px'
          }}>
            Course Overview
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: '700', 
                color: course.color,
                marginBottom: '4px'
              }}>
                {filteredTopics.length}
              </div>
              <div style={{ fontSize: '14px', color: '#6B7280' }}>
                {filteredTopics.length === 1 ? 'Topic' : 'Topics'}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: '700', 
                color: '#10B981',
                marginBottom: '4px'
              }}>
                {filteredTopics.reduce((sum, topic) => sum + topic.active_sessions, 0)}
              </div>
              <div style={{ fontSize: '14px', color: '#6B7280' }}>
                Live Sessions
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: '700', 
                color: '#F59E0B',
                marginBottom: '4px'
              }}>
                {filteredTopics.reduce((sum, topic) => sum + topic.lecture_count, 0)}
              </div>
              <div style={{ fontSize: '14px', color: '#6B7280' }}>
                Total Lectures
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: '700', 
                color: '#8B5CF6',
                marginBottom: '4px'
              }}>
                {Math.round(filteredTopics.reduce((sum, topic) => sum + topic.student_engagement, 0) / filteredTopics.length)}%
              </div>
              <div style={{ fontSize: '14px', color: '#6B7280' }}>
                Avg. Engagement
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .topics-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LiveQnATopics;