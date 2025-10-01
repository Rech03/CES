// src/Views/Lacture/QuizAnalytics.js
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { listQuizzes } from '../../api/quizzes';
import { getQuizzesForReview } from '../../api/ai-quiz';
import { getMyCourses } from '../../api/courses';
import { getAIQuizStatistics } from '../../api/analytics';
import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";
import QuizAnalysisComponent from '../../Componets/Lacture/QuizAnalysisComponent';
import "./QuizAnalytics.css";

function QuizAnalytics() {
  const { quizId: urlQuizId } = useParams();
  const [searchParams] = useSearchParams();
  const sectionParam = searchParams.get('section');
  
  const [selectedQuizId, setSelectedQuizId] = useState(urlQuizId || null);
  const [quizzes, setQuizzes] = useState([]);
  const [aiQuizzes, setAiQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('all');
  
  // Quiz statistics state
  const [quizStats, setQuizStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Check if we should show only results
  const showOnlyResults = sectionParam === 'results' && urlQuizId;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (urlQuizId && urlQuizId !== selectedQuizId) {
      setSelectedQuizId(urlQuizId);
      // Load quiz statistics if showing results
      if (showOnlyResults) {
        loadQuizStatistics(urlQuizId);
      }
    }
  }, [urlQuizId, selectedQuizId, showOnlyResults]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [coursesResponse, traditionalQuizzesResponse, aiQuizzesResponse] = await Promise.all([
        getMyCourses().catch(err => {
          console.warn('Could not fetch courses:', err);
          return { data: [] };
        }),
        listQuizzes().catch(err => {
          console.warn('Could not fetch traditional quizzes:', err);
          return { data: [] };
        }),
        getQuizzesForReview().catch(err => {
          console.warn('Could not fetch AI quizzes:', err);
          return { data: [] };
        })
      ]);

      const fetchedCourses = coursesResponse.data.results || 
                            coursesResponse.data.courses || 
                            coursesResponse.data || 
                            [];

      const fetchedTraditionalQuizzes = traditionalQuizzesResponse.data.results || 
                                       traditionalQuizzesResponse.data || 
                                       [];

      let fetchedAiQuizzes = aiQuizzesResponse.data.results || 
                            aiQuizzesResponse.data || 
                            [];

      fetchedAiQuizzes = fetchedAiQuizzes.map(quiz => ({
        ...quiz,
        id: quiz.id || quiz.adaptive_quiz_id || quiz.quiz_id,
        type: 'ai',
        title: quiz.title || quiz.quiz_title || 'AI Generated Quiz',
        attempt_count: quiz.attempt_count || quiz.total_attempts || 0,
        total_attempts: quiz.total_attempts || quiz.attempt_count || 0,
        topic_name: quiz.topic_name || quiz.topic?.name || 'Unknown Topic',
        course_name: quiz.course_name || quiz.topic?.course?.name || quiz.course?.name || 'Unknown Course',
        course_id: quiz.course_id || quiz.topic?.course?.id || quiz.course?.id,
        created_at: quiz.created_at || quiz.date_created || new Date().toISOString()
      }));

      const normalizedTraditionalQuizzes = fetchedTraditionalQuizzes.map(quiz => ({
        ...quiz,
        type: 'traditional'
      }));

      setCourses(fetchedCourses);
      setQuizzes(normalizedTraditionalQuizzes);
      setAiQuizzes(fetchedAiQuizzes);

      if (urlQuizId) {
        const foundTraditional = normalizedTraditionalQuizzes.find(q => q.id === urlQuizId);
        const foundAi = fetchedAiQuizzes.find(q => q.id === urlQuizId);
        
        if (foundTraditional || foundAi) {
          setSelectedQuizId(urlQuizId);
          // Load statistics if showing results only
          if (showOnlyResults) {
            loadQuizStatistics(urlQuizId);
          }
        }
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load quiz data');
    } finally {
      setLoading(false);
    }
  };

  const loadQuizStatistics = async (quizId) => {
    try {
      setLoadingStats(true);
      const response = await getAIQuizStatistics(quizId);
      setQuizStats(response?.data || response);
    } catch (err) {
      console.error('Error loading quiz statistics:', err);
      setError('Failed to load quiz statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  const getAllQuizzes = () => {
    return [...quizzes, ...aiQuizzes];
  };

  const filteredQuizzes = getAllQuizzes().filter(quiz => {
    const matchesCourse = selectedCourse === 'all' || 
                         quiz.topic_id === parseInt(selectedCourse) ||
                         quiz.course_id === parseInt(selectedCourse);
    return matchesCourse;
  });

  const handleQuizSelect = (quizId) => {
    setSelectedQuizId(quizId);
    window.history.pushState({}, '', `/quiz-analytics/${quizId}`);
  };

  const handleCourseFilter = (courseId) => {
    setSelectedCourse(courseId);
  };

  const selectedQuiz = getAllQuizzes().find(q => q.id === selectedQuizId);

  if (loading) {
    return (
      <div>
        <div className="NavBar"><NavBar /></div>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading quiz analytics...</p>
        </div>
      </div>
    );
  }

  // Render results-only view
  if (showOnlyResults) {
    return (
      <div>
        <div className="NavBar"><NavBar /></div>
        <div className="SideH"><CoursesList courses={courses} /></div>
        <div className="BoiD"><Bio /></div>
        
        <div className="ContainerH">
          <div className="quiz-results-container">
            {/* Header with Back Button */}
            <div className="results-header">
              <button 
                className="back-button"
                onClick={() => window.history.back()}
              >
                ← Back to Dashboard
              </button>
              <h2>Quiz Results Analysis</h2>
            </div>

            {loadingStats && (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading quiz statistics...</p>
              </div>
            )}

            {error && !quizStats && (
              <div className="error-state">
                <div className="error-icon">⚠️</div>
                <h3>Unable to Load Quiz Results</h3>
                <p>{error}</p>
                <button 
                  className="retry-button" 
                  onClick={() => loadQuizStatistics(selectedQuizId)}
                >
                  Try Again
                </button>
              </div>
            )}

            {quizStats && !loadingStats && (
              <div className="quiz-results-content">
                {/* Quiz Info Banner */}
                <div className="quiz-info-banner">
                  <div className="quiz-info-item">
                    <span className="quiz-info-label">Quiz:</span>
                    <span className="quiz-info-value">{quizStats.quiz_title}</span>
                  </div>
                  <div className="quiz-info-item">
                    <span className="quiz-info-label">Difficulty:</span>
                    <span className={`quiz-difficulty-badge ${quizStats.difficulty}`}>
                      {quizStats.difficulty}
                    </span>
                  </div>
                  <div className="quiz-info-item">
                    <span className="quiz-info-label">Total Attempts:</span>
                    <span className="quiz-info-value">{quizStats.total_attempts || 0}</span>
                  </div>
                  <div className="quiz-info-item">
                    <span className="quiz-info-label">Average Score:</span>
                    <span className="quiz-info-value">{Math.round(quizStats.average_score || 0)}%</span>
                  </div>
                </div>

                {/* Question Analysis */}
                {quizStats.question_analysis && quizStats.question_analysis.length > 0 ? (
                  <div className="section-card">
                    <h3>Question-Level Analysis</h3>
                    <p className="section-description">
                      Detailed breakdown showing how students answered each question. 
                      Correct answers are highlighted in green.
                    </p>
                    {quizStats.question_analysis.map((question, idx) => (
                      <div key={idx} className="question-analysis-item">
                        <div className="question-header">
                          <span className="question-number">Q{question.question_number + 1}</span>
                          <span className="question-text">{question.question_text}</span>
                          {question.difficulty && (
                            <span className={`question-difficulty ${question.difficulty}`}>
                              {question.difficulty}
                            </span>
                          )}
                        </div>
                        <div className="choices-analysis">
                          {(question.choice_distribution || []).map((choice, cidx) => (
                            <div key={cidx} className="choice-item">
                              <div className={`choice-indicator ${choice.is_correct ? 'correct' : ''}`}>
                                {choice.choice_key}
                              </div>
                              <div className="choice-content">
                                <div className="choice-text">{choice.choice_text}</div>
                                <div className="choice-bar-container">
                                  <div 
                                    className={`choice-bar ${choice.is_correct ? 'correct' : ''}`}
                                    style={{ width: `${choice.selection_percentage}%` }}
                                  />
                                </div>
                              </div>
                              <div className="choice-stats">
                                {choice.selection_count} ({choice.selection_percentage.toFixed(1)}%)
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">📝</div>
                    <h3>No Question Data Available</h3>
                    <p>This quiz hasn't been attempted yet or question analysis data is not available.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          .quiz-results-container {
            padding: 2rem;
            max-width: 1400px;
          }

          .results-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 2rem;
          }

          .results-header h2 {
            color: #1f2937;
            font-size: 1.75rem;
            margin: 0;
          }

          .back-button {
            padding: 0.5rem 1rem;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .back-button:hover {
            background: #2563eb;
          }

          .quiz-results-content {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }

          .quiz-info-banner {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            padding: 1.5rem;
            border-radius: 12px;
            display: flex;
            gap: 2rem;
            align-items: center;
            flex-wrap: wrap;
          }

          .quiz-info-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .quiz-info-label {
            font-size: 0.875rem;
            opacity: 0.9;
          }

          .quiz-info-value {
            font-size: 1.125rem;
            font-weight: 600;
          }

          .quiz-difficulty-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 600;
            text-transform: uppercase;
            background: rgba(255, 255, 255, 0.2);
          }

          .section-card {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            padding: 1.5rem;
          }

          .section-card h3 {
            color: #1f2937;
            margin: 0 0 1rem 0;
            font-size: 1.25rem;
          }

          .section-description {
            color: #6b7280;
            font-size: 0.875rem;
            margin-bottom: 1.5rem;
          }

          .question-analysis-item {
            padding: 1.5rem;
            background: #f9fafb;
            border-radius: 8px;
            margin-bottom: 1.5rem;
          }

          .question-analysis-item:last-child {
            margin-bottom: 0;
          }

          .question-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1rem;
            flex-wrap: wrap;
          }

          .question-number {
            background: #3b82f6;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 6px;
            font-weight: 600;
            font-size: 0.875rem;
          }

          .question-text {
            flex: 1;
            color: #1f2937;
            font-weight: 500;
          }

          .question-difficulty {
            padding: 0.25rem 0.75rem;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
          }

          .question-difficulty.easy {
            background: #d1fae5;
            color: #065f46;
          }

          .question-difficulty.medium {
            background: #fef3c7;
            color: #92400e;
          }

          .question-difficulty.hard {
            background: #fee2e2;
            color: #991b1b;
          }

          .choices-analysis {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .choice-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            background: white;
            padding: 1rem;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
          }

          .choice-indicator {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #e5e7eb;
            color: #6b7280;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            flex-shrink: 0;
          }

          .choice-indicator.correct {
            background: #22c55e;
            color: white;
          }

          .choice-content {
            flex: 1;
          }

          .choice-text {
            font-size: 0.875rem;
            color: #374151;
            margin-bottom: 0.5rem;
          }

          .choice-bar-container {
            height: 24px;
            background: #f3f4f6;
            border-radius: 4px;
            overflow: hidden;
          }

          .choice-bar {
            height: 100%;
            background: #3b82f6;
            transition: width 0.3s ease;
          }

          .choice-bar.correct {
            background: #22c55e;
          }

          .choice-stats {
            font-size: 0.875rem;
            font-weight: 600;
            color: #1f2937;
            min-width: 100px;
            text-align: right;
          }

          .error-state {
            text-align: center;
            padding: 4rem 2rem;
            background: white;
            border: 2px solid #fee2e2;
            border-radius: 12px;
          }

          .error-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }

          .error-state h3 {
            color: #dc2626;
            margin-bottom: 0.5rem;
          }

          .error-state p {
            color: #6b7280;
            margin-bottom: 1.5rem;
          }

          .retry-button {
            padding: 0.75rem 1.5rem;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
          }

          .retry-button:hover {
            background: #2563eb;
          }

          .empty-state {
            text-align: center;
            padding: 4rem 2rem;
            background: white;
            border: 2px dashed #e5e7eb;
            border-radius: 12px;
          }

          .empty-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }

          .empty-state h3 {
            color: #1e40af;
            margin-bottom: 0.5rem;
          }

          .empty-state p {
            color: #6b7280;
          }

          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 50vh;
            color: #666;
          }

          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #1976D2;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Regular quiz analytics view
  return (
    <div>
      <div className="NavBar"><NavBar /></div>
      <div className="SideH"><CoursesList courses={courses} /></div>
      <div className="BoiD"><Bio /></div>
      
      <div className="ContainerH">
        <div className="quiz-selection-panel">
          <div className="selection-header">
            <h3>Select Quiz for Analysis</h3>
            <div className="selection-controls">
              <select 
                value={selectedCourse} 
                onChange={(e) => handleCourseFilter(e.target.value)}
                className="course-filter"
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  marginLeft: '10px'
                }}
              >
                <option value="all">All Courses</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.code || course.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="QuizAnliysis">
          {selectedQuizId ? (
            <div>
              {selectedQuiz && (
                <div className="quiz-analysis-header" style={{
                  marginBottom: '20px',
                  padding: '15px',
                  backgroundColor: selectedQuiz.type === 'ai' ? '#f8f4ff' : '#f0f9ff',
                  borderRadius: '8px',
                  border: selectedQuiz.type === 'ai' ? '1px solid #e9d8fd' : '1px solid #dbeafe'
                }}>
                  <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {selectedQuiz.type === 'ai' && <span>🤖</span>}
                    {selectedQuiz.title}
                    <span style={{
                      background: selectedQuiz.type === 'ai' ? 
                        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                        '#1976D2',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {selectedQuiz.type === 'ai' ? 'AI Generated' : 'Traditional'}
                    </span>
                  </h2>
                  <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                    {selectedQuiz.topic_name || selectedQuiz.course_name} • 
                    {selectedQuiz.attempt_count || selectedQuiz.total_attempts || 0} attempts
                  </p>
                </div>
              )}
              
              <QuizAnalysisComponent 
                quizId={selectedQuizId} 
                isAIQuiz={selectedQuiz?.type === 'ai'}
              />
            </div>
          ) : (
            <div className="no-quiz-selected">
              <h3>Select a Quiz</h3>
              <p>Choose a quiz from the list to view detailed analytics and performance data.</p>
              {error && (
                <div className="error-message">
                  <p>{error}</p>
                  <button onClick={() => window.location.reload()}>Retry</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #1976D2;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          color: #666;
        }
      `}</style>
    </div> 
  );
}

export default QuizAnalytics;