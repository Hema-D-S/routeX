const express = require('express');
const axios = require('axios');
const router = express.Router();

// Service health check aggregator
router.get('/health/all', async (req, res) => {
  const services = [
    { name: 'api-gateway', url: 'http://api-gateway:3000/health' },
    { name: 'user-service', url: 'http://user-service:3001/health' },
    { name: 'ride-service', url: 'http://ride-service:3002/health' },
    { name: 'notification-service', url: 'http://notification-service:3003/health' }
  ];

  const results = await Promise.all(
    services.map(async (service) => {
      try {
        const response = await axios.get(service.url, { timeout: 5000 });
        return {
          name: service.name,
          status: 'healthy',
          responseTime: response.headers['x-response-time'] || 'N/A'
        };
      } catch (error) {
        return {
          name: service.name,
          status: 'unhealthy',
          error: error.message
        };
      }
    })
  );

  const allHealthy = results.every(r => r.status === 'healthy');
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    services: results,
    timestamp: new Date().toISOString()
  });
});

// API info endpoint
router.get('/info', (req, res) => {
  res.json({
    name: 'Uber Clone API',
    version: '1.0.0',
    description: 'Microservices-based ride-sharing platform',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      rides: '/api/v1/rides',
      notifications: '/api/v1/notifications'
    }
  });
});

module.exports = router;
