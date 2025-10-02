import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  getStudentAvailableQuizzes,
} from '../../api/ai-quiz';

import Bio from "../../Componets/Student/bio";
import Biography from "../../Componets/Student/Biography";
import CoursesList from "../../Componets/Student/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
import QuizTile from "../../Componets/Student/QuizTile";
import SearchBar from "../../Componets/Student/SearchBar";
import "./Dashboard.css";

const PASS_THRESHOLD = 50; // Only used for unlocking next level

function Dashboard() {
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllQuizzes, setShowAllQuizzes] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flattenAvailableQuizzes = (data) => {
    const out = [];
    
    const slides = Array.isArray(data?.slides) 
      ? data.slides 
      : Array.isArray(data) 
      ? data 
      : [];
    
    console.log('Flattening slides:', slides.length);
    
    for (const s of slides) {
      const info = s?.slide_info || {};
      const qs = Array.isArray(s?.quizzes) ? s.quizzes : [];
      
      console.log(`Processing slide "${info.title}" with ${qs.length} quizzes`);
      
      for (const q of qs) {
        out.push({
          quiz_id: q.quiz_id,
          difficulty: (q.difficulty || '').toLowerCase(),
          accessible: !!q.accessible,
          access_reason: q.access_reason,
          status: q.status,
          question_count: q.question_count,
          progress: q.progress || {
            attempts_count: 0,
            best_score: null,
            latest_score: null,
            completed: false,
            last_attempt_at: null
          },
          slide_id: info.slide_id,
          slide_title: info.title,
          topic_name: info.topic_name,
          course_code: info.course_code,
          course_name: info.course_name,
          created_at: info.created_at,
        });
      }
    }
    
    console.log('Total quizzes:', out.length);
    return out;
  };

  const buildCards = (flat) => {
    // Group quizzes by slide to check progression rules
    const quizzesBySlide = {};
    flat.forEach(item => {
      if (!quizzesBySlide[item.slide_id]) {
        quizzesBySlide[item.slide_id] = [];
      }
      quizzesBySlide[item.slide_id].push(item);
    });

    return flat.map((item) => {
      const attemptsUsed = item.progress?.attempts_count || 0;
      const bestScore = item.progress?.best_score || 0;
      const completed = item.progress?.completed || item.status === 'completed';
      const lastAttemptAt = item.progress?.last_attempt_at;

      // Check if this quiz should be unlocked based on custom rules
      const slideQuizzes = quizzesBySlide[item.slide_id] || [];
      let canAccess = true;
      let accessReason = '';

      if (item.difficulty === 'medium') {
        // Check if easy level exists and meets unlock criteria (3 attempts)
        const easyQuiz = slideQuizzes.find(q => q.difficulty === 'easy');
        if (easyQuiz) {
          const easyAttempts = easyQuiz.progress?.attempts_count || 0;
          
          // Unlock after 3 attempts
          const unlocked = easyAttempts >= 3;
          
          if (!unlocked) {
            canAccess = false;
            accessReason = `Complete Easy level 3 times first (${easyAttempts}/3 attempts)`;
          }
        }
      } else if (item.difficulty === 'hard') {
        // Check if medium level has 3 attempts
        const mediumQuiz = slideQuizzes.find(q => q.difficulty === 'medium');
        if (mediumQuiz) {
          const mediumAttempts = mediumQuiz.progress?.attempts_count || 0;
          
          // Hard unlocks after medium has 3 attempts
          const unlockedByMedium = mediumAttempts >= 3;
          
          if (!unlockedByMedium) {
            canAccess = false;
            accessReason = `Complete Medium level 3 times first (${mediumAttempts}/3 attempts)`;
          }
        }
      }

      // Determine status
      let status = 'available';
      if (!canAccess) {
        status = 'locked';
      } else if (completed) {
        status = 'completed';
      } else if (attemptsUsed > 0) {
        status = 'in_progress';
      }

      const difficultyDisplay = item.difficulty 
        ? item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)
        : 'Level';
      
      const titleFromContext = item.slide_title 
        ? `${item.slide_title} • ${difficultyDisplay}`
        : `${item.topic_name || item.course_code || 'Quiz'} • ${difficultyDisplay}`;

      return {
        adaptiveQuizId: item.quiz_id,
        slideId: item.slide_id ?? null,
        title: titleFromContext,
        duration: '15 min',
        totalQuestions: item.question_count || 5,
        dueDate: 'Self-paced',
        status,
        courseCode: (item.course_code || 'default').toLowerCase(),
        topicName: item.topic_name || item.slide_title || 'Topic',
        difficulty: item.difficulty || 'medium',
        attemptsUsed: attemptsUsed,
        attemptsDisplay: `${attemptsUsed} attempt${attemptsUsed !== 1 ? 's' : ''}`,
        bestScore: bestScore != null ? `${Math.round(bestScore)}%` : null,
        bestScoreValue: bestScore,
        latestScore: item.progress?.latest_score != null ? `${Math.round(item.progress.latest_score)}%` : null,
        isLive: true,
        canAccess: canAccess,
        accessible: canAccess,
        accessReason: accessReason,
        createdAt: item.created_at || null,
        lastAttemptAt: lastAttemptAt || null,
      };
    }).sort((a, b) => {
      // Sort by last attempt (most recent first)
      const dateA = new Date(a.lastAttemptAt || a.createdAt || 0);
      const dateB = new Date(b.lastAttemptAt || b.createdAt || 0);
      
      return dateB - dateA; // Most recent first
    });
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setDebugInfo('Fetching available quizzes...');

    try {
      const avqResp = await getStudentAvailableQuizzes();
      
      console.log('Available quizzes response:', avqResp.data);
      
      const flat = flattenAvailableQuizzes(avqResp.data);
      const cards = buildCards(flat);
      
      setQuizzes(cards);
      
      const totalCount = cards.length;
      const accessibleCount = cards.filter(q => q.canAccess).length;
      
      setDebugInfo(`Found ${totalCount} quiz${totalCount !== 1 ? 'es' : ''} (${accessibleCount} accessible)`);
      
      const statusCounts = cards.reduce((acc, q) => {
        acc[q.status] = (acc[q.status] || 0) + 1;
        return acc;
      }, {});
      console.log('Quiz status breakdown:', statusCounts);
      console.log('Total quizzes loaded:', totalCount);
      
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      const errorMsg = err.response?.data?.detail 
        || err.response?.data?.message 
        || err.message 
        || 'Failed to load quizzes';
      setError(errorMsg);
      setDebugInfo(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuizzes = quizzes.filter(quiz =>
    quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.topicName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.difficulty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const quizzesToShow = showAllQuizzes ? filteredQuizzes : filteredQuizzes.slice(0, 8);

  const handleViewAll = () => setShowAllQuizzes(!showAllQuizzes);

  const handleStartQuiz = (quiz) => {
    if (!quiz?.adaptiveQuizId) {
      console.error('No quiz ID provided');
      return;
    }
    
    if (!quiz.canAccess) {
      setError(quiz.accessReason || 'This quiz is not accessible yet.');
      return;
    }

    localStorage.setItem('last_quiz_id', String(quiz.adaptiveQuizId));
    if (quiz.slideId != null) {
      localStorage.setItem('last_slide_id', String(quiz.slideId));
    }

    navigate('/QuizInterface', {
      state: {
        quizTitle: quiz.title,
        quizDuration: quiz.duration,
        totalQuestions: quiz.totalQuestions,
        quizId: quiz.adaptiveQuizId,
        slideId: quiz.slideId ?? null,
        isAIQuiz: true,
        isLive: quiz.isLive,
        difficulty: quiz.difficulty
      }
    });
  };

  if (loading) {
    return (
      <div>
        <div className="NavBar">
          <NavBar />
        </div>
        <div className="loading-dashboard" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '40px'
        }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #1935CA',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '20px'
          }}></div>
          <p style={{ fontSize: '16px', color: '#666', marginBottom: '10px' }}>
            Loading your quizzes...
          </p>
          <div style={{ fontSize: '12px', color: '#999' }}>
            {debugInfo}
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

  return (
    <div>
      <div className="NavBar">
        <NavBar />
      </div>

      <div className="SeachBar">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search quizzes by title, course, topic, or difficulty..."
        />
      </div>

      <div className="ContainerD">
        <div className="Boigraphy">
          <Biography 
            showLoading={true}
            compact={false}
          />
        </div>

        {error && (
          <div
            className="error-message"
            style={{
              background: '#FEE2E2',
              border: '1px solid #FECACA',
              color: '#DC2626',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '20px',
              fontSize: '14px',
              position: 'relative'
            }}
          >
            {error}
            <button
              onClick={() => setError(null)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '12px',
                background: 'none',
                border: 'none',
                color: '#DC2626',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '18px'
              }}
            >
              ×
            </button>
          </div>
        )}

        <div className="quiz-header1">
          <div className="Title">
            Available Quizzes ({filteredQuizzes.length})
            {searchTerm && (
              <span className="search-results" style={{
                fontSize: '14px',
                color: '#666',
                fontWeight: 'normal',
                marginLeft: '10px'
              }}>
                - {filteredQuizzes.length} result{filteredQuizzes.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {filteredQuizzes.length > 8 && (
            <div className="More" onClick={handleViewAll} style={{ cursor: 'pointer' }}>
              {showAllQuizzes ? 'Show Less' : 'View All'}
            </div>
          )}
        </div>

        <div className="QuizList">
          {quizzesToShow.length > 0 ? (
            quizzesToShow.map(quiz => (
              <QuizTile
                key={`quiz_${quiz.adaptiveQuizId}_${quiz.difficulty}`}
                quizId={quiz.adaptiveQuizId}
                slideId={quiz.slideId}
                title={quiz.title}
                duration={quiz.duration}
                totalQuestions={quiz.totalQuestions}
                dueDate={quiz.dueDate}
                status={quiz.status}
                courseCode={quiz.courseCode}
                topicName={quiz.topicName}
                difficulty={quiz.difficulty}
                attemptsUsed={quiz.attemptsUsed}
                attemptsDisplay={quiz.attemptsDisplay}
                bestScore={quiz.bestScore}
                bestScoreValue={quiz.bestScoreValue}
                latestScore={quiz.latestScore}
                isLive={quiz.isLive}
                canAccess={quiz.canAccess}
                accessReason={quiz.accessReason}
                onStartQuiz={() => handleStartQuiz(quiz)}
                onClick={() => handleStartQuiz(quiz)}
              />
            ))
          ) : (
            <div className="no-quizzes" style={{ 
              gridColumn: '1 / -1', 
              textAlign: 'center', 
              padding: '40px 20px' 
            }}>
              <div style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.3 }}>
                📚
              </div>
              <h3 style={{ color: '#333', marginBottom: '10px', fontSize: '18px' }}>
                {searchTerm ? 'No quizzes match your search' : 'No quizzes available'}
              </h3>
              <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                {searchTerm 
                  ? 'Try adjusting your search criteria.'
                  : 'Your lecturers haven\'t published any quizzes yet. Check back later!'}
              </p>
              <button
                onClick={fetchData}
                style={{
                  background: '#27AE60',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="SideD">
        <CoursesList 
          compact={true}
          showLoading={true}
        />
      </div>

      <div className="BoiD">
        <Bio showLoading={true} />
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

export default Dashboard;