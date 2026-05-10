import { Router } from 'express'
import {
  createStructure,
  getStructureById,
  getAllStructures,
  updateStructure
} from '../controllers/structureController.js'

import {
  getMyPartnerStations,
  addPartnerStation,
  removePartnerStation
} from '../controllers/stationController.js'

import {
  authenticateSession,
  authorizeRoles
} from '../middleware/authSession.js'

const router = Router()

router.post('/', createStructure)

router.get(
  '/',
  authenticateSession,
  authorizeRoles('chief'),
  getAllStructures
)

router.get(
  '/:id',
  authenticateSession,
  authorizeRoles('chief'),
  getStructureById
)

router.patch(
  '/:id',
  authenticateSession,
  authorizeRoles('chief'),
  updateStructure
)

/**
 * Stations partenaires
 */

router.get(
  '/:id/partner-stations',
  authenticateSession,
  authorizeRoles('chief'),
  getMyPartnerStations
)

router.post(
  '/:id/partner-stations',
  authenticateSession,
  authorizeRoles('chief'),
  addPartnerStation
)

router.delete(
  '/:id/partner-stations/:stationId',
  authenticateSession,
  authorizeRoles('chief'),
  removePartnerStation
)

export default router