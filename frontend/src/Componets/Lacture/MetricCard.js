import './MetricCard.css';

function MetricCard({ title, value, subtitle, trend }) {
  return (
    <div className="metric-card">
      <div className="metric-header">
        <div className="metric-title">{title}</div>
        {trend && (
          <div className={`metric-trend ${trend > 0 ? 'positive' : 'negative'}`}>
            {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-subtitle">{subtitle}</div>
    </div>
  );
}

export default MetricCard;