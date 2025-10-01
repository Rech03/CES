// src/Views/Lacture/StudentAnalytics.js
import { useState, useEffect, useMemo } from "react";
import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import NavBar from "../../Componets/Lacture/NavBar";

import {
  lecturerCourseOptions,
  getAIQuizStatistics,
} from "../../api/analytics";

import { getMyCourses } from "../../api/courses";
import "./StudentAnalytics.css";

function StudentAnalytics() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Quiz analytics state
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizStats, setQuizStats] = useState(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  const normalizedCourseId = useMemo(() => {
    if (!selectedCourseId) return null;
    const asNum = Number(selectedCourseId);
    return Number.isNaN(asNum) ? null : asNum;
  }, [selectedCourseId]);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError("");

      let coursesData = [];
      try {
        const res = await lecturerCourseOptions();
        coursesData = res?.data?.courses || res?.data || [];
        
        // Extract all quizzes from courses
        const allQuizzes = coursesData.flatMap(course =>
          (course.topics || []).flatMap(topic =>
            (topic.quizzes || []).map(quiz => ({
              ...quiz,
              topicName: topic.name,
              courseCode: course.code,
              courseId: course.id,
              topicId: topic.id
            }))
          )
        );
        setQuizzes(allQuizzes);
      } catch {
        const res = await getMyCourses();
        coursesData = res?.data || [];
      }

      setCourses(coursesData);
      if (coursesData.length > 0) {
        setSelectedCourseId(String(coursesData[0].id));
      }
    } catch (err) {
      setError("Failed to load courses");
    } finally {
      setLoading(false);
    }
  }

  async function loadQuizStatistics(quizId) {
    try {
      setLoadingQuiz(true);
      const response = await getAIQuizStatistics(quizId);
      setQuizStats(response?.data || response);
      setSelectedQuiz(quizId);
    } catch (err) {
      console.error('Error loading quiz statistics:', err);
      alert('Failed to load quiz statistics');
    } finally {
      setLoadingQuiz(false);
    }
  }

  const handleCourseChange = (e) => {
    setSelectedCourseId(e.target.value);
    setSelectedQuiz(null);
    setQuizStats(null);
  };

  // Filter quizzes based on selected course
  const filteredQuizzes = useMemo(() => {
    if (!normalizedCourseId) return quizzes;
    return quizzes.filter(q => q.courseId === normalizedCourseId);
  }, [quizzes, normalizedCourseId]);

  if (loading) {
    return (
      <div>
        <div className="NavBar"><NavBar /></div>
        <div className="Container">
          <div className="analytics-content">
            <div className="loading-state">Loading Analytics...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="NavBar"><NavBar /></div>

      <div className="Container">
        <div className="analytics-content">
          {/* Header */}
          <div className="analytics-header">
            <h2>Quiz Analytics</h2>
            {courses.length > 0 && (
              <div className="course-selector">
                <label htmlFor="course-select">Course:</label>
                <select id="course-select" value={selectedCourseId} onChange={handleCourseChange}>
                  <option value="">All Courses</option>
                  {courses.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Quiz Analytics Section */}
          <div className="quiz-analytics-section">
            {/* Quiz Selector */}
            <div className="section-card">
              <label htmlFor="quiz-select" className="quiz-selector-label">Select Quiz to Analyze:</label>
              <select 
                id="quiz-select"
                className="quiz-selector"
                value={selectedQuiz || ''}
                onChange={(e) => e.target.value && loadQuizStatistics(e.target.value)}
              >
                <option value="">-- Choose a quiz --</option>
                {filteredQuizzes.map(quiz => (
                  <option key={quiz.id} value={quiz.id}>
                    {quiz.courseCode} - {quiz.topicName} - {quiz.title}
                  </option>
                ))}
              </select>
              {filteredQuizzes.length === 0 && (
                <p className="no-quizzes-message">No quizzes available for this course</p>
              )}
            </div>

            {loadingQuiz && (
              <div className="loading-state">Loading quiz statistics...</div>
            )}

            {/* Quiz Statistics */}
            {quizStats && !loadingQuiz && (
              <>
               

                {/* Quiz Metrics */}
                <div className="metrics-grid-clean">
                  <div className="metric-card">
                    <div className="metric-icon">👥</div>
                    <div className="metric-data">
                      <div className="metric-value">{quizStats.unique_students || 0}</div>
                      <div className="metric-label">Unique Students</div>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon">✍️</div>
                    <div className="metric-data">
                      <div className="metric-value">{quizStats.total_attempts || 0}</div>
                      <div className="metric-label">Total Attempts</div>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon">📈</div>
                    <div className="metric-data">
                      <div className="metric-value">{Math.round(quizStats.average_score || 0)}%</div>
                      <div className="metric-label">Average Score</div>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon">📊</div>
                    <div className="metric-data">
                      <div className="metric-value">{Math.round(quizStats.median_score || 0)}%</div>
                      <div className="metric-label">Median Score</div>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon">🎯</div>
                    <div className="metric-data">
                      <div className="metric-value">{Math.round(quizStats.completion_rate || 0)}%</div>
                      <div className="metric-label">Completion Rate</div>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon">⭐</div>
                    <div className="metric-data">
                      <div className="metric-value">{quizStats.highest_score || 0}%</div>
                      <div className="metric-label">Highest Score</div>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon">📉</div>
                    <div className="metric-data">
                      <div className="metric-value">{quizStats.lowest_score || 0}%</div>
                      <div className="metric-label">Lowest Score</div>
                    </div>
                  </div>
                </div>

                {/* Score Distribution */}
                {quizStats.score_distribution && (
                  <div className="section-card">
                    <h3>Score Distribution</h3>
                    <div className="score-distribution-grid">
                      <div className="score-dist-item excellent">
                        <div className="score-dist-label">Excellent (80+)</div>
                        <div className="score-dist-value">{quizStats.score_distribution.excellent || 0}</div>
                        <div className="score-dist-students">students</div>
                      </div>
                      <div className="score-dist-item good">
                        <div className="score-dist-label">Good (60-79)</div>
                        <div className="score-dist-value">{quizStats.score_distribution.good || 0}</div>
                        <div className="score-dist-students">students</div>
                      </div>
                      <div className="score-dist-item average">
                        <div className="score-dist-label">Average (40-59)</div>
                        <div className="score-dist-value">{quizStats.score_distribution.average || 0}</div>
                        <div className="score-dist-students">students</div>
                      </div>
                      <div className="score-dist-item poor">
                        <div className="score-dist-label">Poor (&lt;40)</div>
                        <div className="score-dist-value">{quizStats.score_distribution.poor || 0}</div>
                        <div className="score-dist-students">students</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Question Analysis */}
                {quizStats.question_analysis && quizStats.question_analysis.length > 0 && (
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
                )}
              </>
            )}

            {!quizStats && !loadingQuiz && (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h3>Select a Quiz to Analyze</h3>
                <p>Choose a quiz from the dropdown above to view detailed statistics including score distribution and question-level analysis.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="SideST">
        <CoursesList
          courses={courses}
          selectedCourse={courses.find(c => String(c.id) === String(selectedCourseId))}
          onCourseSelect={(course) => setSelectedCourseId(String(course.id))}
        />
      </div>

      <div className="BoiST">
        <Bio />
      </div>

      <style jsx>{`
        .analytics-content {
          padding: 2rem;
          max-width: 1400px;
        }

        .analytics-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .analytics-header h2 {
          color: #000000ff;
          font-size: 1.75rem;
          margin: 0;
        }

        .course-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .course-selector label {
          font-weight: 600;
          color: #374151;
        }

        .course-selector select {
          padding: 0.5rem 1rem;
          border: 2px solid #000000ff;
          border-radius: 6px;
          font-size: 1rem;
          background: white;
          color: #060606ff;
          cursor: pointer;
        }

        .quiz-analytics-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Section Cards */
        .section-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
        }

        .section-card h3 {
          color: #000000ff;
          margin: 0 0 1rem 0;
          font-size: 1.25rem;
        }

        .section-description {
          color: #6b7280;
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
        }

        /* Quiz Selector */
        .quiz-selector-label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #1f2937;
        }

        .quiz-selector {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 6px;
          font-size: 1rem;
          background: white;
          cursor: pointer;
        }

        .no-quizzes-message {
          margin-top: 1rem;
          padding: 1rem;
          background: #fef3c7;
          border: 1px solid #fbbf24;
          border-radius: 6px;
          color: #92400e;
          text-align: center;
        }

        /* Quiz Info Banner */
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

        .quiz-difficulty-badge.easy {
          background: rgba(34, 197, 94, 0.2);
        }

        .quiz-difficulty-badge.medium {
          background: rgba(234, 179, 8, 0.2);
        }

        .quiz-difficulty-badge.hard {
          background: rgba(239, 68, 68, 0.2);
        }

        /* Metrics Grid */
        .metrics-grid-clean {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1.5rem;
        }

        .metric-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.2s;
        }

        .metric-card:hover {
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
          transform: translateY(-2px);
        }

        .metric-icon {
          font-size: 2rem;
        }

        .metric-value {
          font-size: 2rem;
          font-weight: bold;
          color: #020202ff;
        }

        .metric-label {
          font-size: 0.875rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }

        /* Score Distribution */
        .score-distribution-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .score-dist-item {
          padding: 1.5rem;
          border-radius: 8px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .score-dist-item.excellent {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          color: white;
        }

        .score-dist-item.good {
          background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);
          color: white;
        }

        .score-dist-item.average {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: white;
        }

        .score-dist-item.poor {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }

        .score-dist-label {
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
          opacity: 0.9;
        }

        .score-dist-value {
          font-size: 2.5rem;
          font-weight: bold;
        }

        .score-dist-students {
          font-size: 0.75rem;
          margin-top: 0.25rem;
          opacity: 0.8;
        }

        /* Question Analysis */
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

        /* Empty State */
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

        .loading-state {
          text-align: center;
          padding: 4rem;
          color: #2563eb;
          font-size: 1.25rem;
        }
      `}</style>
    </div>
  );
}

export default StudentAnalytics;