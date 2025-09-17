import { useState, useEffect } from "react";
import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import PastQuizTile from "../../Componets/Lacture/PastQuizTile";
import SearchBar from "../../Componets/Lacture/SearchBar";
import StarRating from "../../Componets/Lacture/StarRating";
import { getMyAttempts } from "../../api/quizzes";
import { getMyCourses } from "../../api/courses";
import "./QuizHistory.css";

function QuizHistory() {
  const [attempts, setAttempts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");

  // Load quiz history data on component mount
  useEffect(() => {
    loadQuizHistory();
  }, []);

  const loadQuizHistory = async () => {
    try {
      setLoading(true);
      setError("");

      // Load quiz attempts and courses in parallel
      const [attemptsResponse, coursesResponse] = await Promise.all([
        getMyAttempts(),
        getMyCourses()
      ]);

      // Handle attempts data
      let attemptsData = [];
      if (Array.isArray(attemptsResponse.data)) {
        attemptsData = attemptsResponse.data;
      } else if (attemptsResponse.data?.results && Array.isArray(attemptsResponse.data.results)) {
        attemptsData = attemptsResponse.data.results;
      }

      // Handle courses data
      let coursesData = [];
      if (coursesResponse.data?.courses && Array.isArray(coursesResponse.data.courses)) {
        coursesData = coursesResponse.data.courses;
      } else if (Array.isArray(coursesResponse.data)) {
        coursesData = coursesResponse.data;
      }

      // Sort attempts by most recent first
      attemptsData.sort((a, b) => new Date(b.started_at || b.created_at) - new Date(a.started_at || a.created_at));

      setAttempts(attemptsData);
      setCourses(coursesData);

    } catch (err) {
      console.error('Error loading quiz history:', err);
      let errorMessage = 'Failed to load quiz history';
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle quiz retake
  const handleRetakeQuiz = (quiz) => {
    // Navigate to quiz taking page
    window.location.href = `/take-quiz/${quiz.id}`;
  };

  // Handle viewing attempt details
  const handleViewAttemptDetails = (attempt) => {
    // Navigate to attempt details/analytics page
    window.location.href = `/quiz-analytics/${attempt.id}`;
  };

  // Filter attempts based on search term and selected course
  const filteredAttempts = attempts.filter(attempt => {
    const quiz = attempt.quiz || {};
    const topic = quiz.topic || {};
    const course = topic.course || {};

    // Filter by search term
    const matchesSearch = !searchTerm || 
      quiz.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.name?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by selected course
    const matchesCourse = !selectedCourse || course.id === parseInt(selectedCourse);

    return matchesSearch && matchesCourse;
  });

  return (
    <div>
      <div className="NavBar">
        <NavBar />
      </div>
      <div className="SeachBar">
        <SearchBar 
          onSearch={setSearchTerm}
          placeholder="Search quiz history by title, topic, or course..."
        />
      </div>

      <div className="SideST">
        
        <div className="List">
          <CoursesList 
            courses={courses}
            selectedCourse={courses.find(c => c.id === parseInt(selectedCourse))}
            onCourseSelect={(course) => setSelectedCourse(course?.id || "")}
            loading={loading}
            onRefresh={loadQuizHistory}
          />
        </div>
      </div>

      <div className="BoiST">
        <Bio />
      </div>

      <div className="ContainerH">
        {/* Error Message */}
        {error && (
          <div className="error-message" style={{
            background: '#FEE2E2',
            border: '1px solid #FECACA',
            color: '#DC2626',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
            <button 
              onClick={() => setError('')}
              style={{
                float: 'right',
                background: 'none',
                border: 'none',
                color: '#DC2626',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Header with filters */}
        <div className="quiz-history-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div className="TitleH">
            {loading ? 'Loading...' : `Quiz History (${filteredAttempts.length})`}
          </div>
          
          {/* Course filter */}
          {courses.length > 0 && (
            <div className="course-filter">
              <select 
                value={selectedCourse} 
                onChange={(e) => setSelectedCourse(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">All Courses</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="QuizListH">
          {loading ? (
            // Loading state
            <div className="loading-state" style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#666',
              gridColumn: '1 / -1'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #1976D2',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }}></div>
              Loading your quiz history...
            </div>
          ) : filteredAttempts.length > 0 ? (
            // Show past quiz tiles
            filteredAttempts.map((attempt) => (
              <PastQuizTile
                key={attempt.id}
                attempt={attempt}
                onRetake={handleRetakeQuiz}
                onViewDetails={handleViewAttemptDetails}
                onClick={() => handleViewAttemptDetails(attempt)}
              />
            ))
          ) : (
            // Empty state
            <div className="empty-state" style={{
              textAlign: 'center',
              padding: '60px 20px',
              gridColumn: '1 / -1'
            }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '20px',
                opacity: 0.3
              }}>
                📚
              </div>
              <h3 style={{
                color: '#333',
                marginBottom: '10px',
                fontSize: '18px'
              }}>
                {searchTerm || selectedCourse ? 'No quiz history matches your filters' : 'No quiz history yet'}
              </h3>
              <p style={{
                color: '#666',
                marginBottom: '20px',
                fontSize: '14px',
                maxWidth: '400px',
                margin: '0 auto 20px'
              }}>
                {searchTerm || selectedCourse
                  ? 'Try adjusting your search terms or course filter to find what you\'re looking for.'
                  : 'Your completed quiz attempts will appear here. Take some quizzes to build your history!'
                }
              </p>
              {(searchTerm || selectedCourse) ? (
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      style={{
                        background: 'transparent',
                        color: '#1976D2',
                        border: '1px solid #1976D2',
                        padding: '10px 20px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Clear Search
                    </button>
                  )}
                  {selectedCourse && (
                    <button 
                      onClick={() => setSelectedCourse('')}
                      style={{
                        background: 'transparent',
                        color: '#1976D2',
                        border: '1px solid #1976D2',
                        padding: '10px 20px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Show All Courses
                    </button>
                  )}
                </div>
              ) : (
                <button 
                  onClick={() => window.location.href = '/dashboard'}
                  style={{
                    background: '#1976D2',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Browse Available Quizzes
                </button>
              )}
            </div>
          )}
        </div>

        {/* Stats Summary */}
        {!loading && filteredAttempts.length > 0 && (
          <div className="quiz-stats-summary" style={{
            marginTop: '40px',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '20px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976D2' }}>
                {filteredAttempts.length}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Total Attempts</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>
                {filteredAttempts.filter(a => a.is_completed).length}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Completed</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#F59E0B' }}>
                {filteredAttempts.filter(a => !a.is_completed).length}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>In Progress</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8B5CF6' }}>
                {filteredAttempts.length > 0 
                  ? Math.round(
                      filteredAttempts
                        .filter(a => a.is_completed && a.total_possible_score > 0)
                        .reduce((acc, a) => acc + (a.score / a.total_possible_score), 0) / 
                      Math.max(filteredAttempts.filter(a => a.is_completed && a.total_possible_score > 0).length, 1) * 100
                    )
                  : 0
                }%
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Average Score</div>
            </div>
          </div>
        )}
      </div>

      {/* Add CSS animation for loading spinner */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default QuizHistory;