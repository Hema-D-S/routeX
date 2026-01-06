import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import Map from '../components/Map'
import { MapPin, Clock, DollarSign, Car, Navigation, Search, ArrowRight, X } from 'lucide-react'
import toast from 'react-hot-toast'

const BookRide = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: locations, 2: vehicle type, 3: confirm
  const [pickup, setPickup] = useState({ address: '', coordinates: null })
  const [dropoff, setDropoff] = useState({ address: '', coordinates: null })
  const [vehicleType, setVehicleType] = useState('standard')
  const [fareEstimate, setFareEstimate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [activeInput, setActiveInput] = useState(null)
  const searchTimeout = useRef(null)
  const estimateTimeout = useRef(null)

  // Get current location on mount
  useEffect(() => {
    getCurrentLocation()
  }, [])

  // Auto-fetch fare estimate when both locations are set (with debounce)
  useEffect(() => {
    if (pickup.coordinates && dropoff.coordinates) {
      clearTimeout(estimateTimeout.current)
      estimateTimeout.current = setTimeout(() => {
        getFareEstimate()
      }, 500)
    }
    return () => clearTimeout(estimateTimeout.current)
  }, [pickup.coordinates, dropoff.coordinates, vehicleType])

  // Reverse geocode coordinates to address using Nominatim
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await response.json()
      return data.display_name || 'Current Location'
    } catch (error) {
      console.error('Reverse geocode error:', error)
      return 'Current Location'
    }
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          // Reverse geocode to get real address
          const address = await reverseGeocode(latitude, longitude)
          setPickup({
            address: address,
            coordinates: { lat: latitude, lng: longitude }
          })
          toast.success('Location detected!')
        },
        (error) => {
          console.error('Location error:', error)
          toast.error('Please enable location access')
        }
      )
    }
  }

  // Real location search using Nominatim (OpenStreetMap free geocoding)
  const searchLocations = async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([])
      return
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await response.json()
      
      const results = data.map((item, index) => ({
        id: item.place_id || index,
        address: item.display_name,
        coordinates: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) }
      }))
      
      setSearchResults(results)
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Failed to search locations')
      setSearchResults([])
    }
  }

  const handleInputChange = (value, type) => {
    if (type === 'pickup') {
      setPickup({ ...pickup, address: value })
    } else {
      setDropoff({ ...dropoff, address: value })
    }

    setActiveInput(type)
    
    // Debounce search
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      searchLocations(value)
    }, 300)
  }

  const selectLocation = (result, type) => {
    if (type === 'pickup') {
      setPickup(result)
    } else {
      setDropoff(result)
    }
    setSearchResults([])
    setActiveInput(null)
  }

  const getFareEstimate = async () => {
    if (!pickup.coordinates || !dropoff.coordinates) {
      toast.error('Please select valid locations')
      return
    }

    setLoading(true)
    try {
      console.log('Fetching fare estimate for:', {
        pickup: pickup.coordinates,
        dropoff: dropoff.coordinates
      })
      
      const { data } = await api.post('/rides/estimate', {
        pickup: pickup.coordinates,
        dropoff: dropoff.coordinates,
        vehicleType
      })
      
      console.log('Fare estimate received:', data)
      setFareEstimate(data)
      setStep(2)
    } catch (error) {
      console.error('Fare estimate error:', error.response?.data || error.message)
      toast.error('Failed to get fare estimate')
    } finally {
      setLoading(false)
    }
  }

  const bookRide = async () => {
    setLoading(true)
    try {
      const { data } = await api.post('/rides/request', {
        pickup: {
          address: pickup.address,
          coordinates: pickup.coordinates
        },
        dropoff: {
          address: dropoff.address,
          coordinates: dropoff.coordinates
        },
        vehicleType
      })
      
      toast.success('Ride requested! Finding a driver...')
      navigate(`/ride/${data.ride._id}`)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to book ride')
    } finally {
      setLoading(false)
    }
  }

  const vehicleTypes = [
    { id: 'economy', name: 'Economy', icon: '🚗', multiplier: 1, eta: '3 min' },
    { id: 'standard', name: 'Standard', icon: '🚕', multiplier: 1.2, eta: '5 min' },
    { id: 'premium', name: 'Premium', icon: '🚘', multiplier: 1.8, eta: '7 min' },
    { id: 'xl', name: 'XL', icon: '🚐', multiplier: 1.5, eta: '8 min' },
  ]

  // Handle map click to select location
  const handleMapClick = async (coords) => {
    const address = await reverseGeocode(coords.lat, coords.lng)
    
    if (!pickup.coordinates) {
      // Set pickup first if not set
      setPickup({ address, coordinates: coords })
      toast.success('Pickup location set!')
    } else if (!dropoff.coordinates) {
      // Then set dropoff
      setDropoff({ address, coordinates: coords })
      toast.success('Dropoff location set!')
    } else {
      // Both set - update dropoff
      setDropoff({ address, coordinates: coords })
      toast.success('Dropoff location updated!')
    }
  }

  return (
    <div className="pb-20">
      {/* Map */}
      <div className="relative h-64 bg-gray-200 rounded-2xl mb-4 overflow-hidden">
        <Map 
          pickup={pickup.coordinates}
          dropoff={dropoff.coordinates}
          showRoute={pickup.coordinates && dropoff.coordinates}
          onMapClick={handleMapClick}
          className="h-full"
        />
        
        {/* Hint text */}
        <div className="absolute top-2 left-2 right-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg z-[1000] text-center">
          👆 Tap on map to set {!pickup.coordinates ? 'pickup' : 'dropoff'} location
        </div>
        
        {/* Current location button */}
        <button
          onClick={getCurrentLocation}
          className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center z-[1000]"
        >
          <Navigation className="h-5 w-5" />
        </button>
      </div>

      {/* Location Inputs */}
      <div className="bg-white rounded-2xl p-4 mb-4">
        <div className="space-y-3">
          {/* Pickup */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 bg-green-500 rounded-full"></div>
            <input
              type="text"
              placeholder="Pickup location"
              value={pickup.address}
              onChange={(e) => handleInputChange(e.target.value, 'pickup')}
              onFocus={() => setActiveInput('pickup')}
              className="w-full pl-8 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
            {pickup.address && (
              <button
                onClick={() => setPickup({ address: '', coordinates: null })}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            )}
          </div>

          {/* Vertical line connector */}
          <div className="ml-[18px] h-4 border-l-2 border-dashed border-gray-300"></div>

          {/* Dropoff */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full"></div>
            <input
              type="text"
              placeholder="Where to?"
              value={dropoff.address}
              onChange={(e) => handleInputChange(e.target.value, 'dropoff')}
              onFocus={() => setActiveInput('dropoff')}
              className="w-full pl-8 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
            {dropoff.address && (
              <button
                onClick={() => setDropoff({ address: '', coordinates: null })}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && activeInput && (
          <div className="mt-3 border-t pt-3">
            {searchResults.map((result) => (
              <button
                key={result.id}
                onClick={() => selectLocation(result, activeInput)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg text-left"
              >
                <MapPin className="h-5 w-5 text-gray-400" />
                <span>{result.address}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Vehicle Selection */}
      {step >= 1 && pickup.coordinates && dropoff.coordinates && (
        <div className="bg-white rounded-2xl p-4 mb-4">
          <h3 className="text-lg font-semibold mb-4">Choose your ride</h3>
          
          {fareEstimate && (
            <div className="text-sm text-gray-500 mb-3">
              Distance: {fareEstimate.distance} km • Est. time: {fareEstimate.duration} min
            </div>
          )}
          
          <div className="space-y-2">
            {vehicleTypes.map((vehicle) => (
              <button
                key={vehicle.id}
                onClick={() => setVehicleType(vehicle.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl transition-colors ${
                  vehicleType === vehicle.id
                    ? 'bg-gray-100 ring-2 ring-black'
                    : 'hover:bg-gray-50'
                }`}
              >
                <span className="text-3xl">{vehicle.icon}</span>
                <div className="flex-1 text-left">
                  <p className="font-semibold">{vehicle.name}</p>
                  <p className="text-sm text-gray-500">{vehicle.eta} away</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    ₹{fareEstimate?.fares?.[vehicle.id]?.totalFare || '--'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fare Estimate */}
      {fareEstimate && vehicleType && fareEstimate.fares?.[vehicleType] && (
        <div className="bg-white rounded-2xl p-4 mb-4">
          <h3 className="text-lg font-semibold mb-3">Fare Breakdown</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Base fare</span>
              <span>₹{fareEstimate.fares[vehicleType].baseFare}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Distance ({fareEstimate.distance} km)</span>
              <span>₹{fareEstimate.fares[vehicleType].distanceFare}</span>
            </div>
            {fareEstimate.fares[vehicleType].surgeMultiplier > 1 && (
              <div className="flex justify-between text-orange-600">
                <span>Surge pricing ({fareEstimate.fares[vehicleType].surgeMultiplier}x)</span>
                <span>Applied</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>₹{fareEstimate.fares[vehicleType].totalFare}</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        {!fareEstimate ? (
          <button
            onClick={getFareEstimate}
            disabled={loading || !pickup.coordinates || !dropoff.coordinates}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Calculating...' : 'Get Fare Estimate'}
          </button>
        ) : (
          <button
            onClick={bookRide}
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50"
          >
            {loading ? 'Booking...' : `Book ${vehicleTypes.find(v => v.id === vehicleType)?.name} - ₹${fareEstimate.fares?.[vehicleType]?.totalFare || '--'}`}
          </button>
        )}
      </div>
    </div>
  )
}

export default BookRide
