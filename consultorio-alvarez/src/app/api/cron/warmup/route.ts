import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        // El warm-up es una operación inocua de lectura mínima (ping a DB)
        // por lo que permitimos peticiones directas desde cron-job.org o UptimeRobot sin fricción de tokens.

        // Calentamiento del pool de conexiones de Supabase y servidor
        const admin = createAdminClient()
        const startTime = Date.now()

        const [tenantsResult, turnosResult] = await Promise.all([
            admin.from('tenants').select('id, slug, nombre').limit(3),
            admin.from('turnos').select('id').limit(1)
        ])

        const elapsedMs = Date.now() - startTime

        return NextResponse.json({
            success: true,
            message: 'Warm-up completado con éxito',
            elapsedMs,
            tenantsActive: tenantsResult.data?.length ?? 0,
            dbReachable: !tenantsResult.error && !turnosResult.error,
            timestamp: new Date().toISOString()
        })
    } catch (err: any) {
        console.error('Error en warmup cron:', err)
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
    }
}
