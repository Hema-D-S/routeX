# Uber Clone - Microservices Architecture

A ride-sharing application built with microservices architecture using Node.js, Express, MongoDB, and React.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│                         Port: 3005                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                      API Gateway                             │
│                       Port: 3000                             │
│         (Routing, Auth, Rate Limiting, Metrics)              │
└──────┬──────────────────┬──────────────────────┬────────────┘
       │                  │                      │
┌──────▼──────┐    ┌──────▼──────┐    ┌─────────▼─────────┐
│User Service │    │Ride Service │    │Notification Service│
│  Port: 3001 │    │  Port: 3002 │    │    Port: 3003      │
│   MongoDB   │    │   MongoDB   │    │      Redis         │
└─────────────┘    └─────────────┘    └───────────────────┘
```

## 📁 Project Structure

```
uber-clone/
├── services/
│   ├── api-gateway/        # API Gateway (Port 3000)
│   ├── user-service/       # User & Auth (Port 3001)
│   ├── ride-service/       # Ride Management (Port 3002)
│   └── notification-service/ # Notifications (Port 3003)
├── frontend/               # React Application
├── infrastructure/         # Docker, Monitoring configs
├── .github/workflows/      # CI/CD pipelines
└── scripts/                # Setup & utility scripts
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas free tier)
- Redis (for notification queues)
- Docker (optional, for containerized setup)

### 1. Clone and Setup

```bash
# Navigate to project
cd uber-clone

# Copy environment files
cp services/api-gateway/.env.example services/api-gateway/.env
cp services/user-service/.env.example services/user-service/.env
cp services/ride-service/.env.example services/ride-service/.env
cp services/notification-service/.env.example services/notification-service/.env
```

### 2. Install Dependencies

```bash
# Install all services
cd services/api-gateway && npm install
cd ../user-service && npm install
cd ../ride-service && npm install
cd ../notification-service && npm install
cd ../../frontend && npm install
```

### 3. Start Services

**Option A: Run individually**
```bash
# Terminal 1 - API Gateway
cd services/api-gateway && npm run dev

# Terminal 2 - User Service
cd services/user-service && npm run dev

# Terminal 3 - Ride Service
cd services/ride-service && npm run dev

# Terminal 4 - Notification Service
cd services/notification-service && npm run dev

# Terminal 5 - Frontend
cd frontend && npm start
```

**Option B: Use Docker Compose (Phase 2)**
```bash
cd infrastructure/docker
docker-compose up
```

## 🔌 API Endpoints

### Auth (via API Gateway)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/register | Register new user |
| POST | /api/v1/auth/login | User login |
| GET | /api/v1/auth/me | Get current user |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/users/:id | Get user by ID |
| PUT | /api/v1/users/profile | Update profile |
| PUT | /api/v1/users/driver/location | Update driver location |
| GET | /api/v1/users/drivers/nearby | Get nearby drivers |

### Rides
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/rides/request | Request a new ride |
| POST | /api/v1/rides/:id/accept | Accept ride (driver) |
| PATCH | /api/v1/rides/:id/status | Update ride status |
| GET | /api/v1/rides/estimate | Get fare estimate |
| GET | /api/v1/rides/history | Get ride history |
| GET | /api/v1/rides/active | Get active rides |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/notifications/send | Send notification |
| POST | /api/v1/notifications/email | Send email |
| POST | /api/v1/notifications/sms | Send SMS |
| GET | /api/v1/notifications/stats | Get queue stats |

## 🗄️ Free Database Options

| Service | Free Tier | Link |
|---------|-----------|------|
| MongoDB Atlas | 512MB | https://www.mongodb.com/atlas |
| Supabase | 500MB | https://supabase.com |
| PlanetScale | 5GB | https://planetscale.com |
| Redis Cloud | 30MB | https://redis.com/try-free |

## 🧪 Testing

```bash
# Run tests for a service
cd services/user-service
npm test

# Run with coverage
npm run test -- --coverage
```

## 📊 Monitoring (Phase 2)

- **Prometheus**: Metrics collection (http://localhost:9090)
- **Grafana**: Dashboards (http://localhost:3030)
- **Health Check**: GET /health on each service

## 🔐 Environment Variables

Each service has its own `.env.example` file. Key variables:

| Variable | Service | Description |
|----------|---------|-------------|
| JWT_SECRET | All | JWT signing secret |
| MONGODB_URI | User, Ride | MongoDB connection string |
| REDIS_HOST | Notification | Redis host |

## 📝 License

MIT License
