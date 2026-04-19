import { Router } from 'express'
import {
  createUser,
  getAllUsers,
  getUserById
} from '../controllers/userController.js'

const router = Router()

router.get('/', getAllUsers)
router.get('/:id', getUserById)
router.post('/', createUser)

export default router