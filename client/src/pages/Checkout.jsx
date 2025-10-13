import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, User, CreditCard, CheckCircle } from 'lucide-react';
import CartComponent from '../components/Cart';
import CustomerInfoForm from '../components/CustomerInfoForm';
import MpesaPayment from '../components/MpesaPayment';
import { scheduleReminders } from '../utils/remindersAPI';
import CurrencySelector from '../components/CurrencySelector';
import { PriceDisplay } from '../components/CurrencyConverter';
import PaymentProviderSelector from '../components/PaymentProviderSelector';
import PesapalPayment from '../components/PesapalPayment';
import PayheroPayment from '../components/PayheroPayment';
import { useTheme } from '../contexts/ThemeContext';
import { validateCartItems } from '../store/slices/checkoutSlice';

const Checkout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { checkoutStep } = useSelector((state) => state.checkout);
  const { isDarkMode } = useTheme();
  const [enableReminders, setEnableReminders] = useState(true);
  const [deliveryMethod, setDeliveryMethod] = useState('email');
  
  // Move hooks to top level to fix React Hooks error
  const paymentMethod = useSelector((state) => state.checkout.currentOrder?.payment?.method);
  const orderData = useSelector((state) => state.checkout.currentOrder);

  // Validate cart items on component mount
  useEffect(() => {
    dispatch(validateCartItems());
  }, [dispatch]);

  // Navigate to PaymentStatus when checkout step is 'confirmation'
  useEffect(() => {
    if (checkoutStep === 'confirmation' && orderData?._id) {
      navigate(`/payment/${orderData._id}`);
    }
  }, [checkoutStep, orderData?._id, navigate]);

  const steps = [
    { id: 'cart', label: 'Cart', icon: ShoppingCart, description: 'Review your selections' },
    { id: 'customer-info', label: 'Customer Info', icon: User, description: 'Enter your details' },
    { id: 'payment', label: 'Payment', icon: CreditCard, description: 'Complete payment' },
    { id: 'confirmation', label: 'Confirmation', icon: CheckCircle, description: 'Order confirmed' }
  ];

  const currentStepIndex = steps.findIndex(step => step.id === checkoutStep);

  const handlePaymentSuccess = async () => {
    try {
      const order = useSelector((state) => state.checkout.currentOrder);
      if (enableReminders && order) {
        await scheduleReminders({ ...order, status: 'paid' }, Intl.DateTimeFormat().resolvedOptions().timeZone);
      }
    } catch {}
  };

  const LoadingSpinner = () => (
    <div className={`flex items-center justify-center min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading checkout...</p>
      </div>
    </div>
  );

  const ErrorMessage = ({ message }) => (
    <div className={`flex items-center justify-center min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="text-center max-w-md mx-auto px-4">
        <div className={`w-12 h-12 ${isDarkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-100 text-red-600'} rounded-full flex items-center justify-center mx-auto mb-4`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Something went wrong</h2>
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-6`}>{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-2xl font-medium transition-colors"
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
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Compact Progress Bar */}
      <div className={`sticky top-16 z-40 ${isDarkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-white border-b border-gray-200'} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === checkoutStep;
              const isCompleted = index < currentStepIndex;

              return (
                <div key={step.id} className="flex items-center">
                  {/* Compact Step Icon */}
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200
                    ${isCompleted 
                      ? 'bg-green-500 text-white' 
                      : isActive 
                        ? 'bg-blue-500 text-white' 
                        : isDarkMode
                          ? 'bg-gray-700 text-gray-400'
                          : 'bg-gray-200 text-gray-500'
                    }
                  `}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Step Label - Hidden on mobile for compactness */}
                  <div className="ml-2 hidden md:block">
                    <p className={`text-sm font-medium transition-colors duration-200 ${
                      isActive 
                        ? isDarkMode ? 'text-white' : 'text-gray-900'
                        : isCompleted 
                          ? 'text-green-500' 
                          : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {step.label}
                    </p>
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className={`
                      w-8 md:w-12 h-0.5 mx-2 md:mx-4 transition-all duration-200
                      ${isCompleted 
                        ? 'bg-green-500' 
                        : isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
                      }
                    `} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {checkoutStep === 'cart' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <CartComponent />
              </div>
              <div className="lg:col-span-1">
                <PaymentProviderSelector />
              </div>
            </div>
          )}
          
          {checkoutStep === 'customer-info' && (
            <div className="max-w-2xl mx-auto">
              <CustomerInfoForm />
            </div>
          )}
          
          {checkoutStep === 'payment' && (
            <div className="max-w-2xl mx-auto">
              {(() => {
                switch (paymentMethod) {
                  case 'pesapal':
                    return <PesapalPayment />;
                  case 'payhero':
                    return (
                      <PayheroPayment 
                        orderData={orderData}
                        onPaymentSuccess={(data) => {
                          console.log('PAYHERO Payment Success:', data);
                          // Handle success - update order status, redirect to confirmation
                        }}
                        onPaymentError={(error) => {
                          console.error('PAYHERO Payment Error:', error);
                          // Handle error - show error message
                        }}
                        onCancel={() => {
                          // Handle cancel - go back to customer info step
                          console.log('Payment cancelled');
                        }}
                      />
                    );
                  default:
                    return <MpesaPayment onPaymentSuccess={handlePaymentSuccess} />;
                }
              })()}
            </div>
          )}
          
          {/* Inline Reminder Setup */}
          <div className="max-w-2xl mx-auto mt-6">
            <div className={`rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-900/60' : 'border-gray-200 bg-white/70'} p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Reminders</div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Receive event start reminders</div>
                </div>
                <div className="flex items-center gap-3">
                  <label className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <input type="checkbox" checked={enableReminders} onChange={e => setEnableReminders(e.target.checked)} /> Enable
                  </label>
                  <select
                    value={deliveryMethod}
                    onChange={e => setDeliveryMethod(e.target.value)}
                    className={`px-3 py-2 rounded-md border text-sm focus:outline-none focus:ring-2 transition
                      ${isDarkMode
                        ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-300 focus:ring-indigo-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-indigo-500'}`}
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
