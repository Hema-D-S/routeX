import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { socketService } from '../services/socket'
import api from '../services/api'
import Map from '../components/Map'
import { 
  Power, MapPin, DollarSign, Clock, Star, Navigation, Check, X, 
  User, Phone, MessageSquare, TrendingUp, Calendar, ChevronRight,
  Car, Wallet, History, Settings, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

const DriverDashboard = () => {
  const { user } = useAuth()
  const [isOnline, setIsOnline] = useState(false)
  const [currentRide, setCurrentRide] = useState(null)
  const [incomingRequest, setIncomingRequest] = useState(null)
  const [driverLocation, setDriverLocation] = useState(null)
  const [countdown, setCountdown] = useState(30)
  const countdownRef = useRef(null)
  const currentRideRef = useRef(null) // Ref to track current ride in callbacks
  const [activeTab, setActiveTab] = useState('home') // home, history, earnings, profile
  const [loading, setLoading] = useState(false)
  const [rideHistory, setRideHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  
  const [stats, setStats] = useState({
    todayEarnings: 0,
    todayRides: 0,
    weeklyEarnings: 0,
    weeklyRides: 0,
    rating: 5.0,
    totalRides: 0,
    acceptanceRate: 100
  })

  // Vehicle info state for editing
  const [editingVehicle, setEditingVehicle] = useState(false)
  const [vehicleInfo, setVehicleInfo] = useState({
    vehicleModel: '',
    vehicleNumber: '',
    vehicleType: 'standard',
    licenseNumber: ''
  })

  // Update vehicle info when user changes
  useEffect(() => {
    if (user?.driverInfo) {
      setVehicleInfo({
        vehicleModel: user.driverInfo.vehicleModel || '',
        vehicleNumber: user.driverInfo.vehicleNumber || '',
        vehicleType: user.driverInfo.vehicleType || 'standard',
        licenseNumber: user.driverInfo.licenseNumber || ''
      })
    }
  }, [user])

  // Update the ref whenever currentRide changes
  useEffect(() => {
    currentRideRef.current = currentRide
    console.log('💾 Updated currentRide ref:', currentRide?._id || 'None');
  }, [currentRide])

  // Get driver status
  const getDriverStatus = () => {
    if (!isOnline) return { text: 'Offline', color: 'bg-gray-500', icon: '⚫' }
    if (currentRide) {
      if (currentRide.status === 'in_progress') return { text: 'On Trip', color: 'bg-blue-500', icon: '🚗' }
      return { text: 'Busy', color: 'bg-yellow-500', icon: '📍' }
    }
    return { text: 'Available', color: 'bg-green-500', icon: '🟢' }
  }

  // Countdown timer for incoming requests
  useEffect(() => {
    if (incomingRequest) {
      setCountdown(30)
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current)
            setIncomingRequest(null)
            toast('Ride request expired')
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(countdownRef.current)
    }
  }, [incomingRequest])

  // Connect to socket and listen for ride requests
  useEffect(() => {
    if (isOnline) {
      socketService.connect()
      socketService.joinAsDriver(user._id)

      socketService.onRideRequest((ride) => {
        console.log('New ride request:', ride)
        setIncomingRequest(ride)
        try {
          new Audio('/notification.mp3').play()
        } catch (e) {}
      })

      socketService.onRideAccepted((data) => {
        if (data.ride?.driver?._id === user._id) {
          setCurrentRide(data.ride)
          setIncomingRequest(null)
        }
      })

      socketService.onRideStatusUpdate((data) => {
        if (currentRide && data.rideId === currentRide._id) {
          setCurrentRide(prev => ({ ...prev, status: data.status }))
          if (data.status === 'completed') {
            toast.success('Ride completed! Payment received')
            fetchStats()
            fetchRideHistory()
            setTimeout(() => setCurrentRide(null), 2000)
          }
        }
      })

      // Watch driver location
      if (navigator.geolocation) {
        console.log('🔍 Starting geolocation watch...');
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            const loc = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
            console.log('✅ Driver location updated:', loc)
            console.log('📍 Latitude:', position.coords.latitude, 'Longitude:', position.coords.longitude)
            setDriverLocation(loc)
            toast.success('Location updated: ' + position.coords.latitude.toFixed(4) + ', ' + position.coords.longitude.toFixed(4))
            // Send location to server with ride info if available
            console.log('📤 Attempting to send location, isOnline:', isOnline, 'currentRide:', currentRideRef.current?._id);
            socketService.updateLocation({
              driverId: user._id,
              rideId: currentRideRef.current?._id, // Use ref instead of state
              location: loc
            })
          },
          (error) => {
            console.error('❌ Location error code:', error.code, 'Message:', error.message)
            if (error.code === 1) {
              toast.error('Location permission denied. Check browser settings → Privacy → Location')
            } else if (error.code === 2) {
              toast.error('Location unavailable. Ensure GPS is enabled.')
            } else if (error.code === 3) {
              toast.error('Location request timeout. Please try again.')
            } else {
              toast.error('Geolocation error: ' + error.message)
            }
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        )
        return () => navigator.geolocation.clearWatch(watchId)
      } else {
        toast.error('Geolocation not supported by your browser')
      }
    } else {
      socketService.disconnect()
    }

    return () => socketService.disconnect()
  }, [isOnline, user])

  // Fetch stats and check active ride
  useEffect(() => {
    fetchStats()
    checkActiveRide()
    fetchRideHistory()
  }, [])

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/rides/driver-stats')
      setStats(prev => ({ ...prev, ...data }))
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchRideHistory = async () => {
    setHistoryLoading(true)
    try {
      const { data } = await api.get('/rides/history?role=driver&limit=20')
      setRideHistory(data.rides || [])
    } catch (error) {
      console.error('Failed to fetch ride history:', error)
      setRideHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const checkActiveRide = async () => {
    try {
      const { data } = await api.get('/rides/active')
      if (data.ride) {
        setCurrentRide(data.ride)
        setIsOnline(true)
      }
    } catch (error) {}
  }

  const toggleOnline = async () => {
    setLoading(true)
    try {
      if (!isOnline) {
        await api.patch('/users/availability', { isAvailable: true })
        setIsOnline(true)
        toast.success('You are now online!')
      } else {
        await api.patch('/users/availability', { isAvailable: false })
        setIsOnline(false)
        toast.success('You are now offline')
      }
    } catch (error) {
      toast.error('Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  const saveVehicleInfo = async () => {
    setLoading(true)
    try {
      const { data } = await api.put('/users/driver/info', vehicleInfo)
      toast.success('Vehicle information updated!')
      setEditingVehicle(false)
      // Update user in context
      updateUser({ driverInfo: vehicleInfo })
    } catch (error) {
      toast.error('Failed to update vehicle info')
    } finally {
      setLoading(false)
    }
  }

  const acceptRide = async () => {
    if (!incomingRequest) return
    clearInterval(countdownRef.current)
    
    setLoading(true)
    try {
      const { data } = await api.post(`/rides/${incomingRequest._id}/accept`)
      setCurrentRide(data.ride)
      setIncomingRequest(null)
      toast.success('Ride accepted!')
      socketService.acceptRide(incomingRequest._id)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to accept ride')
    } finally {
      setLoading(false)
    }
  }

  const rejectRide = () => {
    clearInterval(countdownRef.current)
    setIncomingRequest(null)
    toast('Ride declined')
  }

  const updateRideStatus = async (status) => {
    if (!currentRide) return
    
    setLoading(true)
    try {
      const { data } = await api.patch(`/rides/${currentRide._id}/status`, { status })
      
      if (status === 'completed') {
        setCurrentRide(null)
        toast.success('Ride completed! 🎉')
        fetchStats()
        fetchRideHistory()
      } else {
        setCurrentRide(data.ride)
        socketService.updateRideStatus(currentRide._id, status)
      }
    } catch (error) {
      toast.error('Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  const openNavigation = (coordinates) => {
    if (!coordinates) return
    const { lat, lng } = coordinates.coordinates 
      ? { lat: coordinates.coordinates[1], lng: coordinates.coordinates[0] }
      : coordinates
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank')
  }

  // Manual location fetch function
  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    
    console.log('🔍 Manually fetching current location...');
    toast.loading('Getting your location...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        console.log('✅ Location fetched:', loc);
        setDriverLocation(loc);
        toast.success(`Location: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`);
        
        // Send to server
        socketService.updateLocation({
          driverId: user._id,
          rideId: currentRideRef.current?._id,
          location: loc
        });
      },
      (error) => {
        console.error('❌ Location fetch error:', error);
        if (error.code === 1) {
          toast.error('Location permission denied in browser settings');
        } else if (error.code === 2) {
          toast.error('Location service unavailable');
        } else if (error.code === 3) {
          toast.error('Location request timeout');
        } else {
          toast.error('Could not get location: ' + error.message);
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const driverStatus = getDriverStatus()

  // Calculate distance to pickup (mock calculation)
  const getDistanceToPickup = (pickup) => {
    if (!driverLocation || !pickup?.coordinates) return '2.3'
    // In production, use actual distance calculation
    return (Math.random() * 3 + 0.5).toFixed(1)
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // ==================== RENDER TABS ====================

  const renderHomeTab = () => (
    <div className="space-y-4">
      {/* Live Map with Driver Location */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
        <div className="h-48 relative">
          <Map
            driverLocation={driverLocation}
            pickup={currentRide?.pickup?.coordinates ? {
              lat: currentRide.pickup.coordinates.coordinates?.[1] || currentRide.pickup.coordinates.lat,
              lng: currentRide.pickup.coordinates.coordinates?.[0] || currentRide.pickup.coordinates.lng
            } : null}
            dropoff={currentRide?.dropoff?.coordinates ? {
              lat: currentRide.dropoff.coordinates.coordinates?.[1] || currentRide.dropoff.coordinates.lat,
              lng: currentRide.dropoff.coordinates.coordinates?.[0] || currentRide.dropoff.coordinates.lng
            } : null}
            center={driverLocation ? [driverLocation.lat, driverLocation.lng] : null}
            showRoute={!!currentRide}
          />
          {driverLocation && (
            <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs">
              📍 {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
            </div>
          )}
          <button
            onClick={fetchCurrentLocation}
            className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg shadow-md"
            title="Fetch current location manually"
          >
            <Navigation size={18} />
          </button>
        </div>
      </div>

      {/* Incoming Ride Request with Countdown */}
      {incomingRequest && (
        <div className="bg-white rounded-2xl p-5 shadow-lg border-2 border-green-500 relative overflow-hidden">
          {/* Countdown Timer */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200">
            <div 
              className="h-full bg-green-500 transition-all duration-1000"
              style={{ width: `${(countdown / 30) * 100}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              🚗 New Ride Request!
            </h2>
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                countdown <= 10 ? 'bg-red-500 animate-pulse' : 'bg-green-500'
              }`}>
                {countdown}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <Navigation className="h-5 w-5 mx-auto mb-1 text-blue-600" />
              <p className="text-lg font-bold text-blue-600">{getDistanceToPickup(incomingRequest.pickup)} km</p>
              <p className="text-xs text-gray-500">To Pickup</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-600" />
              <p className="text-lg font-bold text-green-600">Rs. {(incomingRequest.fare || 0).toFixed(2)}</p>
              <p className="text-xs text-gray-500">Est. Fare</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-purple-600" />
              <p className="text-lg font-bold text-purple-600">{incomingRequest.duration || '15'} min</p>
              <p className="text-xs text-gray-500">Est. Time</p>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">PICKUP</p>
                <p className="font-medium text-sm">{incomingRequest.pickup?.address || 'Unknown location'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">DROPOFF</p>
                <p className="font-medium text-sm">{incomingRequest.dropoff?.address || 'Unknown location'}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={rejectRide}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
            >
              <X className="h-5 w-5" />
              Decline
            </button>
            <button
              onClick={acceptRide}
              disabled={loading}
              className="flex-1 py-3 bg-green-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              <Check className="h-5 w-5" />
              Accept
            </button>
          </div>
        </div>
      )}

      {/* Current Active Ride */}
      {currentRide && (
        <div className="bg-white rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Active Ride</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              currentRide.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              currentRide.status === 'arrived' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {currentRide.status === 'in_progress' ? '🚗 On Trip' : 
               currentRide.status === 'arrived' ? '📍 At Pickup' : '✓ Accepted'}
            </span>
          </div>

          {/* Rider Info */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
            <div className="w-14 h-14 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center text-2xl">
              👤
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg">
                {currentRide.rider?.firstName || 'Rider'} {currentRide.rider?.lastName || ''}
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span>{currentRide.rider?.rating?.toFixed(1) || '5.0'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={`tel:${currentRide.rider?.phone || ''}`}
                className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center"
              >
                <Phone className="h-5 w-5 text-green-600" />
              </a>
              <button className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </button>
            </div>
          </div>

          {/* Locations */}
          <div className="space-y-2 mb-4">
            <div 
              className="flex items-center gap-3 p-3 bg-green-50 rounded-xl cursor-pointer hover:bg-green-100 transition-colors"
              onClick={() => openNavigation(currentRide.pickup?.coordinates)}
            >
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <MapPin className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">PICKUP</p>
                <p className="font-medium">{currentRide.pickup?.address}</p>
              </div>
              <Navigation className="h-5 w-5 text-gray-400" />
            </div>
            
            <div 
              className="flex items-center gap-3 p-3 bg-red-50 rounded-xl cursor-pointer hover:bg-red-100 transition-colors"
              onClick={() => openNavigation(currentRide.dropoff?.coordinates)}
            >
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <MapPin className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">DROPOFF</p>
                <p className="font-medium">{currentRide.dropoff?.address}</p>
              </div>
              <Navigation className="h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Fare */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl p-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-400 text-sm">Estimated Fare</p>
                <p className="text-3xl font-bold">Rs. {currentRide.fare?.totalFare?.toFixed(2) || '0.00'}</p>
              </div>
              <DollarSign className="h-10 w-10 opacity-50" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {currentRide.status === 'accepted' && (
              <button
                onClick={() => updateRideStatus('arrived')}
                disabled={loading}
                className="w-full py-4 bg-yellow-500 text-white rounded-xl font-bold text-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
              >
                📍 I've Arrived at Pickup
              </button>
            )}
            {currentRide.status === 'arrived' && (
              <button
                onClick={() => updateRideStatus('in_progress')}
                disabled={loading}
                className="w-full py-4 bg-blue-500 text-white rounded-xl font-bold text-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                🚗 Start Trip
              </button>
            )}
            {currentRide.status === 'in_progress' && (
              <button
                onClick={() => updateRideStatus('completed')}
                disabled={loading}
                className="w-full py-4 bg-green-500 text-white rounded-xl font-bold text-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                ✅ Complete Trip
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {isOnline && !currentRide && !incomingRequest && (
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Car className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-xl font-bold mb-2">You're Online!</h3>
          <p className="text-gray-500 mb-4">
            Waiting for ride requests. Stay in busy areas for more opportunities.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
            Searching for riders nearby...
          </div>
        </div>
      )}

      {/* Offline State */}
      {!isOnline && !currentRide && (
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Power className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">You're Offline</h3>
          <p className="text-gray-500">
            Go online to start receiving ride requests and earning money.
          </p>
        </div>
      )}
    </div>
  )

  const renderEarningsTab = () => (
    <div className="space-y-4">
      {/* Today's Summary */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
        <p className="text-green-100 mb-1">Today's Earnings</p>
        <h2 className="text-4xl font-bold mb-4">Rs. {stats.todayEarnings?.toFixed(2) || '0.00'}</h2>
        <div className="flex gap-4">
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <p className="text-2xl font-bold">{stats.todayRides || 0}</p>
            <p className="text-sm text-green-100">Rides</p>
          </div>
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <p className="text-2xl font-bold">{stats.todayRides ? (stats.todayEarnings / stats.todayRides).toFixed(2) : '0.00'}</p>
            <p className="text-sm text-green-100">Avg/Ride</p>
          </div>
        </div>
      </div>

      {/* Weekly Summary */}
      <div className="bg-white rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">This Week</h3>
          <Calendar className="h-5 w-5 text-gray-400" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-500 text-sm mb-1">Total Earnings</p>
            <p className="text-2xl font-bold text-green-600">Rs. {stats.weeklyEarnings?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-500 text-sm mb-1">Completed Rides</p>
            <p className="text-2xl font-bold">{stats.weeklyRides || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-500 text-sm mb-1">Average per Ride</p>
            <p className="text-2xl font-bold">Rs. {stats.weeklyRides ? (stats.weeklyEarnings / stats.weeklyRides).toFixed(2) : '0.00'}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-500 text-sm mb-1">Acceptance Rate</p>
            <p className="text-2xl font-bold">{stats.acceptanceRate || 100}%</p>
          </div>
        </div>
      </div>

      {/* Performance */}
      <div className="bg-white rounded-2xl p-5">
        <h3 className="font-bold text-lg mb-4">Performance</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="font-medium">Rating</p>
                <p className="text-sm text-gray-500">Based on rider feedback</p>
              </div>
            </div>
            <p className="text-xl font-bold">{stats.rating?.toFixed(1) || '5.0'} ⭐</p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium">Total Rides</p>
                <p className="text-sm text-gray-500">All time</p>
              </div>
            </div>
            <p className="text-xl font-bold">{stats.totalRides || 0}</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderHistoryTab = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-5">
        <h3 className="font-bold text-lg mb-4">Recent Rides</h3>
        
        {historyLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : rideHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No rides yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rideHistory.map((ride) => (
              <div key={ride._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  ride.status === 'completed' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {ride.status === 'completed' ? '✓' : '✕'}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{ride.pickup?.address || 'Unknown'}</p>
                  <p className="text-sm text-gray-500">→ {ride.dropoff?.address || 'Unknown'}</p>
                  <p className="text-xs text-gray-400">{formatDate(ride.createdAt)} at {formatTime(ride.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">Rs. {ride.fare?.totalFare?.toFixed(2) || '0.00'}</p>
                  <p className="text-xs text-gray-500 capitalize">{ride.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderProfileTab = () => {
    console.log('Vehicle Info:', vehicleInfo)
    console.log('User:', user)
    return (
    <div className="space-y-4">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl p-6 text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
          👨‍✈️
        </div>
        <h2 className="text-xl font-bold">{user?.firstName} {user?.lastName}</h2>
        <p className="text-gray-500">{user?.email}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
          <span className="font-semibold">{user?.rating?.toFixed(1) || '5.0'}</span>
          <span className="text-gray-400">• Driver since {new Date(user?.createdAt || Date.now()).getFullYear()}</span>
        </div>
      </div>

      {/* Vehicle Info */}
      <div className="bg-white rounded-2xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Car className="h-5 w-5" />
            Vehicle Information
          </h3>
          <button 
            onClick={() => {
              console.log('Edit button clicked, editingVehicle:', editingVehicle)
              setEditingVehicle(!editingVehicle)
            }}
            className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg font-medium hover:bg-blue-200 transition-colors"
          >
            {editingVehicle ? '✕ Cancel' : '✎ Edit'}
          </button>
        </div>
        
        {editingVehicle ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Vehicle Model</label>
              <input
                type="text"
                value={vehicleInfo.vehicleModel}
                onChange={(e) => setVehicleInfo({...vehicleInfo, vehicleModel: e.target.value})}
                placeholder="e.g., Toyota Camry 2022"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">License Plate Number</label>
              <input
                type="text"
                value={vehicleInfo.vehicleNumber}
                onChange={(e) => setVehicleInfo({...vehicleInfo, vehicleNumber: e.target.value})}
                placeholder="e.g., KA-01-AB-1234"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Driving License Number</label>
              <input
                type="text"
                value={vehicleInfo.licenseNumber}
                onChange={(e) => setVehicleInfo({...vehicleInfo, licenseNumber: e.target.value})}
                placeholder="e.g., DL-1234567890"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Vehicle Type</label>
              <select
                value={vehicleInfo.vehicleType}
                onChange={(e) => setVehicleInfo({...vehicleInfo, vehicleType: e.target.value})}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="economy">Economy</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="xl">XL</option>
              </select>
            </div>
            <button
              onClick={saveVehicleInfo}
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Vehicle Info'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500">Model</span>
              <span className="font-medium">{vehicleInfo.vehicleModel || 'Not set'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500">License Plate</span>
              <span className="font-medium">{vehicleInfo.vehicleNumber || 'Not set'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500">Driving License</span>
              <span className="font-medium">{vehicleInfo.licenseNumber || 'Not set'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500">Vehicle Type</span>
              <span className="font-medium capitalize">{vehicleInfo.vehicleType || 'Standard'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="bg-white rounded-2xl p-5">
        <h3 className="font-bold text-lg mb-4">Your Stats</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.totalRides || 0}</p>
            <p className="text-sm text-gray-500">Total Rides</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold">{stats.acceptanceRate || 100}%</p>
            <p className="text-sm text-gray-500">Acceptance Rate</p>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-2xl overflow-hidden">
        <Link to="/profile" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-gray-400" />
            <span>Edit Profile</span>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </Link>
        <div className="border-t"></div>
        <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left">
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-gray-400" />
            <span>Payment Settings</span>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </button>
        <div className="border-t"></div>
        <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-gray-400" />
            <span>Help & Support</span>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </button>
      </div>
    </div>
    )
  }

  return (
    <div className="pb-24">
      {/* Status Header with Toggle */}
      <div className={`rounded-2xl p-5 mb-4 transition-all duration-300 ${
        isOnline 
          ? currentRide 
            ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
            : 'bg-gradient-to-r from-green-500 to-green-600'
          : 'bg-gradient-to-r from-gray-700 to-gray-800'
      } text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{driverStatus.icon}</span>
              <h1 className="text-xl font-bold">{driverStatus.text}</h1>
            </div>
            <p className="text-white/80 text-sm">
              {currentRide 
                ? `${currentRide.status === 'in_progress' ? 'En route to dropoff' : 'Heading to pickup'}`
                : isOnline 
                  ? 'Ready for ride requests' 
                  : 'Tap to go online'}
            </p>
          </div>
          <button
            onClick={toggleOnline}
            disabled={loading || currentRide}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
              isOnline ? 'bg-white text-green-600' : 'bg-green-500 text-white'
            } shadow-lg disabled:opacity-50 hover:scale-105`}
          >
            <Power className="h-8 w-8" />
          </button>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1 opacity-80" />
            <p className="text-lg font-bold">Rs. {stats.todayEarnings?.toFixed(0) || 0}</p>
            <p className="text-xs opacity-70">Today</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
            <Car className="h-5 w-5 mx-auto mb-1 opacity-80" />
            <p className="text-lg font-bold">{stats.todayRides || 0}</p>
            <p className="text-xs opacity-70">Rides</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
            <Star className="h-5 w-5 mx-auto mb-1 opacity-80" />
            <p className="text-lg font-bold">{stats.rating?.toFixed(1) || '5.0'}</p>
            <p className="text-xs opacity-70">Rating</p>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)', paddingBottom: '80px' }}>
        {activeTab === 'home' && renderHomeTab()}
        {activeTab === 'earnings' && renderEarningsTab()}
        {activeTab === 'history' && renderHistoryTab()}
        {activeTab === 'profile' && renderProfileTab()}
      </div>

      {/* Bottom Tab Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="flex justify-around py-2 max-w-lg mx-auto">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center p-2 ${activeTab === 'home' ? 'text-green-600' : 'text-gray-400'}`}
          >
            <Car className="h-6 w-6" />
            <span className="text-xs mt-1">Home</span>
          </button>
          <button 
            onClick={() => setActiveTab('earnings')}
            className={`flex flex-col items-center p-2 ${activeTab === 'earnings' ? 'text-green-600' : 'text-gray-400'}`}
          >
            <Wallet className="h-6 w-6" />
            <span className="text-xs mt-1">Earnings</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center p-2 ${activeTab === 'history' ? 'text-green-600' : 'text-gray-400'}`}
          >
            <History className="h-6 w-6" />
            <span className="text-xs mt-1">History</span>
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center p-2 ${activeTab === 'profile' ? 'text-green-600' : 'text-gray-400'}`}
          >
            <User className="h-6 w-6" />
            <span className="text-xs mt-1">Profile</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default DriverDashboard
