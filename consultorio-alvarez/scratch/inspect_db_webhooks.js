const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function inspect() {
    try {
        console.log("=== INSPECTING DATABASE WEBHOOKS ===")
        // Queries pg_trigger for triggers that call supabase functions or webhooks
        const { data, error } = await supabase
            .rpc('get_triggers_info') // We'll try to execute direct SQL if possible, or query database metadata
        
        if (error) {
            console.log("RPC get_triggers_info failed, trying generic SQL query via pg_catalog...")
            // If there's no custom RPC, we can try querying a schema table if we have permissions or write SQL
            const { data: dataSql, error: errorSql } = await supabase
                .from('pg_trigger')
                .select('*')
                .limit(1) // Usually we can't query pg_catalog directly via PostgREST unless exposed
            
            if (errorSql) {
                console.error("PostgREST direct query failed too (as expected due to schema restrictions).")
            } else {
                console.log(dataSql)
            }
        } else {
            console.log(JSON.stringify(data, null, 2))
        }

        // Let's query notifications table to see what notifications were recorded at 23:04
        console.log("\n=== INSPECTING RECENT NOTIFICACIONES TABLE ===")
        const { data: notifData, error: notifErr } = await supabase
            .from('notificaciones')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10)
        
        if (notifErr) {
            console.error("Error fetching notifications:", notifErr)
        } else {
            console.log(JSON.stringify(notifData, null, 2))
        }

    } catch (err) {
        console.error("Error:", err)
    }
}

inspect()
