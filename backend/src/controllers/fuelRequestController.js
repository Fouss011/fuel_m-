import { supabase } from '../config/supabaseClient.js'

const VALID_STATUSES = ['pending', 'approved', 'rejected', 'served']

function normalizeString(value) {
  if (value === undefined || value === null) return null
  const cleaned = String(value).trim()
  return cleaned ? cleaned : null
}

function parsePositiveNumber(value) {
  const parsed = Number(value)
  if (Number.isNaN(parsed) || parsed <= 0) return NaN
  return parsed
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return NaN
  return parsed
}

function parseId(value) {
  const normalized = normalizeString(value)
  if (!normalized) return null

  const parsed = Number(normalized)
  if (!Number.isInteger(parsed) || parsed <= 0) return NaN

  return parsed
}

function getContext(req) {
  return {
    role: normalizeString(req.headers['x-user-role']) || normalizeString(req.query.role),
    userId:
      parseId(req.headers['x-user-id']) ||
      parseId(req.query.user_id) ||
      parseId(req.body?.driver_id) ||
      null,
    structureId:
      parseId(req.headers['x-structure-id']) ||
      parseId(req.query.structure_id) ||
      parseId(req.body?.structure_id) ||
      null,
    structureName:
      normalizeString(req.headers['x-structure-name']) ||
      normalizeString(req.query.structure_name) ||
      normalizeString(req.body?.structure_name) ||
      null
  }
}

