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

function normalizeStructureCode(value) {
  const cleaned = normalizeString(value)
  return cleaned ? cleaned.toUpperCase() : null
}

function isValidPassword(password) {
  return /^.{4,}$/.test(String(password || '').trim())
}

function isValidStructureCode(code) {
  return /^[A-Z0-9_-]{4,20}$/.test(String(code || '').trim())
}

function sanitizeStructure(structure) {
  if (!structure) return null

  return {
    id: structure.id,
    name: structure.name,
    structure_code: structure.structure_code,
    owner_name: structure.owner_name,
    owner_phone: structure.owner_phone,
    created_at: structure.created_at,
    users: structure.users || undefined
  }
}

function chiefOwnsStructure(req, structureId) {
  return Number(req.auth?.structureId) === Number(structureId)
}

export async function createStructure(req, res, next) {
  try {
    const {
      name,
      owner_name,
      owner_phone,
      owner_password,
      confirm_password,
      structure_code
    } = req.body

    const cleanName = normalizeString(name)
    const cleanOwnerName = normalizeString(owner_name)
    const cleanOwnerPhone = normalizePhone(owner_phone)
    const cleanOwnerPassword = normalizeString(owner_password)
    const cleanConfirmPassword = normalizeString(confirm_password)
    const cleanStructureCode = normalizeStructureCode(structure_code)

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

    if (!cleanOwnerPassword) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe du chef est obligatoire'
      })
    }

    if (!cleanConfirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'La confirmation du mot de passe est obligatoire'
      })
    }

    if (!cleanStructureCode) {
      return res.status(400).json({
        success: false,
        message: 'Le code structure est obligatoire'
      })
    }

    if (!isValidPassword(cleanOwnerPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 4 caractères'
      })
    }

    if (cleanOwnerPassword !== cleanConfirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Les mots de passe ne correspondent pas'
      })
    }

    if (!isValidStructureCode(cleanStructureCode)) {
      return res.status(400).json({
        success: false,
        message: 'Le code structure doit contenir entre 4 et 20 caractères majuscules, chiffres, tirets ou underscores'
      })
    }

    const { data: existingStructureByName, error: existingStructureByNameError } = await supabase
      .from('structures')
      .select('id, name')
      .ilike('name', cleanName)
      .maybeSingle()

    if (existingStructureByNameError) throw existingStructureByNameError

    if (existingStructureByName) {
      return res.status(409).json({
        success: false,
        message: 'Une structure avec ce nom existe déjà'
      })
    }

    const { data: existingStructureByCode, error: existingStructureByCodeError } = await supabase
      .from('structures')
      .select('id, structure_code')
      .eq('structure_code', cleanStructureCode)
      .maybeSingle()

    if (existingStructureByCodeError) throw existingStructureByCodeError

    if (existingStructureByCode) {
      return res.status(409).json({
        success: false,
        message: 'Ce code structure est déjà utilisé'
      })
    }

    const { data: existingStructureByPhone, error: existingStructureByPhoneError } = await supabase
      .from('structures')
      .select('id, owner_phone')
      .eq('owner_phone', cleanOwnerPhone)
      .maybeSingle()

    if (existingStructureByPhoneError) throw existingStructureByPhoneError

    if (existingStructureByPhone) {
      return res.status(409).json({
        success: false,
        message: 'Ce numéro est déjà utilisé par un autre chef'
      })
    }

    const structurePayload = {
      name: cleanName,
      structure_code: cleanStructureCode,
      owner_name: cleanOwnerName,
      owner_phone: cleanOwnerPhone,
      owner_password: cleanOwnerPassword
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
      role: 'chief',
      is_active: true
    }

    const { data: chiefUser, error: chiefUserError } = await supabase
      .from('users')
      .insert([chiefPayload])
      .select()
      .single()

    if (chiefUserError) {
      await supabase.from('structures').delete().eq('id', structure.id)
      throw chiefUserError
    }

    return res.status(201).json({
      success: true,
      message: 'Compte chef et structure créés avec succès',
      data: {
        structure: sanitizeStructure(structure),
        chief_user: chiefUser
      }
    })
  } catch (error) {
    next(error)
  }
}

export async function getStructureById(req, res, next) {
  try {
    const { id } = req.params

    if (!chiefOwnsStructure(req, id)) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé à cette structure'
      })
    }

    const { data, error } = await supabase
      .from('structures')
      .select(`
        id,
        name,
        structure_code,
        owner_name,
        owner_phone,
        created_at,
        users(id, name, phone, truck_number, role, pin_code, is_active, created_at)
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

    return res.json({
      success: true,
      data: sanitizeStructure(data)
    })
  } catch (error) {
    next(error)
  }
}

export async function getAllStructures(req, res, next) {
  try {
    const structureId = Number(req.auth?.structureId)

    const { data, error } = await supabase
      .from('structures')
      .select('id, name, structure_code, owner_name, owner_phone, created_at')
      .eq('id', structureId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return res.json({
      success: true,
      data: (data || []).map(sanitizeStructure)
    })
  } catch (error) {
    next(error)
  }
}

export async function updateStructure(req, res, next) {
  try {
    const structureId = Number(req.params.id)

    if (!Number.isInteger(structureId) || structureId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant structure invalide'
      })
    }

    if (!chiefOwnsStructure(req, structureId)) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé à cette structure'
      })
    }

    const name = normalizeString(req.body?.name)
    const structureCode = normalizeStructureCode(req.body?.structure_code)

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Le nom de la structure est obligatoire'
      })
    }

    if (!structureCode) {
      return res.status(400).json({
        success: false,
        message: 'Le code structure est obligatoire'
      })
    }

    if (!isValidStructureCode(structureCode)) {
      return res.status(400).json({
        success: false,
        message: 'Le code structure doit contenir entre 4 et 20 caractères majuscules, chiffres, tirets ou underscores'
      })
    }

    const { data: existingCode, error: existingCodeError } = await supabase
      .from('structures')
      .select('id')
      .eq('structure_code', structureCode)
      .neq('id', structureId)
      .maybeSingle()

    if (existingCodeError) throw existingCodeError

    if (existingCode) {
      return res.status(409).json({
        success: false,
        message: 'Ce code structure est déjà utilisé'
      })
    }

    const { data: existingName, error: existingNameError } = await supabase
      .from('structures')
      .select('id')
      .ilike('name', name)
      .neq('id', structureId)
      .maybeSingle()

    if (existingNameError) throw existingNameError

    if (existingName) {
      return res.status(409).json({
        success: false,
        message: 'Une autre structure avec ce nom existe déjà'
      })
    }

    const { data, error } = await supabase
      .from('structures')
      .update({
        name,
        structure_code: structureCode
      })
      .eq('id', structureId)
      .select('id, name, structure_code, owner_name, owner_phone, created_at')
      .single()

    if (error) throw error

    return res.json({
      success: true,
      message: 'Structure mise à jour avec succès',
      data: sanitizeStructure(data)
    })
  } catch (error) {
    next(error)
  }
}