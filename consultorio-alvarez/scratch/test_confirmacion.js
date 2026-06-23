const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

const normalizarTelefonoArgentino = (tel) => {
    if (!tel) return ''
    let limpio = tel.replace(/\D/g, '')
    if (limpio.startsWith('54')) {
        limpio = limpio.slice(2)
    }
    if (limpio.startsWith('9') && limpio.length === 11) {
        limpio = limpio.slice(1)
    }
    if (limpio.length === 10) {
        return '549' + limpio
    }
    return limpio
}

async function notificarTurnoPorWhatsApp(turnoId, templateName) {
    if (!process.env.META_WA_ACCESS_TOKEN || !process.env.META_WA_PHONE_NUMBER_ID) {
        console.log('⚠️ Variables de WhatsApp no configuradas.')
        return
    }

    try {
        const { data: turno, error: fetchErr } = await supabase
            .from('turnos')
            .select(`
                fecha_inicio,
                paciente:pacientes(nombre, telefono),
                profesional:profesionales(nombre, apellido),
                tipo_treatment:tipos_tratamiento(nombre)
            `)
            .eq('id', turnoId)
            .single()

        if (fetchErr || !turno) {
            console.error("Error fetching turno:", fetchErr)
            return
        }

        const pct = turno.paciente
        const prof = turno.profesional

        if (!pct?.telefono) {
            console.log(`⚠️ El paciente no tiene teléfono`)
            return
        }

        let cleanPhone = normalizarTelefonoArgentino(pct.telefono)

        const fechaObj = new Date(turno.fecha_inicio)
        const fechaStr = fechaObj.toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            timeZone: 'America/Argentina/Buenos_Aires'
        })
        const fechaStrFormatted = fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1)

        const horaStr = fechaObj.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/Argentina/Buenos_Aires'
        })

        const nombreProf = prof ? `${prof.nombre.trim()} ${prof.apellido.trim()}` : 'el especialista'

        let parameters = []
        if (templateName === 'turno_confirmado') {
            const tratamiento = turno.tipo_treatment?.nombre || 'Consulta'
            parameters = [
                { type: 'text', text: pct.nombre },
                { type: 'text', text: tratamiento },
                { type: 'text', text: fechaStrFormatted },
                { type: 'text', text: horaStr },
                { type: 'text', text: nombreProf }
            ]
        }

        console.log(`📤 Enviando a ${cleanPhone} con params:`, parameters)

        const wpResponse = await fetch(`https://graph.facebook.com/v20.0/${process.env.META_WA_PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.META_WA_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: cleanPhone,
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: 'es_AR' },
                    components: [
                        {
                            type: 'body',
                            parameters: parameters
                        }
                    ]
                }
            })
        })

        const wpResult = await wpResponse.json()
        console.log("Resultado Meta:", JSON.stringify(wpResult, null, 2))
    } catch (err) {
        console.error("Error:", err)
    }
}

notificarTurnoPorWhatsApp('2eddc095-59d2-4992-8c24-0c094113719a', 'turno_confirmado')
