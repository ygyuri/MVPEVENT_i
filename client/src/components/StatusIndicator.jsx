import React from 'react';
import { cn } from '../utils/cn';
import { CheckCircle, AlertTriangle, XCircle, Info, Clock } from 'lucide-react';

const StatusIndicator = ({ 
  status = 'info', 
  message, 
  size = 'md', 
  showIcon = true,
  className = '' 
}) => {
  const statusConfig = {
    success: {
      icon: CheckCircle,
      classes: 'text-success border-success bg-success',
      textColor: 'text-[#166534]',
      bgColor: 'bg-[#F0FDF4]',
      borderColor: 'border-[#BBF7D0]'
    },
    warning: {
      icon: AlertTriangle,
      classes: 'text-warning border-warning bg-warning',
      textColor: 'text-[#92400E]',
      bgColor: 'bg-[#FFFBEB]',
      borderColor: 'border-[#FED7AA]'
    },
    error: {
      icon: XCircle,
      classes: 'text-error border-error bg-error',
      textColor: 'text-[#991B1B]',
      bgColor: 'bg-[#FEF2F2]',
      borderColor: 'border-[#FECACA]'
    },
    info: {
      icon: Info,
      classes: 'text-info border-info bg-info',
      textColor: 'text-[#1E40AF]',
      bgColor: 'bg-[#EFF6FF]',
      borderColor: 'border-[#BFDBFE]'
    },
    pending: {
      icon: Clock,
      classes: 'text-gray-600 border-gray-300 bg-gray-50',
      textColor: 'text-[#4B5563]',
      bgColor: 'bg-[#F9FAFB]',
      borderColor: 'border-[#D1D5DB]'
    }
  };

  const sizeConfig = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn(
      'inline-flex items-center gap-2 rounded-lg border',
      config.bgColor,
      config.borderColor,
      sizeConfig[size],
      className
    )}>
      {showIcon && <Icon className={cn('w-4 h-4', config.textColor)} />}
      {message && (
        <span className={cn('font-medium', config.textColor)}>
          {message}
        </span>
      )}
    </div>
  );
};

export default StatusIndicator;
