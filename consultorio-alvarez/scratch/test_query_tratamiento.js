const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testQuery() {
    try {
        const { data: turno, error } = await supabase
            .from('turnos')
            .select(`
                fecha_inicio,
                paciente:pacientes(nombre, telefono),
                profesional:profesionales(nombre, apellido),
                tipo_tratamiento:tipos_tratamiento(nombre)
            `)
            .eq('id', '2eddc095-59d2-4992-8c24-0c094113719a')
            .single()

        if (error) {
            console.error("Query failed with error:", error)
        } else {
            console.log("Query succeeded! Result:", JSON.stringify(turno, null, 2))
        }
    } catch (err) {
        console.error("Query threw exception:", err)
    }
}

testQuery()
