import api from './client';

// SYSTEM MANAGEMENT
export const updateStudentMetrics = () => api.post('analytics/update-metrics/');

// LECTURER ANALYTICS DASHBOARD
export const lecturerDashboard = () => api.get('analytics/lecturer/dashboard/');
export const lecturerChart = (payload) => api.post('analytics/lecturer/chart/', payload); // { chart_type, target_id? }
export const lecturerCourseOptions = () => api.get('analytics/lecturer/course-options/');

// STUDENT ANALYTICS DASHBOARD  
export const studentDashboard = () => api.get('analytics/student/dashboard/');
export const studentEngagementHeatmap = (params) => api.get('analytics/student/engagement-heatmap/', { params }); // { year?, month? }

// DETAILED STATISTICS ENDPOINTS
export const getQuizStatistics = (quizId) => api.get(`analytics/quiz/${quizId}/stats/`);
export const getTopicStatistics = (topicId) => api.get(`analytics/topic/${topicId}/stats/`);
export const getCourseStatistics = (courseId) => api.get(`analytics/course/${courseId}/stats/`);
export const getStudentEngagement = (studentId) => api.get(`analytics/student/${studentId}/engagement/`);

// DATA EXPORT ENDPOINTS
export const exportAnalyticsData = (params) => api.get('analytics/export/', { params }); // { type, format, date_range }
export const exportQuizResults = (quizId, params) => api.get(`analytics/quiz/${quizId}/export/`, { params }); // { format }
export const exportCourseData = (courseId, params) => api.get(`analytics/course/${courseId}/export/`, { params });

// REAL-TIME ANALYTICS
export const getLiveQuizStats = (quizId) => api.get(`analytics/quiz/${quizId}/live-stats/`);
export const getEngagementTrends = (params) => api.get('analytics/trends/engagement/', { params }); // { period, course_id? }
export const getPerformanceTrends = (params) => api.get('analytics/trends/performance/', { params });

// COMPARATIVE ANALYTICS
export const compareQuizzes = (payload) => api.post('analytics/compare/quizzes/', payload); // { quiz_ids: [] }
export const compareTopics = (payload) => api.post('analytics/compare/topics/', payload); // { topic_ids: [] }
export const compareCourses = (payload) => api.post('analytics/compare/courses/', payload); // { course_ids: [] }

// ADAPTIVE LEARNING ANALYTICS (AI Quiz Analytics)
export const getAdaptiveSlideStats = (slideId) => api.get(`analytics/slide/${slideId}/stats/`);
export const getProgressAnalytics = (params) => api.get('analytics/progress-analytics/', { params }); // { student_id?, course_id? }