import { supabase } from '../config/supabaseClient.js'

const VALID_ROLES = ['driver', 'chief', 'pump_attendant']

function normalizeString(value) {
  if (value === undefined || value === null) return null
  const cleaned = String(value).trim()
  return cleaned ? cleaned : null
}

function normalizePhone(value) {
  const cleaned = normalizeString(value)
  return cleaned ? cleaned.replace(/\s+/g, '') : null
}

function parseStructureId(value) {
  const normalized = normalizeString(value)

  if (!normalized) return null

  const parsed = Number(normalized)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return NaN
  }

  return parsed
}

function getStructureIdFromRequest(req) {
  return (
    req.body?.structure_id ??
    req.query?.structure_id ??
    req.headers['x-structure-id'] ??
    null
  )
}

async function ensureStructureExists(structureId) {
  const { data, error } = await supabase
    .from('structures')
    .select('id, name')
    .eq('id', structureId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw error
  }

  return data
}

export async function createUser(req, res, next) {
  try {
    const {
      structure_id,
      name,
      phone,
      password_hash,
      role
    } = req.body

    const cleanName = normalizeString(name)
    const cleanPhone = normalizePhone(phone)
    const cleanPassword = normalizeString(password_hash)
    const cleanRole = normalizeString(role)
    const parsedStructureId = parseStructureId(structure_id)

    if (!cleanName || !cleanPhone || !cleanRole) {
      return res.status(400).json({
        success: false,
        message: 'structure_id, name, phone et role sont obligatoires'
      })
    }

    if (Number.isNaN(parsedStructureId) || !parsedStructureId) {
      return res.status(400).json({
        success: false,
        message: 'structure_id est obligatoire et doit être valide'
      })
    }

    if (!VALID_ROLES.includes(cleanRole)) {
      return res.status(400).json({
        success: false,
        message: 'Rôle invalide'
      })
    }

    const structure = await ensureStructureExists(parsedStructureId)

    if (!structure) {
      return res.status(404).json({
        success: false,
        message: 'Structure introuvable'
      })
    }

    const { data: existingPhoneUser, error: existingPhoneError } = await supabase
      .from('users')
      .select('id, phone')
      .eq('phone', cleanPhone)
      .maybeSingle()

    if (existingPhoneError) throw existingPhoneError

    if (existingPhoneUser) {
      return res.status(409).json({
        success: false,
        message: 'Ce numéro de téléphone est déjà utilisé'
      })
    }

    if (cleanRole === 'chief') {
      const { data: existingChief, error: existingChiefError } = await supabase
        .from('users')
        .select('id, name')
        .eq('structure_id', parsedStructureId)
        .eq('role', 'chief')
        .maybeSingle()

      if (existingChiefError) throw existingChiefError

      if (existingChief) {
        return res.status(409).json({
          success: false,
          message: 'Cette structure possède déjà un chef'
        })
      }
    }

    const payload = {
      structure_id: parsedStructureId,
      name: cleanName,
      phone: cleanPhone,
      password_hash: cleanPassword,
      role: cleanRole
    }

    const { data, error } = await supabase
      .from('users')
      .insert([payload])
      .select(`
        *,
        structure:structures(id, name)
      `)
      .single()

    if (error) throw error

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data
    })
  } catch (error) {
    next(error)
  }
}

export async function getAllUsers(req, res, next) {
  try {
    const {
      role,
      search
    } = req.query

    const requestedStructureId = getStructureIdFromRequest(req)
    const parsedStructureId = parseStructureId(requestedStructureId)

    if (Number.isNaN(parsedStructureId) || !parsedStructureId) {
      return res.status(400).json({
        success: false,
        message: 'structure_id est obligatoire pour charger les utilisateurs'
      })
    }

    let query = supabase
      .from('users')
      .select(`
        *,
        structure:structures(id, name)
      `)
      .eq('structure_id', parsedStructureId)
      .order('created_at', { ascending: false })

    if (role) {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Rôle invalide'
        })
      }

      query = query.eq('role', role)
    }

    if (search) {
      const cleanSearch = String(search).trim()
      query = query.or(`name.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%`)
    }

    const { data, error } = await query

    if (error) throw error

    res.json({
      success: true,
      data
    })
  } catch (error) {
    next(error)
  }
}

export async function getUserById(req, res, next) {
  try {
    const { id } = req.params
    const requestedStructureId = getStructureIdFromRequest(req)
    const parsedStructureId = parseStructureId(requestedStructureId)

    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        structure:structures(id, name)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur introuvable'
        })
      }

      throw error
    }

    if (parsedStructureId && data.structure_id !== parsedStructureId) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé à cet utilisateur'
      })
    }

    res.json({
      success: true,
      data
    })
  } catch (error) {
    next(error)
  }
}