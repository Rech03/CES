import React, { useState, useEffect } from 'react';
import './StudentAchievements.css';

const StudentAchievements = ({ studentId = 1 }) => {
  const [achievementsData, setAchievementsData] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  // Mock achievements data - replace with actual API call
  useEffect(() => {
    const mockData = {
      studentInfo: {
        name: "John Doe",
        level: 15,
        xp: 2450,
        xpToNext: 550,
        totalXP: 3000
      },
      streaks: {
        current: 7,
        longest: 15,
        weeklyGoal: 5,
        weeklyProgress: 4
      },
      stats: {
        totalQuizzes: 23,
        perfectScores: 5,
        averageScore: 78,
        studyHours: 45,
        coursesCompleted: 3,
        badgesEarned: 12
      },
      recentAchievements: [
        {
          id: 1,
          name: "Quiz Master",
          description: "Score 90% or higher on 5 consecutive quizzes",
          icon: "🏆",
          rarity: "gold",
          dateEarned: "2024-09-08",
          xpReward: 200
        },
        {
          id: 2,
          name: "Streak Champion",
          description: "Maintain a 7-day study streak",
          icon: "🔥",
          rarity: "silver",
          dateEarned: "2024-09-07",
          xpReward: 100
        },
        {
          id: 3,
          name: "Perfect Score",
          description: "Achieve 100% on any quiz",
          icon: "💯",
          rarity: "gold",
          dateEarned: "2024-09-05",
          xpReward: 150
        }
      ],
      badges: [
        { id: 1, name: "First Steps", icon: "👶", description: "Complete your first quiz", rarity: "bronze", earned: true },
        { id: 2, name: "Quick Learner", icon: "⚡", description: "Score 80%+ on first attempt", rarity: "silver", earned: true },
        { id: 3, name: "Consistent", icon: "📅", description: "Study for 5 consecutive days", rarity: "silver", earned: true },
        { id: 4, name: "Perfectionist", icon: "💎", description: "Get 3 perfect scores", rarity: "gold", earned: true },
        { id: 5, name: "Speed Demon", icon: "🚀", description: "Complete quiz in under 2 minutes", rarity: "silver", earned: true },
        { id: 6, name: "Scholar", icon: "🎓", description: "Complete 10 quizzes", rarity: "gold", earned: true },
        { id: 7, name: "Dedicated", icon: "💪", description: "Study for 20+ hours", rarity: "gold", earned: false },
        { id: 8, name: "Marathon", icon: "🏃", description: "30-day streak", rarity: "legendary", earned: false },
        { id: 9, name: "Einstein", icon: "🧠", description: "95%+ average score", rarity: "legendary", earned: false }
      ],
      milestones: [
        { level: 5, reward: "Custom Avatar", unlocked: true },
        { level: 10, reward: "Study Themes", unlocked: true },
        { level: 15, reward: "Progress Analytics", unlocked: true },
        { level: 20, reward: "Premium Features", unlocked: false },
        { level: 25, reward: "Mentor Access", unlocked: false }
      ]
    };

    setTimeout(() => {
      setAchievementsData(mockData);
      setLoading(false);
    }, 1000);
  }, [studentId]);

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'bronze': return '#CD7F32';
      case 'silver': return '#C0C0C0';
      case 'gold': return '#FFD700';
      case 'legendary': return '#9B59B6';
      default: return '#696F79';
    }
  };

  const getRarityGradient = (rarity) => {
    switch (rarity) {
      case 'bronze': return 'linear-gradient(135deg, #CD7F32 0%, #B8860B 100%)';
      case 'silver': return 'linear-gradient(135deg, #C0C0C0 0%, #A9A9A9 100%)';
      case 'gold': return 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)';
      case 'legendary': return 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)';
      default: return 'linear-gradient(135deg, #BDC3C7 0%, #95A5A6 100%)';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getXPProgress = () => {
    const { xp, xpToNext } = achievementsData.studentInfo;
    return (xp / (xp + xpToNext)) * 100;
  };

  const filterBadges = () => {
    if (!achievementsData) return [];
    
    if (selectedCategory === 'all') return achievementsData.badges;
    if (selectedCategory === 'earned') return achievementsData.badges.filter(badge => badge.earned);
    if (selectedCategory === 'unearned') return achievementsData.badges.filter(badge => !badge.earned);
    return achievementsData.badges.filter(badge => badge.rarity === selectedCategory);
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
     

      {/* Streaks and Stats Grid */}
      <div className="stats-grid">
        <div className="streak-card">
          <div className="streak-icon">🔥</div>
          <div className="streak-info">
            <span className="streak-number">{streaks.current}</span>
            <span className="streak-label">Day Streak</span>
          </div>
          <div className="streak-best">Best: {streaks.longest} days</div>
        </div>

        <div className="stat-card">
          <span className="stat-value">{stats.perfectScores}</span>
          <span className="stat-label">Perfect Scores</span>
          <div className="stat-icon">💯</div>
        </div>

        <div className="stat-card">
          <span className="stat-value">{stats.averageScore}%</span>
          <span className="stat-label">Average Score</span>
          <div className="stat-icon">📊</div>
        </div>

        <div className="stat-card">
          <span className="stat-value">{stats.studyHours}h</span>
          <span className="stat-label">Study Time</span>
          <div className="stat-icon">⏰</div>
        </div>
      </div>

      {/* Recent Achievements */}
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
                <span className="achievement-date">{formatDate(achievement.dateEarned)}</span>
              </div>
              <div className="achievement-xp">+{achievement.xpReward} XP</div>
            </div>
          ))}
        </div>
      </div>

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