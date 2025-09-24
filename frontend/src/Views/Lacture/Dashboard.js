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
      console.log(`Fetching quiz details for ID: ${quizId}`);
      const response = await getAdaptiveQuiz(quizId);
      console.log(`Quiz details for ${quizId}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch quiz ${quizId}:`, error);
      return null;
    }
  };

  // Function to get available quizzes from student perspective (these have real IDs)
  const getAvailableQuizzes = async () => {
    try {
      console.log('Fetching available slides/quizzes...');
      const response = await studentAvailableSlides();
      console.log('Available slides response:', response.data);
      
      let slidesData = [];
      if (Array.isArray(response.data)) {
        slidesData = response.data;
      } else if (response.data?.slides) {
        slidesData = response.data.slides;
      } else if (response.data?.results) {
        slidesData = response.data.results;
      }

      // Extract and structure quiz information from slides
      const quizInfoList = slidesData
        .filter(slide => slide.quiz_id || slide.adaptive_quiz_id || slide.generated_quiz_id)
        .map(slide => ({
          adaptiveQuizId: slide.adaptive_quiz_id || slide.quiz_id,
          quizId: slide.quiz_id,
          slideId: slide.id || slide.slide_id,
          title: slide.title || slide.slide_title,
          isPublished: !!(slide.adaptive_quiz_id || slide.quiz_id),
          slideData: slide
        }))
        .filter(info => info.adaptiveQuizId || info.quizId);

      console.log('Found quiz info:', quizInfoList);
      return quizInfoList;
    } catch (error) {
      console.error('Error getting available quizzes:', error);
      return [];
    }
  };

  // Comprehensive function to find AI quizzes using multiple approaches
  const findAIQuizzes = async () => {
    console.log('=== COMPREHENSIVE AI QUIZ SEARCH ===');
    
    const allQuizData = [];

    // Method 1: Get quizzes for review (lecturer perspective - draft/unpublished)
    try {
      console.log('Method 1: Getting quizzes for review...');
      const reviewResponse = await getQuizzesForReview();
      console.log('Quizzes for review:', reviewResponse.data);
      
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
    } catch (error) {
      console.log('Method 1 failed:', error.message);
    }

    // Method 2: Get available quiz IDs and fetch details (published quizzes)
    try {
      console.log('Method 2: Getting published quiz details...');
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
    } catch (error) {
      console.log('Method 2 failed:', error.message);
    }

    // Method 3: Get lecturer slides (fallback for any missed quizzes)
    try {
      console.log('Method 3: Getting lecturer slides...');
      const slidesResponse = await lecturerSlides();
      console.log('Lecturer slides:', slidesResponse.data);
      
      let slidesData = [];
      if (Array.isArray(slidesResponse.data)) {
        slidesData = slidesResponse.data;
      } else if (slidesResponse.data?.slides) {
        slidesData = slidesResponse.data.slides;
      }
      
      slidesData.forEach(slide => {
        // Only add if not already found in previous methods
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
    } catch (error) {
      console.log('Method 3 failed:', error.message);
    }

    console.log('All collected quiz data:', allQuizData);
    return allQuizData;
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

      // Find and load AI quizzes using comprehensive approach
      const allQuizData = await findAIQuizzes();
      
      if (allQuizData.length === 0) {
        console.log('No quiz data found from any method');
        setQuizzes([]);
        return;
      }

      // Enhanced quiz processing with proper ID prioritization
      const normalizedQuizzes = allQuizData.map((quiz, index) => {
        console.log(`Processing quiz ${index}:`, quiz);
        
        // ID Priority System:
        // 1. For published quizzes: use adaptive_quiz_id for operations
        // 2. For unpublished quizzes: use slide_id for operations
        // 3. Always keep track of all relevant IDs
        
        let displayId = null;
        let operationalId = null; // ID to use for API operations
        let hasRealId = false;
        let dataSource = quiz._source;
        
        if (quiz._isPublished && quiz._realAdaptiveQuizId) {
          // Published quiz - use adaptive quiz ID
          displayId = quiz._realAdaptiveQuizId;
          operationalId = quiz._realAdaptiveQuizId;
          hasRealId = true;
          dataSource = 'published';
          console.log('Using published adaptive quiz ID:', displayId);
        } else if (quiz._slideId) {
          // Unpublished quiz - use slide ID for operations
          displayId = quiz._slideId;
          operationalId = quiz._slideId;
          hasRealId = false;
          console.log('Using slide ID for unpublished quiz:', displayId);
        } else if (quiz.id) {
          // Fallback to whatever ID is available
          displayId = quiz.id;
          operationalId = quiz.id;
          hasRealId = false;
          console.log('Using fallback ID:', displayId);
        }

        // Generate a consistent ID for React keys if needed
        if (!displayId || String(displayId) === 'undefined' || String(displayId) === 'null') {
          const timestamp = Date.now();
          const random = Math.random().toString(36).substr(2, 9);
          displayId = `temp_${quiz._source}_${timestamp}_${index}_${random}`;
          operationalId = displayId;
          hasRealId = false;
          dataSource = 'generated';
          console.warn(`Generated temporary ID for quiz "${quiz.title || 'Untitled'}": ${displayId}`);
        }
        
        // Handle different possible data structures based on source
        const normalized = {
          // Display ID for React and UI
          id: String(displayId),
          
          // All relevant IDs for proper operations
          slideId: quiz._slideId || quiz.slide_id,
          adaptiveQuizId: quiz._realAdaptiveQuizId || quiz.adaptive_quiz_id,
          quizId: quiz._realQuizId || quiz.quiz_id,
          
          title: quiz.title || 
                 quiz.slide_title || 
                 quiz.name || 
                 quiz.quiz_title ||
                 'Untitled Quiz',
          
          topic: {
            name: quiz.topic?.name || 
                  quiz.topic_name || 
                  quiz.subject?.name ||
                  'Unknown Topic',
            course: {
              code: quiz.topic?.course?.code || 
                    quiz.course?.code || 
                    quiz.course_code || 
                    quiz.subject?.course?.code ||
                    'UNKNOWN',
              name: quiz.topic?.course?.name || 
                    quiz.course?.name || 
                    quiz.course_name || 
                    quiz.subject?.course?.name ||
                    'Unknown Course'
            }
          },
          
          questions_count: quiz.questions_count || 
                          quiz.total_questions || 
                          quiz.questions?.length || 
                          (quiz.questions_generated ? 5 : 0),
          
          total_points: quiz.total_points || 
                       quiz.points || 
                       quiz.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 
                       (quiz.questions_count ? quiz.questions_count * 2 : 0),
          
          created_at: quiz.created_at || 
                     quiz.date_created || 
                     quiz.uploaded_at || 
                     quiz.upload_date ||
                     new Date().toISOString(),
          
          is_live: quiz._isPublished || 
                  quiz.is_live || 
                  quiz.published || 
                  quiz.is_published ||
                  quiz.status === 'published' || 
                  !!(quiz._realAdaptiveQuizId), // Has adaptive quiz ID = published
          
          difficulty: quiz.difficulty || 
                     quiz.level || 
                     quiz.metadata?.difficulty ||
                     'medium',
          
          is_ai_generated: true,
          
          // Additional metadata
          status: quiz.status || 
                 (quiz._isPublished ? 'published' : 
                  (quiz.questions_generated || quiz.questions_count > 0 ? 'ready' : 'draft')),
          
          time_limit: quiz.time_limit,
          metadata: quiz.metadata || {},
          
          // IMPORTANT: Source tracking for better ID management
          dataSource: dataSource,
          hasRealId: hasRealId,
          originalData: quiz,
          
          // Publish tracking
          publishedAt: quiz.published_at || quiz.date_published,
          originalSlideId: quiz._slideId
        };

        console.log(`Normalized quiz: "${normalized.title}" with display ID: ${normalized.id} (adaptive: ${normalized.adaptiveQuizId}, slide: ${normalized.slideId}, source: ${normalized.dataSource})`);
        return normalized;
      });

      // Remove duplicates with better logic for published vs unpublished
      const uniqueQuizzes = normalizedQuizzes.reduce((acc, current) => {
        const duplicate = acc.find(quiz => {
          // Check for same slide or same title/course combination
          return (quiz.slideId && current.slideId && quiz.slideId === current.slideId) ||
                 (quiz.title === current.title && 
                  quiz.topic?.course?.code === current.topic?.course?.code &&
                  quiz.topic?.name === current.topic?.name);
        });
        
        if (duplicate) {
          // Prefer published quizzes over draft ones
          if (current.is_live && !duplicate.is_live) {
            const index = acc.indexOf(duplicate);
            acc[index] = current;
            console.log('Replaced draft with published quiz:', current.title);
          } else if (current.hasRealId && !duplicate.hasRealId) {
            // Prefer real IDs over generated ones
            const index = acc.indexOf(duplicate);
            acc[index] = current;
            console.log('Replaced generated ID with real ID:', current.title);
          }
          // Otherwise keep the first one
        } else {
          acc.push(current);
        }
        return acc;
      }, []);

      console.log('Final unique quizzes with proper ID management:', uniqueQuizzes);
      
      // Enhanced validation
      const publishedQuizzes = uniqueQuizzes.filter(q => q.is_live && q.adaptiveQuizId);
      const draftQuizzes = uniqueQuizzes.filter(q => !q.is_live);
      const invalidQuizzes = uniqueQuizzes.filter(q => 
        !q.id || q.id === 'undefined' || q.id === 'null' || String(q.id) === 'undefined'
      );
      
      console.log(`Quiz Summary:`);
      console.log(`- Published with adaptive IDs: ${publishedQuizzes.length}`);
      console.log(`- Draft quizzes: ${draftQuizzes.length}`);
      console.log(`- Invalid IDs: ${invalidQuizzes.length}`);
      
      if (invalidQuizzes.length > 0) {
        console.error('Some quizzes still have invalid IDs:', invalidQuizzes);
      }
      
      setQuizzes(uniqueQuizzes);
      
    } catch (err) {
      console.error('Error loading dashboard data:', err);
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

  // Delete quiz handler - disabled for AI quizzes since no delete API exists
  const handleDeleteQuiz = async (quiz) => {
    setError('AI quizzes cannot be deleted directly. Use the moderation interface to reject quizzes if needed.');
  };

  // Enhanced status change handler with proper ID updates
  const handleStatusChange = (quizId, newStatus, publishData = null) => {
    console.log('=== HANDLING STATUS CHANGE ===');
    console.log('Quiz ID:', quizId);
    console.log('New status:', newStatus);
    console.log('Publish data:', publishData);
    
    setQuizzes(prev => {
      return prev.map(quiz => {
        // Find the quiz that was published
        const isTargetQuiz = quiz.id === quizId || 
                            (publishData?.originalId && quiz.id === publishData.originalId) ||
                            (publishData?.originalSlideId && quiz.slideId === publishData.originalSlideId);
        
        if (isTargetQuiz) {
          const updatedQuiz = {
            ...quiz,
            is_live: newStatus === 'published' || newStatus === 'live',
            status: newStatus === 'published' ? 'published' : quiz.status
          };

          // Update IDs when publishing
          if (publishData) {
            if (publishData.newAdaptiveQuizId) {
              updatedQuiz.adaptiveQuizId = publishData.newAdaptiveQuizId;
              updatedQuiz.hasRealId = true;
              updatedQuiz.dataSource = 'published';
              console.log('Updated quiz with new adaptive ID:', publishData.newAdaptiveQuizId);
            }
            
            if (publishData.newQuizId) {
              updatedQuiz.quizId = publishData.newQuizId;
            }

            // Add publish metadata
            updatedQuiz.publishedAt = publishData.publishedAt;
            
            // Keep original slide ID for reference
            if (publishData.originalSlideId && !updatedQuiz.originalSlideId) {
              updatedQuiz.originalSlideId = publishData.originalSlideId;
            }
          }

          console.log('Updated quiz after status change:', updatedQuiz);
          return updatedQuiz;
        }
        
        return quiz;
      });
    });
  };

  // Filter quizzes based on search term
  const filteredQuizzes = quizzes.filter(q =>
    q.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.topic?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.topic?.course?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.topic?.course?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort quizzes by creation date (newest first), prioritizing published quizzes
  const sortedQuizzes = filteredQuizzes.sort((a, b) => {
    // First, prioritize published quizzes with adaptive IDs
    if (a.is_live && a.adaptiveQuizId && (!b.is_live || !b.adaptiveQuizId)) return -1;
    if (b.is_live && b.adaptiveQuizId && (!a.is_live || !a.adaptiveQuizId)) return 1;
    
    // Then prioritize ready quizzes over drafts
    if (a.status === 'ready' && b.status === 'draft') return -1;
    if (b.status === 'ready' && a.status === 'draft') return 1;
    
    // Finally sort by date
    const dateA = new Date(a.created_at || 0);
    const dateB = new Date(b.created_at || 0);
    return dateB - dateA;
  });

  const recentQuizzes = sortedQuizzes.slice(0, 8);

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
                📚
              </div>
              <h3 style={{ 
                color:'#333', 
                marginBottom:'10px', 
                fontSize:'18px' 
              }}>
                {searchTerm ? 'No AI quizzes match your search' : 'No quizzes available'}
              </h3>
              <p style={{ 
                color:'#666', 
                marginBottom:'20px', 
                fontSize:'14px' 
              }}>
                {searchTerm 
                  ? 'Try another term or clear your search.'
                  : 'Upload slides to automatically generate quizzes with different difficulty levels.'
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