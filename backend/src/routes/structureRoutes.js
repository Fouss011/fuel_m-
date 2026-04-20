import { Router } from 'express'
import {
  createStructure,
  getStructureById,
  getAllStructures
} from '../controllers/structureController.js'
import { authenticateSession, authorizeRoles } from '../middleware/authSession.js'

const router = Router()

// Création du compte chef + structure
router.post('/', createStructure)

// Lecture structure(s)
router.get('/', authenticateSession, authorizeRoles('chief'), getAllStructures)
router.get('/:id', authenticateSession, authorizeRoles('chief'), getStructureById)

export default router