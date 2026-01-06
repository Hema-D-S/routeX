import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { User, Mail, Phone, Car, Star, Shield, Camera, Save, LogOut, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const Profile = () => {
  const navigate = useNavigate()
  const { user, logout, refreshUser, updateUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: ''
  })
  const [vehicleInfo, setVehicleInfo] = useState({
    vehicleModel: '',
    vehicleNumber: '',
    vehicleType: 'standard',
    licenseNumber: ''
  })

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        email: user.email || ''
      })
      // Load vehicle info from driverInfo
      if (user.driverInfo) {
        setVehicleInfo({
          vehicleModel: user.driverInfo.vehicleModel || '',
          vehicleNumber: user.driverInfo.vehicleNumber || '',
          vehicleType: user.driverInfo.vehicleType || 'standard',
          licenseNumber: user.driverInfo.licenseNumber || ''
        })
      }
    }
  }, [user])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await api.put('/users/profile', formData)
      toast.success('Profile updated successfully')
      setEditing(false)
      if (refreshUser) refreshUser()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile')
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

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout()
    }
  }

  return (
    <div className="pb-20">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-black p-4 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Back</span>
      </button>

      {/* Profile Header */}
      <div className="bg-black text-white rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center text-3xl">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <Camera className="h-4 w-4 text-black" />
            </button>
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-gray-300 capitalize">{user?.role}</p>
            <div className="flex items-center gap-1 mt-1">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              <span>{user?.rating?.toFixed(1) || '5.0'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-white rounded-2xl p-6 mb-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Personal Information</h2>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-black font-semibold"
            >
              Edit
            </button>
          ) : (
            <button
              onClick={() => setEditing(false)}
              className="text-sm text-gray-500"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">First Name</label>
              {editing ? (
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="input-field"
                />
              ) : (
                <p className="font-medium">{user?.firstName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Last Name</label>
              {editing ? (
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="input-field"
                />
              ) : (
                <p className="font-medium">{user?.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Email</label>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-gray-400" />
              <p className="font-medium">{user?.email}</p>
              {user?.isEmailVerified && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Verified
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Phone</label>
            {editing ? (
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-field pl-10"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-gray-400" />
                <p className="font-medium">{user?.phone}</p>
              </div>
            )}
          </div>

          {editing && (
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <Save className="h-5 w-5" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      {/* Driver Info (if driver) */}
      {user?.role === 'driver' && (
        <div className="bg-white rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehicle Information
            </h2>
            {!editingVehicle ? (
              <button
                onClick={() => setEditingVehicle(true)}
                className="text-sm text-black font-semibold"
              >
                Edit
              </button>
            ) : (
              <button
                onClick={() => setEditingVehicle(false)}
                className="text-sm text-gray-500"
              >
                Cancel
              </button>
            )}
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
              <div className="flex justify-between">
                <span className="text-gray-500">Vehicle Type</span>
                <span className="font-medium capitalize">{vehicleInfo.vehicleType || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Model</span>
                <span className="font-medium">{vehicleInfo.vehicleModel || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">License Plate</span>
                <span className="font-medium">{vehicleInfo.vehicleNumber || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">License Number</span>
                <span className="font-medium">{vehicleInfo.licenseNumber || 'Not set'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings */}
      <div className="bg-white rounded-2xl p-6 mb-4">
        <h2 className="text-lg font-semibold mb-4">Settings</h2>
        
        <div className="space-y-3">
          <button className="w-full flex items-center justify-between py-3 border-b">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-gray-400" />
              <span>Privacy & Security</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>
          
          <button className="w-full flex items-center justify-between py-3 border-b">
            <div className="flex items-center gap-3">
              <span className="text-xl">🔔</span>
              <span>Notifications</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>
          
          <button className="w-full flex items-center justify-between py-3 border-b">
            <div className="flex items-center gap-3">
              <span className="text-xl">💳</span>
              <span>Payment Methods</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>
          
          <button className="w-full flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">❓</span>
              <span>Help & Support</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-semibold flex items-center justify-center gap-2"
      >
        <LogOut className="h-5 w-5" />
        Log Out
      </button>

      {/* App Version */}
      <p className="text-center text-gray-400 text-sm mt-6">
        Uber Clone v1.0.0
      </p>
    </div>
  )
}

export default Profile
