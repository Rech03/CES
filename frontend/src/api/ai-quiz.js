import api from './client';

// LECTURER ENDPOINTS - Slide Management
export const uploadLectureSlide = (payload) => api.post('ai-quiz/lecturer/upload-slide/', payload); // FormData: { topic_id, title, slide_file }
export const generateQuestions = (payload) => api.post('ai-quiz/lecturer/generate-questions/', payload); // { lecture_slide_id }
export const lecturerSlides = () => api.get('ai-quiz/lecturer/slides/');
export const getLectureSlide = (slideId) => api.get(`ai-quiz/lecturer/slides/${slideId}/`);
export const deleteLectureSlide = (slideId) => api.delete(`ai-quiz/lecturer/slide/${slideId}/delete/`);
export const regenerateQuestions = (slideId) => api.post(`ai-quiz/lecturer/slide/${slideId}/regenerate/`);

// STUDENT ENDPOINTS - Quiz Taking
export const studentAvailableSlides = () => api.get('ai-quiz/student/available-slides/');
export const getAdaptiveQuiz = (quizId) => api.get(`ai-quiz/student/quiz/${quizId}/`);
export const submitAdaptiveQuiz = (payload) => api.post('ai-quiz/student/submit-quiz/', payload); // { adaptive_quiz_id, answers }
export const studentAdaptiveProgress = () => api.get('ai-quiz/student/progress/');

// ADDITIONAL AI QUIZ ENDPOINTS
export const getQuizAttemptStatus = (quizId) => api.get(`ai-quiz/student/quiz/${quizId}/attempt/`);
export const getLearningPath = () => api.get('ai-quiz/student/learning-path/');
export const resetProgress = (payload) => api.post('ai-quiz/student/reset-progress/', payload); // { adaptive_quiz_id, confirm_reset }
export const getAnalyticsSummary = () => api.get('ai-quiz/lecturer/analytics-summary/');