const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        env[match[1]] = value;
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Error: Missing Supabase URL or Service Key in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runTest() {
    console.log("Fetching turnos...");
    const { data: turnos, error: fetchError } = await supabase
        .from('turnos')
        .select('id, estado, paciente_id, profesional_id, tipo_tratamiento_id')
        .limit(5);

    if (fetchError) {
        console.error("Error fetching turnos:", fetchError);
        return;
    }

    console.log("Sample turnos:", turnos);

    if (turnos.length === 0) {
        console.log("No turnos found in the database.");
        return;
    }

    const testTurnoId = turnos[0].id;
    console.log(`\nTesting select query for turno ${testTurnoId} like notificarTurnoPorWhatsApp...`);
    const { data: queryResult, error: queryError } = await supabase
        .from('turnos')
        .select(`
            fecha_inicio,
            paciente:pacientes(nombre, telefono),
            profesional:profesionales(nombre, apellido),
            tipo_tratamiento:tipos_tratamiento(nombre)
        `)
        .eq('id', testTurnoId)
        .single();

    if (queryError) {
        console.error("❌ SELECT Query Error in notificarTurnoPorWhatsApp:", queryError);
    } else {
        console.log("✅ SELECT Query Result:", JSON.stringify(queryResult, null, 2));
    }

    console.log(`\nTesting select query like cambiarEstadoTurno...`);
    const { data: queryResult2, error: queryError2 } = await supabase
        .from('turnos')
        .select(`
            fecha_inicio,
            profesional_id,
            paciente:pacientes(nombre, apellido, telefono),
            profesional:profesionales(nombre, apellido),
            tipo_treatment:tipos_tratamiento(nombre)
        `)
        .eq('id', testTurnoId)
        .single();

    if (queryError2) {
        console.error("❌ SELECT Query Error in cambiarEstadoTurno:", queryError2);
    } else {
        console.log("✅ SELECT Query Result:", JSON.stringify(queryResult2, null, 2));
    }
}

runTest();
