import { Router } from 'express'
import {
  createStructure,
  getStructureById,
  getAllStructures
} from '../controllers/structureController.js'

const router = Router()

router.get('/', getAllStructures)
router.get('/:id', getStructureById)
router.post('/', createStructure)

export default router