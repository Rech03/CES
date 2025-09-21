import { useEffect, useState } from 'react';
import { getMyCourses } from '../../api/courses';
import './CoursesList.css';

function CoursesList({ courses: propCourses, loading: externalLoading = false, onRefresh }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(!Array.isArray(propCourses));
  const [error, setError] = useState('');

  // Normalize any server shape to a plain array
  const normalizeCourses = (data) => {
    if (Array.isArray(data)) return data;                 // bare array
    if (data && Array.isArray(data.courses)) return data.courses; // { courses: [...] }
    if (data && Array.isArray(data.results)) return data.results; // paginated
    if (data && typeof data === 'object') {
      const k = Object.keys(data).find((key) => Array.isArray(data[key]));
      if (k) return data[k];
    }
    return [];
  };

  const fetchCourses = async () => {
    setError('');
    setLoading(true);
    try {
      const resp = await getMyCourses();
      const list = normalizeCourses(resp?.data);
      setCourses(list);
    } catch (err) {
      console.error('Error fetching courses:', err);
      const d = err.response?.data;
      let msg = 'Failed to load courses';
      if (typeof d === 'string') msg = d;
      else if (d?.detail) msg = d.detail;
      else if (d?.message) msg = d.message;
      else if (d?.error) msg = d.error;
      setError(msg);
      setCourses([]); // no fallback “fake” data — always show real server result
    } finally {
      setLoading(false);
    }
  };

  // Use prop when provided by parent (Dashboard/AIQuizzes); otherwise fetch here
  useEffect(() => {
    if (Array.isArray(propCourses) && propCourses.length >= 0) {
      setCourses(propCourses);
      setLoading(false);
    } else {
      fetchCourses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propCourses]);

  const effectiveLoading = loading || externalLoading;

  return (
    <div className="courses-list-container">
      <div className="courses-header">
        <div className="courses-title">Course List</div>
      
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="courses-content">
        {effectiveLoading ? (
          [1,2,3].map((i) => (
            <div key={i}>
              <div className="course-item">
                <div className="course-icon-container">
                  <div className="course-icon skeleton"></div>
                </div>
                <div className="course-info">
                  <div className="course-code skeleton">Loading…</div>
                  <div className="course-last-quiz skeleton">Loading…</div>
                </div>
              </div>
              {i < 3 && <div className="course-divider"></div>}
            </div>
          ))
        ) : courses.length === 0 ? (
          <div className="no-courses">
            <p>No courses found. Create your first course to get started!</p>
          </div>
        ) : (
          courses.map((c, idx) => (
            <div key={c.id ?? idx}>
              <div className="course-item">
                <div className="course-icon-container">
                  <div className="course-icon">
                    <svg className="icon-svg" viewBox="0 0 24 24" fill="none">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className="course-info">
                  <div className="course-code" title={c.name || c.code}>
                    {c.code || c.name || `Course ${c.id}`}
                  </div>
                  {/* Placeholder until backend provides last_quiz_at per course */}
                  <div className="course-last-quiz">
                    Last Quiz: {c.last_quiz_at
                      ? new Date(c.last_quiz_at).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })
                      : '—'}
                  </div>
                  {(typeof c.quiz_count === 'number' || typeof c.student_count === 'number') && (
                    <div className="course-stats">
                      {typeof c.quiz_count === 'number' ? `${c.quiz_count} quiz${c.quiz_count !== 1 ? 'es' : ''}` : null}
                      {typeof c.quiz_count === 'number' && typeof c.student_count === 'number' ? ' • ' : null}
                      {typeof c.student_count === 'number' ? `${c.student_count} student${c.student_count !== 1 ? 's' : ''}` : null}
                  </div>
                  )}
                </div>
              </div>
              {idx < courses.length - 1 && <div className="course-divider"></div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default CoursesList;
