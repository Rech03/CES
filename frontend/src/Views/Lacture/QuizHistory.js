import { useState, useEffect } from "react";
import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import PastQuizTile from "../../Componets/Lacture/PastQuizTile";
import SearchBar from "../../Componets/Lacture/SearchBar";
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

      const coursesResponse = await getMyCourses();
      let coursesData = [];
      if (coursesResponse.data?.courses && Array.isArray(coursesResponse.data.courses)) {
        coursesData = coursesResponse.data.courses;
      } else if (Array.isArray(coursesResponse.data)) {
        coursesData = coursesResponse.data;
      }
      setCourses(coursesData);

      // 1) Attempts/Progress (if any)
      let progressData = [];
      const debugMessages = [];

      try {
        const progressResponse = await studentAdaptiveProgress();
        if (Array.isArray(progressResponse.data)) {
          progressData = progressResponse.data;
        } else if (progressResponse.data?.results) {
          progressData = progressResponse.data.results;
        } else if (progressResponse.data?.progress) {
          progressData = progressResponse.data.progress;
        }
        debugMessages.push(`✅ studentAdaptiveProgress: Found ${progressData.length} items`);
      } catch (err) {
        debugMessages.push(`❌ studentAdaptiveProgress: ${err.response?.status} - ${err.response?.data?.detail || err.message}`);
      }

      // 2) Published Quizzes (ALWAYS include as "Past Quizzes")
      let publishedQuizzes = [];
      try {
        const slidesResponse = await studentAvailableSlides();
        let slidesData = [];
        if (Array.isArray(slidesResponse.data)) {
          slidesData = slidesResponse.data;
        } else if (slidesResponse.data?.slides) {
          slidesData = slidesResponse.data.slides;
        }

        slidesData.forEach(slideGroup => {
          const info = slideGroup?.slide_info || slideGroup;
          const list = slideGroup?.quizzes || [];
          list.forEach(q => {
            if (q.quiz_id) {
              publishedQuizzes.push({
                id: `pub_${info.slide_id || info.id}_${q.quiz_id}`,
                quiz: {
                  id: q.quiz_id,
                  title: info.title || info.slide_title || 'AI Generated Quiz',
                  topic: {
                    name: info.topic_name || 'Unknown Topic',
                    course: {
                      id: info.course_id,
                      code: info.course_code || 'UNKNOWN',
                      name: info.course_name || 'Unknown Course'
                    }
                  },
                  total_questions: q.question_count || 5,
                  difficulty: q.difficulty || 'medium'
                },
                score: 0,
                total_possible_score: 0,
                is_completed: false,
                is_published: true, // mark as "past/published"
                started_at: q.progress?.last_attempt_at || info.created_at || new Date().toISOString(),
                completed_at: null,
                attempt_count: q.progress?.attempts_count || 0,
                percentage: 0
              });
            }
          });
        });

        debugMessages.push(`✅ studentAvailableSlides: Added ${publishedQuizzes.length} published quizzes`);
      } catch (err) {
        debugMessages.push(`❌ studentAvailableSlides: ${err.response?.status} - ${err.response?.data?.detail || err.message}`);
      }

      // 3) Enrich a few with quiz details
      const firstFew = [...publishedQuizzes].slice(0, 5);
      for (let i = 0; i < firstFew.length; i++) {
        const attempt = firstFew[i];
        if (attempt.quiz?.id) {
          try {
            const quizDetails = await getAdaptiveQuiz(attempt.quiz.id);
            publishedQuizzes = publishedQuizzes.map(a =>
              a.quiz?.id === attempt.quiz.id
                ? { 
                    ...a, 
                    quiz: { 
                      ...a.quiz, 
                      title: quizDetails.data?.title || a.quiz.title,
                      total_questions: quizDetails.data?.questions?.length || a.quiz.total_questions
                    }
                  }
                : a
            );
          } catch {}
        }
      }

      // Transform progress attempts
      const transformedProgressAttempts = (progressData || []).map(progress => ({
        id: progress.id || `attempt_${Date.now()}_${Math.random()}`,
        quiz: {
          id: progress.quiz?.id || progress.adaptive_quiz_id || progress.quiz_id,
          title: progress.quiz?.title || progress.quiz_title || progress.slide_title || progress.title || "AI Generated Quiz",
          topic: {
            name: progress.quiz?.topic?.name || progress.topic_name || progress.slide_topic || "Unknown Topic",
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
        total_possible_score: progress.total_possible_score || progress.max_score || ((progress.total_questions || 5) * 2),
        is_completed: progress.is_completed || progress.completed || false,
        is_published: false,
        started_at: progress.started_at || progress.created_at || progress.last_attempt_at || new Date().toISOString(),
        completed_at: progress.completed_at || progress.finished_at,
        attempt_count: progress.attempt_count || 1,
        percentage: progress.percentage || (progress.score && progress.total_possible_score ? Math.round((progress.score / progress.total_possible_score) * 100) : 0)
      }));

      // Combine & de-duplicate by quiz id (prefer completed attempts data if present)
      const combined = [];
      const pushOrReplace = (item) => {
        const idx = combined.findIndex(a => a.quiz?.id === item.quiz?.id);
        if (idx === -1) { combined.push(item); return; }
        const existing = combined[idx];
        // Prefer real attempts (completed or with score) over bare published
        const existingHasScore = (existing.score || 0) > 0 || existing.is_completed;
        const itemHasScore = (item.score || 0) > 0 || item.is_completed;
        if (itemHasScore && !existingHasScore) combined[idx] = item;
      };

      transformedProgressAttempts.forEach(pushOrReplace);
      publishedQuizzes.forEach(pushOrReplace);

      // Sort most recent first
      combined.sort((a, b) => new Date(b.started_at || 0) - new Date(a.started_at || 0));

      setAttempts(combined);
      setDebugInfo({
        methods: debugMessages,
        totalAttempts: combined.length,
        courses: coursesData.length
      });
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to load AI quiz history';
      setError(errorMessage);
      setDebugInfo({
        error: errorMessage,
        status: err.response?.status,
        fullError: err.response?.data
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetakeQuiz = (quiz) => {
    // Lecturer retake paths can vary; keep existing behavior
    navigate(`/take-ai-quiz/${quiz.id}`);
  };

  const handleViewAttemptDetails = (attempt) => {
    // Open Results section FIRST, then allow deep analysis
    navigate(`/quiz-analytics/${attempt.quiz.id}?section=results`);
  };

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
          placeholder="Search AI past quizzes by title, topic, or course..."
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

        <div className="quiz-history-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div className="TitleH">
            {loading ? 'Loading...' : `Past Quizzes (${filteredAttempts.length})`}
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
              Loading your past quizzes...
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
                {searchTerm || selectedCourse ? 'No past quizzes match your filters' : 'No past quizzes yet'}
              </h3>
              <p style={{
                color: '#666',
                marginBottom: '20px',
                fontSize: '14px',
                maxWidth: '420px',
                margin: '0 auto 20px'
              }}>
                Publish a quiz to see it here. Click a past quiz to view results, then jump into detailed analysis.
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
                Back to Current Quizzes
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
