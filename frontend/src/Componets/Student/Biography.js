import { useState, useEffect } from 'react';
import { getProfile } from '../../api/auth';
import { getStudentDashboard } from '../../api/courses';
import { getMyAttempts } from '../../api/quizzes';
import { studentDashboard as getAnalyticsDashboard } from '../../api/analytics';
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
    name: name || "Simphiwe Cele",
    title: title || "BCS Computer Science Student",
    avatar: avatar || "/ID.jpeg",
    quizzesCompleted: quizzesCompleted || "15",
    correctAnswers: correctAnswers || "142",
    currentStreak: currentStreak || "7"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStudentStats = async () => {
      // Only fetch if no props provided
      if (!name && !title && !quizzesCompleted && !correctAnswers && !currentStreak) {
        setLoading(true);
        try {
          // Fetch profile data
          const profileResponse = await getProfile();
          const user = profileResponse.data.user || profileResponse.data;
          
          // Fetch student dashboard data
          let dashboardData = null;
          try {
            const dashboardResponse = await getStudentDashboard();
            dashboardData = dashboardResponse.data;
          } catch (dashErr) {
            console.warn('Student dashboard not available, trying analytics dashboard');
            try {
              const analyticsDashResponse = await getAnalyticsDashboard();
              dashboardData = analyticsDashResponse.data;
            } catch (analyticsErr) {
              console.warn('Analytics dashboard not available, fetching individual stats');
            }
          }

          // Fetch quiz attempts for completed quizzes count
          let completedQuizzes = 0;
          let totalCorrectAnswers = 0;
          try {
            const attemptsResponse = await getMyAttempts();
            const attempts = attemptsResponse.data.results || attemptsResponse.data || [];
            
            // Count completed quizzes
            completedQuizzes = attempts.filter(attempt => 
              attempt.is_completed || attempt.status === 'completed'
            ).length;

            // Calculate total correct answers
            totalCorrectAnswers = attempts.reduce((sum, attempt) => {
              if (attempt.answers && Array.isArray(attempt.answers)) {
                const correctCount = attempt.answers.filter(answer => answer.is_correct).length;
                return sum + correctCount;
              }
              // If we have a score and total questions, estimate correct answers
              if (attempt.score && attempt.total_questions) {
                return sum + Math.round((attempt.score / 100) * attempt.total_questions);
              }
              return sum;
            }, 0);

          } catch (attemptsErr) {
            console.warn('Could not fetch quiz attempts:', attemptsErr);
          }

          // Calculate streak (this would ideally come from backend)
          let streak = 0;
          if (dashboardData && dashboardData.current_streak !== undefined) {
            streak = dashboardData.current_streak;
          } else {
            // Simple streak calculation based on recent activity
            try {
              const recentAttempts = await getMyAttempts();
              const attempts = recentAttempts.data.results || recentAttempts.data || [];
              
              // Sort by date and calculate consecutive days
              const sortedAttempts = attempts
                .filter(attempt => attempt.created_at || attempt.date_created)
                .sort((a, b) => new Date(b.created_at || b.date_created) - new Date(a.created_at || a.date_created));
              
              if (sortedAttempts.length > 0) {
                const today = new Date();
                let currentDate = new Date(sortedAttempts[0].created_at || sortedAttempts[0].date_created);
                
                // Check if there's activity today or yesterday
                const daysDiff = Math.floor((today - currentDate) / (1000 * 60 * 60 * 24));
                if (daysDiff <= 1) {
                  streak = 1;
                  // Count consecutive days
                  for (let i = 1; i < sortedAttempts.length; i++) {
                    const prevDate = new Date(sortedAttempts[i].created_at || sortedAttempts[i].date_created);
                    const daysBetween = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));
                    if (daysBetween === 1) {
                      streak++;
                      currentDate = prevDate;
                    } else {
                      break;
                    }
                  }
                }
              }
            } catch (streakErr) {
              console.warn('Could not calculate streak:', streakErr);
            }
          }

          // Update state with fetched data
          setProfileData({
            name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || "Student",
            title: user.title || user.course || dashboardData?.current_course || "BCS Computer Science Student",
            avatar: user.profile_picture || user.avatar || "/ID.jpeg",
            quizzesCompleted: dashboardData?.quizzes_completed?.toString() || completedQuizzes.toString() || "0",
            correctAnswers: dashboardData?.total_correct_answers?.toString() || totalCorrectAnswers.toString() || "0",
            currentStreak: dashboardData?.current_streak?.toString() || streak.toString() || "0"
          });

        } catch (err) {
          console.error('Error fetching student stats:', err);
          setError('Failed to load profile data');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchStudentStats();
  }, [name, title, quizzesCompleted, correctAnswers, currentStreak]);

  if (loading) {
    return (
      <div className="biography-container">
        <div className="biography-avatar skeleton"></div>
        <div className="biography-name skeleton">Loading...</div>
        <div className="biography-title skeleton">Loading...</div>
        <div className="quiz-section">
          <div className="quiz-icon-container">
            <div className="quiz-icon"></div>
          </div>
          <div className="quiz-count skeleton">--</div>
          <div className="quiz-label">Quizzes Completed</div>
        </div>
        <div className="students-section">
          <div className="students-icon-container">
            <div className="students-icon"></div>
          </div>
          <div className="students-count skeleton">--</div>
          <div className="students-label">Correct Answers</div>
        </div>
        <div className="streak-section">
          <div className="streak-icon-container">
            <div className="streak-icon"></div>
          </div>
          <div className="streak-count skeleton">--</div>
          <div className="streak-label">Day Streak</div>
        </div>
      </div>
    );
  }

  return (
    <div className="biography-container">
      {/* Profile Image */}
      <img 
        className="biography-avatar"
        src={profileData.avatar} 
        alt={`${profileData.name}'s profile`}
        onError={(e) => {
          e.target.src = "/ID.jpeg"; // Fallback image
        }}
      />
      
      {/* Name */}
      <div className="biography-name">
        {profileData.name}
      </div>
      
      {/* Title/Position */}
      <div className="biography-title">
        {profileData.title}
      </div>
      
      {/* Quizzes Completed Section */}
      <div className="quiz-section">
        <div className="quiz-icon-container">
          <div className="quiz-icon"></div>
        </div>
        <div className="quiz-count">{profileData.quizzesCompleted}</div>
        <div className="quiz-label">Quizzes Completed</div>
      </div>
      
      {/* Correct Answers Section */}
      <div className="students-section">
        <div className="students-icon-container">
          <div className="students-icon"></div>
        </div>
        <div className="students-count">{profileData.correctAnswers}</div>
        <div className="students-label">Correct Answers</div>
      </div>

      {/* Streak Section */}
      <div className="streak-section">
        <div className="streak-icon-container">
          <div className="streak-icon"></div>
        </div>
        <div className="streak-count">{profileData.currentStreak}</div>
        <div className="streak-label">Day Streak</div>
      </div>
      
      {error && (
        <div className="error-message">
          <small>{error}</small>
        </div>
      )}
    </div>
  );
}

export default Biography;