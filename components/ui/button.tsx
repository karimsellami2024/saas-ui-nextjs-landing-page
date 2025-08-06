// components/ui/button.tsx
import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = ({ children, className = '', ...props }: ButtonProps) => (
  <button
    className={`px-5 py-2 rounded-xl bg-gradient-to-r from-[#708238] to-[#556325] shadow hover:scale-105 hover:brightness-110 transition-all duration-150 text-white font-semibold ${className}`}
    {...props}
  >
    {children}
  </button>
);
