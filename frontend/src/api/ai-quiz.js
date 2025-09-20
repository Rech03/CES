import api from './client';

// LECTURER ENDPOINTS - Slide Management
export const uploadLectureSlide = (payload) => api.post('ai-quiz/lecturer/upload-slide/', payload); // FormData: { topic_id, title, slide_file }
export const generateQuestions = (payload) => api.post('ai-quiz/lecturer/generate-questions/', payload); // { lecture_slide_id }
export const lecturerSlides = () => api.get('ai-quiz/lecturer/slides/');
export const deleteLectureSlide = (slideId) => api.delete(`ai-quiz/lecturer/slide/${slideId}/delete/`);
export const regenerateQuestions = (slideId) => api.post(`ai-quiz/lecturer/slide/${slideId}/regenerate/`);

// QUIZ MODERATION ENDPOINTS
export const getQuizzesForReview = () => api.get('ai-quiz/lecturer/quizzes-for-review/');
export const getQuizForModeration = (quizId) => api.get(`ai-quiz/lecturer/quiz/${quizId}/moderate/`);
export const updateQuizQuestions = (quizId, payload) => api.put(`ai-quiz/lecturer/quiz/${quizId}/update/`, payload); // { questions: [] }
export const publishQuiz = (quizId, payload) => api.post(`ai-quiz/lecturer/quiz/${quizId}/publish/`, payload); // { review_notes? }
export const rejectQuiz = (quizId, payload) => api.post(`ai-quiz/lecturer/quiz/${quizId}/reject/`, payload); // { review_notes }

// STUDENT ENDPOINTS - Quiz Taking
export const studentAvailableSlides = () => api.get('ai-quiz/student/available-slides/');
export const getAdaptiveQuiz = (quizId) => api.get(`ai-quiz/student/quiz/${quizId}/`);
export const submitAdaptiveQuiz = (payload) => api.post('ai-quiz/student/submit-quiz/', payload); // { adaptive_quiz_id, answers }
export const studentAdaptiveProgress = () => api.get('ai-quiz/student/progress/');

// AI QUIZ ANALYTICS (specific to adaptive quizzes)
export const getAdaptiveSlideStats = (slideId) => api.get(`ai-quiz/slide/${slideId}/stats/`);
export const getProgressAnalytics = (params) => api.get('ai-quiz/progress-analytics/', { params }); // { student_id?, course_id? }

// QUIZ PROGRESSION AND ACCESS
export const checkQuizAccess = (quizId) => api.get(`ai-quiz/student/quiz/${quizId}/access/`);
export const unlockNextLevel = (payload) => api.post('ai-quiz/student/unlock-next/', payload); // { current_quiz_id }

// LEARNING PATH MANAGEMENT
export const getStudentLearningPath = () => api.get('ai-quiz/student/learning-path/');
export const getDifficultyProgression = (slideId) => api.get(`ai-quiz/student/slide/${slideId}/progression/`);

// EXPLANATION AND FEEDBACK
export const getQuizExplanations = (quizId, attemptId) => api.get(`ai-quiz/student/quiz/${quizId}/explanations/${attemptId}/`);
export const markExplanationViewed = (progressId) => api.post(`ai-quiz/student/progress/${progressId}/explanation-viewed/`);

// LECTURER MONITORING
export const getSlideEngagement = (slideId) => api.get(`ai-quiz/lecturer/slide/${slideId}/engagement/`);
export const getStudentProgressDetail = (studentId, slideId) => api.get(`ai-quiz/lecturer/student/${studentId}/slide/${slideId}/progress/`);