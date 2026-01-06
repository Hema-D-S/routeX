module.exports = (io) => {
  // Store connected users
  const connectedUsers = new Map();
  const connectedDrivers = new Map();

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // User joins their personal room
    socket.on('join-rider', (userId) => {
      socket.join(`rider-${userId}`);
      connectedUsers.set(userId, socket.id);
      console.log(`Rider ${userId} joined`);
    });

    // Driver joins and becomes available
    socket.on('join-driver', (driverId) => {
      socket.join('available-drivers');
      socket.join(`driver-${driverId}`);
      connectedDrivers.set(driverId, socket.id);
      console.log(`Driver ${driverId} joined`);
    });

    // Driver goes offline
    socket.on('driver-offline', (driverId) => {
      socket.leave('available-drivers');
      connectedDrivers.delete(driverId);
      console.log(`Driver ${driverId} went offline`);
    });

    // Join specific ride room for updates
    socket.on('join-ride', (rideId) => {
      socket.join(`ride-${rideId}`);
      console.log(`Socket ${socket.id} joined ride ${rideId}`);
    });

    // Leave ride room
    socket.on('leave-ride', (rideId) => {
      socket.leave(`ride-${rideId}`);
      console.log(`Socket ${socket.id} left ride ${rideId}`);
    });

    // Driver location update
    socket.on('driver-location-update', (data) => {
      const { rideId, driverId, location } = data;
      console.log('📍 Driver location update received:', { driverId, rideId, location });
      
      // Only broadcast to ride room if driver has an active ride
      if (rideId) {
        console.log(`📡 Broadcasting location to ride-${rideId}`);
        io.to(`ride-${rideId}`).emit('driver-location', {
          driverId,
          location,
          timestamp: new Date()
        });
      } else {
        console.log('⚠️ No rideId provided - driver location not broadcast (waiting for ride acceptance)');
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      
      // Remove from maps
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          break;
        }
      }
      
      for (const [driverId, socketId] of connectedDrivers.entries()) {
        if (socketId === socket.id) {
          connectedDrivers.delete(driverId);
          break;
        }
      }
    });
  });

  // Utility functions to emit events
  return {
    notifyRider: (riderId, event, data) => {
      io.to(`rider-${riderId}`).emit(event, data);
    },
    notifyDriver: (driverId, event, data) => {
      io.to(`driver-${driverId}`).emit(event, data);
    },
    notifyRide: (rideId, event, data) => {
      io.to(`ride-${rideId}`).emit(event, data);
    },
    broadcastToDrivers: (event, data) => {
      io.to('available-drivers').emit(event, data);
    },
    getConnectedDrivers: () => connectedDrivers,
    getConnectedUsers: () => connectedUsers
  };
};
