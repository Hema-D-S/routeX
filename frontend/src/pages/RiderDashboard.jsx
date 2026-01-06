import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { MapPin, Clock, DollarSign, Star, Car } from 'lucide-react'
import toast from 'react-hot-toast'

const RiderDashboard = () => {
  const { user } = useAuth()
  const [recentRides, setRecentRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeRide, setActiveRide] = useState(null)

  useEffect(() => {
    fetchRecentRides()
    checkActiveRide()
  }, [])

  const fetchRecentRides = async () => {
    try {
      const { data } = await api.get('/rides/history?limit=3')
      setRecentRides(data.rides || [])
    } catch (error) {
      console.error('Error fetching rides:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkActiveRide = async () => {
    try {
      const { data } = await api.get('/rides/active')
      if (data.ride) {
        setActiveRide(data.ride)
      }
    } catch (error) {
      // No active ride
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      accepted: 'bg-yellow-100 text-yellow-800',
      requested: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Welcome Section */}
      <div className="bg-black text-white rounded-2xl p-6">
        <h1 className="text-2xl font-bold mb-2">
          Hello, {user?.firstName}! 👋
        </h1>
        <p className="text-gray-300">Where would you like to go today?</p>
        
        <Link
          to="/book"
          className="mt-4 block w-full bg-white text-black text-center py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
        >
          Book a Ride
        </Link>
      </div>

      {/* Active Ride Alert */}
      {activeRide && (
        <Link
          to={`/ride/${activeRide._id}`}
          className="block bg-uber-green/10 border border-uber-green rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-uber-green rounded-full flex items-center justify-center">
              <Car className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-uber-green">Ride in Progress</p>
              <p className="text-sm text-gray-600">
                {activeRide.dropoff?.address}
              </p>
            </div>
            <span className="text-uber-green font-semibold">View →</span>
          </div>
        </Link>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 text-center">
          <Car className="h-6 w-6 mx-auto mb-2 text-gray-600" />
          <p className="text-2xl font-bold">{recentRides.length}</p>
          <p className="text-xs text-gray-500">Recent Rides</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center">
          <DollarSign className="h-6 w-6 mx-auto mb-2 text-gray-600" />
          <p className="text-2xl font-bold">
            Rs. {recentRides.filter(r => r.status === 'completed').reduce((acc, r) => acc + (r.fare?.totalFare || 0), 0).toFixed(0)}
          </p>
          <p className="text-xs text-gray-500">Total Spent</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center">
          <Star className="h-6 w-6 mx-auto mb-2 text-gray-600" />
          <p className="text-2xl font-bold">{user?.rating?.toFixed(1) || '5.0'}</p>
          <p className="text-xs text-gray-500">Rating</p>
        </div>
      </div>

      {/* Recent Rides */}
      <div className="bg-white rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Rides</h2>
          <Link to="/history" className="text-sm text-gray-500 hover:text-black">
            See all
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
          </div>
        ) : recentRides.length > 0 ? (
          <div className="space-y-3">
            {recentRides.map((ride) => (
              <div
                key={ride._id}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
              >
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{ride.dropoff?.address}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-3 w-3" />
                    {new Date(ride.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">Rs. {ride.fare?.totalFare?.toFixed(2)}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(ride.status)}`}>
                    {ride.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Car className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No rides yet</p>
            <Link to="/book" className="text-black font-semibold">
              Book your first ride
            </Link>
          </div>
        )}
      </div>

      {/* Saved Places */}
      <div className="bg-white rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">Saved Places</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              🏠
            </div>
            <div>
              <p className="font-medium">Home</p>
              <p className="text-sm text-gray-500">Add home address</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              💼
            </div>
            <div>
              <p className="font-medium">Work</p>
              <p className="text-sm text-gray-500">Add work address</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RiderDashboard
