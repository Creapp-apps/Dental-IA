const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    console.log("Checking appointments from 2026-06-20...");
    const { data: turnos, error } = await supabase
        .from('turnos')
        .select(`
            id,
            fecha_inicio,
            fecha_fin,
            estado,
            tenant_id,
            paciente:pacientes(nombre, apellido)
        `)
        .gte('fecha_inicio', '2026-06-20T00:00:00')
        .order('fecha_inicio');

    if (error) {
        console.error("Error fetching turnos:", error);
        return;
    }

    console.log(`Found ${turnos.length} appointments:`);
    console.log(JSON.stringify(turnos, null, 2));
}

run().catch(console.error);
