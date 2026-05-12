import { supabase } from '../config/supabaseClient.js'
import { createSessionToken } from '../utils/sessionToken.js'

function normalizeString(value) {
  if (value === undefined || value === null) return null
  const clean = String(value).trim()
  return clean || null
}

function normalizeStationCode(value) {
  const clean = normalizeString(value)
  return clean ? clean.toUpperCase() : null
}

function normalizePhone(value) {
  const clean = normalizeString(value)
  return clean ? clean.replace(/\s+/g, '') : null
}

function normalizePin(value) {
  const clean = normalizeString(value)
  return clean ? clean.replace(/\s+/g, '') : null
}

function isValidPin(pin) {
  return /^[0-9]{4,8}$/.test(String(pin || ''))
}

function buildStationSession(station) {
  const sessionPayload = {
    role: 'station_manager',
    stationId: station.id,
    stationName: station.name,
    stationCode: station.station_code
  }

  return {
    token: createSessionToken(sessionPayload),
    station: {
      id: station.id,
      name: station.name,
      station_code: station.station_code
    }
  }
}

function sanitizeStation(station) {
  if (!station) return null
  return {
    id: station.id,
    name: station.name,
    station_code: station.station_code,
    location: station.location || null,
    manager_name: station.manager_name || null,
    manager_phone: station.manager_phone || null,
    is_active: station.is_active,
    created_at: station.created_at
  }
}

function sanitizePumpAttendant(user) {
  if (!user) return null
  return {
    id: user.id,
    station_id: user.station_id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    pin_code: user.pin_code || null,
    is_active: user.is_active,
    created_at: user.created_at
  }
}

function ensureStationManager(req) {
  return req.auth?.role === 'station_manager' && Number(req.auth?.stationId) > 0
}

export async function createStation(req, res, next) {
  try {
    const name = normalizeString(req.body?.name)
    const stationCode = normalizeStationCode(req.body?.station_code)
    const pinCode = normalizePin(req.body?.pin_code)
    const managerName = normalizeString(req.body?.manager_name)
    const managerPhone = normalizePhone(req.body?.manager_phone)
    const email = normalizeString(req.body?.email)?.toLowerCase()
    const location = normalizeString(req.body?.location)

    if (!name) {
      return res.status(400).json({ success: false, message: 'Le nom de la station est obligatoire.' })
    }

    if (!stationCode) {
      return res.status(400).json({ success: false, message: 'Le code station est obligatoire.' })
    }

    if (!/^[A-Z0-9_-]{3,20}$/.test(stationCode)) {
      return res.status(400).json({ success: false, message: 'Le code station doit contenir 3 à 20 caractères majuscules, chiffres, tirets ou underscores.' })
    }

    if (!pinCode || !isValidPin(pinCode)) {
      return res.status(400).json({ success: false, message: 'Le PIN station doit contenir entre 4 et 8 chiffres.' })
    }

    if (!email) {
  return res.status(400).json({
    success: false,
    message: 'L’email du responsable station est obligatoire.'
  })
}

    const { data: existing, error: existingError } = await supabase
      .from('station_accounts')
      .select('id')
      .or(`station_code.eq.${stationCode},name.ilike.${name}`)
      .maybeSingle()

    if (existingError) throw existingError

    if (existing) {
      return res.status(409).json({ success: false, message: 'Une station avec ce nom ou ce code existe déjà.' })
    }

    const payload = {
  name,
  station_code: stationCode,
  pin_code: pinCode,
  manager_name: managerName,
  manager_phone: managerPhone,
  email,
  location,
  is_active: true
}

    const { data, error } = await supabase
      .from('station_accounts')
      .insert([payload])
      .select('id, name, station_code, location, manager_name, manager_phone, email, is_active, created_at')
      .single()

    if (error) throw error

    return res.status(201).json({ success: true, message: 'Station créée avec succès.', data: sanitizeStation(data) })
  } catch (error) {
    next(error)
  }
}

