import { Router } from 'express'
import { getCurrentSession, pinLogin } from '../controllers/authController.js'
import { requireSession } from '../middleware/authSession.js'

const router = Router()

router.post('/pin-login', pinLogin)
router.get('/me', requireSession, getCurrentSession)

export default router