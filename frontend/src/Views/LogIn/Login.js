import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { login } from '../../api/auth';
import './Login.css';

function Login() {
  const nav = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");

  // Debug logging for environment variables
  useEffect(() => {
    console.log('=== LOGIN COMPONENT DEBUG ===');
    console.log('Environment variables check:');
    console.log('- REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- All REACT_APP vars:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')));
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const f = new FormData(e.currentTarget);
    const username = String(f.get("username") || "").trim();
    const password = String(f.get("password") || "");

    console.log('=== FORM SUBMISSION DEBUG ===');
    console.log('Form data extracted:', { username, password: password ? '***' : 'empty' });
    console.log('Remember me checked:', remember);

    try {
      // Validate inputs
      if (!username || !password) {
        console.log('Validation failed: missing username or password');
        setError("Please enter both username and password.");
        return;
      }

      console.log('Validation passed, calling login function...');
      
      // Call the actual API
      const response = await login(username, password, remember, remember);
      
      console.log('=== LOGIN RESPONSE PROCESSING ===');
      console.log('Login function returned:', response);
      
      // Extract user data from response
      const userData = response.user || response;
      console.log('User data extracted:', userData);
      
      // Create user session - map Django fields to frontend expectations
      const userSession = {
        username: username,
        name: userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username,
        role: response.user_type || 'student', // Django uses user_type
        studentId: userData.student_number || null,
        employeeId: userData.employee_id || null,
        department: userData.department || null,
        userId: userData.id,
        email: userData.email,
        loginTime: new Date().toISOString(),
        rememberMe: remember
      };
      
      console.log('User session created:', userSession);
      
      // Store session
      localStorage.setItem('userSession', JSON.stringify(userSession));
      console.log('Session stored in localStorage');
      
      // Role-based routing
      if (userSession.role === 'student') {
        console.log(`Student login successful: ${userSession.name}`);
        console.log('Navigating to /StudentDashboard');
        nav("/StudentDashboard");
      } else if (userSession.role === 'lecturer' || userSession.role === 'teacher' || userSession.role === 'instructor') {
        console.log(`Lecturer login successful: ${userSession.name}`);
        console.log('Navigating to /LecturerDashboard');
        nav("/LecturerDashboard");
      } else {
        console.log(`Unknown role: ${userSession.role}, defaulting to student`);
        console.log('Navigating to /StudentDashboard');
        nav("/StudentDashboard");
      }
      
    } catch (err) {
      console.error('=== LOGIN CATCH BLOCK ===');
      console.error('Login error caught:', err);
      
      // Handle API error responses
      let errorMessage = "Login failed. Please check your credentials and try again.";
      
      if (err.response?.data) {
        // Django REST Framework error format
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response.data.non_field_errors) {
          errorMessage = err.response.data.non_field_errors[0];
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      console.error('Error message to display:', errorMessage);
      setError(errorMessage);
    } finally {
      console.log('Login attempt finished, setting loading to false');
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    console.log('Forgot password clicked');
    alert(`Password Reset

To reset your password, please contact:
- IT Support: itsupport@uct.ac.za
- Student Services: students@uct.ac.za
- Staff Services: staff@uct.ac.za

Or visit the UCT password reset portal.`);
  };

  return (
    <div className="uct-login-main">
      {/* Left side - Quote section */}
      <div className="uct-quote-section">
        <div className="uct-quote-overlay"></div>
        
        <div className="uct-quote-content">
          <div className="uct-quote-wrapper">
            <div className="uct-quote-mark">"</div>
            <blockquote className="uct-quote-text">
              It is through education that the daughter of a peasant can become a doctor, 
              that the son of a mineworker can become the head of the mine, that the child 
              of farmworkers can become the president of a great nation.
            </blockquote>
            <cite className="uct-quote-author">— Nelson Mandela</cite>
          </div>
        </div>
        
        <div className="uct-decorative-element"></div>
      </div>

      {/* Right side - Login form */}
      <div className="uct-form-section">
        <div className="uct-form-container">
          {/* UCT Logo placeholder */}
          <div className="uct-logo-placeholder"></div>

          {/* Form header */}
          <div className="uct-form-header">
            <h2 className="uct-form-title">Login to your Account</h2>
            <p className="uct-form-subtitle">with your registered UCT Username</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="uct-error-message" style={{
              background: '#FEE2E2',
              border: '1px solid #FECACA',
              color: '#DC2626',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {/* Login form */}
          <form className="uct-form-fields" onSubmit={handleLogin}>
            <div className="uct-input-group">
              <label className="uct-input-label">
                Username*
              </label>
              <input
                type="text"
                name="username"
                placeholder="Enter your UCT username"
                className="uct-input"
                required
                autoComplete="username"
              />
            </div>

            <div className="uct-input-group">
              <label className="uct-input-label">
                Enter password*
              </label>
              <div className="uct-password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  className="uct-input uct-password-input"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="uct-password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="uct-checkbox-wrapper">
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={() => setRemember(!remember)}
                className="uct-checkbox"
              />
              <label htmlFor="remember" className="uct-checkbox-label">
                Remember my password
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="uct-login-button"
            >
              {isLoading ? (
                <>
                  <div className="uct-loading-spinner"></div>
                  Authenticating...
                </>
              ) : (
                'Login'
              )}
            </button>

            <div className="uct-forgot-password">
              <button
                type="button"
                className="uct-forgot-link"
                onClick={handleForgotPassword}
              >
                Forgot Password?
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;