import React, { useEffect, useMemo, useState } from "react";
import "./StudentAchievements.css"; // Reuse same styling
import {
  studentDashboard,
  getStudentPerformanceBreakdown,
  getQuestionAnalysis,
} from "../../api/analytics";

// --- helpers ---
const safeNum = (v, d = 0) => (typeof v === "number" && !isNaN(v) ? v : d);
const pct = (v) =>
  `${Math.max(0, Math.min(100, Math.round(safeNum(v))))}%`;
const fmtDate = (d) => {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "";
  }
};

function QuizAnalytics({ studentId = null, courseId = null }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // data
  const [dashboard, setDashboard] = useState(null);
  const [perf, setPerf] = useState(null);
  const [recent, setRecent] = useState([]);
  const [questionFocus, setQuestionFocus] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // 1) high-level dashboard
        let dash = {};
        try {
          const r = await studentDashboard();
          dash = r?.data || {};
        } catch (e) {
          console.warn("studentDashboard failed", e);
        }

        // 2) performance breakdown (student)
        let perfRes = {};
        try {
          const r = await getStudentPerformanceBreakdown({
            student_id: studentId,
            course_id: courseId || undefined,
          });
          perfRes = r?.data || {};
        } catch (e) {
          console.warn("getStudentPerformanceBreakdown failed", e);
        }

        // 3) recent attempts (from dashboard)
        const maybeRecent =
          dash?.recent_quizzes ||
          dash?.recent_attempts ||
          dash?.attempts ||
          dash?.quizzes ||
          [];
        const rec = Array.isArray(maybeRecent)
          ? maybeRecent.slice(0, 6).map((a, idx) => ({
              id: a.id ?? idx,
              title:
                a.title ||
                a.quiz_title ||
                a.name ||
                `Quiz ${a.quiz_id ?? idx + 1}`,
              score:
                a.score ??
                a.percentage ??
                a.result ??
                a.accuracy ??
                a.final_score ??
                0,
              date:
                a.completed_at ||
                a.submitted_at ||
                a.created_at ||
                a.date ||
                null,
              attempts: a.attempts ?? a.attempt_count ?? 1,
              difficulty: a.difficulty || a.level || null,
              topic:
                a.topic ||
                a.topic_name ||
                (a.topics && a.topics[0]) ||
                a.section ||
                null,
              quizId: a.quiz_id || a.id || null,
            }))
          : [];

        if (!mounted) return;
        setDashboard(dash);
        setPerf(perfRes);
        setRecent(rec);
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setErr("Failed to load quiz analytics.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [studentId, courseId]);

  // normalize top stats
  const overall = useMemo(() => {
    const d = dashboard || {};
    const p = perf || {};
    return {
      totalQuizzes:
        d.total_quizzes ??
        d.quizzes_taken ??
        p.total_quizzes ??
        p.quizzes_completed ??
        0,
      avgScore:
        d.average_score ?? d.avg_score ?? p.average_score ?? p.avg_score ?? 0,
      bestScore: d.best_score ?? p.best_score ?? 0,
      streak: d.current_streak ?? d.day_streak ?? p.current_streak ?? 0,
      perfect: d.perfect_scores ?? p.perfect_scores ?? 0,
    };
  }, [dashboard, perf]);

  const strengths = useMemo(() => {
    const t =
      perf?.topics ||
      perf?.topic_breakdown ||
      perf?.by_topic ||
      perf?.results ||
      [];
    return [...t]
      .map((x) => ({
        name: x.name || x.topic || x.title || "Topic",
        score: x.average_score ?? x.avg_score ?? x.score ?? x.percentage ?? 0,
        attempts: x.attempts ?? x.attempt_count ?? 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [perf]);

  const improvements = useMemo(() => {
    const t =
      perf?.topics ||
      perf?.topic_breakdown ||
      perf?.by_topic ||
      perf?.results ||
      [];
    return [...t]
      .map((x) => ({
        name: x.name || x.topic || x.title || "Topic",
        score: x.average_score ?? x.avg_score ?? x.score ?? x.percentage ?? 0,
        attempts: x.attempts ?? x.attempt_count ?? 0,
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);
  }, [perf]);

  const onDrillQuestion = async (quizId) => {
    if (!quizId) return;
    try {
      const r = await getQuestionAnalysis(quizId);
      setQuestionFocus(r?.data || null);
    } catch (e) {
      console.warn("getQuestionAnalysis failed", e);
      setQuestionFocus(null);
    }
  };

  // --- UI states ---
  if (loading) {
    return (
      <div className="achievements-container">
        <div className="loading-spinner">
          <div className="spinner" />
          <p>Loading quiz analytics…</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="achievements-container">
        <div className="error-message">
          <p>{err}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  // --- view ---
  return (
    <div className="achievements-container">
      {/* Header (match StudentAchievements) */}
      <div className="achievements-header">
        <div className="level-info">
          <div className="level-badge">📊</div>
          <div>
            <div className="level-number">Quiz Analytics</div>
            <div className="next-level">
              Personalised view of your quiz journey
            </div>
          </div>
        </div>

        {/* Use XP bar styling for Average Score */}
        <div className="xp-info">
          <div className="xp-text">Average Score</div>
          <div className="xp-bar">
            <div
              className="xp-fill"
              style={{ width: pct(overall.avgScore) }}
            />
          </div>
          <div className="xp-text">{safeNum(overall.avgScore)}%</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="streak-card">
          <div className="streak-icon">🔥</div>
          <div className="streak-info">
            <span className="streak-number">{safeNum(overall.streak)}</span>
            <span className="streak-label">Day Streak</span>
          </div>
          <div className="streak-best">Perfect: {safeNum(overall.perfect)}</div>
        </div>

        <div className="stat-card">
          <span className="stat-value">{safeNum(overall.totalQuizzes)}</span>
          <span className="stat-label">Quizzes Taken</span>
        </div>

        <div className="stat-card">
          <span className="stat-value">{safeNum(overall.bestScore)}%</span>
          <span className="stat-label">Best Score</span>
        </div>

        <div className="stat-card">
          <span className="stat-value">{safeNum(overall.avgScore)}%</span>
          <span className="stat-label">Average Score</span>
        </div>
      </div>

      {/* Strengths */}
      <div className="badge-collection">
        <div className="badge-header">
          <h3>🧠 Top Strengths</h3>
        </div>
        <div className="badges-grid">
          {strengths.map((t, i) => (
            <div
              key={`s-${i}`}
              className="badge-item earned"
              style={{ background: "linear-gradient(135deg,#27AE60,#2ECC71)" }}
            >
              <div className="badge-icon">✅</div>
              <div className="badge-name">{t.name}</div>
              <div className="badge-desc">
                Avg: {safeNum(t.score)}% • Attempts: {safeNum(t.attempts)}
              </div>
            </div>
          ))}
          {strengths.length === 0 && <div>No strength data yet.</div>}
        </div>
      </div>

      {/* Focus Areas */}
      <div className="badge-collection">
        <div className="badge-header">
          <h3>🚀 Focus Areas</h3>
        </div>
        <div className="badges-grid">
          {improvements.map((t, i) => (
            <div
              key={`i-${i}`}
              className="badge-item unearned"
              style={{ background: "#f0f0f0" }}
            >
              <div className="badge-icon">🎯</div>
              <div className="badge-name">{t.name}</div>
              <div className="badge-desc">
                Avg: {safeNum(t.score)}% • Attempts: {safeNum(t.attempts)}
              </div>
            </div>
          ))}
          {improvements.length === 0 && <div>No focus area data yet.</div>}
        </div>
      </div>

      {/* Recent Quizzes */}
      {recent.length > 0 && (
        <div className="recent-achievements">
          <h3>📝 Recent Quizzes</h3>
          <div className="achievements-list">
            {recent.map((q) => (
              <div key={q.id} className="achievement-item">
                <div
                  className="achievement-icon"
                  style={{
                    background:
                      q.score >= 80
                        ? "linear-gradient(135deg,#27AE60,#2ECC71)"
                        : q.score >= 50
                        ? "linear-gradient(135deg,#FFD700,#FFA500)"
                        : "linear-gradient(135deg,#FF6B35,#F7931E)",
                  }}
                >
                  {q.difficulty === "hard"
                    ? "💎"
                    : q.difficulty === "medium"
                    ? "⭐"
                    : "📘"}
                </div>
                <div className="achievement-info">
                  <span className="achievement-name">{q.title}</span>
                  <span className="achievement-desc">
                    {q.topic ? `${q.topic} • ` : ""}
                    Score: {safeNum(q.score)}% • Attempts:{" "}
                    {safeNum(q.attempts)}
                  </span>
                  {q.date && (
                    <span className="achievement-date">{fmtDate(q.date)}</span>
                  )}
                </div>
                {!!q.quizId && (
                  <button
                    className="filter-btn"
                    onClick={() => onDrillQuestion(q.quizId)}
                    title="Question analysis"
                  >
                    View Q-analysis
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question drilldown (optional) */}
      {questionFocus?.questions?.length > 0 && (
        <div className="badge-collection">
          <div className="badge-header">
            <h3>🔍 Question Analysis</h3>
          </div>
          <div className="badges-grid">
            {questionFocus.questions.slice(0, 6).map((qq, i) => {
              const cr =
                typeof qq.correct_rate === "number" && qq.correct_rate <= 1
                  ? qq.correct_rate * 100
                  : qq.correct_rate;
              return (
                <div
                  key={i}
                  className={`badge-item ${
                    (cr ?? 0) >= 70 ? "earned" : "unearned"
                  }`}
                  style={{
                    background:
                      (cr ?? 0) >= 70
                        ? "linear-gradient(135deg,#27AE60,#2ECC71)"
                        : "#f0f0f0",
                  }}
                >
                  <div className="badge-icon">Q{i + 1}</div>
                  <div className="badge-name">
                    {(
                      qq.topic ||
                      qq.learning_outcome ||
                      "Question"
                    ).toString()}
                  </div>
                  <div className="badge-desc">Correct: {pct(cr)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default QuizAnalytics;
