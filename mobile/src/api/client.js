import axios from 'axios'

export const api = axios.create({
  baseURL: 'https://backend-withered-sky-4709.fly.dev/api',
  headers: {
    'Content-Type': 'application/json'
  }
})