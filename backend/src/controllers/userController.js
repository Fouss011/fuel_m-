import { supabase } from '../config/supabaseClient.js'

const VALID_ROLES = ['driver', 'chief', 'pump_attendant']

export async function createUser(req, res, next) {
  try {
    const {
      structure_id,
      name,
      phone,
      password_hash,
      role
    } = req.body

    if (!name || !phone || !role) {
      return res.status(400).json({
        success: false,
        message: 'name, phone et role sont obligatoires'
      })
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rôle invalide'
      })
    }

    const payload = {
      structure_id: structure_id || null,
      name: String(name).trim(),
      phone: String(phone).trim(),
      password_hash: password_hash ? String(password_hash).trim() : null,
      role: String(role).trim()
    }

    const { data, error } = await supabase
      .from('users')
      .insert([payload])
      .select()
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
    const { structure_id, role, search } = req.query

    let query = supabase
      .from('users')
      .select(`
        *,
        structure:structures(id, name)
      `)
      .order('created_at', { ascending: false })

    if (structure_id) {
      query = query.eq('structure_id', structure_id)
    }

    if (role) {
      query = query.eq('role', role)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
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

    res.json({
      success: true,
      data
    })
  } catch (error) {
    next(error)
  }
}