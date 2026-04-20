import { Router } from 'express'
import {
  chiefLogin,
  driverAccess,
  pumpAttendantAccess,
  getStructureUsersByCode,
  getCurrentSession
} from '../controllers/authController.js'
import { authenticateSession } from '../middleware/authSession.js'

const router = Router()

router.post('/chief-login', chiefLogin)
router.post('/driver-access', driverAccess)
router.post('/pump-access', pumpAttendantAccess)

router.get('/structure-users/:structureCode', getStructureUsersByCode)
router.get('/me', authenticateSession, getCurrentSession)

export default router