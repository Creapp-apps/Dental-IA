const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
    const { data: tenant } = await supabase.from('tenants').select('*').eq('slug', 'alvarez').single();
    console.log("Tenant:", tenant);

    if (tenant) {
        const { data: profs, error } = await supabase
            .from('profesionales')
            .select('id, nombre, apellido, especialidad, matricula, color, activo, tenant_id')
            .eq('tenant_id', tenant.id);

        console.log("Profesionales with tenant id:", profs);
        if (error) console.error("Error:", error);
    }
}

test().catch(console.error);
