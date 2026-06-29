import React from 'react';

interface RIconProps {
  className?: string;
}

// Simple R icon for South African Rand
export const RIcon: React.FC<RIconProps> = ({ className }) => (
  <div className={`${className} flex items-center justify-center font-bold text-lg`}>
    R
  </div>
);

export default RIcon;