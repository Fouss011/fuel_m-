import { supabase } from '../config/supabaseClient.js'

function normalizeString(value) {
  if (value === undefined || value === null) return null
  const clean = String(value).trim()
  return clean || null
}

function normalizePhone(value) {
  const clean = normalizeString(value)
  return clean ? clean.replace(/\s+/g, '') : null
}

function normalizeTruckNumber(value) {
  const clean = normalizeString(value)
  return clean ? clean.toUpperCase() : null
}

function normalizePin(value) {
  const clean = normalizeString(value)
  return clean ? clean.replace(/\s+/g, '') : null
}

function isValidPin(pin) {
  if (pin === null || pin === undefined || pin === '') return true
  return /^[0-9]{4,8}$/.test(String(pin))
}

function sanitizeUser(user) {
  return {
    id: user.id,
    structure_id: user.structure_id,
    name: user.name,
    phone: user.phone,
    truck_number: user.truck_number,
    role: user.role,
    pin_code: user.pin_code || null,
    is_active: user.is_active,
    created_at: user.created_at
  }
}

async function ensureStructureExists(structureId) {
  const { data, error } = await supabase
    .from('structures')
    .select('id, name, structure_code')
    .eq('id', structureId)
    .maybeSingle()

  if (error) throw error
  return data
}

function ensureChiefOwnsStructure(req, structureId) {
  return Number(req.auth?.structureId) === Number(structureId)
}

export async function getUsersByStructure(req, res, next) {
  try {
    const structureId = Number(req.params.structureId || req.query.structure_id)

    if (!Number.isInteger(structureId) || structureId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant structure invalide.'
      })
    }

    if (!ensureChiefOwnsStructure(req, structureId)) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé à cette structure.'
      })
    }

    const structure = await ensureStructureExists(structureId)

    if (!structure) {
      return res.status(404).json({
        success: false,
        message: 'Structure introuvable.'
      })
    }

    const role = normalizeString(req.query.role)

    let query = supabase
      .from('users')
      .select('id, structure_id, name, phone, truck_number, role, pin_code, is_active, created_at')
      .eq('structure_id', structureId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (role) {
      query = query.eq('role', role)
    }

    const { data, error } = await query

    if (error) throw error

    return res.json({
      success: true,
      data: {
        structure,
        users: (data || []).map(sanitizeUser)
      }
    })
  } catch (error) {
    next(error)
  }
}

export async function createDriver(req, res, next) {
  try {
    const structureId = Number(req.body?.structure_id)
    const name = normalizeString(req.body?.name)
    const phone = normalizePhone(req.body?.phone)
    const truckNumber = normalizeTruckNumber(req.body?.truck_number)
    const pinCode = normalizePin(req.body?.pin_code)

    if (!Number.isInteger(structureId) || structureId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'La structure est obligatoire.'
      })
    }

    if (!ensureChiefOwnsStructure(req, structureId)) {
      return res.status(403).json({
        success: false,
        message: 'Tu ne peux pas créer un chauffeur dans une autre structure.'
      })
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Le nom du chauffeur est obligatoire.'
      })
    }

    if (!truckNumber) {
      return res.status(400).json({
        success: false,
        message: 'Le numéro du camion est obligatoire.'
      })
    }

    if (!pinCode) {
      return res.status(400).json({
        success: false,
        message: 'Le code PIN du chauffeur est obligatoire.'
      })
    }

    if (!isValidPin(pinCode)) {
      return res.status(400).json({
        success: false,
        message: 'Le code PIN du chauffeur doit contenir entre 4 et 8 chiffres.'
      })
    }

    const structure = await ensureStructureExists(structureId)

    if (!structure) {
      return res.status(404).json({
        success: false,
        message: 'Structure introuvable.'
      })
    }

    const { data: existingDriver, error: existingDriverError } = await supabase
      .from('users')
      .select('id')
      .eq('structure_id', structureId)
      .eq('role', 'driver')
      .ilike('name', name)
      .maybeSingle()

    if (existingDriverError) throw existingDriverError

    if (existingDriver) {
      return res.status(409).json({
        success: false,
        message: 'Un chauffeur avec ce nom existe déjà dans cette structure.'
      })
    }

    if (phone) {
      const { data: existingPhone, error: existingPhoneError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phone)
        .maybeSingle()

      if (existingPhoneError) throw existingPhoneError

      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message: 'Ce numéro de téléphone est déjà utilisé.'
        })
      }
    }

    const payload = {
      structure_id: structureId,
      name,
      phone,
      truck_number: truckNumber,
      role: 'driver',
      is_active: true,
      pin_code: pinCode
    }

    const { data, error } = await supabase
      .from('users')
      .insert([payload])
      .select()
      .single()

    if (error) throw error

    return res.status(201).json({
      success: true,
      message: 'Chauffeur créé avec succès.',
      data: sanitizeUser(data)
    })
  } catch (error) {
    next(error)
  }
}

