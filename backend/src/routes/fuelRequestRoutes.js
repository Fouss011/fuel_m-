import { Router } from 'express'
import {
  createFuelRequest,
  getAllFuelRequests,
  getFuelRequestById,
  approveFuelRequest,
  rejectFuelRequest,
  serveFuelRequest
} from '../controllers/fuelRequestController.js'
import { authenticateSession } from '../middleware/authSession.js'

const router = Router()

router.use(authenticateSession)

router.get('/', getAllFuelRequests)
router.get('/:id', getFuelRequestById)

router.post('/', createFuelRequest)
router.patch('/:id/approve', approveFuelRequest)
router.patch('/:id/reject', rejectFuelRequest)
router.patch('/:id/serve', serveFuelRequest)

export default router