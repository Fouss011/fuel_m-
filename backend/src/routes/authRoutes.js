import { Router } from 'express'
import {
  chiefLogin,
  driverAccess,
  pumpAttendantAccess,
  getStructureUsersByCode,
  getCurrentSession,
  forgotChiefPassword,
  forgotStationPassword
} from '../controllers/authController.js'
import { authenticateSession } from '../middleware/authSession.js'

const router = Router()

router.post('/chief-login', chiefLogin)
router.post('/driver-access', driverAccess)
router.post('/pump-access', pumpAttendantAccess)

router.post('/forgot-chief-password', forgotChiefPassword)
router.post('/forgot-station-password', forgotStationPassword)

router.get('/structure-users/:structureCode', getStructureUsersByCode)
router.get('/me', authenticateSession, getCurrentSession)

export default router