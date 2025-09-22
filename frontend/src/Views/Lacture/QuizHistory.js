import { useState, useEffect } from "react";
import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import PastQuizTile from "../../Componets/Lacture/PastQuizTile";
import SearchBar from "../../Componets/Lacture/SearchBar";
import StarRating from "../../Componets/Lacture/StarRating";
import { 
  studentAdaptiveProgress,
  studentAvailableSlides,
  getAdaptiveQuiz 
} from "../../api/ai-quiz";
import { getMyCourses } from "../../api/courses";
import { useNavigate } from "react-router-dom";
import "./QuizHistory.css";

function QuizHistory() {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    loadAIQuizHistory();
  }, []);

  const loadAIQuizHistory = async () => {
    try {
      setLoading(true);
      setError("");
      setDebugInfo(null);

      console.log('=== LOADING AI QUIZ HISTORY ===');

      // First, try to get courses (this usually works)
      console.log('1. Fetching courses...');
      const coursesResponse = await getMyCourses();
      console.log('Courses response:', coursesResponse);

      let coursesData = [];
      if (coursesResponse.data?.courses && Array.isArray(coursesResponse.data.courses)) {
        coursesData = coursesResponse.data.courses;
      } else if (Array.isArray(coursesResponse.data)) {
        coursesData = coursesResponse.data;
      }
      setCourses(coursesData);
      console.log('Processed courses:', coursesData);

      // Try multiple approaches to get AI quiz data
      let progressData = [];
      let debugMessages = [];

      // Method 1: Try studentAdaptiveProgress
      try {
        console.log('2. Trying studentAdaptiveProgress...');
        const progressResponse = await studentAdaptiveProgress();
        console.log('Progress response:', progressResponse);
        
        if (Array.isArray(progressResponse.data)) {
          progressData = progressResponse.data;
        } else if (progressResponse.data?.results) {
          progressData = progressResponse.data.results;
        } else if (progressResponse.data?.progress) {
          progressData = progressResponse.data.progress;
        }
        
        debugMessages.push(`✅ studentAdaptiveProgress: Found ${progressData.length} items`);
      } catch (err) {
        console.error('studentAdaptiveProgress failed:', err);
        debugMessages.push(`❌ studentAdaptiveProgress: ${err.response?.status} - ${err.response?.data?.detail || err.message}`);
      }

      // Method 2: Try studentAvailableSlides if no progress data
      if (progressData.length === 0) {
        try {
          console.log('3. Trying studentAvailableSlides...');
          const slidesResponse = await studentAvailableSlides();
          console.log('Slides response:', slidesResponse);
          
          let slidesData = [];
          if (Array.isArray(slidesResponse.data)) {
            slidesData = slidesResponse.data;
          } else if (slidesResponse.data?.slides) {
            slidesData = slidesResponse.data.slides;
          }
          
          // Transform slides into attempt-like format
          progressData = slidesData
            .filter(slide => slide.quiz_id || slide.adaptive_quiz_id)
            .map(slide => ({
              id: slide.id,
              quiz: {
                id: slide.quiz_id || slide.adaptive_quiz_id,
                title: slide.title || slide.slide_title || 'AI Generated Quiz',
                topic: {
                  name: slide.topic_name || 'Unknown Topic',
                  course: {
                    id: slide.course_id,
                    code: slide.course_code || 'UNKNOWN',
                    name: slide.course_name || 'Unknown Course'
                  }
                }
              },
              is_completed: false, // We don't know completion status from slides
              started_at: slide.created_at || slide.upload_date,
              score: 0,
              total_possible_score: 0
            }));
          
          debugMessages.push(`✅ studentAvailableSlides: Found ${slidesData.length} slides, ${progressData.length} with quizzes`);
        } catch (err) {
          console.error('studentAvailableSlides failed:', err);
          debugMessages.push(`❌ studentAvailableSlides: ${err.response?.status} - ${err.response?.data?.detail || err.message}`);
        }
      }

      // Method 3: Try to get individual quiz details if we have quiz IDs
      if (progressData.length > 0) {
        console.log('4. Enriching quiz data...');
        for (let i = 0; i < Math.min(progressData.length, 5); i++) { // Limit to first 5 to avoid too many requests
          const attempt = progressData[i];
          if (attempt.quiz?.id) {
            try {
              const quizDetails = await getAdaptiveQuiz(attempt.quiz.id);
              console.log(`Quiz ${attempt.quiz.id} details:`, quizDetails);
              
              // Enrich the attempt data with quiz details
              progressData[i] = {
                ...attempt,
                quiz: {
                  ...attempt.quiz,
                  ...quizDetails.data,
                  title: quizDetails.data.title || attempt.quiz.title
                }
              };
            } catch (err) {
              console.warn(`Failed to get details for quiz ${attempt.quiz.id}:`, err);
            }
          }
        }
      }

      // Transform progress data into attempt format
      const transformedAttempts = progressData.map(progress => ({
        id: progress.id || `attempt_${Date.now()}_${Math.random()}`,
        quiz: {
          id: progress.quiz?.id || progress.adaptive_quiz_id || progress.quiz_id,
          title: progress.quiz?.title || 
                 progress.quiz_title || 
                 progress.slide_title || 
                 progress.title ||
                 "AI Generated Quiz",
          topic: {
            name: progress.quiz?.topic?.name ||
                  progress.topic_name || 
                  progress.slide_topic ||
                  "Unknown Topic",
            course: {
              id: progress.quiz?.topic?.course?.id || progress.course_id,
              code: progress.quiz?.topic?.course?.code || progress.course_code || "UNKNOWN",
              name: progress.quiz?.topic?.course?.name || progress.course_name || "Unknown Course"
            }
          },
          total_questions: progress.quiz?.total_questions || progress.total_questions || progress.questions_count || 5,
          difficulty: progress.quiz?.difficulty || progress.difficulty || progress.level || "medium"
        },
        score: progress.score || progress.current_score || 0,
        total_possible_score: progress.total_possible_score || 
                             progress.max_score || 
                             ((progress.total_questions || 5) * 2),
        is_completed: progress.is_completed || progress.completed || false,
        started_at: progress.started_at || 
                   progress.created_at || 
                   progress.last_attempt_at ||
                   new Date().toISOString(),
        completed_at: progress.completed_at || progress.finished_at,
        attempt_count: progress.attempt_count || 1,
        percentage: progress.percentage || 
                   (progress.score && progress.total_possible_score ? 
                    Math.round((progress.score / progress.total_possible_score) * 100) : 0)
      }));

      // Sort by most recent
      transformedAttempts.sort((a, b) => 
        new Date(b.started_at || 0) - new Date(a.started_at || 0)
      );

      setAttempts(transformedAttempts);
      
      // Set debug info
      setDebugInfo({
        methods: debugMessages,
        totalAttempts: transformedAttempts.length,
        courses: coursesData.length,
        rawProgressData: progressData.length > 0 ? progressData[0] : null
      });

      console.log('Final transformed attempts:', transformedAttempts);

    } catch (err) {
      console.error('Error loading AI quiz history:', err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          err.message ||
                          'Failed to load AI quiz history';
      setError(errorMessage);
      
      // Set debug info even on error
      setDebugInfo({
        error: errorMessage,
        status: err.response?.status,
        fullError: err.response?.data
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle quiz retake
  const handleRetakeQuiz = (quiz) => {
    navigate(`/take-ai-quiz/${quiz.id}`);
  };

  // Handle viewing attempt details
  const handleViewAttemptDetails = (attempt) => {
    navigate(`/quiz-analytics/${attempt.quiz.id}`);
  };

  // Filter attempts
  const filteredAttempts = attempts.filter(attempt => {
    const quiz = attempt.quiz || {};
    const topic = quiz.topic || {};
    const course = topic.course || {};

    const matchesSearch = !searchTerm || 
      quiz.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.name?.toLowerCase().includes(searchTerm.toLowerCase());

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
          placeholder="Search AI quiz history by title, topic, or course..."
        />
      </div>

      <div className="SideST">
        
          <CoursesList 
            courses={courses}
            selectedCourse={courses.find(c => c.id === parseInt(selectedCourse))}
            onCourseSelect={(course) => setSelectedCourse(course?.id || "")}
            loading={loading}
            onRefresh={loadAIQuizHistory}
          />
      
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

        {/* Header */}
        <div className="quiz-history-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div className="TitleH">
            {loading ? 'Loading...' : `AI Quiz History (${filteredAttempts.length})`}
          </div>
          
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
              Loading your AI quiz history...
            </div>
          ) : filteredAttempts.length > 0 ? (
            filteredAttempts.map((attempt) => (
              <PastQuizTile
                key={`ai_attempt_${attempt.id}`}
                attempt={attempt}
                onRetake={handleRetakeQuiz}
                onViewDetails={handleViewAttemptDetails}
                onClick={() => handleViewAttemptDetails(attempt)}
                isAIQuiz={true}
              />
            ))
          ) : (
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
                  ? 'Try adjusting your search terms or course filter.'
                  : 'Your completed quizzes will appear here. Take some time a create  quizzes for your students!'
                }
              </p>
              <button 
                onClick={() => navigate('/LecturerDashboard')}
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
            </div>
          )}
        </div>
      </div>

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