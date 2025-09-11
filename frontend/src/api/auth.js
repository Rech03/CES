import api, { saveTokens, clearTokens } from './client';

// POST /api/auth/login/
export async function login(username, password, remember = false, remember_me = false) {
  console.log('=== LOGIN FUNCTION DEBUG ===');
  console.log('Login called with:', { username, password: '***', remember, remember_me });
  console.log('API instance baseURL:', api.defaults.baseURL);
  console.log('Full URL will be:', api.defaults.baseURL + 'auth/login/');
  
  const payload = { username, password, remember_me };
  console.log('Request payload:', { ...payload, password: '***' });
  
  try {
    console.log('Making POST request to auth/login/...');
    const response = await api.post('auth/login/', payload);
    
    console.log('=== LOGIN SUCCESS ===');
    console.log('Full response:', response);
    console.log('Response data:', response.data);
    console.log('Response status:', response.status);
    
    const { data } = response;

    // Django Token Authentication format
    const token = data.token;
    const user = data.user;
    
    if (!token) {
      throw new Error('No token received from server');
    }

    console.log('Extracted token:', !!token);
    console.log('User data:', user);

    saveTokens({ token, remember });
    return data; // Return the full response including user info
    
  } catch (error) {
    console.error('=== LOGIN ERROR DETAILS ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('Response error:');
      console.error('- Status:', error.response.status);
      console.error('- Status text:', error.response.statusText);
      console.error('- Headers:', error.response.headers);
      console.error('- Data:', error.response.data);
      console.error('- Config URL:', error.response.config?.url);
      console.error('- Config baseURL:', error.response.config?.baseURL);
      console.error('- Full URL that failed:', error.response.config?.baseURL + error.response.config?.url);
    } else if (error.request) {
      console.error('Request error (no response):');
      console.error('- Request:', error.request);
      console.error('- Ready state:', error.request.readyState);
      console.error('- Status:', error.request.status);
    } else {
      console.error('Other error:', error.message);
    }
    
    throw error;
  }
}

export async function logout() {
  console.log('=== LOGOUT FUNCTION ===');
  try { 
    console.log('Calling logout endpoint...');
    await api.post('auth/logout/'); 
    console.log('Logout API call successful');
  } catch (error) {
    console.error('Logout API error:', error);
  } finally { 
    console.log('Clearing tokens...');
    clearTokens(); 
  }
}

export const getProfile = () => {
  console.log('=== GET PROFILE ===');
  console.log('Calling:', api.defaults.baseURL + 'auth/profile/');
  return api.get('auth/profile/');
};

export const updateProfile = (payload) => {
  console.log('=== UPDATE PROFILE ===');
  console.log('Calling:', api.defaults.baseURL + 'auth/profile/');
  console.log('Payload:', payload);
  return api.put('auth/profile/', payload);
};

export const changePassword = (payload) => {
  console.log('=== CHANGE PASSWORD ===');
  console.log('Calling:', api.defaults.baseURL + 'auth/change-password/');
  console.log('Payload:', { ...payload, old_password: '***', new_password: '***' });
  return api.post('auth/change-password/', payload);
};

export const getDashboard = () => {
  console.log('=== GET DASHBOARD ===');
  console.log('Calling:', api.defaults.baseURL + 'auth/dashboard/');
  return api.get('auth/dashboard/');
};

export const checkEnrollment = (student_number) => {
  console.log('=== CHECK ENROLLMENT ===');
  console.log('Calling:', api.defaults.baseURL + 'auth/check-enrollment/');
  console.log('Student number:', student_number);
  return api.get('auth/check-enrollment/', { params: { student_number } });
};