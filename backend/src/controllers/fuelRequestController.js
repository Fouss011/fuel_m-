import { supabase } from '../config/supabaseClient.js'

const VALID_STATUSES = ['pending', 'approved', 'rejected', 'served']

export async function createFuelRequest(req, res, next) {
  try {
    const {
      driver_id,
      driver_name,
      truck_number,
      fuel_type,
      requested_liters
    } = req.body

    if (!driver_name || !truck_number || !fuel_type || requested_liters === undefined) {
      return res.status(400).json({
        success: false,
        message: 'driver_name, truck_number, fuel_type et requested_liters sont obligatoires'
      })
    }

    const liters = Number(requested_liters)

    if (Number.isNaN(liters) || liters <= 0) {
      return res.status(400).json({
        success: false,
        message: 'requested_liters doit être un nombre supérieur à 0'
      })
    }

    const payload = {
      driver_name: String(driver_name).trim(),
      truck_number: String(truck_number).trim(),
      fuel_type: String(fuel_type).trim(),
      requested_liters: liters,
      status: 'pending'
    }

    if (driver_id) payload.driver_id = driver_id

    const { data, error } = await supabase
      .from('fuel_requests')
      .insert([payload])
      .select()
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
    const { status, role, user_id, driver_name, truck_number } = req.query

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

    if (role === 'driver' && user_id) {
      query = query.eq('driver_id', user_id)
    }

    if (driver_name) {
      query = query.ilike('driver_name', `%${driver_name}%`)
    }

    if (truck_number) {
      query = query.ilike('truck_number', `%${truck_number}%`)
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

    if (!chief_id || approved_liters === undefined) {
      return res.status(400).json({
        success: false,
        message: 'chief_id et approved_liters sont obligatoires'
      })
    }

    const liters = Number(approved_liters)

    if (Number.isNaN(liters) || liters <= 0) {
      return res.status(400).json({
        success: false,
        message: 'approved_liters doit être un nombre supérieur à 0'
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

    const { data, error } = await supabase
      .from('fuel_requests')
      .update({
        chief_id,
        approved_liters: liters,
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
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

    if (!chief_id) {
      return res.status(400).json({
        success: false,
        message: 'chief_id est obligatoire'
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

    const { data, error } = await supabase
      .from('fuel_requests')
      .update({
        chief_id,
        status: 'rejected',
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
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

    if (!pump_attendant_id || served_liters === undefined || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'pump_attendant_id, served_liters et amount sont obligatoires'
      })
    }

    const liters = Number(served_liters)
    const totalAmount = Number(amount)

    if (Number.isNaN(liters) || liters <= 0) {
      return res.status(400).json({
        success: false,
        message: 'served_liters doit être un nombre supérieur à 0'
      })
    }

    if (Number.isNaN(totalAmount) || totalAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'amount doit être un nombre valide'
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

    const maxAllowed = Number(
      existing.approved_liters || existing.requested_liters || 0
    )

    if (liters > maxAllowed) {
      return res.status(400).json({
        success: false,
        message: `La quantité servie ne peut pas dépasser ${maxAllowed} L`
      })
    }

    const { data, error } = await supabase
      .from('fuel_requests')
      .update({
        pump_attendant_id,
        served_liters: liters,
        amount: totalAmount,
        status: 'served',
        served_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
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