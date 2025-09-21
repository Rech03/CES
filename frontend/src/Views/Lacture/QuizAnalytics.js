import { useState, useEffect } from 'react';
import { listQuizzes } from '../../api/quizzes';
import { getMyCourses } from '../../api/courses';
import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import SearchBar from "../../Componets/Lacture/SearchBar";
import StarRating from "../../Componets/Lacture/StarRating";
import QuizAnalysisComponent from '../../Componets/Lacture/QuizAnalysisComponent';
import "./QuizAnalytics.css";

function QuizAnalytics() {
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch courses and quizzes in parallel
        const [coursesResponse, quizzesResponse] = await Promise.all([
          getMyCourses().catch(err => {
            console.warn('Could not fetch courses:', err);
            return { data: [] };
          }),
          listQuizzes().catch(err => {
            console.warn('Could not fetch quizzes:', err);
            return { data: [] };
          })
        ]);

        const fetchedCourses = coursesResponse.data.results || coursesResponse.data || [];
        const fetchedQuizzes = quizzesResponse.data.results || quizzesResponse.data || [];

        setCourses(fetchedCourses);
        setQuizzes(fetchedQuizzes);

        // Set default selected quiz to the first quiz with attempts
        const quizWithAttempts = fetchedQuizzes.find(quiz => 
          quiz.attempt_count > 0 || quiz.total_attempts > 0
        );
        
        if (quizWithAttempts) {
          setSelectedQuizId(quizWithAttempts.id);
        } else if (fetchedQuizzes.length > 0) {
          setSelectedQuizId(fetchedQuizzes[0].id);
        }

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load quiz data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter quizzes based on search term and selected course
  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCourse = selectedCourse === 'all' || 
                         quiz.topic_id === parseInt(selectedCourse) ||
                         quiz.course_id === parseInt(selectedCourse);
    
    return matchesSearch && matchesCourse;
  });

  const handleQuizSelect = (quizId) => {
    setSelectedQuizId(quizId);
  };

  const handleCourseFilter = (courseId) => {
    setSelectedCourse(courseId);
  };

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
        <div className="List">
          <CoursesList courses={courses} />
        </div>
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
              <select 
                value={selectedCourse} 
                onChange={(e) => handleCourseFilter(e.target.value)}
                className="course-filter"
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
                  key={quiz.id}
                  className={`quiz-item ${selectedQuizId === quiz.id ? 'selected' : ''}`}
                  onClick={() => handleQuizSelect(quiz.id)}
                >
                  <div className="quiz-title">{quiz.title}</div>
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
                {quizzes.length === 0 && (
                  <p>Create your first quiz to see analytics here!</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quiz Analysis */}
        <div className="QuizAnliysis">
          {selectedQuizId ? (
            <QuizAnalysisComponent quizId={selectedQuizId} />
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
    </div> 
  );
}

export default QuizAnalytics;