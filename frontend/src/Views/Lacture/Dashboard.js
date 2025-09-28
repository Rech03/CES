import { useState, useEffect } from "react";
import Bio from "../../Componets/Lacture/bio";
import Biography from "../../Componets/Lacture/Biography";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import QuizTile from "../../Componets/Lacture/QuizTile";
import SearchBar from "../../Componets/Lacture/SearchBar";
import { 
  getQuizzesForReview, 
  lecturerSlides, 
  getAdaptiveQuiz,
  studentAvailableSlides 
} from "../../api/ai-quiz";
import { getMyCourses } from "../../api/courses";
import api from "../../api/client";
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

  // Function to get quiz details using the student API (which has the real quiz IDs)
  const getQuizDetails = async (quizId) => {
    try {
      const response = await getAdaptiveQuiz(quizId);
      return response.data;
    } catch (error) {
      return null;
    }
  };

  // Function to get available quizzes from student perspective (these have real IDs)
  const getAvailableQuizzes = async () => {
    try {
      const response = await studentAvailableSlides();
      let slidesData = [];
      if (Array.isArray(response.data)) {
        slidesData = response.data;
      } else if (response.data?.slides) {
        slidesData = response.data.slides;
      } else if (response.data?.results) {
        slidesData = response.data.results;
      }

      const quizInfoList = [];
      slidesData.forEach(slideGroup => {
        const info = slideGroup?.slide_info || slideGroup;
        const list = slideGroup?.quizzes || [];
        list.forEach(q => {
          quizInfoList.push({
            adaptiveQuizId: q.quiz_id,
            quizId: q.quiz_id,
            slideId: info.id || info.slide_id,
            title: info.title || info.slide_title,
            isPublished: !!q.quiz_id,
            slideData: { ...info, quiz_meta: q }
          });
        });
      });

      return quizInfoList.filter(info => info.adaptiveQuizId || info.quizId);
    } catch (error) {
      return [];
    }
  };

  const findAIQuizzes = async () => {
    const allQuizData = [];

    // Method 1: review (draft/unpublished)
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
          _slideId: quiz.slide_id || quiz.id
        });
      });
    } catch (error) {}

    // Method 2: published via student slides/quizzes
    try {
      const quizInfoList = await getAvailableQuizzes();
      for (const quizInfo of quizInfoList) {
        if (quizInfo.adaptiveQuizId) {
          const quizDetails = await getQuizDetails(quizInfo.adaptiveQuizId);
          if (quizDetails) {
            allQuizData.push({ 
              ...quizDetails, 
              _source: 'adaptive', 
              _realAdaptiveQuizId: quizInfo.adaptiveQuizId,
              _realQuizId: quizInfo.quizId,
              _slideId: quizInfo.slideId,
              _isPublished: true,
              _originalSlideData: quizInfo.slideData
            });
          }
        }
      }
    } catch (error) {}

    // Method 3: lecturer slides (fallback)
    try {
      const slidesResponse = await lecturerSlides();
      let slidesData = [];
      if (Array.isArray(slidesResponse.data)) {
        slidesData = slidesResponse.data;
      } else if (slidesResponse.data?.slides) {
        slidesData = slidesResponse.data.slides;
      }

      slidesData.forEach(slide => {
        const alreadyExists = allQuizData.some(quiz => 
          quiz._slideId === slide.id || 
          quiz.slide_id === slide.id ||
          quiz.id === slide.id
        );
        if (!alreadyExists) {
          allQuizData.push({ 
            ...slide, 
            _source: 'slides',
            _slideId: slide.id,
            _isUnpublished: true
          });
        }
      });
    } catch (error) {}

    return allQuizData;
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

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

      const allQuizData = await findAIQuizzes();
      if (allQuizData.length === 0) {
        setQuizzes([]);
        return;
      }

      const normalizedQuizzes = allQuizData.map((quiz, index) => {
        let displayId = null;
        let hasRealId = false;
        let dataSource = quiz._source;

        if (quiz._isPublished && quiz._realAdaptiveQuizId) {
          displayId = quiz._realAdaptiveQuizId;
          hasRealId = true;
          dataSource = 'published';
        } else if (quiz._slideId) {
          displayId = quiz._slideId;
          hasRealId = false;
        } else if (quiz.id) {
          displayId = quiz.id;
          hasRealId = false;
        }

        if (!displayId || String(displayId) === 'undefined' || String(displayId) === 'null') {
          const timestamp = Date.now();
          const random = Math.random().toString(36).substr(2, 9);
          displayId = `temp_${quiz._source}_${timestamp}_${index}_${random}`;
          hasRealId = false;
          dataSource = 'generated';
        }

        return {
          id: String(displayId),
          slideId: quiz._slideId || quiz.slide_id,
          adaptiveQuizId: quiz._realAdaptiveQuizId || quiz.adaptive_quiz_id,
          quizId: quiz._realQuizId || quiz.quiz_id,

          title: quiz.title || quiz.slide_title || quiz.name || quiz.quiz_title || 'Untitled Quiz',
          topic: {
            name: quiz.topic?.name || quiz.topic_name || quiz.subject?.name || 'Unknown Topic',
            course: {
              code: quiz.topic?.course?.code || quiz.course?.code || quiz.course_code || quiz.subject?.course?.code || 'UNKNOWN',
              name: quiz.topic?.course?.name || quiz.course?.name || quiz.course_name || quiz.subject?.course?.name || 'Unknown Course'
            }
          },

          questions_count: quiz.questions_count || quiz.total_questions || quiz.questions?.length || (quiz.questions_generated ? 5 : 0),
          total_points: quiz.total_points || quiz.points || quiz.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || (quiz.questions_count ? quiz.questions_count * 2 : 0),
          created_at: quiz.created_at || quiz.date_created || quiz.uploaded_at || quiz.upload_date || new Date().toISOString(),

          // UPDATED: Keep published quizzes visible on Dashboard
          is_live: !!(quiz._isPublished || quiz.is_live || quiz.published || quiz.is_published || quiz.status === 'published' || quiz._realAdaptiveQuizId),

          difficulty: quiz.difficulty || quiz.level || quiz.metadata?.difficulty || 'medium',
          is_ai_generated: true,

          status: quiz.status || (quiz._isPublished ? 'published' : (quiz.questions_generated || (quiz.questions_count > 0) ? 'ready' : 'draft')),
          time_limit: quiz.time_limit,
          metadata: quiz.metadata || {},

          dataSource,
          hasRealId,
          originalData: quiz,
          publishedAt: quiz.published_at || quiz.date_published,
          originalSlideId: quiz._slideId
        };
      });

      // Dedup, prefer published
      const uniqueQuizzes = normalizedQuizzes.reduce((acc, current) => {
        const duplicate = acc.find(quiz =>
          (quiz.slideId && current.slideId && quiz.slideId === current.slideId) ||
          (quiz.title === current.title &&
            quiz.topic?.course?.code === current.topic?.course?.code &&
            quiz.topic?.name === current.topic?.name)
        );
        if (duplicate) {
          if (current.is_live && !duplicate.is_live) {
            const index = acc.indexOf(duplicate);
            acc[index] = current;
          } else if (current.hasRealId && !duplicate.hasRealId) {
            const index = acc.indexOf(duplicate);
            acc[index] = current;
          }
        } else {
          acc.push(current);
        }
        return acc;
      }, []);

      setQuizzes(uniqueQuizzes);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to load dashboard data';
      setError(errorMsg);
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  };

  // Delete quiz handler - disabled for AI quizzes
  const handleDeleteQuiz = async () => {
    setError('AI quizzes cannot be deleted directly. Use the moderation interface to reject quizzes if needed.');
  };

  // Updated handleStatusChange to keep published quizzes visible
  const handleStatusChange = (quizId, newStatus, publishData = null) => {
    setQuizzes(prev =>
      prev.map(quiz => {
        const isTarget = quiz.id === quizId ||
                         (publishData?.originalId && quiz.id === publishData.originalId) ||
                         (publishData?.originalSlideId && quiz.slideId === publishData.originalSlideId);

        if (!isTarget) return quiz;

        const updated = {
          ...quiz,
          is_live: newStatus === 'published' || newStatus === 'live',
          status: newStatus === 'published' ? 'published' : quiz.status
        };

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
        if (publishData?.originalSlideId && !updated.originalSlideId) {
          updated.originalSlideId = publishData.originalSlideId;
        }

        return updated;
      })
    );
  };

  // Search + sort
  const filteredQuizzes = quizzes.filter(q =>
    q.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.topic?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.topic?.course?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.topic?.course?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedQuizzes = filteredQuizzes.sort((a, b) => {
    // Sort published quizzes first, then ready, then draft
    if (a.is_live && !b.is_live) return -1;
    if (!a.is_live && b.is_live) return 1;
    
    // Among unpublished, keep ready before draft
    if (!a.is_live && !b.is_live) {
      if (a.status === 'ready' && b.status === 'draft') return -1;
      if (a.status === 'draft' && b.status === 'ready') return 1;
    }
    
    const dateA = new Date(a.created_at || 0);
    const dateB = new Date(b.created_at || 0);
    return dateB - dateA;
  });

  // UPDATED: Show ALL quizzes (both published and unpublished)
  const currentQuizzes = sortedQuizzes;
  const recentQuizzes = currentQuizzes.slice(0, 8);

  return (
    <div className="dashboard-container">
      <div className="NavBar">
        <NavBar />
      </div>

      <div className="SeachBar">
        <SearchBar 
          onSearch={setSearchTerm} 
          placeholder="Search AI quizzes by title, topic, or course..." 
        />
      </div>

      <div className="ContainerD">
        <div className="Boigraphy">
          <Biography />
        </div>

        {error && (
          <div className="error-message" style={{
            background: '#FEE2E2', border: '1px solid #FECACA', color: '#DC2626',
            padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', position: 'relative'
          }}>
            {error}
            <button 
              onClick={() => setError('')} 
              style={{
                position: 'absolute', top: '8px', right: '12px', background: 'none',
                border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold'
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
            {currentQuizzes.length > 8 && (
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
              gridColumn:'1 / -1', textAlign:'center', padding:'60px 20px', color:'#666'
            }}>
              <div style={{
                width:'40px', height:'40px', border:'4px solid #f3f3f3', borderTop:'4px solid #1935CA',
                borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 20px'
              }}></div>
              Loading your AI quizzes...
            </div>
          ) : recentQuizzes.length > 0 ? (
            recentQuizzes.map((quiz) => (
              <QuizTile
                key={`ai_quiz_${quiz.id}`}
                quiz={quiz}
                onDelete={handleDeleteQuiz}
                onStatusChange={handleStatusChange}
              />
            ))
          ) : (
            <div className="empty-state" style={{ 
              gridColumn:'1 / -1', textAlign:'center', padding:'40px 20px' 
            }}>
              <div style={{ fontSize:'48px', marginBottom:'20px', opacity:0.3 }}>
                📚
              </div>
              <h3 style={{ color:'#333', marginBottom:'10px', fontSize:'18px' }}>
                {searchTerm ? 'No AI quizzes match your search' : 'No AI quizzes found'}
              </h3>
              <p style={{ color:'#666', marginBottom:'20px', fontSize:'14px' }}>
                {searchTerm ? 'Try adjusting your search criteria.' : 'Create your first AI quiz to get started.'}
              </p>
              <button 
                onClick={() => window.location.href = '/LecturerAIQuizzes'} 
                style={{
                  background:'#1935CA', color:'white', border:'none', padding:'12px 24px',
                  borderRadius:'6px', fontSize:'14px', cursor:'pointer', fontWeight:'500',
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
        
        .dashboard-container { min-height: 100vh; font-family: 'Poppins', sans-serif; }
        
        .quiz-header1 {
          display: flex; justify-content: space-between; align-items: center;
          margin: 20px 0; padding: 0 20px;
        }
        
        .header-actions { display: flex; gap: 12px; align-items: center; }
        
        .create-quiz-btn {
          background: #27AE60; color: white; border: none; padding: 10px 16px;
          border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer;
          transition: background-color 0.2s ease; font-family: 'Poppins', sans-serif;
        }
        
        .create-quiz-btn:hover { background: #219A52; }
        
        @media (max-width: 768px) {
          .quiz-header1 { flex-direction: column; gap: 12px; align-items: stretch; padding: 0 16px; }
          .header-actions { justify-content: center; }
        }
      `}</style>
    </div>
  );
}

export default Dashboard;