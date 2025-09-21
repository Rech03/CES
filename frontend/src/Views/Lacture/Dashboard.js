import { useState, useEffect } from "react";
import Bio from "../../Componets/Lacture/bio";
import Biography from "../../Componets/Lacture/Biography";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import QuizTile from "../../Componets/Lacture/QuizTile";
import SearchBar from "../../Componets/Lacture/SearchBar";
import { getQuizzesForReview, lecturerSlides } from "../../api/ai-quiz";
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

  // Debug function to find AI quizzes
  const findAIQuizzes = async () => {
    console.log('=== SEARCHING FOR AI QUIZZES ===');
    
    const endpointsToTry = [
      { name: 'getQuizzesForReview', fn: () => getQuizzesForReview() },
      { name: 'lecturerSlides', fn: () => lecturerSlides() },
      { name: 'direct slides API', fn: () => api.get('ai-quiz/lecturer/slides/') },
      { name: 'direct quizzes API', fn: () => api.get('ai-quiz/lecturer/quizzes-for-review/') }
    ];

    for (const endpoint of endpointsToTry) {
      try {
        const response = await endpoint.fn();
        console.log(`${endpoint.name}:`, response.data);
        
        if (response.data && (
          Array.isArray(response.data) || 
          response.data.results || 
          response.data.slides ||
          response.data.quizzes
        )) {
          console.log(`✅ Found data in ${endpoint.name}`);
          return { endpoint: endpoint.name, data: response.data };
        }
      } catch (error) {
        console.log(`❌ ${endpoint.name} failed:`, error.message);
      }
    }
    
    return null;
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Load courses first
      const coursesResponse = await getMyCourses();
      
      // Process courses
      let coursesData = [];
      if (coursesResponse.data?.courses && Array.isArray(coursesResponse.data.courses)) {
        coursesData = coursesResponse.data.courses;
      } else if (Array.isArray(coursesResponse.data)) {
        coursesData = coursesResponse.data;
      } else if (coursesResponse.data?.results && Array.isArray(coursesResponse.data.results)) {
        coursesData = coursesResponse.data.results;
      }

      setCourses(coursesData);

      // Find and load AI quizzes
      const quizResult = await findAIQuizzes();
      
      if (!quizResult) {
        console.log('No AI quiz endpoints returned data');
        setQuizzes([]);
        return;
      }

      let aiQuizzesData = [];
      
      // Extract data based on structure
      if (Array.isArray(quizResult.data)) {
        aiQuizzesData = quizResult.data;
      } else if (quizResult.data.results && Array.isArray(quizResult.data.results)) {
        aiQuizzesData = quizResult.data.results;
      } else if (quizResult.data.slides && Array.isArray(quizResult.data.slides)) {
        aiQuizzesData = quizResult.data.slides;
      } else if (quizResult.data.quizzes && Array.isArray(quizResult.data.quizzes)) {
        aiQuizzesData = quizResult.data.quizzes;
      }

      console.log('Raw AI quiz data:', aiQuizzesData);

      // Normalize AI quiz data structure to match QuizTile expectations
      const normalizedQuizzes = aiQuizzesData.map(quiz => {
        console.log('Processing quiz:', quiz);
        
        // Handle different possible data structures
        const normalized = {
          id: quiz.id,
          title: quiz.title || quiz.slide_title || quiz.name || 'Untitled Quiz',
          topic: {
            name: quiz.topic?.name || quiz.topic_name || 'Unknown Topic',
            course: {
              code: quiz.topic?.course?.code || 
                    quiz.course?.code || 
                    quiz.course_code || 
                    'UNKNOWN',
              name: quiz.topic?.course?.name || 
                    quiz.course?.name || 
                    quiz.course_name || 
                    'Unknown Course'
            }
          },
          questions_count: quiz.questions_count || 
                          quiz.total_questions || 
                          quiz.questions?.length || 
                          0,
          total_points: quiz.total_points || 
                       quiz.points || 
                       quiz.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 
                       0,
          created_at: quiz.created_at || 
                     quiz.date_created || 
                     quiz.uploaded_at || 
                     new Date().toISOString(),
          is_live: quiz.is_live || 
                  quiz.published || 
                  quiz.is_published ||
                  quiz.status === 'published' || 
                  false,
          difficulty: quiz.difficulty || 
                     quiz.level || 
                     quiz.metadata?.difficulty ||
                     'medium',
          is_ai_generated: true,
          // Additional metadata
          status: quiz.status || (quiz.is_live ? 'published' : 'draft'),
          time_limit: quiz.time_limit,
          metadata: quiz.metadata
        };

        console.log('Normalized quiz:', normalized);
        return normalized;
      });

      console.log('Final normalized quizzes:', normalizedQuizzes);
      setQuizzes(normalizedQuizzes);
      
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      const errorMsg = err.response?.data?.detail || 
                      err.response?.data?.message || 
                      err.message ||
                      'Failed to load dashboard data';
      setError(errorMsg);
      
      // Set empty data on error
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  };

  // Delete quiz handler - disabled for AI quizzes since no delete API exists
  const handleDeleteQuiz = async (quiz) => {
    // For now, show an informative message instead of trying to delete
    setError('AI quizzes cannot be deleted directly. Use the moderation interface to reject quizzes if needed.');
    
    // Alternative: You could redirect to moderation instead
    // window.location.href = `/moderate-quiz/${quiz.id}`;
  };

  // Update quiz status
  const handleStatusChange = (quizId, newStatus) => {
    setQuizzes(prev =>
      prev.map(q => q.id === quizId
        ? { ...q, is_live: newStatus === 'published' || newStatus === 'live' }
        : q
      )
    );
  };

  // Filter quizzes based on search term
  const filteredQuizzes = quizzes.filter(q =>
    q.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.topic?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.topic?.course?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.topic?.course?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort quizzes by creation date (newest first)
  const sortedQuizzes = filteredQuizzes.sort((a, b) => {
    const dateA = new Date(a.created_at || 0);
    const dateB = new Date(b.created_at || 0);
    return dateB - dateA;
  });

  const recentQuizzes = sortedQuizzes.slice(0, 8);

  // Calculate stats
  const stats = {
    total: quizzes.length,
    draft: quizzes.filter(q => !q.is_live && (q.questions_count || 0) === 0).length,
    ready: quizzes.filter(q => !q.is_live && (q.questions_count || 0) > 0).length,
    live: quizzes.filter(q => q.is_live).length,
    aiGenerated: quizzes.length // All are AI generated
  };

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

        {/* Dashboard Stats */}
     
        <div className="quiz-header1">
          <div className="Title">
            {loading ? 'Loading...' : `AI Quiz List (${filteredQuizzes.length})`}
          </div>
          <div className="header-actions">
            {filteredQuizzes.length > 8 && (
              <button 
                className="More" 
                onClick={() => window.location.href = '/LecturerQuizHistory'}
              >
                View All
              </button>
            )}
            <button 
              className="create-quiz-btn"
              onClick={() => window.location.href = '/LecturerAIQuizzes'}
            >
              + Create AI Quiz
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
                key={`ai_quiz_${quiz.id}`}
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
                🤖
              </div>
              <h3 style={{ 
                color:'#333', 
                marginBottom:'10px', 
                fontSize:'18px' 
              }}>
                {searchTerm ? 'No AI quizzes match your search' : 'No AI quizzes available'}
              </h3>
              <p style={{ 
                color:'#666', 
                marginBottom:'20px', 
                fontSize:'14px' 
              }}>
                {searchTerm 
                  ? 'Try another term or clear your search.'
                  : 'Upload slides to automatically generate AI quizzes with different difficulty levels.'
                }
              </p>
              {searchTerm ? (
                <button 
                  onClick={() => setSearchTerm('')} 
                  style={{
                    background:'transparent', 
                    color:'#1935CA', 
                    border:'1px solid #1935CA',
                    padding:'12px 24px', 
                    borderRadius:'6px', 
                    fontSize:'14px', 
                    cursor:'pointer', 
                    fontWeight:'500',
                    fontFamily: 'Poppins, sans-serif'
                  }}
                >
                  Clear Search
                </button>
              ) : (
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
                  Create First AI Quiz
                </button>
              )}
            </div>
          )}
        </div>

        
      </div>

      <div className="SideD">
        <div className="List">
          <CoursesList 
            courses={courses} 
            loading={loading} 
            onRefresh={loadDashboardData} 
          />
        </div>
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
          background: #f5f5f5;
          font-family: 'Poppins', sans-serif;
        }
        
        .dashboard-stats {
          margin: 20px 0;
          padding: 0 20px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          max-width: 800px;
        }
        
        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          text-align: center;
          border-left: 4px solid #1935CA;
        }
        
        .stat-number {
          font-size: 28px;
          font-weight: bold;
          color: #333;
          margin-bottom: 4px;
          font-family: 'Poppins', sans-serif;
        }
        
        .stat-label {
          font-size: 14px;
          color: #666;
          font-weight: 500;
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
        
        .quick-actions {
          margin: 40px 20px 20px;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .quick-actions h3 {
          margin: 0 0 16px 0;
          color: #333;
          font-size: 18px;
          font-family: 'Poppins', sans-serif;
        }
        
        .action-buttons {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        .action-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Poppins', sans-serif;
        }
        
        .action-btn.primary {
          background: #1935CA;
          color: white;
        }
        
        .action-btn.primary:hover:not(:disabled) {
          background: #1527A3;
        }
        
        .action-btn.secondary {
          background: #f5f5f5;
          color: #666;
          border: 1px solid #ddd;
        }
        
        .action-btn.secondary:hover:not(:disabled) {
          background: #e0e0e0;
        }
        
        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        @media (max-width: 768px) {
          .dashboard-stats {
            padding: 0 16px;
          }
          
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .quiz-header1 {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
            padding: 0 16px;
          }
          
          .header-actions {
            justify-content: center;
          }
          
          .quick-actions {
            margin: 20px 16px;
          }
          
          .action-buttons {
            flex-direction: column;
          }
          
          .action-btn {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}

export default Dashboard;