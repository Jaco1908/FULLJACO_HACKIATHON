import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Cliente Supabase — SOLO para supabase.auth.*
 *
 * autoRefreshToken: false  → evita que el SDK intente llamar a supabase.co
 *   directamente desde el browser para refrescar el token. El refresco se
 *   hace manualmente a través del proxy en backend (/auth/refresh).
 *
 * detectSessionInUrl: true → necesario para el flujo de reset de contraseña
 *   (Supabase manda el token en el hash de la URL).
 *
 * persistSession: true → guarda la sesión en localStorage entre recargas.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: true,
    persistSession: true,
  },
})
