import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import Checkout from './pages/Checkout';

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <Router>
          <div className="min-h-screen bg-web3-primary theme-transition">
            <Navbar />
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/events" element={<Events />} />
                <Route path="/events/:slug" element={<EventDetails />} />
                <Route path="/checkout" element={<Checkout />} />
              </Routes>
            </main>
          </div>
        </Router>
      </ThemeProvider>
    </Provider>
  );
}

export default App; 