// src/Components/Profile/Biography.js
import { useState, useEffect } from 'react';

// PROFILE
import { getProfile } from '../../api/users'; // users/profile/  :contentReference[oaicite:5]{index=5}

// PRIMARY STATS
import { getStats as getAchievementStats } from '../../api/achievements'; // achievements/stats/  :contentReference[oaicite:6]{index=6}

/** FALLBACKS (in order) **/
import { studentDashboard as getStudentAnalyticsDashboard } from '../../api/analytics'; // analytics/student/dashboard/  :contentReference[oaicite:7]{index=7}
import { getStudentDashboard as getCoursesStudentDashboard } from '../../api/courses'; // courses/student/dashboard/  :contentReference[oaicite:8]{index=8}
import { getMyAttempts } from '../../api/quizzes'; // quizzes/student/my-attempts/  :contentReference[oaicite:9]{index=9}

import './Biography.css';

function Biography({
  name,
  title,
  avatar,
  quizzesCompleted,
  correctAnswers,
  currentStreak
}) {
  const [profileData, setProfileData] = useState({
    name: name || "Student",
    title: title || "Student",
    avatar: avatar || "/ID.jpeg",
    quizzesCompleted: (quizzesCompleted ?? "0").toString(),
    correctAnswers: (correctAnswers ?? "0").toString(),
    currentStreak: (currentStreak ?? "0").toString(),
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStudentStats = async () => {
      // Only auto-fetch if the caller didn't pass explicit props
      if (
        name == null &&
        title == null &&
        quizzesCompleted == null &&
        correctAnswers == null &&
        currentStreak == null
      ) {
        setLoading(true);
        try {
          // 1) Profile basics
          let userName = "Student";
          let userTitle = "Student";
          let userAvatar = "/ID.jpeg";

          try {
            const { data: user } = await getProfile();
            userName =
              user?.full_name ||
              `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
              user?.username ||
              user?.email?.split("@")[0] ||
              "Student";
            userTitle = user?.program || user?.course || user?.department || "Student";
            userAvatar = user?.profile_picture || user?.avatar || "/ID.jpeg";
          } catch (e) {
            // keep defaults if profile call fails
          }

          // Helpers to normalize keys coming from different dashboards
          const pickNumber = (...vals) => {
            for (const v of vals) {
              if (v === 0 || (typeof v === 'number' && !Number.isNaN(v))) return v;
            }
            return undefined;
          };

          // 2) Try Achievements → Stats (primary)
          let stats = { quizzesCompleted: 0, correctAnswers: 0, currentStreak: 0 };
          let filledFrom = 'achievements';

          try {
            const { data: stat } = await getAchievementStats();
            stats.quizzesCompleted = pickNumber(
              stat?.quizzes_completed,
              stat?.total_quizzes_completed,
              stat?.quizzesCompleted
            ) ?? 0;

            stats.correctAnswers = pickNumber(
              stat?.correct_answers,
              stat?.total_correct_answers,
              stat?.correctAnswers
            ) ?? 0;

            stats.currentStreak = pickNumber(
              stat?.current_streak,
              stat?.streak_days,
              stat?.day_streak
            ) ?? 0;
          } catch (e1) {
            // 3) Fallback: Analytics → Student Dashboard
            try {
              const { data: aDash } = await getStudentAnalyticsDashboard();
              filledFrom = 'analytics';
              stats.quizzesCompleted = pickNumber(
                aDash?.quizzes_completed,
                aDash?.total_quizzes_completed
              ) ?? 0;
              stats.correctAnswers = pickNumber(
                aDash?.total_correct_answers,
                aDash?.correct_answers
              ) ?? 0;
              stats.currentStreak = pickNumber(
                aDash?.current_streak,
                aDash?.streak_days
              ) ?? 0;

              // 4) Fallback: Courses → Student Dashboard (if still missing)
              if (
                !stats.quizzesCompleted &&
                !stats.correctAnswers &&
                !stats.currentStreak
              ) {
                const { data: cDash } = await getCoursesStudentDashboard();
                filledFrom = 'courses';
                stats.quizzesCompleted = pickNumber(
                  cDash?.quizzes_completed,
                  cDash?.total_quizzes_completed
                ) ?? 0;
                stats.correctAnswers = pickNumber(
                  cDash?.total_correct_answers,
                  cDash?.correct_answers
                ) ?? 0;
                stats.currentStreak = pickNumber(
                  cDash?.current_streak,
                  cDash?.streak_days
                ) ?? 0;
              }

              // 5) Last resort: compute from quiz attempts
              if (
                !stats.quizzesCompleted &&
                !stats.correctAnswers &&
                !stats.currentStreak
              ) {
                const { data } = await getMyAttempts();
                const attempts = Array.isArray(data) ? data : data?.results || [];
                if (attempts?.length) {
                  const completedQuizIds = new Set();
                  let totalCorrect = 0;

                  attempts.forEach((attempt) => {
                    const completed =
                      attempt?.is_completed || attempt?.status === 'completed';
                    if (completed) {
                      completedQuizIds.add(attempt?.quiz ?? attempt?.quiz_id);

                      if (typeof attempt?.correct_answers === 'number') {
                        totalCorrect += attempt.correct_answers;
                      } else if (
                        typeof attempt?.score === 'number' &&
                        typeof attempt?.total_questions === 'number'
                      ) {
                        totalCorrect += Math.round(
                          (attempt.score / 100) * attempt.total_questions
                        );
                      }
                    }
                  });

                  stats.quizzesCompleted = completedQuizIds.size;
                  stats.correctAnswers = totalCorrect;
                  stats.currentStreak = calculateStreak(attempts);
                  filledFrom = 'attempts';
                }
              }
            } catch {
              // Ignore; we'll keep defaults or compute from attempts if possible
              try {
                const { data } = await getMyAttempts();
                const attempts = Array.isArray(data) ? data : data?.results || [];
                if (attempts?.length) {
                  const completedQuizIds = new Set();
                  let totalCorrect = 0;

                  attempts.forEach((attempt) => {
                    const completed =
                      attempt?.is_completed || attempt?.status === 'completed';
                    if (completed) {
                      completedQuizIds.add(attempt?.quiz ?? attempt?.quiz_id);

                      if (typeof attempt?.correct_answers === 'number') {
                        totalCorrect += attempt.correct_answers;
                      } else if (
                        typeof attempt?.score === 'number' &&
                        typeof attempt?.total_questions === 'number'
                      ) {
                        totalCorrect += Math.round(
                          (attempt.score / 100) * attempt.total_questions
                        );
                      }
                    }
                  });

                  stats.quizzesCompleted = completedQuizIds.size;
                  stats.correctAnswers = totalCorrect;
                  stats.currentStreak = calculateStreak(attempts);
                  filledFrom = 'attempts';
                }
              } catch {
                // leave zeros
              }
            }
          }

          setProfileData({
            name: userName,
            title: userTitle,
            avatar: userAvatar,
            quizzesCompleted: String(stats.quizzesCompleted ?? 0),
            correctAnswers: String(stats.correctAnswers ?? 0),
            currentStreak: String(stats.currentStreak ?? 0),
            _source: filledFrom,
          });
        } finally {
          setLoading(false);
        }
      }
    };

    fetchStudentStats();
  }, [name, title, quizzesCompleted, correctAnswers, currentStreak]);

  // Helper: compute day streak from attempts list
  const calculateStreak = (attempts) => {
    if (!attempts?.length) return 0;

    const days = Array.from(
      new Set(
        attempts
          .map((a) => a?.created_at || a?.date_created)
          .filter(Boolean)
          .map((d) => new Date(d).toDateString())
      )
    ).sort((a, b) => new Date(b) - new Date(a));

    if (!days.length) return 0;

    let streak = 0;
    const today = new Date();
    const prev = new Date(today);
    const todayStr = today.toDateString();
    prev.setDate(today.getDate() - 1);
    const prevStr = prev.toDateString();

    if (days.includes(todayStr) || days.includes(prevStr)) {
      let cursor = days.includes(todayStr) ? new Date(today) : new Date(prev);
      streak = 1;
      while (true) {
        const next = new Date(cursor);
        next.setDate(cursor.getDate() - 1);
        const key = next.toDateString();
        if (days.includes(key)) {
          streak += 1;
          cursor = next;
        } else break;
      }
    }
    return streak;
  };

  if (loading) {
    return (
      <div className="biography-container">
        <div className="biography-avatar skeleton"></div>
        <div className="biography-name skeleton">Loading...</div>
        <div className="biography-title skeleton">Loading...</div>
        <div className="quiz-section">
          <div className="quiz-icon-container"><div className="quiz-icon"></div></div>
          <div className="quiz-count skeleton">--</div>
          <div className="quiz-label">Quizzes Completed</div>
        </div>
        <div className="students-section">
          <div className="students-icon-container"><div className="students-icon"></div></div>
          <div className="students-count skeleton">--</div>
          <div className="students-label">Correct Answers</div>
        </div>
        <div className="streak-section">
          <div className="streak-icon-container"><div className="streak-icon"></div></div>
          <div className="streak-count skeleton">--</div>
          <div className="streak-label">Day Streak</div>
        </div>
      </div>
    );
  }

  return (
    <div className="biography-container">
      <img
        className="biography-avatar"
        src={profileData.avatar}
        alt={`${profileData.name}'s profile`}
        onError={(e) => { e.currentTarget.src = "/ID.jpeg"; }}
      />

      <div className="biography-name">{profileData.name}</div>
      <div className="biography-title">{profileData.title}</div>

      <div className="quiz-section">
        <div className="quiz-icon-container"><div className="quiz-icon"></div></div>
        <div className="quiz-count">{profileData.quizzesCompleted}</div>
        <div className="quiz-label">Quizzes Completed</div>
      </div>

      <div className="students-section">
        <div className="students-icon-container"><div className="students-icon"></div></div>
        <div className="students-count">{profileData.correctAnswers}</div>
        <div className="students-label">Correct Answers</div>
      </div>

      <div className="streak-section">
        <div className="streak-icon-container"><div className="streak-icon"></div></div>
        <div className="streak-count">{profileData.currentStreak}</div>
        <div className="streak-label">Day Streak</div>
      </div>
    </div>
  );
}

export default Biography;
