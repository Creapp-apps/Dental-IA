const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    // Attempt to read from pg_proc via RPC or REST if possible
    const { data: routines, error } = await supabase
        .from('pg_proc')
        .select('proname')
        .limit(10);
    
    if (error) {
        console.log("Could not query pg_proc directly:", error.message);
    } else {
        console.log("Routines in pg_proc:", routines);
    }
}

run().catch(console.error);
