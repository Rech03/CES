import api from './client';

// QUIZ CRUD OPERATIONS (ViewSet)
export const listQuizzes = (params) => api.get('quizzes/quizzes/', { params });
export const createQuiz = (payload) => api.post('quizzes/quizzes/', payload); // { topic, title, description, ... }
export const getQuiz = (id) => api.get(`quizzes/quizzes/${id}/`);
export const updateQuiz = (id, payload) => api.put(`quizzes/quizzes/${id}/`, payload);
export const patchQuiz = (id, payload) => api.patch(`quizzes/quizzes/${id}/`, payload);
export const deleteQuiz = (id) => api.delete(`quizzes/quizzes/${id}/`);

// QUIZ ACTIONS
export const startLiveQuiz = (id, payload) => api.post(`quizzes/quizzes/${id}/start_live/`, payload); // { password }
export const stopLiveQuiz = (id) => api.post(`quizzes/quizzes/${id}/stop_live/`, payload);
export const getQuizQuestions = (id) => api.get(`quizzes/quizzes/${id}/questions/`);
export const getQuizAttempts = (id) => api.get(`quizzes/quizzes/${id}/attempts/`);

// QUESTION CRUD OPERATIONS (ViewSet)
export const listQuestions = (params) => api.get('quizzes/questions/', { params });
export const createQuestion = (payload) => api.post('quizzes/questions/', payload); // { quiz, question_text, question_type, points, order }
export const getQuestion = (id) => api.get(`quizzes/questions/${id}/`);
export const updateQuestion = (id, payload) => api.put(`quizzes/questions/${id}/`, payload);
export const patchQuestion = (id, payload) => api.patch(`quizzes/questions/${id}/`, payload);
export const deleteQuestion = (id) => api.delete(`quizzes/questions/${id}/`);
export const addChoiceToQuestion = (questionId, payload) => api.post(`quizzes/questions/${questionId}/add_choice/`, payload); // { choice_text, is_correct, order }

// CHOICE CRUD OPERATIONS (ViewSet)
export const listChoices = (params) => api.get('quizzes/choices/', { params });
export const createChoice = (payload) => api.post('quizzes/choices/', payload); // { question, choice_text, is_correct, order }
export const getChoice = (id) => api.get(`quizzes/choices/${id}/`);
export const updateChoice = (id, payload) => api.put(`quizzes/choices/${id}/`, payload);
export const patchChoice = (id, payload) => api.patch(`quizzes/choices/${id}/`, payload);
export const deleteChoice = (id) => api.delete(`quizzes/choices/${id}/`);

// STUDENT QUIZ TAKING WORKFLOW
export const getAvailableQuizzes = () => api.get('quizzes/student/available-quizzes/');
export const getMyAttempts = () => api.get('quizzes/student/my-attempts/');
export const startQuizAttempt = (payload) => api.post('quizzes/quiz/start/', payload); // { quiz, password? }
export const submitAnswer = (payload) => api.post('quizzes/quiz/submit-answer/', payload); // { attempt_id, question, selected_choice?, answer_text? }
export const submitQuizAttempt = (payload) => api.post('quizzes/quiz/submit/', payload); // { attempt_id }
export const getAttemptDetail = (attemptId) => api.get(`quizzes/quiz/attempt/${attemptId}/`);

// STATISTICS & ANALYTICS
export const getQuizStatistics = (quizId) => api.get(`quizzes/quiz/${quizId}/statistics/`);