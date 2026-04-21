import { supabase } from '../config/supabaseClient.js'
import { createSessionToken } from '../utils/sessionToken.js'

function normalizeString(value) {
  if (value === undefined || value === null) return null
  const clean = String(value).trim()
  return clean || null
}

function normalizePhone(value) {
  const clean = normalizeString(value)
  return clean ? clean.replace(/\s+/g, '') : null
}

function normalizeStructureCode(value) {
  const clean = normalizeString(value)
  return clean ? clean.toUpperCase() : null
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

function buildSession({ user, structure, extra = {} }) {
  const ttlHours = Number(process.env.SESSION_TTL_HOURS || 12)
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString()

  const sessionPayload = {
    userId: user.id,
    userName: user.name,
    role: user.role,
    structureId: structure.id,
    structureName: structure.name,
    structureCode: structure.structure_code,
    ...extra
  }

  const token = createSessionToken(sessionPayload)

  return {
    token,
    expires_at: expiresAt,
    session: sessionPayload
  }
}

export async function chiefLogin(req, res, next) {
  try {
    const phone = normalizePhone(req.body?.phone)
    const password = normalizeString(req.body?.password)

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Le numéro du chef est obligatoire.'
      })
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe est obligatoire.'
      })
    }

    const { data: structure, error } = await supabase
      .from('structures')
      .select('id, name, structure_code, owner_name, owner_phone, owner_password')
      .eq('owner_phone', phone)
      .maybeSingle()

    if (error) throw error

    if (!structure) {
      return res.status(404).json({
        success: false,
        message: 'Aucun compte chef trouvé avec ce numéro.'
      })
    }

    if (String(structure.owner_password) !== password) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Identifiants invalides.'
      })
    }

    const { data: chiefUser, error: chiefUserError } = await supabase
      .from('users')
      .select('id, name, phone, role, structure_id, is_active')
      .eq('structure_id', structure.id)
      .eq('role', 'chief')
      .eq('is_active', true)
      .maybeSingle()

    if (chiefUserError) throw chiefUserError

    if (!chiefUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur chef introuvable pour cette structure.'
      })
    }

    const authData = buildSession({
      user: chiefUser,
      structure
    })

    return res.json({
      success: true,
      message: 'Connexion chef réussie.',
      data: authData
    })
  } catch (error) {
    next(error)
  }
}

export async function driverAccess(req, res, next) {
  try {
    const structureCode = normalizeStructureCode(req.body?.structure_code)
    const driverId = Number(req.body?.driver_id)
    const pinCode = normalizeString(req.body?.pin_code)

    if (!structureCode) {
      return res.status(400).json({
        success: false,
        message: 'Le code structure est obligatoire.'
      })
    }

    if (!Number.isInteger(driverId) || driverId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Le chauffeur est obligatoire.'
      })
    }

    if (!pinCode) {
      return res.status(400).json({
        success: false,
        message: 'Le code PIN du chauffeur est obligatoire.'
      })
    }

    const { data: structure, error: structureError } = await supabase
      .from('structures')
      .select('id, name, structure_code')
      .eq('structure_code', structureCode)
      .maybeSingle()

    if (structureError) throw structureError

    if (!structure) {
      return res.status(404).json({
        success: false,
        message: 'Code structure invalide.'
      })
    }

    const { data: driver, error: driverError } = await supabase
      .from('users')
      .select('id, name, phone, truck_number, role, structure_id, is_active, pin_code')
      .eq('id', driverId)
      .eq('structure_id', structure.id)
      .eq('role', 'driver')
      .eq('is_active', true)
      .maybeSingle()

    if (driverError) throw driverError

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Chauffeur introuvable dans cette structure.'
      })
    }

    if (String(driver.pin_code || '') !== String(pinCode)) {
      return res.status(401).json({
        success: false,
        message: 'Code PIN chauffeur incorrect.'
      })
    }

    const authData = buildSession({
      user: driver,
      structure,
      extra: {
        truckNumber: driver.truck_number || null
      }
    })

    return res.json({
      success: true,
      message: 'Accès chauffeur autorisé.',
      data: authData
    })
  } catch (error) {
    next(error)
  }
}

export async function pumpAttendantAccess(req, res, next) {
  try {
    const structureCode = normalizeStructureCode(req.body?.structure_code)
    const pumpAttendantId = Number(req.body?.pump_attendant_id)
    const pinCode = normalizeString(req.body?.pin_code)

    if (!structureCode) {
      return res.status(400).json({
        success: false,
        message: 'Le code structure est obligatoire.'
      })
    }

    if (!Number.isInteger(pumpAttendantId) || pumpAttendantId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Le pompiste est obligatoire.'
      })
    }

    if (!pinCode) {
      return res.status(400).json({
        success: false,
        message: 'Le code PIN du pompiste est obligatoire.'
      })
    }

    const { data: structure, error: structureError } = await supabase
      .from('structures')
      .select('id, name, structure_code')
      .eq('structure_code', structureCode)
      .maybeSingle()

    if (structureError) throw structureError

    if (!structure) {
      return res.status(404).json({
        success: false,
        message: 'Code structure invalide.'
      })
    }

    const { data: pumpAttendant, error: pumpError } = await supabase
      .from('users')
      .select('id, name, phone, role, structure_id, is_active, pin_code')
      .eq('id', pumpAttendantId)
      .eq('structure_id', structure.id)
      .eq('role', 'pump_attendant')
      .eq('is_active', true)
      .maybeSingle()

    if (pumpError) throw pumpError

    if (!pumpAttendant) {
      return res.status(404).json({
        success: false,
        message: 'Pompiste introuvable dans cette structure.'
      })
    }

    if (String(pumpAttendant.pin_code || '') !== String(pinCode)) {
      return res.status(401).json({
        success: false,
        message: 'Code PIN pompiste incorrect.'
      })
    }

    const authData = buildSession({
      user: pumpAttendant,
      structure
    })

    return res.json({
      success: true,
      message: 'Accès pompiste autorisé.',
      data: authData
    })
  } catch (error) {
    next(error)
  }
}

export async function getStructureUsersByCode(req, res, next) {
  try {
    const structureCode = normalizeStructureCode(req.params?.structureCode || req.query?.structure_code)
    const role = normalizeString(req.query?.role)

    if (!structureCode) {
      return res.status(400).json({
        success: false,
        message: 'Le code structure est obligatoire.'
      })
    }

    const allowedRoles = ['driver', 'pump_attendant']

    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Le rôle est invalide. Utilise driver ou pump_attendant.'
      })
    }

    const { data: structure, error: structureError } = await supabase
      .from('structures')
      .select('id, name, structure_code')
      .eq('structure_code', structureCode)
      .maybeSingle()

    if (structureError) throw structureError

    if (!structure) {
      return res.status(404).json({
        success: false,
        message: 'Code structure invalide.'
      })
    }

    let query = supabase
      .from('users')
      .select('id, name, phone, truck_number, role, is_active, created_at')
      .eq('structure_id', structure.id)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (role) {
      query = query.eq('role', role)
    } else {
      query = query.in('role', allowedRoles)
    }

    const { data: users, error: usersError } = await query

    if (usersError) throw usersError

    return res.json({
      success: true,
      data: {
        structure,
        users
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