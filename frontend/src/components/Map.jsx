import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom icons
const createIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const pickupIcon = createIcon('green')
const dropoffIcon = createIcon('red')
const driverIcon = createIcon('blue')

const Map = ({ 
  pickup, 
  dropoff, 
  driverLocation, 
  center, 
  zoom = 13,
  showRoute = false,
  onMapClick,
  className = ''
}) => {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({ pickup: null, dropoff: null, driver: null })
  const polylineRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)

  const defaultCenter = center || [12.9716, 77.5946] // Default: Bangalore, India

  // Initialize map
  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView(defaultCenter, zoom)
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current)

      if (onMapClick) {
        mapInstanceRef.current.on('click', (e) => {
          onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng })
        })
      }

      setMapReady(true)
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update markers when props change
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return

    const map = mapInstanceRef.current
    console.log('🗺️ Map updating with:', { pickup, dropoff, driverLocation });

    // Update pickup marker
    if (pickup?.lat && pickup?.lng) {
      if (markersRef.current.pickup) {
        markersRef.current.pickup.setLatLng([pickup.lat, pickup.lng])
      } else {
        markersRef.current.pickup = L.marker([pickup.lat, pickup.lng], { icon: pickupIcon })
          .addTo(map)
          .bindPopup('<strong>Pickup</strong><br>' + (pickup.address || 'Pickup Location'))
      }
    } else if (markersRef.current.pickup) {
      map.removeLayer(markersRef.current.pickup)
      markersRef.current.pickup = null
    }

    // Update dropoff marker
    if (dropoff?.lat && dropoff?.lng) {
      if (markersRef.current.dropoff) {
        markersRef.current.dropoff.setLatLng([dropoff.lat, dropoff.lng])
      } else {
        markersRef.current.dropoff = L.marker([dropoff.lat, dropoff.lng], { icon: dropoffIcon })
          .addTo(map)
          .bindPopup('<strong>Dropoff</strong><br>' + (dropoff.address || 'Dropoff Location'))
      }
    } else if (markersRef.current.dropoff) {
      map.removeLayer(markersRef.current.dropoff)
      markersRef.current.dropoff = null
    }

    // Update driver marker
    if (driverLocation?.lat && driverLocation?.lng) {
      console.log('🚗 Updating driver marker at:', driverLocation);
      if (markersRef.current.driver) {
        markersRef.current.driver.setLatLng([driverLocation.lat, driverLocation.lng])
      } else {
        markersRef.current.driver = L.marker([driverLocation.lat, driverLocation.lng], { icon: driverIcon })
          .addTo(map)
          .bindPopup('<strong>Driver</strong><br>Your driver is here')
      }
    } else if (markersRef.current.driver) {
      map.removeLayer(markersRef.current.driver)
      markersRef.current.driver = null
    }

    // Update route polyline
    if (showRoute && pickup?.lat && dropoff?.lat) {
      const routeCoords = [[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]]
      if (polylineRef.current) {
        polylineRef.current.setLatLngs(routeCoords)
      } else {
        polylineRef.current = L.polyline(routeCoords, {
          color: '#3B82F6',
          weight: 4,
          dashArray: '10, 10'
        }).addTo(map)
      }
    } else if (polylineRef.current) {
      map.removeLayer(polylineRef.current)
      polylineRef.current = null
    }

    // Fit bounds to markers
    const bounds = []
    if (pickup?.lat) bounds.push([pickup.lat, pickup.lng])
    if (dropoff?.lat) bounds.push([dropoff.lat, dropoff.lng])
    if (driverLocation?.lat) bounds.push([driverLocation.lat, driverLocation.lng])
    
    if (bounds.length >= 2) {
      map.fitBounds(bounds, { padding: [50, 50] })
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 14)
    }
  }, [pickup, dropoff, driverLocation, showRoute, mapReady])

  // Update center when prop changes
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView(center, zoom)
    }
  }, [center, zoom])

  return (
    <div className={`w-full h-full min-h-[300px] rounded-lg overflow-hidden ${className}`}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </div>
  )
}

export default Map
