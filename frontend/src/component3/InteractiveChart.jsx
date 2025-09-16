import React, { useEffect, useRef, useState } from 'react';
import './InteractiveChart.css';

const InteractiveChart = ({ type, data, title, subtitle, height = 300 }) => {
  const chartRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsAnimating(true);
          }
        });
      },
      { threshold: 0.5 }
    );

    if (chartRef.current) observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, []);

  const LineChart = ({ data }) => (
    <div className="line-chart">
      <svg width="100%" height={height} viewBox="0 0 400 200">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#007AFF" />
            <stop offset="100%" stopColor="#00FF88" />
          </linearGradient>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(0, 122, 255, 0.3)" />
            <stop offset="100%" stopColor="rgba(0, 122, 255, 0.05)" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        {[...Array(5)].map((_, i) => (
          <line
            key={i}
            x1="0"
            y1={i * 40}
            x2="400"
            y2={i * 40}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1"
          />
        ))}
        
        {/* Data line */}
        <path
          d={`M ${data.map((point, i) => `${i * 50},${200 - point * 2}`).join(' L ')}`}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="3"
          className={isAnimating ? 'animate-path' : ''}
        />
        
        {/* Area fill */}
        <path
          d={`M 0,200 ${data.map((point, i) => `L ${i * 50},${200 - point * 2}`).join(' ')} L 350,200 Z`}
          fill="url(#areaGradient)"
          className={isAnimating ? 'animate-area' : ''}
        />
        
        {/* Data points */}
        {data.map((point, i) => (
          <circle
            key={i}
            cx={i * 50}
            cy={200 - point * 2}
            r="4"
            fill="#007AFF"
            className={`data-point ${isAnimating ? 'animate-point' : ''}`}
            style={{ animationDelay: `${i * 0.1}s` }}
            onMouseEnter={() => setActiveIndex(i)}
          />
        ))}
        
        {/* Tooltip */}
        {activeIndex !== null && (
          <g className="tooltip">
            <rect
              x={activeIndex * 50 - 25}
              y={200 - data[activeIndex] * 2 - 35}
              width="50"
              height="25"
              fill="rgba(0, 0, 0, 0.8)"
              rx="4"
            />
            <text
              x={activeIndex * 50}
              y={200 - data[activeIndex] * 2 - 20}
              textAnchor="middle"
              fill="white"
              fontSize="12"
            >
              {data[activeIndex]}%
            </text>
          </g>
        )}
      </svg>
    </div>
  );

  const BarChart = ({ data }) => (
    <div className="bar-chart">
      <div className="bars-container">
        {data.map((value, i) => (
          <div key={i} className="bar-wrapper">
            <div 
              className={`bar ${isAnimating ? 'animate-bar' : ''}`}
              style={{ 
                height: `${(value / Math.max(...data)) * 100}%`,
                animationDelay: `${i * 0.1}s`
              }}
            >
              <div className="bar-fill"></div>
            </div>
            <span className="bar-label">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const DonutChart = ({ data, labels }) => {
    const total = data.reduce((sum, val) => sum + val, 0);
    let currentAngle = 0;
    
    return (
      <div className="donut-chart">
        <svg width="200" height="200" viewBox="0 0 200 200">
          {data.map((value, i) => {
            const percentage = (value / total) * 100;
            const startAngle = currentAngle;
            const endAngle = currentAngle + (percentage / 100) * 360;
            currentAngle = endAngle;
            
            const x1 = 100 + 60 * Math.cos((startAngle - 90) * Math.PI / 180);
            const y1 = 100 + 60 * Math.sin((startAngle - 90) * Math.PI / 180);
            const x2 = 100 + 60 * Math.cos((endAngle - 90) * Math.PI / 180);
            const y2 = 100 + 60 * Math.sin((endAngle - 90) * Math.PI / 180);
            
            const largeArc = percentage > 50 ? 1 : 0;
            const pathData = `M 100 100 L ${x1} ${y1} A 60 60 0 ${largeArc} 1 ${x2} ${y2} Z`;
            
            return (
              <path
                key={i}
                d={pathData}
                fill={`hsl(${200 + i * 30}, 70%, 60%)`}
                className={isAnimating ? 'animate-segment' : ''}
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            );
          })}
          <circle cx="100" cy="100" r="30" fill="#000000" />
          <text x="100" y="105" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
            {total}
          </text>
        </svg>
        <div className="donut-legend">
          {labels.map((label, i) => (
            <div key={i} className="legend-item">
              <div 
                className="legend-color" 
                style={{ backgroundColor: `hsl(${200 + i * 30}, 70%, 60%)` }}
              ></div>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="interactive-chart" ref={chartRef}>
      <div className="chart-header">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="chart-container">
        {type === 'line' && <LineChart data={data} />}
        {type === 'bar' && <BarChart data={data} />}
        {type === 'donut' && <DonutChart data={data.values} labels={data.labels} />}
      </div>
    </div>
  );
};

export default InteractiveChart;