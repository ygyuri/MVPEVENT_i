import { Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Events from './pages/Events'
import Notification from './components/Notification'
import EventDetails from './pages/EventDetails'

function App() {
  const [notifications, setNotifications] = useState([])
  const { user, isAuthenticated } = useSelector(state => state.auth)

  // Show welcome message for new users
  useEffect(() => {
    if (isAuthenticated && user) {
      const isNewUser = localStorage.getItem(`welcome_shown_${user.id}`)
      if (!isNewUser) {
        setNotifications(prev => [...prev, {
          id: Date.now(),
          message: `🎉 Welcome to Event-i, ${user.firstName || user.username}! We're excited to have you join our community. Start exploring events and discover amazing experiences!`,
          type: 'success',
          duration: 8000
        }])
        localStorage.setItem(`welcome_shown_${user.id}`, 'true')
      }
    }
  }, [isAuthenticated, user])

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Notifications */}
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onClose={() => removeNotification(notification.id)}
        />
      ))}

      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:slug" element={<EventDetails />} />
        </Routes>
      </main>
    </div>
  )
}

export default App 