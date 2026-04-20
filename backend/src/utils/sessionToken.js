import crypto from 'crypto'

const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 12)

function getSecret() {
  return process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fuel-management-dev-secret'
}

function toBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function fromBase64Url(value) {
  const normalized = String(value)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  return Buffer.from(normalized + padding, 'base64').toString('utf8')
}

function sign(payloadEncoded) {
  return crypto
    .createHmac('sha256', getSecret())
    .update(payloadEncoded)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

export function createSessionToken(session) {
  const now = Date.now()
  const payload = {
    ...session,
    iat: now,
    exp: now + SESSION_TTL_HOURS * 60 * 60 * 1000
  }

  const payloadEncoded = toBase64Url(JSON.stringify(payload))
  const signature = sign(payloadEncoded)

  return `${payloadEncoded}.${signature}`
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return null
  }

  const [payloadEncoded, providedSignature] = token.split('.')

  if (!payloadEncoded || !providedSignature) {
    return null
  }

  const expectedSignature = sign(payloadEncoded)

  if (expectedSignature !== providedSignature) {
    return null
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadEncoded))

    if (!payload?.exp || Date.now() > Number(payload.exp)) {
      return null
    }

    return payload
  } catch {
    return null
  }
}