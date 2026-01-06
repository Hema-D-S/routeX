import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { socketService } from '../services/socket'
import api from '../services/api'
import Map from '../components/Map'
import { MapPin, Phone, MessageSquare, Star, Clock, Car, Navigation, X } from 'lucide-react'
import toast from 'react-hot-toast'

const ActiveRide = () => {
  const { rideId } = useParams()
  const navigate = useNavigate()
  const [ride, setRide] = useState(null)
  const [loading, setLoading] = useState(true)
  const [driverLocation, setDriverLocation] = useState(null)
  const [showRating, setShowRating] = useState(false)
  const [rating, setRating] = useState(5)

  useEffect(() => {
    fetchRide()
    
    // Connect to socket for real-time updates
    socketService.connect()
    socketService.joinRide(rideId)

    // Listen for ride updates
    socketService.onRideAccepted((data) => {
      if (data.ride._id === rideId) {
        setRide(data.ride)
        toast.success('Driver found!')
      }
    })

    socketService.onLocationUpdate((data) => {
      console.log('📍 Driver location update received:', data)
      // Extract the actual location coordinates from the socket event data
      const locationCoords = data.location || data;
      console.log('📌 Setting driver location to:', locationCoords);
      setDriverLocation(locationCoords)
    })

    socketService.onRideStatusUpdate((data) => {
      if (data.rideId === rideId) {
        setRide(prev => ({ ...prev, status: data.status }))
        
        if (data.status === 'arrived') {
          toast.success('Driver has arrived!')
        } else if (data.status === 'in_progress') {
          toast('Ride started! Enjoy your trip 🚗')
        } else if (data.status === 'completed') {
          setShowRating(true)
        }
      }
    })

    return () => {
      socketService.leaveRide(rideId)
    }
  }, [rideId])

  const fetchRide = async () => {
    try {
      const { data } = await api.get(`/rides/${rideId}`)
      setRide(data.ride)
      
      if (data.ride.status === 'completed' || data.ride.status === 'cancelled') {
        if (data.ride.status === 'completed' && !data.ride.rating?.fromRider) {
          setShowRating(true)
        }
      }
    } catch (error) {
      toast.error('Ride not found')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const cancelRide = async () => {
    if (!window.confirm('Are you sure you want to cancel this ride?')) return
    
    try {
      await api.post(`/rides/${rideId}/cancel`)
      toast.success('Ride cancelled')
      navigate('/')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to cancel ride')
    }
  }

  const submitRating = async () => {
    try {
      console.log('Submitting rating:', { rideId, rating, role: 'rider' });
      await api.post(`/rides/${rideId}/rate`, { rating, role: 'rider' })
      toast.success('Thanks for rating!')
      navigate('/')
    } catch (error) {
      console.error('Rating error:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to submit rating')
    }
  }

  const getStatusInfo = (status) => {
    const statusMap = {
      'requested': { text: 'Looking for driver...', color: 'bg-yellow-500', animate: true },
      'accepted': { text: '✅ Driver Accepted! On the way', color: 'bg-green-500', animate: false },
      'arriving': { text: '📍 Driver arriving soon', color: 'bg-blue-500', animate: true },
      'arrived': { text: '🚗 Driver has arrived', color: 'bg-green-500', animate: true },
      'in_progress': { text: '🚗 On your way', color: 'bg-purple-500', animate: false },
      'completed': { text: '✨ Ride completed', color: 'bg-green-500', animate: false },
      'cancelled': { text: '❌ Ride cancelled', color: 'bg-red-500', animate: false }
    }
    return statusMap[status] || { text: status, color: 'bg-gray-500', animate: false }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    )
  }

  if (!ride) return null

  const statusInfo = getStatusInfo(ride.status)

  return (
    <div className="pb-20">
      {/* Rating Modal */}
      {showRating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h2 className="text-xl font-bold text-center mb-4">Rate your ride</h2>
            
            {ride.driver && (
              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-xl">
                  👤
                </div>
                <div>
                  <p className="font-semibold">
                    {ride.driver.firstName} {ride.driver.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{ride.driver.vehicle?.model}</p>
                </div>
              </div>
            )}
            
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-3xl transition-transform hover:scale-110 ${
                    star <= rating ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            
            <button
              onClick={submitRating}
              className="w-full btn-primary"
            >
              Submit Rating
            </button>
          </div>
        </div>
      )}

      {/* Looking for Driver Message */}
      {ride.status === 'requested' && (
        <div className="bg-yellow-50 rounded-2xl p-6 mb-4 border-2 border-yellow-200 text-center">
          <div className="flex justify-center mb-3">
            <div className="animate-spin">🔍</div>
          </div>
          <h3 className="font-semibold text-lg mb-2">Finding a Driver...</h3>
          <p className="text-sm text-gray-600">
            We're searching for the best driver for you. This usually takes 10-30 seconds.
          </p>
          <div className="flex gap-1 justify-center mt-3">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      )}

      {/* Live Map */}
      <div className="relative h-64 rounded-2xl mb-4 overflow-hidden">
        <Map
          pickup={ride.pickup?.coordinates ? {
            lat: ride.pickup.coordinates.coordinates[1],
            lng: ride.pickup.coordinates.coordinates[0]
          } : null}
          dropoff={ride.dropoff?.coordinates ? {
            lat: ride.dropoff.coordinates.coordinates[1],
            lng: ride.dropoff.coordinates.coordinates[0]
          } : null}
          driverLocation={driverLocation}
          showRoute={true}
        />
      </div>

      {/* Status Bar */}
      <div className={`${statusInfo.color} text-white rounded-xl p-4 mb-4`}>
        <div className="flex items-center gap-3">
          {statusInfo.animate && (
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          )}
          <span className="font-semibold">{statusInfo.text}</span>
        </div>
      </div>

      {/* Driver Info (if assigned) */}
      {ride.driver && ride.status !== 'requested' && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-4 mb-4 border-2 border-green-200">
          {ride.status === 'accepted' && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded-lg mb-4 text-center font-semibold">
              ✅ Driver Accepted Your Request!
            </div>
          )}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-2xl">
              👤
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">
                {ride.driver.firstName} {ride.driver.lastName}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span>{ride.driver.rating?.toFixed(1) || '5.0'}</span>
                <span>•</span>
                <span>{ride.driver.vehicle?.model}</span>
              </div>
              <p className="text-sm font-semibold mt-1">
                {ride.driver.vehicle?.licensePlate}
              </p>
            </div>
          </div>

          {/* Contact Buttons */}
          <div className="flex gap-3 mt-4">
            <a
              href={`tel:${ride.driver.phone}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition"
            >
              <Phone className="h-5 w-5" />
              Call
            </a>
            <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition">
              <MessageSquare className="h-5 w-5" />
              Message
            </button>
          </div>
        </div>
      )}

      {/* Ride Details */}
      <div className="bg-white rounded-2xl p-4 mb-4">
        <div className="space-y-4">
          {/* Pickup */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
              <MapPin className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pickup</p>
              <p className="font-medium">{ride.pickup?.address}</p>
            </div>
          </div>

          {/* Dotted line */}
          <div className="ml-4 border-l-2 border-dashed border-gray-200 h-4"></div>

          {/* Dropoff */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mt-1">
              <MapPin className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Dropoff</p>
              <p className="font-medium">{ride.dropoff?.address}</p>
            </div>
          </div>
        </div>

        {/* Fare and Duration */}
        <div className="mt-4 pt-4 border-t space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Estimated fare</span>
            <span className="text-2xl font-bold">Rs. {ride.fare?.totalFare?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Distance</span>
            <span className="text-lg font-semibold">{ride.distance?.toFixed(1) || '0'} km</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Est. Time</span>
            <span className="text-lg font-semibold">{ride.duration || '0'} min</span>
          </div>
        </div>
      </div>

      {/* Cancel Button (only if ride not started) */}
      {['requested', 'accepted', 'arrived'].includes(ride.status) && (
        <button
          onClick={cancelRide}
          className="w-full py-3 bg-red-100 text-red-600 rounded-xl font-semibold flex items-center justify-center gap-2"
        >
          <X className="h-5 w-5" />
          Cancel Ride
        </button>
      )}
    </div>
  )
}

export default ActiveRide
