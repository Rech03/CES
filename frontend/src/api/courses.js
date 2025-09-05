import api from './client';

// ViewSets mounted under /api/courses/

// COURSES
export const listCourses  = (params)                 => api.get('courses/courses/', { params });
export const createCourse = (payload)                => api.post('courses/courses/', payload);
export const getCourse    = (id)                     => api.get(`courses/courses/${id}/`);
export const updateCourse = (id, payload)            => api.put(`courses/courses/${id}/`, payload);
export const deleteCourse = (id)                     => api.delete(`courses/courses/${id}/`);

// Course custom actions
export const enrollStudent = (courseId, payload)     => api.post(`courses/courses/${courseId}/enroll_student/`, payload); // { student_number, enrollment_code }
export const removeStudent = (courseId, payload)     => api.post(`courses/courses/${courseId}/remove_student/`, payload); // { student_id }
export const listStudents  = (courseId)              => api.get(`courses/courses/${courseId}/students/`);

// Other endpoints
export const myCourses       = ()                    => api.get('courses/my-courses/');
export const studentEnroll   = (payload)             => api.post('courses/student/enroll/', payload); // { enrollment_code }
export const regenerateCode  = (courseId)            => api.post(`courses/course/${courseId}/regenerate-code/`);
export const courseStats     = (courseId)            => api.get(`courses/course/${courseId}/statistics/`);

// TOPICS
export const listTopics   = (params)                 => api.get('courses/topics/', { params });
export const createTopic  = (payload)                => api.post('courses/topics/', payload); // { course, name, description }
export const updateTopic  = (topicId, payload)       => api.put(`courses/topics/${topicId}/`, payload);
export const deleteTopic  = (topicId)                => api.delete(`courses/topics/${topicId}/`);