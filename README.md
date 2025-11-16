# Event-i: Event Management Platform

A production-ready event management platform with real-time features, payment integration, and comprehensive analytics.

## 🚀 Quick Start

### Prerequisites

- **Docker** 24+ and Docker Compose 2.20+
- **Node.js** 18+ and npm 9+ (for local development)
- **Git** 2.40+

### Development Setup

```bash
# 1. Clone repository
git clone https://github.com/your-username/MVPEVENT_i.git
cd MVPEVENT_i

# 2. Set up environment
cp env.example .env
# Edit .env with your configuration

# 3. Start all services
docker-compose up -d

# 4. Initialize database (first time only)
docker-compose exec server npm run seed

# 5. Access application
# Frontend: http://localhost:3001
# Backend: http://localhost:5001
```

### Local Development (Alternative)

```bash
# 1. Clone and setup environment
git clone https://github.com/your-username/MVPEVENT_i.git
cd MVPEVENT_i
cp env.example .env

# 2. Install dependencies
cd server && npm install
cd ../client && npm install

# 3. Start databases
docker-compose up -d mongodb redis

# 4. Initialize database
cd server && npm run seed

# 5. Start development servers
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend  
cd client && npm run dev

# 6. Access
# Frontend: http://localhost:3001
# Backend: http://localhost:5001
```

## 🏗️ Production Deployment

### Prerequisites

- Production server with Docker installed
- Domain name configured (e.g., `event-i.co.ke`)
- SSL certificate (Let's Encrypt recommended)

### Deployment Steps

```bash
# 1. Clone repository
git clone https://github.com/your-username/MVPEVENT_i.git
cd MVPEVENT_i

# 2. Configure production environment
cp env.production.example .env.production
# Edit .env.production with your production values

# 3. Deploy to production
./deploy-production.sh

# 4. When prompted:
# - Create backup? (Y/n): Y
# - Clean up test data? (Y/n): Y (one-time only)
# - Run health checks? (Y/n): Y

# 5. Test email service
docker compose -f docker-compose.prod.yml exec server node scripts/test-email.js
```

### Production Configuration

**Required Environment Variables** (`.env.production`):

```bash
# Application
NODE_ENV=production
FRONTEND_URL=https://event-i.co.ke
BASE_URL=https://event-i.co.ke
SESSION_SECRET=your-express-session-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://event-i.co.ke/api/auth/google/callback
GOOGLE_STATE_SECRET=generate-a-unique-64-char-state-secret
GOOGLE_STATE_TTL_MS=300000

# Database
MONGODB_URI=mongodb://admin:password@mongodb:27017/event_i?authSource=admin
REDIS_URL=redis://redis:6379

# JWT Security
JWT_SECRET=your-super-secure-jwt-secret
JWT_REFRESH_SECRET=your-super-secure-refresh-secret

# Email Service (Brevo)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-email@example.com
SMTP_PASS=your-brevo-smtp-key
EMAIL_FROM=noreply@event-i.co.ke

# Payment Gateways
PAYHERO_API_USERNAME=your-payhero-username
PAYHERO_API_PASSWORD=your-payhero-password
PAYHERO_ACCOUNT_ID=your-payhero-account-id
PAYHERO_CHANNEL_ID=your-payhero-channel-id
PAYHERO_CALLBACK_URL=https://event-i.co.ke/api/payhero/callback
PAYHERO_SUCCESS_URL=https://event-i.co.ke/checkout/success
PAYHERO_FAILED_URL=https://event-i.co.ke/checkout/failed

# MPESA (if using)
MPESA_BASE_URL=https://api.safaricom.co.ke
MPESA_CONSUMER_KEY=your-mpesa-consumer-key
MPESA_CONSUMER_SECRET=your-mpesa-consumer-secret
MPESA_SHORTCODE=your-mpesa-shortcode
MPESA_PASSKEY=your-mpesa-passkey
MPESA_CALLBACK_URL=https://event-i.co.ke/api/orders/mpesa/callback
```

## 📧 Email Service Setup

### Brevo (Recommended - Free Tier)

1. **Sign up** at https://www.brevo.com/
2. **Navigate** to SMTP & API → SMTP settings
3. **Create** SMTP key
4. **Get credentials**:
   - Host: `smtp-relay.brevo.com`
   - Port: `587`
   - Username: (your Brevo email)
   - Password: (SMTP key from dashboard)
5. **Update** `.env.production` with credentials

### Alternative Email Services

- **Mailgun**: 5,000 emails/month free
- **SendGrid**: 100 emails/day free
- **Gmail**: 500 emails/day with App Password

## 💳 Payment Gateway Setup

### PayHero Configuration

1. **Log into** PayHero dashboard
2. **Navigate** to Channel Settings
3. **Update callback URLs**:
   - Callback URL: `https://event-i.co.ke/api/payhero/callback`
   - Success URL: `https://event-i.co.ke/checkout/success`
   - Failed URL: `https://event-i.co.ke/checkout/failed`

## 🧪 Testing

### Run Tests

```bash
# Frontend tests
cd client && npm test

# Backend tests
cd server && npm test

# Test email service
docker compose -f docker-compose.prod.yml exec server node scripts/test-email.js
```

### Health Checks

```bash
# Check API health
curl https://event-i.co.ke/api/health

# Check all services
docker compose -f docker-compose.prod.yml ps
```

## 🔧 Available Scripts

### Development

```bash
# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production

```bash
# Deploy to production
./deploy-production.sh

# View production logs
docker compose -f docker-compose.prod.yml logs -f

# Stop production
docker compose -f docker-compose.prod.yml down
```

### Database

```bash
# Initialize database
docker-compose exec server npm run seed

# Clean up test data (production only)
./cleanup-production-data.sh
```

## 📁 Project Structure

```
MVPEVENT_i/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Redux state
│   │   └── services/       # API services
│   └── package.json
├── server/                 # Node.js Backend
│   ├── routes/             # API routes
│   ├── models/             # Database models
│   ├── services/           # Business logic
│   └── package.json
├── docker-compose.yml      # Development
├── docker-compose.prod.yml # Production
├── deploy-production.sh    # Production deployment
└── env.example            # Environment template
```

## 🐛 Troubleshooting

### Common Issues

**Port Already in Use:**
```bash
# Find process using port
lsof -i :3001  # or :5001

# Kill process
kill -9 <PID>
```

**Docker Issues:**
```bash
# Remove volumes and restart
docker-compose down -v
docker-compose up --build
```

**Database Connection:**
```bash
# Check MongoDB is running
docker-compose ps mongodb

# View logs
docker-compose logs mongodb
```

**Email Service Not Working:**
```bash
# Test SMTP connection
docker compose -f docker-compose.prod.yml exec server node scripts/test-email.js

# Check environment variables
docker compose -f docker-compose.prod.yml exec server env | grep SMTP
```

## 📚 Documentation

- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference
- [Architecture](./ARCHITECTURE.md) - System design
- [Deployment Guide](./DEPLOYMENT_READY.md) - Detailed deployment instructions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Ready for Production** 🚀 | **Docker Ready** ✅ | **Tested** ✅