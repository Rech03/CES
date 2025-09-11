import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { login } from '../../api/auth';
import './Login.css';

function Login() {
  const nav = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const f = new FormData(e.currentTarget);
    const username = String(f.get("username") || "").trim();
    const password = String(f.get("password") || "");

    try {
      // Validate inputs
      if (!username || !password) {
        setError("Please enter both email and password.");
        return;
      }

      // Call the actual API
      const response = await login(username, password, remember, remember);
      
      // The API response should include user info and role
      const userData = response.user || response;
      
      // Create user session
      const userSession = {
        email: username,
        name: userData.name || userData.first_name + ' ' + userData.last_name || username,
        role: userData.role || userData.user_type || 'student', // Adjust based on your API response
        studentId: userData.student_id || userData.student_number || null,
        employeeId: userData.employee_id || userData.staff_id || null,
        department: userData.department || null,
        userId: userData.id || userData.user_id,
        loginTime: new Date().toISOString(),
        rememberMe: remember
      };
      
      // Store session
      localStorage.setItem('userSession', JSON.stringify(userSession));
      
      // Role-based routing
      if (userSession.role === 'student') {
        console.log(`Student login successful: ${userSession.name}`);
        nav("/StudentDashboard");
      } else if (userSession.role === 'lecturer' || userSession.role === 'teacher' || userSession.role === 'instructor') {
        console.log(`Lecturer login successful: ${userSession.name}`);
        nav("/LecturerDashboard");
      } else {
        console.log(`Unknown role: ${userSession.role}, defaulting to student`);
        nav("/StudentDashboard");
      }
      
    } catch (err) {
      console.error('Login error:', err);
      
      // Handle API error responses
      const errorMessage = 
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        (typeof err.response?.data === "string" ? err.response.data : null) ||
        err.message ||
        "Login failed. Please check your credentials and try again.";
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
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
            <p className="uct-form-subtitle">with your registered UCT Email Address</p>
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
                Email address*
              </label>
              <input
                type="email"
                name="username"
                placeholder="Enter your UCT email address"
                className="uct-input"
                required
                autoComplete="email"
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