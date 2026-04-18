import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'

import fuelRequestRoutes from './routes/fuelRequestRoutes.js'
import structureRoutes from './routes/structureRoutes.js'
import userRoutes from './routes/userRoutes.js'
import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Fuel Management en ligne',
    version: '1.0.0'
  })
})

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Bienvenue sur l’API Gestion Carburant',
    routes: {
      health: '/api/health',
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
    timestamp: new Date().toISOString()
  })
})

app.use('/api/fuel-requests', fuelRequestRoutes)
app.use('/api/structures', structureRoutes)
app.use('/api/users', userRoutes)

app.use(notFound)
app.use(errorHandler)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
})