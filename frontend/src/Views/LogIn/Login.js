import { useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const nav = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault(); // Prevent page reload
    // Here you can add authentication logic
    nav("/dashboard"); // Redirect to Dashboard after login
  };

  return (
    <div className="login-background">
      <div className="login-card">
        <img src="LogIN.jpeg" alt="Company Logo" className="login-logo" />
        <h1 className="welcome-text">Welcome</h1>
        <form className="login-form" onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Username"
            className="login-input"
          />
          <input
            type="password"
            placeholder="Password"
            className="login-input"
          />
          <button type="submit" className="login-button">
            Log In
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