async function getStructureById(structureId) {
  const { data, error } = await supabase
    .from('structures')
    .select('id, name')
    .eq('id', structureId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data
}

async function getStructureByName(structureName) {
  const cleanName = normalizeString(structureName)
  if (!cleanName) return null

  const { data, error } = await supabase
    .from('structures')
    .select('id, name')
    .ilike('name', cleanName)
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function getUserById(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone, role, structure_id')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data
}

async function resolveStructure({ structureId, structureName, driverId }) {
  let finalStructureId = structureId || null
  let finalStructureName = structureName || null

  if (!finalStructureId && driverId) {
    const driver = await getUserById(driverId)

    if (!driver) {
      throw {
        status: 404,
        success: false,
        message: 'Chauffeur introuvable'
      }
    }

    if (driver.role !== 'driver') {
      throw {
        status: 400,
        success: false,
        message: 'L’utilisateur fourni n’est pas un chauffeur'
      }
    }

    if (driver.structure_id) {
      finalStructureId = driver.structure_id
    }
  }

  if (!finalStructureId && finalStructureName) {
    const structureByName = await getStructureByName(finalStructureName)

    if (!structureByName) {
      throw {
        status: 404,
        success: false,
        message: 'Structure introuvable. Vérifie le nom de la structure.'
      }
    }

    finalStructureId = structureByName.id
    finalStructureName = structureByName.name
  }

  if (finalStructureId) {
    const structureById = await getStructureById(finalStructureId)

    if (!structureById) {
      throw {
        status: 404,
        success: false,
        message: 'Structure introuvable'
      }
    }

    finalStructureId = structureById.id
    finalStructureName = structureById.name
  }

  if (!finalStructureId || !finalStructureName) {
    throw {
      status: 400,
      success: false,
      message: 'Impossible de déterminer la structure liée à cette demande'
    }
  }

  return {
    structure_id: finalStructureId,
    structure_name: finalStructureName
  }
}

export async function createFuelRequest(req, res, next) {
  try {
    const context = getContext(req)

    const cleanDriverId = parseId(req.body?.driver_id) || context.userId
    const cleanDriverName = normalizeString(req.body?.driver_name)
    const cleanTruckNumber = normalizeString(req.body?.truck_number)?.toUpperCase() || null
    const cleanFuelType = normalizeString(req.body?.fuel_type)
    const requestedLiters = parsePositiveNumber(req.body?.requested_liters)

    if (!cleanDriverName || !cleanTruckNumber || !cleanFuelType || req.body?.requested_liters === undefined) {
      return res.status(400).json({
        success: false,
        message: 'driver_name, truck_number, fuel_type et requested_liters sont obligatoires'
      })
    }

    if (Number.isNaN(requestedLiters)) {
      return res.status(400).json({
        success: false,
        message: 'requested_liters doit être un nombre supérieur à 0'
      })
    }

    const resolvedStructure = await resolveStructure({
      structureId: parseId(req.body?.structure_id) || context.structureId,
      structureName: normalizeString(req.body?.structure_name) || context.structureName,
      driverId: cleanDriverId
    })

    const payload = {
      structure_id: resolvedStructure.structure_id,
      structure_name: resolvedStructure.structure_name,
      driver_id: cleanDriverId || null,
      driver_name: cleanDriverName,
      truck_number: cleanTruckNumber,
      fuel_type: cleanFuelType,
      requested_liters: requestedLiters,
      status: 'pending'
    }

    console.log('Payload final fuel request:', payload)

    const { data, error } = await supabase
      .from('fuel_requests')
      .insert([payload])
      .select(`
        *,
        driver:users!fuel_requests_driver_id_fkey(id, name, phone, role),
        chief:users!fuel_requests_chief_id_fkey(id, name, phone, role),
        pump_attendant:users!fuel_requests_pump_attendant_id_fkey(id, name, phone, role)
      `)
      .single()

    if (error) throw error

    return res.status(201).json({
      success: true,
      message: 'Demande de carburant créée avec succès',
      data
    })
  } catch (error) {
    if (error?.success === false) {
      return res.status(error.status || 400).json(error)
    }

    next(error)
  }
}

export async function getAllFuelRequests(req, res, next) {
  try {
    const context = getContext(req)

    const status = normalizeString(req.query.status)
    const role = normalizeString(req.query.role) || context.role
    const userId = parseId(req.query.user_id) || context.userId
    const structureId = parseId(req.query.structure_id) || context.structureId
    const structureName = normalizeString(req.query.structure_name) || context.structureName
    const driverName = normalizeString(req.query.driver_name)
    const truckNumber = normalizeString(req.query.truck_number)

    if (!structureId && !structureName) {
      return res.status(400).json({
        success: false,
        message: 'La structure est obligatoire pour charger les demandes'
      })
    }

    let query = supabase
      .from('fuel_requests')
      .select(`
        *,
        driver:users!fuel_requests_driver_id_fkey(id, name, phone, role),
        chief:users!fuel_requests_chief_id_fkey(id, name, phone, role),
        pump_attendant:users!fuel_requests_pump_attendant_id_fkey(id, name, phone, role)
      `)
      .order('created_at', { ascending: false })

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Statut invalide'
        })
      }
      query = query.eq('status', status)
    }

    if (structureId) {
      query = query.eq('structure_id', structureId)
    } else {
      query = query.ilike('structure_name', structureName)
    }

    if (role === 'driver' && userId) {
      query = query.eq('driver_id', userId)
    }

    if (driverName) {
      query = query.ilike('driver_name', `%${driverName}%`)
    }

    if (truckNumber) {
      query = query.ilike('truck_number', `%${truckNumber}%`)
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

export async function getFuelRequestById(req, res, next) {
  try {
    const context = getContext(req)
    const { id } = req.params

    const { data, error } = await supabase
      .from('fuel_requests')
      .select(`
        *,
        driver:users!fuel_requests_driver_id_fkey(id, name, phone, role),
        chief:users!fuel_requests_chief_id_fkey(id, name, phone, role),
        pump_attendant:users!fuel_requests_pump_attendant_id_fkey(id, name, phone, role)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Demande introuvable'
        })
      }
      throw error
    }

    if (context.structureId && Number(data.structure_id) !== Number(context.structureId)) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé à cette demande'
      })
    }

    if (!context.structureId && context.structureName) {
      if (normalizeString(data.structure_name) !== context.structureName) {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé à cette demande'
        })
      }
    }

    res.json({
      success: true,
      data
    })
  } catch (error) {
    next(error)
  }
}

export async function approveFuelRequest(req, res, next) {
  try {
    const context = getContext(req)
    const { id } = req.params
    const chiefId = parseId(req.body?.chief_id) || context.userId
    const liters = parsePositiveNumber(req.body?.approved_liters)

    if (!chiefId || req.body?.approved_liters === undefined) {
      return res.status(400).json({
        success: false,
        message: 'chief_id et approved_liters sont obligatoires'
      })
    }

    if (Number.isNaN(liters)) {
      return res.status(400).json({
        success: false,
        message: 'approved_liters doit être un nombre supérieur à 0'
      })
    }

    const chief = await getUserById(chiefId)

    if (!chief) {
      return res.status(404).json({
        success: false,
        message: 'Chef introuvable'
      })
    }

    if (chief.role !== 'chief') {
      return res.status(400).json({
        success: false,
        message: 'L’utilisateur fourni n’est pas un chef'
      })
    }

    const { data: existing, error: findError } = await supabase
      .from('fuel_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (findError) {
      if (findError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Demande introuvable'
        })
      }
      throw findError
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Seules les demandes en attente peuvent être validées'
      })
    }

    if (Number(chief.structure_id) !== Number(existing.structure_id)) {
      return res.status(403).json({
        success: false,
        message: 'Ce chef ne peut pas valider une demande d’une autre structure'
      })
    }

    const { data, error } = await supabase
      .from('fuel_requests')
      .update({
        chief_id: chiefId,
        approved_liters: liters,
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        driver:users!fuel_requests_driver_id_fkey(id, name, phone, role),
        chief:users!fuel_requests_chief_id_fkey(id, name, phone, role),
        pump_attendant:users!fuel_requests_pump_attendant_id_fkey(id, name, phone, role)
      `)
      .single()

    if (error) throw error

    res.json({
      success: true,
      message: 'Demande validée avec succès',
      data
    })
  } catch (error) {
    next(error)
  }
}

export async function rejectFuelRequest(req, res, next) {
  try {
    const context = getContext(req)
    const { id } = req.params
    const chiefId = parseId(req.body?.chief_id) || context.userId

    if (!chiefId) {
      return res.status(400).json({
        success: false,
        message: 'chief_id est obligatoire'
      })
    }

    const chief = await getUserById(chiefId)

    if (!chief) {
      return res.status(404).json({
        success: false,
        message: 'Chef introuvable'
      })
    }

    if (chief.role !== 'chief') {
      return res.status(400).json({
        success: false,
        message: 'L’utilisateur fourni n’est pas un chef'
      })
    }

    const { data: existing, error: findError } = await supabase
      .from('fuel_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (findError) {
      if (findError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Demande introuvable'
        })
      }
      throw findError
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Seules les demandes en attente peuvent être refusées'
      })
    }

    if (Number(chief.structure_id) !== Number(existing.structure_id)) {
      return res.status(403).json({
        success: false,
        message: 'Ce chef ne peut pas refuser une demande d’une autre structure'
      })
    }

    const { data, error } = await supabase
      .from('fuel_requests')
      .update({
        chief_id: chiefId,
        status: 'rejected',
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        driver:users!fuel_requests_driver_id_fkey(id, name, phone, role),
        chief:users!fuel_requests_chief_id_fkey(id, name, phone, role),
        pump_attendant:users!fuel_requests_pump_attendant_id_fkey(id, name, phone, role)
      `)
      .single()

    if (error) throw error

    res.json({
      success: true,
      message: 'Demande refusée',
      data
    })
  } catch (error) {
    next(error)
  }
}

export async function serveFuelRequest(req, res, next) {
  try {
    const context = getContext(req)
    const { id } = req.params
    const pumpId = parseId(req.body?.pump_attendant_id) || context.userId
    const liters = parsePositiveNumber(req.body?.served_liters)
    const amount = parseOptionalNumber(req.body?.amount)

    if (!pumpId || req.body?.served_liters === undefined || req.body?.amount === undefined || req.body?.amount === '') {
      return res.status(400).json({
        success: false,
        message: 'pump_attendant_id, served_liters et amount sont obligatoires'
      })
    }

    if (Number.isNaN(liters)) {
      return res.status(400).json({
        success: false,
        message: 'served_liters doit être un nombre supérieur à 0'
      })
    }

    if (Number.isNaN(amount) || amount === null || amount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Le montant est obligatoire et doit être un nombre valide'
      })
    }

    const pump = await getUserById(pumpId)

    if (!pump) {
      return res.status(404).json({
        success: false,
        message: 'Pompiste introuvable'
      })
    }

    if (pump.role !== 'pump_attendant') {
      return res.status(400).json({
        success: false,
        message: 'L’utilisateur fourni n’est pas un pompiste'
      })
    }

    const { data: existing, error: findError } = await supabase
      .from('fuel_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (findError) {
      if (findError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Demande introuvable'
        })
      }
      throw findError
    }

    if (existing.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Seules les demandes validées peuvent être servies'
      })
    }

    if (Number(pump.structure_id) !== Number(existing.structure_id)) {
      return res.status(403).json({
        success: false,
        message: 'Ce pompiste ne peut pas servir une demande d’une autre structure'
      })
    }

    const maxAllowed = Number(existing.approved_liters || existing.requested_liters || 0)

    if (liters > maxAllowed) {
      return res.status(400).json({
        success: false,
        message: `La quantité servie ne peut pas dépasser ${maxAllowed} L`
      })
    }

    const { data, error } = await supabase
      .from('fuel_requests')
      .update({
        pump_attendant_id: pumpId,
        served_liters: liters,
        amount,
        status: 'served',
        served_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        driver:users!fuel_requests_driver_id_fkey(id, name, phone, role),
        chief:users!fuel_requests_chief_id_fkey(id, name, phone, role),
        pump_attendant:users!fuel_requests_pump_attendant_id_fkey(id, name, phone, role)
      `)
      .single()

    if (error) throw error

    res.json({
      success: true,
      message: 'Livraison de carburant confirmée',
      data
    })
  } catch (error) {
    next(error)
  }
}