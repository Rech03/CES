import { useState, useEffect } from 'react';
import { getAvailableQuizzes, getMyAttempts } from '../../api/quizzes';
import { getMyCourses } from '../../api/courses';
import { getProfile } from '../../api/users';
import Bio from "../../Componets/Lacture/bio";
import Biography from "../../Componets/Student/Biography";
import CoursesList from "../../Componets/Student/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
import QuizTile from "../../Componets/Student/QuizTile";
import SearchBar from "../../Componets/Student/SearchBar";
import StarRating from "../../Componets/Student/StarRating";
import "./Dashboard.css";

function Dashboard() {
  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [userAttempts, setUserAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllQuizzes, setShowAllQuizzes] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch available quizzes, courses, and user attempts in parallel
        const [quizzesResponse, coursesResponse, attemptsResponse] = await Promise.all([
          getAvailableQuizzes().catch(err => {
            console.warn('Could not fetch quizzes:', err);
            return { data: [] };
          }),
          getMyCourses().catch(err => {
            console.warn('Could not fetch courses:', err);
            return { data: [] };
          }),
          getMyAttempts().catch(err => {
            console.warn('Could not fetch attempts:', err);
            return { data: [] };
          })
        ]);

        // Process quiz data from API response
        const fetchedQuizzes = Array.isArray(quizzesResponse.data) 
          ? quizzesResponse.data 
          : quizzesResponse.data?.results || [];

        const fetchedCourses = Array.isArray(coursesResponse.data)
          ? coursesResponse.data
          : coursesResponse.data?.results || [];

        const fetchedAttempts = Array.isArray(attemptsResponse.data)
          ? attemptsResponse.data
          : attemptsResponse.data?.results || [];

        setUserAttempts(fetchedAttempts);

        // Create a map of quiz attempts for quick lookup
        const attemptsByQuiz = {};
        fetchedAttempts.forEach(attempt => {
          const quizId = attempt.quiz || attempt.quiz_id;
          if (!attemptsByQuiz[quizId]) {
            attemptsByQuiz[quizId] = [];
          }
          attemptsByQuiz[quizId].push(attempt);
        });

        // Process quizzes with attempt information
        const processedQuizzes = fetchedQuizzes.map(quiz => {
          const quizAttempts = attemptsByQuiz[quiz.id] || [];
          const completedAttempts = quizAttempts.filter(attempt => 
            attempt.is_completed || attempt.status === 'completed'
          );
          
          // Calculate best score from completed attempts
          let bestScore = null;
          if (completedAttempts.length > 0) {
            const scores = completedAttempts.map(attempt => attempt.score || 0);
            bestScore = Math.max(...scores);
          }

          // Determine quiz status
          let status = 'available';
          if (completedAttempts.length > 0) {
            status = 'completed';
          } else if (quiz.is_live === false && quiz.due_date && new Date(quiz.due_date) < new Date()) {
            status = 'missed';
          } else if (!quiz.is_live && quiz.scheduled_start && new Date(quiz.scheduled_start) > new Date()) {
            status = 'locked';
          }

          return {
            id: quiz.id,
            title: quiz.title || 'Untitled Quiz',
            duration: quiz.time_limit ? `${quiz.time_limit} min` : '20 min',
            course: quiz.topic?.course?.name || quiz.course_name || 'Unknown Course',
            courseId: quiz.topic?.course?.id || quiz.course_id,
            courseCode: quiz.topic?.course?.code?.toLowerCase() || 'default',
            difficulty: quiz.difficulty || 'Medium',
            questionCount: quiz.total_questions || quiz.question_count || 10,
            isLive: quiz.is_live || false,
            dueDate: quiz.due_date ? `Due: ${new Date(quiz.due_date).toLocaleDateString()}` : null,
            attempts: `${quizAttempts.length}/${quiz.max_attempts || 3}`,
            maxAttempts: quiz.max_attempts || 3,
            bestScore: bestScore ? `${bestScore}%` : null,
            description: quiz.description,
            status: status,
            password: quiz.password,
            scheduledStart: quiz.scheduled_start
          };
        });

        setQuizzes(processedQuizzes);
        setCourses(fetchedCourses);

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Filter quizzes based on search term
  const filteredQuizzes = quizzes.filter(quiz =>
    quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.course.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Only show live quizzes and available quizzes
  const availableQuizzes = filteredQuizzes.filter(quiz => 
    quiz.isLive || quiz.status === 'available' || quiz.status === 'completed'
  );

  // Determine how many quizzes to show
  const quizzesToShow = showAllQuizzes ? availableQuizzes : availableQuizzes.slice(0, 6);

  const handleViewAll = () => {
    setShowAllQuizzes(!showAllQuizzes);
  };

  if (loading) {
    return (
      <div>
        <div className="NavBar">
          <NavBar />
        </div>
        <div className="loading-dashboard">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="NavBar">
        <NavBar />
      </div>
      <div className="SeachBar">
        <SearchBar 
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search quizzes..."
        />
      </div>
      
      {/* Main Container */}
      <div className="ContainerD">
        {/* Biography Section */}
        <div className="Boigraphy">
          <Biography />
        </div>

        {/* Quiz Section Header */}
        <div className="quiz-header1">
          <div className="Title">
            Quiz List 
            {searchTerm && (
              <span className="search-results">
                ({availableQuizzes.length} result{availableQuizzes.length !== 1 ? 's' : ''})
              </span>
            )}
          </div>
          <div className="More" onClick={handleViewAll}>
            {showAllQuizzes ? 'Show Less' : 'View All'}
          </div>
        </div>

        {/* Quiz Grid */}
        <div className="QuizList">
          {quizzesToShow.length > 0 ? (
            quizzesToShow.map(quiz => (
              <QuizTile
                key={quiz.id}
                quizId={quiz.id}
                title={quiz.title}
                duration={quiz.duration}
                totalQuestions={quiz.questionCount}
                dueDate={quiz.dueDate || (quiz.isLive ? 'Live Quiz' : 'No due date')}
                status={quiz.status}
                courseCode={quiz.courseCode}
                difficulty={quiz.difficulty}
                attempts={quiz.attempts}
                bestScore={quiz.bestScore}
                onStartQuiz={() => {
                  // Navigate to countdown page with quiz data
                  window.location.href = `/QuizCountdownPage?quizId=${quiz.id}`;
                }}
                onViewResults={() => {
                  // Navigate to analytics page
                  window.location.href = `/QuizAnalyticsPage?quizId=${quiz.id}`;
                }}
              />
            ))
          ) : (
            <div className="no-quizzes">
              <div style={{
                fontSize: '48px',
                marginBottom: '20px',
                opacity: 0.3
              }}>
                📚
              </div>
              {searchTerm ? (
                <p>No quizzes found matching "{searchTerm}"</p>
              ) : availableQuizzes.length === 0 ? (
                
                <p style={{
                color: '#333',
                marginBottom: '10px',
                fontSize: '18px'
              }}>No live or available quizzes at the moment. Check back later!</p>
        
              ) : (
                <p>No quizzes available at the moment.</p>
              )}
               
              
              
            </div>
          )}
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}
      </div>

      {/* Side panel */}
      <div className="SideD">
        <div className="Rating">
          <StarRating />
        </div>
        <div className="List">
          <CoursesList courses={courses} />
        </div>
      </div>
      
      <div className="BoiD">
        <Bio />
      </div>
    </div>
  );
}

export default Dashboard;