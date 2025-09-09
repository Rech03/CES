import api from './client';

// SYSTEM MANAGEMENT
export const updateStudentMetrics = ()              => api.post('analytics/update-metrics/');

// LECTURER ANALYTICS DASHBOARD
export const lecturerDashboard    = ()              => api.get('analytics/lecturer/dashboard/');
export const lecturerChart        = (payload)       => api.post('analytics/lecturer/chart/', payload); // { chart_type, target_id? }
export const lecturerCourseOptions = ()             => api.get('analytics/lecturer/course-options/');

// STUDENT ANALYTICS DASHBOARD  
export const studentDashboard     = ()              => api.get('analytics/student/dashboard/');
export const studentEngagementHeatmap = (params)   => api.get('analytics/student/engagement-heatmap/', { params }); // { year?, month? }

// DETAILED STATISTICS ENDPOINTS
export const getQuizStatistics    = (quizId)        => api.get(`analytics/quiz/${quizId}/stats/`);
export const getTopicStatistics   = (topicId)       => api.get(`analytics/topic/${topicId}/stats/`);
export const getCourseStatistics  = (courseId)      => api.get(`analytics/course/${courseId}/stats/`);
export const getStudentEngagement = (studentId)     => api.get(`analytics/student/${studentId}/engagement/`);

// DATA EXPORT ENDPOINTS
export const exportAnalyticsData  = (params)        => api.get('analytics/export/', { params }); // { type, format, date_range }
export const exportQuizResults    = (quizId, params) => api.get(`analytics/quiz/${quizId}/export/`, { params }); // { format }
export const exportCourseData     = (courseId, params) => api.get(`analytics/course/${courseId}/export/`, { params });

// REAL-TIME ANALYTICS
export const getLiveQuizStats     = (quizId)        => api.get(`analytics/quiz/${quizId}/live-stats/`);
export const getEngagementTrends  = (params)        => api.get('analytics/trends/engagement/', { params }); // { period, course_id? }
export const getPerformanceTrends = (params)        => api.get('analytics/trends/performance/', { params });

// COMPARATIVE ANALYTICS
export const compareQuizzes       = (payload)       => api.post('analytics/compare/quizzes/', payload); // { quiz_ids: [] }
export const compareTopics        = (payload)       => api.post('analytics/compare/topics/', payload); // { topic_ids: [] }
export const compareCourses       = (payload)       => api.post('analytics/compare/courses/', payload); // { course_ids: [] }

// ADAPTIVE LEARNING - LECTURER ENDPOINTS (Slide Management)
export const uploadLectureSlide   = (payload)       => api.post('analytics/adaptive/lecturer/upload-slide/', payload); // FormData: { topic_id, title, slide_file }
export const generateQuestions    = (payload)       => api.post('analytics/adaptive/lecturer/generate-questions/', payload); // { lecture_slide_id }
export const lecturerSlides       = ()              => api.get('analytics/adaptive/lecturer/slides/');
export const deleteLectureSlide   = (slideId)       => api.delete(`analytics/adaptive/lecturer/slide/${slideId}/delete/`);
export const regenerateQuestions  = (slideId)       => api.post(`analytics/adaptive/lecturer/slide/${slideId}/regenerate/`);

// ADAPTIVE LEARNING - STUDENT ENDPOINTS (Quiz Taking)
export const studentAvailableSlides = ()           => api.get('analytics/adaptive/student/available-slides/');
export const getAdaptiveQuiz      = (quizId)        => api.get(`analytics/adaptive/student/quiz/${quizId}/`);
export const submitAdaptiveQuiz   = (payload)       => api.post('analytics/adaptive/student/submit-quiz/', payload); // { adaptive_quiz_id, answers }
export const studentAdaptiveProgress = ()          => api.get('analytics/adaptive/student/progress/');

// ADAPTIVE LEARNING ANALYTICS
export const getAdaptiveSlideStats = (slideId)      => api.get(`analytics/adaptive/slide/${slideId}/stats/`);
export const getProgressAnalytics = (params)        => api.get('analytics/adaptive/progress/', { params }); // { student_id?, course_id? }
