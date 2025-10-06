import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchEventDetails, fetchEventTickets } from '../store/slices/eventsSlice'
import { addToCart } from '../store/slices/checkoutSlice'
import { Calendar, MapPin, Users, Ticket, ArrowLeft, Clock, Star, Shield, Zap, Globe, Wallet, ShoppingCart, User, TrendingUp } from 'lucide-react'
import { PriceDisplay } from '../components/CurrencyConverter'
import { scheduleReminders } from '../utils/remindersAPI'
import { useTheme } from '../contexts/ThemeContext'
import { Link } from 'react-router-dom'
import { PollList } from '../components/polls'
import ActivePollsWidget from '../components/attendee/ActivePollsWidget'

const EventDetails = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isDarkMode } = useTheme()

  const { currentEvent, tickets, loading, error } = useSelector((state) => state.events)
  const { user } = useSelector((state) => state.auth)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)
  const [remindersEnabled, setRemindersEnabled] = useState(true)
  const [reminderMethod, setReminderMethod] = useState('email')

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
        eventId: currentEvent.id,
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

  const handleQuickReminderToggle = async (checked) => {
    setRemindersEnabled(checked)
    try {
      const order = useSelector((state) => state.checkout.currentOrder)
      if (checked && order) {
        await scheduleReminders({ ...order, status: 'paid' }, Intl.DateTimeFormat().resolvedOptions().timeZone)
      }
    } catch {}
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className={`mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Loading event details...</p>
        </div>
      </div>
    )
  }

  if (error || !currentEvent) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="max-w-md mx-auto text-center px-4">
          <div className={`w-16 h-16 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <Shield className={`w-8 h-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          </div>
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Event Not Found</h2>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-6`}>{error || 'The event you\'re looking for doesn\'t exist or has been removed.'}</p>
          <button 
            onClick={() => navigate('/events')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-2xl font-medium transition-colors"
          >
            Browse Events
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <button 
          onClick={() => navigate(-1)}
          className={`inline-flex items-center ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors mb-6 group`}
        >
          <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Events
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Hero Section */}
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 mb-8`}>
          {currentEvent.coverImageUrl && (
            <div className="relative h-64 md:h-80 overflow-hidden">
              <img 
                src={currentEvent.coverImageUrl} 
                alt={currentEvent.title} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              
              {/* Category Badge */}
              {currentEvent.category && (
                <div className="absolute top-4 left-4">
                  <div 
                    className="px-3 py-1.5 rounded-2xl text-sm font-medium text-white backdrop-blur-md border border-white/20"
                    style={{ backgroundColor: `${currentEvent.category.color}CC` }}
                  >
                    {currentEvent.category.icon && <span className="mr-1">{currentEvent.category.icon}</span>}
                    {currentEvent.category.name}
                  </div>
                </div>
              )}

              {/* Featured Badge */}
              {currentEvent.isFeatured && (
                <div className="absolute top-4 right-4">
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1.5 rounded-2xl text-sm font-medium flex items-center">
                    <Star className="w-4 h-4 mr-1" />
                    Featured
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="p-6 md:p-8">
            <h1 className={`text-2xl md:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-6 leading-tight`}>
              {currentEvent.title}
            </h1>

            {/* Event Meta - Compact */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className={`flex items-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <Calendar className={`w-5 h-5 mr-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                <div>
                  <p className="font-medium text-sm">{formatDate(currentEvent.startDate)}</p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{formatTime(currentEvent.startDate)}</p>
                </div>
              </div>
              
              {currentEvent.venueName && (
                <div className={`flex items-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <MapPin className={`w-5 h-5 mr-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                  <div>
                    <p className="font-medium text-sm">{currentEvent.venueName}</p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {currentEvent.city}{currentEvent.state ? `, ${currentEvent.state}` : ''}
                    </p>
                  </div>
                </div>
              )}
              
              <div className={`flex items-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <Users className={`w-5 h-5 mr-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                <div>
                  <p className="font-medium text-sm">{currentEvent.currentAttendees || 0} attending</p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {currentEvent.capacity ? `${currentEvent.capacity} capacity` : 'Unlimited'}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            {currentEvent.description && (
              <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} leading-relaxed mb-6`}>
                {currentEvent.description}
              </p>
            )}
          </div>
        </div>

        {/* Active Polls - attendee widget (near top, under hero) */}
        {currentEvent?.id && (
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 mb-8`}>
            <ActivePollsWidget eventId={currentEvent.id} />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Details & Organizer */}
          <div className="lg:col-span-2 space-y-6">
            {/* Organizer Section */}
            {currentEvent.organizer && (
              <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-xl p-6 border border-gray-200 dark:border-gray-700`}>
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4 flex items-center`}>
                  <User className={`w-5 h-5 mr-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                  Event Organizer
                </h2>
                
                <div className="flex items-center space-x-4">
                  {currentEvent.organizer.avatarUrl ? (
                    <img 
                      src={currentEvent.organizer.avatarUrl} 
                      alt={currentEvent.organizer.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-lg font-bold">
                      {currentEvent.organizer.name.charAt(0)}
                    </div>
                  )}
                  
                  <div>
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {currentEvent.organizer.name}
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      @{currentEvent.organizer.username}
                    </p>
                    <div className="flex space-x-2 mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                        Verified Organizer
                      </span>
                      <Link
                        to={`/events/${currentEvent.id}/updates`}
                        className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-green-900/40 text-green-300 hover:bg-green-900/60' : 'bg-green-100 text-green-700 hover:bg-green-200'} transition-colors`}
                      >
                        Live Updates
                      </Link>
                      {(user?.role === 'organizer' || user?._id === currentEvent.organizer?._id || user?.id === currentEvent.organizer?._id) && (
                        <Link
                          to={`/organizer/events/${currentEvent.id}/commission-setup`}
                          className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-indigo-900/40 text-indigo-300 hover:bg-indigo-900/60' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'} transition-colors`}
                          title="Configure commissions for this event"
                        >
                          Commission Setup
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Event Details */}
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-xl p-6 border border-gray-200 dark:border-gray-700`}>
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Event Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2 text-sm`}>Schedule</h3>
                  <div className="space-y-1 text-sm">
                    <div className={`flex justify-between ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <span>Doors Open:</span>
                      <span>{formatTime(currentEvent.startDate)}</span>
                    </div>
                    <div className={`flex justify-between ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <span>Event Ends:</span>
                      <span>{formatTime(currentEvent.endDate)}</span>
                    </div>
                  </div>
                </div>
                
                <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2 text-sm`}>Location</h3>
                  <div className="space-y-1 text-sm">
                    {currentEvent.venueName && (
                      <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        <strong>Venue:</strong> {currentEvent.venueName}
                      </p>
                    )}
                    <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <strong>City:</strong> {currentEvent.city}, {currentEvent.state}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Polls Section */}
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-xl p-6 border border-gray-200 dark:border-gray-700`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center`}>
                  <TrendingUp className={`w-5 h-5 mr-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                  Event Polls
                </h2>
                <Link
                  to={`/events/${currentEvent.id}/polls`}
                  className={`text-sm px-3 py-1 rounded-full transition-colors ${
                    isDarkMode 
                      ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-900/70' 
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  View All
                </Link>
              </div>
              
              <PollList eventId={currentEvent.id} />
            </div>
          </div>

          {/* Ticket Purchase - Sticky */}
          <div className="lg:col-span-1">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 sticky top-6`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Get Tickets</h3>
                <Ticket className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
              </div>

              {tickets.length > 0 ? (
                <>
                  <div className="space-y-3 mb-6">
                    {tickets.map((ticket) => (
                      <button
                        key={ticket.name}
                        onClick={() => setSelectedTicket(ticket)}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
                          selectedTicket?.name === ticket.name
                            ? isDarkMode 
                              ? 'border-blue-500 bg-blue-900/20' 
                              : 'border-blue-500 bg-blue-50'
                            : isDarkMode 
                              ? 'border-gray-600 hover:border-gray-500 bg-gray-700' 
                              : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{ticket.name}</span>
                          <PriceDisplay 
                            amount={ticket.price} 
                            originalCurrency="KES"
                            className="text-lg font-bold"
                          />
                        </div>
                        
                        {ticket.description && (
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>{ticket.description}</p>
                        )}
                        
                        {ticket.benefits && (
                          <div className="flex flex-wrap gap-1">
                            {ticket.benefits.map((benefit, index) => (
                              <span 
                                key={index}
                                className={`text-xs px-2 py-1 rounded-full ${
                                  isDarkMode 
                                    ? 'bg-blue-900/50 text-blue-300' 
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {benefit}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {selectedTicket && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Quantity</label>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors ${
                              isDarkMode 
                                ? 'border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-300' 
                                : 'border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-600'
                            }`}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                            className={`w-16 text-center text-sm rounded-xl border ${
                              isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-white' 
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          />
                          <button
                            onClick={() => setQuantity(Math.min(10, quantity + 1))}
                            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors ${
                              isDarkMode 
                                ? 'border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-300' 
                                : 'border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-600'
                            }`}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Price per ticket:</span>
                          <PriceDisplay 
                            amount={selectedTicket.price} 
                            originalCurrency="KES"
                            className="font-semibold"
                          />
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Quantity:</span>
                          <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{quantity}</span>
                        </div>
                        <div className="border-t border-gray-300 dark:border-gray-600 pt-2 flex justify-between font-semibold">
                          <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>Total:</span>
                          <PriceDisplay 
                            amount={(selectedTicket.price || 0) * quantity} 
                            originalCurrency="KES"
                            className="text-lg"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleAddToCart}
                        disabled={addingToCart}
                        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-3 px-4 rounded-2xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {addingToCart ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                            Adding to Cart...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Add to Cart
                          </>
                        )}
                      </button>

            <div className="flex space-x-2">
                        <button
                          onClick={() => navigate('/checkout')}
                          className={`flex-1 py-2 px-4 rounded-2xl font-medium transition-colors ${
                            isDarkMode 
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          View Cart
                        </button>
                        <button
                          onClick={() => navigate('/checkout')}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-2xl font-medium transition-colors"
                        >
                          Checkout
                        </button>
                      </div>

            {/* Quick Reminder Toggle */}
            <div className="flex items-center justify-between mt-3">
              <label className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-sm`}>
                <input type="checkbox" className="mr-2" checked={remindersEnabled} onChange={e => handleQuickReminderToggle(e.target.checked)} /> Reminders
              </label>
              <select
                value={reminderMethod}
                onChange={e => setReminderMethod(e.target.value)}
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

                      <p className={`text-xs text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        🛒 Secure checkout with MPESA
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Ticket className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Tickets coming soon</p>
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

