const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
// dotenv removed - using Docker env vars

const rideRoutes = require("./routes/ride");
const socketHandler = require("./socket/socketHandler");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// Make io accessible to routes
app.set("io", io);

// Database connection
const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_RIDES_URI || "mongodb://localhost:27017/uber-clone-rides";
    await mongoose.connect(mongoURI);
    console.log("📦 MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "ride-service",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/rides", rideRoutes);
app.use("/", rideRoutes);

// Socket.io handler
socketHandler(io);

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

// Start server
const startServer = async () => {
  await connectDB();
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚗 Ride Service running on port ${PORT}`);
    console.log(`🔌 WebSocket server ready`);
  });
};

startServer();

module.exports = { app, server, io };
