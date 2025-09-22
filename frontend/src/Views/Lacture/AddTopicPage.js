import { useState, useEffect } from 'react';
import AddTopic from "../../Componets/Lacture/AddTopic";
import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import { getMyCourses, listTopics, deleteTopic } from "../../api/courses";
import "./AddTopicPage.css";

function AddTopicPage() {
  const [courses, setCourses] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      console.log('Loading courses and topics...');
      
      // Load courses and topics in parallel
      const [coursesResponse, topicsResponse] = await Promise.all([
        getMyCourses(),
        listTopics()
      ]);
      
      console.log('Courses response:', coursesResponse.data);
      console.log('Topics response:', topicsResponse.data);
      
      // Handle different response formats for courses
      let coursesData = [];
      if (Array.isArray(coursesResponse.data)) {
        coursesData = coursesResponse.data;
      } else if (coursesResponse.data?.results && Array.isArray(coursesResponse.data.results)) {
        coursesData = coursesResponse.data.results;
      } else if (coursesResponse.data?.courses && Array.isArray(coursesResponse.data.courses)) {
        coursesData = coursesResponse.data.courses;
      }
      
      // Handle different response formats for topics
      let topicsData = [];
      if (Array.isArray(topicsResponse.data)) {
        topicsData = topicsResponse.data;
      } else if (topicsResponse.data?.results && Array.isArray(topicsResponse.data.results)) {
        topicsData = topicsResponse.data.results;
      }
      
      setCourses(coursesData);
      setTopics(topicsData);
      
      // Auto-select first course if available
      if (coursesData.length > 0 && !selectedCourse) {
        setSelectedCourse(coursesData[0]);
      }
      
      console.log('Data loaded successfully');
      
    } catch (err) {
      console.error('Error loading data:', err);
      
      let errorMessage = 'Failed to load data';
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.detail) {
          errorMessage = data.detail;
        }
      } else if (err.response?.status) {
        switch (err.response.status) {
          case 401:
            errorMessage = 'You are not authorized to view this data';
            break;
          case 403:
            errorMessage = 'You don\'t have permission to access this data';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later';
            break;
          default:
            errorMessage = `Error ${err.response.status}: Failed to load data`;
        }
      }
      
      setError(errorMessage);
      setCourses([]);
      setTopics([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTopicCreated = async (newTopic) => {
    console.log('Topic created:', newTopic);
    
    // Add the new topic to the local state for immediate UI update
    setTopics(prev => [newTopic, ...prev]);
    setSuccess('Topic created successfully!');
    
    // Optionally reload all data to ensure consistency
    try {
      await loadData();
    } catch (err) {
      console.error('Error refreshing data after topic creation:', err);
      // Don't show error to user since the topic was created successfully
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (!window.confirm('Are you sure you want to delete this topic? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      console.log('Deleting topic:', topicId);
      
      await deleteTopic(topicId);
      console.log('Topic deleted successfully');
      
      // Remove from local state immediately for better UX
      setTopics(prev => prev.filter(topic => topic.id !== topicId));
      setSuccess('Topic deleted successfully!');
      
    } catch (err) {
      console.error('Error deleting topic:', err);
      
      let errorMessage = 'Failed to delete topic';
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.detail) {
          errorMessage = data.detail;
        }
      } else if (err.response?.status) {
        switch (err.response.status) {
          case 401:
            errorMessage = 'You are not authorized to delete topics';
            break;
          case 403:
            errorMessage = 'You don\'t have permission to delete this topic';
            break;
          case 404:
            errorMessage = 'Topic not found';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later';
            break;
          default:
            errorMessage = `Error ${err.response.status}: Failed to delete topic`;
        }
      }
      
      setError(errorMessage);
      
      // Reload data to ensure consistency after error
      await loadData();
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadData();
  };

  const handleCourseSelect = (course) => {
    console.log('Course selected for topics:', course);
    setSelectedCourse(course);
  };

  // Enhanced topics with course information for display
  const enrichedTopics = topics.map(topic => {
    const course = courses.find(c => c.id === topic.course);
    return {
      ...topic,
      courseName: course?.name || 'Unknown Course',
      courseCode: course?.code || 'N/A'
    };
  });

  // Filter topics by selected course if one is selected
  const filteredTopics = selectedCourse 
    ? enrichedTopics.filter(topic => topic.course === selectedCourse.id)
    : enrichedTopics;

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  return (
    <div>
      <div className="NavBar">
        <NavBar />
      </div>
       
      <div className="SideT">
        
          <CoursesList 
            courses={courses}
            selectedCourse={selectedCourse}
            onCourseSelect={handleCourseSelect}
            loading={loading}
            onRefresh={handleRefresh}
            title="Courses"
            compact={true}
            showStats={true}
            error={error}
          />
        
      </div>
      
      <div className="BoiT">
        <Bio />
      </div>
      
      <div className="ContainerT">
        {/* Messages */}
        {error && (
          <div className="error-message" style={{
            background: '#FEE2E2',
            border: '1px solid #FECACA',
            color: '#DC2626',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            margin: '20px 5% 0 5%',
            fontSize: '0.875rem'
          }}>
            <strong>Error:</strong> {error}
            <button 
              onClick={handleRefresh}
              style={{
                marginLeft: '10px',
                background: 'transparent',
                border: '1px solid #DC2626',
                color: '#DC2626',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        )}

        {success && (
          <div className="success-message" style={{
            background: '#D1FAE5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            margin: '20px 5% 0 5%',
            fontSize: '0.875rem'
          }}>
            {success}
          </div>
        )}
        
        <div className="AddTopicForm">
          <AddTopic 
            onTopicCreated={handleTopicCreated}
            loading={loading}
            courses={courses}
            selectedCourse={selectedCourse}
          />
        </div>
        
        {/* Topics List Section */}
        <div className="TopicsListSection">
          <div className="topics-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3>
              {selectedCourse 
                ? `Topics for ${selectedCourse.code} (${filteredTopics.length})`
                : `All Topics (${enrichedTopics.length})`
              }
            </h3>
            {selectedCourse && (
              <button 
                onClick={() => setSelectedCourse(null)}
                className="clear-filter-btn"
                style={{
                  background: 'transparent',
                  border: '1px solid #1935CA',
                  color: '#1935CA',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Show All Topics
              </button>
            )}
          </div>
          
          {loading ? (
            <div className="loading-spinner">Loading topics...</div>
          ) : filteredTopics.length > 0 ? (
            <div className="topics-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px',
              marginBottom: '20px'
            }}>
              {filteredTopics.slice(0, 6).map(topic => (
                <div key={topic.id} className="topic-card" style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}>
                  <div className="topic-header">
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
                      {topic.name}
                    </h4>
                  </div>
                  <div className="topic-course" style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    marginBottom: '8px'
                  }}>
                    <strong>{topic.courseCode}</strong> - {topic.courseName}
                  </div>
                  <div className="topic-description">
                    {topic.description && (
                      <p style={{
                        fontSize: '14px',
                        color: '#374151',
                        lineHeight: '1.4',
                        margin: '0 0 12px 0'
                      }}>
                        {topic.description.length > 100 
                          ? topic.description.substring(0, 100) + '...' 
                          : topic.description}
                      </p>
                    )}
                  </div>
                  <div className="topic-meta" style={{
                    fontSize: '12px',
                    color: '#9ca3af',
                    marginBottom: '12px'
                  }}>
                    <span className="created-date">
                      {topic.created_at 
                        ? new Date(topic.created_at).toLocaleDateString()
                        : 'Recently created'
                      }
                    </span>
                  </div>
                  <button 
                    className="delete-topic-btn"
                    onClick={() => handleDeleteTopic(topic.id)}
                    disabled={loading}
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = '#dc2626';
                      e.target.style.color = 'white';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = '#fef2f2';
                      e.target.style.color = '#dc2626';
                    }}
                  >
                    Delete Topic
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-topics" style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#6b7280'
            }}>
              <p>
                {selectedCourse 
                  ? `No topics found for ${selectedCourse.code}. Create your first topic above!`
                  : 'No topics created yet. Create your first topic above!'
                }
              </p>
            </div>
          )}
          
          {filteredTopics.length > 6 && (
            <div className="view-all-topics" style={{
              textAlign: 'center',
              padding: '20px',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              <p>Showing 6 of {filteredTopics.length} topics</p>
            </div>
          )}
        </div>
      </div>
    </div> 
  );
}

export default AddTopicPage;