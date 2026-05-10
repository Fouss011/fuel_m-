import { Router } from 'express'
import {
  stationLogin,
  getPublicStationByCode,
  getStations,
  getStationPumpAttendants,
  createStation,
  createStationPumpAttendant,
  getMyPartnerStations,
  addPartnerStation,
  removePartnerStation,
  getStationTransactions,
  getStationSummary,
  getStationPendingRequests
} from '../controllers/stationController.js'
import { authenticateSession } from '../middleware/authSession.js'

const router = Router()

router.post('/', authenticateSession, createStation)
router.get('/', authenticateSession, getStations)

router.post('/login', stationLogin)

router.get('/public/:stationCode', getPublicStationByCode)

router.get('/partners/mine', authenticateSession, getMyPartnerStations)
router.post('/partners', authenticateSession, addPartnerStation)
router.delete('/partners/:stationId', authenticateSession, removePartnerStation)

router.get('/pump-attendants', authenticateSession, getStationPumpAttendants)
router.post('/pump-attendants', authenticateSession, createStationPumpAttendant)

router.get('/:stationId/pump-attendants', getStationPumpAttendants)
router.post('/:stationId/pump-attendants', authenticateSession, createStationPumpAttendant)

router.get('/:stationId/pending-requests', authenticateSession, getStationPendingRequests)

router.get('/transactions', authenticateSession, getStationTransactions)
router.get('/summary', authenticateSession, getStationSummary)

export default router