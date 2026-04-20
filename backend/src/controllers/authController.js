import { supabase } from '../config/supabaseClient.js'
import { createSessionToken } from '../utils/sessionToken.js'

function normalizeString(value) {
  if (value === undefined || value === null) return null
  const clean = String(value).trim()
  return clean || null
}

function mapRoleLabel(role) {
  switch (role) {
    case 'chief':
      return 'chef'
    case 'pump_attendant':
      return 'pompiste'
    case 'driver':
      return 'chauffeur'
    default:
      return role || 'utilisateur'
  }
}

export async function pinLogin(req, res, next) {
  try {
    const role = normalizeString(req.body?.role)
    const structureId = Number(req.body?.structure_id)
    const pin = normalizeString(req.body?.pin)

    if (!role || !['chief', 'pump_attendant'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Le rôle est invalide. Utilise chief ou pump_attendant.'
      })
    }

    if (!Number.isInteger(structureId) || structureId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'La structure est obligatoire pour ouvrir une session.'
      })
    }

    if (!pin) {
      return res.status(400).json({
        success: false,
        message: 'Le code PIN est obligatoire.'
      })
    }

    const { data: structure, error: structureError } = await supabase
      .from('structures')
      .select('id, name, pin_chief, pin_pump')
      .eq('id', structureId)
      .single()

    if (structureError) {
      if (structureError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Structure introuvable.'
        })
      }
      throw structureError
    }

    const expectedPin = role === 'chief' ? structure.pin_chief : structure.pin_pump

    if (!expectedPin || String(expectedPin).trim() !== pin) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_PIN',
        message: 'PIN incorrect. Vérifie le code puis réessaie.'
      })
    }

    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, name, phone, role, structure_id')
      .eq('structure_id', structureId)
      .eq('role', role)
      .limit(1)

    if (userError) throw userError

    const user = users?.[0]

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `Aucun ${mapRoleLabel(role)} n’est rattaché à cette structure.`
      })
    }

    const now = Date.now()
    const exp = now + Number(process.env.SESSION_TTL_HOURS || 12) * 60 * 60 * 1000

    const session = {
      userId: user.id,
      userName: user.name,
      role: user.role,
      structureId: structure.id,
      structureName: structure.name,
      iat: now,
      exp
    }

    const token = createSessionToken(session)

    return res.json({
      success: true,
      message: `Connexion ${mapRoleLabel(role)} réussie.`,
      data: {
        token,
        expires_at: new Date(exp).toISOString(),
        session
      }
    })
  } catch (error) {
    next(error)
  }
}

export function getCurrentSession(req, res) {
  if (!req.auth) {
    return res.status(401).json({
      success: false,
      message: 'Session invalide ou expirée.'
    })
  }

  return res.json({
    success: true,
    data: req.auth
  })
}