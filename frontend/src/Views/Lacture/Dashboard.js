import { useState, useEffect } from "react";
import Bio from "../../Componets/Lacture/bio";
import Biography from "../../Componets/Lacture/Biography";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import QuizTile from "../../Componets/Lacture/QuizTile";
import SearchBar from "../../Componets/Lacture/SearchBar";
import StarRating from "../../Componets/Lacture/StarRating";
import { listQuizzes, deleteQuiz } from "../../api/quizzes";
import { getMyCourses } from "../../api/courses";
import "./Dashboard.css";

function Dashboard() {
  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { loadDashboardData(); }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");
      const [quizzesResponse, coursesResponse] = await Promise.all([
        listQuizzes(),
        getMyCourses()
      ]);

      let quizzesData = [];
      if (Array.isArray(quizzesResponse.data)) {
        quizzesData = quizzesResponse.data;
      } else if (quizzesResponse.data?.results && Array.isArray(quizzesResponse.data.results)) {
        quizzesData = quizzesResponse.data.results;
      }

      let coursesData = [];
      if (coursesResponse.data?.courses && Array.isArray(coursesResponse.data.courses)) {
        coursesData = coursesResponse.data.courses;
      } else if (Array.isArray(coursesResponse.data)) {
        coursesData = coursesResponse.data;
      }

      setQuizzes(quizzesData);
      setCourses(coursesData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.response?.data?.detail || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Delete quiz (draft or closed)
  const handleDeleteQuiz = async (quiz) => {
    try {
      await deleteQuiz(quiz.id);
      setQuizzes(prev => prev.filter(q => q.id !== quiz.id));
    } catch (err) {
      console.error('Error deleting quiz:', err);
      setError('Failed to delete quiz');
    }
  };

  // Update live/published status from tile
  const handleStatusChange = (quizId, newStatus) => {
    setQuizzes(prev =>
      prev.map(q => q.id === quizId
        ? { ...q, is_live: newStatus === 'published' || newStatus === 'live' }
        : q
      )
    );
  };

  // Navigate to moderation/edit
  const handleEditQuiz = (quiz) => {
    window.location.href = `/edit-quiz/${quiz.id}`;
  };

  // Navigate to results
  const handleViewResults = (quiz) => {
    window.location.href = `/quiz-results/${quiz.id}`;
  };

  const filteredQuizzes = quizzes.filter(q =>
    q.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.topic?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.topic?.course?.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const recentQuizzes = filteredQuizzes.slice(0, 6);

  return (
    <div>
      <div className="NavBar"><NavBar /></div>

      <div className="SeachBar">
        <SearchBar onSearch={setSearchTerm} placeholder="Search quizzes by title, topic, or course..." />
      </div>

      <div className="ContainerD">
        <div className="Boigraphy"><Biography /></div>

        {error && (
          <div className="error-message" style={{
            background: '#FEE2E2', border: '1px solid #FECACA', color: '#DC2626',
            padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px'
          }}>
            {error}
            <button onClick={() => setError('')} style={{
              float:'right', background:'none', border:'none', color:'#DC2626',
              cursor:'pointer', fontSize:'16px'
            }}>×</button>
          </div>
        )}

        <div className="quiz-header1">
          <div className="Title">{loading ? 'Loading...' : `Quiz List (${filteredQuizzes.length})`}</div>
          {filteredQuizzes.length > 6 && (
            <div className="More" onClick={() => window.location.href = '/quiz-history'}>View All</div>
          )}
        </div>

        <div className="QuizList">
          {loading ? (
            <div className="loading-state" style={{
              gridColumn:'1 / -1', textAlign:'center', padding:'60px 20px', color:'#666'
            }}>
              <div style={{
                width:'40px', height:'40px', border:'4px solid #f3f3f3', borderTop:'4px solid #1976D2',
                borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 20px'
              }}></div>
              Loading your quizzes...
            </div>
          ) : recentQuizzes.length > 0 ? (
            recentQuizzes.map((quiz) => (
              <QuizTile
                key={quiz.id}
                quiz={quiz}
                onEdit={handleEditQuiz}
                onDelete={handleDeleteQuiz}
                onViewResults={handleViewResults}
                onStatusChange={handleStatusChange}
                onClick={() => handleEditQuiz(quiz)}
              />
            ))
          ) : (
            <div className="empty-state" style={{ gridColumn:'1 / -1', textAlign:'center', padding:'10px 20px' }}>
              <div style={{ fontSize:'48px', marginBottom:'20px', opacity:0.3 }}>📝</div>
              <h3 style={{ color:'#333', marginBottom:'10px', fontSize:'18px' }}>
                {searchTerm ? 'No quizzes match your search' : 'No quizzes available'}
              </h3>
              <p style={{ color:'#666', marginBottom:'20px', fontSize:'14px' }}>
                {searchTerm ? 'Try another term or clear your search.'
                             : 'Upload slides in AI Quizzes to auto-generate quizzes.'}
              </p>
              {searchTerm ? (
                <button onClick={() => setSearchTerm('')} style={{
                  background:'transparent', color:'#1976D2', border:'1px solid #1976D2',
                  padding:'12px 24px', borderRadius:'6px', fontSize:'14px', cursor:'pointer', fontWeight:'500'
                }}>Clear Search</button>
              ) : (
                <button onClick={() => window.location.href = '/ai-quizzes'} style={{
                  background:'#1976D2', color:'white', border:'none', padding:'12px 24px',
                  borderRadius:'6px', fontSize:'14px', cursor:'pointer', fontWeight:'500'
                }}>Go to AI Quizzes</button>
              )}
            </div>
          )}
        </div>

        {!loading && recentQuizzes.length === 0 && (
          <div className="additional-bio" style={{ marginTop:'40px', padding:'20px', background:'#f8f9fa', borderRadius:'8px' }}>
          </div>
        )}
      </div>

      <div className="SideD">
        <div className="List">
          <CoursesList courses={courses} loading={loading} onRefresh={loadDashboardData} />
        </div>
      </div>

      <div className="BoiD"><Bio /></div>

      <style jsx>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default Dashboard;
