// src/api/courses.js
import api from './client';

// COURSE CRUD OPERATIONS (ViewSet)
export const listCourses = (params) => api.get('courses/courses/', { params });
export const createCourse = (payload) => api.post('courses/courses/', payload);
export const getCourse = (id) => api.get(`courses/courses/${id}/`);
export const updateCourse = (id, payload) => api.put(`courses/courses/${id}/`, payload);
export const patchCourse = (id, payload) => api.patch(`courses/courses/${id}/`, payload);
export const deleteCourse = (id) => api.delete(`courses/courses/${id}/`);

// COURSE ACTIONS & MANAGEMENT
export const getCourseStudents = (courseId) => api.get(`courses/courses/${courseId}/students/`);
export const getCourseDashboard = (courseId) => api.get(`courses/courses/${courseId}/dashboard/`);
export const removeStudentFromCourse = (courseId, payload) => api.post(`courses/courses/${courseId}/remove_student/`, payload); // { student_id }
export const getCourseTopics = (courseId) => api.get(`courses/courses/${courseId}/topics/`);

// BULK STUDENT MANAGEMENT
// ⬇️ IMPORTANT: let the browser set the multipart boundary; we still hint the type here
export const uploadStudentsCSV = (courseId, formData) =>
  api.post(`courses/course/${courseId}/upload-students/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// TOPIC CRUD OPERATIONS (ViewSet)
export const listTopics = (params) => api.get('courses/topics/', { params });
export const createTopic = (payload) => api.post('courses/topics/', payload); // { course, name, description }
export const getTopic = (id) => api.get(`courses/topics/${id}/`);
export const updateTopic = (id, payload) => api.put(`courses/topics/${id}/`, payload);
export const patchTopic = (id, payload) => api.patch(`courses/topics/${id}/`, payload);
export const deleteTopic = (id) => api.delete(`courses/topics/${id}/`);

// GENERAL ENDPOINTS
export const getMyCourses = () => api.get('courses/my-courses/');
export const getStudentDashboard = () => api.get('courses/student/dashboard/');

// ATTENDANCE MANAGEMENT
export const getCourseAttendance = (courseId, params) => api.get(`courses/course/${courseId}/attendance/`, { params }); // { date? }
export const markAttendance = (courseId, payload) => api.post(`courses/course/${courseId}/mark-attendance/`, payload); // { student_id, is_present, date? }
