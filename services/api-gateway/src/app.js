const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { createProxyMiddleware } = require("http-proxy-middleware");
// dotenv removed - using Docker env vars

const authMiddleware = require("./middleware/auth");
const rateLimiter = require("./middleware/rateLimiter");
const metricsMiddleware = require("./middleware/metrics");
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// Metrics middleware
app.use(metricsMiddleware);

// Rate limiting
app.use(rateLimiter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "api-gateway",
    timestamp: new Date().toISOString(),
  });
});

// Metrics endpoint for Prometheus
app.get("/metrics", async (req, res) => {
  const { register } = require("./middleware/metrics");
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// Service proxies
const serviceProxy = (target, pathPrefix) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    timeout: 30000,
    proxyTimeout: 30000,
    pathRewrite: {
      [`^/api/v1/${pathPrefix}`]: `/${pathPrefix}`,
    },
    onError: (err, req, res) => {
      console.error("Proxy error:", err);
      res.status(502).json({ error: "Service unavailable" });
    },
    onProxyReq: (proxyReq, req, res) => {
      // If we have a body, we need to restream it
      if (req.body && Object.keys(req.body).length > 0) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader("Content-Type", "application/json");
        proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
  });

// Public routes (no auth required)
app.use("/api/v1/auth", serviceProxy("http://user-service:3001", "auth"));

// Protected routes (auth required)
app.use(
  "/api/v1/users",
  authMiddleware,
  serviceProxy("http://user-service:3001", "users")
);
app.use(
  "/api/v1/rides",
  authMiddleware,
  serviceProxy("http://ride-service:3002", "rides")
);
app.use(
  "/api/v1/notifications",
  authMiddleware,
  serviceProxy("http://notification-service:3003", "notifications")
);

// API routes
app.use("/api", routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
});

module.exports = app;
