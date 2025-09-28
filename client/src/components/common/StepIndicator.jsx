import React from 'react';
import { cn } from '../../utils/cn';

const StepIndicator = ({ 
  currentStep, 
  totalSteps, 
  steps = [], 
  className = '',
  onStepClick = null 
}) => {
  // Default step labels if not provided
  const defaultSteps = [
    'Basic Info',
    'Location',
    'Schedule',
    'Pricing & Tickets',
    'Recurrence',
    'Media',
    'Preview'
  ];

  const stepLabels = steps.length > 0 ? steps : defaultSteps.slice(0, totalSteps);

  const getStepStatus = (step) => {
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'current';
    return 'upcoming';
  };

  const handleStepClick = (step) => {
    if (onStepClick && step <= currentStep) {
      onStepClick(step);
    }
  };

  return (
    <nav aria-label="Progress" className={`w-full ${className}`}>
      {/* Desktop Step Indicator */}
      <ol className="hidden md:flex items-center justify-between w-full">
        {stepLabels.map((label, index) => {
          const stepNumber = index + 1;
          const status = getStepStatus(stepNumber);
          const isClickable = onStepClick && stepNumber <= currentStep;

          return (
            <li key={stepNumber} className="flex items-center flex-1">
              <div className="flex items-center">
                {/* Step circle */}
                <button
                  type="button"
                  onClick={() => handleStepClick(stepNumber)}
                  disabled={!isClickable}
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2',
                    {
                      // Completed step
                      'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg': status === 'completed',
                      'hover:from-green-600 hover:to-green-700': status === 'completed' && isClickable,
                      
                      // Current step
                      'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg ring-2 ring-blue-200': status === 'current',
                      'hover:from-blue-600 hover:to-blue-700': status === 'current' && isClickable,
                      
                      // Upcoming step
                      'bg-gray-200 text-gray-500 border-2 border-gray-300': status === 'upcoming',
                      'dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600': status === 'upcoming',
                      
                      // Clickable states
                      'cursor-pointer': isClickable,
                      'cursor-default': !isClickable
                    }
                  )}
                  aria-current={status === 'current' ? 'step' : undefined}
                  aria-label={`Step ${stepNumber}: ${label}`}
                >
                  {status === 'completed' ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </button>

                {/* Step label */}
                <div className="ml-3 min-w-0 flex-1">
                  <span className={cn(
                    'text-sm font-medium transition-colors duration-200',
                    {
                      'text-green-600 dark:text-green-400': status === 'completed',
                      'text-blue-600 dark:text-blue-400': status === 'current',
                      'text-gray-500 dark:text-gray-400': status === 'upcoming'
                    }
                  )}>
                    {label}
                  </span>
                </div>
              </div>

              {/* Connector line */}
              {stepNumber < totalSteps && (
                <div className="flex-1 flex items-center justify-center mx-4">
                  <div className={cn(
                    'h-0.5 w-full transition-colors duration-200',
                    {
                      'bg-gradient-to-r from-green-500 to-green-600': stepNumber < currentStep,
                      'bg-gray-300 dark:bg-gray-600': stepNumber >= currentStep
                    }
                  )} />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile Step Indicator */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleStepClick(currentStep)}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-all duration-200',
                'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg ring-2 ring-blue-200'
              )}
              aria-current="step"
              aria-label={`Step ${currentStep}: ${stepLabels[currentStep - 1]}`}
            >
              {currentStep}
            </button>
            <div>
              <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Step {currentStep} of {totalSteps}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {stepLabels[currentStep - 1]}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {Math.round(((currentStep - 1) / (totalSteps - 1)) * 100)}% Complete
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {currentStep - 1} of {totalSteps - 1} steps done
            </div>
          </div>
        </div>
        
        {/* Mobile Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop Progress bar */}
      <div className="hidden md:block mt-4">
        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{Math.round(((currentStep - 1) / (totalSteps - 1)) * 100)}% Complete</span>
        </div>
      </div>
    </nav>
  );
};

export default StepIndicator;
