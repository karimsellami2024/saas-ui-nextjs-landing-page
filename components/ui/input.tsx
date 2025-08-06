// components/ui/input.tsx
import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = ({ className = '', ...props }: InputProps) => (
  <input
    className={`border border-[#708238]/30 px-3 py-1.5 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-[#708238] bg-white text-black transition-all ${className}`}
    {...props}
  />
);
