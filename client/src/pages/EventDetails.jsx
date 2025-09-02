import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchEventDetails, fetchEventTickets } from '../store/slices/eventsSlice'
import { addToCart } from '../store/slices/checkoutSlice'
import { Calendar, MapPin, Users, Ticket, ArrowLeft, Clock, Star, Shield, Zap, Globe, Wallet, ShoppingCart } from 'lucide-react'

const EventDetails = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const { currentEvent, tickets, loading, error } = useSelector((state) => state.events)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)

  useEffect(() => {
    if (slug) {
      dispatch(fetchEventDetails(slug))
      dispatch(fetchEventTickets(slug))
    }
  }, [slug, dispatch])

  useEffect(() => {
    if (tickets.length > 0 && !selectedTicket) {
      setSelectedTicket(tickets[0])
    }
  }, [tickets, selectedTicket])

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const formatPrice = (price) => {
    if (!price || price === 0) return 'Free'
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(price)
  }

  const handleAddToCart = async () => {
    if (!selectedTicket || !currentEvent) return
    
    try {
      setAddingToCart(true)
      
      const cartItem = {
        eventId: currentEvent._id,
        eventTitle: currentEvent.title,
        ticketType: selectedTicket.name,
        price: selectedTicket.price || 0,
        quantity
      };
      
      console.log('Adding to cart:', cartItem);
      dispatch(addToCart(cartItem));
      
      // Show success message
      alert(`🎉 Added ${quantity} ${selectedTicket.name} ticket(s) to cart!`)
      
      // Reset form
      setQuantity(1)
      setSelectedTicket(tickets[0])
    } catch (error) {
      alert(`❌ Failed to add to cart: ${error}`)
    } finally {
      setAddingToCart(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-primary-400 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading event details...</p>
        </div>
      </div>
    )
  }

  if (error || !currentEvent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The event you\'re looking for doesn\'t exist or has been removed.'}</p>
          <button 
            onClick={() => navigate('/events')}
            className="bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            Browse Events
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary-400/20 to-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-purple-400/20 to-pink-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-400/10 to-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <div className="container-modern py-6">
          <button 
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-6 group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Events
          </button>
        </div>

        <div className="container-modern pb-16">
          {/* Hero Section */}
          <div className="card-modern overflow-hidden">
            {currentEvent.coverImageUrl && (
              <div className="relative h-80 md:h-96 overflow-hidden">
                <img 
                  src={currentEvent.coverImageUrl} 
                  alt={currentEvent.title} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Category Badge */}
                {currentEvent.category && (
                  <div className="absolute top-6 left-6">
                    <div 
                      className="px-4 py-2 rounded-full text-sm font-semibold text-white backdrop-blur-md border border-white/20"
                      style={{ backgroundColor: `${currentEvent.category.color}CC` }}
                    >
                      {currentEvent.category.icon && <span className="mr-2">{currentEvent.category.icon}</span>}
                      {currentEvent.category.name}
                    </div>
                  </div>
                )}

                {/* Featured/Trending Badges */}
                {currentEvent.isFeatured && (
                  <div className="absolute top-6 right-6">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center">
                      <Star className="w-4 h-4 mr-2" />
                      Featured
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="p-6 md:p-8">
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight text-center">
                {currentEvent.title}
              </h1>

              {/* Event Meta */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-center">
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-5 h-5 mr-3 text-primary-600" />
                  <div>
                    <p className="font-medium">{formatDate(currentEvent.startDate)}</p>
                    <p className="text-sm text-gray-500">{formatTime(currentEvent.startDate)}</p>
                  </div>
                </div>
                
                {currentEvent.venueName && (
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-5 h-5 mr-3 text-primary-600" />
                    <div>
                      <p className="font-medium">{currentEvent.venueName}</p>
                      <p className="text-sm text-gray-500">
                        {currentEvent.city}{currentEvent.state ? `, ${currentEvent.state}` : ''}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center text-gray-600">
                  <Users className="w-5 h-5 mr-3 text-primary-600" />
                  <div>
                    <p className="font-medium">{currentEvent.currentAttendees || 0} attending</p>
                    <p className="text-sm text-gray-500">
                      {currentEvent.capacity ? `${currentEvent.capacity} capacity` : 'Unlimited'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {currentEvent.description && (
                <p className="text-gray-700 text-lg leading-relaxed mb-6 text-center max-w-4xl mx-auto">
                  {currentEvent.description}
                </p>
              )}

              {/* Web3 Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-4xl mx-auto">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                  <div className="flex items-center mb-2">
                    <Wallet className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="font-semibold text-blue-900">Web3 Ready</span>
                  </div>
                  <p className="text-sm text-blue-700">Connect your wallet for seamless transactions</p>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                  <div className="flex items-center mb-2">
                    <Shield className="w-5 h-5 text-green-600 mr-2" />
                    <span className="font-semibold text-green-900">Secure</span>
                  </div>
                  <p className="text-sm text-green-700">Blockchain-verified tickets and ownership</p>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-xl border border-purple-100">
                  <div className="flex items-center mb-2">
                    <Zap className="w-5 h-5 text-purple-600 mr-2" />
                    <span className="font-semibold text-purple-900">Instant</span>
                  </div>
                  <p className="text-sm text-purple-700">Real-time ticket delivery and verification</p>
                </div>
              </div>
            </div>
          </div>

          {/* Organizer Section */}
          {currentEvent.organizer && (
            <div className="mt-8 card-modern max-w-6xl mx-auto">
                              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center justify-center">
                  <Globe className="w-6 h-6 mr-3 text-primary-600" />
                  Event Organizer
                </h2>
              
                              <div className="flex items-center space-x-6 justify-center">
                {currentEvent.organizer.avatarUrl ? (
                  <img 
                    src={currentEvent.organizer.avatarUrl} 
                    alt={currentEvent.organizer.name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-primary-100"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                    {currentEvent.organizer.name.charAt(0)}
                  </div>
                )}
                
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {currentEvent.organizer.name}
                  </h3>
                  <p className="text-gray-600 mb-3">
                    @{currentEvent.organizer.username}
                  </p>
                  <div className="flex space-x-4">
                    <div className="bg-primary-50 text-primary-700 px-4 py-2 rounded-lg text-sm font-medium">
                      Verified Organizer
                    </div>
                    <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-medium">
                      Active Events
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tickets Section */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Event Details */}
            <div className="lg:col-span-2 card-modern">
                              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Event Details</h2>
              
                              {currentEvent.description && (
                  <div className="prose prose-lg max-w-none text-gray-700 text-center">
                    <p className="leading-relaxed">{currentEvent.description}</p>
                  </div>
                )}

              {/* Additional Info */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                                  <div className="card-modern bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-3 text-center">Event Schedule</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Doors Open:</span>
                      <span>{formatTime(currentEvent.startDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Event Ends:</span>
                      <span>{formatTime(currentEvent.endDate)}</span>
                    </div>
                  </div>
                </div>
                
                                  <div className="card-modern bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-3 text-center">Location Details</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    {currentEvent.venueName && (
                      <p><strong>Venue:</strong> {currentEvent.venueName}</p>
                    )}
                    {currentEvent.address && (
                      <p><strong>Address:</strong> {currentEvent.address}</p>
                    )}
                    <p><strong>City:</strong> {currentEvent.city}, {currentEvent.state}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ticket Purchase */}
            <div className="card-modern h-fit">
                              <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 text-center w-full">Get Tickets</h3>
                  <Ticket className="w-6 h-6 text-primary-600" />
                </div>

              {tickets.length > 0 ? (
                <>
                  <div className="space-y-4 mb-6">
                    {tickets.map((ticket) => (
                      <button
                        key={ticket.name}
                        onClick={() => setSelectedTicket(ticket)}
                        className={`w-full text-left p-4 card-modern border-2 transition-all duration-200 ${
                          selectedTicket?.name === ticket.name
                            ? 'border-primary-500 bg-primary-50 shadow-lg'
                            : 'border-gray-200 hover:border-primary-300 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-900">{ticket.name}</span>
                          <span className="text-lg font-bold text-primary-600">
                            {formatPrice(ticket.price)}
                          </span>
                        </div>
                        
                        {ticket.description && (
                          <p className="text-sm text-gray-600 mb-2">{ticket.description}</p>
                        )}
                        
                        {ticket.benefits && (
                          <div className="flex flex-wrap gap-2">
                            {ticket.benefits.map((benefit, index) => (
                              <span 
                                key={index}
                                className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full"
                              >
                                {benefit}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {ticket.quantity && (
                          <p className="text-xs text-gray-500 mt-2">
                            {ticket.quantity} available
                          </p>
                        )}
                      </button>
                    ))}
                  </div>

                  {selectedTicket && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Quantity</label>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                            className="input-modern w-16 text-center text-sm"
                          />
                          <button
                            onClick={() => setQuantity(Math.min(10, quantity + 1))}
                            className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="card-modern bg-gray-50">
                        <div className="flex justify-between text-sm mb-2">
                          <span>Price per ticket:</span>
                          <span>{formatPrice(selectedTicket.price)}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Quantity:</span>
                          <span>{quantity}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
                          <span>Total:</span>
                          <span className="text-lg text-primary-600">
                            {formatPrice((selectedTicket.price || 0) * quantity)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handleAddToCart}
                        disabled={addingToCart}
                        className="btn-modern w-full py-4 font-semibold text-lg bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:ring-4 focus:ring-primary-500/30 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingToCart ? (
                          <div className="flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                            Adding to Cart...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5 mr-2" />
                            Add to Cart
                          </div>
                        )}
                      </button>

                      <div className="flex space-x-3">
                        <button
                          onClick={() => navigate('/checkout')}
                          className="btn-modern flex-1 py-3 font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-200"
                        >
                          View Cart
                        </button>
                        <button
                          onClick={() => navigate('/checkout')}
                          className="btn-modern flex-1 py-3 font-semibold bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 transition-all duration-200"
                        >
                          Checkout Now
                        </button>
                      </div>

                      <p className="text-xs text-gray-500 text-center mt-4">
                        🛒 Add to cart and checkout with MPESA
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Tickets coming soon</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EventDetails

