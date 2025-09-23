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

// LECTURER QUIZ MANAGEMENT
export const getLecturerAvailableQuizzes = (params) => api.get('ai-quiz/lecturer/available-quizzes/', { params }); // { course_id?, status?, difficulty? }

// STUDENT ENDPOINTS - Quiz Taking
export const studentAvailableSlides = () => api.get('ai-quiz/student/available-slides/');
export const getAdaptiveQuiz = (quizId) => api.get(`ai-quiz/student/quiz/${quizId}/`);
export const submitAdaptiveQuiz = (payload) => api.post('ai-quiz/student/submit-quiz/', payload); // { adaptive_quiz_id, answers }
export const studentAdaptiveProgress = () => api.get('ai-quiz/student/progress/');

// STUDENT QUIZ ENDPOINTS
export const getStudentAvailableQuizzes = () => api.get('ai-quiz/student/available-quizzes/');
export const getStudentQuizSummary = () => api.get('ai-quiz/student/quiz-summary/');

// AI QUIZ ANALYTICS
export const getAdaptiveSlideStats = (slideId) => api.get(`ai-quiz/slide/${slideId}/stats/`);
export const getProgressAnalytics = (params) => api.get('ai-quiz/progress-analytics/', { params }); // { student_id?, course_id? }