import { createClient } from '@supabase/supabase-js'

// A publishable key é pública por design: a segurança vem do RLS no banco.
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://twfwtulgtnadrhmmncfn.supabase.co'
const key = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_ctjuZY38213pUZferS2uTA_UGbVB7ut'

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
