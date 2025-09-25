import api from './client';

// LECTURER ENDPOINTS
export const getLecturerCourses = () => api.get('live-qna/lecturer/courses/');
export const createLiveSession = (payload) => api.post('live-qna/lecturer/create-session/', payload);
export const getLecturerSessions = (params) => api.get('live-qna/lecturer/sessions/', { params });
export const getSessionMessages = (sessionId) => api.get(`live-qna/lecturer/session/${sessionId}/messages/`);
export const endSession = (sessionId) => api.post(`live-qna/lecturer/session/${sessionId}/end/`);

// STUDENT ENDPOINTS
export const joinSession = (payload) => api.post('live-qna/join/', payload);
export const sendMessage = (sessionCode, payload) => api.post(`live-qna/${sessionCode}/send-message/`, payload);
export const getSessionMessagesStudent = (sessionCode) => api.get(`live-qna/${sessionCode}/messages/`);
export const validateSessionCode = (code) => api.get(`live-qna/validate-code/?code=${code}`);