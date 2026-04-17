import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

console.log('SUPABASE_URL present:', !!process.env.SUPABASE_URL)
console.log('SUPABASE_SERVICE_ROLE_KEY present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
console.log(
  'SUPABASE keys seen:',
  Object.keys(process.env).filter((key) => key.includes('SUPABASE'))
)

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Variables Supabase manquantes : SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)