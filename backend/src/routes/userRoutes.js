import { Router } from 'express'
import {
  getUsersByStructure,
  createDriver,
  createPumpAttendant,
  updateUser,
  deactivateUser
} from '../controllers/userController.js'
import { authenticateSession, authorizeRoles } from '../middleware/authSession.js'

const router = Router()

router.use(authenticateSession)
router.use(authorizeRoles('chief'))

router.get('/structure/:structureId', getUsersByStructure)

router.post('/drivers', createDriver)
router.post('/pump-attendants', createPumpAttendant)

router.patch('/:id', updateUser)
router.patch('/:id/deactivate', deactivateUser)

export default router