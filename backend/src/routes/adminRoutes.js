import { Router } from 'express'
import { authenticateSession } from '../middleware/authSession.js'
import {
  superAdminLogin,
  getAdminSummary,
  adminListStations,
  adminCreateStation,
  adminListStructures,
  adminListUsers,
  adminListTransactions,
  adminSetActive,
  adminCreateStructure
} from '../controllers/adminController.js'

const router = Router()

router.post('/login', superAdminLogin)

router.get('/summary', authenticateSession, getAdminSummary)
router.get('/stations', authenticateSession, adminListStations)
router.post('/stations', authenticateSession, adminCreateStation)
router.get('/structures', authenticateSession, adminListStructures)
router.get('/users', authenticateSession, adminListUsers)
router.get('/transactions', authenticateSession, adminListTransactions)
router.patch('/:target/:id/active', authenticateSession, adminSetActive)
router.post('/structures', authenticateSession, adminCreateStructure)

export default router