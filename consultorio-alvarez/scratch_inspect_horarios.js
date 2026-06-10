const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    const { data: tenant, error } = await supabase.from('tenants').select('id, slug, horarios').eq('slug', 'alvarez').single();
    if (error) {
        console.error("Error:", error);
        return;
    }

    const updatedHorarios = tenant.horarios.map(h => {
        if (h.dia === 1) { // Monday
            return {
                ...h,
                cierre_manana: "11:00"
            };
        }
        if (h.dia === 2) { // Tuesday
            return {
                ...h,
                cierre_manana: "11:00"
            };
        }
        if (h.dia === 5) { // Friday
            return {
                ...h,
                cierre_tarde: "18:00"
            };
        }
        return h;
    });

    const { error: updateError } = await supabase
        .from('tenants')
        .update({ horarios: updatedHorarios })
        .eq('id', tenant.id);

    if (updateError) {
        console.error("Error updating:", updateError);
    } else {
        console.log("Successfully cleaned up horarios in the database!");
    }
}

run().catch(console.error);
