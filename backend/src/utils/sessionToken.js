import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fuel-management-secret-key'
const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 12)

export function createSessionToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: `${SESSION_TTL_HOURS}h`
  })
}

export function verifySessionToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}