export async function createPumpAttendant(req, res, next) {
  try {
    const structureId = Number(req.body?.structure_id)
    const name = normalizeString(req.body?.name)
    const phone = normalizePhone(req.body?.phone)
    const pinCode = normalizePin(req.body?.pin_code)

    if (!Number.isInteger(structureId) || structureId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'La structure est obligatoire.'
      })
    }

    if (!ensureChiefOwnsStructure(req, structureId)) {
      return res.status(403).json({
        success: false,
        message: 'Tu ne peux pas créer un pompiste dans une autre structure.'
      })
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Le nom du pompiste est obligatoire.'
      })
    }

    if (!pinCode) {
      return res.status(400).json({
        success: false,
        message: 'Le code PIN du pompiste est obligatoire.'
      })
    }

    if (!isValidPin(pinCode)) {
      return res.status(400).json({
        success: false,
        message: 'Le code PIN doit contenir entre 4 et 8 chiffres.'
      })
    }

    const structure = await ensureStructureExists(structureId)

    if (!structure) {
      return res.status(404).json({
        success: false,
        message: 'Structure introuvable.'
      })
    }

    const { data: existingPump, error: existingPumpError } = await supabase
      .from('users')
      .select('id')
      .eq('structure_id', structureId)
      .eq('role', 'pump_attendant')
      .ilike('name', name)
      .maybeSingle()

    if (existingPumpError) throw existingPumpError

    if (existingPump) {
      return res.status(409).json({
        success: false,
        message: 'Un pompiste avec ce nom existe déjà dans cette structure.'
      })
    }

    if (phone) {
      const { data: existingPhone, error: existingPhoneError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phone)
        .maybeSingle()

      if (existingPhoneError) throw existingPhoneError

      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message: 'Ce numéro de téléphone est déjà utilisé.'
        })
      }
    }

    const payload = {
      structure_id: structureId,
      name,
      phone,
      truck_number: null,
      role: 'pump_attendant',
      pin_code: pinCode,
      is_active: true
    }

    const { data, error } = await supabase
      .from('users')
      .insert([payload])
      .select()
      .single()

    if (error) throw error

    return res.status(201).json({
      success: true,
      message: 'Pompiste créé avec succès.',
      data: sanitizeUser(data)
    })
  } catch (error) {
    next(error)
  }
}

export async function updateUser(req, res, next) {
  try {
    const userId = Number(req.params.id)

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant utilisateur invalide.'
      })
    }

    const { data: existingUser, error: existingUserError } = await supabase
      .from('users')
      .select('id, structure_id, name, phone, truck_number, role, pin_code, is_active')
      .eq('id', userId)
      .maybeSingle()

    if (existingUserError) throw existingUserError

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable.'
      })
    }

    if (!ensureChiefOwnsStructure(req, existingUser.structure_id)) {
      return res.status(403).json({
        success: false,
        message: 'Tu ne peux pas modifier un utilisateur d’une autre structure.'
      })
    }

    const updates = {}

    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
      const name = normalizeString(req.body.name)
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Le nom ne peut pas être vide.'
        })
      }
      updates.name = name
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'phone')) {
      updates.phone = normalizePhone(req.body.phone)
    }

    if (existingUser.role === 'driver' && Object.prototype.hasOwnProperty.call(req.body, 'truck_number')) {
      const truckNumber = normalizeTruckNumber(req.body.truck_number)
      if (!truckNumber) {
        return res.status(400).json({
          success: false,
          message: 'Le numéro du camion est obligatoire pour un chauffeur.'
        })
      }
      updates.truck_number = truckNumber
    }

    if (
      (existingUser.role === 'driver' || existingUser.role === 'pump_attendant') &&
      Object.prototype.hasOwnProperty.call(req.body, 'pin_code')
    ) {
      const pinCode = normalizePin(req.body.pin_code)

      if (!pinCode) {
        return res.status(400).json({
          success: false,
          message: 'Le code PIN est obligatoire.'
        })
      }

      if (!isValidPin(pinCode)) {
        return res.status(400).json({
          success: false,
          message: 'Le code PIN doit contenir entre 4 et 8 chiffres.'
        })
      }

      updates.pin_code = pinCode
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'is_active')) {
      updates.is_active = Boolean(req.body.is_active)
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune modification fournie.'
      })
    }

    if (updates.phone) {
      const { data: existingPhoneUser, error: existingPhoneUserError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', updates.phone)
        .neq('id', userId)
        .maybeSingle()

      if (existingPhoneUserError) throw existingPhoneUserError

      if (existingPhoneUser) {
        return res.status(409).json({
          success: false,
          message: 'Ce numéro de téléphone est déjà utilisé.'
        })
      }
    }

    if (updates.name) {
      const { data: duplicateName, error: duplicateNameError } = await supabase
        .from('users')
        .select('id')
        .eq('structure_id', existingUser.structure_id)
        .eq('role', existingUser.role)
        .ilike('name', updates.name)
        .neq('id', userId)
        .maybeSingle()

      if (duplicateNameError) throw duplicateNameError

      if (duplicateName) {
        return res.status(409).json({
          success: false,
          message: `Un autre ${existingUser.role === 'driver' ? 'chauffeur' : 'pompiste'} avec ce nom existe déjà.`
        })
      }
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    return res.json({
      success: true,
      message: 'Utilisateur mis à jour avec succès.',
      data: sanitizeUser(data)
    })
  } catch (error) {
    next(error)
  }
}

export async function deactivateUser(req, res, next) {
  try {
    const userId = Number(req.params.id)

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant utilisateur invalide.'
      })
    }

    const { data: existingUser, error: existingUserError } = await supabase
      .from('users')
      .select('id, structure_id, role')
      .eq('id', userId)
      .maybeSingle()

    if (existingUserError) throw existingUserError

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable.'
      })
    }

    if (existingUser.role === 'chief') {
      return res.status(400).json({
        success: false,
        message: 'Le chef principal ne peut pas être désactivé ici.'
      })
    }

    if (!ensureChiefOwnsStructure(req, existingUser.structure_id)) {
      return res.status(403).json({
        success: false,
        message: 'Tu ne peux pas désactiver un utilisateur d’une autre structure.'
      })
    }

    const { data, error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    return res.json({
      success: true,
      message: 'Utilisateur désactivé avec succès.',
      data: sanitizeUser(data)
    })
  } catch (error) {
    next(error)
  }
}