import React, { useState, useEffect } from 'react';
import './StudentAchievements.css';
// Import correct APIs
import { getProfile } from '../../api/users';
import { 
  getStats,
  getBadgeCollection, 
  getHistory,
  getDashboard,
  getDailySummary 
} from '../../api/achievements';

const StudentAchievements = ({ studentId = null }) => {
  const [achievementsData, setAchievementsData] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAchievementsData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 1. Get user profile
        let userProfile = {
          name: "Student",
          level: 1,
          xp: 0,
          xpToNext: 100,
          totalXP: 100
        };

        try {
          const profileResponse = await getProfile();
          const user = profileResponse.data;
          userProfile = {
            name: user?.full_name || 
                  user?.name ||
                  `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
                  user?.username ||
                  "Student",
            level: user?.level || 1,
            xp: user?.xp || user?.experience_points || 0,
            xpToNext: user?.xp_to_next_level || 100,
            totalXP: user?.total_xp || user?.total_experience || 100
          };
        } catch (err) {
          console.warn('Could not fetch user profile:', err);
        }

        // 2. Get achievement stats
        let stats = {
          totalQuizzes: 0,
          perfectScores: 0,
          averageScore: 0,
          studyHours: 0,
          coursesCompleted: 0,
          badgesEarned: 0,
          currentStreak: 0,
          longestStreak: 0
        };

        try {
          const statsResponse = await getStats();
          const statsData = statsResponse.data;
          console.log('Achievement stats:', statsData);

          stats = {
            totalQuizzes: statsData?.total_quizzes || statsData?.quizzes_completed || 0,
            perfectScores: statsData?.perfect_scores || statsData?.hundred_percent_scores || 0,
            averageScore: statsData?.average_score || statsData?.avg_score || 0,
            studyHours: statsData?.study_hours || statsData?.total_study_time || 0,
            coursesCompleted: statsData?.courses_completed || statsData?.completed_courses || 0,
            badgesEarned: statsData?.badges_earned || statsData?.total_badges || 0,
            currentStreak: statsData?.current_streak || statsData?.day_streak || 0,
            longestStreak: statsData?.longest_streak || statsData?.best_streak || 0
          };
        } catch (err) {
          console.warn('Could not fetch achievement stats:', err);
        }

        // 3. Get achievement dashboard for recent achievements
        let recentAchievements = [];
        try {
          const dashboardResponse = await getDashboard();
          const dashboardData = dashboardResponse.data;
          console.log('Achievement dashboard:', dashboardData);

          recentAchievements = dashboardData?.recent_achievements || 
                             dashboardData?.latest_achievements || 
                             dashboardData?.achievements || [];
          
          // Format recent achievements
          recentAchievements = recentAchievements.slice(0, 5).map(achievement => ({
            id: achievement.id || Math.random(),
            name: achievement.name || achievement.title || 'Achievement',
            description: achievement.description || 'Achievement unlocked!',
            icon: achievement.icon || '🏆',
            rarity: achievement.rarity || achievement.level || 'bronze',
            dateEarned: achievement.date_earned || achievement.created_at || achievement.earned_at,
            xpReward: achievement.xp_reward || achievement.points || 50
          }));
        } catch (err) {
          console.warn('Could not fetch dashboard data:', err);
        }

        // 4. Get badge collection
        let badges = [];
        try {
          const badgesResponse = await getBadgeCollection();
          const badgesData = badgesResponse.data;
          console.log('Badge collection:', badgesData);

          const badgeList = Array.isArray(badgesData) ? badgesData : badgesData?.badges || badgesData?.results || [];
          
          badges = badgeList.map(badge => ({
            id: badge.id || Math.random(),
            name: badge.name || badge.title || 'Badge',
            icon: badge.icon || badge.emoji || '🎖️',
            description: badge.description || 'Badge description',
            rarity: badge.rarity || badge.level || 'bronze',
            earned: badge.earned || badge.is_earned || badge.unlocked || false,
            dateEarned: badge.date_earned || badge.earned_at
          }));
        } catch (err) {
          console.warn('Could not fetch badges, using fallback data:', err);
          
          // Fallback badge data
          badges = [
            { id: 1, name: "First Steps", icon: "👶", description: "Complete your first quiz", rarity: "bronze", earned: stats.totalQuizzes > 0 },
            { id: 2, name: "Quick Learner", icon: "⚡", description: "Score 80%+ on first attempt", rarity: "silver", earned: stats.averageScore >= 80 },
            { id: 3, name: "Consistent", icon: "📅", description: "Study for 5 consecutive days", rarity: "silver", earned: stats.currentStreak >= 5 },
            { id: 4, name: "Perfectionist", icon: "💎", description: "Get 3 perfect scores", rarity: "gold", earned: stats.perfectScores >= 3 },
            { id: 5, name: "Scholar", icon: "🎓", description: "Complete 10 quizzes", rarity: "gold", earned: stats.totalQuizzes >= 10 },
            { id: 6, name: "Dedicated", icon: "💪", description: "Study for 20+ hours", rarity: "gold", earned: stats.studyHours >= 20 },
            { id: 7, name: "Marathon", icon: "🏃", description: "30-day streak", rarity: "legendary", earned: stats.longestStreak >= 30 },
            { id: 8, name: "Einstein", icon: "🧠", description: "95%+ average score", rarity: "legendary", earned: stats.averageScore >= 95 }
          ];
        }

        // 5. Create milestones based on user level
        const milestones = [
          { level: 5, reward: "Custom Avatar", unlocked: userProfile.level >= 5 },
          { level: 10, reward: "Study Themes", unlocked: userProfile.level >= 10 },
          { level: 15, reward: "Progress Analytics", unlocked: userProfile.level >= 15 },
          { level: 20, reward: "Premium Features", unlocked: userProfile.level >= 20 },
          { level: 25, reward: "Mentor Access", unlocked: userProfile.level >= 25 }
        ];

        const finalData = {
          studentInfo: userProfile,
          streaks: {
            current: stats.currentStreak,
            longest: stats.longestStreak,
            weeklyGoal: 5,
            weeklyProgress: Math.min(stats.currentStreak, 7)
          },
          stats: {
            totalQuizzes: stats.totalQuizzes,
            perfectScores: stats.perfectScores,
            averageScore: stats.averageScore,
            studyHours: stats.studyHours,
            coursesCompleted: stats.coursesCompleted,
            badgesEarned: badges.filter(b => b.earned).length
          },
          recentAchievements,
          badges,
          milestones
        };

        console.log('Final achievements data:', finalData);
        setAchievementsData(finalData);

      } catch (error) {
        console.error('Error fetching achievements data:', error);
        setError('Failed to load achievements data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAchievementsData();
  }, [studentId]);

  const getRarityColor = (rarity) => {
    switch (rarity?.toLowerCase()) {
      case 'bronze': return '#CD7F32';
      case 'silver': return '#C0C0C0';
      case 'gold': return '#FFD700';
      case 'legendary': 
      case 'diamond':
      case 'platinum': return '#9B59B6';
      default: return '#696F79';
    }
  };

  const getRarityGradient = (rarity) => {
    switch (rarity?.toLowerCase()) {
      case 'bronze': return 'linear-gradient(135deg, #CD7F32 0%, #B8860B 100%)';
      case 'silver': return 'linear-gradient(135deg, #C0C0C0 0%, #A9A9A9 100%)';
      case 'gold': return 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)';
      case 'legendary':
      case 'diamond':
      case 'platinum': return 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)';
      default: return 'linear-gradient(135deg, #BDC3C7 0%, #95A5A6 100%)';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const getXPProgress = () => {
    if (!achievementsData) return 0;
    const { xp, xpToNext } = achievementsData.studentInfo;
    return Math.min((xp / (xp + xpToNext)) * 100, 100);
  };

  const filterBadges = () => {
    if (!achievementsData) return [];
    
    if (selectedCategory === 'all') return achievementsData.badges;
    if (selectedCategory === 'earned') return achievementsData.badges.filter(badge => badge.earned);
    if (selectedCategory === 'unearned') return achievementsData.badges.filter(badge => !badge.earned);
    return achievementsData.badges.filter(badge => badge.rarity?.toLowerCase() === selectedCategory);
  };

  if (loading) {
    return (
      <div className="achievements-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading achievements...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="achievements-container">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  if (!achievementsData) {
    return (
      <div className="achievements-container">
        <div className="error-message">
          <p>Unable to load achievements data</p>
        </div>
      </div>
    );
  }

  const { studentInfo, streaks, stats, recentAchievements, badges, milestones } = achievementsData;

  return (
    <div className="achievements-container">
      {/* Student Level and XP */}
      <div className="student-level-card">
        <div className="level-info">
          <div className="level-number">Level {studentInfo.level}</div>
          <div className="level-name">{studentInfo.name}</div>
        </div>
        <div className="xp-progress">
          <div className="xp-bar">
            <div 
              className="xp-fill" 
              style={{ width: `${getXPProgress()}%` }}
            ></div>
          </div>
          
        </div>
      </div>


      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <div className="recent-achievements">
          <h3>🏆 Recent Achievements</h3>
          <div className="achievements-list">
            {recentAchievements.map(achievement => (
              <div key={achievement.id} className="achievement-item">
                <div 
                  className="achievement-icon"
                  style={{ background: getRarityGradient(achievement.rarity) }}
                >
                  {achievement.icon}
                </div>
                <div className="achievement-info">
                  <span className="achievement-name">{achievement.name}</span>
                  <span className="achievement-desc">{achievement.description}</span>
                  {achievement.dateEarned && (
                    <span className="achievement-date">{formatDate(achievement.dateEarned)}</span>
                  )}
                </div>
                <div className="achievement-xp">+{achievement.xpReward} XP</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badge Collection */}
      <div className="badge-collection">
        <div className="badge-header">
          <h3>🎖️ Badge Collection ({badges.filter(b => b.earned).length}/{badges.length})</h3>
          <div className="badge-filters">
            <button 
              className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              All
            </button>
            <button 
              className={`filter-btn ${selectedCategory === 'earned' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('earned')}
            >
              Earned
            </button>
            <button 
              className={`filter-btn ${selectedCategory === 'gold' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('gold')}
            >
              Gold
            </button>
            <button 
              className={`filter-btn ${selectedCategory === 'legendary' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('legendary')}
            >
              Legendary
            </button>
          </div>
        </div>
        
        <div className="badges-grid">
          {filterBadges().map(badge => (
            <div 
              key={badge.id} 
              className={`badge-item ${badge.earned ? 'earned' : 'unearned'}`}
              style={{ 
                background: badge.earned ? getRarityGradient(badge.rarity) : '#f0f0f0',
                opacity: badge.earned ? 1 : 0.6
              }}
            >
              <div className="badge-icon">{badge.icon}</div>
              <div className="badge-name">{badge.name}</div>
              <div className="badge-desc">{badge.description}</div>
              {!badge.earned && <div className="locked-overlay">🔒</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentAchievements;