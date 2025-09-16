import api from './client';

// PROFILE MANAGEMENT
export const getProfile = () => api.get('users/profile/');
export const updateProfile = (payload) => api.put('users/profile/', payload); // { first_name, last_name, email, ... }
export const changePassword = (payload) => api.post('users/change-password/', payload); // { old_password, new_password }

// DASHBOARD & INFORMATION
export const getDashboard = () => api.get('users/dashboard/');
export const checkEnrollment = (params) => api.get('users/check-enrollment/', { params }); // { student_number }