import api from './client';

// QUIZZES
export const listQuizzes   = (params)                => api.get('quizzes/quizzes/', { params });
export const createQuiz    = (payload)               => api.post('quizzes/quizzes/', payload); // { topic, title, description, ... }
export const getQuiz       = (id)                    => api.get(`quizzes/quizzes/${id}/`);
export const updateQuiz    = (id, payload)           => api.put(`quizzes/quizzes/${id}/`, payload);
export const deleteQuiz    = (id)                    => api.delete(`quizzes/quizzes/${id}/`);
export const startLive     = (id, payload)           => api.post(`quizzes/quizzes/${id}/start_live/`, payload); // { password? }
export const stopLive      = (id, payload)           => api.post(`quizzes/quizzes/${id}/stop_live/`, payload);
export const quizQuestions = (id)                    => api.get(`quizzes/quizzes/${id}/questions/`);
export const quizAttempts  = (id)                    => api.get(`quizzes/quizzes/${id}/attempts/`);

// QUESTIONS
export const listQuestions  = (params)               => api.get('quizzes/questions/', { params });
export const createQuestion = (payload)              => api.post('quizzes/questions/', payload); // { quiz, question_text, question_type, points, order }
export const getQuestion    = (id)                   => api.get(`quizzes/questions/${id}/`);
export const updateQuestion = (id, payload)          => api.put(`quizzes/questions/${id}/`, payload);
export const deleteQuestion = (id)                   => api.delete(`quizzes/questions/${id}/`);
export const addChoiceToQuestion = (questionId, payload) =>
  api.post(`quizzes/questions/${questionId}/add_choice/`, payload); // { choice_text, is_correct, order }

// CHOICES
export const listChoices    = (params)               => api.get('quizzes/choices/', { params });
export const createChoice   = (payload)              => api.post('quizzes/choices/', payload); // { question, choice_text, is_correct, order }
export const getChoice      = (id)                   => api.get(`quizzes/choices/${id}/`);
export const updateChoice   = (id, payload)          => api.put(`quizzes/choices/${id}/`, payload);
export const deleteChoice   = (id)                   => api.delete(`quizzes/choices/${id}/`);

// STUDENT FLOW
export const availableQuizzes = ()                   => api.get('quizzes/student/available-quizzes/');
export const myAttempts       = ()                   => api.get('quizzes/student/my-attempts/');
export const startAttempt     = (payload)            => api.post('quizzes/quiz/start/', payload);        // { quiz_id, password? }
export const submitAnswer     = (payload)            => api.post('quizzes/quiz/submit-answer/', payload);// { attempt_id, question_id, selected_choice_id | answer_text }
export const attemptDetail    = (attemptId)          => api.get(`quizzes/quiz/attempt/${attemptId}/`);
export const quizStats        = (quizId)             => api.get(`quizzes/quiz/${quizId}/statistics/`);
