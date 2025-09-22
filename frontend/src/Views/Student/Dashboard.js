import { useState, useEffect } from 'react';
import { 
  studentAvailableSlides, 
  getAdaptiveQuiz, 
  studentAdaptiveProgress,
  checkQuizAccess 
} from '../../api/ai-quiz';
import { getMyCourses } from '../../api/courses';
import { getDashboard } from '../../api/auth';
import Bio from "../../Componets/Lacture/bio";
import Biography from "../../Componets/Student/Biography";
import CoursesList from "../../Componets/Student/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
import QuizTile from "../../Componets/Student/QuizTile";
import SearchBar from "../../Componets/Student/SearchBar";
import "./Dashboard.css";

function Dashboard() {
  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [userProgress, setUserProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllQuizzes, setShowAllQuizzes] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    fetchStudentDashboardData();
  }, []);

  const fetchStudentDashboardData = async () => {
    setLoading(true);
    setError(null);
    setDebugInfo('Starting to fetch data...');
    
    try {
      console.log('=== STUDENT DASHBOARD DEBUG ===');
      console.log('Starting API calls...');
      
      // First, let's see what APIs are actually returning
      setDebugInfo('Fetching available slides...');
      console.log('Calling studentAvailableSlides()...');
      const slidesResponse = await studentAvailableSlides();
      console.log('studentAvailableSlides response:', slidesResponse);
      
      setDebugInfo('Fetching courses...');
      console.log('Calling getMyCourses()...');
      const coursesResponse = await getMyCourses();
      console.log('getMyCourses response:', coursesResponse);
      
      setDebugInfo('Fetching student progress...');
      console.log('Calling studentAdaptiveProgress()...');
      const progressResponse = await studentAdaptiveProgress();
      console.log('studentAdaptiveProgress response:', progressResponse);

      // Process courses first
      const fetchedCourses = Array.isArray(coursesResponse.data)
        ? coursesResponse.data
        : coursesResponse.data?.courses || coursesResponse.data?.results || [];

      console.log('Processed courses:', fetchedCourses);
      setCourses(fetchedCourses);

      // Process slides/quizzes
      let slidesData = [];
      if (Array.isArray(slidesResponse.data)) {
        slidesData = slidesResponse.data;
      } else if (slidesResponse.data?.slides) {
        slidesData = slidesResponse.data.slides;
      } else if (slidesResponse.data?.results) {
        slidesData = slidesResponse.data.results;
      } else {
        console.warn('Unexpected slides response format:', slidesResponse.data);
      }

      console.log('Raw slides data:', slidesData);
      console.log('Number of slides found:', slidesData.length);

      // Process user progress
      let progressData = [];
      if (Array.isArray(progressResponse.data)) {
        progressData = progressResponse.data;
      } else if (progressResponse.data?.progress) {
        progressData = progressResponse.data.progress;
      } else if (progressResponse.data?.results) {
        progressData = progressResponse.data.results;
      }

      console.log('Raw progress data:', progressData);
      setUserProgress(progressData);

      // Create progress lookup map
      const progressBySlide = {};
      progressData.forEach(progress => {
        const slideId = progress.lecture_slide || progress.slide_id || progress.id;
        if (slideId) {
          progressBySlide[slideId] = progress;
        }
      });

      console.log('Progress lookup map:', progressBySlide);

      // Filter slides that have generated quizzes
      // Let's be more permissive to see what we get
      const potentialQuizSlides = slidesData.filter(slide => {
        console.log('Checking slide:', slide);
        
        // Check for various indicators that this slide has a quiz
        const hasQuestions = slide.questions_generated || 
                           slide.questions_count > 0 || 
                           slide.total_questions > 0 ||
                           slide.has_quiz ||
                           slide.quiz_id ||
                           slide.adaptive_quiz_id ||
                           slide.generated_quiz_id;
        
        const isPublished = slide.is_published || 
                           slide.status === 'published' || 
                           slide.is_live ||
                           slide.published;
        
        console.log(`Slide "${slide.title || slide.slide_title}":`, {
          hasQuestions,
          isPublished,
          questions_generated: slide.questions_generated,
          questions_count: slide.questions_count,
          is_published: slide.is_published,
          status: slide.status,
          is_live: slide.is_live
        });
        
        return hasQuestions; // For now, let's show any slide with questions, regardless of publish status
      });

      console.log('Potential quiz slides:', potentialQuizSlides);
      setDebugInfo(`Found ${potentialQuizSlides.length} potential quiz slides`);

      // If no quiz slides found, let's still process regular slides for debugging
      const slidesToProcess = potentialQuizSlides.length > 0 ? potentialQuizSlides : slidesData.slice(0, 5);
      
      console.log('Processing slides:', slidesToProcess);

      // Process each slide into quiz format
      const processedQuizzes = await Promise.all(slidesToProcess.map(async (slide, index) => {
        try {
          console.log(`Processing slide ${index + 1}:`, slide);
          
          // Try to get quiz ID from various possible fields
          const quizId = slide.quiz_id || 
                        slide.adaptive_quiz_id || 
                        slide.generated_quiz_id ||
                        slide.id; // Fallback to slide ID
          
          console.log(`Quiz ID for slide "${slide.title}": ${quizId}`);

          let quizDetails = null;
          let canAccess = true;

          // Only try to fetch quiz details if we have a proper quiz ID
          if (quizId && quizId !== slide.id) {
            try {
              console.log(`Fetching quiz details for ID: ${quizId}`);
              const [accessResponse, detailsResponse] = await Promise.all([
                checkQuizAccess(quizId).catch(() => ({ data: { can_access: true } })),
                getAdaptiveQuiz(quizId).catch(err => {
                  console.warn(`Could not fetch quiz details for ${quizId}:`, err);
                  return null;
                })
              ]);

              canAccess = accessResponse.data?.can_access !== false;
              quizDetails = detailsResponse;
              
              console.log(`Access and details for ${quizId}:`, { canAccess, quizDetails: !!quizDetails });
            } catch (error) {
              console.warn(`Error fetching quiz data for ${quizId}:`, error);
            }
          }

          const progress = progressBySlide[slide.id];
          console.log(`Progress for slide ${slide.id}:`, progress);

          // Determine quiz status
          let status = 'available';
          let attempts = '0/3';
          let bestScore = null;

          if (progress) {
            const attemptCount = progress.attempts_count || progress.total_attempts || 0;
            const maxAttempts = slide.max_attempts || progress.max_attempts || 3;
            attempts = `${attemptCount}/${maxAttempts}`;

            if (progress.best_score !== null && progress.best_score !== undefined) {
              bestScore = `${Math.round(progress.best_score)}%`;
              status = 'completed';
            } else if (progress.is_completed) {
              status = 'completed';
              bestScore = progress.final_score ? `${Math.round(progress.final_score)}%` : 'Completed';
            } else if (attemptCount >= maxAttempts) {
              status = 'missed';
            }
          }

          if (!canAccess) {
            status = 'locked';
          }

          const processedQuiz = {
            id: quizId,
            slideId: slide.id,
            title: slide.title || slide.slide_title || 'Generated Quiz',
            duration: slide.time_limit ? `${slide.time_limit} min` : '15 min',
            course: slide.topic?.course?.name || slide.course?.name || 'Unknown Course',
            courseId: slide.topic?.course?.id || slide.course?.id,
            courseCode: (slide.topic?.course?.code || slide.course?.code || 'default').toLowerCase(),
            topicName: slide.topic?.name || slide.topic_name || 'Unknown Topic',
            difficulty: slide.difficulty || slide.level || slide.difficulty_level || 'Medium',
            totalQuestions: slide.questions_count || 
                           slide.total_questions || 
                           quizDetails?.data?.questions?.length || 
                           5,
            isLive: slide.is_live || slide.live || false,
            dueDate: slide.due_date ? `Due: ${new Date(slide.due_date).toLocaleDateString()}` : 'Self-paced',
            attempts: attempts,
            maxAttempts: slide.max_attempts || 3,
            bestScore: bestScore,
            status: status,
            progress: progress,
            canAccess: canAccess,
            createdAt: slide.created_at || slide.uploaded_at || slide.date_created,
            
            // Debug info
            _debug: {
              originalSlide: slide,
              hasQuizId: !!slide.quiz_id,
              hasAdaptiveId: !!slide.adaptive_quiz_id,
              hasGeneratedId: !!slide.generated_quiz_id,
              questionsGenerated: slide.questions_generated,
              isPublished: slide.is_published,
              processedQuizId: quizId
            }
          };

          console.log(`Processed quiz:`, processedQuiz);
          return processedQuiz;

        } catch (error) {
          console.error(`Error processing slide ${slide.id}:`, error);
          return null;
        }
      }));

      const validQuizzes = processedQuizzes.filter(quiz => quiz !== null);
      console.log('Valid processed quizzes:', validQuizzes);

      // Sort quizzes
      const sortedQuizzes = validQuizzes.sort((a, b) => {
        // Live quizzes first
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        
        // Then by status priority
        const statusPriority = { available: 0, completed: 1, missed: 2, locked: 3 };
        const aPriority = statusPriority[a.status] || 99;
        const bPriority = statusPriority[b.status] || 99;
        if (aPriority !== bPriority) return aPriority - bPriority;
        
        // Finally by creation date
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });

      setQuizzes(sortedQuizzes);
      setDebugInfo(`Successfully loaded ${sortedQuizzes.length} quizzes`);
      console.log('Final sorted quizzes:', sortedQuizzes);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(`Failed to load dashboard data: ${err.message}`);
      setDebugInfo(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter quizzes based on search term
  const filteredQuizzes = quizzes.filter(quiz =>
    quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.topicName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show accessible quizzes
  const accessibleQuizzes = filteredQuizzes.filter(quiz => 
    quiz.canAccess && ['available', 'completed'].includes(quiz.status)
  );

  const quizzesToShow = showAllQuizzes ? accessibleQuizzes : accessibleQuizzes.slice(0, 6);

  const handleViewAll = () => {
    setShowAllQuizzes(!showAllQuizzes);
  };

  const handleStartQuiz = (quiz) => {
    console.log('Starting quiz:', quiz);
    window.location.href = `/QuizCountdownPage?quizId=${quiz.id}&slideId=${quiz.slideId}`;
  };

  const handleViewResults = (quiz) => {
    console.log('Viewing results for quiz:', quiz);
    window.location.href = `/QuizAnalyticsPage?quizId=${quiz.id}&slideId=${quiz.slideId}`;
  };

  if (loading) {
    return (
      <div>
        <div className="NavBar">
          <NavBar />
        </div>
        <div className="loading-dashboard">
          <div className="spinner"></div>
          <p>Loading your quizzes...</p>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            {debugInfo}
          </div>
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
          placeholder="Search quizzes by title, course, or topic..."
        />
      </div>
      
      <div className="ContainerD">
        <div className="Boigraphy">
          <Biography />
        </div>

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
              onClick={() => setError(null)} 
              style={{
                marginLeft: '10px',
                background: 'none', 
                border: 'none', 
                color: '#DC2626',
                cursor: 'pointer', 
                fontWeight: 'bold'
              }}
            >
              ×
            </button>
          </div>
        )}

       
        <div className="quiz-header1">
          <div className="Title">
            Available Quizzes
            {searchTerm && (
              <span className="search-results">
                ({accessibleQuizzes.length} result{accessibleQuizzes.length !== 1 ? 's' : ''})
              </span>
            )}
          </div>
          {accessibleQuizzes.length > 6 && (
            <div className="More" onClick={handleViewAll} style={{ cursor: 'pointer' }}>
              {showAllQuizzes ? 'Show Less' : 'View All'}
            </div>
          )}
        </div>

        <div className="QuizList">
          {quizzesToShow.length > 0 ? (
            quizzesToShow.map(quiz => (
              <QuizTile
                key={`quiz_${quiz.id}_${quiz.slideId}`}
                quizId={quiz.id}
                slideId={quiz.slideId}
                title={quiz.title}
                duration={quiz.duration}
                totalQuestions={quiz.totalQuestions}
                dueDate={quiz.dueDate}
                status={quiz.status}
                courseCode={quiz.courseCode}
                topicName={quiz.topicName}
                difficulty={quiz.difficulty}
                attempts={quiz.attempts}
                bestScore={quiz.bestScore}
                isLive={quiz.isLive}
                canAccess={quiz.canAccess}
                onStartQuiz={() => handleStartQuiz(quiz)}
                onViewResults={() => handleViewResults(quiz)}
                onClick={() => {
                  if (quiz.status === 'available' && quiz.canAccess) {
                    handleStartQuiz(quiz);
                  } else if (quiz.status === 'completed') {
                    handleViewResults(quiz);
                  }
                }}
              />
            ))
          ) : (
            <div className="no-quizzes" style={{ 
              gridColumn: '1 / -1', 
              textAlign: 'center', 
              padding: '40px 20px' 
            }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '20px',
                opacity: 0.3
              }}>
                📚
              </div>
              {searchTerm ? (
                <>
                  <h3 style={{ color: '#333', marginBottom: '10px', fontSize: '18px' }}>
                    No quizzes found matching "{searchTerm}"
                  </h3>
                  <p style={{ color: '#666', marginBottom: '20px' }}>
                    Try adjusting your search terms or browse all available quizzes.
                  </p>
                  <button 
                    onClick={() => setSearchTerm('')}
                    style={{
                      background: 'transparent',
                      color: '#1935CA',
                      border: '1px solid #1935CA',
                      padding: '12px 24px',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Clear Search
                  </button>
                </>
              ) : (
                <>
                  <h3 style={{ color: '#333', marginBottom: '10px', fontSize: '18px' }}>
                    No quizzes available yet
                  </h3>
                  <p style={{ color: '#666', marginBottom: '20px' }}>
                    Your lecturers haven't published any quizzes yet. Check back later!
                  </p>
                  <button 
                    onClick={fetchStudentDashboardData}
                    style={{
                      background: '#27AE60',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Refresh
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="SideD">
        <CoursesList courses={courses} />
      </div>
      
      <div className="BoiD">
        <Bio />
      </div>
    </div>
  );
}

export default Dashboard;