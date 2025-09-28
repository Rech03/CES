// src/Components/Profile/Biography.js
import { useState, useEffect } from 'react';

// Profile API
import { getProfile, getDashboard as getUserDashboard } from '../../api/users';

// Primary stats source - achievements
import { getStats as getAchievementStats } from '../../api/achievements';

// Fallback sources
import { getStudentDashboard as getCoursesStudentDashboard } from '../../api/courses';

import './Biography.css';

function Biography({
  name,
  title,
  avatar,
  quizzesCompleted,
  correctAnswers,
  currentStreak,
  compact = false,
  showLoading = true
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
  const [error, setError] = useState(null);

  // Helper to extract numbers from various response formats
  const extractNumber = (obj, ...keys) => {
    for (const key of keys) {
      const val = obj?.[key];
      if (val === 0 || (typeof val === 'number' && !Number.isNaN(val))) {
        return val;
      }
      if (typeof val === 'string' && !isNaN(val) && val !== '') {
        return parseInt(val, 10);
      }
    }
    return 0;
  };

  useEffect(() => {
    const fetchStudentStats = async () => {
      // Only auto-fetch if no explicit props provided
      const hasExplicitProps = name != null || title != null || 
                              quizzesCompleted != null || 
                              correctAnswers != null || 
                              currentStreak != null;

      if (!hasExplicitProps) {
        setLoading(true);
        setError(null);
        
        try {
          // 1) Fetch Profile Information
          let userName = name || "Student";
          let userTitle = title || "Student";
          let userAvatar = avatar || "/ID.jpeg";

          try {
            const { data: user } = await getProfile();
            
            // Based on Django backend serializers, extract user data
            userName =
              user?.full_name ||
              (user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}`.trim() : null) ||
              user?.username ||
              user?.email?.split("@")[0] ||
              "Student";
            
            // Extract title/role - the Django backend returns user_type
            userTitle = 
              user?.user_type === 'student' ? 'Student' :
              user?.user_type === 'lecturer' ? 'Lecturer' :
              user?.user_type === 'admin' ? 'Admin' :
              user?.title ||
              user?.role ||
              "Student";
            
            // Extract avatar
            userAvatar = 
              user?.profile_picture || 
              user?.avatar || 
              "/ID.jpeg";
              
          } catch (e) {
            console.warn('Biography: Profile fetch failed, using defaults/props');
          }

          // 2) Fetch Statistics - Try multiple sources
          let stats = { quizzesCompleted: 0, correctAnswers: 0, currentStreak: 0 };
          let statsSource = 'default';

          // Try achievements API first (most comprehensive)
          try {
            const { data: achievementStats } = await getAchievementStats();
            
            stats.quizzesCompleted = extractNumber(achievementStats,
              'quizzes_completed', 'total_quizzes_completed', 'completed_quizzes',
              'quizzesCompleted', 'quiz_count', 'quizzes'
            );

            stats.correctAnswers = extractNumber(achievementStats,
              'correct_answers', 'total_correct_answers', 'total_correct',
              'correctAnswers', 'correct_count', 'score_total'
            );

            stats.currentStreak = extractNumber(achievementStats,
              'current_streak', 'streak_days', 'day_streak',
              'currentStreak', 'streak', 'consecutive_days'
            );

            statsSource = 'achievements';
            
          } catch (achievementError) {
            console.warn('Biography: Achievements API failed, trying user dashboard...');
            
            // Fallback to user dashboard
            try {
              const { data: userDash } = await getUserDashboard();
              
              stats.quizzesCompleted = extractNumber(userDash,
                'quizzes_completed', 'total_quizzes', 'quiz_count'
              );

              stats.correctAnswers = extractNumber(userDash,
                'correct_answers', 'total_correct', 'score_total'
              );

              stats.currentStreak = extractNumber(userDash,
                'current_streak', 'streak_days', 'streak'
              );

              statsSource = 'user_dashboard';
              
            } catch (userDashError) {
              console.warn('Biography: User dashboard failed, trying courses dashboard...');
              
              // Final fallback to courses student dashboard
              try {
                const { data: coursesDash } = await getCoursesStudentDashboard();
                
                stats.quizzesCompleted = extractNumber(coursesDash,
                  'quizzes_completed', 'total_quizzes', 'quiz_count'
                );

                stats.correctAnswers = extractNumber(coursesDash,
                  'correct_answers', 'total_correct', 'score_total'
                );

                stats.currentStreak = extractNumber(coursesDash,
                  'current_streak', 'streak_days', 'streak'
                );

                statsSource = 'courses_dashboard';
                
              } catch (coursesDashError) {
                console.warn('Biography: All stat sources failed, using defaults');
                statsSource = 'fallback';
              }
            }
          }

          setProfileData({
            name: userName,
            title: userTitle,
            avatar: userAvatar,
            quizzesCompleted: String(stats.quizzesCompleted),
            correctAnswers: String(stats.correctAnswers),
            currentStreak: String(stats.currentStreak),
            _statsSource: statsSource,
          });

        } catch (err) {
          console.error('Biography: Error fetching data:', err);
          setError('Could not load profile data');
          // Keep defaults
        } finally {
          setLoading(false);
        }
      }
    };

    fetchStudentStats();
  }, [name, title, avatar, quizzesCompleted, correctAnswers, currentStreak]);

  if (loading && showLoading) {
    return (
      <div className={`biography-container ${compact ? 'compact' : ''}`}>
        <div className="biography-avatar skeleton"></div>
        <div className="biography-name skeleton">Loading...</div>
        <div className="biography-title skeleton">Loading...</div>
        <div className="quiz-section">
          <div className="quiz-icon-container"><div className="quiz-icon"></div></div>
          <div className="quiz-count skeleton">--</div>
          <div className="quiz-label">Quizzes</div>
        </div>
        <div className="students-section">
          <div className="students-icon-container"><div className="students-icon"></div></div>
          <div className="students-count skeleton">--</div>
          <div className="students-label">Correct</div>
        </div>
        <div className="streak-section">
          <div className="streak-icon-container"><div className="streak-icon"></div></div>
          <div className="streak-count skeleton">--</div>
          <div className="streak-label">Streak</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`biography-container ${compact ? 'compact' : ''}`}>
      <img
        className="biography-avatar"
        src={profileData.avatar}
        alt={`${profileData.name}'s profile`}
        onError={(e) => { e.currentTarget.src = "/ID.jpeg"; }}
      />

      <div className="biography-name">{profileData.name}</div>
      <div className="biography-title">{profileData.title}</div>

      <div className="quiz-section">
        <div className="quiz-icon-container">
          <div className="quiz-icon"></div>
        </div>
        <div className="quiz-count">{profileData.quizzesCompleted}</div>
        <div className="quiz-label">
          {compact ? 'Quizzes' : 'Quizzes Completed'}
        </div>
      </div>

      <div className="students-section">
        <div className="students-icon-container">
          <div className="students-icon"></div>
        </div>
        <div className="students-count">{profileData.correctAnswers}</div>
        <div className="students-label">
          {compact ? 'Correct' : 'Correct Answers'}
        </div>
      </div>

      <div className="streak-section">
        <div className="streak-icon-container">
          <div className="streak-icon"></div>
        </div>
        <div className="streak-count">{profileData.currentStreak}</div>
        <div className="streak-label">
          {compact ? 'Streak' : 'Day Streak'}
        </div>
      </div>

      {error && (
        <div className="biography-error" style={{ 
          fontSize: '10px', 
          color: '#999', 
          marginTop: '8px',
          textAlign: 'center' 
        }}>
          Using defaults
        </div>
      )}
    </div>
  );
}

export default Biography;