import AsyncStorage from '@react-native-async-storage/async-storage'

const BASE_URL = 'https://backend-withered-sky-4709.fly.dev/api'

const STORAGE_KEYS = {
  token: 'session_token',
  expiresAt: 'session_expires_at',
  role: 'user_role',
  userId: 'user_id',
  userName: 'user_name',
  structureId: 'structure_id',
  structureName: 'structure_name'
}

async function getSessionHeaders() {
  const [
    token,
    role,
    userId,
    userName,
    structureId,
    structureName
  ] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.token),
    AsyncStorage.getItem(STORAGE_KEYS.role),
    AsyncStorage.getItem(STORAGE_KEYS.userId),
    AsyncStorage.getItem(STORAGE_KEYS.userName),
    AsyncStorage.getItem(STORAGE_KEYS.structureId),
    AsyncStorage.getItem(STORAGE_KEYS.structureName)
  ])

  return {
    ...(token ? { 'x-session-token': token } : {}),
    ...(role ? { 'x-user-role': role } : {}),
    ...(userId ? { 'x-user-id': userId } : {}),
    ...(userName ? { 'x-user-name': userName } : {}),
    ...(structureId ? { 'x-structure-id': structureId } : {}),
    ...(structureName ? { 'x-structure-name': structureName } : {})
  }
}

async function parseResponse(response) {
  const text = await response.text()

  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { success: false, message: text || 'Réponse serveur illisible.' }
  }

  if (!response.ok) {
    const error = new Error(
      data?.message || 'Une erreur est survenue lors de la communication avec le serveur.'
    )
    error.status = response.status
    error.code = data?.code || null
    error.data = data
    throw error
  }

  return data
}

async function request(path, options = {}) {
  const headers = await getSessionHeaders()

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...(options.headers || {})
    }
  })

  return parseResponse(response)
}

export const api = {
  async pinLogin({ role, structure_id, pin }) {
    return request('/auth/pin-login', {
      method: 'POST',
      body: JSON.stringify({ role, structure_id, pin })
    })
  },

  async getCurrentSession() {
    return request('/auth/me', {
      method: 'GET'
    })
  },

  async getFuelRequests(params = {}) {
    const query = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value)
      }
    })

    const suffix = query.toString() ? `?${query.toString()}` : ''
    return request(`/fuel-requests${suffix}`, {
      method: 'GET'
    })
  },

  async getFuelRequestById(id) {
    return request(`/fuel-requests/${id}`, {
      method: 'GET'
    })
  },

  async createFuelRequest(payload) {
    return request('/fuel-requests', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  async approveFuelRequest(id, payload = {}) {
    return request(`/fuel-requests/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  },

  async rejectFuelRequest(id, payload = {}) {
    return request(`/fuel-requests/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  },

  async serveFuelRequest(id, payload = {}) {
    return request(`/fuel-requests/${id}/serve`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  },

  async getStructures() {
    return request('/structures', {
      method: 'GET'
    })
  },

  async getUsers(params = {}) {
    const query = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value)
      }
    })

    const suffix = query.toString() ? `?${query.toString()}` : ''
    return request(`/users${suffix}`, {
      method: 'GET'
    })
  }
}

export async function saveSession(loginResponse) {
  const token = loginResponse?.data?.token
  const expiresAt = loginResponse?.data?.expires_at
  const session = loginResponse?.data?.session

  if (!token || !session) {
    throw new Error('Session invalide renvoyée par le serveur.')
  }

  await AsyncStorage.multiSet([
    [STORAGE_KEYS.token, String(token)],
    [STORAGE_KEYS.expiresAt, String(expiresAt || '')],
    [STORAGE_KEYS.role, String(session.role || '')],
    [STORAGE_KEYS.userId, String(session.userId || '')],
    [STORAGE_KEYS.userName, String(session.userName || '')],
    [STORAGE_KEYS.structureId, String(session.structureId || '')],
    [STORAGE_KEYS.structureName, String(session.structureName || '')]
  ])
}

export async function clearSession() {
  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS))
}

export async function getStoredSession() {
  const entries = await AsyncStorage.multiGet(Object.values(STORAGE_KEYS))
  const map = Object.fromEntries(entries)

  return {
    token: map[STORAGE_KEYS.token] || null,
    expiresAt: map[STORAGE_KEYS.expiresAt] || null,
    role: map[STORAGE_KEYS.role] || null,
    userId: map[STORAGE_KEYS.userId] || null,
    userName: map[STORAGE_KEYS.userName] || null,
    structureId: map[STORAGE_KEYS.structureId] || null,
    structureName: map[STORAGE_KEYS.structureName] || null
  }
}