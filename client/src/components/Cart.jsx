import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight } from 'lucide-react';
import { 
  removeFromCart, 
  updateCartItemQuantity, 
  calculatePricing, 
  setCheckoutStep 
} from '../store/slices/checkoutSlice';

const Cart = () => {
  const dispatch = useDispatch();
  const { cart, cartTotal, pricing } = useSelector((state) => state.checkout);

  // Debug logging
  console.log('Cart component state:', { cart, cartTotal, pricing });

  const handleQuantityChange = (eventId, ticketType, newQuantity) => {
    if (newQuantity > 0) {
      dispatch(updateCartItemQuantity({ eventId, ticketType, quantity: newQuantity }));
    }
  };

  const handleRemoveItem = (eventId, ticketType) => {
    dispatch(removeFromCart({ eventId, ticketType }));
  };

  const handleProceedToCheckout = async () => {
    if (cart && cart.length > 0) {
      await dispatch(calculatePricing(cart));
      dispatch(setCheckoutStep('customer-info'));
    }
  };

  // Handle case where cart might be undefined or null
  if (!cart || cart.length === 0) {
    return (
      <div className="min-h-screen bg-web3-primary flex items-center justify-center p-4 theme-transition">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
            <ShoppingCart className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-web3-primary mb-4">Your Cart is Empty</h2>
          <p className="text-web3-blue mb-8 max-w-md">
            Start building your cart by exploring our amazing events and adding tickets!
          </p>
          <button
            onClick={() => window.history.back()}
            className="btn-web3-primary px-8 py-3 rounded-xl font-semibold"
          >
            Explore Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-web3-primary theme-transition">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 blob-primary"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 blob-secondary"></div>
      </div>

      <div className="container-modern relative z-10">
        {/* Header */}
        <div className="text-center-modern mb-8">
          <h1 className="text-4xl font-bold text-web3-primary mb-4">
            Your Cart
          </h1>
          <p className="text-web3-blue text-lg">
            Review your selections and proceed to checkout
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="card-modern">
              <h2 className="text-xl font-semibold text-web3-primary mb-6 flex items-center gap-3">
                <ShoppingCart className="w-6 h-6 text-web3-blue" />
                Cart Items ({cart.length})
              </h2>
              
              <div className="space-y-4">
                {cart.map((item, index) => (
                  <div
                    key={`${item.eventId}-${item.ticketType}-${index}`}
                    className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl p-4 border border-blue-500/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-web3-primary mb-2">
                          {item.eventTitle}
                        </h3>
                        <p className="text-web3-blue text-sm mb-2">
                          {item.ticketType} Ticket
                        </p>
                        <p className="text-web3-cyan font-medium">
                          KES {(item.unitPrice || item.price || 0).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-white/10 rounded-lg border border-blue-500/30">
                          <button
                            onClick={() => handleQuantityChange(item.eventId, item.ticketType, item.quantity - 1)}
                            className="p-2 text-blue-300 hover:text-white hover:bg-blue-500/20 rounded-l-lg transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-3 py-2 text-white font-medium min-w-[3rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.eventId, item.ticketType, item.quantity + 1)}
                            className="p-2 text-blue-300 hover:text-white hover:bg-blue-500/20 rounded-r-lg transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <button
                          onClick={() => handleRemoveItem(item.eventId, item.ticketType)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-blue-500/20">
                      <p className="text-right text-web3-primary font-semibold">
                        Subtotal: KES {(item.subtotal || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="card-modern sticky top-4">
              <h3 className="text-xl font-semibold text-web3-primary mb-6">Order Summary</h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-web3-blue">
                  <span>Subtotal</span>
                  <span>KES {(cartTotal || 0).toLocaleString()}</span>
                </div>
                
                {pricing && (
                  <>
                    <div className="flex justify-between text-web3-blue">
                      <span>Service Fee</span>
                      <span>KES {(pricing.serviceFee || 0).toLocaleString()}</span>
                    </div>
                    
                    <div className="border-t border-blue-500/20 pt-3">
                      <div className="flex justify-between text-web3-primary font-semibold text-lg">
                        <span>Total</span>
                        <span>KES {(pricing.total || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              <button
                onClick={handleProceedToCheckout}
                disabled={!cart || cart.length === 0}
                className="btn-modern w-full py-3 px-6 font-semibold flex items-center justify-center gap-2"
              >
                Proceed to Checkout
                <ArrowRight className="w-5 h-5" />
              </button>
              
              <p className="text-xs text-web3-cyan text-center mt-4">
                Secure checkout powered by MPESA
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
