import { useState, useEffect } from 'react';
import { getMyAttempts } from '../../api/quizzes';
import { getMyCourses } from '../../api/courses';
import { getProfile } from '../../api/auth';
import Bio from "../../Componets/Student/bio";
import CoursesList from "../../Componets/Student/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
import StarRating from "../../Componets/Student/StarRating";
import QuizResultsDisplay from '../../Componets/Student/QuizResultsDisplay';
import "./QuizAnalyticsPage.css";

function QuizAnalyticsPage() {
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch quiz attempts to find available quizzes
        const attemptsResponse = await getMyAttempts();
        const attempts = attemptsResponse.data.results || attemptsResponse.data || [];
        setQuizAttempts(attempts);

        // Set default selected quiz to the most recent completed attempt
        const completedAttempts = attempts.filter(attempt => 
          attempt.is_completed || attempt.status === 'completed'
        );
        
        if (completedAttempts.length > 0) {
          const mostRecent = completedAttempts.sort((a, b) => 
            new Date(b.created_at || b.date_created) - new Date(a.created_at || a.date_created)
          )[0];
          
          setSelectedQuizId(mostRecent.quiz_id || mostRecent.quiz);
          setSelectedAttempt(mostRecent);
        }

        // Fetch courses for sidebar
        const coursesResponse = await getMyCourses();
        const fetchedCourses = coursesResponse.data.results || coursesResponse.data || [];
        setCourses(fetchedCourses);

      } catch (err) {
        console.error('Error fetching quiz analytics data:', err);
        setError('Failed to load quiz analytics data');
        // Set default quiz ID if fetch fails
        setSelectedQuizId(1);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleQuizSelect = (attempt) => {
    setSelectedQuizId(attempt.quiz_id || attempt.quiz);
    setSelectedAttempt(attempt);
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

      <div className="SideHA">
        <div className="Rating">
          <StarRating />
        </div>
        <div className="List">
          <CoursesList courses={courses} />
        </div>
      </div>

      <div className="BoiHA">
        <Bio />
      </div>

      <div className="ContainerHA">
        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        {/* Quiz Selection Panel */}
        {quizAttempts.length > 0 && (
          <div className="quiz-selection-panel">
            <h3>Select Quiz to Analyze</h3>
            <div className="quiz-attempts-list">
              {quizAttempts
                .filter(attempt => attempt.is_completed || attempt.status === 'completed')
                .map((attempt, index) => (
                  <div
                    key={attempt.id || index}
                    className={`quiz-attempt-item ${
                      selectedAttempt?.id === attempt.id ? 'selected' : ''
                    }`}
                    onClick={() => handleQuizSelect(attempt)}
                  >
                    <div className="attempt-title">
                      {attempt.quiz_title || `Quiz ${attempt.quiz_id || attempt.quiz}`}
                    </div>
                    <div className="attempt-meta">
                      <span className="attempt-score">
                        Score: {attempt.score || 0}%
                      </span>
                      <span className="attempt-date">
                        {new Date(attempt.created_at || attempt.date_created).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="QuizResultsWrapper">
          {selectedQuizId ? (
            <QuizResultsDisplay 
              quizId={selectedQuizId} 
              attemptData={selectedAttempt}
            />
          ) : (
            <div className="no-quiz-selected">
              <h3>No Completed Quizzes</h3>
              <p>Complete some quizzes to see detailed analytics here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuizAnalyticsPage;