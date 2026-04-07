import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-10 h-10" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* The Circle with the specific gap at bottom right */}
        <path 
          d="M85.3553 85.3553C75.98 94.7307 63.6606 100 50 100C22.3858 100 0 77.6142 0 50C0 22.3858 22.3858 0 50 0C77.6142 0 100 22.3858 100 50C100 63.6606 94.7307 75.98 85.3553 85.3553" 
          stroke="white" 
          strokeWidth="8" 
          strokeLinecap="round"
        />
        {/* The Bold Rounded N */}
        <path 
          d="M32 72V28C32 25.7909 33.7909 24 36 24H42C43.4142 24 44.7307 24.7307 45.4142 25.9142L62.5858 54.0858C63.2693 55.2693 64.5858 56 66 56V28C66 25.7909 67.7909 24 70 24H74C76.2091 24 78 25.7909 78 28V72C78 74.2091 76.2091 76 74 76H68C66.5858 76 65.2693 75.2693 64.5858 74.0858L47.4142 45.9142C46.7307 44.7307 45.4142 44 44 44V72C44 74.2091 42.2091 76 40 76H36C33.7909 76 32 74.2091 32 72Z" 
          fill="white"
        />
      </svg>
    </div>
  );
};
