import { redirect } from 'next/navigation'
import { getCurrentUsuario } from '@/lib/supabase/queries'
import { getConversaciones, getOperadoresClinica } from '@/lib/actions/whatsapp-chat'
import { ChatInboxView } from '@/components/mensajes/ChatInboxView'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata = {
    title: 'Mensajes WhatsApp',
    description: 'Bandeja multiatención de WhatsApp y Guardia Odontológica 24hs'
}

export default async function MensajesPage() {
    const usuario = await getCurrentUsuario()
    if (!usuario) {
        redirect('/login')
    }

    // La bandeja de Mensajes (WhatsApp) es exclusiva de administración.
    if (usuario.rol === 'profesional') {
        redirect('/agenda')
    }

    const admin = createAdminClient()
    const { data: tenant } = await admin
        .from('tenants')
        .select('slug')
        .eq('id', usuario.tenant_id)
        .single()

    const [{ conversaciones }, operadores] = await Promise.all([
        getConversaciones('todos'),
        getOperadoresClinica()
    ])

    return (
        // En mobile (<lg) va full-bleed: cancela el padding del layout admin
        // (p-4 / sm:p-6) con márgenes negativos y saca su propio padding, para
        // aprovechar todo el ancho. Sin `w-full`: con width:auto los márgenes
        // negativos EXPANDEN el ancho (si no, w-full lo fija y solo lo desplaza,
        // dejando una franja a la derecha). En lg+ vuelve a tarjeta centrada.
        <div className="max-w-[1600px] -m-4 sm:-m-6 p-0 lg:m-0 lg:mx-auto lg:p-4">
            <ChatInboxView
                initialConversaciones={conversaciones}
                currentUsuario={{
                    id: usuario.id,
                    nombre: usuario.nombre,
                    apellido: usuario.apellido,
                    rol: usuario.rol
                }}
                operadores={operadores}
                tenantSlug={tenant?.slug || 'alvarez'}
            />
        </div>
    )
}
