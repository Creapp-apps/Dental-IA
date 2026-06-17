const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    const { data, error } = await supabase.from('profesionales').select('*').limit(1);
    if (error) {
        console.error("Error:", error);
        return;
    }
    console.log("Profesionales columns:", data && data.length > 0 ? Object.keys(data[0]) : "No data");
}

run().catch(console.error);
