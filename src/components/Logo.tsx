import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-10 h-10" }) => {
  return (
    <div className={`relative flex items-center justify-center bg-black rounded-full border-2 border-white/20 overflow-hidden ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full p-2" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" stroke="white" strokeWidth="4" />
        <path d="M35 70V30L65 70V30" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};
