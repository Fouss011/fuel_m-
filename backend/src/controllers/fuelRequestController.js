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
      parseId(req.body?.chief_id) ||
      parseId(req.body?.pump_attendant_id),
    structureId:
      parseId(req.headers['x-structure-id']) ||
      parseId(req.query.structure_id) ||
      parseId(req.body?.structure_id),
    structureName:
      normalizeString(req.headers['x-structure-name']) ||
      normalizeString(req.query.structure_name) ||
      normalizeString(req.body?.structure_name)
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
  const { data, error } = await supabase
    .from('structures')
    .select('id, name')
    .ilike('name', structureName)
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

export async function createFuelRequest(req, res, next) {
  try {
    const {
      driver_id,
      driver_name,
      truck_number,
      fuel_type,
      requested_liters,
      structure_id,
      structure_name
    } = req.body

    const context = getContext(req)

    const cleanDriverId = parseId(driver_id) || context.userId
    const cleanDriverName = normalizeString(driver_name)
    const cleanTruckNumber = normalizeString(truck_number)?.toUpperCase() || null
    const cleanFuelType = normalizeString(fuel_type)
    let finalStructureId = parseId(structure_id) || context.structureId
    let finalStructureName = normalizeString(structure_name) || context.structureName
    const liters = parsePositiveNumber(requested_liters)

    if (!cleanDriverName || !cleanTruckNumber || !cleanFuelType || requested_liters === undefined) {
      return res.status(400).json({
        success: false,
        message: 'driver_name, truck_number, fuel_type et requested_liters sont obligatoires'
      })
    }

    if (Number.isNaN(liters)) {
      return res.status(400).json({
        success: false,
        message: 'requested_liters doit être un nombre supérieur à 0'
      })
    }

    if (!finalStructureId && !finalStructureName) {
      return res.status(400).json({
        success: false,
        message: 'La structure est obligatoire pour créer une demande'
      })
    }

    if (cleanDriverId) {
      const driver = await getUserById(cleanDriverId)

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: 'Chauffeur introuvable'
        })
      }

      if (driver.role !== 'driver') {
        return res.status(400).json({
          success: false,
          message: 'L’utilisateur fourni n’est pas un chauffeur'
        })
      }

      if (!finalStructureId && driver.structure_id) {
        finalStructureId = driver.structure_id
      }
    }

    if (!finalStructureId && finalStructureName) {
      const structureByName = await getStructureByName(finalStructureName)

      if (!structureByName) {
        return res.status(404).json({
          success: false,
          message: 'Structure introuvable. Vérifie le nom de la structure.'
        })
      }

      finalStructureId = structureByName.id
      finalStructureName = structureByName.name
    }

    if (finalStructureId) {
      const structure = await getStructureById(finalStructureId)

      if (!structure) {
        return res.status(404).json({
          success: false,
          message: 'Structure introuvable'
        })
      }

      finalStructureName = structure.name
    }

    if (!finalStructureId || !finalStructureName) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de déterminer la structure liée à cette demande'
      })
    }

    const payload = {
      structure_id: finalStructureId,
      structure_name: finalStructureName,
      driver_id: cleanDriverId || null,
      driver_name: cleanDriverName,
      truck_number: cleanTruckNumber,
      fuel_type: cleanFuelType,
      requested_liters: liters,
      status: 'pending'
    }

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

    res.status(201).json({
      success: true,
      message: 'Demande de carburant créée avec succès',
      data
    })
  } catch (error) {
    next(error)
  }
}

export async function getAllFuelRequests(req, res, next) {
  try {
    const {
      status,
      role,
      user_id,
      driver_name,
      truck_number,
      structure_id,
      structure_name
    } = req.query

    const context = getContext(req)

    const cleanRole = normalizeString(role) || context.role
    const cleanUserId = parseId(user_id) || context.userId
    const cleanStructureId = parseId(structure_id) || context.structureId
    const cleanStructureName = normalizeString(structure_name) || context.structureName

    if (!cleanStructureId && !cleanStructureName) {
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

    if (cleanStructureId) {
      query = query.eq('structure_id', cleanStructureId)
    } else if (cleanStructureName) {
      query = query.ilike('structure_name', cleanStructureName)
    }

    if (cleanRole === 'driver' && cleanUserId) {
      query = query.eq('driver_id', cleanUserId)
    }

    if (driver_name) {
      query = query.ilike('driver_name', `%${String(driver_name).trim()}%`)
    }

    if (truck_number) {
      query = query.ilike('truck_number', `%${String(truck_number).trim()}%`)
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
    const { id } = req.params
    const context = getContext(req)

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

    if (context.structureId && data.structure_id !== context.structureId) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé à cette demande'
      })
    }

    if (!context.structureId && context.structureName) {
      const requestStructureName = normalizeString(data.structure_name)
      if (requestStructureName !== context.structureName) {
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
    const { id } = req.params
    const { chief_id, approved_liters } = req.body
    const context = getContext(req)

    const cleanChiefId = parseId(chief_id) || context.userId
    const liters = parsePositiveNumber(approved_liters)

    if (!cleanChiefId || approved_liters === undefined) {
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

    const chief = await getUserById(cleanChiefId)

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

    if (chief.structure_id !== existing.structure_id) {
      return res.status(403).json({
        success: false,
        message: 'Ce chef ne peut pas valider une demande d’une autre structure'
      })
    }

    const { data, error } = await supabase
      .from('fuel_requests')
      .update({
        chief_id: cleanChiefId,
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
    const { id } = req.params
    const { chief_id } = req.body
    const context = getContext(req)

    const cleanChiefId = parseId(chief_id) || context.userId

    if (!cleanChiefId) {
      return res.status(400).json({
        success: false,
        message: 'chief_id est obligatoire'
      })
    }

    const chief = await getUserById(cleanChiefId)

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

    if (chief.structure_id !== existing.structure_id) {
      return res.status(403).json({
        success: false,
        message: 'Ce chef ne peut pas refuser une demande d’une autre structure'
      })
    }

    const { data, error } = await supabase
      .from('fuel_requests')
      .update({
        chief_id: cleanChiefId,
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
    const { id } = req.params
    const { pump_attendant_id, served_liters, amount } = req.body
    const context = getContext(req)

    const cleanPumpId = parseId(pump_attendant_id) || context.userId
    const liters = parsePositiveNumber(served_liters)
    const totalAmount = parseOptionalNumber(amount)

    if (!cleanPumpId || served_liters === undefined || amount === undefined || amount === '') {
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

    if (Number.isNaN(totalAmount) || totalAmount === null || totalAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Le montant est obligatoire et doit être un nombre valide'
      })
    }

    const pump = await getUserById(cleanPumpId)

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

    if (pump.structure_id !== existing.structure_id) {
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
        pump_attendant_id: cleanPumpId,
        served_liters: liters,
        amount: totalAmount,
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