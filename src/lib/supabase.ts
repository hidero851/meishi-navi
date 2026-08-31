import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(url, key)

export const STORAGE_BUCKET = 'meishi-photos'
export const EDGE_FUNCTION_URL = `${url}/functions/v1/meishi-scan`
