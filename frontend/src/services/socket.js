import { io } from 'socket.io-client'

class SocketService {
  constructor() {
    this.socket = null
  }

  connect() {
    if (this.socket?.connected) return

    this.socket = io('http://localhost:3002', {
      transports: ['websocket', 'polling']
    })

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id)
    })

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  // Join as rider
  joinAsRider(userId) {
    this.socket?.emit('join-rider', userId)
  }

  // Join as driver
  joinAsDriver(driverId) {
    this.socket?.emit('join-driver', driverId)
  }

  // Driver goes offline
  goOffline(driverId) {
    this.socket?.emit('driver-offline', driverId)
  }

  // Join specific ride room
  joinRide(rideId) {
    this.socket?.emit('join-ride', rideId)
  }

  // Leave ride room
  leaveRide(rideId) {
    this.socket?.emit('leave-ride', rideId)
  }

  // Update driver location
  updateLocation(data) {
    console.log('📤 Sending location update:', data);
    this.socket?.emit('driver-location-update', data)
  }

  // Accept a ride
  acceptRide(rideId) {
    this.socket?.emit('accept-ride', rideId)
  }

  // Update ride status
  updateRideStatus(rideId, status) {
    this.socket?.emit('update-ride-status', { rideId, status })
  }

  // Listen for events
  on(event, callback) {
    this.socket?.on(event, callback)
  }

  // Remove listener
  off(event, callback) {
    this.socket?.off(event, callback)
  }

  // Ride-specific event listeners
  onRideAccepted(callback) {
    this.socket?.on('ride-accepted', callback)
  }

  onLocationUpdate(callback) {
    this.socket?.on('driver-location', callback)
  }

  onRideStatusUpdate(callback) {
    this.socket?.on('ride-status-updated', callback)
  }

  onNewRideRequest(callback) {
    this.socket?.on('new-ride-request', callback)
  }

  onRideRequest(callback) {
    this.socket?.on('new-ride-request', callback)
  }

  // Remove ride-specific listeners
  offRideAccepted(callback) {
    this.socket?.off('ride-accepted', callback)
  }

  offLocationUpdate(callback) {
    this.socket?.off('driver-location', callback)
  }

  offRideStatusUpdate(callback) {
    this.socket?.off('ride-status-updated', callback)
  }

  offNewRideRequest(callback) {
    this.socket?.off('new-ride-request', callback)
  }

  offRideRequest(callback) {
    this.socket?.off('new-ride-request', callback)
  }
}

// Named export for consistency
export const socketService = new SocketService()
export default socketService
