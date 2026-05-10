import { supabase } from '../config/supabaseClient.js'

const VALID_STATUSES = ['pending', 'approved', 'rejected', 'served']
const VALID_FUEL_TYPES = ['gasoil', 'essence']

function normalizeString(value) {
  if (value === undefined || value === null) return null
  const clean = String(value).trim()
  return clean || null
}

function normalizeFuelType(value) {
  const clean = normalizeString(value)
  return clean ? clean.toLowerCase() : null
}

function normalizeTruckNumber(value) {
  const clean = normalizeString(value)
  return clean ? clean.toUpperCase() : null
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

function parseRequiredId(value) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return NaN
  return parsed
}

function sanitizeRequest(record) {
  return record
}

async function getStructureById(structureId) {
  const { data, error } = await supabase
    .from('structures')
    .select('id, name, structure_code')
    .eq('id', structureId)
    .maybeSingle()

  if (error) throw error
  return data
}

async function getUserById(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, structure_id, station_id, name, phone, truck_number, role, is_active')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

async function getStationById(stationId) {
  const { data, error } = await supabase
    .from('station_accounts')
    .select('id, name, station_code, is_active')
    .eq('id', stationId)
    .maybeSingle()

  if (error) throw error
  return data
}

async function ensureStructureStationPartner(structureId, stationId) {
  const { data, error } = await supabase
    .from('structure_station_partners')
    .select('id')
    .eq('structure_id', structureId)
    .eq('station_id', stationId)
    .maybeSingle()

  if (error) throw error
  return !!data
}

async function getFuelRequestByIdInternal(id) {
  const { data, error } = await supabase
    .from('fuel_requests')
    .select(`
      *,
      driver:users!fuel_requests_driver_id_fkey(id, name, phone, truck_number, role),
      chief:users!fuel_requests_chief_id_fkey(id, name, phone, role),
      pump_attendant:users!fuel_requests_pump_attendant_id_fkey(id, name, phone, role),
      station:station_accounts!fuel_requests_station_id_fkey(id, name, station_code)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

function baseFuelRequestSelect() {
  return `
    *,
    driver:users!fuel_requests_driver_id_fkey(id, name, phone, truck_number, role),
    chief:users!fuel_requests_chief_id_fkey(id, name, phone, role),
    pump_attendant:users!fuel_requests_pump_attendant_id_fkey(id, name, phone, role),
    station:station_accounts!fuel_requests_station_id_fkey(id, name, station_code)
  `
}

export async function createFuelRequest(req, res, next) {
  try {
    if (!req.auth) {
      return res.status(401).json({ success: false, message: 'Session invalide ou expirée.' })
    }

    if (req.auth.role !== 'driver') {
      return res.status(403).json({ success: false, message: 'Seul un chauffeur peut créer une demande.' })
    }

    const driverId = Number(req.auth.userId)
    const structureId = Number(req.auth.structureId)
    const fuelType = normalizeFuelType(req.body?.fuel_type)
    const requestedLiters = parsePositiveNumber(req.body?.requested_liters)

    const driver = await getUserById(driverId)

    if (!driver || !driver.is_active || driver.role !== 'driver') {
      return res.status(404).json({ success: false, message: 'Chauffeur introuvable ou inactif.' })
    }

    if (Number(driver.structure_id) !== structureId) {
      return res.status(403).json({ success: false, message: 'Ce chauffeur n’appartient pas à cette structure.' })
    }

    const structure = await getStructureById(structureId)

    if (!structure) {
      return res.status(404).json({ success: false, message: 'Structure introuvable.' })
    }

    if (!fuelType || !VALID_FUEL_TYPES.includes(fuelType)) {
      return res.status(400).json({ success: false, message: 'Le type de carburant doit être gasoil ou essence.' })
    }

    if (req.body?.requested_liters === undefined || Number.isNaN(requestedLiters)) {
      return res.status(400).json({ success: false, message: 'La quantité demandée doit être un nombre supérieur à 0.' })
    }

    const payload = {
      structure_id: structure.id,
      structure_name: structure.name,
      driver_id: driver.id,
      driver_name: driver.name,
      truck_number: normalizeTruckNumber(driver.truck_number),
      fuel_type: fuelType,
      requested_liters: requestedLiters,
      status: 'pending'
    }

    const { data, error } = await supabase
      .from('fuel_requests')
      .insert([payload])
      .select(baseFuelRequestSelect())
      .single()

    if (error) throw error

    return res.status(201).json({
      success: true,
      message: 'Demande de carburant créée avec succès.',
      data: sanitizeRequest(data)
    })
  } catch (error) {
    next(error)
  }
}

export async function getAllFuelRequests(req, res, next) {
  try {
    if (!req.auth) {
      return res.status(401).json({ success: false, message: 'Session invalide ou expirée.' })
    }

    const status = normalizeString(req.query?.status)
    const search = normalizeString(req.query?.search)
    const role = req.auth.role
    const userId = Number(req.auth.userId)
    const structureId = Number(req.auth.structureId)
    const stationId = Number(req.auth.stationId)

    let query = supabase
      .from('fuel_requests')
      .select(baseFuelRequestSelect())
      .order('created_at', { ascending: false })

    if (role === 'chief') {
      query = query.eq('structure_id', structureId)
    } else if (role === 'driver') {
      query = query.eq('structure_id', structureId).eq('driver_id', userId)
    } else if (role === 'pump_attendant') {
      query = query.eq('station_id', stationId).eq('status', status || 'approved')
    } else if (role === 'station_manager') {
      query = query.eq('station_id', stationId)
    } else {
      return res.status(403).json({ success: false, message: 'Accès refusé pour ce profil.' })
    }

    if (status && role !== 'pump_attendant') {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: 'Statut invalide.' })
      }
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(
        `structure_name.ilike.%${search}%,driver_name.ilike.%${search}%,truck_number.ilike.%${search}%`
      )
    }

    const { data, error } = await query

    if (error) throw error

    return res.json({ success: true, data: (data || []).map(sanitizeRequest) })
  } catch (error) {
    next(error)
  }
}

export async function getFuelRequestById(req, res, next) {
  try {
    if (!req.auth) {
      return res.status(401).json({ success: false, message: 'Session invalide ou expirée.' })
    }

    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Identifiant demande invalide.' })
    }

    const data = await getFuelRequestByIdInternal(id)

    if (!data) {
      return res.status(404).json({ success: false, message: 'Demande introuvable.' })
    }

    if (req.auth.role === 'chief' && Number(data.structure_id) !== Number(req.auth.structureId)) {
      return res.status(403).json({ success: false, message: 'Accès refusé à cette demande.' })
    }

    if (req.auth.role === 'driver' && Number(data.driver_id) !== Number(req.auth.userId)) {
      return res.status(403).json({ success: false, message: 'Tu ne peux pas voir la demande d’un autre chauffeur.' })
    }

    if ((req.auth.role === 'pump_attendant' || req.auth.role === 'station_manager') && Number(data.station_id) !== Number(req.auth.stationId)) {
      return res.status(403).json({ success: false, message: 'Cette demande n’appartient pas à ta station.' })
    }

    return res.json({ success: true, data: sanitizeRequest(data) })
  } catch (error) {
    next(error)
  }
}

export async function approveFuelRequest(req, res, next) {
  try {
    if (!req.auth) {
      return res.status(401).json({ success: false, message: 'Session invalide ou expirée.' })
    }

    if (req.auth.role !== 'chief') {
      return res.status(403).json({ success: false, message: 'Seul le chef peut valider une demande.' })
    }

    const id = Number(req.params.id)
    const approvedLiters = parsePositiveNumber(req.body?.approved_liters)
    const stationId = parseRequiredId(req.body?.station_id)

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Identifiant demande invalide.' })
    }

    if (req.body?.approved_liters === undefined || Number.isNaN(approvedLiters)) {
      return res.status(400).json({ success: false, message: 'La quantité validée doit être un nombre supérieur à 0.' })
    }

    if (Number.isNaN(stationId)) {
      return res.status(400).json({ success: false, message: 'La station choisie est obligatoire.' })
    }

    const station = await getStationById(stationId)

    if (!station || !station.is_active) {
      return res.status(404).json({ success: false, message: 'Station introuvable ou inactive.' })
    }

    const isPartner = await ensureStructureStationPartner(Number(req.auth.structureId), stationId)

    if (!isPartner) {
      return res.status(403).json({ success: false, message: 'Cette station n’est pas encore partenaire de votre structure.' })
    }

    const existing = await getFuelRequestByIdInternal(id)

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Demande introuvable.' })
    }

    if (Number(existing.structure_id) !== Number(req.auth.structureId)) {
      return res.status(403).json({ success: false, message: 'Tu ne peux pas valider une demande d’une autre structure.' })
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Seules les demandes en attente peuvent être validées.' })
    }

    if (approvedLiters > Number(existing.requested_liters)) {
      return res.status(400).json({ success: false, message: 'La quantité validée ne peut pas dépasser la quantité demandée.' })
    }

    const { data, error } = await supabase
      .from('fuel_requests')
      .update({
        chief_id: Number(req.auth.userId),
        approved_liters: approvedLiters,
        station_id: stationId,
        station_name: station.name,
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(baseFuelRequestSelect())
      .single()

    if (error) throw error

    return res.json({ success: true, message: 'Demande validée et envoyée à la station.', data: sanitizeRequest(data) })
  } catch (error) {
    next(error)
  }
}

export async function rejectFuelRequest(req, res, next) {
  try {
    if (!req.auth) {
      return res.status(401).json({ success: false, message: 'Session invalide ou expirée.' })
    }

    if (req.auth.role !== 'chief') {
      return res.status(403).json({ success: false, message: 'Seul le chef peut refuser une demande.' })
    }

    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Identifiant demande invalide.' })
    }

    const existing = await getFuelRequestByIdInternal(id)

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Demande introuvable.' })
    }

    if (Number(existing.structure_id) !== Number(req.auth.structureId)) {
      return res.status(403).json({ success: false, message: 'Tu ne peux pas refuser une demande d’une autre structure.' })
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Seules les demandes en attente peuvent être refusées.' })
    }

    const { data, error } = await supabase
      .from('fuel_requests')
      .update({
        chief_id: Number(req.auth.userId),
        status: 'rejected',
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(baseFuelRequestSelect())
      .single()

    if (error) throw error

    return res.json({ success: true, message: 'Demande refusée.', data: sanitizeRequest(data) })
  } catch (error) {
    next(error)
  }
}

export async function serveFuelRequest(req, res, next) {
  try {
    if (!req.auth) {
      return res.status(401).json({ success: false, message: 'Session invalide ou expirée.' })
    }

    if (req.auth.role !== 'pump_attendant') {
      return res.status(403).json({ success: false, message: 'Seul le pompiste peut confirmer le service.' })
    }

    const id = Number(req.params.id)
    const servedLiters = parsePositiveNumber(req.body?.served_liters)
    const amount = parseOptionalNumber(req.body?.amount)

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Identifiant demande invalide.' })
    }

    if (req.body?.served_liters === undefined || Number.isNaN(servedLiters)) {
      return res.status(400).json({ success: false, message: 'La quantité servie doit être un nombre supérieur à 0.' })
    }

    if (amount !== null && (Number.isNaN(amount) || amount < 0)) {
      return res.status(400).json({ success: false, message: 'Le montant doit être un nombre valide.' })
    }

    const existing = await getFuelRequestByIdInternal(id)

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Demande introuvable.' })
    }

    if (Number(existing.station_id) !== Number(req.auth.stationId)) {
      return res.status(403).json({ success: false, message: 'Tu ne peux pas servir une demande d’une autre station.' })
    }

    if (existing.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Seules les demandes validées peuvent être servies.' })
    }

    const maxAllowed = Number(existing.approved_liters || existing.requested_liters || 0)

    if (servedLiters > maxAllowed) {
      return res.status(400).json({ success: false, message: `La quantité servie ne peut pas dépasser ${maxAllowed} L.` })
    }

    const updatePayload = {
      pump_attendant_id: Number(req.auth.userId),
      served_liters: servedLiters,
      status: 'served',
      served_at: new Date().toISOString()
    }

    if (amount !== null) updatePayload.amount = amount

    const { data, error } = await supabase
      .from('fuel_requests')
      .update(updatePayload)
      .eq('id', id)
      .select(baseFuelRequestSelect())
      .single()

    if (error) throw error

    return res.json({ success: true, message: 'Livraison de carburant confirmée.', data: sanitizeRequest(data) })
  } catch (error) {
    next(error)
  }
}
