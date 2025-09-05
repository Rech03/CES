import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./Login.css";
import { login } from '../../api/auth'; // adjust path if needed

function Login() {
  const nav = useNavigate();
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
      await login(username, password, remember, /* remember_me for backend */ remember);
      nav("/dashboard");
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        (typeof err.response?.data === "string" ? err.response.data : null) ||
        "Login failed";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-background">
      <div className="login-card">
        <img src="LogIN.jpeg" alt="Company Logo" className="login-logo" />
        <h1 className="welcome-text">Welcome</h1>

        {error && <p className="error">{error}</p>}

        <form className="login-form" onSubmit={handleLogin}>
          <input type="text" name="username" placeholder="Username" className="login-input" required />
          <input type="password" name="password" placeholder="Password" className="login-input" required />
          <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#999" }}>
            <input type="checkbox" checked={remember} onChange={() => setRemember(!remember)} />
            Remember me
          </label>
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
