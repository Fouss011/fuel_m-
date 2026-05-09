import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'

const SESSION_STORAGE_KEY = 'fuel_management_session'

const BASE_URL =
  'https://backend-withered-sky-4709.fly.dev/api'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export async function getStoredSession() {
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)

    if (!parsed?.token || !parsed?.role) {
      return null
    }

    return parsed
  } catch (error) {
    console.log('Erreur lecture session:', error?.message || error)
    return null
  }
}

export async function setStoredSession(session) {
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export async function clearSession() {
  await AsyncStorage.removeItem(SESSION_STORAGE_KEY)
}

export async function getAuthHeaders() {
  const session = await getStoredSession()

  if (!session?.token) {
    return {}
  }

  return {
    Authorization: `Bearer ${session.token}`
  }
}

api.interceptors.request.use(
  async (config) => {
    const session = await getStoredSession()

    if (session?.token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${session.token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status

    if (status === 401) {
      try {
        await clearSession()
      } catch (storageError) {
        console.log('Erreur suppression session:', storageError?.message || storageError)
      }
    }

    return Promise.reject(error)
  }
)

export async function fetchCurrentSession() {
  const response = await api.get('/auth/me')
  return response.data
}

export async function createChiefStructure(payload) {
  const response = await api.post('/structures', payload)
  return response.data
}

export async function loginChief(payload) {
  const response = await api.post('/auth/chief-login', payload)
  return response.data
}

export async function loadStructureUsers(structureCode, role) {
  const response = await api.get(
    `/auth/structure-users/${String(structureCode).trim().toUpperCase()}?role=${role}`
  )
  return response.data
}

export async function accessDriver(payload) {
  const response = await api.post('/auth/driver-access', payload)
  return response.data
}

export async function accessPumpAttendant(payload) {
  const response = await api.post('/auth/pump-access', payload)
  return response.data
}

export async function fetchFuelRequests(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  const response = await api.get(`/fuel-requests${query}`)
  return response.data
}

export async function fetchFuelRequestById(id) {
  const response = await api.get(`/fuel-requests/${id}`)
  return response.data
}

export async function createFuelRequest(payload) {
  const response = await api.post('/fuel-requests', payload)
  return response.data
}

export async function approveFuelRequest(id, approved_liters) {
  const response = await api.patch(`/fuel-requests/${id}/approve`, {
    approved_liters
  })
  return response.data
}

export async function rejectFuelRequest(id) {
  const response = await api.patch(`/fuel-requests/${id}/reject`)
  return response.data
}

export async function serveFuelRequest(id, payload) {
  const response = await api.patch(`/fuel-requests/${id}/serve`, payload)
  return response.data
}

export async function fetchStructureUsers(structureId, role) {
  const query = role ? `?role=${encodeURIComponent(role)}` : ''
  const response = await api.get(`/users/structure/${structureId}${query}`)
  return response.data
}

export async function updateStructure(id, payload) {
  const response = await api.patch(`/structures/${id}`, payload)
  return response.data
}

export async function createDriverUser(payload) {
  const response = await api.post('/users/drivers', payload)
  return response.data
}

export async function createPumpAttendantUser(payload) {
  const response = await api.post('/users/pump-attendants', payload)
  return response.data
}

export async function updateUser(id, payload) {
  const response = await api.patch(`/users/${id}`, payload)
  return response.data
}

export async function deactivateUser(id) {
  const response = await api.patch(`/users/${id}/deactivate`)
  return response.data
}

export async function stationLogin(payload) {
  const response = await api.post('/station/login', payload)
  return response.data
}

export async function getStationTransactions(params = {}) {
  const response = await api.get('/station/transactions', { params })
  return response.data
}

export async function getStationSummary(params = {}) {
  const response = await api.get('/station/summary', { params })
  return response.data
}

export default api