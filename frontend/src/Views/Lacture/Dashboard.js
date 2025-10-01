import { useState, useEffect } from "react";
import Bio from "../../Componets/Lacture/bio";
import Biography from "../../Componets/Lacture/Biography";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import QuizTile from "../../Componets/Lacture/QuizTile";
import SearchBar from "../../Componets/Lacture/SearchBar";
import { 
  getQuizzesForReview, 
  getLecturerAvailableQuizzes
} from "../../api/ai-quiz";
import { getMyCourses } from "../../api/courses";
import "./Dashboard.css";

function Dashboard() {
  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { 
    loadDashboardData(); 
  }, []);

  const findAIQuizzes = async () => {
    const allQuizData = [];

    // Method 1: Get unpublished quizzes (draft/under_review) from review endpoint
    try {
      const reviewResponse = await getQuizzesForReview();
      let reviewQuizzes = [];
      
      if (Array.isArray(reviewResponse.data)) {
        reviewQuizzes = reviewResponse.data;
      } else if (reviewResponse.data?.results) {
        reviewQuizzes = reviewResponse.data.results;
      }
      
      reviewQuizzes.forEach(quiz => {
        allQuizData.push({ 
          ...quiz,
          _source: 'review',
          _isUnpublished: true,
          _slideId: quiz.slide_id || quiz.id,
          _originalQuizId: quiz.quiz_id || quiz.id
        });
      });
      
      console.log('Review quizzes fetched:', reviewQuizzes.length);
    } catch (error) {
      console.error('Error fetching review quizzes:', error);
    }

    // Method 2: Get ALL quizzes from lecturer endpoint - FLATTEN THE STRUCTURE
    try {
      const lecturerQuizzesResponse = await getLecturerAvailableQuizzes();
      console.log('Lecturer quizzes response:', lecturerQuizzesResponse.data);
      
      if (lecturerQuizzesResponse.data?.slides) {
        // CRITICAL FIX: Iterate through each slide and then through each quiz in that slide
        lecturerQuizzesResponse.data.slides.forEach(slideGroup => {
          const slideInfo = slideGroup.slide_info;
          const slideQuizzes = slideGroup.quizzes || [];
          
          console.log(`Processing slide "${slideInfo.title}" with ${slideQuizzes.length} quizzes`);
          
          // Process each individual quiz within this slide
          slideQuizzes.forEach(quiz => {
            // Check if this exact quiz was already added from review endpoint
            const alreadyExists = allQuizData.some(q => 
              (q._originalQuizId && q._originalQuizId === quiz.quiz_id) ||
              (q.quiz_id === quiz.quiz_id)
            );
            
            if (!alreadyExists) {
              allQuizData.push({
                // IDs
                id: quiz.quiz_id,
                quiz_id: quiz.quiz_id,
                _slideId: slideInfo.slide_id,
                _realAdaptiveQuizId: quiz.quiz_id,
                _isPublished: quiz.status === 'published',
                _source: 'lecturer_quizzes',
                
                // Basic quiz info
                title: slideInfo.title,
                slide_title: slideInfo.title,
                difficulty: quiz.difficulty,
                questions_count: quiz.question_count,
                total_questions: quiz.question_count,
                status: quiz.status,
                created_at: quiz.created_at,
                is_live: quiz.status === 'published',
                is_active: quiz.is_active,
                
                // Review info
                reviewed_by: quiz.reviewed_by,
                reviewed_at: quiz.reviewed_at,
                review_notes: quiz.review_notes,
                
                // Course/Topic info
                topic_name: slideInfo.topic_name,
                course_code: slideInfo.course_code,
                course_name: slideInfo.course_name,
                course_id: slideInfo.course_id,
                
                // Engagement stats
                engagement_stats: quiz.engagement_stats || {}
              });
              
              console.log(`Added quiz: ${slideInfo.title} (${quiz.difficulty}) - ID: ${quiz.quiz_id}`);
            } else {
              console.log(`Skipped duplicate quiz ID: ${quiz.quiz_id}`);
            }
          });
        });
        
        console.log('Total quizzes added from lecturer endpoint:', 
          lecturerQuizzesResponse.data.slides.reduce((sum, slide) => sum + slide.quizzes.length, 0));
      }
    } catch (error) {
      console.error('Error fetching lecturer quizzes:', error);
    }

    console.log('Total unique quizzes found:', allQuizData.length);
    return allQuizData;
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      // Load courses
      const coursesResponse = await getMyCourses();
      let coursesData = [];
      if (coursesResponse.data?.courses && Array.isArray(coursesResponse.data.courses)) {
        coursesData = coursesResponse.data.courses;
      } else if (Array.isArray(coursesResponse.data)) {
        coursesData = coursesResponse.data;
      } else if (coursesResponse.data?.results && Array.isArray(coursesResponse.data.results)) {
        coursesData = coursesResponse.data.results;
      }
      setCourses(coursesData);

      // Load quizzes
      const allQuizData = await findAIQuizzes();
      
      if (allQuizData.length === 0) {
        setQuizzes([]);
        return;
      }

      // Normalize quiz data for consistent display
      const normalizedQuizzes = allQuizData.map((quiz, index) => {
        // Determine the best ID to use
        let displayId = quiz.quiz_id || quiz._realAdaptiveQuizId || quiz.id || quiz._slideId;
        
        // Fallback to generated ID if needed
        if (!displayId || String(displayId) === 'undefined' || String(displayId) === 'null') {
          displayId = `temp_${quiz._source}_${Date.now()}_${index}`;
        }

        return {
          // IDs
          id: String(displayId),
          slideId: quiz._slideId || quiz.slide_id,
          adaptiveQuizId: quiz._realAdaptiveQuizId || quiz.adaptive_quiz_id || quiz.quiz_id,
          quizId: quiz.quiz_id || quiz.id,
          
          // Basic info
          title: quiz.title || quiz.slide_title || quiz.name || 'Untitled Quiz',
          
          // Topic/Course info
          topic: {
            name: quiz.topic_name || quiz.topic?.name || 'Unknown Topic',
            course: {
              code: quiz.course_code || quiz.topic?.course?.code || quiz.course?.code || 'UNKNOWN',
              name: quiz.course_name || quiz.topic?.course?.name || quiz.course?.name || 'Unknown Course'
            }
          },
          
          // Question info
          questions_count: quiz.questions_count || quiz.total_questions || quiz.question_count || 0,
          total_points: quiz.total_points || quiz.points || ((quiz.questions_count || quiz.question_count || 0) * 2),
          
          // Dates
          created_at: quiz.created_at || quiz.date_created || quiz.uploaded_at || new Date().toISOString(),
          publishedAt: quiz.published_at || quiz.reviewed_at,
          
          // Status
          is_live: quiz.status === 'published' || quiz.is_live || quiz._isPublished || false,
          status: quiz.status || (quiz._isPublished ? 'published' : (quiz.questions_count > 0 ? 'ready' : 'draft')),
          
          // Other metadata
          difficulty: quiz.difficulty || quiz.level || 'medium',
          is_ai_generated: true,
          time_limit: quiz.time_limit,
          metadata: quiz.metadata || {},
          
          // Source tracking
          dataSource: quiz._source,
          hasRealId: !!(quiz.quiz_id || quiz._realAdaptiveQuizId),
          originalSlideId: quiz._slideId,
          
          // Engagement stats (for future use)
          engagement_stats: quiz.engagement_stats
        };
      });

      // Remove duplicates by quiz_id
      const uniqueQuizzes = normalizedQuizzes.reduce((acc, current) => {
        const duplicate = acc.find(quiz => quiz.quizId === current.quizId);
        
        if (duplicate) {
          // Replace with published version if current is published
          if (current.is_live && !duplicate.is_live) {
            const index = acc.indexOf(duplicate);
            acc[index] = current;
          }
        } else {
          acc.push(current);
        }
        
        return acc;
      }, []);

      console.log('Final normalized quizzes:', uniqueQuizzes.length);
      setQuizzes(uniqueQuizzes);
      
    } catch (err) {
      console.error('Dashboard load error:', err);
      const errorMsg = err.response?.data?.detail || 
                       err.response?.data?.message || 
                       err.message || 
                       'Failed to load dashboard data';
      setError(errorMsg);
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  };

  // Delete quiz handler - disabled for AI quizzes
  const handleDeleteQuiz = async () => {
    setError('AI quizzes cannot be deleted directly. Use the moderation interface to manage quizzes.');
  };

  // Handle status changes when quiz is published
  const handleStatusChange = (quizId, newStatus, publishData = null) => {
    setQuizzes(prev =>
      prev.map(quiz => {
        // Find the quiz to update
        const isTarget = quiz.id === quizId ||
                         quiz.quizId === quizId ||
                         (publishData?.originalId && quiz.id === publishData.originalId) ||
                         (publishData?.originalSlideId && quiz.slideId === publishData.originalSlideId);

        if (!isTarget) return quiz;

        // Update the quiz
        const updated = {
          ...quiz,
          is_live: newStatus === 'published' || newStatus === 'live',
          status: newStatus === 'published' ? 'published' : quiz.status
        };

        // Update IDs if provided
        if (publishData?.newAdaptiveQuizId) {
          updated.adaptiveQuizId = publishData.newAdaptiveQuizId;
          updated.hasRealId = true;
          updated.dataSource = 'published';
        }
        if (publishData?.newQuizId) {
          updated.quizId = publishData.newQuizId;
        }
        if (publishData?.publishedAt) {
          updated.publishedAt = publishData.publishedAt;
        }

        return updated;
      })
    );
  };

  // Filter quizzes based on search term
  const filteredQuizzes = quizzes.filter(q =>
    q.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.topic?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.topic?.course?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.topic?.course?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.difficulty?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort quizzes: published first, then by status, then by date
  const sortedQuizzes = filteredQuizzes.sort((a, b) => {
    // Published quizzes first
    if (a.is_live && !b.is_live) return -1;
    if (!a.is_live && b.is_live) return 1;
    
    // Among unpublished: ready before draft
    if (!a.is_live && !b.is_live) {
      if (a.status === 'ready' && b.status === 'draft') return -1;
      if (a.status === 'draft' && b.status === 'ready') return 1;
    }
    
    // Sort by date (newest first)
    const dateA = new Date(a.created_at || 0);
    const dateB = new Date(b.created_at || 0);
    return dateB - dateA;
  });

  // Display all quizzes (both published and unpublished)
  const currentQuizzes = sortedQuizzes;
  const recentQuizzes = currentQuizzes.slice(0, 1000); // Show up to 15 quizzes

  return (
    <div className="dashboard-container">
      <div className="NavBar">
        <NavBar />
      </div>

      <div className="SeachBar">
        <SearchBar 
          onSearch={setSearchTerm} 
          placeholder="Search AI quizzes by title, topic, course, or difficulty..." 
        />
      </div>

      <div className="ContainerD">
        <div className="Boigraphy">
          <Biography />
        </div>

        {error && (
          <div className="error-message" style={{
            background: '#FEE2E2', 
            border: '1px solid #FECACA', 
            color: '#DC2626',
            padding: '12px', 
            borderRadius: '6px', 
            marginBottom: '20px', 
            fontSize: '14px', 
            position: 'relative'
          }}>
            {error}
            <button 
              onClick={() => setError('')} 
              style={{
                position: 'absolute', 
                top: '8px', 
                right: '12px', 
                background: 'none',
                border: 'none', 
                color: '#DC2626', 
                cursor: 'pointer', 
                fontSize: '16px', 
                fontWeight: 'bold'
              }}
            >
              ×
            </button>
          </div>
        )}

        <div className="quiz-header1">
          <div className="Title">
            {loading ? 'Loading...' : `AI Quizzes (${currentQuizzes.length})`}
          </div>
          <div className="header-actions">
            {currentQuizzes.length > 100 && (
              <button 
                className="More" 
                onClick={() => window.location.href = '/LecturerQuizHistory'}
              >
                View All Quizzes
              </button>
            )}
            <button 
              className="create-quiz-btn"
              onClick={() => window.location.href = '/LecturerAIQuizzes'}
            >
              + Create Quiz
            </button>
          </div>
        </div>

        <div className="QuizList">
          {loading ? (
            <div className="loading-state" style={{
              gridColumn:'1 / -1', 
              textAlign:'center', 
              padding:'60px 20px', 
              color:'#666'
            }}>
              <div style={{
                width:'40px', 
                height:'40px', 
                border:'4px solid #f3f3f3', 
                borderTop:'4px solid #1935CA',
                borderRadius:'50%', 
                animation:'spin 1s linear infinite', 
                margin:'0 auto 20px'
              }}></div>
              Loading your AI quizzes...
            </div>
          ) : recentQuizzes.length > 0 ? (
            recentQuizzes.map((quiz) => (
              <QuizTile
                key={`ai_quiz_${quiz.quizId}_${quiz.difficulty}`}
                quiz={quiz}
                onDelete={handleDeleteQuiz}
                onStatusChange={handleStatusChange}
              />
            ))
          ) : (
            <div className="empty-state" style={{ 
              gridColumn:'1 / -1', 
              textAlign:'center', 
              padding:'40px 20px' 
            }}>
              <div style={{ 
                fontSize:'48px', 
                marginBottom:'20px', 
                opacity:0.3 
              }}>
                📚
              </div>
              <h3 style={{ 
                color:'#333', 
                marginBottom:'10px', 
                fontSize:'18px' 
              }}>
                {searchTerm ? 'No AI quizzes match your search' : 'No AI quizzes found'}
              </h3>
              <p style={{ 
                color:'#666', 
                marginBottom:'20px', 
                fontSize:'14px' 
              }}>
                {searchTerm 
                  ? 'Try adjusting your search criteria.' 
                  : 'Create your first AI quiz to get started.'}
              </p>
              <button 
                onClick={() => window.location.href = '/LecturerAIQuizzes'} 
                style={{
                  background:'#1935CA', 
                  color:'white', 
                  border:'none', 
                  padding:'12px 24px',
                  borderRadius:'6px', 
                  fontSize:'14px', 
                  cursor:'pointer', 
                  fontWeight:'500',
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                Create AI Quiz
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="SideD">
        <CoursesList 
          courses={courses} 
          loading={loading} 
          onRefresh={loadDashboardData} 
        />
      </div>

      <div className="BoiD">
        <Bio />
      </div>

      <style jsx>{`
        @keyframes spin { 
          0% { transform: rotate(0deg); } 
          100% { transform: rotate(360deg); } 
        }
        
        .dashboard-container { 
          min-height: 100vh; 
          font-family: 'Poppins', sans-serif; 
        }
        
        .quiz-header1 {
          display: flex; 
          justify-content: space-between; 
          align-items: center;
          margin: 20px 0; 
          padding: 0 20px;
        }
        
        .header-actions { 
          display: flex; 
          gap: 12px; 
          align-items: center; 
        }
        
        .create-quiz-btn {
          background: #27AE60; 
          color: white; 
          border: none; 
          padding: 10px 16px;
          border-radius: 6px; 
          font-size: 14px; 
          font-weight: 500; 
          cursor: pointer;
          transition: background-color 0.2s ease; 
          font-family: 'Poppins', sans-serif;
        }
        
        .create-quiz-btn:hover { 
          background: #219A52; 
        }
        
        @media (max-width: 768px) {
          .quiz-header1 { 
            flex-direction: column; 
            gap: 12px; 
            align-items: stretch; 
            padding: 0 16px; 
          }
          .header-actions { 
            justify-content: center; 
          }
        }
      `}</style>
    </div>
  );
}

export default Dashboard;