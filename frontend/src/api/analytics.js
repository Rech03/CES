import api from './client';

// SYSTEM MANAGEMENT
export const updateStudentMetrics = () => api.post('analytics/update-metrics/');

// LECTURER ANALYTICS DASHBOARD (AI Quiz focused)
export const lecturerDashboard = () => api.get('analytics/lecturer/dashboard/');
export const lecturerChart = (payload) => api.post('analytics/lecturer/chart/', payload); // { chart_type, target_id? }
export const lecturerCourseOptions = () => api.get('analytics/lecturer/course-options/');

// STUDENT ANALYTICS DASHBOARD (AI Quiz focused)
export const studentDashboard = () => api.get('analytics/student/dashboard/');
export const studentEngagementHeatmap = (params) => api.get('analytics/student/engagement-heatmap/', { params }); // { year?, month? }

// DETAILED AI QUIZ STATISTICS
export const getAIQuizStatistics = (quizId) => api.get(`analytics/quiz/${quizId}/stats/`); // Renamed for clarity
export const getTopicStatistics = (topicId) => api.get(`analytics/topic/${topicId}/stats/`);
export const getCourseStatistics = (courseId) => api.get(`analytics/course/${courseId}/stats/`);
export const getStudentEngagement = (studentId) => api.get(`analytics/student/${studentId}/engagement/`);

// DATA EXPORT ENDPOINTS (AI Quiz data)
export const exportAnalyticsData = (params) => api.get('analytics/export/', { params }); // { type, format }
export const exportAIQuizResults = (quizId, params) => api.get(`analytics/quiz/${quizId}/export/`, { params }); // { format }
export const exportCourseData = (courseId, params) => api.get(`analytics/course/${courseId}/export/`, { params }); // { format }

// REAL-TIME AI QUIZ ANALYTICS
export const getLiveAIQuizStats = (quizId) => api.get(`analytics/quiz/${quizId}/live-stats/`);
export const getEngagementTrends = (params) => api.get('analytics/trends/engagement/', { params }); // { period, course_id? }
export const getPerformanceTrends = (params) => api.get('analytics/trends/performance/', { params }); // { period, course_id? }

// COMPARATIVE ANALYTICS (AI Quiz focused)
export const compareAIQuizzes = (payload) => api.post('analytics/compare/quizzes/', payload); // { quiz_ids: [] }
export const compareTopics = (payload) => api.post('analytics/compare/topics/', payload); // { topic_ids: [] }
export const compareCourses = (payload) => api.post('analytics/compare/courses/', payload); // { course_ids: [] }

// ADAPTIVE LEARNING ANALYTICS
export const getAdaptiveSlideStats = (slideId) => api.get(`analytics/slide/${slideId}/stats/`); // Moved from ai-quiz.js
export const getProgressAnalytics = (params) => api.get('analytics/progress-analytics/', { params }); // { student_id?, course_id? }

// STUDENT PERFORMANCE ANALYTICS
export const getStudentPerformanceBreakdown = (params) => api.get('analytics/student/performance-breakdown/', { params });
export const getDifficultyProgression = (params) => api.get('analytics/difficulty-progression/', { params }); // { student_id?, course_id? }
export const getAttendanceVerification = (params) => api.get('analytics/attendance-verification/', { params }); // { course_id?, date_range? }\
export const getStudentEngagementHeatmap = (params) => api.get('analytics/student/engagement-heatmap/', { params });

// INTERVENTION AND ENGAGEMENT
export const getStudentsNeedingAttention = (courseId) => api.get(`analytics/course/${courseId}/students-needing-attention/`);
export const triggerInterventionEmail = (payload) => api.post('analytics/intervention-email/', payload); // { student_id, course_id }
export const getEngagementAlerts = () => api.get('analytics/engagement-alerts/');

// AI QUIZ SPECIFIC METRICS
export const getQuestionAnalysis = (quizId) => api.get(`analytics/quiz/${quizId}/question-analysis/`);
export const getDifficultyDistribution = (params) => api.get('analytics/difficulty-distribution/', { params }); // { course_id?, topic_id? }
export const getAdaptiveLearningEffectiveness = (params) => api.get('analytics/adaptive-effectiveness/', { params });