import React from 'react';

// Odometer-style number: each digit is a 0-9 column that slides to its value.
const RollingNumber = ({ value, pad = 2, className = '' }) => {
  const digits = String(value).padStart(pad, '0').split('');
  return (
    <span className={`rolling-number ${className}`} aria-label={String(value)}>
      {digits.map((d, i) => (
        <span key={i} className="rn-digit" aria-hidden="true">
          <span className="rn-col" style={{ '--d': d }}>
            {'0123456789'.split('').map((n) => <span key={n}>{n}</span>)}
          </span>
        </span>
      ))}
    </span>
  );
};

export default RollingNumber;
