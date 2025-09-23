import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { listQuizzes } from '../../api/quizzes';
import { getQuizzesForReview, getAdaptiveSlideStats } from '../../api/ai-quiz';
import { getMyCourses } from '../../api/courses';
import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import SearchBar from "../../Componets/Lacture/SearchBar";
import StarRating from "../../Componets/Lacture/StarRating";
import QuizAnalysisComponent from '../../Componets/Lacture/QuizAnalysisComponent';
import "./QuizAnalytics.css";

function QuizAnalytics() {
  const { quizId: urlQuizId } = useParams(); // Get quiz ID from URL if available
  const [selectedQuizId, setSelectedQuizId] = useState(urlQuizId || null);
  const [quizzes, setQuizzes] = useState([]);
  const [aiQuizzes, setAiQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [quizType, setQuizType] = useState('all'); // 'all', 'traditional', 'ai'

  useEffect(() => {
    fetchData();
  }, []);

  // Set selected quiz when URL param changes
  useEffect(() => {
    if (urlQuizId && urlQuizId !== selectedQuizId) {
      setSelectedQuizId(urlQuizId);
    }
  }, [urlQuizId, selectedQuizId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [coursesResponse, traditionalQuizzesResponse, aiQuizzesResponse] = await Promise.all([
        getMyCourses().catch(err => {
          console.warn('Could not fetch courses:', err);
          return { data: [] };
        }),
        listQuizzes().catch(err => {
          console.warn('Could not fetch traditional quizzes:', err);
          return { data: [] };
        }),
        getQuizzesForReview().catch(err => {
          console.warn('Could not fetch AI quizzes:', err);
          return { data: [] };
        })
      ]);

      // Process courses
      const fetchedCourses = coursesResponse.data.results || 
                            coursesResponse.data.courses || 
                            coursesResponse.data || 
                            [];

      // Process traditional quizzes
      const fetchedTraditionalQuizzes = traditionalQuizzesResponse.data.results || 
                                       traditionalQuizzesResponse.data || 
                                       [];

      // Process AI quizzes
      let fetchedAiQuizzes = aiQuizzesResponse.data.results || 
                            aiQuizzesResponse.data || 
                            [];

      // Normalize AI quiz data structure
      fetchedAiQuizzes = fetchedAiQuizzes.map(quiz => ({
        ...quiz,
        id: quiz.id || quiz.adaptive_quiz_id || quiz.quiz_id,
        type: 'ai',
        title: quiz.title || quiz.quiz_title || 'AI Generated Quiz',
        attempt_count: quiz.attempt_count || quiz.total_attempts || 0,
        total_attempts: quiz.total_attempts || quiz.attempt_count || 0,
        topic_name: quiz.topic_name || quiz.topic?.name || 'Unknown Topic',
        course_name: quiz.course_name || quiz.topic?.course?.name || quiz.course?.name || 'Unknown Course',
        course_id: quiz.course_id || quiz.topic?.course?.id || quiz.course?.id,
        created_at: quiz.created_at || quiz.date_created || new Date().toISOString()
      }));

      // Add type indicator to traditional quizzes
      const normalizedTraditionalQuizzes = fetchedTraditionalQuizzes.map(quiz => ({
        ...quiz,
        type: 'traditional'
      }));

      setCourses(fetchedCourses);
      setQuizzes(normalizedTraditionalQuizzes);
      setAiQuizzes(fetchedAiQuizzes);

      // Auto-select quiz based on URL or default selection
      if (urlQuizId) {
        // Check if the URL quiz ID exists in either quiz type
        const foundTraditional = normalizedTraditionalQuizzes.find(q => q.id === urlQuizId);
        const foundAi = fetchedAiQuizzes.find(q => q.id === urlQuizId);
        
        if (foundTraditional || foundAi) {
          setSelectedQuizId(urlQuizId);
        } else {
          console.warn(`Quiz with ID ${urlQuizId} not found`);
          // Fall back to first available quiz
          const allQuizzes = [...normalizedTraditionalQuizzes, ...fetchedAiQuizzes];
          const firstQuizWithAttempts = allQuizzes.find(quiz => 
            (quiz.attempt_count || quiz.total_attempts || 0) > 0
          );
          
          if (firstQuizWithAttempts) {
            setSelectedQuizId(firstQuizWithAttempts.id);
          } else if (allQuizzes.length > 0) {
            setSelectedQuizId(allQuizzes[0].id);
          }
        }
      } else {
        // No URL quiz ID, select first quiz with attempts
        const allQuizzes = [...normalizedTraditionalQuizzes, ...fetchedAiQuizzes];
        const quizWithAttempts = allQuizzes.find(quiz => 
          (quiz.attempt_count || quiz.total_attempts || 0) > 0
        );
        
        if (quizWithAttempts) {
          setSelectedQuizId(quizWithAttempts.id);
        } else if (allQuizzes.length > 0) {
          setSelectedQuizId(allQuizzes[0].id);
        }
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load quiz data');
    } finally {
      setLoading(false);
    }
  };

  // Combine and filter quizzes based on search term, selected course, and quiz type
  const getAllQuizzes = () => {
    let allQuizzes = [];
    
    if (quizType === 'all' || quizType === 'traditional') {
      allQuizzes = [...allQuizzes, ...quizzes];
    }
    
    if (quizType === 'all' || quizType === 'ai') {
      allQuizzes = [...allQuizzes, ...aiQuizzes];
    }
    
    return allQuizzes;
  };

  const filteredQuizzes = getAllQuizzes().filter(quiz => {
    const matchesSearch = quiz.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.topic_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.course_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCourse = selectedCourse === 'all' || 
                         quiz.topic_id === parseInt(selectedCourse) ||
                         quiz.course_id === parseInt(selectedCourse);
    
    return matchesSearch && matchesCourse;
  });

  const handleQuizSelect = (quizId) => {
    setSelectedQuizId(quizId);
    // Update URL without page reload
    window.history.pushState({}, '', `/quiz-analytics/${quizId}`);
  };

  const handleCourseFilter = (courseId) => {
    setSelectedCourse(courseId);
  };

  const handleQuizTypeFilter = (type) => {
    setQuizType(type);
  };

  // Get the selected quiz details
  const selectedQuiz = getAllQuizzes().find(q => q.id === selectedQuizId);

  if (loading) {
    return (
      <div>
        <div className="NavBar">
          <NavBar />
        </div>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading quiz analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="NavBar">
        <NavBar />
      </div>

      <div className="SideH">
        <div className="Rating">
          <StarRating />
        </div>
        
          <CoursesList courses={courses} />
        
      </div>
      
      <div className="BoiH">
        <Bio />
      </div>
      
      <div className="ContainerH">
        {/* Quiz Selection Panel */}
        <div className="quiz-selection-panel">
          <div className="selection-header">
            <h3>Select Quiz for Analysis</h3>
            <div className="selection-controls">
              <SearchBar 
                placeholder="Search quizzes..."
                value={searchTerm}
                onChange={setSearchTerm}
              />
              
              {/* Quiz Type Filter */}
              <select 
                value={quizType} 
                onChange={(e) => handleQuizTypeFilter(e.target.value)}
                className="quiz-type-filter"
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  marginLeft: '10px'
                }}
              >
                <option value="all">All Quiz Types</option>
                <option value="traditional">Traditional Quizzes</option>
                <option value="ai">AI Generated Quizzes</option>
              </select>
              
              <select 
                value={selectedCourse} 
                onChange={(e) => handleCourseFilter(e.target.value)}
                className="course-filter"
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  marginLeft: '10px'
                }}
              >
                <option value="all">All Courses</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.code || course.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="quiz-list">
            {filteredQuizzes.length > 0 ? (
              filteredQuizzes.map(quiz => (
                <div 
                  key={`${quiz.type}_${quiz.id}`}
                  className={`quiz-item ${selectedQuizId === quiz.id ? 'selected' : ''} ${quiz.type === 'ai' ? 'ai-quiz-item' : ''}`}
                  onClick={() => handleQuizSelect(quiz.id)}
                >
                  <div className="quiz-title">
                    {quiz.type === 'ai' && (
                      <span className="ai-badge" style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '8px',
                        fontSize: '10px',
                        fontWeight: '600',
                        marginRight: '8px'
                      }}>
                        🤖 AI
                      </span>
                    )}
                    {quiz.title}
                  </div>
                  <div className="quiz-meta">
                    <span className="quiz-course">
                      {quiz.topic_name || quiz.course_name || 'Unknown Course'}
                    </span>
                    <span className="quiz-attempts">
                      {quiz.attempt_count || quiz.total_attempts || 0} attempts
                    </span>
                  </div>
                  <div className="quiz-date">
                    Created: {new Date(quiz.created_at || quiz.date_created).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-quizzes">
                <p>No quizzes found matching your criteria.</p>
                {getAllQuizzes().length === 0 && (
                  <p>Create your first quiz to see analytics here!</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quiz Analysis */}
        <div className="QuizAnliysis">
          {selectedQuizId ? (
            <div>
              {/* Quiz Type Indicator */}
              {selectedQuiz && (
                <div className="quiz-analysis-header" style={{
                  marginBottom: '20px',
                  padding: '15px',
                  backgroundColor: selectedQuiz.type === 'ai' ? '#f8f4ff' : '#f0f9ff',
                  borderRadius: '8px',
                  border: selectedQuiz.type === 'ai' ? '1px solid #e9d8fd' : '1px solid #dbeafe'
                }}>
                  <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {selectedQuiz.type === 'ai' && <span>🤖</span>}
                    {selectedQuiz.title}
                    <span style={{
                      background: selectedQuiz.type === 'ai' ? 
                        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                        '#1976D2',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {selectedQuiz.type === 'ai' ? 'AI Generated' : 'Traditional'}
                    </span>
                  </h2>
                  <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                    {selectedQuiz.topic_name || selectedQuiz.course_name} • 
                    {selectedQuiz.attempt_count || selectedQuiz.total_attempts || 0} attempts
                  </p>
                </div>
              )}
              
              <QuizAnalysisComponent 
                quizId={selectedQuizId} 
                isAIQuiz={selectedQuiz?.type === 'ai'}
              />
            </div>
          ) : (
            <div className="no-quiz-selected">
              <h3>Select a Quiz</h3>
              <p>Choose a quiz from the list to view detailed analytics and performance data.</p>
              {error && (
                <div className="error-message">
                  <p>{error}</p>
                  <button onClick={() => window.location.reload()}>Retry</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .ai-quiz-item {
          border-left: 4px solid transparent;
          background: linear-gradient(white, white) padding-box,
                      linear-gradient(135deg, #667eea 0%, #764ba2 100%) border-box;
        }
        
        .ai-quiz-item.selected {
          background: linear-gradient(#f8f4ff, #f8f4ff) padding-box,
                      linear-gradient(135deg, #667eea 0%, #764ba2 100%) border-box;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #1976D2;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          color: #666;
        }
      `}</style>
    </div> 
  );
}

export default QuizAnalytics;