import { supabase } from '../config/supabaseClient.js'

function normalizeString(value) {
  if (value === undefined || value === null) return null
  const cleaned = String(value).trim()
  return cleaned ? cleaned : null
}

function normalizePhone(value) {
  const cleaned = normalizeString(value)
  return cleaned ? cleaned.replace(/\s+/g, '') : null
}

function isValidPin(pin) {
  return /^\d{4,8}$/.test(String(pin || '').trim())
}

export async function createStructure(req, res, next) {
  try {
    const {
      name,
      owner_name,
      owner_phone,
      pin_chief,
      pin_pump
    } = req.body

    const cleanName = normalizeString(name)
    const cleanOwnerName = normalizeString(owner_name)
    const cleanOwnerPhone = normalizePhone(owner_phone)
    const cleanChiefPin = normalizeString(pin_chief)
    const cleanPumpPin = normalizeString(pin_pump)

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message: 'Le nom de la structure est obligatoire'
      })
    }

    if (!cleanOwnerName) {
      return res.status(400).json({
        success: false,
        message: 'Le nom du chef est obligatoire'
      })
    }

    if (!cleanOwnerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Le numéro du chef est obligatoire'
      })
    }

    if (!cleanChiefPin || !cleanPumpPin) {
      return res.status(400).json({
        success: false,
        message: 'Les codes PIN chef et pompiste sont obligatoires'
      })
    }

    if (!isValidPin(cleanChiefPin)) {
      return res.status(400).json({
        success: false,
        message: 'Le code PIN chef doit contenir entre 4 et 8 chiffres'
      })
    }

    if (!isValidPin(cleanPumpPin)) {
      return res.status(400).json({
        success: false,
        message: 'Le code PIN pompiste doit contenir entre 4 et 8 chiffres'
      })
    }

    if (cleanChiefPin === cleanPumpPin) {
      return res.status(400).json({
        success: false,
        message: 'Le PIN chef et le PIN pompiste doivent être différents'
      })
    }

    const { data: existingStructure, error: existingStructureError } = await supabase
      .from('structures')
      .select('id, name')
      .ilike('name', cleanName)
      .maybeSingle()

    if (existingStructureError) throw existingStructureError

    if (existingStructure) {
      return res.status(409).json({
        success: false,
        message: 'Une structure avec ce nom existe déjà'
      })
    }

    const { data: existingPhoneUser, error: existingPhoneUserError } = await supabase
      .from('users')
      .select('id, phone')
      .eq('phone', cleanOwnerPhone)
      .maybeSingle()

    if (existingPhoneUserError) throw existingPhoneUserError

    if (existingPhoneUser) {
      return res.status(409).json({
        success: false,
        message: 'Ce numéro est déjà utilisé par un autre utilisateur'
      })
    }

    const structurePayload = {
      name: cleanName,
      owner_name: cleanOwnerName,
      owner_phone: cleanOwnerPhone,
      pin_chief: cleanChiefPin,
      pin_pump: cleanPumpPin
    }

    const { data: structure, error: structureError } = await supabase
      .from('structures')
      .insert([structurePayload])
      .select()
      .single()

    if (structureError) throw structureError

    const chiefPayload = {
      structure_id: structure.id,
      name: cleanOwnerName,
      phone: cleanOwnerPhone,
      password_hash: cleanChiefPin,
      role: 'chief'
    }

    const { data: chief, error: chiefError } = await supabase
      .from('users')
      .insert([chiefPayload])
      .select()
      .single()

    if (chiefError) {
      await supabase.from('structures').delete().eq('id', structure.id)
      throw chiefError
    }

    res.status(201).json({
      success: true,
      message: 'Structure créée avec succès et chef lié automatiquement',
      data: {
        ...structure,
        chief_user: chief
      }
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
      .select(`
        *,
        users(id, name, phone, role, created_at)
      `)
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
      query = query.ilike('name', `%${String(search).trim()}%`)
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