import React from 'react';

interface IconProps {
  className?: string;
}

// Filled money bag with coin stack; color via currentColor
const MoneyBagCoinsIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Bag knot/top */}
    <path d="M8.3 5.9c-.7-.7-1.5-1.9-1.9-2.6.8-.6 1.8-.9 2.8-1 1-.2 1.9.3 2.8.7.3.1.6.3 1 .3s.7-.2 1-.3c.9-.4 1.8-.9 2.8-.7 1 .1 2 .4 2.8 1-.4.7-1.2 1.9-1.9 2.6-.5.5-1.1.9-1.8 1.1-1.6.4-3.2.5-4.8.5s-3.2-.1-4.8-.5c-.7-.2-1.3-.6-1.8-1.1Z"/>
    {/* Tie band */}
    <rect x="6.8" y="7.8" width="10.4" height="1.9" rx="0.9" />
    {/* Bag body */}
    <path d="M5.2 11.2c-1.5 1.8-1.8 4.7-.6 6.8 1.5 2.6 4.7 4 7.4 4s5.9-1.4 7.4-4c1.2-2.1.9-5-.6-6.8-1.5-1.8-4-2.7-6.8-2.7s-5.3.9-6.8 2.7Z"/>
    {/* Coin stack */}
    <ellipse cx="18.3" cy="14.3" rx="2.2" ry="1.1" />
    <path d="M16.1 14.3v3.2c0 1.1 1 2 2.2 2s2.2-.9 2.2-2v-3.2c-.5.5-1.4.9-2.2.9s-1.7-.3-2.2-.9Z"/>
  </svg>
);

export default MoneyBagCoinsIcon;


