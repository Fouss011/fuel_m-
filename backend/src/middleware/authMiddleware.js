import { verifySessionToken } from '../utils/sessionToken.js'

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization

  if (!authHeader || typeof authHeader !== 'string') {
    return null
  }

  const [scheme, token] = authHeader.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return null
  }

  return token.trim()
}

export function authenticateSession(req, res, next) {
  try {
    const token = extractBearerToken(req)

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token manquant.'
      })
    }

    const payload = verifySessionToken(token)

    if (!payload) {
      return res.status(401).json({
        success: false,
        message: 'Session invalide ou expirée.'
      })
    }

    req.auth = payload
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Session invalide ou expirée.'
    })
  }
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        success: false,
        message: 'Session invalide ou expirée.'
      })
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé pour ce profil.'
      })
    }

    next()
  }
}

export function requireSameStructure(req, res, next) {
  if (!req.auth) {
    return res.status(401).json({
      success: false,
      message: 'Session invalide ou expirée.'
    })
  }

  const structureIdFromParams =
    req.params?.structureId ||
    req.body?.structure_id ||
    req.query?.structure_id

  if (!structureIdFromParams) {
    return next()
  }

  if (Number(req.auth.structureId) !== Number(structureIdFromParams)) {
    return res.status(403).json({
      success: false,
      message: 'Cette opération ne vous appartient pas.'
    })
  }

  next()
}