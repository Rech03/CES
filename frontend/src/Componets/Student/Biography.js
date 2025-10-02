import { useState, useEffect } from 'react';
import { getProfile, getDashboard } from '../../api/auth';
import { getStats as getAchievementStats } from '../../api/achievements';
import { getStudentDashboard } from '../../api/courses';
import { studentAdaptiveProgress } from '../../api/ai-quiz';
import { getMyCourses } from '../../api/courses';
import './Biography.css';

function Biography({
  name,
  title,
  avatar,
  coursesCount,
  quizzesCompleted,
  totalAttempts,
  compact = false,
  showLoading = true
}) {
  const [profileData, setProfileData] = useState({
    name: name || "Student",
    title: title || "Student",
    avatar: avatar || "/ID.jpeg",
    coursesCount: (coursesCount ?? "0").toString(),
    quizzesCompleted: (quizzesCompleted ?? "0").toString(),
    totalAttempts: (totalAttempts ?? "0").toString(),
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
                              coursesCount != null ||
                              quizzesCompleted != null || 
                              totalAttempts != null;

      if (!hasExplicitProps) {
        setLoading(true);
        setError(null);
        
        try {
          // 1) Fetch Profile Information
          let userName = "Student";
          let userTitle = "Student";
          let userAvatar = "/ID.jpeg";

          try {
            const { data } = await getProfile();
            const user = data.user || data; // Handle both response formats
            
            userName =
              user?.full_name ||
              (user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}`.trim() : null) ||
              user?.username ||
              user?.email?.split("@")[0] ||
              "Student";
            
            userTitle = 
              user?.user_type === 'student' ? 'Student' :
              user?.user_type === 'lecturer' ? 'Lecturer' :
              user?.user_type === 'admin' ? 'Admin' :
              user?.title ||
              user?.role ||
              "Student";
            
            userAvatar = 
              user?.profile_picture || 
              user?.avatar || 
              "/ID.jpeg";
              
          } catch (e) {
            console.warn('Biography: Profile fetch failed, using defaults');
            
            if (e.response?.status === 404) {
              console.info('Biography: Profile endpoint not available (404)');
            }
          }

          // 2) Fetch Statistics
          let stats = { coursesCount: 0, quizzesCompleted: 0, totalAttempts: 0 };
          let statsSource = 'default';

          // Fetch number of courses
          try {
            const { data: coursesData } = await getMyCourses();
            const courses = Array.isArray(coursesData) 
              ? coursesData 
              : coursesData?.courses || coursesData?.results || [];
            stats.coursesCount = courses.length;
          } catch (coursesError) {
            console.warn('Biography: Could not fetch courses count');
          }

          // Try achievements API first
          try {
            const { data: achievementStats } = await getAchievementStats();
            
            stats.quizzesCompleted = extractNumber(achievementStats,
              'quizzes_completed', 'total_quizzes_completed', 'completed_quizzes',
              'quizzesCompleted', 'quiz_count', 'quizzes'
            );

            stats.totalAttempts = extractNumber(achievementStats,
              'total_attempts', 'quiz_attempts', 'attempts_count',
              'totalAttempts', 'total_quiz_attempts'
            );

            statsSource = 'achievements';
            
          } catch (achievementError) {
            console.warn('Biography: Achievements API not available, trying alternatives');
            
            // Fallback to user dashboard
            try {
              const { data: userDash } = await getDashboard();
              
              stats.quizzesCompleted = extractNumber(userDash,
                'quizzes_completed', 'total_quizzes', 'quiz_count', 'total_quizzes_taken'
              );

              stats.totalAttempts = extractNumber(userDash,
                'total_attempts', 'quiz_attempts', 'attempts_count', 'total_quiz_attempts'
              );

              statsSource = 'user_dashboard';
              
            } catch (userDashError) {
              console.warn('Biography: User dashboard not available, trying adaptive progress');
              
              // Calculate from adaptive progress
              try {
                const { data: progressData } = await studentAdaptiveProgress();
                const progressArray = Array.isArray(progressData) ? progressData : progressData?.data || [];
                
                // Count completed quizzes
                stats.quizzesCompleted = progressArray.filter(p => p.completed || p.attempts_count > 0).length;
                
                // Sum up total attempts
                stats.totalAttempts = progressArray.reduce((sum, p) => {
                  return sum + (p.attempts_count || 0);
                }, 0);
                
                statsSource = 'adaptive_progress';
                
              } catch (progressError) {
                console.warn('Biography: All stat sources unavailable, using defaults');
                statsSource = 'fallback';
              }
            }
          }

          console.log(`Biography: Loaded stats from ${statsSource}:`, stats);

          setProfileData({
            name: userName,
            title: userTitle,
            avatar: userAvatar,
            coursesCount: String(stats.coursesCount),
            quizzesCompleted: String(stats.quizzesCompleted),
            totalAttempts: String(stats.totalAttempts),
            _statsSource: statsSource,
          });

          setError(null);

        } catch (err) {
          console.error('Biography: Unexpected error:', err);
          setError(null);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchStudentStats();
  }, [name, title, avatar, coursesCount, quizzesCompleted, totalAttempts]);

  if (loading && showLoading) {
    return (
      <div className={`biography-container ${compact ? 'compact' : ''}`}>
        <div className="biography-avatar skeleton"></div>
        <div className="biography-name skeleton">Loading...</div>
        <div className="biography-title skeleton">Loading...</div>
        <div className="quiz-section">
          <div className="quiz-icon-container"><div className="quiz-icon"></div></div>
          <div className="quiz-count skeleton">--</div>
          <div className="quiz-label">Courses</div>
        </div>
        <div className="students-section">
          <div className="students-icon-container"><div className="students-icon"></div></div>
          <div className="students-count skeleton">--</div>
          <div className="students-label">Quizzes</div>
        </div>
        <div className="streak-section">
          <div className="streak-icon-container"><div className="streak-icon"></div></div>
          <div className="streak-count skeleton">--</div>
          <div className="streak-label">Attempts</div>
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
        onError={(e) => { 
          if (e.currentTarget.src !== "/ID.jpeg") {
            e.currentTarget.src = "/ID.jpeg"; 
          }
        }}
        loading="lazy"
      />

      <div className="biography-name" title={profileData.name}>
        {profileData.name}
      </div>
      <div className="biography-title">{profileData.title}</div>

      <div className="quiz-section">
        <div className="quiz-icon-container">
          <div className="quiz-icon"></div>
        </div>
        <div className="quiz-count">{profileData.coursesCount}</div>
        <div className="quiz-label">
          {compact ? 'Courses' : 'Number of Courses'}
        </div>
      </div>

      <div className="students-section">
        <div className="students-icon-container">
          <div className="students-icon"></div>
        </div>
        <div className="students-count">{profileData.quizzesCompleted}</div>
        <div className="students-label">
          {compact ? 'Quizzes' : 'Total Quizzes'}
        </div>
      </div>

      <div className="streak-section">
        <div className="streak-icon-container">
          <div className="streak-icon"></div>
        </div>
        <div className="streak-count">{profileData.totalAttempts}</div>
        <div className="streak-label">
          {compact ? 'Attempts' : 'Quiz Attempts'}
        </div>
      </div>
    </div>
  );
}

export default Biography;