# 🎉 Event-i: Web3 Event Management Platform

A modern, blockchain-ready event management platform built with React, Node.js, and MongoDB. Event-i provides a seamless experience for discovering, managing, and purchasing tickets for events with a focus on Web3 integration.

## ✨ Features

### 🔐 **M1: Authentication & Role Management**
- **Secure Authentication**: JWT-based authentication system
- **Role-Based Access**: Customer, Organizer, and Admin roles
- **Protected Routes**: Middleware-based access control
- **Session Management**: Persistent login with secure token storage

### 🌐 **M2: Event Discovery & Search**
- **Advanced Search**: Multi-criteria event filtering
- **Smart Recommendations**: Personalized event suggestions
- **Infinite Scroll**: Seamless pagination for large event catalogs
- **Category System**: Organized event classification
- **Trending Events**: Featured and popular event highlighting

### 🎫 **M3: Full Event Display & Ticket Purchase**
- **Rich Event Details**: Comprehensive event information display
- **Organizer Profiles**: Detailed organizer information and verification
- **Ticket Management**: Multiple ticket types with benefits
- **Purchase Flow**: Streamlined ticket buying experience
- **Web3 Ready**: Blockchain-ready interface for future integrations

## 🚀 Tech Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **Redux Toolkit** - State management with async thunks
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations and transitions
- **React Router** - Client-side routing

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Redis** - Caching and session storage
- **JWT** - JSON Web Token authentication

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Reverse proxy (production)

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │   Database      │
│   (React)       │◄──►│   (Express.js)   │◄──►│   (MongoDB)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Redux Store   │    │   JWT Middleware │    │   User Schema   │
│   (State Mgmt)  │    │   (Route Guard)  │    │   (Roles)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for development)
- MongoDB (handled by Docker)

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd MVPEVENT_i
```

### 2. Environment Setup
```bash
cp env.example .env
# Edit .env with your configuration
```

### 3. Start the Application
```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **MongoDB**: localhost:27017
- **Redis**: localhost:6380

## 📁 Project Structure

```
MVPEVENT_i/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── store/         # Redux store and slices
│   │   └── utils/         # Utility functions
│   └── package.json
├── server/                 # Node.js backend
│   ├── routes/            # API route handlers
│   ├── models/            # Database models
│   ├── middleware/        # Custom middleware
│   └── config/            # Configuration files
├── docker-compose.yml     # Development environment
├── docker-compose.prod.yml # Production environment
└── README.md
```

## 🔧 Development

### Frontend Development
```bash
cd client
npm install
npm run dev
```

### Backend Development
```bash
cd server
npm install
npm run dev
```

### Database Management
```bash
# Access MongoDB shell
docker compose exec mongodb mongosh

# View MongoDB data
docker compose exec mongo-express open http://localhost:8081
```

## 🧪 Testing

### API Testing
```bash
# Test backend health
curl http://localhost:5000/api/health

# Test events endpoint
curl http://localhost:5000/api/events
```

### Frontend Testing
```bash
cd client
npm test
```

## 🚀 Deployment

### Production Build
```bash
# Build frontend
cd client
npm run build

# Start production services
docker compose -f docker-compose.prod.yml up -d
```

### Environment Variables
```bash
# Production environment
NODE_ENV=production
MONGODB_URI=mongodb://your-mongo-uri
JWT_SECRET=your-jwt-secret
REDIS_URL=redis://your-redis-uri
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Events
- `GET /api/events` - List events with filters
- `GET /api/events/:slug` - Get event details
- `GET /api/events/:slug/tickets` - Get event tickets
- `POST /api/events/:slug/purchase` - Purchase tickets

### Categories
- `GET /api/events/categories` - List event categories

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🎯 Roadmap

### Phase 1 (Completed ✅)
- [x] M1: Authentication & Role Management
- [x] M2: Event Discovery & Search
- [x] M3: Full Event Display & Ticket Purchase

### Phase 2 (Planned 🚧)
- [ ] Web3 Wallet Integration
- [ ] NFT Ticket System
- [ ] Smart Contract Integration
- [ ] DeFi Payment Options

### Phase 3 (Future 🔮)
- [ ] AI-Powered Recommendations
- [ ] Social Features
- [ ] Analytics Dashboard
- [ ] Mobile Applications

---

**Built with ❤️ by the Event-i Team** 