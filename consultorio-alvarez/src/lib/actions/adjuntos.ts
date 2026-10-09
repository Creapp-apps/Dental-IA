'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extraerRuta, rutaTenant, BUCKETS_ADJUNTOS } from '@/lib/storage/rutas'

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
        const filePath = rutaTenant(tenantId, pacienteId, `${timestamp}_${safeName}`)

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

        // Insertar registro en paciente_adjuntos
        const { error: dbError } = await supabase
            .from('paciente_adjuntos')
            .insert({
                paciente_id: pacienteId,
                nombre_archivo: file.name,
                // Se guarda la ruta, no una URL: el bucket es privado y se firma al mostrar.
                url_archivo: filePath,
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

        // Se resuelve antes del delete: si el valor no es interpretable, la fila igual se borra,
        // pero el archivo queda registrado en el log en vez de perderse en silencio.
        const ruta = extraerRuta(urlArchivo, 'paciente_adjuntos')

        // 1. Delete from DB (The RLS policy ensures users can only delete their tenant's attachments)
        const { error: dbError } = await supabase
            .from('paciente_adjuntos')
            .delete()
            .eq('id', id)

        if (dbError) {
            console.error('Error eliminando metadata de adjunto:', dbError)
            return { error: 'No se pudo eliminar el registro.' }
        }

        // 2. Borrar el archivo de Storage. `ruta` cubre ruta plana, URL pública vieja y URL firmada.
        // El adjunto puede estar en cualquiera de los dos buckets (el escaneo 3D cae a esta tabla
        // si falla la subida primaria) y la ruta no dice en cuál. `remove` devuelve lo que
        // realmente borró: vacío significa que no estaba ahí, así que se prueba el siguiente.
        if (ruta) {
            let borrado = false
            for (const bucket of BUCKETS_ADJUNTOS) {
                const { data, error: storageError } = await supabase.storage
                    .from(bucket)
                    .remove([ruta])

                if (storageError) {
                    console.error(`Error eliminando archivo de storage (${bucket}):`, storageError)
                    // No falla la operación: la fila ya se borró, pero queda el log
                    continue
                }
                if (data && data.length > 0) {
                    borrado = true
                    break
                }
            }
            if (!borrado) {
                console.warn('[STORAGE] Adjunto borrado de la base pero el objeto no se encontró en ningún bucket, puede haber quedado huérfano:', ruta)
            }
        } else {
            console.warn('[STORAGE] Adjunto borrado de la base pero el objeto quedó huérfano, no se pudo resolver la ruta:', urlArchivo)
        }

        return { success: true }
    } catch (e: any) {
        console.error('Error en deletePacienteAdjunto:', e)
        return { error: e.message || 'Error interno al eliminar el adjunto.' }
    }
}
