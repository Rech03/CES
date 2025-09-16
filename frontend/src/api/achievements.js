import api from './client';

// STUDENT ACHIEVEMENT DASHBOARD
export const getDashboard = () => api.get('achievements/dashboard/');

// BADGE COLLECTION & MANAGEMENT
export const getBadgeCollection = (params) => api.get('achievements/badges/', { params }); // { filter? } (all|earned|gold|legendary)
export const getAvailableBadges = () => api.get('achievements/badges/available/');
export const getBadgeProgress = (badgeId) => api.get(`achievements/badge-progress/${badgeId}/`);

// PROGRESS & HISTORY
export const getHistory = (params) => api.get('achievements/history/', { params }); // { days? }
export const getStats = () => api.get('achievements/stats/');
export const getDailySummary = () => api.get('achievements/daily-summary/');
export const getWeeklyRecap = (params) => api.get('achievements/weekly-recap/', { params }); // { week_offset? }

// ACHIEVEMENT PROCESSING
export const checkAchievements = () => api.post('achievements/check/');

// LEADERBOARDS & COMPETITION
export const getLeaderboard = (params) => api.get('achievements/leaderboard/', { params }); // { type?, course_id? }

// GOAL SETTING & SOCIAL FEATURES
export const setGoals = (payload) => api.post('achievements/set-goals/', payload); // { goals: [] }
export const getSocialFeatures = () => api.get('achievements/social-features/');

// REWARDS STORE
export const getRewardsStore = () => api.get('achievements/rewards-store/');
export const purchaseReward = (payload) => api.post('achievements/purchase-reward/', payload); // { reward_id, confirm_purchase }