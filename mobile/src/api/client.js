import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEYS = {
  role: 'fuel_app_role',
  userId: 'fuel_app_user_id',
  userName: 'fuel_app_user_name',
  structureId: 'fuel_app_structure_id',
  structureName: 'fuel_app_structure_name'
}

export const api = axios.create({
  baseURL: 'https://backend-withered-sky-4709.fly.dev/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
})

api.interceptors.request.use(
  async (config) => {
    try {
      const [
        role,
        userId,
        userName,
        structureId,
        structureName
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.role),
        AsyncStorage.getItem(STORAGE_KEYS.userId),
        AsyncStorage.getItem(STORAGE_KEYS.userName),
        AsyncStorage.getItem(STORAGE_KEYS.structureId),
        AsyncStorage.getItem(STORAGE_KEYS.structureName)
      ])

      if (role) {
        config.headers['x-user-role'] = role
      }

      if (userId) {
        config.headers['x-user-id'] = userId
      }

      if (userName) {
        config.headers['x-user-name'] = userName
      }

      if (structureId) {
        config.headers['x-structure-id'] = structureId
      }

      if (structureName) {
        config.headers['x-structure-name'] = structureName
      }
    } catch (error) {
      console.log('Erreur lecture session locale API :', error.message)
    }

    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Une erreur réseau est survenue.'

    console.log('Erreur API :', message)

    return Promise.reject(error)
  }
)

export async function getStoredSession() {
  try {
    const [
      role,
      userId,
      userName,
      structureId,
      structureName
    ] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.role),
      AsyncStorage.getItem(STORAGE_KEYS.userId),
      AsyncStorage.getItem(STORAGE_KEYS.userName),
      AsyncStorage.getItem(STORAGE_KEYS.structureId),
      AsyncStorage.getItem(STORAGE_KEYS.structureName)
    ])

    return {
      role: role || null,
      userId: userId ? Number(userId) : null,
      userName: userName || null,
      structureId: structureId ? Number(structureId) : null,
      structureName: structureName || null
    }
  } catch (error) {
    console.log('Erreur récupération session locale :', error.message)

    return {
      role: null,
      userId: null,
      userName: null,
      structureId: null,
      structureName: null
    }
  }
}

export async function saveSession(session = {}) {
  try {
    const tasks = []

    if (session.role !== undefined) {
      tasks.push(
        session.role
          ? AsyncStorage.setItem(STORAGE_KEYS.role, String(session.role))
          : AsyncStorage.removeItem(STORAGE_KEYS.role)
      )
    }

    if (session.userId !== undefined) {
      tasks.push(
        session.userId !== null && session.userId !== ''
          ? AsyncStorage.setItem(STORAGE_KEYS.userId, String(session.userId))
          : AsyncStorage.removeItem(STORAGE_KEYS.userId)
      )
    }

    if (session.userName !== undefined) {
      tasks.push(
        session.userName
          ? AsyncStorage.setItem(STORAGE_KEYS.userName, String(session.userName))
          : AsyncStorage.removeItem(STORAGE_KEYS.userName)
      )
    }

    if (session.structureId !== undefined) {
      tasks.push(
        session.structureId !== null && session.structureId !== ''
          ? AsyncStorage.setItem(STORAGE_KEYS.structureId, String(session.structureId))
          : AsyncStorage.removeItem(STORAGE_KEYS.structureId)
      )
    }

    if (session.structureName !== undefined) {
      tasks.push(
        session.structureName
          ? AsyncStorage.setItem(
              STORAGE_KEYS.structureName,
              String(session.structureName)
            )
          : AsyncStorage.removeItem(STORAGE_KEYS.structureName)
      )
    }

    await Promise.all(tasks)
  } catch (error) {
    console.log('Erreur sauvegarde session locale :', error.message)
  }
}

export async function clearSession() {
  try {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.role),
      AsyncStorage.removeItem(STORAGE_KEYS.userId),
      AsyncStorage.removeItem(STORAGE_KEYS.userName),
      AsyncStorage.removeItem(STORAGE_KEYS.structureId),
      AsyncStorage.removeItem(STORAGE_KEYS.structureName)
    ])
  } catch (error) {
    console.log('Erreur suppression session locale :', error.message)
  }
}