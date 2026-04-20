import { verifySessionToken } from '../utils/sessionToken.js'

function normalizeRole(value) {
  if (value === undefined || value === null) return null
  const clean = String(value).trim()
  return clean || null
}

export function attachSession(req, res, next) {
  const rawToken =
    req.headers['x-session-token'] ||
    req.headers.authorization?.replace(/^Bearer\s+/i, '')

  const session = verifySessionToken(rawToken)

  req.auth = session || null
  next()
}

export function requireSession(req, res, next) {
  if (!req.auth) {
    return res.status(401).json({
      success: false,
      code: 'SESSION_REQUIRED',
      message: 'Session invalide ou expirée. Reconnecte-toi pour continuer.'
    })
  }

  next()
}

export function requireRole(...roles) {
  const expectedRoles = roles.map((role) => normalizeRole(role)).filter(Boolean)

  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        success: false,
        code: 'SESSION_REQUIRED',
        message: 'Session invalide ou expirée. Reconnecte-toi pour continuer.'
      })
    }

    if (!expectedRoles.includes(normalizeRole(req.auth.role))) {
      return res.status(403).json({
        success: false,
        code: 'ROLE_NOT_ALLOWED',
        message: 'Tu n’as pas les droits nécessaires pour effectuer cette action.'
      })
    }

    next()
  }
}