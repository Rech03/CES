import { useState, useEffect } from 'react';
import { getAvailableQuizzes } from '../../api/quizzes';
import { getMyCourses } from '../../api/courses';
import { studentDashboard } from '../../api/analytics';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllQuizzes, setShowAllQuizzes] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch available quizzes and courses in parallel
        const [quizzesResponse, coursesResponse] = await Promise.all([
          getAvailableQuizzes().catch(err => {
            console.warn('Could not fetch quizzes:', err);
            return { data: [] };
          }),
          getMyCourses().catch(err => {
            console.warn('Could not fetch courses:', err);
            return { data: [] };
          })
        ]);

        const fetchedQuizzes = quizzesResponse.data.results || quizzesResponse.data || [];
        const fetchedCourses = coursesResponse.data.results || coursesResponse.data || [];

        // Process quizzes with additional data
        const processedQuizzes = fetchedQuizzes.map(quiz => ({
          id: quiz.id,
          title: quiz.title || 'Untitled Quiz',
          duration: quiz.duration || `${quiz.time_limit || 20} min`,
          course: quiz.course_name || quiz.topic_name || 'Unknown Course',
          courseId: quiz.course_id || quiz.topic_id,
          difficulty: quiz.difficulty || 'Medium',
          questionCount: quiz.question_count || quiz.total_questions || 10,
          isLive: quiz.is_live || false,
          dueDate: quiz.due_date,
          attempts: quiz.attempt_count || 0,
          maxAttempts: quiz.max_attempts,
          description: quiz.description,
          status: quiz.status || 'available'
        }));

        setQuizzes(processedQuizzes);
        setCourses(fetchedCourses);

        // If no quizzes found, use fallback data for demonstration
        if (processedQuizzes.length === 0) {
          const fallbackQuizzes = [
            {
              id: 1,
              title: 'CSC3002F - Parallel Programming',
              duration: '20 min',
              course: 'Parallel Programming',
              difficulty: 'Medium',
              questionCount: 15
            },
            {
              id: 2,
              title: 'CSC2001F - Data Structures',
              duration: '25 min',
              course: 'Data Structures',
              difficulty: 'Hard',
              questionCount: 20
            },
            {
              id: 3,
              title: 'CSC3003S - Computer Systems',
              duration: '15 min',
              course: 'Computer Systems',
              difficulty: 'Easy',
              questionCount: 12
            },
            {
              id: 4,
              title: 'CSC1015F - Computer Science',
              duration: '30 min',
              course: 'Computer Science',
              difficulty: 'Medium',
              questionCount: 25
            },
            {
              id: 5,
              title: 'CSC3022F - Machine Learning',
              duration: '45 min',
              course: 'Machine Learning',
              difficulty: 'Expert',
              questionCount: 30
            },
            {
              id: 6,
              title: 'CSC3021F - Software Engineering',
              duration: '35 min',
              course: 'Software Engineering',
              difficulty: 'Hard',
              questionCount: 22
            }
          ];
          setQuizzes(fallbackQuizzes);
        }

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

  // Determine how many quizzes to show
  const quizzesToShow = showAllQuizzes ? filteredQuizzes : filteredQuizzes.slice(0, 6);

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
      
      {/* Main Container - everything inside will be contained */}
      <div className="ContainerD">
        {/* Biography Section */}
        <div className="Boigraphy">
          <Biography />
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        {/* Quiz Section Header */}
        <div className="quiz-header1">
          <div className="Title">
            Quiz List 
            {searchTerm && (
              <span className="search-results">
                ({filteredQuizzes.length} result{filteredQuizzes.length !== 1 ? 's' : ''})
              </span>
            )}
          </div>
          <div className="More" onClick={handleViewAll}>
            {showAllQuizzes ? 'Show Less' : 'View All'}
          </div>
        </div>

        {/* Quiz Grid - exactly 3 per row */}
        <div className="QuizList">
          {quizzesToShow.length > 0 ? (
            quizzesToShow.map(quiz => (
              <QuizTile
                key={quiz.id}
                quizId={quiz.id}
                title={quiz.title}
                duration={quiz.duration}
                course={quiz.course}
                difficulty={quiz.difficulty}
                questionCount={quiz.questionCount}
                isLive={quiz.isLive}
                dueDate={quiz.dueDate}
                attempts={quiz.attempts}
                maxAttempts={quiz.maxAttempts}
                description={quiz.description}
                status={quiz.status}
              />
            ))
          ) : (
            <div className="no-quizzes">
              {searchTerm ? (
                <p>No quizzes found matching "{searchTerm}"</p>
              ) : (
                <p>No quizzes available at the moment.</p>
              )}
            </div>
          )}
        </div>

        {/* Show pagination info */}
        {filteredQuizzes.length > 6 && (
          <div className="quiz-pagination-info">
            Showing {quizzesToShow.length} of {filteredQuizzes.length} quiz{filteredQuizzes.length !== 1 ? 'es' : ''}
          </div>
        )}
      </div>

      {/* Side panel remains outside */}
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