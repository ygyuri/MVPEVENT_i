import React from 'react';
import { useSelector } from 'react-redux';
import { ShoppingCart, User, CreditCard, CheckCircle } from 'lucide-react';
import CartComponent from '../components/Cart';
import CustomerInfoForm from '../components/CustomerInfoForm';
import MpesaPayment from '../components/MpesaPayment';
import OrderConfirmation from '../components/OrderConfirmation';

const Checkout = () => {
  const { checkoutStep } = useSelector((state) => state.checkout);

  const steps = [
    { id: 'cart', label: 'Cart', icon: ShoppingCart, description: 'Review your selections' },
    { id: 'customer-info', label: 'Customer Info', icon: User, description: 'Enter your details' },
    { id: 'payment', label: 'Payment', icon: CreditCard, description: 'Complete payment' },
    { id: 'confirmation', label: 'Confirmation', icon: CheckCircle, description: 'Order confirmed' }
  ];

  const currentStepIndex = steps.findIndex(step => step.id === checkoutStep);

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center min-h-screen bg-web3-primary theme-transition">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-web3-blue text-lg">Loading checkout...</p>
      </div>
    </div>
  );

  const ErrorMessage = ({ message }) => (
    <div className="flex items-center justify-center min-h-screen bg-web3-primary theme-transition">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-web3-primary mb-2">Something went wrong</h2>
        <p className="text-web3-blue mb-4">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-web3-primary px-6 py-2 rounded-xl"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  // Show loading spinner while determining step
  if (!checkoutStep) {
    return <LoadingSpinner />;
  }

  // Show error if step is invalid
  if (!steps.find(step => step.id === checkoutStep)) {
    return <ErrorMessage message="Invalid checkout step" />;
  }

  return (
    <div className="min-h-screen bg-web3-primary theme-transition">
      {/* Progress Bar */}
      <div className="progress-modern sticky top-16 z-40">
        <div className="container-modern py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === checkoutStep;
              const isCompleted = index < currentStepIndex;
              const isUpcoming = index > currentStepIndex;

              return (
                <div key={step.id} className="flex items-center">
                  {/* Step Icon */}
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                    ${isCompleted 
                      ? 'bg-green-500 text-white' 
                      : isActive 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-500/20 text-gray-400'
                    }
                  `}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Step Label */}
                  <div className="ml-3 hidden sm:block">
                    <p className={`text-sm font-medium transition-colors duration-300 ${
                      isActive 
                        ? 'text-web3-primary' 
                        : isCompleted 
                          ? 'text-green-500' 
                          : 'text-web3-blue'
                    }`}>
                      {step.label}
                    </p>
                    <p className={`text-xs transition-colors duration-300 ${
                      isActive 
                        ? 'text-web3-primary' 
                        : 'text-web3-cyan'
                    }`}>
                      {step.description}
                    </p>
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className={`
                      w-16 h-0.5 mx-4 transition-all duration-300
                      ${isCompleted 
                        ? 'bg-green-500' 
                        : 'bg-gray-500/20'
                      }
                    `} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="relative">
        {/* Animated Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 blob-primary"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 blob-secondary"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 section-modern">
          {checkoutStep === 'cart' && <CartComponent />}
          {checkoutStep === 'customer-info' && <CustomerInfoForm />}
          {checkoutStep === 'payment' && <MpesaPayment />}
          {checkoutStep === 'confirmation' && <OrderConfirmation />}
        </div>
      </div>
    </div>
  );
};

export default Checkout;
