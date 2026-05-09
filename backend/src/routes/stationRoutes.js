import { Router } from 'express'
import {
  stationLogin,
  getStationTransactions,
  getStationSummary
} from '../controllers/stationController.js'
import { authenticateSession } from '../middleware/authSession.js'

const router = Router()

router.post('/login', stationLogin)

router.get('/transactions', authenticateSession, getStationTransactions)
router.get('/summary', authenticateSession, getStationSummary)

export default router