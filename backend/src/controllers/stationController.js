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

export async function stationLogin(req, res, next) {
  try {
    const stationCode = normalizeStationCode(req.body?.station_code)
    const pinCode = normalizeString(req.body?.pin_code)

    if (!stationCode) {
      return res.status(400).json({
        success: false,
        message: 'Le code station est obligatoire.'
      })
    }

    if (!pinCode) {
      return res.status(400).json({
        success: false,
        message: 'Le code PIN station est obligatoire.'
      })
    }

    const { data: station, error } = await supabase
      .from('station_accounts')
      .select('id, name, station_code, pin_code, is_active')
      .eq('station_code', stationCode)
      .maybeSingle()

    if (error) throw error

    if (!station || !station.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Station introuvable ou inactive.'
      })
    }

    if (String(station.pin_code) !== String(pinCode)) {
      return res.status(401).json({
        success: false,
        message: 'Code PIN station incorrect.'
      })
    }

    const session = buildStationSession(station)

    return res.json({
      success: true,
      message: 'Connexion station réussie.',
      token: session.token,
      station: session.station
    })
  } catch (error) {
    next(error)
  }
}

export async function getStationTransactions(req, res, next) {
  try {
    if (!req.auth || req.auth.role !== 'station_manager') {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé au responsable station.'
      })
    }

    const date = normalizeString(req.query?.date)
    const structureName = normalizeString(req.query?.structure_name)

    let query = supabase
      .from('fuel_requests')
      .select(`
        id,
        structure_id,
        structure_name,
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
      .eq('status', 'served')
      .order('served_at', { ascending: false })

    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`)
      const end = new Date(`${date}T23:59:59.999Z`)

      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        query = query
          .gte('served_at', start.toISOString())
          .lte('served_at', end.toISOString())
      }
    }

    if (structureName) {
      query = query.ilike('structure_name', `%${structureName}%`)
    }

    const { data, error } = await query

    if (error) throw error

    return res.json({
      success: true,
      data: data || []
    })
  } catch (error) {
    next(error)
  }
}

export async function getStationSummary(req, res, next) {
  try {
    if (!req.auth || req.auth.role !== 'station_manager') {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé au responsable station.'
      })
    }

    const date = normalizeString(req.query?.date)

    let query = supabase
      .from('fuel_requests')
      .select('id, structure_name, fuel_type, served_liters, amount, served_at')
      .eq('status', 'served')

    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`)
      const end = new Date(`${date}T23:59:59.999Z`)

      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        query = query
          .gte('served_at', start.toISOString())
          .lte('served_at', end.toISOString())
      }
    }

    const { data, error } = await query

    if (error) throw error

    const rows = data || []

    const summary = rows.reduce(
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
      {
        transactions: 0,
        total_liters: 0,
        total_amount: 0,
        gasoil_liters: 0,
        essence_liters: 0
      }
    )

    return res.json({
      success: true,
      data: summary
    })
  } catch (error) {
    next(error)
  }
}