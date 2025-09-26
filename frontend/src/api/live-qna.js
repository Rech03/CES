import api from './client';

// LECTURER ENDPOINTS
export const getLecturerCourses = () => api.get('live_qna/lecturer/courses/');
export const createLiveSession = (payload) => api.post('live_qna/lecturer/create-session/', payload);
export const getLecturerSessions = (params) => api.get('live_qna/lecturer/sessions/', { params });
export const getSessionMessages = (sessionId) => api.get(`live_qna/lecturer/session/${sessionId}/messages/`);
export const endSession = (sessionId) => api.post(`live_qna/lecturer/session/${sessionId}/end/`);

// NEW: Question Management
export const highlightQuestion = (sessionId, messageId) => 
  api.post(`live_qna/lecturer/session/${sessionId}/highlight/${messageId}/`);
export const unhighlightQuestion = (sessionId, messageId) => 
  api.post(`live_qna/lecturer/session/${sessionId}/unhighlight/${messageId}/`);
export const answerQuestion = (sessionId, messageId) => 
  api.post(`live_qna/lecturer/session/${sessionId}/answer/${messageId}/`);

// STUDENT ENDPOINTS
export const joinSession = (payload) => api.post('live_qna/join/', payload);
export const sendMessage = (sessionCode, payload) => api.post(`live_qna/${sessionCode}/send-message/`, payload);
export const getSessionMessagesStudent = (sessionCode) => api.get(`live_qna/${sessionCode}/messages/`);
export const validateSessionCode = (code) => api.get(`live_qna/validate-code/?code=${code}`);

// NEW: Like functionality
export const likeQuestion = (sessionCode, messageId) => 
  api.post(`live_qna/${sessionCode}/message/${messageId}/like/`);