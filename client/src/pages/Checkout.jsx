import React from 'react';
import { useSelector } from 'react-redux';
import { selectCheckoutStep } from '../store/slices/checkoutSlice';
import Cart from '../components/Cart';
import CustomerInfoForm from '../components/CustomerInfoForm';
import MpesaPayment from '../components/MpesaPayment';
import OrderConfirmation from '../components/OrderConfirmation';

const CheckoutProgress = ({ currentStep }) => {
  const steps = [
    { key: 'cart', label: 'Cart', icon: '🛒' },
    { key: 'customer-info', label: 'Customer Info', icon: '👤' },
    { key: 'payment', label: 'Payment', icon: '💳' },
    { key: 'confirmation', label: 'Confirmation', icon: '✅' }
  ];

  const currentIndex = steps.findIndex(step => step.key === currentStep);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-center space-x-4">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold transition-all duration-300 ${
                index <= currentIndex
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                  : 'bg-white/10 text-blue-300 border border-blue-500/30'
              }`}>
                {step.icon}
              </div>
              <span className={`text-sm mt-2 font-medium transition-colors duration-300 ${
                index <= currentIndex ? 'text-white' : 'text-blue-300'
              }`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-16 h-0.5 transition-all duration-300 ${
                index < currentIndex ? 'bg-gradient-to-r from-blue-600 to-cyan-600' : 'bg-blue-500/30'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-6 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      <h2 className="text-2xl font-bold text-white mb-2">Loading...</h2>
      <p className="text-blue-300">Please wait while we prepare your checkout experience</p>
    </div>
  </div>
);

const ErrorMessage = ({ error }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center">
        <span className="text-2xl">⚠️</span>
      </div>
      <h2 className="text-2xl font-bold text-white mb-4">Something went wrong</h2>
      <p className="text-blue-300 mb-6 max-w-md">
        {error || 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25"
      >
        Try Again
      </button>
    </div>
  </div>
);

const Checkout = () => {
  const currentStep = useSelector(selectCheckoutStep);
  const { isLoading, error } = useSelector((state) => state.checkout);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'cart':
        return <Cart />;
      case 'customer-info':
        return <CustomerInfoForm />;
      case 'payment':
        return <MpesaPayment />;
      case 'confirmation':
        return <OrderConfirmation />;
      default:
        return <Cart />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-full blur-3xl animate-pulse opacity-30"></div>
      </div>

      <div className="relative z-10">
        {/* Progress Bar - Only show for multi-step flows */}
        {currentStep !== 'confirmation' && (
          <div className="pt-8 pb-4">
            <CheckoutProgress currentStep={currentStep} />
          </div>
        )}

        {/* Step Content */}
        {renderStep()}
      </div>
    </div>
  );
};

export default Checkout;
