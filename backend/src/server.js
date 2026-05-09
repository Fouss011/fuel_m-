import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'

import authRoutes from './routes/authRoutes.js'
import fuelRequestRoutes from './routes/fuelRequestRoutes.js'
import structureRoutes from './routes/structureRoutes.js'
import userRoutes from './routes/userRoutes.js'
import stationRoutes from './routes/stationRoutes.js'
import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

app.use(
  cors({
    origin: true,
    credentials: true
  })
)

app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))
app.use('/api/station', stationRoutes)

app.use((req, res, next) => {
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  )
  next()
})

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Fuel Management en ligne',
    version: '3.0.0'
  })
})

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Bienvenue sur l’API Gestion Carburant',
    version: '3.0.0',
    routes: {
      health: '/api/health',
      auth: '/api/auth',
      fuelRequests: '/api/fuel-requests',
      structures: '/api/structures',
      users: '/api/users'
    }
  })
})

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/fuel-requests', fuelRequestRoutes)
app.use('/api/structures', structureRoutes)
app.use('/api/users', userRoutes)
app.use('/api/station', stationRoutes)

app.use(notFound)
app.use(errorHandler)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
})