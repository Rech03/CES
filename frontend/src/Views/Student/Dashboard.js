import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  getStudentAvailableQuizzes,
  studentAdaptiveProgress
} from '../../api/ai-quiz';

import { getMyCourses } from '../../api/courses';

import Bio from "../../Componets/Lacture/bio";
import Biography from "../../Componets/Student/Biography";
import CoursesList from "../../Componets/Student/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
import QuizTile from "../../Componets/Student/QuizTile";
import SearchBar from "../../Componets/Student/SearchBar";
import "./Dashboard.css";

const MAX_ATTEMPTS = 3;

function Dashboard() {
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllQuizzes, setShowAllQuizzes] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // helper to flatten available-quizzes response
  const flattenAvailableQuizzes = (data) => {
    const out = [];
    const slides = Array.isArray(data?.slides) ? data.slides : [];
    for (const s of slides) {
      const info = s?.slide_info || {};
      const qs = Array.isArray(s?.quizzes) ? s.quizzes : [];
      for (const q of qs) {
        out.push({
          quiz_id: q.quiz_id,
          difficulty: (q.difficulty || '').toLowerCase(),
          accessible: !!q.accessible,
          access_reason: q.access_reason,
          status: q.status,
          question_count: q.question_count,
          progress: q.progress || {},
          slide_id: info.slide_id,
          slide_title: info.title,
          topic_name: info.topic_name,
          course_code: info.course_code,
          course_name: info.course_name,
          created_at: info.created_at,
        });
      }
    }
    return out;
  };

  const buildCards = (flat, attemptsMap) => {
    const onlyAccessible = flat.filter(q => q.accessible);

    return onlyAccessible.map((item) => {
      const attemptsUsed = attemptsMap[item.quiz_id]?.attempts_count ?? item.progress?.attempts_count ?? 0;
      const bestScore = attemptsMap[item.quiz_id]?.best_score ?? item.progress?.best_score ?? null;
      const completed = attemptsMap[item.quiz_id]?.completed ?? item.progress?.completed ?? false;

      const status = completed ? 'completed' : (attemptsUsed >= MAX_ATTEMPTS ? 'locked' : 'available');

      const titleFromContext =
        (item.topic_name ? `${item.topic_name}` : (item.course_code || 'Quiz')) +
        ` • ${(item.difficulty || 'level').toUpperCase()}`;

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
        attempts: `${Math.min(attemptsUsed, MAX_ATTEMPTS)}/${MAX_ATTEMPTS}`,
        bestScore: bestScore != null ? `${Math.round(bestScore)}%` : null,
        isLive: false,
        canAccess: attemptsUsed < MAX_ATTEMPTS,
        createdAt: item.created_at || null,
      };
    }).sort((a, b) => {
      const pr = { available: 0, completed: 1, locked: 2, missed: 3 };
      const pa = pr[a.status] ?? 99, pb = pr[b.status] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setDebugInfo('Fetching available quizzes...');

    try {
      const [avqResp, progResp] = await Promise.all([
        getStudentAvailableQuizzes(),
        studentAdaptiveProgress().catch(() => ({ data: {} }))
      ]);

      const flat = flattenAvailableQuizzes(avqResp.data);

      // map attempts/best per quiz from progress
      const attemptsMap = {};
      const attemptsRaw = Array.isArray(progResp?.data)
        ? progResp.data
        : progResp?.data?.attempts || progResp?.data?.recent_attempts || [];

      (attemptsRaw || []).forEach((a) => {
        const qid = a.adaptive_quiz_id || a.quiz_id;
        if (!qid) return;
        const score = Number.isFinite(Number(a.score)) ? Number(a.score) : null;
        const entry = attemptsMap[qid] || { attempts_count: 0, best_score: null, completed: false };
        entry.attempts_count += 1;
        if (score != null) entry.best_score = Math.max(entry.best_score ?? 0, score);
        entry.completed = entry.completed || (a.is_completed ?? a.status === 'completed');
        attemptsMap[qid] = entry;
      });

      const cards = buildCards(flat, attemptsMap);
      setQuizzes(cards);

      try {
        const coursesResp = await getMyCourses();
        const fetchedCourses = Array.isArray(coursesResp.data)
          ? coursesResp.data
          : (coursesResp.data?.courses || coursesResp.data?.results || []);
        setCourses(fetchedCourses);
      } catch (e) {
        console.warn('getMyCourses failed:', e);
      }

      setDebugInfo(`Accessible quizzes: ${cards.length}`);
    } catch (err) {
      console.error(err);
      setError(`Failed to load quizzes: ${err.message}`);
      setDebugInfo(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuizzes = quizzes.filter(quiz =>
    quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.topicName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const quizzesToShow = showAllQuizzes ? filteredQuizzes : filteredQuizzes.slice(0, 6);

  const handleViewAll = () => setShowAllQuizzes(!showAllQuizzes);

  const handleStartQuiz = (quiz) => {
    if (!quiz?.adaptiveQuizId) return;
    if (!quiz.canAccess) return; // lock when attempts hit 3

    localStorage.setItem('last_quiz_id', String(quiz.adaptiveQuizId));
    if (quiz.slideId != null) localStorage.setItem('last_slide_id', String(quiz.slideId));

    navigate('/QuizInterface', {
      state: {
        quizTitle: quiz.title,
        quizDuration: quiz.duration,
        totalQuestions: quiz.totalQuestions,
        quizId: quiz.adaptiveQuizId,
        slideId: quiz.slideId ?? null,
        isAIQuiz: true,
        isLive: !!quiz.isLive
      }
    });
    window.history.replaceState(
      {},
      '',
      `/QuizInterface?quizId=${quiz.adaptiveQuizId}${quiz.slideId ? `&slideId=${quiz.slideId}` : ''}`
    );
  };

  const handleViewResults = (quiz) => {
    window.location.href = `/QuizAnalyticsPage?quizId=${quiz.adaptiveQuizId}${quiz.slideId ? `&slideId=${quiz.slideId}` : ''}`;
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
              fontSize: '14px'
            }}
          >
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
                ({filteredQuizzes.length} result{filteredQuizzes.length !== 1 ? 's' : ''})
              </span>
            )}
          </div>
          {filteredQuizzes.length > 6 && (
            <div className="More" onClick={handleViewAll} style={{ cursor: 'pointer' }}>
              {showAllQuizzes ? 'Show Less' : 'View All'}
            </div>
          )}
        </div>

        <div className="QuizList">
          {quizzesToShow.length > 0 ? (
            quizzesToShow.map(quiz => (
              <QuizTile
                key={`quiz_${quiz.adaptiveQuizId}_${quiz.slideId ?? 'na'}`}
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
                attempts={quiz.attempts}
                bestScore={quiz.bestScore}
                isLive={quiz.isLive}
                canAccess={quiz.canAccess}
                onStartQuiz={() => handleStartQuiz(quiz)}
                onViewResults={() => handleViewResults(quiz)}
                onClick={() => handleStartQuiz(quiz)}
              />
            ))
          ) : (
            <div className="no-quizzes" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.3 }}>📚</div>
              <h3 style={{ color: '#333', marginBottom: '10px', fontSize: '18px' }}>
                No accessible quizzes right now
              </h3>
              <p style={{ color: '#666', marginBottom: '20px' }}>
                Your lecturers haven’t made any quizzes available yet. Check back later!
              </p>
              <button
                onClick={fetchData}
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
