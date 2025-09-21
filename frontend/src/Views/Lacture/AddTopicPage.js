import { useState, useEffect } from 'react';
import AddTopic from "../../Componets/Lacture/AddTopic";
import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import StarRating from "../../Componets/Lacture/StarRating";
import { getMyCourses, listTopics, deleteTopic } from "../../api/courses"; // Fixed: was myCourses
import "./AddTopicPage.css";

function AddTopicPage() {
  const [courses, setCourses] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      console.log('Loading courses and topics...');
      
      // Load courses and topics in parallel - using correct API calls
      const [coursesResponse, topicsResponse] = await Promise.all([
        getMyCourses(), // Fixed: was myCourses()
        listTopics()
      ]);
      
      console.log('Courses response:', coursesResponse.data);
      console.log('Topics response:', topicsResponse.data);
      
      // Handle different response formats for courses - getMyCourses returns direct array
      let coursesData = [];
      if (Array.isArray(coursesResponse.data)) {
        coursesData = coursesResponse.data;
      } else if (coursesResponse.data?.results && Array.isArray(coursesResponse.data.results)) {
        coursesData = coursesResponse.data.results;
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
    
    // Optionally reload all data to ensure consistency
    // This is useful if the server might modify the data or if you want to refresh course counts
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
      
      // Optionally reload courses to update topic counts in CoursesList
      // await loadData();
      
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

  // Enhance topics with course information for display
  const enrichedTopics = topics.map(topic => {
    const course = courses.find(c => c.id === topic.course);
    return {
      ...topic,
      courseName: course?.name || 'Unknown Course',
      courseCode: course?.code || 'N/A'
    };
  });

  return (
    <div>
      <div className="NavBar">
        <NavBar />
      </div>
       
      <div className="SideT">

        <div className="List">
          <CoursesList 
            courses={courses}
            loading={loading}
            onRefresh={handleRefresh}
            showTopicCounts={true}
            topics={topics}
            error={error}
          />
        </div>
      </div>
      
      <div className="BoiT">
        <Bio />
      </div>
      
      <div className="ContainerT">
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
        
        <div className="AddTopicForm">
          <AddTopic 
            onTopicCreated={handleTopicCreated}
            loading={loading}
          />
        </div>
        
        {/* Topics List Section */}
        <div className="TopicsListSection">
          <h3>Recent Topics ({enrichedTopics.length})</h3>
          {loading ? (
            <div className="loading-spinner">Loading topics...</div>
          ) : enrichedTopics.length > 0 ? (
            <div className="topics-grid">
              {enrichedTopics.slice(0, 6).map(topic => (
                <div key={topic.id} className="topic-card">
                  <div className="topic-header">
                    <h4>{topic.name}</h4>
                  </div>
                  <div className="topic-course">
                    <strong>{topic.courseCode}</strong> - {topic.courseName}
                  </div>
                  <div className="topic-description">
                    {topic.description && (
                      <p>{topic.description.length > 100 
                        ? topic.description.substring(0, 100) + '...' 
                        : topic.description}
                      </p>
                    )}
                  </div>
                  <div className="topic-meta">
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
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-topics">
              <p>No topics created yet. Create your first topic above!</p>
            </div>
          )}
          
          {enrichedTopics.length > 6 && (
            <div className="view-all-topics">
              <p>Showing 6 of {enrichedTopics.length} topics</p>
            </div>
          )}
        </div>
      </div>
    </div> 
  );
}

export default AddTopicPage;