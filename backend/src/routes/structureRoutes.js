import { Router } from 'express'
import {
  createStructure,
  getStructureById,
  getAllStructures,
  updateStructure
} from '../controllers/structureController.js'
import { authenticateSession, authorizeRoles } from '../middleware/authSession.js'

const router = Router()

router.post('/', createStructure)

router.get('/', authenticateSession, authorizeRoles('chief'), getAllStructures)
router.get('/:id', authenticateSession, authorizeRoles('chief'), getStructureById)
router.patch('/:id', authenticateSession, authorizeRoles('chief'), updateStructure)

export default router