export async function getStations(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('station_accounts')
      .select('id, name, station_code, location, manager_name, manager_phone, is_active, created_at')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error

    return res.json({ success: true, data: (data || []).map(sanitizeStation) })
  } catch (error) {
    next(error)
  }
}

export async function getPublicStationByCode(req, res, next) {
  try {
    const stationCode = normalizeStationCode(req.params?.stationCode)

    if (!stationCode) {
      return res.status(400).json({
        success: false,
        message: 'Le code station est obligatoire.'
      })
    }

    const { data, error } = await supabase
      .from('station_accounts')
      .select('id, name, station_code, location, manager_name, manager_phone, is_active, created_at')
      .eq('station_code', stationCode)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Station introuvable ou inactive.'
      })
    }

    return res.json({
      success: true,
      data: sanitizeStation(data)
    })
  } catch (error) {
    next(error)
  }
}

export async function stationLogin(req, res, next) {
  try {
    const stationCode = normalizeStationCode(req.body?.station_code)
    const pinCode = normalizeString(req.body?.pin_code)

    if (!stationCode) {
      return res.status(400).json({ success: false, message: 'Le code station est obligatoire.' })
    }

    if (!pinCode) {
      return res.status(400).json({ success: false, message: 'Le code PIN station est obligatoire.' })
    }

    const { data: station, error } = await supabase
      .from('station_accounts')
      .select('id, name, station_code, pin_code, is_active')
      .eq('station_code', stationCode)
      .maybeSingle()

    if (error) throw error

    if (!station || !station.is_active) {
      return res.status(404).json({ success: false, message: 'Station introuvable ou inactive.' })
    }

    if (String(station.pin_code) !== String(pinCode)) {
      return res.status(401).json({ success: false, message: 'Code PIN station incorrect.' })
    }

    const session = buildStationSession(station)

    return res.json({ success: true, message: 'Connexion station réussie.', token: session.token, station: session.station, data: session })
  } catch (error) {
    next(error)
  }
}

export async function createStationPumpAttendant(req, res, next) {
  try {
    if (!ensureStationManager(req)) {
      return res.status(403).json({ success: false, message: 'Accès réservé au responsable station.' })
    }

    const stationId = Number(req.auth.stationId)
    const name = normalizeString(req.body?.name)
    const phone = normalizePhone(req.body?.phone)
    const pinCode = normalizePin(req.body?.pin_code)

    if (!name) {
      return res.status(400).json({ success: false, message: 'Le nom du pompiste est obligatoire.' })
    }

    if (!pinCode || !isValidPin(pinCode)) {
      return res.status(400).json({ success: false, message: 'Le PIN pompiste doit contenir entre 4 et 8 chiffres.' })
    }

    const { data: duplicateName, error: duplicateNameError } = await supabase
      .from('users')
      .select('id')
      .eq('station_id', stationId)
      .eq('role', 'pump_attendant')
      .ilike('name', name)
      .maybeSingle()

    if (duplicateNameError) throw duplicateNameError

    if (duplicateName) {
      return res.status(409).json({ success: false, message: 'Un pompiste avec ce nom existe déjà dans cette station.' })
    }

    if (phone) {
      const { data: duplicatePhone, error: duplicatePhoneError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phone)
        .maybeSingle()

      if (duplicatePhoneError) throw duplicatePhoneError

      if (duplicatePhone) {
        return res.status(409).json({ success: false, message: 'Ce numéro de téléphone est déjà utilisé.' })
      }
    }

    const { data, error } = await supabase
      .from('users')
      .insert([{
        structure_id: null,
        station_id: stationId,
        name,
        phone,
        truck_number: null,
        role: 'pump_attendant',
        pin_code: pinCode,
        is_active: true
      }])
      .select('id, station_id, name, phone, role, pin_code, is_active, created_at')
      .single()

    if (error) throw error

    return res.status(201).json({ success: true, message: 'Pompiste créé dans la station.', data: sanitizePumpAttendant(data) })
  } catch (error) {
    next(error)
  }
}

