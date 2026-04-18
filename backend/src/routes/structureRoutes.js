import express from 'express'
import {
  createStructure,
  getStructureById,
  getAllStructures
} from '../controllers/structureController.js'

const router = express.Router()

router.get('/', getAllStructures)
router.get('/:id', getStructureById)
router.post('/', createStructure)

export default router