import { supabase } from '../config/supabaseClient.js'

export async function createStructure(req, res, next) {
  try {
    const {
      name,
      owner_name,
      owner_phone,
      pin_chief,
      pin_pump
    } = req.body

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Le nom de la structure est obligatoire'
      })
    }

    const payload = {
      name: String(name).trim(),
      owner_name: owner_name ? String(owner_name).trim() : null,
      owner_phone: owner_phone ? String(owner_phone).trim() : null,
      pin_chief: pin_chief ? String(pin_chief).trim() : null,
      pin_pump: pin_pump ? String(pin_pump).trim() : null
    }

    const { data, error } = await supabase
      .from('structures')
      .insert([payload])
      .select()
      .single()

    if (error) throw error

    res.status(201).json({
      success: true,
      message: 'Structure créée avec succès',
      data
    })
  } catch (error) {
    next(error)
  }
}

export async function getStructureById(req, res, next) {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('structures')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Structure introuvable'
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

export async function getAllStructures(req, res, next) {
  try {
    const { search } = req.query

    let query = supabase
      .from('structures')
      .select('*')
      .order('created_at', { ascending: false })

    if (search) {
      query = query.ilike('name', `%${search}%`)
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