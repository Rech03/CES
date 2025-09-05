import { useNavigate } from 'react-router-dom';
import './Logout.css';

function Logout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Mock logout action (to be replaced with backend call later)
    // e.g., localStorage.removeItem('token');
    navigate('/login'); // Redirect to login page
  };

  return (
    <button className="logout-button" onClick={handleLogout}>
      Log out
    </button>
  );
}

export default Logout;