'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getTenantId(): Promise<string | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const admin = createAdminClient()
    const { data } = await admin
        .from('usuarios')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    return data?.tenant_id ?? null
}

export async function uploadPacienteAdjunto(formData: FormData): Promise<{ success?: boolean; error?: string }> {
    try {
        const file = formData.get('file') as File
        const pacienteId = formData.get('pacienteId') as string
        const observaciones = formData.get('observaciones') as string | null

        if (!file || !pacienteId) {
            return { error: 'Faltan datos (archivo o paciente_id)' }
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'No autenticado' }

        const tenantId = await getTenantId()
        if (!tenantId) return { error: 'No autorizado / Tenant no encontrado' }

        // Generar nombre de archivo único: tenantId/pacienteId/timestamp_filename
        const timestamp = Date.now()
        // clean filename to avoid weird chars
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
        const filePath = `${tenantId}/${pacienteId}/${timestamp}_${safeName}`

        // Subir al storage bucket 'paciente_adjuntos'
        const { error: uploadError } = await supabase.storage
            .from('paciente_adjuntos')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            })

        if (uploadError) {
            console.error('Error subiendo archivo al storage:', uploadError)
            return { error: 'Error del servidor al guardar el archivo.' }
        }

        const { data: { publicUrl } } = supabase.storage
            .from('paciente_adjuntos')
            .getPublicUrl(filePath)

        // Insertar registro en paciente_adjuntos
        const { error: dbError } = await supabase
            .from('paciente_adjuntos')
            .insert({
                paciente_id: pacienteId,
                nombre_archivo: file.name,
                url_archivo: publicUrl,
                tipo_archivo: file.type || 'application/octet-stream',
                size_bytes: file.size,
                observaciones: observaciones || null,
                created_by: user.id
                // tenant_id is automatically assigned by DEFAULT get_user_tenant_id() in Postgres
                // OR we can explicitly pass it if the policy allows. 
                // Let's rely on the DB default.
            })

        if (dbError) {
            console.error('Error guardando metadata en BD:', dbError)
            // Ideally we'd rollback the storage upload here
            return { error: 'Archivo subido pero falló el registro en base de datos.' }
        }

        return { success: true }
    } catch (e: any) {
        console.error('Error en uploadPacienteAdjunto:', e)
        return { error: e.message || 'Error interno al procesar el adjunto.' }
    }
}

export async function deletePacienteAdjunto(id: string, urlArchivo: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'No autenticado' }

        // 1. Delete from DB (The RLS policy ensures users can only delete their tenant's attachments)
        const { error: dbError } = await supabase
            .from('paciente_adjuntos')
            .delete()
            .eq('id', id)

        if (dbError) {
            console.error('Error eliminando metadata de adjunto:', dbError)
            return { error: 'No se pudo eliminar el registro.' }
        }

        // 2. Extract filePath from URL to delete from Storage
        // The public URL looks like: https://[project].supabase.co/storage/v1/object/public/paciente_adjuntos/tenantId/pacienteId/filename
        const urlObj = new URL(urlArchivo)
        const pathSegments = urlObj.pathname.split('/')
        // Find 'paciente_adjuntos' in path and get everything after it
        const bucketIndex = pathSegments.indexOf('paciente_adjuntos')
        if (bucketIndex !== -1 && pathSegments.length > bucketIndex + 1) {
            const filePath = pathSegments.slice(bucketIndex + 1).join('/')
            
            const { error: storageError } = await supabase.storage
                .from('paciente_adjuntos')
                .remove([filePath])
                
            if (storageError) {
                console.error('Error eliminando archivo de storage:', storageError)
                // We don't fail the whole operation if DB delete succeeded, but good to log
            }
        }

        return { success: true }
    } catch (e: any) {
        console.error('Error en deletePacienteAdjunto:', e)
        return { error: e.message || 'Error interno al eliminar el adjunto.' }
    }
}
