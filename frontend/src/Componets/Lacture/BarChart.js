import './BarChart.css';

function BarChart({ data, title }) {
  return (
    <div className="chart-container">
      <div className="chart-title">{title}</div>
      <div className="bar-chart">
        {data.map((item, index) => {
          const percentage = (item.attempted / item.total) * 100;
          return (
            <div key={index} className="bar-item">
              <div className="bar-label">{item.quiz}</div>
              <div className="bar-wrapper">
                <div 
                  className="bar-fill" 
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <div className="bar-value">{item.attempted}/{item.total}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BarChart;