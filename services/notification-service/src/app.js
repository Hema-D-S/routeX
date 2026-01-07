const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
// dotenv removed - using Docker env vars

const notificationRoutes = require('./routes/notification');
const { initializeQueues } = require('./queues/notificationQueue');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Initialize notification queues
initializeQueues();

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'notification-service',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/notifications', notificationRoutes);
app.use('/', notificationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`🔔 Notification Service running on port ${PORT}`);
});

module.exports = app;
