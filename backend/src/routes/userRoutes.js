import { Router } from 'express'
import {
  getUsersByStructure,
  createDriver,
  updateUser,
  deactivateUser
} from '../controllers/userController.js'
import { authenticateSession, authorizeRoles } from '../middleware/authSession.js'

const router = Router()

router.use(authenticateSession)
router.use(authorizeRoles('chief'))

router.get('/structure/:structureId', getUsersByStructure)

router.post('/drivers', createDriver)
router.patch('/:id', updateUser)
router.patch('/:id/deactivate', deactivateUser)

export default router