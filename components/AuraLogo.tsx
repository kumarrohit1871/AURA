import React from 'react';

export const AuraLogo = ({ small = false }) => {
  const size = small ? 'w-5 h-5' : 'w-8 h-8';
  return (
    <svg 
      className={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="auraGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#4F46E5" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="45" stroke="url(#auraGradient)" strokeWidth="8"/>
      <circle cx="50" cy="50" r="30" fill="url(#auraGradient)" opacity="0.3"/>
    </svg>
  );
};
