

import { useState } from 'react';
import { useNavigate } from "react-router-dom";
<<<<<<< HEAD

=======
>>>>>>> c1fa26119bd1f3c9749e0cacdd5b0e743963735b
// import { login } from '../../api/auth'; // adjust path if needed - COMMENTED OUT
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
      // Simulate login process without server call
      console.log('Login attempt:', { username, password, remember });
      
      // Simulate loading time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // COMMENTED OUT: Server login call
      // await login(username, password, remember, /* remember_me for backend */ remember);
      
      // For testing purposes, navigate to dashboard after delay
<<<<<<< HEAD
      nav("/Student/dashboard");
=======
      nav("/dashboard");
>>>>>>> c1fa26119bd1f3c9749e0cacdd5b0e743963735b
    } catch (err) {
      // COMMENTED OUT: Server error handling
      // const msg =
      //   err.response?.data?.detail ||
      //   err.response?.data?.message ||
      //   (typeof err.response?.data === "string" ? err.response.data : null) ||
      //   "Login failed";
      // setError(msg);
      
      // For testing, just show a generic error
      setError("Login failed - server connection disabled");
    } finally {
      setIsLoading(false);
    }
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
            <div className="uct-logo-placeholder">
              
            </div>

            {/* Form header */}
            <div className="uct-form-header">
              <h2 className="uct-form-title">Login to your Account</h2>
              <p className="uct-form-subtitle">with your registered UCT Email Address</p>
            </div>

            {/* Error message */}
            {error && <div className="uct-error-message">{error}</div>}

            {/* Login form */}
            <form className="uct-form-fields" onSubmit={handleLogin}>
              <div className="uct-input-group">
                <label className="uct-input-label">
                  Email address*
                </label>
                <input
                  type="text"
                  name="username"
                  placeholder="Enter email address"
                  className="uct-input"
                  required
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
                    placeholder="Password"
                    className="uct-input uct-password-input"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="uct-password-toggle"
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
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </button>

              <div className="uct-forgot-password">
                <button
                  type="button"
                  className="uct-forgot-link"
                  onClick={() => alert('Forgot password functionality would be implemented here')}
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