export async function getStationPumpAttendants(req, res, next) {
  try {
    const stationIdFromParam = Number(req.params?.stationId)
    const stationIdFromAuth = Number(req.auth?.stationId)
    const stationId =
      Number.isInteger(stationIdFromParam) && stationIdFromParam > 0
        ? stationIdFromParam
        : stationIdFromAuth

    if (!Number.isInteger(stationId) || stationId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Station introuvable.'
      })
    }

    if (!req.params?.stationId && !ensureStationManager(req)) {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé au responsable station.'
      })
    }

    const { data: station, error: stationError } = await supabase
      .from('station_accounts')
      .select('id, name, station_code, location, manager_name, manager_phone, is_active, created_at')
      .eq('id', stationId)
      .eq('is_active', true)
      .maybeSingle()

    if (stationError) throw stationError

    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Station introuvable ou inactive.'
      })
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, station_id, name, phone, role, is_active, created_at')
      .eq('station_id', stationId)
      .eq('role', 'pump_attendant')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    return res.json({
      success: true,
      data: {
        station: sanitizeStation(station),
        pump_attendants: data || []
      }
    })
  } catch (error) {
    next(error)
  }
}

export async function getMyPartnerStations(req, res, next) {
  try {
    if (req.auth?.role !== 'chief') {
      return res.status(403).json({ success: false, message: 'Accès réservé au chef de structure.' })
    }

    const { data, error } = await supabase
      .from('structure_station_partners')
      .select('id, station:station_accounts(id, name, station_code, location, is_active, created_at)')
      .eq('structure_id', Number(req.auth.structureId))
      .order('created_at', { ascending: false })

    if (error) throw error

    const stations = (data || [])
      .map((row) => row.station)
      .filter(Boolean)
      .map(sanitizeStation)

    return res.json({ success: true, data: stations })
  } catch (error) {
    next(error)
  }
}

export async function addPartnerStation(req, res, next) {
  try {
    if (req.auth?.role !== 'chief') {
      return res.status(403).json({ success: false, message: 'Accès réservé au chef de structure.' })
    }

    const stationId = Number(req.body?.station_id)

    if (!Number.isInteger(stationId) || stationId <= 0) {
      return res.status(400).json({ success: false, message: 'La station est obligatoire.' })
    }

    const { data: station, error: stationError } = await supabase
      .from('station_accounts')
      .select('id, name, station_code, is_active')
      .eq('id', stationId)
      .maybeSingle()

    if (stationError) throw stationError

    if (!station || !station.is_active) {
      return res.status(404).json({ success: false, message: 'Station introuvable ou inactive.' })
    }

    const payload = {
      structure_id: Number(req.auth.structureId),
      station_id: stationId
    }

    const { data, error } = await supabase
      .from('structure_station_partners')
      .upsert([payload], { onConflict: 'structure_id,station_id' })
      .select('id, structure_id, station_id, created_at')
      .single()

    if (error) throw error

    return res.status(201).json({ success: true, message: 'Station partenaire ajoutée.', data })
  } catch (error) {
    next(error)
  }
}

export async function removePartnerStation(req, res, next) {
  try {
    if (req.auth?.role !== 'chief') {
      return res.status(403).json({ success: false, message: 'Accès réservé au chef de structure.' })
    }

    const stationId = Number(req.params.stationId)

    if (!Number.isInteger(stationId) || stationId <= 0) {
      return res.status(400).json({ success: false, message: 'Identifiant station invalide.' })
    }

    const { error } = await supabase
      .from('structure_station_partners')
      .delete()
      .eq('structure_id', Number(req.auth.structureId))
      .eq('station_id', stationId)

    if (error) throw error

    return res.json({ success: true, message: 'Station partenaire retirée.' })
  } catch (error) {
    next(error)
  }
}

