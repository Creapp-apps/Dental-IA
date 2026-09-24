import { redirect } from 'next/navigation'
import { getCurrentUsuario } from '@/lib/supabase/queries'
import { getConversaciones, getOperadoresClinica } from '@/lib/actions/whatsapp-chat'
import { ChatInboxView } from '@/components/mensajes/ChatInboxView'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata = {
    title: 'Mensajes WhatsApp — Consultorio Álvarez',
    description: 'Bandeja multiatención de WhatsApp y Guardia Odontológica 24hs'
}

export default async function MensajesPage() {
    const usuario = await getCurrentUsuario()
    if (!usuario) {
        redirect('/login')
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
        <div className="w-full max-w-[1600px] mx-auto p-2 sm:p-4">
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
