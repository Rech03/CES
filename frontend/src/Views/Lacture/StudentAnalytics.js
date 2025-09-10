import BarChart from "../../Componets/Lacture/BarChart";
import Bio from "../../Componets/Lacture/bio";
import CoursesList from "../../Componets/Lacture/CoursesList";
import MetricCard from "../../Componets/Lacture/MetricCard";
import NavBar from "../../Componets/Lacture/NavBar";
import StarRating from "../../Componets/Lacture/StarRating";
import "./StudentAnalytics.css";

function StudentAnalytics() {
  // Mock data for the analytics
  const quizAttemptData = [
    { quiz: 'Quiz 1', attempted: 385, total: 400 },
    { quiz: 'Quiz 2', attempted: 372, total: 400 },
    { quiz: 'Quiz 3', attempted: 358, total: 400 },
    { quiz: 'Quiz 4', attempted: 342, total: 400 },
    { quiz: 'Quiz 5', attempted: 367, total: 400 }
  ];

  const performanceData = [
    { month: 'Jan', score: 72 },
    { month: 'Feb', score: 75 },
    { month: 'Mar', score: 78 },
    { month: 'Apr', score: 81 },
    { month: 'May', score: 79 }
  ];

  const strugglingStudents = [
    { name: 'John Doe', trend: 'declining', lastScore: '45%', needsHelp: 'Quiz Concepts' },
    { name: 'Sarah Wilson', trend: 'inconsistent', lastScore: '52%', needsHelp: 'Time Management' },
    { name: 'Mike Brown', trend: 'improving', lastScore: '61%', needsHelp: 'Study Methods' },
    { name: 'Emma Davis', trend: 'struggling', lastScore: '38%', needsHelp: 'Foundation Knowledge' }
  ];

  const conceptStruggles = [
    { concept: 'Parallel Algorithms', struggling: 28, total: 45 },
    { concept: 'Synchronization', struggling: 35, total: 45 },
    { concept: 'Thread Safety', struggling: 22, total: 45 },
    { concept: 'Memory Models', struggling: 31, total: 45 }
  ];

  return (
    <div>
      <div className="NavBar">
        <NavBar />
      </div>
      
      <div className="Container">
        <div className="analytics-content">
          <div className="analytics-header">
            <h2>Student Support Analytics</h2>
          </div>
          
          {/* Metrics Grid */}
          <div className="metrics-grid">
            <MetricCard 
              title="Students Needing Support" 
              value="23" 
              subtitle="Below 60% average" 
              trend={-8} 
            />
            <MetricCard 
              title="Improving Students" 
              value="31" 
              subtitle="Upward trend this month" 
              trend={12} 
            />
            <MetricCard 
              title="Participation Rate" 
              value="85.5%" 
              subtitle="Recent quiz attempts" 
              trend={3} 
            />
            <MetricCard 
              title="Help Requests" 
              value="18" 
              subtitle="This week" 
              trend={-5} 
            />
          </div>

          {/* Charts Grid */}
          <div className="charts-grid">
            <div className="chart-section">
              <BarChart 
                data={quizAttemptData} 
                title="Quiz Participation Tracking" 
              />
            </div>
            
            <div className="chart-section">
              <div className="chart-container">
                <div className="chart-title">Class Performance Trend</div>
                <div className="line-chart">
                  {performanceData.map((item, index) => (
                    <div key={index} className="performance-point">
                      <div className="point-value">{item.score}%</div>
                      <div className="point-bar" style={{height: `${item.score}%`}}></div>
                      <div className="point-label">{item.month}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="chart-section">
              <div className="chart-container">
                <div className="chart-title">Concepts Needing Attention</div>
                <div className="concept-struggles">
                  {conceptStruggles.map((item, index) => {
                    const percentage = Math.round((item.struggling / item.total) * 100);
                    return (
                      <div key={index} className="concept-item">
                        <div className="concept-name">{item.concept}</div>
                        <div className="struggle-bar">
                          <div 
                            className="struggle-fill" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="struggle-count">{item.struggling}/{item.total} struggling</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="chart-section">
              <div className="chart-container">
                <div className="chart-title">Students Requiring Support</div>
                <div className="support-list">
                  {strugglingStudents.map((student, index) => (
                    <div key={index} className="support-item">
                      <div className={`trend-indicator ${student.trend}`}></div>
                      <div className="student-info">
                        <div className="student-name">{student.name}</div>
                        <div className="student-details">
                          <span className="last-score">Last: {student.lastScore}</span>
                          <span className="help-area">Focus: {student.needsHelp}</span>
                        </div>
                      </div>
                      <div className="action-button">Reach Out</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Support Actions Section */}
          <div className="support-actions">
            <h3>Recommended Actions</h3>
            <div className="actions-grid">
              <div className="action-card urgent">
                <div className="action-header">
                  <div className="action-icon">🚨</div>
                  <div className="action-title">Immediate Attention</div>
                </div>
                <div className="action-content">
                  <p>4 students have missed multiple quizzes and are falling behind</p>
                  <button className="action-btn">Send Check-in Email</button>
                </div>
              </div>
              
              <div className="action-card moderate">
                <div className="action-header">
                  <div className="action-icon">📚</div>
                  <div className="action-title">Study Support</div>
                </div>
                <div className="action-content">
                  <p>Create study group for Parallel Algorithms concepts</p>
                  <button className="action-btn">Organize Session</button>
                </div>
              </div>
              
              <div className="action-card positive">
                <div className="action-header">
                  <div className="action-icon">🎯</div>
                  <div className="action-title">Encourage Progress</div>
                </div>
                <div className="action-content">
                  <p>31 students showing improvement - send motivational message</p>
                  <button className="action-btn">Send Encouragement</button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Insights */}
          <div className="insights-section">
            <h3>Support Insights</h3>
            <div className="insights-grid">
              <div className="insight-card">
                <div className="insight-icon">⏰</div>
                <div className="insight-content">
                  <div className="insight-title">Timing Patterns</div>
                  <div className="insight-description">
                    Students who attempt quizzes late tend to score 15% lower
                  </div>
                </div>
              </div>
              
              <div className="insight-card">
                <div className="insight-icon">🤝</div>
                <div className="insight-content">
                  <div className="insight-title">Peer Support</div>
                  <div className="insight-description">
                    Study groups improve struggling student scores by average 23%
                  </div>
                </div>
              </div>
              
              <div className="insight-card">
                <div className="insight-icon">💡</div>
                <div className="insight-content">
                  <div className="insight-title">Learning Strategy</div>
                  <div className="insight-description">
                    Concept review sessions reduce quiz anxiety and improve performance
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="SideST">
        <div className="Rating">
          <StarRating initialRating={4} />
        </div>
        <div className="List">
          <CoursesList />
        </div>
      </div>
      
      <div className="BoiST">
        <Bio />
      </div>
    </div>
  );
}

export default StudentAnalytics;