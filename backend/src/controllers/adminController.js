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

function normalizeStationCode(value) {
  const clean = normalizeString(value)
  return clean ? clean.toUpperCase() : null
}

function normalizePin(value) {
  const clean = normalizeString(value)
  return clean ? clean.replace(/\s+/g, '') : null
}

function isSuperAdmin(req) {
  return req.auth?.role === 'super_admin'
}

function isValidPin(pin) {
  return /^[0-9]{4,8}$/.test(String(pin || ''))
}

function sanitizeAdmin(admin) {
  return {
    id: admin.id,
    name: admin.name,
    phone: admin.phone,
    role: admin.role,
    is_active: admin.is_active,
    created_at: admin.created_at
  }
}

export async function superAdminLogin(req, res, next) {
  try {
    const phone = normalizePhone(req.body?.phone)
    const password = normalizeString(req.body?.password)

    if (!phone) return res.status(400).json({ success: false, message: 'Le téléphone est obligatoire.' })
    if (!password) return res.status(400).json({ success: false, message: 'Le mot de passe est obligatoire.' })

    const { data: admin, error } = await supabase
      .from('platform_admins')
      .select('id, name, phone, password, role, is_active, created_at')
      .eq('phone', phone)
      .maybeSingle()

    if (error) throw error
    if (!admin || !admin.is_active) {
      return res.status(401).json({ success: false, message: 'Compte admin introuvable ou inactif.' })
    }

    if (String(admin.password) !== String(password)) {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects.' })
    }

    const session = {
      userId: admin.id,
      userName: admin.name,
      role: 'super_admin',
      structureId: null,
      stationId: null
    }

    const token = createSessionToken(session)

    return res.json({
      success: true,
      message: 'Connexion super admin réussie.',
      data: {
        token,
        session,
        admin: sanitizeAdmin(admin)
      },
      token
    })
  } catch (error) {
    next(error)
  }
}

export async function getAdminSummary(req, res, next) {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Accès réservé au super admin.' })
    }

    const [structuresRes, stationsRes, driversRes, pumpsRes, requestsRes, servedRes, pendingRes] = await Promise.all([
      supabase.from('structures').select('id', { count: 'exact', head: true }),
      supabase.from('station_accounts').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'driver'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'pump_attendant'),
      supabase.from('fuel_requests').select('id', { count: 'exact', head: true }),
      supabase.from('fuel_requests').select('served_liters, amount').eq('status', 'served'),
      supabase.from('fuel_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
    ])

    const error = [structuresRes, stationsRes, driversRes, pumpsRes, requestsRes, servedRes, pendingRes].find(r => r.error)?.error
    if (error) throw error

    const servedRows = servedRes.data || []
    const totalServedLiters = servedRows.reduce((sum, row) => sum + Number(row.served_liters || 0), 0)
    const totalAmount = servedRows.reduce((sum, row) => sum + Number(row.amount || 0), 0)

    return res.json({
      success: true,
      data: {
        structures_count: structuresRes.count || 0,
        stations_count: stationsRes.count || 0,
        drivers_count: driversRes.count || 0,
        pump_attendants_count: pumpsRes.count || 0,
        fuel_requests_count: requestsRes.count || 0,
        pending_requests_count: pendingRes.count || 0,
        total_served_liters: totalServedLiters,
        total_amount: totalAmount
      }
    })
  } catch (error) {
    next(error)
  }
}

export async function adminListStations(req, res, next) {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Accès réservé au super admin.' })
    }

    const { data, error } = await supabase
      .from('station_accounts')
      .select('id, name, station_code, location, city, manager_name, manager_phone, email, is_active, created_at')
      .order('created_at', { ascending: false })

    if (error) throw error

    return res.json({ success: true, data: data || [] })
  } catch (error) {
    next(error)
  }
}

export async function adminCreateStation(req, res, next) {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Accès réservé au super admin.' })
    }

    const name = normalizeString(req.body?.name)
    const stationCode = normalizeStationCode(req.body?.station_code)
    const pinCode = normalizePin(req.body?.pin_code)
    const managerName = normalizeString(req.body?.manager_name)
    const managerPhone = normalizePhone(req.body?.manager_phone)
    const email = normalizeString(req.body?.email)?.toLowerCase()
    const location = normalizeString(req.body?.location)
    const city = normalizeString(req.body?.city)

    if (!name) return res.status(400).json({ success: false, message: 'Le nom de la station est obligatoire.' })
    if (!stationCode || !/^[A-Z0-9_-]{3,20}$/.test(stationCode)) {
      return res.status(400).json({ success: false, message: 'Code station invalide.' })
    }
    if (!pinCode || !isValidPin(pinCode)) {
      return res.status(400).json({ success: false, message: 'PIN station invalide.' })
    }

    const { data, error } = await supabase
      .from('station_accounts')
      .insert([{
        name,
        station_code: stationCode,
        pin_code: pinCode,
        manager_name: managerName,
        manager_phone: managerPhone,
        email,
        location,
        city,
        created_by: Number(req.auth.userId),
        is_active: true
      }])
      .select('id, name, station_code, location, city, manager_name, manager_phone, email, is_active, created_at')
      .single()

    if (error) throw error

    return res.status(201).json({
      success: true,
      message: 'Station créée.',
      data
    })
  } catch (error) {
    next(error)
  }
}

