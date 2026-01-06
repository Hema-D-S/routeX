import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { MapPin, Clock, DollarSign, Star, Car, Calendar, ChevronRight, Filter } from 'lucide-react'

const RideHistory = () => {
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, completed, cancelled

  useEffect(() => {
    fetchRides()
  }, [filter])

  const fetchRides = async () => {
    try {
      setLoading(true)
      const params = filter !== 'all' ? `?status=${filter}` : ''
      console.log('Fetching rides from:', `/rides/history${params}`)
      const { data } = await api.get(`/rides/history${params}`)
      console.log('Rides received:', data)
      setRides(data.rides || [])
    } catch (error) {
      console.error('Error fetching rides:', error)
    } finally {
      setLoading(false)
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

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  // Group rides by date
  const groupedRides = rides.reduce((groups, ride) => {
    const date = new Date(ride.createdAt).toLocaleDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(ride)
    return groups
  }, {})

  return (
    <div className="pb-20">
      <h1 className="text-2xl font-bold mb-6">Ride History</h1>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['all', 'completed', 'cancelled'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
        </div>
      ) : rides.length === 0 ? (
        <div className="text-center py-12">
          <Car className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No rides yet</h3>
          <p className="text-gray-500 mb-4">Your ride history will appear here</p>
          <Link to="/book" className="btn-primary inline-block">
            Book your first ride
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedRides).map(([date, dateRides]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </h2>
              
              <div className="space-y-3">
                {dateRides.map((ride) => {
                  const { date: rideDate, time: rideTime } = formatDate(ride.createdAt)
                  
                  return (
                    <Link
                      key={ride._id}
                      to={`/ride/${ride._id}`}
                      className="block bg-white rounded-xl p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Car className="h-6 w-6 text-gray-600" />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          {/* Locations */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <p className="text-sm truncate">{ride.pickup?.address}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <p className="text-sm font-medium truncate">{ride.dropoff?.address}</p>
                            </div>
                          </div>

                          {/* Meta info */}
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {rideTime}
                            </span>
                            {ride.driver && (
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                {ride.driver.firstName}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right side */}
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold">Rs. {ride.fare?.totalFare?.toFixed(2)}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(ride.status)}`}>
                            {ride.status}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Summary */}
      {rides.length > 0 && (
        <div className="mt-8 bg-gray-100 rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{rides.length}</p>
              <p className="text-sm text-gray-500">Total Rides</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                Rs. {rides.filter(r => r.status === 'completed').reduce((sum, r) => sum + (r.fare?.totalFare || 0), 0).toFixed(0)}
              </p>
              <p className="text-sm text-gray-500">Total Spent</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {rides.filter(r => r.status === 'completed').length}
              </p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RideHistory
