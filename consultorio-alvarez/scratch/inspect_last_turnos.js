const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function inspect() {
    try {
        console.log("=== INSPECTING RECENT TURNOS ===")
        const { data: turnos, error } = await supabase
            .from('turnos')
            .select(`
                id,
                fecha_inicio,
                estado,
                origen,
                created_at,
                updated_at,
                paciente:pacientes(nombre, apellido, telefono),
                profesional:profesionales(nombre, apellido)
            `)
            .order('updated_at', { ascending: false })
            .limit(5)

        if (error) {
            console.error("Error fetching turnos:", error)
            return
        }

        console.log(JSON.stringify(turnos, null, 2))
    } catch (err) {
        console.error("Error in inspect:", err)
    }
}

inspect()
