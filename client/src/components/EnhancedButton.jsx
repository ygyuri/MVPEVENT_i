import React from 'react';
import { cn } from '../utils/cn';

const EnhancedButton = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled = false,
  loading = false,
  icon: Icon,
  ...props 
}) => {
  const baseClasses = 'btn-modern font-semibold transition-all duration-300 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed hover:transform hover:scale-[1.02] focus:transform focus:scale-[1.02]';
  
  const variants = {
    primary: 'bg-gradient-to-r from-[#3A7DFF] to-[#8A4FFF] hover:from-[#2563EB] hover:to-[#7C3AED] text-white focus:ring-[#3A7DFF]/30',
    secondary: 'bg-[#F2F4F7] hover:bg-[#E5E7EB] text-[#4B4B4B] border border-[#D1D5DB] focus:ring-[#3A7DFF]/30',
    success: 'bg-gradient-to-r from-[#16A34A] to-[#22C55E] hover:from-[#15803D] hover:to-[#16A34A] text-white focus:ring-[#16A34A]/30',
    warning: 'bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:from-[#D97706] hover:to-[#F59E0B] text-white focus:ring-[#F59E0B]/30',
    error: 'bg-gradient-to-r from-[#EF4444] to-[#F87171] hover:from-[#DC2626] hover:to-[#EF4444] text-white focus:ring-[#EF4444]/30',
    info: 'bg-gradient-to-r from-[#3A7DFF] to-[#00D4FF] hover:from-[#2563EB] hover:to-[#00B8E6] text-white focus:ring-[#3A7DFF]/30',
    ghost: 'bg-transparent hover:bg-[#F2F4F7] text-[#4B4B4B] focus:ring-[#3A7DFF]/30',
    outline: 'bg-transparent border-2 border-[#3A7DFF] text-[#3A7DFF] hover:bg-[#F2F4F7] focus:ring-[#3A7DFF]/30',
  };
  
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  };
  
  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {Icon && !loading && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};

export default EnhancedButton;
