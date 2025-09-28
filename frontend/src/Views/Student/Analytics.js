import { useState, useEffect } from 'react';
import { getProfile } from '../../api/users';
import Bio from "../../Componets/Student/bio";
import Biography from "../../Componets/Student/Biography";
import CoursesList from "../../Componets/Student/CoursesList";
import NavBar from "../../Componets/Student/NavBar";
import StudentAnalytics from '../../Componets/Student/QuizAnalytics';
import StudentInsights from '../../Componets/Student/StudentInsights';
import "./Analytics.css";

function Analytics() {
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('insights'); // insights or analytics

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Get current user profile to set student ID
        try {
          const profileResponse = await getProfile();
          const user = profileResponse.data;
          console.log('Profile response for analytics:', user);
          
          // Extract user ID from response
          setSelectedStudentId(user?.id || user?.user_id || 1);
        } catch (profileErr) {
          console.warn('Error fetching user profile:', profileErr);
          // Set default student ID if profile fetch fails
          setSelectedStudentId(1);
        }

      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data');
        // Set defaults if everything fails
        setSelectedStudentId(1);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRefresh = () => {
    // Reload the page data
    window.location.reload();
  };

  if (loading) {
    return (
      <div>
        <div className="NavBar">
          <NavBar />
        </div>
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="NavBar">
        <NavBar />
      </div>
      
      {/* Main Container using your existing CSS classes */}
      <div className="ContainerAn">
       
        {error && (
          <div className="error-banner">
            <div className="error-content">
              <p>{error}</p>
              <button onClick={handleRefresh} className="retry-button">
                Try Again
              </button>
            </div>
          </div>
        )}
        
       
        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'insights' && (
            <div className="StudentInsightsWrapper">
              <StudentInsights studentId={selectedStudentId} />
            </div>
          )}
          
          {activeTab === 'analytics' && (
            <div className="StudentAnalyticsWrapper">
              <StudentAnalytics studentId={selectedStudentId} />
            </div>
          )}
        </div>
      </div>

      {/* Side panels using your existing CSS classes */}
      <div className="SideAn">
        
          <CoursesList 
            compact={true}
            showLoading={true}
          />
        
      </div>
      
      <div className="BoiAn">
        <Bio showLoading={true} />
      </div>
    </div>
  );
}

export default Analytics;