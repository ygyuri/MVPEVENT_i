import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { User, Mail, Phone, CreditCard, ArrowRight, ArrowLeft } from 'lucide-react';
import { updateCustomerInfo, createOrder, setCheckoutStep } from '../store/slices/checkoutSlice';

const CustomerInfoForm = () => {
  const dispatch = useDispatch();
  const { customerInfo, cart, isLoading, error } = useSelector((state) => state.checkout);
  
  const [formData, setFormData] = useState({
    firstName: customerInfo?.firstName || '',
    lastName: customerInfo?.lastName || '',
    email: customerInfo?.email || '',
    phone: customerInfo?.phone || ''
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^254\d{9}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid Kenyan phone number (254XXXXXXXXX)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleBack = () => {
    dispatch(setCheckoutStep('cart'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Update customer info in store
    dispatch(updateCustomerInfo(formData));
    
    // Create order with cart data and customer info
    const orderData = {
      customer: formData,
      items: cart
    };
    
    const result = await dispatch(createOrder(orderData));
    
    if (createOrder.fulfilled.match(result)) {
      // Order created successfully, move to payment
      dispatch(setCheckoutStep('payment'));
    }
  };

  return (
    <div className="min-h-screen bg-web3-primary p-4 theme-transition">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 blob-primary"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 blob-secondary"></div>
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-web3-primary mb-4">
            Customer Information
          </h1>
          <p className="text-web3-blue text-lg">
            Please provide your details to complete your order
          </p>
        </div>

        {/* Form */}
        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* First Name & Last Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-web3-blue text-sm font-medium mb-2">
                  First Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-web3-blue" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`input-web3 w-full pl-10 pr-4 py-3 rounded-xl placeholder-web3-cyan focus:outline-none transition-all duration-300 ${
                      errors.firstName ? 'error' : ''
                    }`}
                    placeholder="Enter your first name"
                  />
                </div>
                {errors.firstName && (
                  <p className="mt-1 text-red-400 text-sm">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-web3-blue text-sm font-medium mb-2">
                  Last Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-web3-blue" />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`input-web3 w-full pl-10 pr-4 py-3 rounded-xl placeholder-web3-cyan focus:outline-none transition-all duration-300 ${
                      errors.lastName ? 'error' : ''
                    }`}
                    placeholder="Enter your last name"
                  />
                </div>
                {errors.lastName && (
                  <p className="mt-1 text-red-400 text-sm">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-web3-blue text-sm font-medium mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-web3-blue" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`input-web3 w-full pl-10 pr-4 py-3 rounded-xl placeholder-web3-cyan focus:outline-none transition-all duration-300 ${
                    errors.email ? 'error' : ''
                  }`}
                  placeholder="Enter your email address"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-red-400 text-sm">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-web3-blue text-sm font-medium mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-web3-blue" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`input-web3 w-full pl-10 pr-4 py-3 rounded-xl placeholder-web3-cyan focus:outline-none transition-all duration-300 ${
                    errors.phone ? 'error' : ''
                  }`}
                  placeholder="254XXXXXXXXX (Kenyan format)"
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-red-400 text-sm">{errors.phone}</p>
              )}
              <p className="mt-2 text-web3-cyan text-sm">
                Format: 254XXXXXXXXX (e.g., 254712345678)
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="status-error rounded-xl p-4">
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                type="button"
                onClick={handleBack}
                className="btn-web3-secondary flex-1 sm:flex-none px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Cart
              </button>
              
              <button
                type="submit"
                disabled={isLoading}
                className="btn-web3-primary flex-1 sm:flex-none px-8 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating Order...
                  </>
                ) : (
                  <>
                    Continue to Payment
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Security Notice */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-web3-cyan text-sm">
            <CreditCard className="w-4 h-4" />
            Your information is secure and encrypted
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerInfoForm;