export async function adminListStructures(req, res, next) {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Accès réservé au super admin.' })
    }

    const { data, error } = await supabase
      .from('structures')
      .select('id, name, structure_code, owner_name, owner_phone, created_at')
      .order('created_at', { ascending: false })

    if (error) throw error

    return res.json({ success: true, data: data || [] })
  } catch (error) {
    next(error)
  }
}

export async function adminListUsers(req, res, next) {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Accès réservé au super admin.' })
    }

    const role = normalizeString(req.query?.role)
    const stationId = Number(req.query?.station_id)
    const structureId = Number(req.query?.structure_id)

    let query = supabase
      .from('users')
      .select(`
        id, structure_id, station_id, name, phone, truck_number, role, pin_code, is_active, created_at,
        structure:structures(id, name, structure_code),
        station:station_accounts(id, name, station_code)
      `)
      .order('created_at', { ascending: false })

    if (role) query = query.eq('role', role)
    if (Number.isInteger(stationId) && stationId > 0) query = query.eq('station_id', stationId)
    if (Number.isInteger(structureId) && structureId > 0) query = query.eq('structure_id', structureId)

    const { data, error } = await query
    if (error) throw error

    return res.json({ success: true, data: data || [] })
  } catch (error) {
    next(error)
  }
}

export async function adminListTransactions(req, res, next) {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Accès réservé au super admin.' })
    }

    const status = normalizeString(req.query?.status)
    const stationId = Number(req.query?.station_id)
    const structureId = Number(req.query?.structure_id)

    let query = supabase
      .from('fuel_requests')
      .select(`
        *,
        driver:users!fuel_requests_driver_id_fkey(id, name, phone, truck_number),
        chief:users!fuel_requests_chief_id_fkey(id, name, phone),
        pump_attendant:users!fuel_requests_pump_attendant_id_fkey(id, name, phone),
        station:station_accounts!fuel_requests_station_id_fkey(id, name, station_code)
      `)
      .order('created_at', { ascending: false })
      .limit(500)

    if (status) query = query.eq('status', status)
    if (Number.isInteger(stationId) && stationId > 0) query = query.eq('station_id', stationId)
    if (Number.isInteger(structureId) && structureId > 0) query = query.eq('structure_id', structureId)

    const { data, error } = await query
    if (error) throw error

    return res.json({ success: true, data: data || [] })
  } catch (error) {
    next(error)
  }
}

export async function adminSetActive(req, res, next) {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Accès réservé au super admin.' })
    }

    const target = normalizeString(req.params?.target)
    const id = Number(req.params?.id)
    const isActive = Boolean(req.body?.is_active)

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Identifiant invalide.' })
    }

    const table = target === 'station' ? 'station_accounts' : target === 'user' ? 'users' : null

    if (!table) {
      return res.status(400).json({ success: false, message: 'Cible invalide.' })
    }

    const { data, error } = await supabase
      .from(table)
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return res.json({
      success: true,
      message: 'Statut mis à jour.',
      data
    })
  } catch (error) {
    next(error)
  }
}

export async function adminCreateStructure(req, res, next) {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Accès réservé au super admin.' })
    }

    const name = normalizeString(req.body?.name)
    const ownerName = normalizeString(req.body?.owner_name)
    const ownerPhone = normalizePhone(req.body?.owner_phone)
    const ownerEmail = normalizeString(req.body?.owner_email)?.toLowerCase()
    const ownerPassword = normalizeString(req.body?.owner_password)
    const structureCode = normalizeStationCode(req.body?.structure_code)

    if (!name) return res.status(400).json({ success: false, message: 'Nom structure obligatoire.' })
    if (!ownerName) return res.status(400).json({ success: false, message: 'Nom du chef obligatoire.' })
    if (!ownerPhone) return res.status(400).json({ success: false, message: 'Téléphone chef obligatoire.' })
    if (!ownerPassword) return res.status(400).json({ success: false, message: 'Mot de passe chef obligatoire.' })
    if (!structureCode) return res.status(400).json({ success: false, message: 'Code structure obligatoire.' })

    const { data: structure, error } = await supabase
      .from('structures')
      .insert([{
        name,
        structure_code: structureCode,
        owner_name: ownerName,
        owner_phone: ownerPhone,
        owner_email: ownerEmail,
        owner_password: ownerPassword
      }])
      .select()
      .single()

    if (error) throw error

    const { data: chief, error: chiefError } = await supabase
      .from('users')
      .insert([{
        structure_id: structure.id,
        station_id: null,
        name: ownerName,
        phone: ownerPhone,
        role: 'chief',
        pin_code: null,
        is_active: true,
        created_by: Number(req.auth.userId)
      }])
      .select()
      .single()

    if (chiefError) throw chiefError

    return res.status(201).json({
      success: true,
      message: 'Structure et chef créés.',
      data: { structure, chief }
    })
  } catch (error) {
    next(error)
  }
}