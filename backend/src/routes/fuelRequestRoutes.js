import { Router } from 'express'
import {
  createFuelRequest,
  getAllFuelRequests,
  getFuelRequestById,
  approveFuelRequest,
  rejectFuelRequest,
  serveFuelRequest
} from '../controllers/fuelRequestController.js'
import { requireRole, requireSession } from '../middleware/authSession.js'

const router = Router()

router.get('/', getAllFuelRequests)
router.get('/:id', getFuelRequestById)

router.post('/', createFuelRequest)
router.patch('/:id/approve', requireSession, requireRole('chief'), approveFuelRequest)
router.patch('/:id/reject', requireSession, requireRole('chief'), rejectFuelRequest)
router.patch('/:id/serve', requireSession, requireRole('pump_attendant'), serveFuelRequest)

export default router