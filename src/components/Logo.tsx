import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-10 h-10" }) => {
  return (
    <div className={`relative flex items-center justify-center bg-black rounded-xl p-1 ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* The Circle with the specific gap at bottom right - Perfectly Centered */}
        <path 
          d="M75 75 A 35 35 0 1 1 82 68" 
          stroke="white" 
          strokeWidth="6" 
          strokeLinecap="round"
        />
        {/* The Bold Rounded N - Shifted slightly right for visual centering */}
        <path 
          d="M40 62 V38 L64 62 V38" 
          stroke="white" 
          strokeWidth="14" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      </svg>
    </div>
  );
};