export async function getStationTransactions(req, res, next) {
  try {
    if (!ensureStationManager(req)) {
      return res.status(403).json({ success: false, message: 'Accès réservé au responsable station.' })
    }

    const date = normalizeString(req.query?.date)
    const search = normalizeString(req.query?.search || req.query?.structure_name)

    let query = supabase
      .from('fuel_requests')
      .select(`
        id,
        structure_id,
        structure_name,
        station_id,
        station_name,
        driver_name,
        truck_number,
        fuel_type,
        requested_liters,
        approved_liters,
        served_liters,
        amount,
        status,
        created_at,
        approved_at,
        served_at,
        pump_attendant:users!fuel_requests_pump_attendant_id_fkey(id, name, phone)
      `)
      .eq('station_id', Number(req.auth.stationId))
      .eq('status', 'served')
      .order('served_at', { ascending: false })

    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`)
      const end = new Date(`${date}T23:59:59.999Z`)
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        query = query.gte('served_at', start.toISOString()).lte('served_at', end.toISOString())
      }
    }

    if (search) {
      query = query.or(`structure_name.ilike.%${search}%,driver_name.ilike.%${search}%,truck_number.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) throw error

    return res.json({ success: true, data: data || [] })
  } catch (error) {
    next(error)
  }
}

export async function getStationSummary(req, res, next) {
  try {
    if (!ensureStationManager(req)) {
      return res.status(403).json({ success: false, message: 'Accès réservé au responsable station.' })
    }

    const date = normalizeString(req.query?.date)

    let query = supabase
      .from('fuel_requests')
      .select('id, structure_name, fuel_type, served_liters, amount, served_at')
      .eq('station_id', Number(req.auth.stationId))
      .eq('status', 'served')

    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`)
      const end = new Date(`${date}T23:59:59.999Z`)
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        query = query.gte('served_at', start.toISOString()).lte('served_at', end.toISOString())
      }
    }

    const { data, error } = await query

    if (error) throw error

    const summary = (data || []).reduce(
      (acc, row) => {
        const liters = Number(row.served_liters || 0)
        const amount = Number(row.amount || 0)
        acc.transactions += 1
        acc.total_liters += liters
        acc.total_amount += amount
        if (row.fuel_type === 'gasoil') acc.gasoil_liters += liters
        if (row.fuel_type === 'essence') acc.essence_liters += liters
        return acc
      },
      { transactions: 0, total_liters: 0, total_amount: 0, gasoil_liters: 0, essence_liters: 0 }
    )

    return res.json({ success: true, data: summary })
  } catch (error) {
    next(error)
  }
}

export async function getStationPendingRequests(req, res, next) {
  try {
    const stationId = Number(req.params.stationId)

    if (!Number.isInteger(stationId) || stationId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant station invalide.'
      })
    }

    if (!req.auth) {
      return res.status(401).json({
        success: false,
        message: 'Session invalide ou expirée.'
      })
    }

    if (req.auth.role === 'pump_attendant') {
      if (Number(req.auth.stationId) !== stationId) {
        return res.status(403).json({
          success: false,
          message: 'Tu ne peux voir que les demandes de ta station.'
        })
      }
    }

    if (req.auth.role === 'station_manager') {
      if (Number(req.auth.stationId) !== stationId) {
        return res.status(403).json({
          success: false,
          message: 'Tu ne peux voir que les demandes de ta station.'
        })
      }
    }

    const { data, error } = await supabase
      .from('fuel_requests')
      .select(`
        *,
        driver:users!fuel_requests_driver_id_fkey(id, name, phone, truck_number),
        chief:users!fuel_requests_chief_id_fkey(id, name, phone),
        station:station_accounts(id, name, station_code, city)
      `)
      .eq('station_id', stationId)
      .eq('status', 'approved')
      .order('approved_at', { ascending: true })

    if (error) throw error

    return res.json({
      success: true,
      data: data || []
    })
  } catch (error) {
    next(error)
  }
}
