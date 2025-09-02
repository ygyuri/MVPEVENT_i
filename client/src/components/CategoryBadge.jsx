import React from 'react';
import { cn } from '../utils/cn';

const CategoryBadge = ({ 
  category, 
  size = 'md', 
  variant = 'solid',
  className = '' 
}) => {
  const categoryColors = {
    tech: {
      solid: 'bg-[#3A7DFF] text-white',
      outline: 'border-[#3A7DFF] text-[#3A7DFF] bg-[#F2F4F7]',
      text: 'text-[#3A7DFF]'
    },
    business: {
      solid: 'bg-[#16A34A] text-white',
      outline: 'border-[#16A34A] text-[#16A34A] bg-[#F2F4F7]',
      text: 'text-[#16A34A]'
    },
    creative: {
      solid: 'bg-[#8A4FFF] text-white',
      outline: 'border-[#8A4FFF] text-[#8A4FFF] bg-[#F2F4F7]',
      text: 'text-[#8A4FFF]'
    },
    social: {
      solid: 'bg-[#F59E0B] text-white',
      outline: 'border-[#F59E0B] text-[#F59E0B] bg-[#F2F4F7]',
      text: 'text-[#F59E0B]'
    },
    education: {
      solid: 'bg-[#00D4FF] text-white',
      outline: 'border-[#00D4FF] text-[#00D4FF] bg-[#F2F4F7]',
      text: 'text-[#00D4FF]'
    },
    entertainment: {
      solid: 'bg-[#EF4444] text-white',
      outline: 'border-[#EF4444] text-[#EF4444] bg-[#F2F4F7]',
      text: 'text-[#EF4444]'
    },
    sports: {
      solid: 'bg-[#3A7DFF] text-white',
      outline: 'border-[#3A7DFF] text-[#3A7DFF] bg-[#F2F4F7]',
      text: 'text-[#3A7DFF]'
    },
    food: {
      solid: 'bg-[#F59E0B] text-white',
      outline: 'border-[#F59E0B] text-[#F59E0B] bg-[#F2F4F7]',
      text: 'text-[#F59E0B]'
    }
  };

  const sizeConfig = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const colors = categoryColors[category] || categoryColors.tech;
  const colorClass = colors[variant];

  return (
    <span className={cn(
      'inline-flex items-center font-medium rounded-full border',
      colorClass,
      sizeConfig[size],
      className
    )}>
      {category}
    </span>
  );
};

export default CategoryBadge;
