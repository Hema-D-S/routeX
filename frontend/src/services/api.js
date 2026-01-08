import axios from 'axios'

// For local dev: use localhost:3000, for production: use environment variable
const baseURL = import.meta.env.VITE_API_URL ? 
  `${import.meta.env.VITE_API_URL}/v1` : 
  'http://localhost:3000/api/v1'

const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor - add auth token and user ID
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    const userId = localStorage.getItem('userId')
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    if (userId) {
      config.headers['x-user-id'] = userId
    }
    
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
