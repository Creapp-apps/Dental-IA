import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Admin client — bypasses RLS using the service_role key.
// Use ONLY in Server Actions / server-side code for admin operations.
// NEVER expose this on the client side.
export function createAdminClient() {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
    )
}
